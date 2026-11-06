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


def test_bmp_sheet_exists(wb):
    assert "BMP" in wb.sheetnames


def test_bmp_type_dropdown(wb):
    ws = wb["BMP"]
    dvs = ws.data_validations.dataValidation
    type_dv = None
    for dv in dvs:
        if "D6" in str(dv.sqref):
            type_dv = dv
            break
    assert type_dv is not None
    for t in ["Permeable Pavement", "Bioretention", "Dry Swale", "Wet Swale"]:
        assert t in type_dv.formula1


def test_sda_cda_dropdowns_use_named_ranges(wb):
    ws = wb["BMP"]
    dvs = ws.data_validations.dataValidation
    sqref_formulas = [(str(dv.sqref), dv.formula1) for dv in dvs]
    assert any("B6" in s and "SDA_IDs" in f for s, f in sqref_formulas)
    assert any("C6" in s and "CDA_IDs" in f for s, f in sqref_formulas)


def test_pp_sv_formula(wb):
    ws = wb["BMP"]
    # K6 = PP Sv = F6 * G6 * J6
    f_val = ws.cell(row=6, column=11).value
    assert "F6" in f_val and "G6" in f_val and "J6" in f_val


def test_bio_sv_formula(wb):
    ws = wb["BMP"]
    # AC6 (col 29) — WIP Bio Sv formula: O*(R*S + U*Z) + P*AA
    f_val = ws.cell(row=6, column=29).value
    for sub in ["O6", "R6", "S6", "U6", "Z6", "P6", "AA6"]:
        assert sub in f_val


def test_tree_rv_total_formula(wb):
    ws = wb["BMP"]
    # AN6 (col 40) = sum of (count × credit) — expect references to tree count cols
    f_val = ws.cell(row=6, column=40).value
    # 6 tree counts in AH:AM (cols 34..39)
    for col_letter in ["AH6", "AI6", "AJ6", "AK6", "AL6", "AM6"]:
        assert col_letter in f_val


def test_retention_multiplier_lookup(wb):
    ws = wb["BMP"]
    # AP6 (col 42) — retention multiplier from PARAMS by BMP Type + Sub-Type
    f_val = ws.cell(row=6, column=42).value
    assert "D6" in f_val
    assert "E6" in f_val
    assert "IFS" in f_val or "VLOOKUP" in f_val or "INDEX" in f_val


def test_rv_applied_is_min_capped(wb):
    ws = wb["BMP"]
    # AS6 (col 45) = MIN(AQ6, AR6)
    f_val = ws.cell(row=6, column=45).value
    assert "MIN" in f_val
    assert "AQ6" in f_val
    assert "AR6" in f_val


def test_max_bmp_credit_lookup_from_area_summary(wb):
    ws = wb["BMP"]
    # AR6 (col 44) — VLOOKUP CDA_ID into Area_Summary CDA section to pull
    # Max BMP Credit (section col E).
    f_val = ws.cell(row=6, column=44).value
    assert "C6" in f_val
    assert "Area_Summary" in f_val
    assert "VLOOKUP" in f_val
    assert ",5,FALSE" in f_val  # 5th column in section A:E = Max BMP Credit


@pytest.mark.skip(reason="SDA compliance summary rebuild deferred to later task")
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


def test_zone_divider_col_e_row4_medium_right_border(wb):
    """E4 (last column of ID zone) has a medium right border."""
    from openpyxl.styles import Side
    ws = wb["BMP"]
    right = ws.cell(row=4, column=5).border.right
    assert right is not None, "E4 right border is None"
    assert right.style == "medium", f"E4 right border style: {right.style!r}"


def test_pp_ksat_only_enhanced():
    # Col I row 6 should have an IF guarding Enhanced / Underdrained Enhanced sub-types
    import openpyxl
    from workbook.builders import params, project, sda, cda, bmp
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    ws = w["BMP"]
    v = ws.cell(row=6, column=9).value  # col I = 9
    assert "Enhanced" in v
    assert "Underdrained Enhanced" in v
    assert "PARAMS_Ksat" in v


def test_bio_ksat_only_enhanced():
    # AB (col 28) = Bio Ksat — Enhanced + Enhanced w/ Underdrain → VLOOKUP
    import openpyxl
    from workbook.builders import params, project, sda, cda, bmp
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    ws = w["BMP"]
    v = ws.cell(row=6, column=28).value  # col AB = 28
    assert "Enhanced" in v
    assert "Enhanced w/ Underdrain" in v
    assert "PARAMS_Ksat" in v


