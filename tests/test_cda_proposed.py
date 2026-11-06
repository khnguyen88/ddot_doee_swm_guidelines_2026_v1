import pytest
import openpyxl

from workbook.builders import params, project, sda, cda


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
    return w


def test_sheet_exists(wb):
    assert "CDA_Proposed" in wb.sheetnames


def test_rainfall_formula(wb):
    ws = wb["CDA_Proposed"]
    assert ws.cell(row=4, column=8).value == "=PROJECT_Rainfall_Retention"


def test_land_use_includes_bmp(wb):
    ws = wb["CDA_Proposed"]
    dvs = ws.data_validations.dataValidation
    lu_dvs = [dv for dv in dvs if "C4" in str(dv.sqref)]
    assert "BMP" in lu_dvs[0].formula1


def test_sheet_has_no_summary_block(wb):
    """CDA_Proposed is now pure-input. Max BMP Credit and Area Match live on
    Area_Summary — see tests/test_area_summary.py."""
    ws = wb["CDA_Proposed"]
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            assert not (isinstance(v, str) and "Summary" in v), (
                f"Unexpected summary content at {cell.coordinate}: {v!r}")
