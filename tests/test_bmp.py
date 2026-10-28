import pytest
import openpyxl

from workbook.builders import params, project, sda, cda, bmp


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    return w


def test_bmp_sheet_exists(wb):
    assert "BMP" in wb.sheetnames


def test_bmp_sheet_has_39_columns(wb):
    ws = wb["BMP"]
    # Header row at row 3 should have 39 non-None cells
    headers = [ws.cell(row=3, column=c).value for c in range(1, 40)]
    assert all(h is not None for h in headers), f"Missing headers: {headers}"


def test_bmp_type_dropdown(wb):
    ws = wb["BMP"]
    dvs = ws.data_validations.dataValidation
    type_dv = None
    for dv in dvs:
        if "D4" in str(dv.sqref):
            type_dv = dv
            break
    assert type_dv is not None
    for t in ["Permeable Pavement", "Bioretention", "Dry Swale", "Wet Swale"]:
        assert t in type_dv.formula1


def test_sda_cda_dropdowns_use_named_ranges(wb):
    ws = wb["BMP"]
    dvs = ws.data_validations.dataValidation
    sqref_formulas = [(str(dv.sqref), dv.formula1) for dv in dvs]
    assert any("B4" in s and "SDA_IDs" in f for s, f in sqref_formulas)
    assert any("C4" in s and "CDA_IDs" in f for s, f in sqref_formulas)


def test_pp_sv_formula(wb):
    ws = wb["BMP"]
    # K4 = PP Sv = F4 * G4 * J4
    f_val = ws.cell(row=4, column=11).value
    assert "F4" in f_val and "G4" in f_val and "J4" in f_val


def test_bio_sv_formula(wb):
    ws = wb["BMP"]
    # W4 = P4 * (Q4*R4 + S4*T4 + U4)
    f_val = ws.cell(row=4, column=23).value
    for sub in ["P4", "Q4", "R4", "S4", "T4", "U4"]:
        assert sub in f_val


def test_tree_rv_total_formula(wb):
    ws = wb["BMP"]
    # AH4 (col 34) = sum of (count × credit) — expect references to PARAMS_Trees or hardcoded credits
    f_val = ws.cell(row=4, column=34).value
    # 6 tree counts in AB:AG
    for col_letter in ["AB4", "AC4", "AD4", "AE4", "AF4", "AG4"]:
        assert col_letter in f_val


def test_retention_multiplier_lookup(wb):
    ws = wb["BMP"]
    # AJ4 (col 36) — retention multiplier from PARAMS by BMP Type + Sub-Type
    f_val = ws.cell(row=4, column=36).value
    assert "D4" in f_val
    assert "E4" in f_val
    assert "IFS" in f_val or "VLOOKUP" in f_val or "INDEX" in f_val


def test_rv_applied_is_min_capped(wb):
    ws = wb["BMP"]
    # AM4 (col 39) = MIN(AK4, AL4)
    f_val = ws.cell(row=4, column=39).value
    assert "MIN" in f_val
    assert "AK4" in f_val
    assert "AL4" in f_val


def test_max_bmp_credit_lookup_from_cda(wb):
    ws = wb["BMP"]
    # AL4 (col 38) — lookup CDA_ID in CDA summary to get Max BMP Credit
    f_val = ws.cell(row=4, column=38).value
    assert "C4" in f_val
    # References CDA sheet column D (Max BMP Credit) via VLOOKUP or INDEX/MATCH
    assert ("CDA" in f_val) or ("VLOOKUP" in f_val) or ("INDEX" in f_val)


def test_sda_compliance_summary_block(wb):
    ws = wb["BMP"]
    # Look for a "Compliance" or "SDA Compliance" header somewhere after row 53
    found = False
    for r in range(54, 100):
        v = ws.cell(row=r, column=1).value
        if v and ("Compliance" in str(v) or "SDA" in str(v)):
            found = True
            break
    assert found
