"""Build the EISA_TR55 sheet — CN-based compliance (Method A primary)."""
from openpyxl import Workbook

from workbook import styles

SDA_FIRST = 4
SDA_LAST = 53
BMP_FIRST = 4
BMP_LAST = 53

# (label, hsg, land_use_filter, hsg_filter, cn_formula)
# CN formulas:
#   Impervious / BMP rows  → integer 98 (BMP uses INDEX to PARAMS_CN row 2)
#   Natural  HSG A/B/C/D   → INDEX(PARAMS_CN, 3, 2-5)
#   Compacted HSG A/B/C/D  → INDEX(PARAMS_CN, 4, 2-5)
#
# PARAMS_CN layout:
#   row 1 = header; row 2 = BMP (98); row 3 = Natural; row 4 = Compacted
#   col 1 = label;  col 2 = HSG A;    col 3 = HSG B;   col 4 = HSG C; col 5 = HSG D
RUNOFF_ROWS = [
    ("Impervious Vehicular",     "—", "Impervious Vehicular",     None,  98),
    ("Impervious Non-Vehicular", "—", "Impervious Non-Vehicular", None,  98),
    ("BMP",                      "—", "BMP",                      None,  "=INDEX(PARAMS_CN,2,2)"),
    ("Natural (Woods)",          "A", "Natural (Woods)",          "A",   "=INDEX(PARAMS_CN,3,2)"),
    ("Natural (Woods)",          "B", "Natural (Woods)",          "B",   "=INDEX(PARAMS_CN,3,3)"),
    ("Natural (Woods)",          "C", "Natural (Woods)",          "C",   "=INDEX(PARAMS_CN,3,4)"),
    ("Natural (Woods)",          "D", "Natural (Woods)",          "D",   "=INDEX(PARAMS_CN,3,5)"),
    ("Compacted (Open Space)",   "A", "Compacted (Open Space)",   "A",   "=INDEX(PARAMS_CN,4,2)"),
    ("Compacted (Open Space)",   "B", "Compacted (Open Space)",   "B",   "=INDEX(PARAMS_CN,4,3)"),
    ("Compacted (Open Space)",   "C", "Compacted (Open Space)",   "C",   "=INDEX(PARAMS_CN,4,4)"),
    ("Compacted (Open Space)",   "D", "Compacted (Open Space)",   "D",   "=INDEX(PARAMS_CN,4,5)"),
]


def _area_formula(area_col: str, lu: str, hsg_filter: str | None) -> str:
    base = (f"SUMIFS('SDA'!${area_col}${SDA_FIRST}:${area_col}${SDA_LAST},"
            f"'SDA'!$C${SDA_FIRST}:$C${SDA_LAST},\"{lu}\"")
    if hsg_filter:
        base += f",'SDA'!$D${SDA_FIRST}:$D${SDA_LAST},\"{hsg_filter}\""
    return "=" + base + ")"


def _q_formula(cn_cell: str) -> str:
    """TR-55 runoff depth Q given a cell reference containing CN."""
    S = f"(1000/{cn_cell}-10)"
    Ia = f"0.2*{S}"
    return (
        f"=IFERROR(IF(PROJECT_Rainfall>{Ia},"
        f"(PROJECT_Rainfall-{Ia})^2/(PROJECT_Rainfall-{Ia}+{S}),"
        f"0),0)"
    )


def _write_runoff_table(
    ws, start_row: int, title: str, area_col: str
) -> tuple[int, int]:
    """Write one runoff table (pre or post).

    Returns (next_free_row, totals_row).
    """
    styles.hdr(ws, start_row, 1, title, styles.GS, span=6)
    header_row = start_row + 1
    for i, h in enumerate(
        ["Surface", "HSG", "CN", "Area (SF)", "Q (in)", "Vol (CF)"], 1
    ):
        styles.hdr(ws, header_row, i, h, styles.GL, white=False)

    r = header_row + 1
    first_data = r
    for label, hsg, lu, hsg_filter, cn_val in RUNOFF_ROWS:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.lbl(ws, r, 2, hsg, styles.GRY)
        # CN column (C)
        if isinstance(cn_val, int):
            styles.lbl(ws, r, 3, cn_val, styles.GRY, bold=True)
        else:
            styles.calc_c(ws, r, 3, cn_val)
        # Area column (D)
        styles.calc_c(ws, r, 4, _area_formula(area_col, lu, hsg_filter))
        # Q column (E) — references CN in same row, column C
        styles.calc_c(ws, r, 5, _q_formula(f"C{r}"))
        # Vol column (F) = Area × Q / 12
        styles.calc_c(ws, r, 6, f"=IFERROR(D{r}*E{r}/12,0)")
        r += 1

    last_data = r - 1
    styles.hdr(ws, r, 1, "TOTAL", styles.GS, span=5)
    styles.calc_c(ws, r, 6, f"=SUM(F{first_data}:F{last_data})")
    totals_row = r
    r += 2
    return r, totals_row


def build_eisa_tr55(wb: Workbook) -> None:
    """Add the EISA_TR55 sheet to *wb*."""
    ws = wb.create_sheet("EISA_TR55")
    ws.sheet_view.showGridLines = False

    widths = [26, 8, 10, 13, 11, 13]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    # Row 1: title banner
    styles.hdr(
        ws, 1, 1,
        "EISA Section 438 — TR-55 CN Method (Method A primary)",
        styles.GH, span=6,
    )
    ws.row_dimensions[1].height = 24

    # Row 3: Project References section
    r = 3
    styles.hdr(ws, r, 1, "Project References", styles.GS, span=6)
    r += 1
    for label, formula in [
        ("Project Name",      "=PROJECT_Name"),
        ("95th % Storm (in)", "=PROJECT_Rainfall"),
        ("Total LOD (SF)",    "=PROJECT_TotalLOD"),
    ]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.calc_c(ws, r, 2, formula)
        r += 1
    r += 1  # blank spacer

    # Pre-Construction Runoff Table (SDA col E = pre area)
    r, pre_totals_row = _write_runoff_table(
        ws, r, "Pre-Construction Runoff (Method A)", "E"
    )

    # Post-Construction Runoff Table (SDA col G = post area)
    r, post_totals_row = _write_runoff_table(
        ws, r, "Post-Construction Runoff (Method A)", "G"
    )

    # Compliance Check block
    styles.hdr(ws, r, 1, "Compliance Check (Method A)", styles.GH, span=2)
    r += 1

    styles.lbl(ws, r, 1, "Pre-Dev Runoff Volume (CF)", styles.GRY)
    styles.calc_c(ws, r, 2, f"=F{pre_totals_row}")
    pre_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Proposed Runoff Volume (CF)", styles.GRY)
    styles.calc_c(ws, r, 2, f"=F{post_totals_row}")
    prop_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Volume Infiltrated in BMPs (CF)", styles.GRY)
    styles.calc_c(ws, r, 2, f"=SUM('BMP'!$AM${BMP_FIRST}:$AM${BMP_LAST})")
    bmp_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Net Runoff Volume (CF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f"=B{prop_vol_row}-B{bmp_vol_row}")
    net_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Net ≤ Pre-Dev? (Pass/Fail)", styles.GRY, bold=True)
    styles.calc_c(
        ws, r, 2,
        f'=IF(B{net_vol_row}<=B{pre_vol_row},"✓ PASS","✗ FAIL")',
    )
