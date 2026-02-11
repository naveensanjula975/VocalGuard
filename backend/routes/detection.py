"""
DEPRECATED — detection routes have been merged into ``routes/analyses.py``.

The old verb-based endpoints (``/detect-deepfake/``, etc.) are preserved
as backward-compat shims in ``routes/legacy.py``.

New clients should use:
    POST /v1/analyses?model=standard|advanced|ensemble

This file is intentionally empty and will be removed in a future release.
"""
