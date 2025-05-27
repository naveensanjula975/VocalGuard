import numpy as np
import librosa
import torch
import torchaudio
from transformers import Wav2Vec2Processor, Wav2Vec2Model
import os
import hashlib
import time
import json
from pathlib import Path
# Initialize Wav2Vec2 model and processor (lazy loading)
_wav2vec2_model = None
_wav2vec2_processor = None

# Cache for Wav2Vec2 embeddings
_wav2vec2_cache = {}
_cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cache")
_cache_file = os.path.join(_cache_dir, "wav2vec2_cache.json")
_max_cache_size = 100  # Maximum number of items in cache