"""Build the BMP sheet — one row per BMP, all parameter columns, auto outputs."""
from openpyxl import Workbook
from openpyxl.styles import Side, Border
from openpyxl.worksheet.datavalidation import DataValidation  # noqa: F401 — restored in Task 4 for sub-type and underdrain dropdowns

from workbook import styles

# Columns that mark the right edge of each BMP zone (1-based column numbers).
# Updated for the 81-col layout:
# ID (A-E=5), PP (F-M=13), Bio/Dry Swale (N-AD=30), Wet Swale (AE-AG=33),
# Trees (AH-AN=40), Outputs (AO-AT=46), Checks (AU-AV=48),
# Supplemental Bio (AW-BE=57), Supplemental Swale (BF-BZ=78), Swale Pond (CA-CC=81)
_ZONE_DIVIDER_COLS = (5, 13, 30, 33, 40, 46, 48, 57, 78, 81)

_MEDIUM_RIGHT = Side(style="medium", color="000000")

# CDA data table range (used by Ksat HSG lookup formulas)
CDA_D1 = 4
CDA_DL = 53


def _cda_dominant_hsg_formula(cda_cell: str) -> str:
    """Build an Excel formula returning the most conservative HSG present in
    the CDA referenced by `cda_cell` (e.g. "C4").

    Picks D > C > B > A so lined/clay soils are preferred when multiple HSGs
    coexist. Uses nested IF (not IFS) for Excel 2016 compatibility.
    """
    def _sumifs(hsg: str) -> str:
        return (
            f"SUMIFS('CDA_Proposed'!$E${CDA_D1}:$E${CDA_DL},"
            f"'CDA_Proposed'!$A${CDA_D1}:$A${CDA_DL},{cda_cell},"
            f"'CDA_Proposed'!$D${CDA_D1}:$D${CDA_DL},\"{hsg}\")"
        )
    return (
        f'IF({_sumifs("D")}>0,"D",'
        f'IF({_sumifs("C")}>0,"C",'
        f'IF({_sumifs("B")}>0,"B",'
        f'IF({_sumifs("A")}>0,"A",""))))'
    )


BMP_TYPES = [
    "Permeable Pavement",
    "Bioretention",
    "Dry Swale",
    "Wet Swale",
    "Planted Trees",
    "Preserve Trees",
]

# (BMP Type, Sub-Type) → PARAMS_BMP row index (1-based within named range).
# PARAMS_BMP covers rows 36-42 on PARAMS sheet (7 BMP sub-type rows).
BMP_PARAM_ROWS = [
    ("Permeable Pavement", "Enhanced",                1),
    ("Permeable Pavement", "Underdrained Enhanced",   2),
    ("Bioretention",       "Standard",                3),
    ("Bioretention",       "Enhanced",                4),
    ("Bioretention",       "Enhanced w/ Underdrain",  5),
    ("Dry Swale",          "—",                       6),
    ("Wet Swale",          "—",                       7),
]

# ---------------------------------------------------------------------------
# Row 3 zone banners — (start_col, end_col, text)
# ---------------------------------------------------------------------------
ZONE_BANNERS = [
    (1,  5,  "ID"),
    (6,  13, "Permeable Pavement Storage Details"),
    (14, 30, "Bioretention / Bioswale Storage Details"),
    (31, 33, "Wet Swale"),
    (34, 40, "Tree Planting and Tree Preservation"),
    (41, 46, "Storage Volume Information (Outputs)"),
    (47, 48, "Sizing Checks"),
    (49, 57, "Supplemental Bioretention Info"),
    (58, 78, "Supplemental Swale Info"),
    (79, 81, "Swale Pond Method + Sv"),
]

