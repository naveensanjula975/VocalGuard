# Models package — re-exports for backward compatibility
#
# Schemas (Pydantic):
from .schemas import (
    AnalysisModel,
    UserSignUp,
    UserLogin,
    AudioMetadata,
    AudioMetadataCreate,
    AnalysisResult,
    AnalysisResultCreate,
    ResultDetails,
    ResultDetailsCreate,
    CompleteAnalysis,
    DeleteAnalysesRequest,
    PaginationMeta,
    PaginatedAnalysisResponse,
)

# Neural-network architectures (PyTorch):
from .nn_models import DeepFakeDetector

__all__ = [
    # enums
    "AnalysisModel",
    # schemas
    "UserSignUp",
    "UserLogin",
    "AudioMetadata",
    "AudioMetadataCreate",
    "AnalysisResult",
    "AnalysisResultCreate",
    "ResultDetails",
    "ResultDetailsCreate",
    "CompleteAnalysis",
    "DeleteAnalysesRequest",
    "PaginationMeta",
    "PaginatedAnalysisResponse",
    # nn
    "DeepFakeDetector",
]
