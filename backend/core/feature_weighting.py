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