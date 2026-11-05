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


def test_wet_swale_sv_formula(wb):
    f = wb["BMP"].cell(row=6, column=33).value
    assert "AE6" in f and "AF6" in f


def test_tree_rv_total_references_all_six_counts(wb):
    f = wb["BMP"].cell(row=6, column=40).value
    for col in ["AH6", "AI6", "AJ6", "AK6", "AL6", "AM6"]:
        assert col in f


def test_sv_total_adds_pp_bio_ws_and_swale_wedge(wb):
    f = wb["BMP"].cell(row=6, column=41).value
    for ref in ["K6", "AC6", "AG6", "CA6", "CB6", "CC6"]:
        assert ref in f
    assert "Dry Swale" in f


def test_rv_reservoir_formula_uses_y_z_o(wb):
    f = wb["BMP"].cell(row=6, column=46).value
    assert "Y6" in f and "Z6" in f and "O6" in f


def test_rv_applied_caps_by_max_credit(wb):
    f = wb["BMP"].cell(row=6, column=45).value
    for ref in ["AQ6", "AR6"]:
        assert ref in f
    assert "MIN" in f
