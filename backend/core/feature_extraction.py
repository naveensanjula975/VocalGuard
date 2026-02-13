"""
Audio feature extraction using Wav2Vec2 and traditional methods.

Provides a unified ``extract_features`` function that combines
Wav2Vec2 embeddings with classical MFCC / spectral features, and
a caching layer to avoid redundant model inference.
"""

import hashlib
import json
import time
from pathlib import Path

import librosa
import numpy as np
import torch
import torchaudio
from transformers import Wav2Vec2Processor, Wav2Vec2Model

from logger import get_logger

logger = get_logger(__name__)

# Initialise Wav2Vec2 model and processor (lazy loading)
_wav2vec2_model = None
_wav2vec2_processor = None

# Cache for Wav2Vec2 embeddings
_wav2vec2_cache: dict = {}
_cache_dir = Path(__file__).resolve().parent.parent / "cache"
_cache_file = _cache_dir / "wav2vec2_cache.json"
_max_cache_size = 100


def _get_audio_hash(audio_path):
    """
    Generate a hash for an audio file based on its content and metadata.

    Args:
        audio_path: Path to the audio file

    Returns:
        str: Hash value for the audio file
    """
    try:
        file_stats = Path(audio_path).stat()
        metadata = f"{file_stats.st_size}_{file_stats.st_mtime}"

        with open(audio_path, "rb") as f:
            content = f.read(1024 * 1024)
            content_hash = hashlib.md5(content).hexdigest()

        combined_hash = f"{metadata}_{content_hash}"
        return hashlib.md5(combined_hash.encode()).hexdigest()
    except Exception as exc:
        logger.warning("Error generating audio hash: %s", exc)
        return hashlib.md5(audio_path.encode()).hexdigest()


def _load_cache():
    """Load embedding cache from disk."""
    global _wav2vec2_cache

    _cache_dir.mkdir(parents=True, exist_ok=True)

    if _cache_file.exists():
        try:
            with open(_cache_file) as f:
                cache_data = json.load(f)

            for value in cache_data.values():
                if "embedding" in value:
                    value["embedding"] = np.array(value["embedding"])
            _wav2vec2_cache = cache_data
        except Exception:
            _wav2vec2_cache = {}
    else:
        _wav2vec2_cache = {}


def _save_cache():
    """Save embedding cache to disk."""
    if not _wav2vec2_cache:
        return

    _cache_dir.mkdir(parents=True, exist_ok=True)

    try:
        cache_data = {}
        for key, value in _wav2vec2_cache.items():
            cache_data[key] = {
                "timestamp": value["timestamp"],
                "filename": value["filename"],
            }
            if "embedding" in value:
                cache_data[key]["embedding"] = value["embedding"].tolist()

        with open(_cache_file, "w") as f:
            json.dump(cache_data, f)
    except Exception:
        pass


def _trim_cache():
    """Trim the cache to the maximum size by removing oldest entries."""
    global _wav2vec2_cache

    if len(_wav2vec2_cache) <= _max_cache_size:
        return

    sorted_items = sorted(
        _wav2vec2_cache.items(), key=lambda x: x[1]["timestamp"],
    )
    items_to_remove = len(_wav2vec2_cache) - _max_cache_size
    for i in range(items_to_remove):
        key, _ = sorted_items[i]
        del _wav2vec2_cache[key]


# Load cache at module initialisation
_load_cache()


def _get_wav2vec2():
    """Lazy-initialise and return the Wav2Vec2 model and processor."""
    global _wav2vec2_model, _wav2vec2_processor

    if _wav2vec2_model is None or _wav2vec2_processor is None:
        model_name = "facebook/wav2vec2-base"
        logger.info("Loading Wav2Vec2 model: %s", model_name)
        _wav2vec2_processor = Wav2Vec2Processor.from_pretrained(model_name)
        _wav2vec2_model = Wav2Vec2Model.from_pretrained(model_name)
        _wav2vec2_model.eval()

        if hasattr(_wav2vec2_model, "gradient_checkpointing_enable"):
            _wav2vec2_model.gradient_checkpointing_enable()

    return _wav2vec2_model, _wav2vec2_processor


