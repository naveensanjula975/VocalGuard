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

def _get_audio_hash(audio_path):
    """
    Generate a hash for an audio file based on its content and metadata
    
    Args:
        audio_path: Path to the audio file
        
    Returns:
        str: Hash value for the audio file
    """
    try:
        file_stats = os.stat(audio_path)
        # Use file size and modification time as part of the hash
        metadata = f"{file_stats.st_size}_{file_stats.st_mtime}"
        
        # Hash the first 1MB of the file content for uniqueness
        with open(audio_path, "rb") as f:
            content = f.read(1024 * 1024)
            content_hash = hashlib.md5(content).hexdigest()
        
        # Combine metadata and content hash
        combined_hash = f"{metadata}_{content_hash}"
        return hashlib.md5(combined_hash.encode()).hexdigest()
    except Exception as e:
        print(f"Error generating audio hash: {e}")
        # Fallback to just the file path
        return hashlib.md5(audio_path.encode()).hexdigest()