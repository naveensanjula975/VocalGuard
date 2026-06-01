"""
Deepfake detection orchestration.

This module wires up the ML detectors and (optionally) persists results
to Firestore.  It does NOT handle HTTP or temp-file concerns — those
belong in the route layer.
"""

from __future__ import annotations

import os
import time

import hashlib
from functools import lru_cache
from cachetools import LRUCache
import librosa
import numpy as np
import torch

from config import (
    ANALYSIS_TYPE_TO_MODEL,
    ENSEMBLE_TRANSFORMER_WEIGHT,
    ENSEMBLE_WAV2VEC2_WEIGHT,
    MODEL_DIR,
    MODEL_VERSION,
)
from logger import get_logger
from models.nn_models import DeepFakeDetector
from models.transformer_models import TransformerDeepfakeDetector
from services.database_service import DatabaseService

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Wav2Vec2 classifier wrapper (unchanged public surface)
# ---------------------------------------------------------------------------
from transformers import Wav2Vec2FeatureExtractor, AutoModelForAudioClassification
import soundfile as sf
import torchaudio


class DeepfakeAudioDetector:
    """Wav2Vec2-based deepfake audio detector."""

    def __init__(self, model_path: str) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info("DeepfakeAudioDetector using device: %s", self.device)

        self.feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_path)
        self.model = AutoModelForAudioClassification.from_pretrained(
            model_path, use_safetensors=True
        ).to(self.device)

        self.id2label: dict[int, str] = getattr(
            self.model.config, "id2label", {0: "real", 1: "fake"}
        )
        logger.info("Model labels: %s", self.id2label)

    # ----- audio I/O -----
    def _load_audio(self, audio_path: str) -> np.ndarray:
        """Load and resample audio to 16 kHz mono."""
        try:
            waveform, _ = librosa.load(audio_path, sr=16000)
            return waveform.astype(np.float32)
        except Exception:
            logger.warning("librosa failed, falling back to torchaudio")
            waveform, sr = torchaudio.load(audio_path)
            if waveform.shape[0] > 1:
                waveform = torch.mean(waveform, dim=0)
            waveform_np = waveform.numpy()
            if sr != 16000:
                waveform_np = librosa.resample(waveform_np, orig_sr=sr, target_sr=16000)
            return waveform_np

    def preprocess_audio(self, audio_path: str) -> dict:
        waveform = self._load_audio(audio_path)
        return self.feature_extractor(waveform, sampling_rate=16000, return_tensors="pt")

    # ----- inference -----
    def detect(self, audio_path: str, threshold: float = 0.5) -> dict:
        inputs = self.preprocess_audio(audio_path)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            logits = self.model(**inputs).logits
            
            # Confidence Calibration (Temperature Scaling)
            # Models often produce overconfident probability distributions.
            # Temperature T > 1 softens the distribution.
            temperature = 1.5
            scaled_logits = logits / temperature
            probs = torch.nn.functional.softmax(scaled_logits, dim=1)
            
            pred_idx = torch.argmax(probs, dim=1)[0].cpu().item()
            confidence = probs[0][pred_idx].cpu().item()
            all_probs = probs[0].cpu().numpy()

        return {
            "prediction": self.id2label[pred_idx],
            "confidence": confidence,
            "label_index": pred_idx,
            "probabilities": {
                self.id2label[i]: float(p) for i, p in enumerate(all_probs)
            },
            "is_fake": pred_idx == 1
            if "fake" in self.id2label.values()
            else (confidence > threshold),
        }


@lru_cache(maxsize=1)
def get_wav2vec2_detector() -> DeepfakeAudioDetector:
    logger.info("Lazy-loading Wav2Vec2 detector into memory...")
    return DeepfakeAudioDetector(str(MODEL_DIR))

@lru_cache(maxsize=1)
def get_transformer_detector() -> TransformerDeepfakeDetector:
    logger.info("Lazy-loading Transformer detector into memory...")
    return TransformerDeepfakeDetector(str(MODEL_DIR))

# Result cache (cache size 100 items ≈ avoid memory leak)
_RESULT_CACHE = LRUCache(maxsize=100)

def _get_file_hash(path: str) -> str:
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------
def _resolve_model_name(analysis_type: str) -> str:
    return ANALYSIS_TYPE_TO_MODEL.get(analysis_type, "unknown-model")


def _get_audio_metadata(audio_path: str) -> tuple[int, float, int]:
    """Return ``(file_size, duration, sample_rate)`` for an audio file."""
    file_size = os.path.getsize(audio_path)
    try:
        y, sr = librosa.load(audio_path, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)
    except Exception as exc:
        logger.warning("Could not read audio metadata: %s", exc)
        duration, sr = 0.0, 16000
    return file_size, duration, sr


