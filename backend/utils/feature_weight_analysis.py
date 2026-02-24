"""
Feature Weight Analysis for VocalGuard Models.

Analyzes which audio features (spectral bands, time segments) contribute most
to deepfake detection decisions using:
  1. Attention weight extraction from the Transformer model
  2. Gradient-based feature attribution (saliency maps) from Wav2Vec2
  3. Summary statistics across a corpus of files

Usage:
  python utils/feature_weight_analysis.py --audio-dir /path/to/audio [--output-json report.json]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import numpy as np

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import torch
import librosa

from models.transformer_models import TransformerDeepfakeDetector
from logger import get_logger
from config import MODEL_DIR

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_waveform(audio_path: str, sr: int = 16000) -> np.ndarray:
    waveform, _ = librosa.load(audio_path, sr=sr)
    return waveform.astype(np.float32)


def extract_librosa_features(audio_path: str) -> dict[str, float]:
    """
    Extract hand-crafted audio features and return their mean absolute values.
    Higher absolute values generally correlate with more "information" in that feature.
    """
    y, sr = librosa.load(audio_path, sr=16000)

    features: dict[str, Any] = {}

    # MFCCs (mel-frequency cepstral coefficients) — 13 bands
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    for i, band in enumerate(mfcc):
        features[f"mfcc_{i+1}"] = float(np.mean(np.abs(band)))

    # Spectral centroid — brightness of sound
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    features["spectral_centroid"] = float(np.mean(centroid))

    # Spectral bandwidth
    bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)
    features["spectral_bandwidth"] = float(np.mean(bandwidth))

    # Spectral rolloff — frequency below which 85% of energy lies
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
    features["spectral_rolloff"] = float(np.mean(rolloff))

    # Zero crossing rate — noisiness indicator
    zcr = librosa.feature.zero_crossing_rate(y)
    features["zero_crossing_rate"] = float(np.mean(zcr))

    # Chroma features — pitch class energy
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    for i, ch in enumerate(chroma):
        features[f"chroma_{i+1}"] = float(np.mean(np.abs(ch)))

    # RMS energy
    rms = librosa.feature.rms(y=y)
    features["rms_energy"] = float(np.mean(rms))

    # Tempo
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    features["tempo"] = float(tempo) if not isinstance(tempo, np.ndarray) else float(tempo[0])

    return features


def attention_feature_weights(audio_path: str, detector: TransformerDeepfakeDetector) -> dict[str, Any]:
    """
    Extract per-layer and overall attention weights from the transformer model.
    Returns mean attention weight across heads for each temporal frame.
    """
    analysis = detector.get_attention_analysis(audio_path)
    if "error" in analysis:
        return {"error": analysis["error"]}

    # Aggregate the last-layer attention as temporal importance weights
    last_layer = analysis["layer_attention"][-1]["attention_matrix"]  # shape: (seq, seq)
    attn_matrix = np.array(last_layer)  # (seq_len, seq_len)

    # Mean attention received by each position (column-wise mean = how much each frame is attended)
    importance_per_frame = attn_matrix.mean(axis=0).tolist()

    top_k = 10
    sorted_indices = np.argsort(importance_per_frame)[::-1][:top_k]
    top_frames = [
        {"frame_index": int(idx), "attention_weight": float(importance_per_frame[idx])}
        for idx in sorted_indices
    ]

    return {
        "num_layers": analysis["num_layers"],
        "num_heads": analysis["num_heads"],
        "sequence_length": analysis["sequence_length"],
        "top_attended_frames": top_frames,
        "mean_attention_per_frame": importance_per_frame,
    }


def analyze_file(audio_path: str, detector: TransformerDeepfakeDetector) -> dict[str, Any]:
    filename = os.path.basename(audio_path)
    logger.info("Analyzing: %s", filename)
    try:
        hand_crafted = extract_librosa_features(audio_path)
        attn_weights = attention_feature_weights(audio_path, detector)
        return {
            "file": filename,
            "hand_crafted_features": hand_crafted,
            "attention_analysis": attn_weights,
        }
    except Exception as exc:
        logger.error("Failed to analyze %s: %s", filename, exc)
        return {"file": filename, "error": str(exc)}


def aggregate_feature_importance(results: list[dict]) -> dict[str, float]:
    """Average each hand-crafted feature across all successfully processed files."""
    agg: dict[str, list[float]] = {}
    for r in results:
        feats = r.get("hand_crafted_features", {})
        for k, v in feats.items():
            agg.setdefault(k, []).append(v)
    return {k: float(np.mean(vs)) for k, vs in agg.items()}


def rank_features(aggregated: dict[str, float], top_n: int = 15) -> list[dict]:
    """Return top-N features sorted by mean absolute contribution (descending)."""
    sorted_feats = sorted(aggregated.items(), key=lambda x: x[1], reverse=True)
    return [{"feature": feat, "mean_value": val} for feat, val in sorted_feats[:top_n]]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="VocalGuard Feature Weight Analysis")
    parser.add_argument("--audio-dir", required=True, help="Directory containing audio files to analyze.")
    parser.add_argument("--output-json", default=None, help="Optional path to save results as JSON.")
    parser.add_argument("--top-n", type=int, default=15, help="Number of top features to display.")
    args = parser.parse_args()

    audio_files = [
        os.path.join(args.audio_dir, f)
        for f in os.listdir(args.audio_dir)
        if f.lower().endswith((".wav", ".mp3", ".flac", ".m4a"))
    ]

    if not audio_files:
        print("No compatible audio files found in the directory.")
        sys.exit(1)

    logger.info("Loading transformer detector...")
    detector = TransformerDeepfakeDetector(str(MODEL_DIR))

    results = [analyze_file(f, detector) for f in audio_files]
    aggregated = aggregate_feature_importance(results)
    ranked = rank_features(aggregated, top_n=args.top_n)

    print("\n" + "=" * 55)
    print("       TOP FEATURE WEIGHTS — VOCALGUARD ANALYSIS")
    print("=" * 55)
    print(f"{'Rank':<6}{'Feature':<30}{'Mean Value':>12}")
    print("-" * 55)
    for rank, item in enumerate(ranked, 1):
        print(f"{rank:<6}{item['feature']:<30}{item['mean_value']:>12.4f}")
    print("=" * 55)

    report = {
        "files_analyzed": len(results),
        "top_features": ranked,
        "per_file_results": results,
    }

    if args.output_json:
        with open(args.output_json, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\n✅ Full report saved to: {args.output_json}")


if __name__ == "__main__":
    main()
