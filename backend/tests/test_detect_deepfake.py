"""Unit tests for core/detect_deepfake.py."""
import sys
from unittest.mock import MagicMock, patch

import pytest


def _reload_dd():
    """Force a fresh import of core.detect_deepfake, resetting module-level state."""
    import importlib
    if "core.detect_deepfake" in sys.modules:
        del sys.modules["core.detect_deepfake"]
    # Also remove sub-deps so mocks apply cleanly
    for key in list(sys.modules.keys()):
        if key.startswith("core.detect_deepfake"):
            del sys.modules[key]
    import core.detect_deepfake as dd
    return dd


# ── Task 5 tests ────────────────────────────────────────────────────────────

def test_load_model_does_not_exist():
    """load_model() is dead code and must be removed."""
    dd = _reload_dd()
    assert not hasattr(dd, "load_model"), (
        "load_model() is dead code — remove it from detect_deepfake.py"
    )


def test_deepfake_audio_detector_class_still_exists():
    """DeepfakeAudioDetector must still exist after cleanup."""
    dd = _reload_dd()
    assert hasattr(dd, "DeepfakeAudioDetector")


def test_detect_deepfake_function_still_exists():
    """Public detect_deepfake() function must still exist."""
    dd = _reload_dd()
    assert hasattr(dd, "detect_deepfake")
    assert callable(dd.detect_deepfake)


# ── Task 6 tests ────────────────────────────────────────────────────────────

def test_detector_reused_across_calls_singleton():
    """
    detect_deepfake() must construct DeepfakeAudioDetector exactly once,
    even when called multiple times. Before the fix it constructs it on every call.
    """
    dd = _reload_dd()

    mock_instance = MagicMock()
    mock_instance.detect.return_value = {
        "confidence": 0.9,
        "is_fake": True,
        "prediction": "fake",
        "probabilities": {"real": 0.1, "fake": 0.9},
        "sample_rate": 16000,
        "duration": 2.0,
    }

    with patch.object(dd, "DeepfakeAudioDetector", return_value=mock_instance) as MockCls, \
         patch("os.path.exists", return_value=True), \
         patch("builtins.open", MagicMock(return_value=MagicMock(
             __enter__=MagicMock(return_value=MagicMock(read=MagicMock(return_value=b""))),
             __exit__=MagicMock(return_value=False)
         ))):
        dd.detect_deepfake("/tmp/a.wav", store_results=False)
        dd.detect_deepfake("/tmp/b.wav", store_results=False)

    assert MockCls.call_count == 1, (
        f"DeepfakeAudioDetector constructed {MockCls.call_count} time(s); expected 1 (singleton)."
    )
