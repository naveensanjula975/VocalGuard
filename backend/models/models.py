"""
Backward-compatibility re-exports.

New code should import directly from ``models.schemas`` (Pydantic models)
or ``models.nn_models`` (PyTorch architectures).

This file exists so that legacy imports like
``from models.models import DeepFakeDetector`` continue to work.
"""

from .nn_models import DeepFakeDetector
from .schemas import (
    AnalysisResult,
    AnalysisResultCreate,
    AudioMetadata,
    AudioMetadataCreate,
    CompleteAnalysis,
    ResultDetails,
    ResultDetailsCreate,
    UserLogin,
    UserSignUp,
)

__all__ = [
    "AnalysisResult",
    "AnalysisResultCreate",
    "AudioMetadata",
    "AudioMetadataCreate",
    "CompleteAnalysis",
    "DeepFakeDetector",
    "ResultDetails",
    "ResultDetailsCreate",
    "UserLogin",
    "UserSignUp",
]