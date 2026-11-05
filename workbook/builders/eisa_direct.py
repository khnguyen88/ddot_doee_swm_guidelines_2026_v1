"""Build the EISA_DIRECT sheet — Horton direct-determination compliance."""
from openpyxl import Workbook

from workbook import styles

SDA_FIRST = 4
SDA_LAST = 53
# BMP data range shifted to new 81-col schema (data rows 6-55).
BMP_FIRST = 6
BMP_LAST = 55

# (label, hsg, land_use_filter, hsg_filter)
# For "any HSG" rows (impervious/BMP), hsg = "—" and HSG filter is None.
RUNOFF_ROWS = [
    ("Impervious Vehicular",     "—", "Impervious Vehicular",     None),
    ("Impervious Non-Vehicular", "—", "Impervious Non-Vehicular", None),
    ("BMP",                       "—", "BMP",                     None),
    ("Natural (Woods)",           "A", "Natural (Woods)",         "A"),
    ("Natural (Woods)",           "B", "Natural (Woods)",         "B"),
    ("Natural (Woods)",           "C", "Natural (Woods)",         "C"),
    ("Natural (Woods)",           "D", "Natural (Woods)",         "D"),
    ("Compacted (Open Space)",    "A", "Compacted (Open Space)",  "A"),
    ("Compacted (Open Space)",    "B", "Compacted (Open Space)",  "B"),
    ("Compacted (Open Space)",    "C", "Compacted (Open Space)",  "C"),
    ("Compacted (Open Space)",    "D", "Compacted (Open Space)",  "D"),
]


def _area_formula(sheet: str, lu: str, hsg: str | None) -> str:
    base = (f"SUMIFS('{sheet}'!$E${SDA_FIRST}:$E${SDA_LAST},"
            f"'{sheet}'!$C${SDA_FIRST}:$C${SDA_LAST},\"{lu}\"")
    if hsg:
        base += f",'{sheet}'!$D${SDA_FIRST}:$D${SDA_LAST},\"{hsg}\""
    return "=" + base + ")"


def _runoff_depth_formula(lu: str, hsg: str | None, horton_name: str) -> str:
    if lu in ("Impervious Vehicular", "Impervious Non-Vehicular", "BMP"):
        return "=PROJECT_Rainfall_EISA-0.1"
    if hsg == "A":
        return "=0"
    if hsg in ("B", "C"):
        return f"=MAX(0,PROJECT_Rainfall_EISA-0.2-{horton_name})"
    if hsg == "D":
        return "=MAX(0,PROJECT_Rainfall_EISA-0.2)"
    return "=0"


def _write_runoff_table(ws, start_row: int, title: str,
                        sheet: str) -> tuple[int, int]:
    """Write one runoff table (pre or post).

    Returns (next_free_row, totals_row).
    """
    styles.hdr(ws, start_row, 1, title, styles.BS, span=7)
    header_row = start_row + 1
    for i, h in enumerate([
        "Surface", "HSG", "Area (SF)",
        "Runoff HSG B (in)", "Runoff HSG C (in)",
        "Vol HSG B (CF)", "Vol HSG C (CF)",
    ], 1):
        styles.hdr(ws, header_row, i, h, styles.BL, white=False)
    r = header_row + 1
    first_data_row = r
    for label, hsg, lu, hsg_filter in RUNOFF_ROWS:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.lbl(ws, r, 2, hsg, styles.GRY)
        styles.calc_c(ws, r, 3, _area_formula(sheet, lu, hsg_filter))
        styles.calc_c(ws, r, 4, _runoff_depth_formula(lu, hsg_filter, "PARAMS_HortonLossB"))
        styles.calc_c(ws, r, 5, _runoff_depth_formula(lu, hsg_filter, "PARAMS_HortonLossC"))
        styles.calc_c(ws, r, 6, f"=IFERROR(C{r}*D{r}/12,0)")
        styles.calc_c(ws, r, 7, f"=IFERROR(C{r}*E{r}/12,0)")
        r += 1
    last_data_row = r - 1
    styles.hdr(ws, r, 1, "TOTAL", styles.BS, span=5)
    styles.calc_c(ws, r, 6, f"=SUM(F{first_data_row}:F{last_data_row})")
    styles.calc_c(ws, r, 7, f"=SUM(G{first_data_row}:G{last_data_row})")
    totals_row = r
    r += 2
    return r, totals_row


