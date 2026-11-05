"""PEAK_DISCHARGE_SDA + PEAK_DISCHARGE_CDA — TR-55 Graphical Peak Discharge
Method (SCS Type II rainfall, NOAA Atlas 14 DC).  qu via log-polynomial from
PARAMS_TR55, Qp = qu * Am(mi²) * Q(in) * Fp."""
import pytest
import openpyxl
from workbook.builders import (params, project, sda, cda, bmp, tc_path,
                                peak_discharge)


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
    tc_path.build_tc_path_sheet(w, n_rows=20)
    peak_discharge.build_peak_discharge_sda(w)
    peak_discharge.build_peak_discharge_cda(w)
    return w


def test_both_peak_sheets_exist(wb):
    assert "PEAK_DISCHARGE_SDA" in wb.sheetnames
    assert "PEAK_DISCHARGE_CDA" in wb.sheetnames


def test_peak_sda_has_26_cols(wb):
    headers = [wb["PEAK_DISCHARGE_SDA"].cell(row=3, column=c).value
               for c in range(1, 27)]
    assert all(h is not None for h in headers)
    assert "DA (mi" in headers[2]   # DA (mi²)


def test_peak_sda_da_sq_mi(wb):
    f = wb["PEAK_DISCHARGE_SDA"].cell(row=4, column=3).value
    assert "27878400" in f or "27,878,400" in f.replace(",", "")


def test_peak_sda_tc_lookup_fallback(wb):
    f = wb["PEAK_DISCHARGE_SDA"].cell(row=4, column=8).value
    assert "TC_PATH" in f
    assert "0.1" in f
    assert "IFERROR" in f


def test_peak_sda_iap_formula(wb):
    # Col J = 0.2 * S_pre / P2
    f = wb["PEAK_DISCHARGE_SDA"].cell(row=4, column=10).value
    assert "0.2" in f
    assert "F4" in f  # S_pre
    assert "I4" in f  # 2-yr rain


def test_peak_sda_qu_uses_tr55_eq(wb):
    f = wb["PEAK_DISCHARGE_SDA"].cell(row=4, column=12).value
    assert "PARAMS_TR55" in f
    assert "LOG10" in f
    assert "10^" in f


def test_peak_sda_qp_formula(wb):
    # Col P = qu * Am * Q
    f = wb["PEAK_DISCHARGE_SDA"].cell(row=4, column=16).value
    assert "L4" in f and "C4" in f and "N4" in f


def test_peak_cda_sums_areas_from_cda_proposed(wb):
    f = wb["PEAK_DISCHARGE_CDA"].cell(row=4, column=2).value
    assert "CDA_Proposed" in f
    assert "A4" in f
