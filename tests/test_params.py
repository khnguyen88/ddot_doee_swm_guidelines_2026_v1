"""Tests for the PARAMS sheet builder."""
import pytest
import openpyxl

from workbook.builders import params


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    return w


def test_params_sheet_exists(wb):
    assert "PARAMS" in wb.sheetnames


def test_rv_table_values(wb):
    ws = wb["PARAMS"]
    expected = [
        ("Impervious Vehicular", 0.95),
        ("Impervious Non-Vehicular", 0.95),
        ("Compacted (Open Space)", 0.25),
        ("Natural (Woods)", 0.00),
        ("BMP", 0.95),
    ]
    for i, (name, rv) in enumerate(expected):
        r = 7 + i
        assert ws.cell(row=r, column=1).value == name
        assert ws.cell(row=r, column=2).value == pytest.approx(rv)


def test_cn_table_values(wb):
    ws = wb["PARAMS"]
    # Row 15 Impervious, 16 BMP, 17 Natural, 18 Compacted — per layout.
    expected = [
        (15, "Impervious", 98, 98, 98, 98),
        (16, "BMP",        98, 98, 98, 98),
        (17, "Natural (Woods)",       25, 55, 70, 77),
        (18, "Compacted (Open Space)", 39, 61, 74, 80),
    ]
    for r, label, a, b, c, d in expected:
        assert ws.cell(row=r, column=1).value == label
        assert ws.cell(row=r, column=2).value == a
        assert ws.cell(row=r, column=3).value == b
        assert ws.cell(row=r, column=4).value == c
        assert ws.cell(row=r, column=5).value == d


def test_horton_parameters(wb):
    ws = wb["PARAMS"]
    # Row 22 f_max, 23 f_min, 24 k, 25 Δt
    assert ws.cell(row=22, column=2).value == 5.0
    assert ws.cell(row=22, column=3).value == 3.0
    assert ws.cell(row=23, column=2).value == 0.3
    assert ws.cell(row=23, column=3).value == 0.1
    assert ws.cell(row=24, column=2).value == 2.0
    assert ws.cell(row=24, column=3).value == 3.5
    assert ws.cell(row=25, column=2).value == 0.5
    assert ws.cell(row=25, column=3).value == 0.5


def test_horton_precomputed_losses(wb):
    """Row 26 holds the pre-computed Horton infil-loss integrals."""
    from workbook import calculations as calc
    ws = wb["PARAMS"]
    assert ws.cell(row=26, column=2).value == pytest.approx(calc.HORTON_INFIL_LOSS_B, rel=1e-6)
    assert ws.cell(row=26, column=3).value == pytest.approx(calc.HORTON_INFIL_LOSS_C, rel=1e-6)


def test_depression_storage(wb):
    ws = wb["PARAMS"]
    assert ws.cell(row=30, column=2).value == 0.1   # Impervious
    assert ws.cell(row=31, column=2).value == 0.2   # Pervious
    assert ws.cell(row=32, column=2).value == 0.1   # BMP surface


def test_bmp_parameters_rows(wb):
    ws = wb["PARAMS"]
    # Row 36 Permeable Pavement Enhanced — retention mult 1.0
    assert ws.cell(row=36, column=1).value == "Permeable Pavement"
    assert ws.cell(row=36, column=2).value == "Enhanced"
    assert ws.cell(row=36, column=6).value == pytest.approx(1.0)
    # Row 37 Permeable Pavement Underdrained Enhanced — mult 0.6
    assert ws.cell(row=37, column=2).value == "Underdrained Enhanced"
    assert ws.cell(row=37, column=6).value == pytest.approx(0.6)
    # Row 38 Bioretention Standard — mult 0.6
    assert ws.cell(row=38, column=1).value == "Bioretention"
    assert ws.cell(row=38, column=2).value == "Standard"
    assert ws.cell(row=38, column=6).value == pytest.approx(0.6)
    # Row 39 Bioretention Enhanced — mult 1.0
    assert ws.cell(row=39, column=6).value == pytest.approx(1.0)
    # Row 40 Bioretention Enhanced w/ Underdrain — mult 1.0
    # (DOEE Calc sheet 3.6 cell C74: =IF(Type="Standard", 0.6*Sv, Sv) —
    # Enhanced w/ Underdrain is treated the same as Enhanced.)
    assert ws.cell(row=40, column=6).value == pytest.approx(1.0)
    # Row 41 Dry Swale — mult 0.6
    assert ws.cell(row=41, column=1).value == "Dry Swale"
    assert ws.cell(row=41, column=6).value == pytest.approx(0.6)
    # Row 42 Wet Swale — mult 0.1
    assert ws.cell(row=42, column=1).value == "Wet Swale"
    assert ws.cell(row=42, column=6).value == pytest.approx(0.1)


