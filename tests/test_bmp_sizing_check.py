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


def test_sa_cda_pct_formula(wb):
    f = wb["BMP"].cell(row=6, column=47).value
    assert f.startswith("=")
    assert "N6" in f
    assert "CDA_Proposed" in f
    assert "C6" in f


def test_sizing_check_formula_branches_by_bmp_type(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    assert "Bioretention" in f
    assert "Dry Swale" in f
    assert "D6" in f


def test_sizing_check_references_params_sizing_rules(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    assert "PARAMS_BMPSizingRules" in f


def test_sizing_check_checks_freeboard_bio(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    assert "BD6" in f


def test_sizing_check_checks_freeboard_swale(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    assert "BZ6" in f


def test_sizing_check_checks_dam_matches_pond_depth(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    assert "BU6" in f and "AA6" in f


def test_sizing_check_checks_cleanouts(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    # Bio cleanouts col BE (col 57), swale cleanouts col BW (col 75)
    assert "BE6" in f or "BW6" in f
