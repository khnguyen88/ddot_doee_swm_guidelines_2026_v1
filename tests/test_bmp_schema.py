"""BMP sheet structural tests — 81 cols, 5-row header, zone banners, row-5 tags."""
import pytest
import openpyxl

from workbook.builders import params, project, sda, cda, bmp


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    return w


def test_bmp_has_81_cols(wb):
    ws = wb["BMP"]
    # Column CC (col 81) should have a header at row 4
    assert ws.cell(row=4, column=81).value is not None


def test_bmp_zone_banners_at_row_3(wb):
    ws = wb["BMP"]
    # Row 3 cells at start of each zone must contain the zone label
    assert "ID" in (ws.cell(row=3, column=1).value or "")
    assert "Permeable Pavement" in (ws.cell(row=3, column=6).value or "")
    assert "Bioretention" in (ws.cell(row=3, column=14).value or "") or \
           "Bio" in (ws.cell(row=3, column=14).value or "")
    assert "Tree" in (ws.cell(row=3, column=34).value or "")
    assert "Output" in (ws.cell(row=3, column=41).value or "") or \
           "Storage" in (ws.cell(row=3, column=41).value or "")
    assert "Check" in (ws.cell(row=3, column=47).value or "") or \
           "Sizing" in (ws.cell(row=3, column=47).value or "")
    assert "Bioretention" in (ws.cell(row=3, column=49).value or "") or \
           "Supplemental" in (ws.cell(row=3, column=49).value or "")
    assert "Swale" in (ws.cell(row=3, column=58).value or "")


def test_bmp_row_5_has_input_auto_tags(wb):
    ws = wb["BMP"]
    tag_a = ws.cell(row=5, column=1).value
    assert tag_a in ("USER", "AUTO", "AUTO ← CDA", "AUTO ← PARAMS",
                     "AUTO + USER OK", "DROPDOWN")


def test_bmp_data_starts_at_row_6(wb):
    ws = wb["BMP"]
    # Row 6 col 11 (PP Sv, K6) should contain a formula referencing row 6
    k6 = ws.cell(row=6, column=11).value
    assert k6 is not None
    assert isinstance(k6, str) and k6.startswith("=")
    assert "F6" in k6 and "G6" in k6 and "J6" in k6


def test_bmp_data_ends_at_row_55(wb):
    ws = wb["BMP"]
    k55 = ws.cell(row=55, column=11).value
    assert isinstance(k55, str) and k55.startswith("=")
