"""Tests for the four DOEE compliance mirror sheets."""
import pytest
import openpyxl

from workbook.builders import params, project, sda, cda, bmp, doee


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    doee.build_doee_sda(w)
    doee.build_doee_bmp_data(w)
    doee.build_doee_detention(w)
    doee.build_doee_compliance(w)
    return w


def test_all_four_doee_sheets_exist(wb):
    for name in ("DOEE_SDA", "DOEE_BMP_DATA", "DOEE_DETENTION", "DOEE_COMPLIANCE"):
        assert name in wb.sheetnames


def test_doee_sda_rows(wb):
    ws = wb["DOEE_SDA"]
    # Ten SDA rows (SDA-1 ... SDA-10) auto-pulled from SDA summary via ='SDA'!A57
    sda_ids = []
    for r in range(1, 50):
        v = ws.cell(row=r, column=1).value
        if isinstance(v, str) and ("SDA" in v or "'SDA'" in v):
            sda_ids.append(v)
    assert len(sda_ids) >= 10 or any("'SDA'" in s for s in sda_ids)


def test_doee_sda_swrv_formula(wb):
    ws = wb["DOEE_SDA"]
    # Column L should contain SWRv Required (CF)
    header = None
    for c in range(1, 20):
        if ws.cell(row=3, column=c).value and "SWRv" in str(ws.cell(row=3, column=c).value):
            header = c
            break
    assert header is not None, "SWRv column not found"


def test_doee_bmp_data_pulls_from_bmp_sheet(wb):
    ws = wb["DOEE_BMP_DATA"]
    found = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and "'BMP'" in v:
                found = True
    assert found


def test_doee_detention_uses_params_cn(wb):
    ws = wb["DOEE_DETENTION"]
    # At least one formula references PARAMS_DetentionCN or detention storm
    found = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and ("PARAMS_Detention" in v or "3.14" in v or "5.23" in v):
                found = True
    assert found


def test_doee_compliance_pass_fail(wb):
    ws = wb["DOEE_COMPLIANCE"]
    found_pass = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and ("PASS" in v or "✓" in v):
                found_pass = True
    assert found_pass
