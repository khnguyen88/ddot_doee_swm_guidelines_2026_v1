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


def test_summary_has_max_bmp_credit_hardcoded_17(wb):
    ws = wb["CDA_Proposed"]
    assert ws.cell(row=57, column=1).value == "CDA_ID"
    assert ws.cell(row=57, column=2).value == "SDA_ID"
    assert ws.cell(row=57, column=3).value == "Total CDA Within LOD (SF) (post)"
    assert ws.cell(row=57, column=4).value == "Max BMP Credit (CF)"
    assert ws.cell(row=57, column=5).value == "Area Match?"
    # Max BMP Credit must stay hardcoded 1.7 (DOEE ceiling).
    assert ws.cell(row=58, column=4).value == "=C58*1.7/12"


def test_area_match_cross_sheet(wb):
    ws = wb["CDA_Proposed"]
    f = ws.cell(row=58, column=5).value
    assert "CDA_Existing" in f and "MISMATCH" in f


def test_cda_ids_named_range_points_to_proposed(wb):
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    assert "CDA_IDs" in names
    assert "CDA_Proposed" in names["CDA_IDs"]
