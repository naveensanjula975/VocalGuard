"""
Feature Weighting Module for VocalGuard

This module provides functions for dynamically adjusting the weights of different 
feature extractors (Wav2Vec2 vs traditional features) based on audio characteristics.
"""

import numpy as np
import librosa
import os
from pathlib import Path
import json

# Default weights
DEFAULT_WEIGHTS = {
    'wav2vec2': 0.7,
    'mfcc': 0.2,
    'spectral': 0.1
}
# Cache directory
_cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cache")
_weights_file = os.path.join(_cache_dir, "feature_weights.json")

# Global weights
_feature_weights = DEFAULT_WEIGHTS.copy()
def load_weights():
    """Load feature weights from disk"""
    global _feature_weights
    
    if not os.path.exists(_cache_dir):
        os.makedirs(_cache_dir, exist_ok=True)
    
    if os.path.exists(_weights_file):
        try:
            with open(_weights_file, 'r') as f:
                _feature_weights = json.load(f)
        except Exception:
            # Silently fall back to default weights
            _feature_weights = DEFAULT_WEIGHTS.copy()
    else:
        _feature_weights = DEFAULT_WEIGHTS.copy()
        save_weights()
        def save_weights():
    """Save feature weights to disk"""
    if not os.path.exists(_cache_dir):
        os.makedirs(_cache_dir, exist_ok=True)
    try:
        with open(_weights_file, 'w') as f:
            json.dump(_feature_weights, f)
    except Exception:
        # Silently continue if weights can't be saved
        pass
    def calculate_audio_complexity(audio, sr):
    """
    Calculate audio complexity metrics to determine optimal feature weighting
    
    Args:
        audio: Audio waveform
        sr: Sample rate
    
    Returns:
        float: Complexity score (0.0 to 1.0)
    """
    # Calculate spectral flatness (measure of noisiness vs. tonality)
    spec_flat = np.mean(librosa.feature.spectral_flatness(y=audio))
    
    # Calculate spectral contrast (difference between peaks and valleys)
    spec_contrast = librosa.feature.spectral_contrast(y=audio, sr=sr)
    contrast_mean = np.mean(spec_contrast)
    
    # Calculate spectral bandwidth
    bandwidth = np.mean(librosa.feature.spectral_bandwidth(y=audio, sr=sr))
    norm_bandwidth = min(1.0, bandwidth / (sr / 4))  # Normalize by Nyquist freq / 2
    
    # Calculate zero crossing rate (measure of noisiness)
    zcr = np.mean(librosa.feature.zero_crossing_rate(audio))
    
    # Combine metrics into a complexity score (0.0 to 1.0)
    complexity = (spec_flat * 0.3 + contrast_mean * 0.3 + norm_bandwidth * 0.2 + zcr * 0.2)
    
    # Normalize to 0.0-1.0 range if needed
    complexity = min(1.0, max(0.0, complexity))
    
    return complexity