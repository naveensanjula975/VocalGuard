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
    
    def _load_cache():
        """Load embedding cache from disk"""
    global _wav2vec2_cache
    
    if not os.path.exists(_cache_dir):
        os.makedirs(_cache_dir, exist_ok=True)
        
    if os.path.exists(_cache_file):
        try:
            with open(_cache_file, 'r') as f:
                cache_data = json.load(f)
                
            # Convert lists back to numpy arrays
            for key, value in cache_data.items():
                if 'embedding' in value:
                    value['embedding'] = np.array(value['embedding'])
            _wav2vec2_cache = cache_data
        except Exception as e:
            # Silent fail for cache loading issues
            _wav2vec2_cache = {}
    else:
        _wav2vec2_cache = {}

def _save_cache():
    """Save embedding cache to disk"""
    if not _wav2vec2_cache:
        return
        
    if not os.path.exists(_cache_dir):
        os.makedirs(_cache_dir, exist_ok=True)
    
    try:
        # Convert numpy arrays to lists for JSON serialization
        cache_data = {}
        for key, value in _wav2vec2_cache.items():
            cache_data[key] = {
                'timestamp': value['timestamp'],
                'filename': value['filename']
            }
            if 'embedding' in value:
                cache_data[key]['embedding'] = value['embedding'].tolist()
        
        with open(_cache_file, 'w') as f:
            json.dump(cache_data, f)
    except Exception:
        # Silent fail for cache saving issues
        pass

def _trim_cache():
    """Trim the cache to the maximum size by removing oldest entries"""
    global _wav2vec2_cache
    
    if len(_wav2vec2_cache) <= _max_cache_size:
        return
        
    # Sort by timestamp (oldest first)
    sorted_items = sorted(_wav2vec2_cache.items(), key=lambda x: x[1]['timestamp'])
    
    # Remove oldest items
    items_to_remove = len(_wav2vec2_cache) - _max_cache_size
    for i in range(items_to_remove):
        key, _ = sorted_items[i]
        del _wav2vec2_cache[key]
        
        # Load cache at module initialization
_load_cache()

def _get_wav2vec2():
    """
    Lazy initialization of the Wav2Vec2 model and processor
    """
    global _wav2vec2_model, _wav2vec2_processor
    
    if _wav2vec2_model is None or _wav2vec2_processor is None:
        # Initialize model - using facebook/wav2vec2-base
        model_name = "facebook/wav2vec2-base"
        print(f"Loading Wav2Vec2 model: {model_name}")
        _wav2vec2_processor = Wav2Vec2Processor.from_pretrained(model_name)
        _wav2vec2_model = Wav2Vec2Model.from_pretrained(model_name)
        
        # Set model to evaluation mode
        _wav2vec2_model.eval()
        
        # Enable gradient checkpointing if needed (fixes deprecation warning)
        if hasattr(_wav2vec2_model, "gradient_checkpointing_enable"):
            _wav2vec2_model.gradient_checkpointing_enable()
    
    return _wav2vec2_model, _wav2vec2_processor