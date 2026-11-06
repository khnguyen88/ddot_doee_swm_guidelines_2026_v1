"""Build the PARAMS sheet — all lookup tables + named ranges."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName

from workbook import styles, calculations as calc


def build_params_sheet(wb: Workbook) -> None:
    ws = wb.create_sheet("PARAMS")
    ws.sheet_view.showGridLines = False

    for i, w in enumerate([36, 14, 14, 14, 14, 14, 14], 1):
        styles.cw(ws, i, w)

    # Title.
    styles.hdr(ws, 1, 1, "PARAMS — Locked Lookup Tables (do not edit)",
               styles.BH, span=7)
    ws.row_dimensions[1].height = 24

    # ── Section 1: Rv ──
    styles.hdr(ws, 5, 1, "Runoff Coefficients (Rv) for SWRv", styles.BS, span=7)
    styles.lbl(ws, 6, 1, "Land Use", styles.BL, bold=True)
    styles.lbl(ws, 6, 2, "Rv", styles.BL, bold=True)
    rv_rows = [
        ("Impervious Vehicular",     0.95),
        ("Impervious Non-Vehicular", 0.95),
        ("Compacted (Open Space)",   0.25),
        ("Natural (Woods)",          0.00),
        ("BMP",                       0.95),
    ]
    for i, (name, rv) in enumerate(rv_rows):
        r = 7 + i
        styles.lbl(ws, r, 1, name)
        styles.lbl(ws, r, 2, rv, styles.GRY)

    # ── Section 2: TR-55 CN ──
    styles.hdr(ws, 13, 1, "TR-55 Curve Numbers by Land Use × HSG",
               styles.GS, span=7)
    for i, h in enumerate(["Land Use", "HSG A", "HSG B", "HSG C", "HSG D"], 1):
        styles.lbl(ws, 14, i, h, styles.GL, bold=True)
    cn_rows = [
        ("Impervious",              98, 98, 98, 98),
        ("BMP",                     98, 98, 98, 98),
        ("Natural (Woods)",         25, 55, 70, 77),
        ("Compacted (Open Space)",  39, 61, 74, 80),
    ]
    for i, row in enumerate(cn_rows):
        r = 15 + i
        for j, v in enumerate(row):
            styles.lbl(ws, r, j + 1, v, styles.GRY)

    # ── Section 3: Horton parameters ──
    styles.hdr(ws, 20, 1, "Horton Infiltration Parameters", styles.GS, span=7)
    for i, h in enumerate(["Parameter", "HSG B", "HSG C"], 1):
        styles.lbl(ws, 21, i, h, styles.GL, bold=True)
    horton_rows = [
        ("f_max (in/hr)",  5.0, 3.0),
        ("f_min (in/hr)",  0.3, 0.1),
        ("k (1/hr)",       2.0, 3.5),
        ("Δt (hr)",        0.5, 0.5),
    ]
    for i, row in enumerate(horton_rows):
        r = 22 + i
        for j, v in enumerate(row):
            styles.lbl(ws, r, j + 1, v, styles.GRY)

    # Pre-computed loss integrals.
    styles.lbl(ws, 26, 1, "Infil Loss over 24 hr (in)", styles.GL, bold=True)
    styles.lbl(ws, 26, 2, calc.HORTON_INFIL_LOSS_B, styles.GRY)
    styles.lbl(ws, 26, 3, calc.HORTON_INFIL_LOSS_C, styles.GRY)

    # ── Section 4: Depression storage ──
    styles.hdr(ws, 28, 1, "Depression Storage", styles.BS, span=7)
    for i, h in enumerate(["Surface", "Depth (in)"], 1):
        styles.lbl(ws, 29, i, h, styles.BL, bold=True)
    for i, (name, d) in enumerate([
        ("Impervious (roof/pavement)", 0.1),
        ("Pervious",                   0.2),
        ("BMP surface",                0.1),
    ]):
        r = 30 + i
        styles.lbl(ws, r, 1, name)
        styles.lbl(ws, r, 2, d, styles.GRY)

    # ── Section 5: BMP design parameters ──
    # Values match the official DOEE SWMP-BMP Calc Spreadsheet (2020-11-30):
    #   docs/doee_spreadsheet_calculators/2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm
    #   • Sheet 3.6 Bioretention: C62 ηmedia=0.25, C65 ηgravel=0.40,
    #       C74 Rv = IF(Type="Standard", 0.6*Sv, Sv) → Standard=0.6, Enhanced=1.0,
    #       Enhanced w/ Underdrain=1.0 (treated same as Enhanced).
    #   • Sheet 3.9 O-2 Dry Swale: C33 ηmedia=0.25, C35 ηgravel=0.40,
    #       C38 Rv = 0.6*Sv.
    #   • Sheet 3.9 O-3 Wet Swale: Rv = 0.1*Sv.
    #   • Sheet 3.5 Permeable Pavement: n_reservoir=0.40.
    # Any edit here must keep parity with the Calc (locked in by
    # tests/test_params.py::test_params_bmp_matches_doee_calc_2020).
    styles.hdr(ws, 34, 1, "BMP Design Parameters", styles.BS, span=7)
    for i, h in enumerate([
        "BMP Type", "Sub-Type", "n_media", "n_gravel", "n_reservoir",
        "Ret. Multiplier", "Max Drawdown (days)",
    ], 1):
        styles.lbl(ws, 35, i, h, styles.BL, bold=True)
    bmp_rows = [
        ("Permeable Pavement", "Enhanced",               None, None, 0.40, 1.0, 2),
        ("Permeable Pavement", "Underdrained Enhanced",  None, None, 0.40, 0.6, 2),
        ("Bioretention",       "Standard",               0.25, 0.40, None, 0.6, 3),
        ("Bioretention",       "Enhanced",               0.25, 0.40, None, 1.0, 3),
        ("Bioretention",       "Enhanced w/ Underdrain", 0.25, 0.40, None, 1.0, 3),
        ("Dry Swale",          "—",                      0.25, 0.40, None, 0.6, 3),
        ("Wet Swale",          "—",                      None, None, None, 0.1, None),
    ]
    for i, row in enumerate(bmp_rows):
        r = 36 + i
        for j, v in enumerate(row):
            if v is None:
                styles.locked(ws, r, j + 1, "—")
            else:
                styles.lbl(ws, r, j + 1, v, styles.GRY)

    # ── Section 6: Tree Credits ──
    styles.hdr(ws, 44, 1, "Tree Credits", styles.GS, span=7)
    for i, h in enumerate(["Code", "Description", "Rv per unit (CF)"], 1):
        styles.lbl(ws, 45, i, h, styles.GL, bold=True)
    tree_rows = [
        ("T-1 Small",    "Planted small tree",      5),
        ("T-1 Large",    "Planted large tree",      10),
        ("T-2 Small",    "Preserved small tree",    10),
        ("T-2 Large",    "Preserved large tree",    20),
        ("T-2 Special",  "Preserved special tree",  30),
        ("T-2 Heritage", "Preserved heritage tree", 40),
    ]
    for i, (code, desc, credit) in enumerate(tree_rows):
        r = 46 + i
        styles.lbl(ws, r, 1, code, styles.GRY, bold=True)
        styles.lbl(ws, r, 2, desc)
        styles.lbl(ws, r, 3, credit, styles.GRY)

    # ── Section 7: Detention storm depths ──
    styles.hdr(ws, 53, 1, "Detention Storm Depths (DC, from NRCS TR-55)",
               styles.BS, span=7)
    for i, h in enumerate(["Storm", "Depth (in)"], 1):
        styles.lbl(ws, 54, i, h, styles.BL, bold=True)
    for i, (name, d) in enumerate([("2-year", 3.14), ("15-year", 5.23), ("100-year", 8.34)]):
        r = 55 + i
        styles.lbl(ws, r, 1, name)
        styles.lbl(ws, r, 2, d, styles.GRY)

    # ── Section 8: Detention CN defaults ──
    styles.hdr(ws, 59, 1, "DOEE Detention CN Defaults", styles.BS, span=7)
    for i, h in enumerate(["Land Cover", "CN"], 1):
        styles.lbl(ws, 60, i, h, styles.BL, bold=True)
    for i, (name, cn) in enumerate([("Natural", 70), ("Compacted", 74),
                                     ("Impervious", 98), ("BMP", 98)]):
        r = 61 + i
        styles.lbl(ws, r, 1, name)
        styles.lbl(ws, r, 2, cn, styles.GRY)

    # ── Section 9: Default Ksat by HSG ──
    # Rows 66-71: spacer at 65, header at 66, col headers at 67, data at 68-71.
    styles.hdr(ws, 66, 1, "Default Ksat by HSG (ft/day)", styles.BS, span=7)
    for i, h in enumerate(["HSG", "Ksat (ft/day)"], 1):
        styles.lbl(ws, 67, i, h, styles.BL, bold=True)
    ksat_rows = [
        ("A", 4.8),
        ("B", 1.0),
        ("C", 0.2),
        ("D", 0.06),
    ]
    for i, (hsg, ksat) in enumerate(ksat_rows):
        r = 68 + i
        styles.lbl(ws, r, 1, hsg, styles.GRY, bold=True)
        styles.lbl(ws, r, 2, ksat, styles.GRY)

    # ── Section 10: TR-55 Type II Unit Peak Discharge Coefficients ──
    styles.hdr(ws, 74, 1, "TR-55 Type II qu Coefficients (log10 eq)", styles.BS, span=7)
    for i, h in enumerate(["Ia/P", "C0", "C1", "C2"], 1):
        styles.lbl(ws, 75, i, h, styles.BL, bold=True)
    tr55_rows = [
        (0.10, 2.55323, -0.61512, -0.16403),
        (0.30, 2.46532, -0.62257, -0.11657),
        (0.35, 2.41896, -0.61594, -0.08820),
        (0.40, 2.36409, -0.59857, -0.05621),
        (0.45, 2.29238, -0.57005, -0.02281),
        (0.50, 2.20282, -0.51599, -0.01259),
    ]
    for i, row in enumerate(tr55_rows):
        r = 76 + i
        for j, v in enumerate(row):
            styles.lbl(ws, r, j + 1, v, styles.GRY)

    # ── Section 11: BMP Sizing Rules ──
    styles.hdr(ws, 83, 1, "BMP Sizing Rules (SA:CDA, min depths, freeboard, slope)",
               styles.BS, span=9)
    for i, h in enumerate([
        "Sub-type", "SA:CDA min", "SA:CDA max", "Min pond (ft)",
        "Min media (ft)", "Min gravel (ft)", "Min freeboard (ft)",
        "Max slope", "Min cleanouts",
    ], 1):
        styles.lbl(ws, 84, i, h, styles.BL, bold=True)
    sizing_rows = [
        ("Bio Standard",               0.03, 0.10, 0.5,   1.5, 1.0, 0.25, None, 1),
        ("Bio Enhanced",               0.03, 0.10, 0.5,   2.0, 1.0, 0.25, None, 1),
        ("Bio Enhanced w/ Underdrain", 0.03, 0.10, 0.5,   2.0, 1.0, 0.25, None, 1),
        ("Dry Swale",                  0.03, 0.10, 0.167, 1.5, 1.0, 0.25, 0.04, 1),
        ("PP Enhanced",                None, None, None,  None, 1.0, None, None, None),
        ("PP Underdrained",            None, None, None,  None, 1.0, None, None, None),
        ("Wet Swale",                  None, None, None,  None, None, None, None, None),
    ]
    for i, row in enumerate(sizing_rows):
        r = 85 + i
        for j, v in enumerate(row):
            if v is None:
                styles.locked(ws, r, j + 1, "—")
            else:
                styles.lbl(ws, r, j + 1, v, styles.GRY)

    # ── Named ranges ──
    _add_named_ranges(wb)

    # ── Section separator borders ──
    # Thick top border above each section header so sections are visually distinct.
    section_header_rows = (5, 13, 20, 28, 34, 44, 53, 59, 66, 74, 83)
    for r in section_header_rows:
        styles.apply_top_divider(ws, r, 1, 7)


def _add_named_ranges(wb: Workbook) -> None:
    ranges = {
        "PARAMS_Rv":           "'PARAMS'!$A$7:$B$11",
        "PARAMS_CN":           "'PARAMS'!$A$15:$E$18",
        "PARAMS_Horton":       "'PARAMS'!$A$22:$C$25",
        "PARAMS_Depression":   "'PARAMS'!$A$30:$B$32",
        "PARAMS_BMP":          "'PARAMS'!$A$36:$G$42",
        "PARAMS_Trees":        "'PARAMS'!$A$46:$C$51",
        "PARAMS_Detention":    "'PARAMS'!$A$55:$B$57",
        "PARAMS_DetentionCN":  "'PARAMS'!$A$61:$B$64",
        "PARAMS_HortonLossB":  "'PARAMS'!$B$26",
        "PARAMS_HortonLossC":  "'PARAMS'!$C$26",
        "PARAMS_Ksat":            "'PARAMS'!$A$68:$B$71",
        "PARAMS_TR55":            "'PARAMS'!$A$76:$D$81",
        "PARAMS_BMPSizingRules":  "'PARAMS'!$A$85:$I$91",
    }
    for name, addr in ranges.items():
        wb.defined_names.add(DefinedName(name, attr_text=addr))
