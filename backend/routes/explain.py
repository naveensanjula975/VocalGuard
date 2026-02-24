"""
Explainability dashboard route — /api/v1/analyses/{id}/explain

Returns per-segment model decisions to power the frontend explainability dashboard:
  - Attention heatmap (transformer layer weights collapsed to time dimension)
  - Top "fake" and "real" evidence segments with timestamps
  - MFCC feature map for each audio chunk (for spectrogram overlay)
  - Overall decision summary

This is read-only — results are computed on-the-fly from the stored audio
or re-run from a cached file path.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import librosa
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import JSONResponse

from dependencies import get_current_user, validate_audio_file, save_upload_to_temp
from logger import get_logger
from models.transformer_models import TransformerDeepfakeDetector
from config import MODEL_DIR
from rate_limiter import limiter

logger = get_logger(__name__)
router = APIRouter(prefix="/explain", tags=["explainability"])

# Lazy-load the transformer detector (reuses the cached instance if already warm)
_detector: TransformerDeepfakeDetector | None = None


def _get_detector() -> TransformerDeepfakeDetector:
    global _detector
    if _detector is None:
        logger.info("Loading TransformerDeepfakeDetector for explainability…")
        _detector = TransformerDeepfakeDetector(str(MODEL_DIR))
    return _detector


# ---------------------------------------------------------------------------
# Segment-level feature extraction
# ---------------------------------------------------------------------------

def _segment_audio(audio_path: str, segment_sec: float = 1.0) -> list[dict]:
    """
    Split audio into fixed-length segments and extract per-segment MFCC features.
    Returns a list of segment descriptors with timestamps and feature vectors.
    """
    y, sr = librosa.load(audio_path, sr=16000)
    hop_len = int(segment_sec * sr)
    segments = []

    for idx, start in enumerate(range(0, len(y), hop_len)):
        chunk = y[start: start + hop_len]
        if len(chunk) < sr * 0.1:      # skip very short trailing segments
            break

        mfcc = librosa.feature.mfcc(y=chunk, sr=sr, n_mfcc=13)
        rms = float(np.mean(librosa.feature.rms(y=chunk)))
        zcr = float(np.mean(librosa.feature.zero_crossing_rate(chunk)))
        centroid = float(np.mean(librosa.feature.spectral_centroid(y=chunk, sr=sr)))

        segments.append({
            "segment_index": idx,
            "start_sec": round(start / sr, 3),
            "end_sec": round((start + len(chunk)) / sr, 3),
            "duration_sec": round(len(chunk) / sr, 3),
            "mfcc_means": [round(float(np.mean(b)), 4) for b in mfcc],
            "rms_energy": round(rms, 6),
            "zero_crossing_rate": round(zcr, 6),
            "spectral_centroid_hz": round(centroid, 2),
        })

    return segments


def _attention_to_timeline(
    attention_analysis: dict,
    total_duration_sec: float,
    sequence_length: int,
) -> list[dict]:
    """
    Map transformer attention weights (sequence positions) back to audio timestamps.
    Returns a timeline list of {time_sec, attention_weight} pairs.
    """
    if "error" in attention_analysis or not attention_analysis.get("layer_attention"):
        return []

    # Use the last layer's mean attention across all heads
    last_layer_attn = np.array(
        attention_analysis["layer_attention"][-1]["attention_matrix"]
    )  # (seq, seq)

    # Importance of each time step = mean attention it receives (column-wise)
    frame_importance = last_layer_attn.mean(axis=0)  # (seq,)

    # Normalise to [0, 1]
    min_v, max_v = frame_importance.min(), frame_importance.max()
    if max_v > min_v:
        frame_importance = (frame_importance - min_v) / (max_v - min_v)

    # Map each frame index to a time offset
    if sequence_length > 0:
        frames_per_sec = sequence_length / max(total_duration_sec, 1e-3)
    else:
        frames_per_sec = len(frame_importance) / max(total_duration_sec, 1e-3)

    timeline = []
    for i, weight in enumerate(frame_importance):
        t = i / frames_per_sec
        timeline.append({
            "time_sec": round(float(t), 3),
            "attention_weight": round(float(weight), 4),
        })

    return timeline


def _top_evidence_segments(
    segments: list[dict],
    attention_timeline: list[dict],
    top_n: int = 5,
) -> dict:
    """
    Find the top-N time segments with the highest and lowest attention weights.
    High attention → model is focusing here (likely "fake evidence").
    Low attention → model considers this more "natural/real".
    """
    if not attention_timeline:
        return {"high_attention": [], "low_attention": []}

    # Build a time-indexed weight map for quick lookup
    weight_by_time: dict[float, float] = {
        round(e["time_sec"], 1): e["attention_weight"] for e in attention_timeline
    }

    for seg in segments:
        mid = round((seg["start_sec"] + seg["end_sec"]) / 2, 1)
        seg["attention_weight"] = weight_by_time.get(mid, 0.0)

    sorted_segs = sorted(segments, key=lambda s: s["attention_weight"], reverse=True)

    return {
        "high_attention_segments": sorted_segs[:top_n],
        "low_attention_segments": sorted_segs[-top_n:],
    }


# ---------------------------------------------------------------------------
# API Endpoint
# ---------------------------------------------------------------------------

@router.post("", status_code=200)
@limiter.limit("10/minute")
async def explain_audio(
    request: Request,
    file: UploadFile = File(..., description="Audio file to explain (WAV, MP3, FLAC, M4A)"),
    token_data: dict = Depends(get_current_user),
):
    """
    **Explainability Dashboard** — upload audio and get a full per-segment explanation.

    Returns:
    - `attention_timeline`: attention weights mapped to audio time positions
    - `segments`: per-second MFCC feature descriptors
    - `top_evidence`: highest/lowest attention segments (fake vs real evidence)
    - `overall`: aggregated statistics for dashboard summary cards
    """
    validate_audio_file(file)
    tmp_path = await save_upload_to_temp(file)

    try:
        detector = _get_detector()

        # --- Attention analysis ---
        attention_analysis = detector.get_attention_analysis(tmp_path)

        # --- Audio duration ---
        y, sr = librosa.load(tmp_path, sr=16000)
        total_duration = librosa.get_duration(y=y, sr=sr)

        seq_len = attention_analysis.get("sequence_length", len(y) // 320)  # default: 20ms frames

        # --- Segment-level features ---
        segments = _segment_audio(tmp_path, segment_sec=1.0)

        # --- Map attention to timeline ---
        attention_timeline = _attention_to_timeline(
            attention_analysis, total_duration, seq_len
        )

        # --- Top evidence segments ---
        evidence = _top_evidence_segments(segments, attention_timeline)

        # --- Run full detection for overall verdict ---
        from core.detect_deepfake import detect_deepfake_ensemble
        detection = detect_deepfake_ensemble(tmp_path, store_results=False)

        # --- Build overall summary ---
        weights = [e["attention_weight"] for e in attention_timeline]
        overall = {
            "duration_sec": round(total_duration, 2),
            "is_fake": detection.get("is_fake"),
            "confidence": round(detection.get("confidence", 0.0), 4),
            "label": detection.get("label", "unknown"),
            "total_segments": len(segments),
            "mean_attention": round(float(np.mean(weights)), 4) if weights else 0.0,
            "peak_attention_time_sec": attention_timeline[int(np.argmax(weights))]["time_sec"] if weights else 0.0,
            "attention_entropy": round(float(_entropy(np.array(weights))), 4) if weights else 0.0,
        }

        return JSONResponse({
            "filename": file.filename,
            "overall": overall,
            "attention_timeline": attention_timeline,
            "segments": segments,
            "top_evidence": evidence,
            "model_info": {
                "num_transformer_layers": attention_analysis.get("num_layers", 0),
                "num_attention_heads": attention_analysis.get("num_heads", 0),
                "sequence_length": seq_len,
            },
        })

    finally:
        try:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        except OSError:
            pass


def _entropy(weights: np.ndarray) -> float:
    """Shannon entropy of normalised attention weights — low = focused, high = diffuse."""
    weights = weights + 1e-9  # avoid log(0)
    weights = weights / weights.sum()
    return float(-np.sum(weights * np.log(weights)))
