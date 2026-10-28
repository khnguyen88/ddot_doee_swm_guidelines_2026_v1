import pytest
import openpyxl

from workbook.builders import params, project, sda, cda


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    return w


def test_cda_sheet_exists(wb):
    assert "CDA" in wb.sheetnames


def test_headers(wb):
    ws = wb["CDA"]
    expected = [
        "CDA_ID", "SDA_ID", "Land Use", "HSG",
        "Within LOD (SF)", "Outside LOD (SF)",
        "Rv", "CDA SWRv Within (CF)", "CDA SWRv Outside (CF)",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h


def test_sda_id_dropdown_uses_named_range(wb):
    ws = wb["CDA"]
    dvs = ws.data_validations.dataValidation
    sda_dv = None
    for dv in dvs:
        if "B4" in str(dv.sqref):
            sda_dv = dv
            break
    assert sda_dv is not None
    assert "SDA_IDs" in sda_dv.formula1


def test_data_row_formulas(wb):
    ws = wb["CDA"]
    assert ws.cell(row=4, column=7).value == '=IFERROR(VLOOKUP(C4,PARAMS_Rv,2,FALSE),"")'
    assert ws.cell(row=4, column=8).value == "=IFERROR(E4*G4*PROJECT_Rainfall/12,0)"
    assert ws.cell(row=4, column=9).value == "=IFERROR(F4*G4*PROJECT_Rainfall/12,0)"


def test_summary_block_cda_ids_pregenerated(wb):
    ws = wb["CDA"]
    found_ids = set()
    for r in range(1, 100):
        v = ws.cell(row=r, column=1).value
        if isinstance(v, str) and v.startswith("CDA-"):
            found_ids.add(v)
    assert "CDA-1" in found_ids
    assert "CDA-10" in found_ids


def test_summary_max_bmp_credit_formula(wb):
    ws = wb["CDA"]
    # Find CDA-1 row in summary block
    for r in range(1, 100):
        if ws.cell(row=r, column=1).value == "CDA-1":
            cda1_row = r
            break
    else:
        pytest.fail("CDA-1 summary row not found")

    # B: SDA_ID lookup via INDEX/MATCH
    b_val = ws.cell(row=cda1_row, column=2).value
    assert "INDEX" in b_val and "MATCH" in b_val
    # C: Total within LOD SUMIFS
    c_val = ws.cell(row=cda1_row, column=3).value
    assert "SUMIFS" in c_val and "$E$4:$E$53" in c_val
    # D: Max BMP Credit = C * 1.7 / 12
    d_val = ws.cell(row=cda1_row, column=4).value
    assert f"C{cda1_row}" in d_val and "1.7" in d_val and "/12" in d_val


def test_named_range_cda_ids(wb):
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    assert "CDA_IDs" in names
    assert "$A$" in names["CDA_IDs"]
