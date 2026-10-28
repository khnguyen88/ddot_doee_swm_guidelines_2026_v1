"""Build the BMP sheet — one row per BMP, all parameter columns, auto outputs."""
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


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

HEADERS = [
    # ID zone (cols 1-5 / A-E)
    "BMP Name", "SDA_ID", "CDA_ID", "BMP Type", "Sub-Type",
    # Permeable Pavement zone (cols 6-13 / F-M)
    "PP Surface Area Aₚ (SF)", "PP Reservoir dₚ (ft)",
    "PP Sump d_sump (ft)", "PP Ksat (ft/day)",
    "PP n_reservoir", "PP Sv (CF)", "PP Drawdown (days)", "PP Drawdown ≤ 2?",
    # Bioretention / Dry Swale zone (cols 14-24 / N-X)
    "Bio SA_top (SF)", "Bio SA_bot (SF)", "Bio SA_avg (SF)",
    "Bio d_media (ft)", "Bio n_media", "Bio d_gravel (ft)", "Bio n_gravel",
    "Bio d_pond (ft)", "Bio Ksat (ft/day)",
    "Bio Sv (CF)", "Bio Drawdown (days)",
    # Wet Swale zone (cols 25-27 / Y-AA)
    "WS Pool Vol (CF)", "WS ED Vol (CF)", "WS Sv (CF)",
    # Tree counts zone (cols 28-34 / AB-AH)
    "# Planted Small", "# Planted Large",
    "# Preserved Small", "# Preserved Large",
    "# Preserved Special", "# Preserved Heritage",
    "Tree Rv Total (CF)",
    # Output zone (cols 35-39 / AI-AM)
    "Sv Total (CF)", "Ret. Multiplier", "Rv Uncapped (CF)",
    "Max BMP Credit (CF)", "Rv Applied (CF)",
]


def _ifs_bmp_param(cell_type: str, cell_sub: str, param_col: int) -> str:
    """Emit a 7-arm IFS formula pulling param_col from PARAMS_BMP.

    Each arm checks AND(D{r}="Type", E{r}="SubType") and returns
    INDEX(PARAMS_BMP, row_idx, param_col).  A final TRUE arm returns
    an empty string so blank BMP rows show nothing.

    Wrapped in IFERROR to suppress any residual errors on blank rows.
    """
    arms = []
    for bmp_type, sub_type, idx in BMP_PARAM_ROWS:
        condition = f'AND({cell_type}="{bmp_type}",{cell_sub}="{sub_type}")'
        value = f"INDEX(PARAMS_BMP,{idx},{param_col})"
        arms.append(f"{condition},{value}")
    # Fallback arm: always-true returns empty string
    arms.append('TRUE,""')
    return '=IFERROR(IFS(' + ",".join(arms) + '),"")'