# ---------------------------------------------------------------------------
# Row 4 column headers — 81 entries (cols A through CC)
# ---------------------------------------------------------------------------
HEADERS = [
    # A-E: ID (5)
    "BMP Name", "SDA_ID", "CDA_ID", "BMP Type", "Sub-Type",
    # F-M: Permeable Pavement (8)
    "PP SA Aₚ (SF)", "PP dp (ft)", "PP d_sump (ft)", "PP Ksat (ft/d)",
    "PP n_reservoir", "PP Sv (CF)", "PP Drawdown (d)", "PP ≤ 2d?",
    # N-AD: Bio/Dry Swale stack (17)
    "SA top (SF)", "SA bot (SF)", "SA avg (SF)",
    "d_topsoil (ft)", "d_media (ft)", "n_media",
    "d_choker (ft)", "d_gravel (ft)",
    "Underdrain", "UD Ø (in)", "UD headspace (ft)",
    "d_grv below UD (ft)", "n_gravel", "d_pond (ft)",
    "Ksat (ft/d)", "Bio Sv (CF)", "Drawdown (d)",
    # AE-AG: Wet Swale (3)
    "WS Pool Vol (CF)", "WS ED Vol (CF)", "WS Sv (CF)",
    # AH-AN: Trees (7)
    "# Planted Small", "# Planted Large",
    "# Preserved Small", "# Preserved Large",
    "# Preserved Special", "# Preserved Heritage",
    "Tree Rv Total (CF)",
    # AO-AT: Outputs (6)
    "Sv Total (CF)", "Ret. Multiplier", "Rv Uncapped (CF)",
    "Max BMP Credit (CF)", "Rv Applied (CF)", "Rv Reservoir (CF)",
    # AU-AV: Checks (2)
    "SA:CDA %", "Sizing Check",
    # AW-BE: Supplemental Bioretention (9)
    "Bio surface elev (ft)", "Bio ponding elev (ft)",
    "15-yr head (ft)", "Min sidewalk elev (ft)",
    "Min curb-cut elev (ft)", "UD invert (ft)",
    "Bottom invert (ft)", "Freeboard (ft)",
    "# obs wells / cleanouts",
    # BF-BZ: Supplemental Swale (21)
    "Swale L_s (ft)", "Swale w_s (ft)", "Side slope (H:V)",
    "Top-bank US (ft)", "Top-bank DS (ft)",
    "Top-grade US (ft)", "Top-grade DS (ft)",
    "Curb-cut US (ft)", "Curb-cut DS (ft)",
    "Sidewalk US (ft)", "Sidewalk DS (ft)",
    "Invert US (ft)", "Invert DS (ft)",
    "UD invert (ft)", "15-yr head (ft)",
    "H_cd (ft)", "X_cd (ft)",
    "# obs wells / cleanouts",
    "Slope S (ft/ft)", "N_cd", "Freeboard (ft)",
    # CA-CC: Swale Method + Sv (3)
    "Swale Method", "Sv DOEE (CF)", "Sv Actual (CF)",
]
assert len(HEADERS) == 81, f"Expected 81 headers, got {len(HEADERS)}"


# ---------------------------------------------------------------------------
# Row 5 INPUT/AUTO tags — 81 entries (same order as HEADERS)
# ---------------------------------------------------------------------------
ROW5_TAGS = [
    # A-E
    "USER", "DROPDOWN", "DROPDOWN", "DROPDOWN", "DROPDOWN",
    # F-M (PP)
    "USER", "USER", "USER", "AUTO + USER OK", "AUTO ← PARAMS", "AUTO", "AUTO", "AUTO",
    # N-AD (Bio/Swale stack)
    "USER", "AUTO ← CDA", "AUTO",
    "USER", "USER", "AUTO ← PARAMS",
    "USER", "USER",
    "DROPDOWN", "USER", "USER",
    "AUTO", "AUTO ← PARAMS", "USER",
    "AUTO + USER OK", "AUTO", "AUTO",
    # AE-AG (Wet Swale)
    "USER", "USER", "AUTO",
    # AH-AN (Trees)
    "USER", "USER", "USER", "USER", "USER", "USER", "AUTO",
    # AO-AT (Outputs)
    "AUTO", "AUTO ← PARAMS", "AUTO", "AUTO ← CDA", "AUTO", "AUTO",
    # AU-AV (Checks)
    "AUTO", "AUTO",
    # AW-BE (Bio Supp)
    "USER", "AUTO", "USER", "USER", "USER", "AUTO", "AUTO", "AUTO", "USER",
    # BF-BZ (Swale Supp)
    "USER", "USER", "USER",
    "USER", "USER", "USER", "USER",
    "USER", "USER", "USER", "USER",
    "USER", "USER",
    "USER", "USER",
    "USER", "USER",
    "USER",
    "AUTO", "AUTO", "AUTO",
    # CA-CC (Swale method + Sv)
    "DROPDOWN", "AUTO", "AUTO",
]
assert len(ROW5_TAGS) == 81, f"Expected 81 tags, got {len(ROW5_TAGS)}"


TAG_FILL = {
    "USER":            "INP",            # yellow
    "AUTO":            "CALC",           # blue
    "AUTO ← CDA":      "CDA_TINT",       # orange
    "AUTO ← PARAMS":   "PARAMS_TINT",    # pale green
    "AUTO + USER OK":  "INP",            # yellow (overridable default)
    "DROPDOWN":        "DROPDOWN_TINT",  # amber
}


