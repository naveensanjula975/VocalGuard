"""Smoke tests for main.py — route registration and import sanity."""
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
