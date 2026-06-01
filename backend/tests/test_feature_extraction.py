"""Unit tests for core/feature_extraction.py."""
import sys
from unittest.mock import MagicMock, patch

import numpy as np
import pytest


@pytest.fixture(autouse=True)
def mock_librosa():
    """
    Replace librosa with a minimal mock so tests run without audio files.
    Returns deterministic arrays of correct shapes.
    """
    mock_lib = MagicMock()
    mock_lib.feature.mfcc.return_value = np.ones((40, 100), dtype=np.float32)
    mock_lib.feature.spectral_centroid.return_value = [np.full(100, 3000.0)]
    mock_lib.feature.spectral_rolloff.return_value = [np.full(100, 5000.0)]
    mock_lib.feature.zero_crossing_rate.return_value = [np.full(100, 0.05)]
    mock_lib.load.return_value = (np.random.rand(16000).astype(np.float32), 16000)
    mock_lib.resample.side_effect = lambda y, orig_sr, target_sr: y
    mock_lib.feature.spectral_flatness.return_value = np.array([[0.1] * 100])
    mock_lib.feature.spectral_contrast.return_value = np.ones((7, 100))
    mock_lib.feature.spectral_bandwidth.return_value = [np.full(100, 2000.0)]

    sys.modules["librosa"] = mock_lib
    sys.modules["librosa.feature"] = mock_lib.feature
    yield mock_lib


def _reload_fe():
    import importlib
    if "core.feature_extraction" in sys.modules:
        del sys.modules["core.feature_extraction"]
    import core.feature_extraction as fe
    return fe


def test_extract_traditional_features_exists():
    """_extract_traditional_features helper must exist after refactor."""
    fe = _reload_fe()
    assert hasattr(fe, "_extract_traditional_features"), (
        "_extract_traditional_features() must be added to feature_extraction.py"
    )
    assert callable(fe._extract_traditional_features)



def test_extract_traditional_features_called_once_per_branch():
    """
    Both branches of extract_features must call _extract_traditional_features
    exactly once — no code duplication.
    """
    fe = _reload_fe()
    dummy_features = np.zeros(83)

    with patch.object(fe, "_extract_traditional_features", return_value=dummy_features) as spy:
        # Wav2Vec2 branch
        with patch.object(fe, "extract_wav2vec2_features", return_value=np.zeros(768)):
            fe.extract_features("dummy.wav", use_wav2vec2=True)
        assert spy.call_count == 1, "Wav2Vec2 branch must call _extract_traditional_features once"

        spy.reset_mock()

        # Traditional branch
        fe.extract_features("dummy.wav", use_wav2vec2=False)
        assert spy.call_count == 1, "Traditional branch must call _extract_traditional_features once"