def build_eisa_direct(wb: Workbook) -> None:
    """Add the EISA_DIRECT sheet to *wb*."""
    ws = wb.create_sheet("EISA_DIRECT")
    ws.sheet_view.showGridLines = False

    widths = [26, 8, 12, 15, 15, 15, 15]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    # Row 1: title banner
    styles.hdr(ws, 1, 1,
               "EISA Section 438 — Direct Determination (Horton infiltration)",
               styles.GH, span=7)
    ws.row_dimensions[1].height = 24

    # Row 3: Project References section
    r = 3
    styles.hdr(ws, r, 1, "Project References", styles.GS, span=7)
    r += 1
    for label, formula in [
        ("Project Name",      "=PROJECT_Name"),
        ("95th % Storm (in)", "=PROJECT_Rainfall_EISA"),
        ("Total LOD (SF)",    "=PROJECT_TotalLOD"),
    ]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.calc_c(ws, r, 2, formula)
        r += 1
    r += 1  # blank spacer

    # Horton Parameters section
    styles.hdr(ws, r, 1, "Horton Parameters (from PARAMS)", styles.GS, span=7)
    r += 1
    for row_label, formula_b, formula_c in [
        ("f_max (in/hr)",               "=INDEX(PARAMS_Horton,1,2)", "=INDEX(PARAMS_Horton,1,3)"),
        ("f_min (in/hr)",               "=INDEX(PARAMS_Horton,2,2)", "=INDEX(PARAMS_Horton,2,3)"),
        ("k (1/hr)",                    "=INDEX(PARAMS_Horton,3,2)", "=INDEX(PARAMS_Horton,3,3)"),
        ("Δt (hr)",                     "=INDEX(PARAMS_Horton,4,2)", "=INDEX(PARAMS_Horton,4,3)"),
        ("Horton Infil Loss 24hr (in)", "=PARAMS_HortonLossB",       "=PARAMS_HortonLossC"),
    ]:
        styles.lbl(ws, r, 1, row_label, styles.GRY)
        styles.calc_c(ws, r, 2, formula_b)
        styles.calc_c(ws, r, 3, formula_c)
        r += 1
    r += 1  # blank spacer

    # Pre-Construction Runoff Table (from SDA_Existing)
    r, pre_totals_row = _write_runoff_table(
        ws, r,
        "Pre-Construction Runoff (from SDA_Existing totals)",
        sheet="SDA_Existing",
    )

    # Post-Construction Runoff Table (from SDA_Proposed)
    r, post_totals_row = _write_runoff_table(
        ws, r,
        "Post-Construction Runoff (from SDA_Proposed totals)",
        sheet="SDA_Proposed",
    )

    # Compliance Check block
    styles.hdr(ws, r, 1, "Compliance Check", styles.GH, span=3)
    r += 1
    styles.hdr(ws, r, 1, "Metric", styles.GL, white=False)
    styles.hdr(ws, r, 2, "HSG B", styles.GL, white=False)
    styles.hdr(ws, r, 3, "HSG C", styles.GL, white=False)
    r += 1

    styles.lbl(ws, r, 1, "Pre-Dev Runoff Volume (CF)", styles.GRY)
    styles.calc_c(ws, r, 2, f"=F{pre_totals_row}")
    styles.calc_c(ws, r, 3, f"=G{pre_totals_row}")
    pre_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Proposed Runoff Volume (CF)", styles.GRY)
    styles.calc_c(ws, r, 2, f"=F{post_totals_row}")
    styles.calc_c(ws, r, 3, f"=G{post_totals_row}")
    prop_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Volume Infiltrated in BMPs (CF)", styles.GRY)
    # Underdrain-aware swap: V=Y rows credit AT (Rv Reservoir, gravel below
    # underdrain only); V=N (or blank) rows credit AS (Rv Applied).  EISA 438
    # is infiltration-only, so BMPs with piped underdrains only earn credit
    # for storage below the pipe invert.
    bmp_formula = (
        f"=SUMPRODUCT("
        f"('BMP'!$V${BMP_FIRST}:$V${BMP_LAST}=\"Y\")*'BMP'!$AT${BMP_FIRST}:$AT${BMP_LAST}"
        f"+('BMP'!$V${BMP_FIRST}:$V${BMP_LAST}<>\"Y\")*'BMP'!$AS${BMP_FIRST}:$AS${BMP_LAST}"
        f")"
    )
    styles.calc_c(ws, r, 2, bmp_formula)
    styles.calc_c(ws, r, 3, bmp_formula)
    bmp_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Net Runoff Volume (CF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f"=B{prop_vol_row}-B{bmp_vol_row}")
    styles.calc_c(ws, r, 3, f"=C{prop_vol_row}-C{bmp_vol_row}")
    net_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Net ≤ Pre-Dev? (Pass/Fail)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2,
                  f'=IF(B{net_vol_row}<=B{pre_vol_row},"✓ PASS","✗ FAIL")')
    styles.calc_c(ws, r, 3,
                  f'=IF(C{net_vol_row}<=C{pre_vol_row},"✓ PASS","✗ FAIL")')
