"""Shared pytest fixtures."""
import pytest

from workbook.__main__ import build_workbook


@pytest.fixture(scope="session")
def wb():
    """Session-scoped workbook — built once, read by all structural tests."""
    return build_workbook()