def _persist_results(
    *,
    user_id: str,
    audio_path: str,
    filename: str | None,
    detection_result: dict,
    features_used: list[str],
    feature_scores: dict,
    model_version: str,
    processing_time: float,
) -> dict[str, str]:
    """Store analysis artifacts in Firestore and return the created IDs."""
    db = DatabaseService()
    file_size, duration, sample_rate = _get_audio_metadata(audio_path)
    fname = filename or os.path.basename(audio_path)

    metadata_id = db.create_audio_metadata(
        user_id=user_id,
        filename=fname,
        file_size=file_size,
        duration=duration,
        sample_rate=sample_rate,
    )
    analysis_id = db.create_analysis_result(
        metadata_id=metadata_id,
        is_deepfake=detection_result["is_fake"],
        confidence_score=detection_result["confidence"],
        features_used=features_used,
    )
    details_id = db.create_result_details(
        analysis_id=analysis_id,
        feature_scores=feature_scores,
        model_version=model_version,
        processing_time=processing_time,
    )
    return {
        "metadata_id": metadata_id,
        "analysis_id": analysis_id,
        "details_id": details_id,
    }


def _error_result(
    exc: Exception,
    analysis_type: str = "advanced",
    filename: str | None = None,
    audio_path: str | None = None,
) -> dict:
    """Build a standardised error-response dict."""
    return {
        "error": str(exc),
        "probability": 0.0,
        "is_fake": None,
        "confidence": 0.0,
        "label": "error",
        "model_used": _resolve_model_name(analysis_type),
        "processing_time": 0,
        "filename": filename or (os.path.basename(audio_path) if audio_path else "unknown"),
    }


# ---------------------------------------------------------------------------
# Public API — unchanged signatures
# ---------------------------------------------------------------------------
def load_model(model_path: str | None = None) -> DeepFakeDetector:
    model = DeepFakeDetector()
    if model_path and os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=torch.device("cpu")))
    model.eval()
    return model


def detect_deepfake(
    audio_path: str,
    user_id: str | None = None,
    store_results: bool = True,
    filename: str | None = None,
    analysis_type: str = "advanced",
    language: str = "auto",  # BCP-47 tag (e.g. 'en', 'es', 'fr') or 'auto'
) -> dict:
    """
    Detect deepfake using the Wav2Vec2 model.

    Args:
        audio_path:    Path to the audio file to analyse.
        user_id:       Authenticated user ID (for persistence).
        store_results: Whether to persist results to the database.
        filename:      Original filename to display in results.
        analysis_type: Model variant (advanced | standard | ensemble).
        language:      BCP-47 language tag or 'auto' (default). The Wav2Vec2
                       XLSR model is trained on 53 languages and generalises
                       well across them; accuracy may vary for low-resource
                       languages and heavy accents.
    """
    start = time.time()
    try:
        file_hash = _get_file_hash(audio_path)
        cache_key = f"{file_hash}::{analysis_type}"

        if cache_key in _RESULT_CACHE:
            logger.info("Cache hit for audio %s (type=%s)", file_hash, analysis_type)
            result = _RESULT_CACHE[cache_key].copy()
            processing_time = (time.time() - start) * 1000
            result["processing_time"] = processing_time
            result["cache_hit"] = True
            result["filename"] = filename or os.path.basename(audio_path)
            # Make sure ID tags from previous cached items are wiped
            result.pop("metadata_id", None)
            result.pop("analysis_id", None)
            result.pop("details_id", None)
        else:
            detector = get_wav2vec2_detector()
            detection = detector.detect(audio_path)
            processing_time = (time.time() - start) * 1000

            result = {
                "probability": detection["confidence"],
                "is_fake": detection["is_fake"],
                "confidence": detection["confidence"],
                "label": detection["prediction"],
                "model_used": _resolve_model_name(analysis_type),
                "model_version": MODEL_VERSION,
                "processing_time": processing_time,
                "probabilities": detection["probabilities"],
                "filename": filename or os.path.basename(audio_path),
                "language": language,  # Multi-language support: BCP-47 tag or 'auto'
                "cache_hit": False,
            }
            # Cache the result before attaching DB IDs
            _RESULT_CACHE[cache_key] = result.copy()

        if store_results and user_id:
            try:
                ids = _persist_results(
                    user_id=user_id,
                    audio_path=audio_path,
                    filename=filename,
                    detection_result=result,
                    features_used=["wav2vec2-xlsr"],
                    feature_scores={"probabilities": detection["probabilities"]},
                    model_version=MODEL_VERSION,
                    processing_time=processing_time,
                )
                result.update(ids)
            except Exception as db_err:
                logger.error("DB persistence failed: %s", db_err)

        return result

    except Exception as exc:
        logger.exception("detect_deepfake failed")
        return _error_result(exc, analysis_type, filename, audio_path)


