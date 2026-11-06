import pytest
import openpyxl

from workbook.builders import params, project, sda


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    return w


def test_sheet_exists(wb):
    assert "SDA_Proposed" in wb.sheetnames


def test_column_headers(wb):
    ws = wb["SDA_Proposed"]
    expected = [
        "SDA_ID", "In PROW?", "Land Use", "HSG",
        "Area Within LOD (SF)", "Area Outside LOD (SF)",
        "Rv", "Rainfall (in)",
        "SWRv Within (CF)", "SWRv Outside (CF)",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h


def test_rainfall_formula_unconditional(wb):
    ws = wb["SDA_Proposed"]
    assert ws.cell(row=4, column=8).value == "=PROJECT_Rainfall_Retention"


def test_land_use_dropdown_includes_bmp(wb):
    ws = wb["SDA_Proposed"]
    dvs = ws.data_validations.dataValidation
    lu_dvs = [dv for dv in dvs if "C4" in str(dv.sqref)]
    assert len(lu_dvs) == 1
    assert "BMP" in lu_dvs[0].formula1


def test_sheet_has_no_summary_block(wb):
    """SDA_Proposed is now pure-input. Summary rollups live on Area_Summary."""
    ws = wb["SDA_Proposed"]
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            assert not (isinstance(v, str) and "Summary" in v), (
                f"Unexpected summary content at {cell.coordinate}: {v!r}")


# SDA_IDs named range + area match live on Area_Summary now — see
# tests/test_area_summary.py.
