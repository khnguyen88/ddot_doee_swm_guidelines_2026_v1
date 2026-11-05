"""Correct MEP: col L should list ALL HSGs present (comma-separated),
col O stays on conservative-dominant infiltration rate, BMP SUMIFS must
reference the new 6-55 data range."""
import pytest
from workbook.__main__ import build_workbook


@pytest.fixture(scope="module")
def wb():
    return build_workbook()


def test_mep_col_l_concatenates_present_hsgs(wb):
    """Col L row 12 must build a comma-list of present HSGs via nested IFs."""
    ws = wb["CORRECT_MEP_SUMMARY"]
    f = ws.cell(row=12, column=12).value
    for letter in ["A", "B", "C", "D"]:
        assert f'"{letter}, "' in f or f'"{letter},"' in f, (
            f"Letter {letter} not found in formula: {f!r}")
    assert "LEFT" in f or "SUBSTITUTE" in f


def test_mep_col_o_still_conservative_dominant(wb):
    """Col O (Infiltration Rate) must remain nested-IF on D>C>B>A."""
    ws = wb["CORRECT_MEP_SUMMARY"]
    f = ws.cell(row=12, column=15).value
    for rate in ["2.5", "0.3", "0.1", "0.05"]:
        assert rate in f, f"rate {rate} not found in {f!r}"


def test_mep_bmp_refs_use_row_6_55(wb):
    """Correct MEP BMP SUMIFS must reference BMP rows 6-55 (not 4-53)."""
    ws = wb["CORRECT_MEP_SUMMARY"]
    # Col Q (17) row 12 — # Preserved Small from BMP tree col
    f = ws.cell(row=12, column=17).value
    assert "$6:" in f or "$6," in f, f"row-6 start not found: {f!r}"
    assert "$55" in f, f"row-55 end not found: {f!r}"
