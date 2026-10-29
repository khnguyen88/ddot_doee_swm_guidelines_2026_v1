"""Integration test — full workbook has correct sheet set and order."""
import pytest

from workbook.__main__ import build_workbook, main, DEFAULT_OUTPUT


EXPECTED_ORDER = [
    "PROJECT", "PARAMS", "SDA", "CDA", "BMP", "CORRECT_MEP_SUMMARY",
    "EISA_DIRECT", "EISA_TR55",
    "DOEE_SDA", "DOEE_BMP_DATA", "DOEE_DETENTION", "DOEE_DETENTION_BMP",
    "DOEE_COMPLIANCE",
]


@pytest.fixture(scope="module")
def wb():
    return build_workbook()


def test_all_twelve_sheets_present(wb):
    for name in EXPECTED_ORDER:
        assert name in wb.sheetnames, f"Missing sheet: {name}"


def test_sheet_order(wb):
    assert wb.sheetnames == EXPECTED_ORDER


def test_no_placeholder_sheet(wb):
    assert "PLACEHOLDER" not in wb.sheetnames


def test_file_writes_cleanly(tmp_path):
    out = tmp_path / "test.xlsx"
    result = main(output_path=out)
    assert result == out
    assert out.exists()
