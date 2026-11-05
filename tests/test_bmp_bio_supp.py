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


def test_bio_pond_elev_auto(wb):
    f = wb["BMP"].cell(row=6, column=50).value
    assert "AW6" in f and "AA6" in f


def test_bio_ud_invert_formula(wb):
    f = wb["BMP"].cell(row=6, column=54).value
    for ref in ["AW6", "Q6", "R6", "T6", "X6", "W6"]:
        assert ref in f


def test_bio_bottom_invert_formula(wb):
    f = wb["BMP"].cell(row=6, column=55).value
    for ref in ["AW6", "Q6", "R6", "T6", "U6"]:
        assert ref in f


def test_bio_freeboard_formula(wb):
    f = wb["BMP"].cell(row=6, column=56).value
    for ref in ["AZ6", "BA6", "AX6", "AY6"]:
        assert ref in f
    assert "MIN" in f


def test_bio_cleanouts_input_cell(wb):
    from workbook import styles
    cell = wb["BMP"].cell(row=6, column=57)
    assert str(cell.fill.fgColor.rgb).endswith(styles.INP)
