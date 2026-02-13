"""
Feature Weighting Module for VocalGuard.

Provides functions for dynamically adjusting the weights of different
feature extractors (Wav2Vec2 vs traditional features) based on audio
characteristics.
"""

import json
from pathlib import Path

import librosa
import numpy as np

from logger import get_logger

logger = get_logger(__name__)

# Default weights
DEFAULT_WEIGHTS = {
    "wav2vec2": 0.7,
    "mfcc": 0.2,
    "spectral": 0.1,
}

# Cache directory
_cache_dir = Path(__file__).resolve().parent.parent / "cache"
_weights_file = _cache_dir / "feature_weights.json"

# Global weights
_feature_weights = DEFAULT_WEIGHTS.copy()


def load_weights():
    """Load feature weights from disk."""
    global _feature_weights

    _cache_dir.mkdir(parents=True, exist_ok=True)

    if _weights_file.exists():
        try:
            with open(_weights_file) as f:
                _feature_weights = json.load(f)
        except Exception:
            _feature_weights = DEFAULT_WEIGHTS.copy()
    else:
        _feature_weights = DEFAULT_WEIGHTS.copy()
        save_weights()


def save_weights():
    """Save feature weights to disk."""
    _cache_dir.mkdir(parents=True, exist_ok=True)
    try:
        with open(_weights_file, "w") as f:
            json.dump(_feature_weights, f)
    except Exception:
        pass


def calculate_audio_complexity(audio, sr):
    """
    Calculate audio complexity metrics to determine optimal feature weighting.

    Args:
        audio: Audio waveform
        sr: Sample rate

    Returns:
        float: Complexity score (0.0 to 1.0)
    """
    spec_flat = np.mean(librosa.feature.spectral_flatness(y=audio))

    spec_contrast = librosa.feature.spectral_contrast(y=audio, sr=sr)
    contrast_mean = np.mean(spec_contrast)

    bandwidth = np.mean(librosa.feature.spectral_bandwidth(y=audio, sr=sr))
    norm_bandwidth = min(1.0, bandwidth / (sr / 4))

    zcr = np.mean(librosa.feature.zero_crossing_rate(audio))

    complexity = (
        spec_flat * 0.3
        + contrast_mean * 0.3
        + norm_bandwidth * 0.2
        + zcr * 0.2
    )
    return min(1.0, max(0.0, complexity))


def adjust_weights(audio, sr):
    """
    Dynamically adjust feature weights based on audio characteristics.

    Args:
        audio: Audio waveform
        sr: Sample rate

    Returns:
        dict: Updated feature weights
    """
    complexity = calculate_audio_complexity(audio, sr)

    if complexity < 0.3:
        return {"wav2vec2": 0.8, "mfcc": 0.15, "spectral": 0.05}
    elif complexity < 0.6:
        return {"wav2vec2": 0.6, "mfcc": 0.25, "spectral": 0.15}
    else:
        return {"wav2vec2": 0.4, "mfcc": 0.35, "spectral": 0.25}


def get_weights(audio=None, sr=None):
    """
    Get current feature weights, optionally adjusting for specific audio.

    Args:
        audio: Optional audio waveform
        sr: Optional sample rate

    Returns:
        dict: Feature weights
    """
    if audio is not None and sr is not None:
        return adjust_weights(audio, sr)
    return _feature_weights


def update_weights(new_weights):
    """
    Update global feature weights based on performance feedback.

    Args:
        new_weights: Dictionary of new weights
    """
    global _feature_weights

    total = sum(new_weights.values())
    if total > 0:
        _feature_weights = {k: v / total for k, v in new_weights.items()}
        save_weights()
    else:
        logger.warning("Invalid weights: sum must be greater than 0")


# Load weights at module initialisation
load_weights()