# -----------------------------------------------------------------------
# Traditional feature extraction (shared helper)
# -----------------------------------------------------------------------
def _extract_traditional_features(y, sr, n_mfcc=40):
    """Extract MFCC and spectral features from a waveform.

    Returns a 1-D numpy array of length ``n_mfcc * 2 + 3``.
    """
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    mfcc_mean = np.mean(mfccs, axis=1)
    mfcc_var = np.var(mfccs, axis=1)
    mfcc_features = np.concatenate((mfcc_mean, mfcc_var))

    spectral_centroid = np.mean(
        librosa.feature.spectral_centroid(y=y, sr=sr)[0],
    )
    spectral_rolloff = np.mean(
        librosa.feature.spectral_rolloff(y=y, sr=sr)[0],
    )
    zcr = np.mean(librosa.feature.zero_crossing_rate(y)[0])

    return np.concatenate(
        (mfcc_features, [spectral_centroid, spectral_rolloff, zcr]),
    )


def extract_features(audio_path, sr=16000, n_mfcc=40, use_wav2vec2=True):
    """
    Extract audio features from an audio file.

    Combines Wav2Vec2 embeddings (when enabled) with traditional MFCC
    and spectral features.

    Args:
        audio_path: Path to the audio file
        sr: Sample rate (default: 16000 — Wav2Vec2 expected sample rate)
        n_mfcc: Number of MFCC features to extract (default: 40)
        use_wav2vec2: Whether to use Wav2Vec2 features (default: True)

    Returns:
        numpy.ndarray: Extracted features
    """
    try:
        y, orig_sr = librosa.load(audio_path, sr=None)

        if orig_sr != 16000:
            y_16k = librosa.resample(y, orig_sr=orig_sr, target_sr=16000)
        else:
            y_16k = y

        traditional = _extract_traditional_features(y, orig_sr, n_mfcc)

        if use_wav2vec2:
            wav2vec2_features = extract_wav2vec2_features(y_16k, audio_path)
            return np.concatenate((wav2vec2_features, traditional))

        return traditional

    except Exception as exc:
        logger.error("Error extracting features: %s", exc)
        fallback_size = (
            768 + n_mfcc * 2 + 3 if use_wav2vec2 else n_mfcc * 2 + 3
        )
        return np.zeros(fallback_size)


def extract_wav2vec2_features(
    waveform_or_path, audio_path=None, max_length=160000,
):
    """
    Extract features using the Wav2Vec2 model.

    Args:
        waveform_or_path: Audio waveform (16 kHz) or path to audio file
        audio_path: Path to the audio file (used for caching)
        max_length: Maximum waveform length in samples
            (default: 160 000 = 10 s at 16 kHz)

    Returns:
        numpy.ndarray: Wav2Vec2 features
    """
    try:
        model, processor = _get_wav2vec2()

        if isinstance(waveform_or_path, str):
            waveform, _sr = librosa.load(waveform_or_path, sr=16000)
        else:
            waveform = waveform_or_path

        audio_hash = _get_audio_hash(audio_path) if audio_path else None

        if audio_hash and audio_hash in _wav2vec2_cache:
            logger.debug("Using cached Wav2Vec2 embedding for %s", audio_path)
            return _wav2vec2_cache[audio_hash]["embedding"]

        if len(waveform) > max_length:
            waveform = waveform[:max_length]

        waveform_tensor = torch.tensor(waveform).float()

        inputs = processor(
            waveform_tensor,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True,
        )

        with torch.no_grad():
            outputs = model(**inputs)

        hidden_states = outputs.last_hidden_state
        wav2vec2_embeddings = (
            torch.mean(hidden_states, dim=1).squeeze().numpy()
        )

        if audio_hash:
            _wav2vec2_cache[audio_hash] = {
                "timestamp": time.time(),
                "filename": audio_path,
                "embedding": wav2vec2_embeddings,
            }
            _trim_cache()
            _save_cache()

        return wav2vec2_embeddings

    except Exception as exc:
        logger.error("Error extracting Wav2Vec2 features: %s", exc)
        return np.zeros(768)