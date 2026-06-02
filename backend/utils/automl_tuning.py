"""
AutoML Tuning — Hyperparameter Optimization for Ensemble Weights.

Uses a grid search over Wav2Vec2 / Transformer ensemble weights to find
the combination that maximises F1 score on a labelled audio dataset.
Optionally uses scipy's differential evolution for a faster global search.

Usage:
  # Grid search (exhaustive, recommended for small weight steps)
  python utils/automl_tuning.py --real-dir ./data/real --fake-dir ./data/fake

  # Differential evolution (faster, good for large search spaces)
  python utils/automl_tuning.py --real-dir ./data/real --fake-dir ./data/fake --method de

  # Save optimal weights back to config automatically
  python utils/automl_tuning.py --real-dir ./data/real --fake-dir ./data/fake --apply

Output:
  Best weights are printed and optionally written to .env / config override.
"""

from __future__ import annotations

import argparse
import os
import sys
import itertools
import json
from pathlib import Path
from typing import Any

import numpy as np

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from logger import get_logger

logger = get_logger(__name__)

AUDIO_EXTENSIONS = (".wav", ".mp3", ".flac", ".m4a")


# ---------------------------------------------------------------------------
# Evaluation helpers
# ---------------------------------------------------------------------------

def _load_audio_files(directory: str) -> list[str]:
    if not directory or not os.path.isdir(directory):
        return []
    return [
        os.path.join(directory, f)
        for f in os.listdir(directory)
        if f.lower().endswith(AUDIO_EXTENSIONS)
    ]


def _run_inference_with_weights(
    audio_path: str,
    w2v_weight: float,
    tf_weight: float,
) -> dict[str, Any]:
    """
    Run ensemble detection with custom weights by temporarily overriding the module constants.
    This avoids re-loading the models on every call.
    """
    # Import here so we can patch module-level constants before each call
    import core.detect_deepfake as dd_module
    import config as cfg_module

    original_w2v = cfg_module.ENSEMBLE_WAV2VEC2_WEIGHT
    original_tf = cfg_module.ENSEMBLE_TRANSFORMER_WEIGHT

    try:
        cfg_module.ENSEMBLE_WAV2VEC2_WEIGHT = w2v_weight
        cfg_module.ENSEMBLE_TRANSFORMER_WEIGHT = tf_weight
        # Also patch the local references inside detect_deepfake
        dd_module.ENSEMBLE_WAV2VEC2_WEIGHT = w2v_weight
        dd_module.ENSEMBLE_TRANSFORMER_WEIGHT = tf_weight

        result = dd_module.detect_deepfake_ensemble(audio_path, store_results=False)
    finally:
        cfg_module.ENSEMBLE_WAV2VEC2_WEIGHT = original_w2v
        cfg_module.ENSEMBLE_TRANSFORMER_WEIGHT = original_tf
        dd_module.ENSEMBLE_WAV2VEC2_WEIGHT = original_w2v
        dd_module.ENSEMBLE_TRANSFORMER_WEIGHT = original_tf

    return result


def _evaluate_weights(
    real_files: list[str],
    fake_files: list[str],
    w2v_weight: float,
    tf_weight: float,
) -> dict[str, float]:
    """
    Evaluate precision, recall, F1, and accuracy for a given weight combination.
    """
    from sklearn.metrics import f1_score, precision_score, recall_score, accuracy_score

    y_true, y_pred = [], []

    for fp in real_files:
        try:
            res = _run_inference_with_weights(fp, w2v_weight, tf_weight)
            y_true.append(0)
            y_pred.append(1 if res.get("is_fake") else 0)
        except Exception as exc:
            logger.warning("Failed on real file %s: %s", fp, exc)

    for fp in fake_files:
        try:
            res = _run_inference_with_weights(fp, w2v_weight, tf_weight)
            y_true.append(1)
            y_pred.append(1 if res.get("is_fake") else 0)
        except Exception as exc:
            logger.warning("Failed on fake file %s: %s", fp, exc)

    if not y_true:
        return {"f1": 0.0, "precision": 0.0, "recall": 0.0, "accuracy": 0.0}

    return {
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "accuracy": accuracy_score(y_true, y_pred),
    }


# ---------------------------------------------------------------------------
# Search strategies
# ---------------------------------------------------------------------------

def grid_search(
    real_files: list[str],
    fake_files: list[str],
    steps: int = 10,
) -> dict[str, Any]:
    """
    Exhaustive grid search over all (w2v_weight, tf_weight) pairs where
    w2v_weight + tf_weight == 1.0.
    """
    weights = [round(i / steps, 2) for i in range(1, steps)]  # 0.1 … 0.9
    best: dict[str, Any] = {"f1": -1.0}
    results = []

    total = len(weights)
    for i, w2v_w in enumerate(weights, 1):
        tf_w = round(1.0 - w2v_w, 2)
        logger.info("[%d/%d] Grid: wav2vec2=%.2f transformer=%.2f", i, total, w2v_w, tf_w)
        metrics = _evaluate_weights(real_files, fake_files, w2v_w, tf_w)
        entry = {"wav2vec2_weight": w2v_w, "transformer_weight": tf_w, **metrics}
        results.append(entry)
        if metrics["f1"] > best.get("f1", -1.0):
            best = entry

    return {"method": "grid_search", "best": best, "all_results": results}


