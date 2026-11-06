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
    return w


def test_sheet_exists(wb):
    assert "SDA_Existing" in wb.sheetnames


def test_column_headers(wb):
    ws = wb["SDA_Existing"]
    expected = [
        "SDA_ID", "In PROW?", "Land Use", "HSG",
        "Area Within LOD (SF)", "Area Outside LOD (SF)",
        "Rv", "Rainfall (in)",
        "SWRv Within (CF)", "SWRv Outside (CF)",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h, f"col {i}"


def test_rv_lookup(wb):
    ws = wb["SDA_Existing"]
    assert ws.cell(row=4, column=7).value == '=IFERROR(VLOOKUP(C4,PARAMS_Rv,2,FALSE),"")'


def test_rainfall_formula_unconditional(wb):
    """Existing sheet uses retention target regardless of PROW."""
    ws = wb["SDA_Existing"]
    assert ws.cell(row=4, column=8).value == "=PROJECT_Rainfall_Retention"


def test_swrv_formulas(wb):
    ws = wb["SDA_Existing"]
    # I = Within, J = Outside
    assert ws.cell(row=4, column=9).value  == "=IFERROR(E4*G4*H4/12,0)"
    assert ws.cell(row=4, column=10).value == "=IFERROR(F4*G4*H4/12,0)"


def test_land_use_dropdown_excludes_bmp(wb):
    ws = wb["SDA_Existing"]
    dvs = ws.data_validations.dataValidation
    lu_dvs = [dv for dv in dvs if "C4" in str(dv.sqref)]
    assert len(lu_dvs) == 1
    formula = lu_dvs[0].formula1
    assert "Impervious Vehicular" in formula
    assert "Impervious Non-Vehicular" in formula
    assert "Compacted (Open Space)" in formula
    assert "Natural (Woods)" in formula
    assert "BMP" not in formula


def test_sheet_has_no_summary_block(wb):
    """SDA_Existing is now pure-input. Summary rollups moved to Area_Summary.
    Guard: no "Summary" label anywhere on this sheet."""
    ws = wb["SDA_Existing"]
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            assert not (isinstance(v, str) and "Summary" in v), (
                f"Unexpected summary content at {cell.coordinate}: {v!r} "
                f"— SDA_Existing should be pure-input now.")
