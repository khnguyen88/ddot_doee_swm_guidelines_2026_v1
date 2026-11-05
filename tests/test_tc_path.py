"""TC_PATH sheet — per-SDA/CDA time of concentration (direct override OR
4-segment TR-55 path). Floor Tc at 0.1 hr."""
import pytest
import openpyxl
from workbook.builders import params, tc_path


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    tc_path.build_tc_path_sheet(w, n_rows=20)
    return w


def test_tc_path_sheet_exists(wb):
    assert "TC_PATH" in wb.sheetnames


def test_tc_path_has_21_cols(wb):
    ws = wb["TC_PATH"]
    headers = [ws.cell(row=3, column=c).value for c in range(1, 22)]
    assert headers[0] == "ID"
    assert headers[2] == "Tc direct (min)"
    assert headers[20] == "Tc final (min)"


def test_tt_sheet_formula(wb):
    # Col H = 0.007 * (n*L)^0.8 / (P2^0.5 * S^0.4)
    f = wb["TC_PATH"].cell(row=4, column=8).value
    assert "0.007" in f
    assert "D4" in f and "E4" in f and "F4" in f and "G4" in f
    assert "0.8" in f and "0.4" in f


def test_tt_shallow_paved_and_unpaved(wb):
    # Col L = L/(V*3600), V = 20.3282*sqrt(S) paved, 16.1345*sqrt(S) unpaved
    f = wb["TC_PATH"].cell(row=4, column=12).value
    assert "20.3282" in f and "16.1345" in f
    assert "I4" in f   # paved/unpaved
    assert "J4" in f and "K4" in f


def test_tc_computed_sums_all_segments(wb):
    f = wb["TC_PATH"].cell(row=4, column=19).value
    for ref in ["H4", "L4", "O4", "R4"]:
        assert ref in f


def test_tc_final_direct_overrides_computed(wb):
    f = wb["TC_PATH"].cell(row=4, column=20).value
    assert "C4" in f and "S4" in f
    assert "0.1" in f
    assert "/60" in f


def test_shallow_surface_dropdown(wb):
    ws = wb["TC_PATH"]
    dvs = ws.data_validations.dataValidation
    found = False
    for dv in dvs:
        if "I4" in str(dv.sqref) and "paved" in dv.formula1.lower():
            found = True
    assert found
