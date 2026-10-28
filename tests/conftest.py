"""Shared pytest fixtures."""
import pytest

import generate_workbook


@pytest.fixture(scope="session")
def wb():
    """Session-scoped workbook — built once, read by all structural tests."""
    return generate_workbook.build_workbook()
