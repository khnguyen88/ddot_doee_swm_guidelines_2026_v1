"""Integration test — full workbook has correct sheet set and order."""
import pytest

import generate_workbook


EXPECTED_ORDER = [
    "PROJECT", "PARAMS", "SDA", "CDA", "BMP", "MEP_SUMMARY",
    "EISA_DIRECT", "EISA_TR55",
    "DOEE_SDA", "DOEE_BMP_DATA", "DOEE_DETENTION", "DOEE_COMPLIANCE",
]


@pytest.fixture(scope="module")
def wb():
    return generate_workbook.build_workbook()


def test_all_twelve_sheets_present(wb):
    for name in EXPECTED_ORDER:
        assert name in wb.sheetnames, f"Missing sheet: {name}"


def test_sheet_order(wb):
    assert wb.sheetnames == EXPECTED_ORDER


def test_no_placeholder_sheet(wb):
    assert "PLACEHOLDER" not in wb.sheetnames


def test_file_writes_cleanly(tmp_path, monkeypatch):
    out = tmp_path / "test.xlsx"
    monkeypatch.setattr(generate_workbook, "OUTPUT", out)
    result = generate_workbook.main()
    assert result == out
    assert out.exists()
