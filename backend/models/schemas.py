"""
API request / response schemas (Pydantic models).

These are pure data contracts — no ML or business logic belongs here.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class AnalysisModel(str, Enum):
    """Valid model selection for detection endpoints."""
    standard = "standard"
    advanced = "advanced"
    ensemble = "ensemble"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    username: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ---------------------------------------------------------------------------
# Audio metadata
# ---------------------------------------------------------------------------
class AudioMetadataCreate(BaseModel):
    filename: str
    file_size: int
    duration: float
    sample_rate: int


class AudioMetadata(AudioMetadataCreate):
    id: str
    user_id: str
    upload_timestamp: str


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------
class AnalysisResultCreate(BaseModel):
    metadata_id: str
    is_deepfake: bool
    confidence_score: float
    features_used: List[str]


class AnalysisResult(AnalysisResultCreate):
    id: str
    analysis_timestamp: str


# ---------------------------------------------------------------------------
# Result details
# ---------------------------------------------------------------------------
class ResultDetailsCreate(BaseModel):
    analysis_id: str
    feature_scores: Dict[str, float]
    model_version: str
    processing_time: float


class ResultDetails(ResultDetailsCreate):
    id: str
    created_at: str


# ---------------------------------------------------------------------------
# Combined response
# ---------------------------------------------------------------------------
class CompleteAnalysis(BaseModel):
    id: str
    metadata_id: str
    is_deepfake: bool
    confidence_score: float
    features_used: List[str]
    analysis_timestamp: str
    metadata: Optional[AudioMetadata] = None
    details: Optional[ResultDetails] = None


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------
class PaginationMeta(BaseModel):
    """Cursor-based pagination metadata included in list responses."""
    per_page: int
    has_next: bool
    next_cursor: Optional[str] = None


class PaginatedAnalysisResponse(BaseModel):
    """Envelope for paginated analysis list with HATEOAS links."""
    data: List[Dict[str, Any]]
    pagination: PaginationMeta
    _links: Dict[str, Any] = Field(default_factory=dict, alias="_links")

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# Delete request
# ---------------------------------------------------------------------------
class DeleteAnalysesRequest(BaseModel):
    """Typed request body for bulk deletion."""
    ids: List[str]
