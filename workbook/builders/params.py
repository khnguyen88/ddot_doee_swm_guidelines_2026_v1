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
        ("BMP",                       0.00),
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
    styles.hdr(ws, 34, 1, "BMP Design Parameters", styles.BS, span=7)
    for i, h in enumerate([
        "BMP Type", "Sub-Type", "n_media", "n_gravel", "n_reservoir",
        "Ret. Multiplier", "Max Drawdown (days)",
    ], 1):
        styles.lbl(ws, 35, i, h, styles.BL, bold=True)
    bmp_rows = [
        ("Permeable Pavement", "Enhanced",               None, None, 0.40, 1.0, 2),
        ("Permeable Pavement", "Underdrained Enhanced",  None, None, 0.40, 0.6, 2),
        ("Bioretention",       "Standard",               0.40, 0.40, None, 0.6, 3),
        ("Bioretention",       "Enhanced",               0.40, 0.40, None, 1.0, 3),
        ("Bioretention",       "Enhanced w/ Underdrain", 0.40, 0.40, None, 0.6, 3),
        ("Dry Swale",          "—",                      0.40, 0.40, None, 0.6, 3),
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

    # ── Named ranges ──
    _add_named_ranges(wb)


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
        "PARAMS_Ksat":         "'PARAMS'!$A$68:$B$71",
    }
    for name, addr in ranges.items():
        wb.defined_names.add(DefinedName(name, attr_text=addr))
