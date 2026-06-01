"""
Pytest fixtures shared across all backend tests.

Firebase, Firestore, and ML model dependencies are mocked at the sys.modules
level before any test module imports main or the detection pipeline. This lets
tests run without Firebase credentials, service account keys, or model weights.
"""
import sys
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Replace heavy modules BEFORE they are imported by any production code.
# These must run at collection time, not inside a fixture.
# ---------------------------------------------------------------------------
_firebase_mock = MagicMock()
sys.modules.setdefault("firebase_admin", _firebase_mock)
sys.modules.setdefault("firebase_admin.auth", _firebase_mock.auth)
sys.modules.setdefault("firebase_admin.firestore", _firebase_mock.firestore)
sys.modules.setdefault("firebase_admin.credentials", MagicMock())

_torch_mock = MagicMock()
sys.modules.setdefault("torch", _torch_mock)
sys.modules.setdefault("torch.nn", _torch_mock.nn)
sys.modules.setdefault("torchaudio", MagicMock())
sys.modules.setdefault("transformers", MagicMock())
sys.modules.setdefault("librosa", MagicMock())
sys.modules.setdefault("soundfile", MagicMock())
sys.modules.setdefault("numpy", MagicMock())


@pytest.fixture(scope="session")
def app():
    """Return the FastAPI application with firebase init stubbed out."""
    import pathlib
    sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
    with patch("main.initialize_firebase"):
        from main import app as fastapi_app  # noqa: PLC0415
    return fastapi_app


@pytest.fixture
def client(app):
    """Return a synchronous TestClient for the FastAPI app."""
    from fastapi.testclient import TestClient  # noqa: PLC0415
    return TestClient(app)


@pytest.fixture
def authed_client(app):
    """
    Return a TestClient with the verify_token dependency overridden so
    every request is authenticated as 'test-user-uid' without needing
    a real Firebase token.
    """
    from fastapi.testclient import TestClient  # noqa: PLC0415
    from main import verify_token  # noqa: PLC0415

    app.dependency_overrides[verify_token] = lambda: {"uid": "test-user-uid"}
    yield TestClient(app)
    app.dependency_overrides.clear()
