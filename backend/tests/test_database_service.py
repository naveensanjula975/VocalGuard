"""Unit tests for DatabaseService with a mocked Firestore client."""
import sys
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def db_service():
    """
    Return a DatabaseService instance with Firestore replaced by a MagicMock.
    """
    with patch("services.database_service.firestore") as mock_fs:
        mock_db = MagicMock()
        mock_fs.client.return_value = mock_db
        import importlib
        import services.database_service as dbs_module
        importlib.reload(dbs_module)
        service = dbs_module.DatabaseService()
        service.db = mock_db
        yield service, mock_db


def test_get_user_analyses_returns_empty_list_when_no_records(db_service):
    """
    A user with no uploaded files must get an empty list back.
    The function must iterate over the stream (not short-circuit on truthiness).
    """
    service, mock_db = db_service

    def side_effect(name):
        coll = MagicMock()
        coll.where.return_value.stream.return_value = iter([])
        return coll

    mock_db.collection.side_effect = side_effect

    result = service.get_user_analyses("user-no-data")
    assert result == []


def test_get_user_analyses_joins_metadata_analysis_and_details(db_service):
    """
    When records exist, the merged dict must include fields from
    audio_metadata, analysis_results, and result_details.
    """
    service, mock_db = db_service

    meta_doc = MagicMock()
    meta_doc.id = "meta-1"
    meta_doc.to_dict.return_value = {
        "id": "meta-1", "user_id": "u1", "filename": "speech.wav"
    }

    analysis_doc = MagicMock()
    analysis_doc.id = "analysis-1"
    analysis_doc.to_dict.return_value = {
        "id": "analysis-1", "metadata_id": "meta-1", "is_deepfake": True
    }

    details_doc = MagicMock()
    details_doc.to_dict.return_value = {
        "id": "details-1", "analysis_id": "analysis-1", "model_version": "3.0.0"
    }

    def side_effect(name):
        coll = MagicMock()
        if name == "audio_metadata":
            coll.where.return_value.stream.return_value = iter([meta_doc])
        elif name == "analysis_results":
            coll.where.return_value.stream.return_value = iter([analysis_doc])
        elif name == "result_details":
            coll.where.return_value.limit.return_value.stream.return_value = iter([details_doc])
        return coll

    mock_db.collection.side_effect = side_effect

    result = service.get_user_analyses("u1")

    assert len(result) == 1
    assert result[0]["filename"] == "speech.wav"
    assert result[0]["is_deepfake"] is True
    assert result[0]["details"]["model_version"] == "3.0.0"
