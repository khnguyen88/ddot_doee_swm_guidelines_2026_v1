"""Tests for the Area_Summary sheet builder."""
import pytest
import openpyxl

from workbook.builders import params, project, sda, cda, area_summary


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_existing_sheet(w)
    sda.build_sda_proposed_sheet(w)
    cda.build_cda_existing_sheet(w)
    cda.build_cda_proposed_sheet(w)
    area_summary.build_area_summary(w)
    return w


def test_sheet_exists(wb):
    assert "Area_Summary" in wb.sheetnames


def test_sda_section_headers(wb):
    ws = wb["Area_Summary"]
    r = area_summary.SDA_HEADER_ROW
    expected = [
        "SDA_ID",
        "Pre Imp (SF)", "Pre Comp (SF)", "Pre Nat (SF)",
        "Pre Total Within (SF)",
        "Post Imp (SF)", "Post Comp (SF)", "Post Nat (SF)", "Post BMP (SF)",
        "Post Total Within (SF)",
        "SWRv Required (CF)",
        "Area Match?",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=r, column=i).value == h, f"SDA header col {i}"


def test_cda_section_headers(wb):
    ws = wb["Area_Summary"]
    r = area_summary.CDA_HEADER_ROW
    expected = [
        "CDA_ID", "SDA_ID",
        "Pre Total Within (SF)", "Post Total Within (SF)",
        "Max BMP Credit (CF)", "Area Match?",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=r, column=i).value == h, f"CDA header col {i}"


def test_sda_placeholders_and_pre_total_formula(wb):
    ws = wb["Area_Summary"]
    r1 = area_summary.SDA_FIRST_DATA_ROW
    assert ws.cell(row=r1, column=1).value == "SDA-1"
    # Pre Total Within = B + C + D
    assert ws.cell(row=r1, column=5).value == f"=B{r1}+C{r1}+D{r1}"
    # Post Total Within = F + G + H + I
    assert ws.cell(row=r1, column=10).value == f"=F{r1}+G{r1}+H{r1}+I{r1}"


def test_sda_area_match_uses_pre_vs_post(wb):
    """SDA Area Match compares col E (Pre Total) to col J (Post Total) in same row."""
    ws = wb["Area_Summary"]
    r = area_summary.SDA_FIRST_DATA_ROW
    f = ws.cell(row=r, column=12).value
    assert "ABS" in f and f"J{r}" in f and f"E{r}" in f
    assert '"OK"' in f and '"⚠ MISMATCH"' in f


def test_cda_max_bmp_credit_hardcoded_17(wb):
    """Max BMP Credit = Post Total × 1.7 / 12 — hardcoded DOEE 1.7″ ceiling."""
    ws = wb["Area_Summary"]
    r = area_summary.CDA_FIRST_DATA_ROW
    assert ws.cell(row=r, column=5).value == f"=D{r}*1.7/12"


def test_cda_area_match_uses_vlookup_or_direct(wb):
    """Rows match by row position (both halves populated from same ID list),
    so a direct ABS comparison is fine — but formula must still be wrapped
    in IFERROR and compare Pre vs. Post."""
    ws = wb["Area_Summary"]
    r = area_summary.CDA_FIRST_DATA_ROW
    f = ws.cell(row=r, column=6).value
    assert "IFERROR" in f
    assert f"C{r}" in f and f"D{r}" in f
    assert '"⚠ MISMATCH"' in f


def test_sda_ids_named_range_points_to_area_summary(wb):
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    assert "SDA_IDs" in names
    assert "Area_Summary" in names["SDA_IDs"]
    assert f"$A${area_summary.SDA_FIRST_DATA_ROW}" in names["SDA_IDs"]
    assert f"$A${area_summary.SDA_LAST_DATA_ROW}" in names["SDA_IDs"]


def test_cda_ids_named_range_points_to_area_summary(wb):
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    assert "CDA_IDs" in names
    assert "Area_Summary" in names["CDA_IDs"]
    assert f"$A${area_summary.CDA_FIRST_DATA_ROW}" in names["CDA_IDs"]
    assert f"$A${area_summary.CDA_LAST_DATA_ROW}" in names["CDA_IDs"]


def test_sda_sumifs_reads_existing_and_proposed(wb):
    """SDA section pulls Pre totals from SDA_Existing and Post from SDA_Proposed."""
    ws = wb["Area_Summary"]
    r = area_summary.SDA_FIRST_DATA_ROW
    pre_imp  = ws.cell(row=r, column=2).value
    post_imp = ws.cell(row=r, column=6).value
    assert "'SDA_Existing'" in pre_imp
    assert "'SDA_Proposed'" in post_imp
    # Input range covers rows 4..103 (DEFAULT_N_ROWS=100).
    assert "$E$4:$E$103" in pre_imp
    assert "$E$4:$E$103" in post_imp


def test_section_sizes_match_n_summary_rows(wb):
    """Each section must expose exactly N_SUMMARY_ROWS placeholder rows."""
    ws = wb["Area_Summary"]
    sda_rows = area_summary.SDA_LAST_DATA_ROW - area_summary.SDA_FIRST_DATA_ROW + 1
    cda_rows = area_summary.CDA_LAST_DATA_ROW - area_summary.CDA_FIRST_DATA_ROW + 1
    assert sda_rows == area_summary.N_SUMMARY_ROWS == 20
    assert cda_rows == area_summary.N_SUMMARY_ROWS == 20
    # Confirm by checking last placeholder label is present
    assert ws.cell(row=area_summary.SDA_LAST_DATA_ROW, column=1).value == f"SDA-{sda_rows}"
    assert ws.cell(row=area_summary.CDA_LAST_DATA_ROW, column=1).value == f"CDA-{cda_rows}"
