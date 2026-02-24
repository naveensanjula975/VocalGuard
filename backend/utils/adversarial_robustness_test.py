"""
Adversarial Robustness Testing for VocalGuard Models.

Tests model stability against common audio perturbations that an adversary might apply:
  - Gaussian noise (signal-to-noise ratio variants)
  - Pitch shifting (semitones)
  - Time stretching (speed changes)
  - Low/high-pass filtering
  - MP3 compression artifacts (re-encoding at low kbps)

Usage:
  python utils/adversarial_robustness_test.py \
    --audio-dir /path/to/audio \
    --model-type ensemble \
    [--output-json robustness_report.json]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

import numpy as np

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import librosa
import soundfile as sf

from core.detect_deepfake import detect_deepfake, detect_deepfake_ensemble
from logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Audio Perturbation Functions
# ---------------------------------------------------------------------------

def add_gaussian_noise(y: np.ndarray, snr_db: float = 20.0) -> np.ndarray:
    """Add Gaussian noise at a specified signal-to-noise ratio (dB)."""
    signal_power = np.mean(y ** 2)
    noise_power = signal_power / (10 ** (snr_db / 10))
    noise = np.random.normal(0, np.sqrt(noise_power), len(y))
    return (y + noise).astype(np.float32)


def pitch_shift(y: np.ndarray, sr: int = 16000, n_steps: float = 2.0) -> np.ndarray:
    """Shift pitch up/down by n_steps semitones."""
    return librosa.effects.pitch_shift(y, sr=sr, n_steps=n_steps).astype(np.float32)


def time_stretch(y: np.ndarray, rate: float = 1.15) -> np.ndarray:
    """Stretch time by a factor (> 1.0 = slower, < 1.0 = faster)."""
    return librosa.effects.time_stretch(y, rate=rate).astype(np.float32)


def apply_lowpass_filter(y: np.ndarray, sr: int = 16000, cutoff_hz: float = 4000.0) -> np.ndarray:
    """Apply a simple butterworth low-pass filter."""
    try:
        from scipy.signal import butter, sosfilt
        nyquist = sr / 2.0
        norm_cutoff = min(cutoff_hz / nyquist, 0.99)
        sos = butter(4, norm_cutoff, btype="low", output="sos")
        return sosfilt(sos, y).astype(np.float32)
    except ImportError:
        logger.warning("scipy not available — skipping low-pass filter.")
        return y


PERTURBATIONS: dict[str, Any] = {
    "baseline": lambda y, sr: y,
    "gaussian_noise_20dB": lambda y, sr: add_gaussian_noise(y, snr_db=20.0),
    "gaussian_noise_10dB": lambda y, sr: add_gaussian_noise(y, snr_db=10.0),
    "pitch_shift_+2": lambda y, sr: pitch_shift(y, sr=sr, n_steps=2.0),
    "pitch_shift_-2": lambda y, sr: pitch_shift(y, sr=sr, n_steps=-2.0),
    "time_stretch_1.15x": lambda y, sr: time_stretch(y, rate=1.15),
    "time_stretch_0.85x": lambda y, sr: time_stretch(y, rate=0.85),
    "lowpass_4kHz": lambda y, sr: apply_lowpass_filter(y, sr=sr, cutoff_hz=4000.0),
}

# ---------------------------------------------------------------------------
# Core evaluation
# ---------------------------------------------------------------------------

def run_inference(audio_path: str, model_type: str) -> dict:
    if model_type == "ensemble":
        return detect_deepfake_ensemble(audio_path, store_results=False)
    return detect_deepfake(audio_path, store_results=False, analysis_type=model_type)


def test_file_robustness(audio_path: str, model_type: str) -> dict[str, Any]:
    """Run original + all perturbed variants through the model. Returns per-perturbation results."""
    filename = os.path.basename(audio_path)
    logger.info("Testing robustness: %s", filename)

    y, sr = librosa.load(audio_path, sr=16000)
    y = y.astype(np.float32)

    file_results: dict[str, Any] = {"file": filename}
    baseline_pred: bool | None = None

    for name, perturbation_fn in PERTURBATIONS.items():
        try:
            perturbed = perturbation_fn(y, sr)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                sf.write(tmp.name, perturbed, sr)
                tmp_path = tmp.name

            res = run_inference(tmp_path, model_type)
            os.unlink(tmp_path)

            is_fake = res.get("is_fake")
            confidence = res.get("confidence", 0.0)

            if name == "baseline":
                baseline_pred = is_fake

            file_results[name] = {
                "is_fake": is_fake,
                "confidence": round(confidence, 4),
                "prediction_flipped": (is_fake != baseline_pred) if baseline_pred is not None and name != "baseline" else False,
            }

        except Exception as exc:
            logger.error("Error in perturbation '%s' for %s: %s", name, filename, exc)
            file_results[name] = {"error": str(exc)}

    return file_results


def compute_robustness_score(file_results: list[dict]) -> dict[str, Any]:
    """
    Compute an overall robustness score per perturbation type.
    Score = 1 - (flip_rate), where flip_rate = fraction of files that changed prediction.
    """
    perturbation_names = [k for k in PERTURBATIONS if k != "baseline"]
    stats: dict[str, dict] = {name: {"flips": 0, "total": 0} for name in perturbation_names}

    for fr in file_results:
        for name in perturbation_names:
            result = fr.get(name, {})
            if isinstance(result, dict) and "error" not in result:
                stats[name]["total"] += 1
                if result.get("prediction_flipped"):
                    stats[name]["flips"] += 1

    robustness: dict[str, Any] = {}
    for name, s in stats.items():
        total = s["total"]
        flips = s["flips"]
        flip_rate = flips / total if total > 0 else 0.0
        robustness[name] = {
            "files_tested": total,
            "prediction_flips": flips,
            "flip_rate": round(flip_rate, 4),
            "robustness_score": round(1.0 - flip_rate, 4),
        }

    overall = np.mean([v["robustness_score"] for v in robustness.values()]) if robustness else 0.0
    robustness["overall_robustness"] = round(float(overall), 4)
    return robustness


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="VocalGuard Adversarial Robustness Testing")
    parser.add_argument("--audio-dir", required=True, help="Directory of audio files to test.")
    parser.add_argument("--model-type", default="ensemble", choices=["advanced", "standard", "ensemble"])
    parser.add_argument("--output-json", default=None, help="Path to save results as JSON.")
    args = parser.parse_args()

    audio_files = [
        os.path.join(args.audio_dir, f)
        for f in os.listdir(args.audio_dir)
        if f.lower().endswith((".wav", ".mp3", ".flac"))
    ]

    if not audio_files:
        print("No compatible audio files found.")
        sys.exit(1)

    logger.info("Running robustness tests on %d files using '%s' model...", len(audio_files), args.model_type)
    file_results = [test_file_robustness(f, args.model_type) for f in audio_files]
    robustness = compute_robustness_score(file_results)

    print("\n" + "=" * 60)
    print("          ADVERSARIAL ROBUSTNESS REPORT")
    print("=" * 60)
    print(f"{'Perturbation':<30}{'Flip Rate':>12}{'Robustness':>15}")
    print("-" * 60)
    for name, stats in robustness.items():
        if name == "overall_robustness":
            continue
        print(f"{name:<30}{stats['flip_rate']:>12.2%}{stats['robustness_score']:>15.4f}")
    print("-" * 60)
    print(f"{'OVERALL ROBUSTNESS SCORE':<45}{robustness['overall_robustness']:>12.4f}")
    print("=" * 60)

    report = {
        "model_type": args.model_type,
        "files_tested": len(file_results),
        "perturbations_tested": list(PERTURBATIONS.keys()),
        "robustness_summary": robustness,
        "per_file_results": file_results,
    }

    if args.output_json:
        with open(args.output_json, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\n✅ Report saved to: {args.output_json}")


if __name__ == "__main__":
    main()
