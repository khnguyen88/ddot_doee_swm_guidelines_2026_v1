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


def test_swale_slope_formula(wb):
    # BX6 (col 76) = (BQ - BR) / BF
    f = wb["BMP"].cell(row=6, column=76).value
    for ref in ["BQ6", "BR6", "BF6"]:
        assert ref in f


def test_swale_ncd_formula(wb):
    # BY6 (col 77) = FLOOR(BF / BV, 1)
    f = wb["BMP"].cell(row=6, column=77).value
    assert "BF6" in f and "BV6" in f
    assert "FLOOR" in f


def test_swale_freeboard_references_all_8_elevs(wb):
    # BZ6 (col 78) MIN across top-bank US/DS, grade US/DS, curb US/DS, sidewalk US/DS
    f = wb["BMP"].cell(row=6, column=78).value
    for ref in ["BI6", "BJ6", "BK6", "BL6", "BM6", "BN6", "BO6", "BP6"]:
        assert ref in f
    assert "MIN" in f


def test_swale_freeboard_deducts_inv_head_damheight(wb):
    f = wb["BMP"].cell(row=6, column=78).value
    for ref in ["BQ6", "BU6", "BT6"]:   # inv US, H_cd, 15-yr head
        assert ref in f
