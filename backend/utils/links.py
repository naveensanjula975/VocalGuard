"""
HATEOAS link builder utilities.

Generates lightweight ``_links`` dictionaries for API responses so
clients can discover related resources without hard-coding URLs.
"""

from __future__ import annotations

from config import API_V1_PREFIX


def _analysis_base(analysis_id: str) -> str:
    return f"{API_V1_PREFIX}/analyses/{analysis_id}"


def analysis_links(analysis_id: str) -> dict:
    """Return ``_links`` for a single analysis resource."""
    base = _analysis_base(analysis_id)
    return {
        "self":       {"href": base},
        "attention":  {"href": f"{base}/attention"},
        "delete":     {"href": base, "method": "DELETE"},
        "collection": {"href": f"{API_V1_PREFIX}/analyses"},
    }


def collection_links(
    *,
    page: int,
    per_page: int,
    has_next: bool,
    next_cursor: str | None = None,
) -> dict:
    """Return ``_links`` for a paginated collection response."""
    base = f"{API_V1_PREFIX}/analyses"
    links: dict = {
        "self": {"href": f"{base}?per_page={per_page}" + (f"&after={next_cursor}" if False else "")},
    }
    if has_next and next_cursor:
        links["next"] = {"href": f"{base}?per_page={per_page}&after={next_cursor}"}
    return links