@pytest.mark.skip(reason="row 2 legend replaced Ksat note in 81-col schema")
def test_bmp_sheet_has_ksat_note():
    # Row 2 should contain explanatory note about Ksat
    import openpyxl
    from workbook.builders import params, project, sda, cda, bmp
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    ws = w["BMP"]
    note_text = ws.cell(row=2, column=1).value
    assert note_text is not None
    assert "Ksat" in note_text
    assert "Enhanced" in note_text


from workbook.builders.bmp import _cda_dominant_hsg_formula


def test_cda_dominant_hsg_sumifs_reads_post_within_column():
    """Ksat HSG lookup must SUMIFS CDA_Proposed's within column (E).
    Range is bumped to 4..103 after DEFAULT_N_ROWS = 100 in sda.py."""
    formula = _cda_dominant_hsg_formula("C4")
    assert "'CDA_Proposed'!$E$4:$E$103" in formula
    assert "'CDA'!" not in formula


@pytest.mark.skip(reason="old bio geometry labels replaced by new 81-col schema; coverage moved to test_bmp_schema.py")
def test_bmp_sheet_has_bio_geometry_columns():
    """BMP sheet gains Bio geometry columns AN–AS."""
    from openpyxl import load_workbook
    from workbook.sample import OUTPUT, build_sample
    build_sample()
    wb = load_workbook(OUTPUT, data_only=False)
    ws = wb["BMP"]
    # Row 3 is the header row. AN=40, AO=41, AP=42, AQ=43, AR=44, AS=45.
    assert ws.cell(3, 40).value == "Bio SA_pond_top (SF)"
    assert ws.cell(3, 41).value == "Bio top_elev (ft)"
    assert ws.cell(3, 42).value == "Bio overflow_elev (ft)"
    assert ws.cell(3, 43).value == "Bio sidewalk_elev (ft)"
    assert ws.cell(3, 44).value == "Bio curb_cut_elev (ft)"
    assert ws.cell(3, 45).value == "Bio Freeboard (ft)"


@pytest.mark.skip(reason="old bio geometry labels replaced by new 81-col schema; coverage moved to test_bmp_schema.py")
def test_bmp_sheet_has_dry_swale_geometry_columns():
    """BMP sheet gains Dry Swale geometry columns AT–BE."""
    from openpyxl import load_workbook
    from workbook.sample import OUTPUT, build_sample
    build_sample()
    wb = load_workbook(OUTPUT, data_only=False)
    ws = wb["BMP"]
    # AT=46 .. BE=57
    expected = [
        (46, "Swale L_s (ft)"),
        (47, "Swale w_s (ft)"),
        (48, "Swale inv_US (ft)"),
        (49, "Swale inv_DS (ft)"),
        (50, "Swale top_US (ft)"),
        (51, "Swale top_DS (ft)"),
        (52, "Swale H_cd (ft)"),
        (53, "Swale X_cd (ft)"),
        (54, "Swale Slope S (ft/ft)"),
        (55, "Swale N_cd"),
        (56, "Swale Wedge Sv/dam (CF)"),
        (57, "Swale Total Pond Sv (CF)"),
    ]
    for col, label in expected:
        assert ws.cell(3, col).value == label, f"col {col}: expected {label}, got {ws.cell(3, col).value}"


# ---------------------------------------------------------------------------
# Task 4 TDD tests — PP + Bio/Swale stack formulas
# ---------------------------------------------------------------------------

def test_bio_sa_bot_auto_pulled_from_cda(wb):
    ws = wb["BMP"]
    o6 = ws.cell(row=6, column=15).value
    assert o6.startswith("=")
    assert "CDA_Proposed" in o6
    assert '"BMP"' in o6
    assert "B6" in o6 and "C6" in o6


def test_bio_reservoir_portion_formula(wb):
    ws = wb["BMP"]
    y6 = ws.cell(row=6, column=25).value
    assert y6.startswith("=")
    assert 'V6="Y"' in y6 or "V6=\"Y\"" in y6
    for ref in ["U6", "X6", "W6"]:
        assert ref in y6


def test_bio_sv_uses_wip_formula(wb):
    ws = wb["BMP"]
    ac6 = ws.cell(row=6, column=29).value
    for ref in ["O6", "R6", "S6", "U6", "Z6", "P6", "AA6"]:
        assert ref in ac6


def test_bio_ksat_enhanced_sub_types(wb):
    ws = wb["BMP"]
    ab6 = ws.cell(row=6, column=28).value
    assert "Enhanced" in ab6
    assert "Enhanced w/ Underdrain" in ab6
    assert "PARAMS_Ksat" in ab6