def _apply_sub_header_tag(ws, row: int, col: int, tag: str) -> None:
    fill_attr = TAG_FILL[tag]
    cell = ws.cell(row=row, column=col, value=tag)
    cell.fill = styles.fill(getattr(styles, fill_attr))
    cell.font = styles.fnt(bold=True, sz=8)
    cell.alignment = styles.ctr()
    cell.border = styles.bord()


def _apply_zone_dividers(ws, row_first: int, row_last: int) -> None:
    """Apply a medium right border to zone-dividing columns for the given row range."""
    for col in _ZONE_DIVIDER_COLS:
        for row in range(row_first, row_last + 1):
            cell = ws.cell(row=row, column=col)
            cell.border = Border(
                left=cell.border.left,
                top=cell.border.top,
                bottom=cell.border.bottom,
                right=_MEDIUM_RIGHT,
            )


def _ifs_bmp_param(cell_type: str, cell_sub: str, param_col: int) -> str:
    """Emit a 7-arm IFS formula pulling param_col from PARAMS_BMP.

    Each arm checks AND(D{r}="Type", E{r}="SubType") and returns
    INDEX(PARAMS_BMP, row_idx, param_col).  A final TRUE arm returns
    an empty string so blank BMP rows show nothing.

    Wrapped in IFERROR to suppress any residual errors on blank rows.
    """
    # Build a nested IF cascade (not IFS) for compatibility with Excel 2016
    # and earlier, which trigger #NAME? on IFS.
    result = '""'   # innermost fallback — matches old TRUE,"" arm
    for bmp_type, sub_type, idx in reversed(BMP_PARAM_ROWS):
        condition = f'AND({cell_type}="{bmp_type}",{cell_sub}="{sub_type}")'
        value = f"INDEX(PARAMS_BMP,{idx},{param_col})"
        result = f'IF({condition},{value},{result})'
    return f'=IFERROR({result},"")'


def build_bmp_sheet(wb: Workbook, n_rows: int = 50) -> None:
    """Add the BMP sheet to *wb*.

    Layout:
      Row 1: title banner (spans all 81 cols)
      Row 2: legend bar (text-only, single wide cell)
      Row 3: zone banners
      Row 4: column headers (81 cols)
      Row 5: INPUT/AUTO tags
      Rows 6..(5+n_rows): one BMP per row — placeholder inputs for now
                          (formulas populated in Tasks 4-9)
    """
    ws = wb.create_sheet("BMP")
    ws.sheet_view.showGridLines = False

    # Column widths: default 12, wider for first 5 and output label cols
    for i in range(1, 82):
        styles.cw(ws, i, 12)
    styles.cw(ws, 1,  18)   # BMP Name
    styles.cw(ws, 4,  20)   # BMP Type
    styles.cw(ws, 5,  22)   # Sub-Type
    styles.cw(ws, 48, 24)   # Sizing Check (wider for text output)

    # Row 1: title banner (spans all 81 cols)
    styles.hdr(ws, 1, 1,
               "BMP — Best Management Practices (sizing + retention credits)",
               styles.BH, span=81)
    ws.row_dimensions[1].height = 24

    # Row 2: legend bar (text-only, single wide cell)
    legend_text = (
        "LEGEND  —  [■ yellow] USER INPUT   "
        "[■ blue] AUTO-CALC   "
        "[■ orange] AUTO ← CDA   "
        "[■ pale green] AUTO ← PARAMS   "
        "[▼ amber] DROPDOWN"
    )
    styles.lbl(ws, 2, 1, legend_text, styles.WARN, span=81)
    ws.row_dimensions[2].height = 22

    # Row 3: zone banners
    for start, end, text in ZONE_BANNERS:
        styles.hdr(ws, 3, start, text, styles.BS, span=end)
    ws.row_dimensions[3].height = 22

    # Row 4: column headers
    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 4, i, h, styles.BL, white=False)
    ws.row_dimensions[4].height = 42

    # Row 5: INPUT/AUTO tags
    for i, tag in enumerate(ROW5_TAGS, 1):
        _apply_sub_header_tag(ws, 5, i, tag)
    ws.row_dimensions[5].height = 16

    # Data rows 6 to 55
    data_start = 6
    data_end = data_start + n_rows - 1   # 55

    # TODO: formulas populated in subsequent tasks (Tasks 4-9)
    # For now, just place blank input cells so row 6 and 55 have at least
    # one non-None cell for the schema tests to see shape.
    for r in range(data_start, data_end + 1):
        for c in range(1, 82):
            styles.inp(ws, r, c)
        # Placeholder PP Sv formula at col 11 so test_bmp_data_starts_at_row_6 sees it
        styles.calc_c(ws, r, 11, f"=IFERROR(F{r}*G{r}*J{r},0)")

    # Zone dividers on header rows and data rows
    _apply_zone_dividers(ws, 3, data_end)
