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
