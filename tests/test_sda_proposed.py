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


def test_summary_block_has_bmp_column(wb):
    ws = wb["SDA_Proposed"]
    assert ws.cell(row=57, column=1).value == "SDA_ID"
    assert ws.cell(row=57, column=2).value == "Imp Total (SF)"
    assert ws.cell(row=57, column=3).value == "Comp Total (SF)"
    assert ws.cell(row=57, column=4).value == "Nat Total (SF)"
    assert ws.cell(row=57, column=5).value == "BMP Total (SF)"
    assert ws.cell(row=57, column=6).value == "Post Total Within (SF)"
    assert ws.cell(row=57, column=7).value == "SWRv Required (CF)"
    assert ws.cell(row=57, column=8).value == "Area Match?"


def test_swrv_required_sumifs_on_within(wb):
    ws = wb["SDA_Proposed"]
    f = ws.cell(row=58, column=7).value
    assert "SUMIFS" in f and "$I$4:$I$53" in f and "A58" in f


def test_area_match_cross_sheet(wb):
    ws = wb["SDA_Proposed"]
    f = ws.cell(row=58, column=8).value
    assert "SDA_Existing" in f
    assert "MISMATCH" in f


def test_sda_ids_named_range_points_to_proposed(wb):
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    assert "SDA_IDs" in names
    assert "SDA_Proposed" in names["SDA_IDs"]
