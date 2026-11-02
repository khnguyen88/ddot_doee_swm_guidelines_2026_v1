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
    return w


def test_sheet_exists(wb):
    assert "CDA_Existing" in wb.sheetnames


def test_column_headers(wb):
    ws = wb["CDA_Existing"]
    expected = [
        "CDA_ID", "SDA_ID", "Land Use", "HSG",
        "Area Within LOD (SF)", "Area Outside LOD (SF)",
        "Rv", "Rainfall (in)",
        "SWRv Within (CF)", "SWRv Outside (CF)",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h


def test_rainfall_formula(wb):
    ws = wb["CDA_Existing"]
    assert ws.cell(row=4, column=8).value == "=PROJECT_Rainfall_Retention"


def test_sda_id_dropdown(wb):
    ws = wb["CDA_Existing"]
    dvs = ws.data_validations.dataValidation
    assert any("B4" in str(dv.sqref) and dv.formula1 == "=SDA_IDs" for dv in dvs)


def test_land_use_dropdown_excludes_bmp(wb):
    ws = wb["CDA_Existing"]
    dvs = ws.data_validations.dataValidation
    lu_dvs = [dv for dv in dvs if "C4" in str(dv.sqref)]
    assert len(lu_dvs) == 1
    assert "BMP" not in lu_dvs[0].formula1


def test_summary_block(wb):
    ws = wb["CDA_Existing"]
    assert ws.cell(row=57, column=1).value == "CDA_ID"
    assert ws.cell(row=57, column=2).value == "Pre Total Within LOD (SF)"
    assert ws.cell(row=58, column=1).value == "CDA-1"