def test_tree_credits(wb):
    ws = wb["PARAMS"]
    expected = [
        ("T-1 Small",     5),
        ("T-1 Large",     10),
        ("T-2 Small",     10),
        ("T-2 Large",     20),
        ("T-2 Special",   30),
        ("T-2 Heritage",  40),
    ]
    for i, (code, credit) in enumerate(expected):
        r = 46 + i
        assert ws.cell(row=r, column=1).value == code
        assert ws.cell(row=r, column=3).value == credit


def test_detention_storm_depths(wb):
    ws = wb["PARAMS"]
    assert ws.cell(row=55, column=1).value == "2-year"
    assert ws.cell(row=55, column=2).value == pytest.approx(3.14)
    assert ws.cell(row=56, column=1).value == "15-year"
    assert ws.cell(row=56, column=2).value == pytest.approx(5.23)
    assert ws.cell(row=57, column=1).value == "100-year"
    assert ws.cell(row=57, column=2).value == pytest.approx(8.34)


def test_detention_cn_defaults(wb):
    ws = wb["PARAMS"]
    expected = [("Natural", 70), ("Compacted", 74), ("Impervious", 98), ("BMP", 98)]
    for i, (name, cn) in enumerate(expected):
        r = 61 + i
        assert ws.cell(row=r, column=1).value == name
        assert ws.cell(row=r, column=2).value == cn


def test_ksat_table_values(wb):
    """Rows 68-71 contain the default Ksat values by HSG."""
    ws = wb["PARAMS"]
    expected = [
        (68, "A", 4.8),
        (69, "B", 1.0),
        (70, "C", 0.2),
        (71, "D", 0.06),
    ]
    for row, hsg, ksat in expected:
        assert ws.cell(row=row, column=1).value == hsg, (
            f"Row {row} col A: expected {hsg!r}, got {ws.cell(row=row, column=1).value!r}")
        assert ws.cell(row=row, column=2).value == pytest.approx(ksat), (
            f"Row {row} col B: expected {ksat}, got {ws.cell(row=row, column=2).value}")


def test_named_ranges_defined(wb):
    expected_names = {
        "PARAMS_Rv":              "'PARAMS'!$A$7:$B$11",
        "PARAMS_CN":              "'PARAMS'!$A$15:$E$18",
        "PARAMS_Horton":          "'PARAMS'!$A$22:$C$25",
        "PARAMS_Depression":      "'PARAMS'!$A$30:$B$32",
        "PARAMS_BMP":             "'PARAMS'!$A$36:$G$42",
        "PARAMS_Trees":           "'PARAMS'!$A$46:$C$51",
        "PARAMS_Detention":       "'PARAMS'!$A$55:$B$57",
        "PARAMS_DetentionCN":     "'PARAMS'!$A$61:$B$64",
        "PARAMS_HortonLossB":     "'PARAMS'!$B$26",
        "PARAMS_HortonLossC":     "'PARAMS'!$C$26",
        "PARAMS_Ksat":            "'PARAMS'!$A$68:$B$71",
        "PARAMS_TR55":            "'PARAMS'!$A$76:$D$81",
        "PARAMS_BMPSizingRules":  "'PARAMS'!$A$85:$I$91",
    }
    actual_names = {dn.name for dn in wb.defined_names.values()}
    for name in expected_names:
        assert name in actual_names, f"Missing named range: {name}"
    for name, addr in expected_names.items():
        dn = wb.defined_names[name]
        assert dn.attr_text == addr, f"{name}: {dn.attr_text!r} != {addr!r}"


def test_params_tr55_named_range_defined(wb):
    assert "PARAMS_TR55" in {n.name for n in wb.defined_names.values()}


def test_params_tr55_has_six_iap_rows(wb):
    ws = wb["PARAMS"]
    # TR-55 block at rows 74-81: header row 74, col headers 75, data 76-81
    iap_values = [ws.cell(row=76 + i, column=1).value for i in range(6)]
    assert iap_values == [0.10, 0.30, 0.35, 0.40, 0.45, 0.50]


