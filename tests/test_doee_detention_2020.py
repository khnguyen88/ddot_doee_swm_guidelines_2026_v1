"""DOEE_DETENTION: 2020 Compliance Calc methodology — Pre/Post/Adj CN per
storm, 2-yr+15-yr+100-yr blocks, closed-form adjusted CN after BMP storage."""
import pytest
from workbook.__main__ import build_workbook


@pytest.fixture(scope="module")
def wb():
    return build_workbook()


def test_detention_has_100yr_columns(wb):
    """Col R-V are 100-yr: rain, Pre Q, Post Q, Adj Q, Adj CN."""
    ws = wb["DOEE_DETENTION"]
    headers = {c: ws.cell(row=3, column=c).value for c in range(1, 23)}
    assert "100" in (headers[18] or ""), f"got {headers[18]!r}"
    assert "100" in (headers[19] or "")


def test_detention_bmp_sv_total_sums_bmp_ao(wb):
    """Col E (BMP Sv total) must sum BMP col AO (41) over data rows 6-55."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=5).value
    assert "'BMP'!$AO$6:$AO$55" in f or "AO" in f
    assert "A4" in f


def test_detention_pre_q_scs_formula(wb):
    """Col G (2-yr Pre Q) = SCS runoff (P - 0.2S)^2 / (P + 0.8S)."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=7).value
    assert "0.2" in f and "0.8" in f
    assert "B4" in f


def test_detention_adj_q_subtracts_bmp_sv(wb):
    """Col I (2-yr Adj Q) = MAX(0, Post Q - BMP Sv × 12 / DA_SF)."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=9).value
    for ref in ["H4", "E4", "D4"]:
        assert ref in f, f"missing {ref} in {f!r}"


def test_detention_adj_cn_closed_form(wb):
    """Col J (2-yr Adj CN) uses closed-form S_adj = 5·(P + 2Q − √(Q·(4Q+5P)))."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=10).value
    assert "SQRT" in f
    assert "1000" in f


def test_detention_2yr_trigger_against_70(wb):
    """Col K (2-yr Det Req'd?) triggers when Adj CN > 70."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=11).value
    assert "70" in f
    assert "J4" in f


def test_detention_15yr_trigger_against_pre_cn(wb):
    """Col Q (15-yr Det Req'd?) triggers when Adj CN > Pre CN."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=17).value
    assert "P4" in f and "B4" in f
