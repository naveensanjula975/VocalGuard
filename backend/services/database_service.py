"""
Firestore database service — data-access layer.

All Firestore reads / writes go through this class so that the rest of
the codebase never deals with raw Firestore queries.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Any

from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from logger import get_logger

logger = get_logger(__name__)


class DatabaseService:
    """Service for interacting with Firebase Firestore."""

    def __init__(self) -> None:
        self.db = firestore.client()

    # ------------------------------------------------------------------
    # Create helpers
    # ------------------------------------------------------------------
    def create_audio_metadata(
        self,
        user_id: str,
        filename: str,
        file_size: int,
        duration: float,
        sample_rate: int,
        channels: int = 2,
        bit_depth: str = "16 bits",
        upload_timestamp: str | None = None,
    ) -> str:
        """Store metadata about an uploaded audio file and return its ID."""
        metadata_id = str(uuid.uuid4())
        timestamp = upload_timestamp or datetime.datetime.now(
            datetime.timezone.utc,
        ).isoformat()

        self.db.collection("audio_metadata").document(metadata_id).set(
            {
                "id": metadata_id,
                "user_id": user_id,
                "filename": filename,
                "file_size": file_size,
                "duration": duration,
                "sample_rate": sample_rate,
                "channels": channels,
                "bit_depth": bit_depth,
                "upload_timestamp": timestamp,
            }
        )
        return metadata_id

    def create_analysis_result(
        self,
        metadata_id: str,
        is_deepfake: bool,
        confidence_score: float,
        features_used: list[str],
        analysis_timestamp: str | None = None,
    ) -> str:
        """Store a deepfake analysis result and return its ID."""
        analysis_id = str(uuid.uuid4())
        timestamp = analysis_timestamp or datetime.datetime.now(
            datetime.timezone.utc,
        ).isoformat()

        self.db.collection("analysis_results").document(analysis_id).set(
            {
                "id": analysis_id,
                "metadata_id": metadata_id,
                "is_deepfake": is_deepfake,
                "confidence_score": confidence_score,
                "features_used": features_used,
                "analysis_timestamp": timestamp,
            }
        )
        return analysis_id

    def create_result_details(
        self,
        analysis_id: str,
        feature_scores: dict[str, float],
        model_version: str,
        processing_time: float,
    ) -> str:
        """Store detailed analysis breakdown and return its ID."""
        details_id = str(uuid.uuid4())

        self.db.collection("result_details").document(details_id).set(
            {
                "id": details_id,
                "analysis_id": analysis_id,
                "feature_scores": feature_scores,
                "model_version": model_version,
                "processing_time": processing_time,
                "created_at": datetime.datetime.now(
                    datetime.timezone.utc,
                ).isoformat(),
            }
        )
        return details_id

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------
    def get_user_analyses(
        self,
        user_id: str,
        per_page: int = 20,
        after_cursor: str | None = None,
    ) -> tuple[list[dict[str, Any]], str | None]:
        """Return paginated analyses for *user_id*.

        Returns:
            ``(data, next_cursor)`` — *next_cursor* is ``None`` when
            there are no more pages.
        """
        query = (
            self.db.collection("audio_metadata")
            .where(filter=FieldFilter("user_id", "==", user_id))
            .order_by("upload_timestamp", direction=firestore.Query.DESCENDING)
            .limit(per_page + 1)
        )

        if after_cursor:
            cursor_doc = (
                self.db.collection("audio_metadata")
                .document(after_cursor)
                .get()
            )
            if cursor_doc.exists:
                query = query.start_after(cursor_doc)

        metadata_docs = list(query.stream())
        has_more = len(metadata_docs) > per_page
        metadata_docs = metadata_docs[:per_page]

        next_cursor = metadata_docs[-1].id if has_more and metadata_docs else None

        analyses: list[dict] = []
        for metadata_doc in metadata_docs:
            metadata = metadata_doc.to_dict()
            metadata_id = metadata_doc.id

            analysis_stream = (
                self.db.collection("analysis_results")
                .where(filter=FieldFilter("metadata_id", "==", metadata_id))
                .stream()
            )
            for analysis_doc in analysis_stream:
                merged = {**metadata, **analysis_doc.to_dict()}
                analysis_id = analysis_doc.id

                # Attach details if present
                for details_doc in (
                    self.db.collection("result_details")
                    .where(filter=FieldFilter("analysis_id", "==", analysis_id))
                    .limit(1)
                    .stream()
                ):
                    merged["details"] = details_doc.to_dict()

                analyses.append(merged)

        return analyses, next_cursor

    def get_analysis(self, analysis_id: str) -> dict[str, Any] | None:
        """Return a single analysis with related metadata and details."""
        analysis_doc = (
            self.db.collection("analysis_results")
            .document(analysis_id)
            .get()
        )
        if not analysis_doc.exists:
            return None

        analysis = analysis_doc.to_dict()

        # Related metadata
        metadata_doc = (
            self.db.collection("audio_metadata")
            .document(analysis["metadata_id"])
            .get()
        )
        metadata = metadata_doc.to_dict() if metadata_doc.exists else None

        # Related details
        details = None
        for details_doc in (
            self.db.collection("result_details")
            .where(filter=FieldFilter("analysis_id", "==", analysis_id))
            .limit(1)
            .stream()
        ):
            details = details_doc.to_dict()

        return {**analysis, "metadata": metadata, "details": details}

    # ------------------------------------------------------------------
    # Delete helpers
    # ------------------------------------------------------------------
    def delete_analysis(self, analysis_id: str) -> bool:
        """Delete an analysis and cascade to related details (and orphaned metadata)."""
        try:
            analysis_doc = (
                self.db.collection("analysis_results")
                .document(analysis_id)
                .get()
            )
            if not analysis_doc.exists:
                return False

            analysis = analysis_doc.to_dict()
            metadata_id = analysis.get("metadata_id")

            # Delete related details
            for details_doc in (
                self.db.collection("result_details")
                .where(filter=FieldFilter("analysis_id", "==", analysis_id))
                .stream()
            ):
                details_doc.reference.delete()

            # Delete the analysis
            self.db.collection("analysis_results").document(analysis_id).delete()

            # Clean up orphaned metadata
            if metadata_id:
                remaining = list(
                    self.db.collection("analysis_results")
                    .where(filter=FieldFilter("metadata_id", "==", metadata_id))
                    .limit(1)
                    .stream()
                )
                if not remaining:
                    self.db.collection("audio_metadata").document(metadata_id).delete()

            return True
        except Exception as exc:
            logger.error("Error deleting analysis %s: %s", analysis_id, exc)
            return False

    def delete_multiple_analyses(self, analysis_ids: list[str]) -> dict[str, bool]:
        """Delete several analyses and return a success map."""
        return {aid: self.delete_analysis(aid) for aid in analysis_ids}

    # ------------------------------------------------------------------
    # Demo data
    # ------------------------------------------------------------------
    _DUMMY_FILES = [
        {"name": "audio_clip_10.wav", "size": 1245670, "duration": 15.3, "sample_rate": 44100, "date": "2025-02-07", "is_fake": False, "confidence": 0.97},
        {"name": "audio_clip_09.mp3", "size": 3456700, "duration": 32.4, "sample_rate": 48000, "date": "2025-02-01", "is_fake": True,  "confidence": 0.75},
        {"name": "audio_clip_08.wav", "size": 567890,  "duration": 24.8, "sample_rate": 44100, "date": "2025-01-30", "is_fake": False, "confidence": 1.0},
    ]

    def create_dummy_data(self, user_id: str) -> list[str]:
        """Seed the database with sample analysis records for *user_id*."""
        analysis_ids: list[str] = []
        features = ["mfcc", "spectral_centroid", "zero_crossing_rate", "spectral_rolloff"]

        for f in self._DUMMY_FILES:
            metadata_id = self.create_audio_metadata(
                user_id=user_id,
                filename=f["name"],
                file_size=f["size"],
                duration=f["duration"],
                sample_rate=f["sample_rate"],
                upload_timestamp=f["date"],
            )
            analysis_id = self.create_analysis_result(
                metadata_id=metadata_id,
                is_deepfake=f["is_fake"],
                confidence_score=f["confidence"],
                features_used=features,
                analysis_timestamp=f["date"],
            )
            self.create_result_details(
                analysis_id=analysis_id,
                feature_scores={
                    "mfcc_score":     0.88 if f["is_fake"] else 0.12,
                    "spectral_score": 0.92 if f["is_fake"] else 0.15,
                    "temporal_score": 0.91 if f["is_fake"] else 0.08,
                },
                model_version="v1.2.0",
                processing_time=1250.45,
            )
            analysis_ids.append(analysis_id)

        return analysis_ids