def test_params_tr55_coefficients_at_iap_0_30(wb):
    ws = wb["PARAMS"]
    # Row 77 = Ia/P 0.30; C0 col 2, C1 col 3, C2 col 4
    assert ws.cell(row=77, column=2).value == pytest.approx(2.46532, abs=1e-5)
    assert ws.cell(row=77, column=3).value == pytest.approx(-0.62257, abs=1e-5)
    assert ws.cell(row=77, column=4).value == pytest.approx(-0.11657, abs=1e-5)


def test_params_bmp_sizing_rules_named_range_defined(wb):
    assert "PARAMS_BMPSizingRules" in {n.name for n in wb.defined_names.values()}


def test_params_bmp_sizing_rules_rows(wb):
    ws = wb["PARAMS"]
    # Sizing rules block at rows 83-91: header row 83, col headers 84, data 85-91 (7 sub-types)
    subtype_labels = [ws.cell(row=85 + i, column=1).value for i in range(7)]
    assert "Bio Standard" in subtype_labels
    assert "Dry Swale" in subtype_labels
    bio_std_row = 85
    assert ws.cell(row=bio_std_row, column=2).value == 0.03  # SA:CDA min
    assert ws.cell(row=bio_std_row, column=3).value == 0.10  # SA:CDA max
    assert ws.cell(row=bio_std_row, column=4).value == 0.5   # min ponding
    assert ws.cell(row=bio_std_row, column=5).value == 1.5   # min media


def test_params_bmp_matches_doee_calc_2020(wb):
    """Lock PARAMS_BMP to the official DOEE SWMP-BMP Calculator (2020-11-30).

    Source of truth:
      docs/doee_spreadsheet_calculators/2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm
        • Sheet 3.6 Bioretention:      C62 ηmedia=0.25, C65 ηgravel=0.40,
                                       C74 Rv = IF(Type="Standard", 0.6*Sv, Sv)
                                       → Standard mult=0.6, Enhanced=1.0,
                                         Enhanced w/ Underdrain=1.0
        • Sheet 3.9 O-2 Dry Swale:     C33 ηmedia=0.25, C35 ηgravel=0.40,
                                       C38 Rv = 0.6*Sv
        • Sheet 3.9 O-3 Wet Swale:     Rv = 0.1*Sv
        • Sheet 3.5 Permeable Pavement: n_reservoir=0.40

    PARAMS_BMP layout: rows 36-42, columns A..G:
        A=BMP Type, B=Sub-Type, C=n_media, D=n_gravel, E=n_reservoir,
        F=Ret. Multiplier, G=Max Drawdown (days)
    """
    ws = wb["PARAMS"]
    expected = [
        # (type, sub-type, n_media, n_gravel, n_reservoir, Ret.Mult, Drawdown)
        ("Permeable Pavement", "Enhanced",               None, None, 0.40, 1.0, 2),
        ("Permeable Pavement", "Underdrained Enhanced",  None, None, 0.40, 0.6, 2),
        ("Bioretention",       "Standard",               0.25, 0.40, None, 0.6, 3),
        ("Bioretention",       "Enhanced",               0.25, 0.40, None, 1.0, 3),
        ("Bioretention",       "Enhanced w/ Underdrain", 0.25, 0.40, None, 1.0, 3),
        ("Dry Swale",          "—",                      0.25, 0.40, None, 0.6, 3),
        ("Wet Swale",          "—",                      None, None, None, 0.1, None),
    ]
    for i, (bmp_type, sub_type, n_media, n_gravel, n_reservoir, mult, drawdown) in enumerate(expected):
        r = 36 + i
        # Col A: BMP Type
        assert ws.cell(row=r, column=1).value == bmp_type, f"Row {r} BMP Type"
        # Col B: Sub-Type (may legitimately be the em-dash string "—")
        assert ws.cell(row=r, column=2).value == sub_type, f"Row {r} Sub-Type"
        # Cols C-G: numerics (None in `expected` means an em-dash placeholder cell)
        for col, want in [(3, n_media), (4, n_gravel), (5, n_reservoir),
                          (6, mult), (7, drawdown)]:
            got = ws.cell(row=r, column=col).value
            if want is None:
                assert got == "—", (
                    f"PARAMS_BMP row {r} col {col}: expected em-dash placeholder, "
                    f"got {got!r}. {bmp_type}/{sub_type} must match DOEE Calc 2020.")
            else:
                assert got == want, (
                    f"PARAMS_BMP row {r} col {col}: expected {want}, got {got}. "
                    f"{bmp_type}/{sub_type} must match DOEE Calc 2020 — see "
                    f"workbook/builders/params.py bmp_rows comment for cell citations.")
