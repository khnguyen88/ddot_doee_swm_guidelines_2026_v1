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


def test_swale_method_dropdown_exists(wb):
    ws = wb["BMP"]
    dvs = ws.data_validations.dataValidation
    found = False
    for dv in dvs:
        if "CA6" in str(dv.sqref) and "DOEE" in dv.formula1 and "Actual" in dv.formula1:
            found = True
            break
    assert found, "Swale Method dropdown not found on col CA"


def test_sv_doee_capped_wedge(wb):
    # CB6 (col 80) = N_cd × 0.5 × MIN(X_cd, H_cd/S) × H_cd × w_s
    f = wb["BMP"].cell(row=6, column=80).value
    for ref in ["BY6", "BV6", "BU6", "BX6", "BG6"]:
        assert ref in f
    assert "MIN" in f


def test_sv_actual_uncapped_wedge(wb):
    # CC6 (col 81) = N_cd × 0.5 × (H_cd/S) × H_cd × w_s   (NO MIN cap)
    f = wb["BMP"].cell(row=6, column=81).value
    for ref in ["BY6", "BU6", "BX6", "BG6"]:
        assert ref in f
    assert "MIN" not in f


def test_default_swale_method_is_doee(wb):
    ws = wb["BMP"]
    v = ws.cell(row=6, column=79).value
    assert v == "DOEE"