def differential_evolution_search(
    real_files: list[str],
    fake_files: list[str],
) -> dict[str, Any]:
    """
    Global optimisation using SciPy's differential evolution.
    Faster than grid search for larger spaces.
    """
    try:
        from scipy.optimize import differential_evolution
    except ImportError:
        logger.warning("scipy not available — falling back to grid search.")
        return grid_search(real_files, fake_files)

    call_log: list[dict] = []

    def objective(x: np.ndarray) -> float:
        w2v_w = float(np.clip(x[0], 0.01, 0.99))
        tf_w = round(1.0 - w2v_w, 4)
        metrics = _evaluate_weights(real_files, fake_files, w2v_w, tf_w)
        call_log.append({"wav2vec2_weight": w2v_w, "transformer_weight": tf_w, **metrics})
        logger.info("DE eval: w2v=%.3f tf=%.3f → F1=%.4f", w2v_w, tf_w, metrics["f1"])
        return -metrics["f1"]  # minimise negative F1

    result = differential_evolution(
        objective,
        bounds=[(0.05, 0.95)],
        maxiter=30,
        tol=1e-3,
        seed=42,
        workers=1,
    )

    best_w2v = float(np.clip(result.x[0], 0.01, 0.99))
    best_tf = round(1.0 - best_w2v, 4)
    best_metrics = _evaluate_weights(real_files, fake_files, best_w2v, best_tf)

    return {
        "method": "differential_evolution",
        "best": {
            "wav2vec2_weight": best_w2v,
            "transformer_weight": best_tf,
            **best_metrics,
        },
        "all_results": call_log,
    }


def apply_weights(w2v_weight: float, tf_weight: float, env_path: str) -> None:
    """Write the optimal weights into the .env file."""
    lines: list[str] = []
    if os.path.exists(env_path):
        with open(env_path) as f:
            lines = f.readlines()

    def _set(key: str, val: str, source: list[str]) -> list[str]:
        for i, line in enumerate(source):
            if line.startswith(f"{key}="):
                source[i] = f"{key}={val}\n"
                return source
        source.append(f"{key}={val}\n")
        return source

    lines = _set("ENSEMBLE_WAV2VEC2_WEIGHT", str(w2v_weight), lines)
    lines = _set("ENSEMBLE_TRANSFORMER_WEIGHT", str(tf_weight), lines)

    with open(env_path, "w") as f:
        f.writelines(lines)
    logger.info("Wrote optimal weights to %s", env_path)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="AutoML Tuning: Optimise VocalGuard ensemble weights.")
    parser.add_argument("--real-dir", required=True, help="Directory of REAL audio files.")
    parser.add_argument("--fake-dir", required=True, help="Directory of FAKE audio files.")
    parser.add_argument("--method", choices=["grid", "de"], default="grid",
                        help="Search strategy: 'grid' (exhaustive) or 'de' (differential evolution).")
    parser.add_argument("--steps", type=int, default=9, help="Grid search step count (default 9).")
    parser.add_argument("--apply", action="store_true",
                        help="Write the best weights back to backend/.env automatically.")
    parser.add_argument("--output-json", default=None, help="Save full results to a JSON file.")
    args = parser.parse_args()

    real_files = _load_audio_files(args.real_dir)
    fake_files = _load_audio_files(args.fake_dir)

    if not real_files and not fake_files:
        print("No audio files found. Please check the supplied directories.")
        sys.exit(1)

    logger.info("Loaded %d real + %d fake files for tuning.", len(real_files), len(fake_files))

    if args.method == "de":
        report = differential_evolution_search(real_files, fake_files)
    else:
        report = grid_search(real_files, fake_files, steps=args.steps)

    best = report["best"]

    print("\n" + "=" * 55)
    print("          AUTOML TUNING — OPTIMAL ENSEMBLE WEIGHTS")
    print("=" * 55)
    print(f"  Method           : {report['method']}")
    print(f"  Wav2Vec2 Weight  : {best['wav2vec2_weight']:.2f}")
    print(f"  Transformer Wt.  : {best['transformer_weight']:.2f}")
    print(f"  F1 Score         : {best['f1']*100:.2f}%")
    print(f"  Accuracy         : {best['accuracy']*100:.2f}%")
    print(f"  Precision        : {best['precision']*100:.2f}%")
    print(f"  Recall           : {best['recall']*100:.2f}%")
    print("=" * 55)

    if args.apply:
        env_path = str(backend_root / ".env")
        apply_weights(best["wav2vec2_weight"], best["transformer_weight"], env_path)
        print(f"\n✅ Optimal weights written to {env_path}")
        print("   Restart the backend server to apply changes.")

    if args.output_json:
        with open(args.output_json, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\n✅ Full tuning report saved to: {args.output_json}")


if __name__ == "__main__":
    main()
