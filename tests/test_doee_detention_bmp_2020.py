"""DOEE_DETENTION_BMP: 2020 methodology at CDA level — Pre CN from
CDA_Existing, Post CN from CDA_Proposed, 100-yr block added.

DOEE_COMPLIANCE col F must read the new K (2-yr) and Q (15-yr) trigger
columns from DOEE_DETENTION."""
import pytest
from workbook.__main__ import build_workbook


@pytest.fixture(scope="module")
def wb():
    return build_workbook()


def test_detention_bmp_has_100yr(wb):
    ws = wb["DOEE_DETENTION_BMP"]
    headers = [ws.cell(row=3, column=c).value for c in range(1, 25)]
    assert any("100" in (h or "") for h in headers), f"got {headers!r}"


def test_detention_bmp_uses_cda_areas(wb):
    """CDA-level: Pre CN from CDA_Existing, Post CN from CDA_Proposed."""
    ws = wb["DOEE_DETENTION_BMP"]
    pre_cn_col = None
    for c in range(1, 20):
        h = ws.cell(row=3, column=c).value or ""
        if "Pre CN" in h:
            pre_cn_col = c
            break
    assert pre_cn_col is not None, "Pre CN column not found"
    f = ws.cell(row=4, column=pre_cn_col).value
    assert "CDA_Existing" in f


def test_doee_compliance_detention_flag_checks_k_and_q(wb):
    """DOEE_COMPLIANCE col F now references DOEE_DETENTION K (2-yr) and Q
    (15-yr) because the detention sheet's column letters shifted."""
    ws = wb["DOEE_COMPLIANCE"]
    f = ws.cell(row=4, column=6).value
    assert "K4" in f and "Q4" in f, f"got {f!r}"
