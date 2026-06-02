"""
Application configuration — single source of truth for all settings.

Reads from environment variables (via .env) and exposes typed constants.
Import this module wherever you need config; never call os.getenv() in
business logic.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent  # …/backend
_model_dir_env = os.getenv("MODEL_DIR", "")
MODEL_DIR: str | Path
if _model_dir_env and Path(_model_dir_env).exists():
    MODEL_DIR = Path(_model_dir_env)
elif _model_dir_env:
    # Treat as Hugging Face repo ID (e.g. "user/vocalguard-wav2vec2")
    MODEL_DIR = _model_dir_env
else:
    MODEL_DIR = BASE_DIR / "models" / "deepfake_audio_model"

HF_TOKEN: str = os.getenv("HF_TOKEN", "")

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
load_dotenv(BASE_DIR / ".env")

FIREBASE_WEB_API_KEY: str = os.getenv("FIREBASE_WEB_API_KEY", "")

# ---------------------------------------------------------------------------
# API versioning
# ---------------------------------------------------------------------------
API_V1_PREFIX = "/api/v1"

# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------
DEFAULT_PAGE_SIZE: int = 20
MAX_PAGE_SIZE: int = 100

# ---------------------------------------------------------------------------
# CORS — tighten in production by setting ALLOWED_ORIGINS env var
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS: list[str] = os.getenv(
    "ALLOWED_ORIGINS", "*"
).split(",")

# ---------------------------------------------------------------------------
# Model metadata
# ---------------------------------------------------------------------------
MODEL_VERSION = "3.0.0"

VALID_ANALYSIS_MODELS = ("standard", "advanced", "ensemble")

ANALYSIS_TYPE_TO_MODEL: dict[str, str] = {
    "advanced": "wav2vec2-xlsr-deepfake",
    "standard": "standard-ml-classifier",
    "ensemble": "wav2vec2_transformer_ensemble",
    "demo": "wav2vec2-demo",
}

# ---------------------------------------------------------------------------
# Ensemble weights
# ---------------------------------------------------------------------------
ENSEMBLE_WAV2VEC2_WEIGHT: float = 0.6
ENSEMBLE_TRANSFORMER_WEIGHT: float = 0.4

# ---------------------------------------------------------------------------
# File Upload Validation
# ---------------------------------------------------------------------------
ALLOWED_AUDIO_TYPES: list[str] = [
    "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3",
    "audio/x-m4a", "audio/ogg", "audio/flac", "audio/aac",
    "video/mp4", "audio/mp4"  # some devices send m4a as mp4 mime
]
ALLOWED_AUDIO_EXTENSIONS: list[str] = [
    ".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aac"
]
MAX_AUDIO_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB
