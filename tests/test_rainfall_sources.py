"""Cross-cutting test — ensures each sheet uses the correct PROJECT_Rainfall_*.

Guards against drift where a future edit accidentally re-wires SDA/CDA
to PROJECT_Rainfall_EISA, or EISA sheets to PROJECT_Rainfall_Retention.
"""
import pytest
import openpyxl

from workbook.builders import (
    params, project, sda, cda, bmp, correct_mep_summary,
    eisa_direct, eisa_tr55, doee,
)


@pytest.fixture(scope="module")
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    project.build_project_sheet(w)
    params.build_params_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    correct_mep_summary.build_correct_mep_summary(w)
    eisa_direct.build_eisa_direct(w)
    eisa_tr55.build_eisa_tr55(w)
    return w


@pytest.mark.parametrize("sheet", [
    "SDA_Existing", "SDA_Proposed", "CDA_Existing", "CDA_Proposed"])
def test_retention_sheets_use_retention_named_range(wb, sheet):
    ws = wb[sheet]
    v = ws.cell(row=4, column=8).value  # H4 = Rainfall column
    assert v == "=PROJECT_Rainfall_Retention", f"{sheet} must use retention"


def test_eisa_direct_uses_eisa_named_range(wb):
    text = _flatten_formulas(wb["EISA_DIRECT"])
    assert "PROJECT_Rainfall_EISA" in text
    assert "PROJECT_Rainfall_Retention" not in text


def test_eisa_tr55_uses_eisa_named_range(wb):
    text = _flatten_formulas(wb["EISA_TR55"])
    assert "PROJECT_Rainfall_EISA" in text
    assert "PROJECT_Rainfall_Retention" not in text


def test_mep_summary_keeps_hardcoded_depths(wb):
    """MEP sheet must stay verbatim: 1.2 for J/K SWRv, 1.7 for AE/AF ceiling."""
    text = _flatten_formulas(wb["CORRECT_MEP_SUMMARY"])
    assert "*1.2/12" in text
    assert "*1.7/12" in text
    # Must NOT have re-wired itself to the named ranges.
    assert "PROJECT_Rainfall_Retention" not in text
    assert "PROJECT_Rainfall_EISA" not in text


def _flatten_formulas(ws) -> str:
    out = []
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if isinstance(v, str) and v.startswith("="):
                out.append(v)
    return "\n".join(out)