def detect_deepfake_ensemble(
    audio_path: str,
    user_id: str | None = None,
    store_results: bool = True,
    filename: str | None = None,
    use_transformer: bool = True,
) -> dict:
    """
    Ensemble detection using Wav2Vec2 + Transformer models.

    Public signature and return shape are unchanged from the original.
    """
    start = time.time()
    try:
        file_hash = _get_file_hash(audio_path)
        cache_key = f"{file_hash}::ensemble::{use_transformer}"

        if cache_key in _RESULT_CACHE:
            logger.info("Cache hit for audio %s (ensemble)", file_hash)
            final = _RESULT_CACHE[cache_key].copy()
            processing_time = (time.time() - start) * 1000
            final["processing_time"] = processing_time
            final["cache_hit"] = True
            final["filename"] = filename or os.path.basename(audio_path)
            # Strip previous IDs
            final.pop("metadata_id", None)
            final.pop("analysis_id", None)
            final.pop("details_id", None)
            results = final.get("detailed_results", {})
        else:
            # --- Wav2Vec2 leg ---
            wav2vec2_result = detect_deepfake(
                audio_path, user_id=None, store_results=False, filename=filename
            )

            results: dict = {
                "wav2vec2_result": wav2vec2_result,
                "transformer_result": None,
                "ensemble_result": None,
                "attention_analysis": None,
            }

            # --- Transformer leg ---
            if use_transformer:
                transformer = get_transformer_detector()
                transformer_result = transformer.detect(audio_path)
                results["transformer_result"] = transformer_result
                results["attention_analysis"] = transformer.get_attention_analysis(audio_path)

                # Ensemble only if both models succeeded
                if not wav2vec2_result.get("error") and not transformer_result.get("error"):
                    w2v_conf = wav2vec2_result.get("confidence", 0.0)
                    tf_conf = transformer_result.get("confidence", 0.0)
                    ensemble_conf = (
                        w2v_conf * ENSEMBLE_WAV2VEC2_WEIGHT
                        + tf_conf * ENSEMBLE_TRANSFORMER_WEIGHT
                    )

                    w2v_fake = wav2vec2_result.get("is_fake", False)
                    tf_fake = transformer_result.get("is_fake", False)

                    if w2v_fake == tf_fake:
                        ensemble_pred = w2v_fake
                    else:
                        ensemble_pred = ensemble_conf > 0.5

                    results["ensemble_result"] = {
                        "prediction": "fake" if ensemble_pred else "real",
                        "confidence": ensemble_conf,
                        "is_fake": ensemble_pred,
                        "model_used": "wav2vec2_transformer_ensemble",
                        "model_version": f"{MODEL_VERSION}_ensemble",
                        "wav2vec2_weight": ENSEMBLE_WAV2VEC2_WEIGHT,
                        "transformer_weight": ENSEMBLE_TRANSFORMER_WEIGHT,
                        "individual_confidences": {
                            "wav2vec2": w2v_conf,
                            "transformer": tf_conf,
                        },
                    }

            processing_time = (time.time() - start) * 1000
            final = results.get("ensemble_result") or wav2vec2_result
            final["processing_time"] = processing_time
            final["filename"] = filename or os.path.basename(audio_path)
            final["detailed_results"] = results
            final["cache_hit"] = False
            
            # Cache it
            _RESULT_CACHE[cache_key] = final.copy()

        # --- Persist ---
        if store_results and user_id and not final.get("error"):
            try:
                features_used = ["wav2vec2-xlsr"]
                if use_transformer:
                    features_used.append("transformer-attention")

                feature_scores: dict = {
                    "wav2vec2_probabilities": wav2vec2_result.get("probabilities", {}),
                    "ensemble_result": results.get("ensemble_result"),
                    "attention_analysis": results.get("attention_analysis"),
                }
                if results.get("transformer_result"):
                    feature_scores["transformer_probabilities"] = (
                        results["transformer_result"].get("probabilities", {})
                    )
                    feature_scores["attention_weights"] = (
                        results["transformer_result"].get("attention_weights", [])
                    )

                ids = _persist_results(
                    user_id=user_id,
                    audio_path=audio_path,
                    filename=filename,
                    detection_result=final,
                    features_used=features_used,
                    feature_scores=feature_scores,
                    model_version=(
                        f"{MODEL_VERSION}_ensemble" if use_transformer else MODEL_VERSION
                    ),
                    processing_time=processing_time,
                )
                final.update(ids)

            except Exception as db_err:
                logger.error("DB persistence (ensemble) failed: %s", db_err)

        final["detailed_results"] = results
        return final

    except Exception as exc:
        logger.exception("detect_deepfake_ensemble failed")
        return _error_result(exc, "ensemble", filename, audio_path)