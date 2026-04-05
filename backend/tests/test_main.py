"""Smoke tests for main.py — route registration and import sanity."""
import io
from unittest.mock import patch

from fastapi import FastAPI


def test_app_is_fastapi_instance(app):
    assert isinstance(app, FastAPI)


def test_required_routes_are_registered(app):
    paths = {route.path for route in app.routes}
    assert "/detect-deepfake/" in paths
    assert "/detect-deepfake-advanced/" in paths
    assert "/signup" in paths
    assert "/login" in paths
    assert "/user/analyses" in paths
    assert "/analyses/delete" in paths
    assert "/analyses/{analysis_id}" in paths


def test_detect_advanced_does_not_double_unlink(app, authed_client):
    """
    POST /detect-deepfake-advanced/ must return 200 when detection succeeds.
    Before the fix, duplicate os.unlink in the finally block raises
    FileNotFoundError and the endpoint returns 500 even on success.
    """
    fake_result = {
        "probability": 0.9,
        "is_fake": True,
        "confidence": 0.9,
        "label": "fake",
        "model_used": "wav2vec2-xlsr-deepfake",
        "processing_time": 100.0,
        "probabilities": {"real": 0.1, "fake": 0.9},
        "filename": "test.wav",
    }
    with patch("main.detect_deepfake", return_value=fake_result):
        response = authed_client.post(
            "/detect-deepfake-advanced/",
            files={"file": ("test.wav", io.BytesIO(b"RIFF\x00\x00\x00\x00"), "audio/wav")},
            headers={"Authorization": "Bearer dummy"},
        )
    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}: {response.text}\n"
        "This indicates the double os.unlink bug is still present."
    )