def build_bmp_sheet(wb: Workbook, n_rows: int = 50) -> None:
    """Add the BMP sheet to *wb*.

    Layout:
      Row 1: title banner (merged A1:AM1)
      Row 2: (blank spacer)
      Row 3: column headers
      Rows 4..(3+n_rows): one BMP per row — input + calculated columns
      Row (data_end+3): SDA Compliance Summary header
      Row (data_end+4): summary column headers
      Rows (data_end+5)..(data_end+14): 10 SDA summary rows
    """
    ws = wb.create_sheet("BMP")
    ws.sheet_view.showGridLines = False

    # Column widths — all 39 columns default to 12; key output cols slightly wider.
    for i in range(1, 40):
        styles.cw(ws, i, 12)
    styles.cw(ws, 1,  18)   # BMP Name
    styles.cw(ws, 4,  20)   # BMP Type
    styles.cw(ws, 5,  22)   # Sub-Type

    # Title banner.
    styles.hdr(ws, 1, 1,
               "BMP — Best Management Practices (sizing + retention credits)",
               styles.BH, span=39)
    ws.row_dimensions[1].height = 24

    # Column headers at row 3.
    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 48

    data_start = 4
    data_end = data_start + n_rows - 1   # = 53 for default n_rows=50

    for r in range(data_start, data_end + 1):

        # ── ID columns A-E (1-5) ── input
        for c in range(1, 6):
            styles.inp(ws, r, c)

        # ── Permeable Pavement zone ──
        # F-I (6-9): surface area, reservoir depth, sump depth, Ksat — input
        for c in range(6, 10):
            styles.inp(ws, r, c)

        # J (10): PP n_reservoir from PARAMS_BMP col 5
        styles.calc_c(ws, r, 10, _ifs_bmp_param(f"D{r}", f"E{r}", 5))

        # K (11): PP Sv (CF) = F × G × J
        styles.calc_c(ws, r, 11, f"=IFERROR(F{r}*G{r}*J{r},0)")

        # L (12): PP Drawdown (days) = G / I
        styles.calc_c(ws, r, 12,
                      f'=IFERROR(IF(I{r}=0,"",G{r}/I{r}),"")')

        # M (13): PP Drawdown ≤ 2 check
        styles.calc_c(ws, r, 13,
                      f'=IFERROR(IF(L{r}="","",IF(L{r}<=2,"✓","✗")),"")')

        # ── Bioretention / Dry Swale zone ──
        # N, O (14, 15): SA_top, SA_bot — input
        styles.inp(ws, r, 14)
        styles.inp(ws, r, 15)

        # P (16): Bio SA_avg = (N + O) / 2
        styles.calc_c(ws, r, 16, f"=IFERROR((N{r}+O{r})/2,0)")

        # Q (17): Bio d_media — input
        styles.inp(ws, r, 17)

        # R (18): Bio n_media from PARAMS_BMP col 3
        styles.calc_c(ws, r, 18, _ifs_bmp_param(f"D{r}", f"E{r}", 3))

        # S (19): Bio d_gravel — input
        styles.inp(ws, r, 19)

        # T (20): Bio n_gravel from PARAMS_BMP col 4
        styles.calc_c(ws, r, 20, _ifs_bmp_param(f"D{r}", f"E{r}", 4))

        # U (21): Bio d_pond — input
        styles.inp(ws, r, 21)

        # V (22): Bio Ksat — input
        styles.inp(ws, r, 22)

        # W (23): Bio Sv (CF) = P × (Q×R + S×T + U)
        styles.calc_c(ws, r, 23,
                      f"=IFERROR(P{r}*(Q{r}*R{r}+S{r}*T{r}+U{r}),0)")

        # X (24): Bio Drawdown (days) = (Q + S) / V
        styles.calc_c(ws, r, 24,
                      f'=IFERROR(IF(V{r}=0,"",(Q{r}+S{r})/V{r}),"")')

        # ── Wet Swale zone ──
        # Y (25): WS Pool Volume — input
        styles.inp(ws, r, 25)
        # Z (26): WS ED Volume — input
        styles.inp(ws, r, 26)
        # AA (27): WS Sv = Y + Z
        styles.calc_c(ws, r, 27, f"=IFERROR(Y{r}+Z{r},0)")

        # ── Tree counts zone ──
        # AB-AG (28-33): 6 tree count columns — input
        for c in range(28, 34):
            styles.inp(ws, r, c)

        # AH (34): Tree Rv Total = Σ count × INDEX(PARAMS_Trees, tree_row, 3)
        # PARAMS_Trees rows 1-6 correspond to the 6 tree types in order.
        tree_formula = (
            f"=IFERROR("
            f"AB{r}*INDEX(PARAMS_Trees,1,3)"
            f"+AC{r}*INDEX(PARAMS_Trees,2,3)"
            f"+AD{r}*INDEX(PARAMS_Trees,3,3)"
            f"+AE{r}*INDEX(PARAMS_Trees,4,3)"
            f"+AF{r}*INDEX(PARAMS_Trees,5,3)"
            f"+AG{r}*INDEX(PARAMS_Trees,6,3)"
            f",0)"
        )
        styles.calc_c(ws, r, 34, tree_formula)

        # ── Output zone ──
        # AI (35): Sv Total = K + W + AA
        styles.calc_c(ws, r, 35, f"=IFERROR(K{r}+W{r}+AA{r},0)")

        # AJ (36): Retention Multiplier from PARAMS_BMP col 6
        styles.calc_c(ws, r, 36, _ifs_bmp_param(f"D{r}", f"E{r}", 6))

        # AK (37): Rv Uncapped = AI × AJ + AH
        styles.calc_c(ws, r, 37, f"=IFERROR(AI{r}*AJ{r}+AH{r},0)")

        # AL (38): Max BMP Credit — VLOOKUP CDA_ID in CDA summary block.
        # CDA summary data rows: with default n_rows=50, rows 58-67 (A:D).
        # We reference the full 10-row data range $A$58:$D$67; col 4 = Max BMP Credit.
        # To be robust across n_rows values we derive the range dynamically, but
        # the CDA named range CDA_IDs already spans $A$sum_data_start:$A$sum_data_end.
        # Simplest reliable formula: VLOOKUP against the CDA_IDs list + offset.
        # However, VLOOKUP on a non-contiguous multi-column range is cleaner as
        # a direct sheet reference.  Since CDA uses n_rows=50 → data rows 58-67:
        styles.calc_c(ws, r, 38,
                      f"=IFERROR(VLOOKUP(C{r},'CDA'!$A$58:$D$67,4,FALSE),0)")

        # AM (39): Rv Applied = MIN(AK, AL); if AL=0 (no CDA) use AK unmodified.
        styles.calc_c(ws, r, 39,
                      f"=IFERROR(IF(AL{r}=0,AK{r},MIN(AK{r},AL{r})),0)")

    # ── Data Validations ──
    # SDA_ID column B — named range SDA_IDs
    dv_sda = DataValidation(type="list", formula1="=SDA_IDs",
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_sda)
    dv_sda.sqref = f"B{data_start}:B{data_end}"

    # CDA_ID column C — named range CDA_IDs
    dv_cda = DataValidation(type="list", formula1="=CDA_IDs",
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_cda)
    dv_cda.sqref = f"C{data_start}:C{data_end}"

    # BMP Type column D — explicit list (6 types)
    dv_type = DataValidation(
        type="list",
        formula1='"' + ",".join(BMP_TYPES) + '"',
        allow_blank=True,
        showDropDown=False,
    )
    ws.add_data_validation(dv_type)
    dv_type.sqref = f"D{data_start}:D{data_end}"

    # ── SDA Compliance Summary ──
    sum_header_row = data_end + 3   # two blank rows below last data row
    styles.hdr(ws, sum_header_row, 1,
               "SDA Compliance Summary — Σ Rv Applied vs. SWRv Required per SDA",
               styles.BH, span=5)

    sum_col_hdrs = [
        "SDA_ID", "SWRv Required (CF)", "Rv Provided (CF)",
        "Surplus / Deficit (CF)", "Status",
    ]
    sum_row = sum_header_row + 1
    for i, h in enumerate(sum_col_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    # 10 summary data rows mirror the SDA summary block.
    # SDA summary data starts at SDA row sum_data_start = (50+3)+2 = 57 for n=50.
    # Column A = SDA_ID label, column J (10) = Post SWRv Required.
    # With n_rows=50: SDA data_end=53, sum_header=56, sum_row=57, sum_data_start=58.
    sda_sum_data_start = (data_start + n_rows - 1) + 3 + 1 + 1  # = data_end+3+2
    for i in range(10):
        r = sum_row + 1 + i
        # Mirror SDA_ID from SDA summary
        styles.calc_c(ws, r, 1, f"='SDA'!A{sda_sum_data_start + i}")
        # SWRv Required from SDA summary col J (10)
        styles.calc_c(ws, r, 2, f"='SDA'!J{sda_sum_data_start + i}")
        # Rv Provided = SUMIFS of AM column, matched by SDA_ID in B column
        styles.calc_c(ws, r, 3,
                      f"=SUMIFS($AM${data_start}:$AM${data_end},"
                      f"$B${data_start}:$B${data_end},A{r})")
        # Surplus / Deficit = Provided − Required
        styles.calc_c(ws, r, 4, f'=IFERROR(C{r}-B{r},"")')
        # Status
        styles.calc_c(ws, r, 5,
                      f'=IFERROR(IF(B{r}=0,"—",IF(D{r}>=0,"✓","✗")),"")')
