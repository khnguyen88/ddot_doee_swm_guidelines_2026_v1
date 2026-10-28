"""Build the CORRECT_MEP_SUMMARY sheet — DDOT MEP Worksheet tabular layout.

Reproduces the DDOT 90%/Final Design Phase MEP Worksheet as a single
wide table (rows 1-45) with:
  Rows 1-5:  Project header
  Row 6:     spacer
  Row 7:     Step header labels (5 steps across columns)
  Row 8:     Step descriptions
  Rows 9-11: Column headers (three-row header: main / sub / units)
  Rows 12-44: 33 DA data rows (all 33 auto-populated from SDA/BMP/CDA)
  Row 45:    DATOTAL SUM row

Auto-populates ALL 33 DA rows (12-44) from upstream sheets using IFERROR
so rows beyond the first 10 SDA summary rows return "" or 0 cleanly.
"""
from openpyxl import Workbook

from workbook import styles

# SDA data table range (with n_rows=50)
SDA_D1 = 4
SDA_DL = 53

# BMP data table range
BMP_D1 = 4
BMP_DL = 53

# CDA data table range
CDA_D1 = 4
CDA_DL = 53

# SDA summary rows (header at 57, data starts at 58)
SDA_SUM1 = 58

# Data rows in CORRECT_MEP_SUMMARY
DATA_FIRST = 12
DATA_LAST = 44
TOTAL_ROW = 45

# All DA rows now auto-populate (IFERROR returns "" / 0 for blank SDA rows)
AUTO_ROWS = DATA_LAST - DATA_FIRST + 1  # = 33


# ---------------------------------------------------------------------------
# Column width map  (col number → width in Excel units)
# ---------------------------------------------------------------------------
_COL_WIDTHS = {
    1: 10.46,   # A
    2: 10.66,   # B
    3: 13.13,   # C
    4: 10.0,    # D
    5: 12.53,   # E
    6: 13.86,   # F
    7: 12.86,   # G
    8: 13.86,   # H
    9: 28.0,    # I  — wider for "Regulated Retention Volume (1.2"):" label
    10: 12.46,  # J
    11: 10.66,  # K
    12: 18.0,   # L  — wider for notes display
    13: 11.33,  # M
    14: 13.46,  # N
    15: 10.0,   # O
    16: 10.33,  # P
    17: 11.80,  # Q
    18: 12.33,  # R
    19: 11.80,  # S
    20: 12.33,  # T
    21: 14.33,  # U
    22: 12.33,  # V
    23: 14.86,  # W
    24: 13.0,   # X
    25: 14.46,  # Y
    26: 13.46,  # Z
    27: 13.86,  # AA
    28: 14.13,  # AB
    29: 13.53,  # AC
    30: 13.86,  # AD
    31: 12.0,   # AE
    32: 11.86,  # AF
    33: 19.13,  # AG
    34: 19.53,  # AH
    35: 17.46,  # AI
    36: 12.66,  # AJ
    37: 12.66,  # AK  (AK not in original map; use same as AJ)
    38: 19.66,  # AL
    39: 16.53,  # AM
    40: 19.33,  # AN
    41: 16.86,  # AO
    42: 9.13,   # AP
}

# Row heights (tuned so wrapped labels fit without clipping)
_ROW_HEIGHTS = {
    1: 24.0,
    2: 22.0,
    3: 36.0,
    4: 36.0,
    5: 22.0,
    6: 9.75,
    7: 28.0,
    8: 102.75,
    9: 42.6,
    10: 48.75,
    11: 32.45,
}
# Rows 12-45 all 16.25
for _r in range(DATA_FIRST, TOTAL_ROW + 1):
    _ROW_HEIGHTS[_r] = 16.25


def _set_dimensions(ws) -> None:
    for col_num, w in _COL_WIDTHS.items():
        styles.cw(ws, col_num, w)
    for row_num, h in _ROW_HEIGHTS.items():
        ws.row_dimensions[row_num].height = h


# ---------------------------------------------------------------------------
# Column-letter helper
# ---------------------------------------------------------------------------
def _cl(n: int) -> str:
    return styles.cl(n)


# ---------------------------------------------------------------------------
# Row 1-5: project header
# ---------------------------------------------------------------------------
def _label(ws, r: int, c: int, text: str, *, bold: bool = True,
           align: str = "left", wrap: bool = True):
    cell = ws.cell(row=r, column=c, value=text)
    cell.font = styles.fnt(bold=bold)
    from openpyxl.styles import Alignment
    cell.alignment = Alignment(horizontal=align, vertical="center", wrap_text=wrap)
    cell.border = styles.bord()
    cell.fill = styles.fill(styles.GRY)
    return cell


def _input_value(ws, r: int, c: int, formula_or_value):
    cell = ws.cell(row=r, column=c, value=formula_or_value)
    cell.font = styles.fnt()
    cell.alignment = styles.ctr()
    cell.border = styles.bord()
    cell.fill = styles.fill(styles.INP)
    return cell


def _calc_value(ws, r: int, c: int, formula, *, bold: bool = False,
                number_format: str | None = None):
    cell = ws.cell(row=r, column=c, value=formula)
    cell.font = styles.fnt(bold=bold)
    cell.alignment = styles.ctr()
    cell.border = styles.bord()
    cell.fill = styles.fill(styles.CALC)
    if number_format:
        cell.number_format = number_format
    return cell


def _write_header_rows(ws) -> None:
    # ---- Row 1: project info labels + input value cells ----
    _label(ws, 1, 2, "Project Name:")
    _input_value(ws, 1, 4, "=PROJECT_Name")
    _label(ws, 1, 8, "Project No:")
    _input_value(ws, 1, 10, "=PROJECT_Number")
    _label(ws, 1, 12, "Check One: MS4 / CSS")
    _input_value(ws, 1, 14, "=PROJECT_MS4")
    _label(ws, 1, 16, "Check if in AWDZ:")
    _input_value(ws, 1, 18, "=PROJECT_AWDZ")
    _label(ws, 1, 19, "DOEE Plan Review No.:")
    _input_value(ws, 1, 20, "=PROJECT_DOEEReview")

    # Cross-reference block (W1-AG1) — mirrors key fields for readability
    ws.cell(row=1, column=23, value="Project Name:")
    ws.cell(row=1, column=25, value='=IF(D1="","",D1)')
    ws.cell(row=1, column=31, value="DOEE Plan Review No.:")
    ws.cell(row=1, column=32, value='=IF(T1="","",T1)')

    # Merges for input value cells
    ws.merge_cells(start_row=1, start_column=4,  end_row=1, end_column=7)   # D1:G1 Project Name
    ws.merge_cells(start_row=1, start_column=9,  end_row=1, end_column=10)  # I1:J1 (not used, keep for layout)
    ws.merge_cells(start_row=1, start_column=20, end_row=1, end_column=21)  # T1:U1 DOEE Review
    ws.merge_cells(start_row=1, start_column=25, end_row=1, end_column=28)  # Y1:AB1 mirror
    ws.merge_cells(start_row=1, start_column=32, end_row=1, end_column=33)  # AF1:AG1 mirror

    # ---- Row 2: subtitle + notes label ----
    sub = ws.cell(row=2, column=2, value="Summary Data: 90%/Final Design Phase")
    sub.font = styles.fnt(bold=True, sz=11)
    sub.alignment = styles.lft()
    ws.merge_cells(start_row=2, start_column=2, end_row=2, end_column=7)
    _label(ws, 2, 12, "Notes:")
    ws.cell(row=2, column=23, value="=B2").font = styles.fnt(bold=True, sz=11)

    # ---- Row 3: Regulated Retention Volume + first long note ----
    _label(ws, 3, 9, 'Regulated Retention Volume (1.2"):', align="right")
    _calc_value(ws, 3, 10, "=J45", bold=True, number_format="#,##0")
    _label(ws, 3, 11, "CF", align="left", bold=False)
    note3 = ws.cell(row=3, column=12,
                    value="Blocks in the worksheet that are not shaded are data entry fields for the designer.")
    note3.font = styles.fnt()
    from openpyxl.styles import Alignment
    note3.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.merge_cells(start_row=3, start_column=12, end_row=3, end_column=22)  # L3:V3
    # Mirror row 3 fields in AE/AF/AG for the right-side block
    ws.cell(row=3, column=31, value="=I3")
    ws.cell(row=3, column=32, value="=J3")
    ws.cell(row=3, column=33, value="=K3")

    # ---- Row 4: Disturbance Area + Volume Retained + second long note ----
    _label(ws, 4, 2, "Disturbance Area (ac.):", align="right")
    _calc_value(ws, 4, 5, "=E45/43560", bold=True, number_format="0.00")
    _label(ws, 4, 9, "Volume Retained:", align="right")
    _calc_value(ws, 4, 10, "=AL45", bold=True, number_format="#,##0")
    _label(ws, 4, 11, "CF", align="left", bold=False)
    note4 = ws.cell(row=4, column=12,
                    value="All shaded blocks are computations internal to the worksheet and should not be edited.")
    note4.font = styles.fnt()
    note4.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.merge_cells(start_row=4, start_column=12, end_row=4, end_column=22)  # L4:V4
    # Mirrors
    ws.cell(row=4, column=23, value="=B4")
    ws.cell(row=4, column=26, value="=E4")
    ws.cell(row=4, column=31, value="=I4")
    ws.cell(row=4, column=32, value="=J4")
    ws.cell(row=4, column=33, value="=K4")

    # ---- Row 5: No. of DAs + Difference ----
    _label(ws, 5, 2, "No. of Drainage Areas:", align="right")
    _calc_value(ws, 5, 5, "=COUNTA(A12:A44)", bold=True, number_format="0")
    _label(ws, 5, 9, "Difference:", align="right")
    _calc_value(ws, 5, 10, "=J4-J3", bold=True, number_format="#,##0")
    _label(ws, 5, 11, "CF", align="left", bold=False)
    # Mirrors
    ws.cell(row=5, column=23, value="=B5")
    ws.cell(row=5, column=26, value="=E5")
    ws.cell(row=5, column=31, value="=I5")
    ws.cell(row=5, column=32, value="=J5")
    ws.cell(row=5, column=33, value="=K5")


# ---------------------------------------------------------------------------
# Row 7: Step headers
# ---------------------------------------------------------------------------
def _write_step_headers(ws) -> None:
    # (start_col, end_col, text)
    steps = [
        (2,  11, "Step 1:  Drainage Area and Regulated Volumes"),    # B7:K7
        (12, 16, "Step 2:  Consider Infiltration"),                   # L7:P7
        (17, 22, "Step 3:  Evaluate Existing Infrastructure Constraints"),  # Q7:V7
        (23, 28, "Step 4:  Identify Land Conversion and BMP Placement Opportunities"),  # W7:AB7
        (29, 39, "Step 5: Size BMPs and Compute Achieved Retention Volumes"),  # AC7:AM7
    ]
    for start_col, end_col, text in steps:
        styles.hdr(ws, 7, start_col, text, styles.BH, span=end_col)


# ---------------------------------------------------------------------------
# Row 8: Step descriptions
# ---------------------------------------------------------------------------
def _write_step_descriptions(ws) -> None:
    desc = [
        (2,  ("Update from 65% based on refined or revised design: \n\n"
              "Number and list each drainage area within the project limits of "
              "disturbance (LOD). Provide the drainage area square footage that "
              "contributes runoff in the LOD and outside the LOD. The SWRv is "
              "calculated for each drainage area. Provide corresponding drainage "
              "area identifications on the SWMP.")),
        (12, ("Record the water table, bedrock concerns, infiltration rate, and "
              "hotspot concerns within the LOD for each drainage area.")),
        (17, ("On the SWMP, depict utility locations and conveyance infrastructure "
              "to confirm/adjust opportunities for land conversions and BMPs. "
              "Delineate areas of potential conflict, and areas without conflict, "
              "including areas where minimum depths for BMPs can not be met.  "
              "Delineate trees (size, species, condition) and tree protection.")),
        (23, ("For land conversion and BMP opportunities already defined at 30%, "
              "and for new opportunities added, provide the areas below.  Land "
              "Conversion and BMP surface areas within the LOD must be reflected "
              "in the SWRv computation; update those columns as necessary. "
              "Additional allowable BMPs such as impervious surface disconnection, "
              "swales, and infiltration should also be considered and described in "
              "the narrative. Describe the reason for eliminated Land "
              "Conversion/BMP locations.")),
        (29, ("Provide the contributing drainage area to the BMP locations. "
              "The ceiling stormwater runoff volume reaching the BMPs is calculated. ")),
        (33, ("Calculate and sum the total maximum possible BMP storage volumes. "
              "Total the number of proposed trees meeting the required soil volume "
              "to be considered for stormwater retention volume.  Total the maximum "
              "retention volume capacity of all facilities and compare to the "
              "required regulated volume. If a deficit exists, review BMP "
              "placements/sizes to determine if additional volume can be captured.")),
    ]
    # Merge spans for each description to match the row 7 Step header blocks:
    #   Step 1: B8:K8   | Step 2: L8:P8  | Step 3: Q8:V8
    #   Step 4: W8:AB8  | Step 5a: AC8:AF8 (contrib DA) | Step 5b: AG8:AM8 (storage)
    merge_ends = {2: 11, 12: 16, 17: 22, 23: 28, 29: 32, 33: 39}
    from openpyxl.styles import Alignment
    centered_wrap = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for col, text in desc:
        c = ws.cell(row=8, column=col, value=text)
        c.alignment = centered_wrap
        ws.merge_cells(start_row=8, start_column=col,
                       end_row=8, end_column=merge_ends[col])


# ---------------------------------------------------------------------------
# Rows 9-11: column headers
# ---------------------------------------------------------------------------
def _write_col_headers(ws) -> None:
    # --- Row 9: main header labels ---
    # A9:A10 merged — "Drainage Area\nID"
    ws.cell(row=9, column=1, value="Drainage Area\nID")
    ws.merge_cells(start_row=9, start_column=1, end_row=10, end_column=1)

    # B9:I9 merged — "Drainage Area "
    ws.cell(row=9, column=2, value="Drainage Area ")
    ws.merge_cells(start_row=9, start_column=2, end_row=9, end_column=9)

    # J9:K9 merged — "SWRv"
    ws.cell(row=9, column=10, value="SWRv")
    ws.merge_cells(start_row=9, start_column=10, end_row=9, end_column=11)

    # L9:L10 merged — " Hydrologic Soil Group"
    ws.cell(row=9, column=12, value=" Hydrologic Soil Group")
    ws.merge_cells(start_row=9, start_column=12, end_row=10, end_column=12)

    # M9:M10 merged — "Water Table OK?"
    ws.cell(row=9, column=13, value="Water Table OK?")
    ws.merge_cells(start_row=9, start_column=13, end_row=10, end_column=13)

    # N9:N10 merged — "Bedrock Elevation OK?"
    ws.cell(row=9, column=14, value="Bedrock Elevation OK?")
    ws.merge_cells(start_row=9, start_column=14, end_row=10, end_column=14)

    # O9:O10 merged — "Infiltration Rate"
    ws.cell(row=9, column=15, value="Infiltration Rate")
    ws.merge_cells(start_row=9, start_column=15, end_row=10, end_column=15)

    # P9:P10 merged — "Hotspot Concern Found?"
    ws.cell(row=9, column=16, value="Hotspot Concern Found?")
    ws.merge_cells(start_row=9, start_column=16, end_row=10, end_column=16)

    # Q9:V10 merged — "Preservation of Small, Large, and/or Special/Heritage Trees..."
    ws.cell(row=9, column=17,
            value="Preservation of Small, Large, and/or Special/Heritage Trees which are in fair or better condition")
    ws.merge_cells(start_row=9, start_column=17, end_row=10, end_column=22)

    # W9:X9 merged — "Land Conversion Area"
    ws.cell(row=9, column=23, value="Land Conversion Area")
    ws.merge_cells(start_row=9, start_column=23, end_row=9, end_column=24)

    # Y9:Z9 merged — "Bioretention Opportunity Areas "
    ws.cell(row=9, column=25, value="Bioretention Opportunity Areas ")
    ws.merge_cells(start_row=9, start_column=25, end_row=9, end_column=26)

    # AA9:AB9 merged — "Permeable Pavement Opportunity Areas"
    ws.cell(row=9, column=27, value="Permeable Pavement Opportunity Areas")
    ws.merge_cells(start_row=9, start_column=27, end_row=9, end_column=28)

    # AC9:AD9 merged — "Total BMP Contributing Drainage Area"
    ws.cell(row=9, column=29, value="Total BMP Contributing Drainage Area")
    ws.merge_cells(start_row=9, start_column=29, end_row=9, end_column=30)

    # AE9:AF9 merged — "1.7 inch (ceiling) stormwater runoff reaching BMPs"
    ws.cell(row=9, column=31, value="1.7 inch (ceiling) stormwater runoff reaching BMPs")
    ws.merge_cells(start_row=9, start_column=31, end_row=9, end_column=32)

    # AG9:AG10 merged — "Max. Storage Volume of Bioretention..."
    ws.cell(row=9, column=33,
            value="Max. Storage Volume of Bioretention Based on Size (Total in DA - See separate sizing computations)")
    ws.merge_cells(start_row=9, start_column=33, end_row=10, end_column=33)

    # AH9:AH10 merged — "Max. Storage Volume of Permeable Pavement..."
    ws.cell(row=9, column=34,
            value="Max. Storage Volume of Permeable Pavement. Based on Size (Total in DA - See separate sizing computations)")
    ws.merge_cells(start_row=9, start_column=34, end_row=10, end_column=34)

    # AI9:AI10 merged — "Max. Other Storage Volume..."
    ws.cell(row=9, column=35,
            value='Max. "Other" Storage Volume - (Total in DA - See separate sizing computations)')
    ws.merge_cells(start_row=9, start_column=35, end_row=10, end_column=35)

    # AJ9:AJ10 merged — "No. of proposed small trees..."
    ws.cell(row=9, column=36, value="No. of proposed small trees meeting soil volume requirement")
    ws.merge_cells(start_row=9, start_column=36, end_row=10, end_column=36)

    # AK9:AK10 merged — "No. of proposed large trees..."
    ws.cell(row=9, column=37, value="No. of proposed large trees meeting soil volume requirement")
    ws.merge_cells(start_row=9, start_column=37, end_row=10, end_column=37)

    # AL9:AL10 merged — "Total Sv Practice..."
    ws.cell(row=9, column=38,
            value="Total Sv Practice -Maximum Retention Volume Achievable (BMPs and Trees)")
    ws.merge_cells(start_row=9, start_column=38, end_row=10, end_column=38)

    # AM9:AM10 merged — "Overage / (Deficit) Volume..."
    ws.cell(row=9, column=39, value="Overage / (Deficit) Volume (as compared to SWRv)")
    ws.merge_cells(start_row=9, start_column=39, end_row=10, end_column=39)

    # AP9:AQ9 merged — "Runoff Coefficient"
    ws.cell(row=9, column=42, value="Runoff Coefficient")
    ws.merge_cells(start_row=9, start_column=42, end_row=9, end_column=43)

    # --- Row 10: sub-headers ---
    sub10 = {
        2:  "Impervious \nwithin LOD",
        3:  "Compacted    within LOD",
        4:  "Natural \nwithin LOD",
        5:  "Total within LOD",
        6:  "Impervious outside LOD",
        7:  "Compacted outside LOD",
        8:  "Natural outside LOD",
        9:  "Total outside LOD",
        10: "Within LOD",
        11: "Outside LOD",
        23: "Within LOD",
        24: "Adjacent to LOD",
        25: "Within LOD",
        26: "Adjacent to LOD",
        27: "Within LOD",
        28: "Adjacent to LOD",
        29: "Within LOD",
        30: "Adjacent to LOD",
        31: "Within LOD",
        32: "Adjacent to LOD",
        42: "Within LOD",
        43: "Outside LOD",
    }
    for col, text in sub10.items():
        ws.cell(row=10, column=col, value=text)

    # --- Row 11: units ---
    units11 = {
        2:  "SF",
        3:  "SF",
        4:  "SF",
        5:  "SF",
        6:  "SF",
        7:  "SF",
        8:  "SF",
        9:  "SF",
        10: "CF",
        11: "CF",
        12: "A, B, C, D, or Urban Land",
        13: "Y/N",
        14: "Y/N",
        15: "in-hr",
        16: "Y/N",
        17: "# of Small Trees",
        18: "Tree Volume Credit (CF)",
        19: "# of Large Trees",
        20: "Tree Volume Credit (CF)",
        21: "# of Special/ Heritage Trees",
        22: "Tree Volume Credit (CF)",
        23: "SF",
        24: "SF",
        25: "SF",
        26: "SF",
        27: "SF",
        28: "SF",
        29: "SF",
        30: "SF",
        31: "CF",
        32: "CF",
        33: "CF",
        34: "CF",
        35: "CF",
        36: "EA",
        37: "EA",
        38: "CF",
        39: "CF",
        42: "(unitless)",
        43: "(unitless)",
    }
    for col, text in units11.items():
        ws.cell(row=11, column=col, value=text)

    # Apply header style to rows 9-11
    for r in (9, 10, 11):
        for cell in ws[r]:
            if cell.value is not None:
                cell.fill = styles.fill(styles.BL)
                cell.font = styles.fnt(bold=True)
                cell.alignment = styles.ctr()
                cell.border = styles.bord()


# ---------------------------------------------------------------------------
# Rows 12-44: DA data rows
# ---------------------------------------------------------------------------
def _write_da_rows(ws) -> None:
    D1, DL = SDA_D1, SDA_DL
    BD1, BDL = BMP_D1, BMP_DL
    CD1, CDL = CDA_D1, CDA_DL

    def _guard(formula_body: str, a_cell: str) -> str:
        """Wrap a formula body with IF(A{r}="","",<body>) so blank-SDA rows stay blank."""
        return f'=IF({a_cell}="","",{formula_body})'

    for i in range(DATA_LAST - DATA_FIRST + 1):
        r = DATA_FIRST + i       # Excel row number
        s = SDA_SUM1 + i         # Matching SDA summary row
        a = f"A{r}"

        # ---- A: SDA_ID — uses direct = compare (NOT IFERROR, since blank refs are not errors) ----
        ws.cell(row=r, column=1, value=f"=IF('SDA'!A{s}=\"\",\"\",'SDA'!A{s})")

        # ---- B/C/D: SDA summary direct references, guarded on A ----
        ws.cell(row=r, column=2, value=_guard(f"'SDA'!F{s}", a))  # B
        ws.cell(row=r, column=3, value=_guard(f"'SDA'!G{s}", a))  # C
        ws.cell(row=r, column=4, value=_guard(f"'SDA'!H{s}", a))  # D

        # ---- User-preserved calculated columns, each guarded on A ----
        ws.cell(row=r, column=5,  value=_guard(f"SUM(B{r}:D{r})", a))  # E
        ws.cell(row=r, column=9,  value=_guard(f"SUM(F{r}:H{r})", a))  # I
        ws.cell(row=r, column=10, value=_guard(f"IF(E{r}=0,0,AP{r}*1.2/12*E{r})", a))  # J
        ws.cell(row=r, column=11, value=_guard(f"IF(I{r}=0,0,AQ{r}*1.2/12*I{r})", a))  # K
        ws.cell(row=r, column=18, value=_guard(f"Q{r}*10", a))  # R
        ws.cell(row=r, column=20, value=_guard(f"S{r}*20", a))  # T
        ws.cell(row=r, column=22, value=_guard(f"U{r}*40", a))  # V
        ws.cell(row=r, column=31, value=_guard(f"IF(AC{r}=0,0,AC{r}*1.7/12*AP{r})", a))  # AE
        ws.cell(row=r, column=32, value=_guard(f"IF(AD{r}=0,0,AD{r}*1.7/12*AQ{r})", a))  # AF
        ws.cell(row=r, column=38, value=_guard(
            f"(IF((AE{r})<(AG{r}+AH{r}+AI{r}),(AE{r}),(AG{r}+AH{r}+AI{r})))"
            f"+AJ{r}*5+AK{r}*10+R{r}+T{r}+V{r}", a))  # AL
        ws.cell(row=r, column=39, value=_guard(f"AL{r}-J{r}", a))  # AM
        ws.cell(row=r, column=42, value=_guard(
            f"IF(E{r}=0,\"\",(B{r}*0.95+C{r}*0.25+D{r}*0)/E{r})", a))  # AP
        ws.cell(row=r, column=43, value=_guard(
            f"IF(I{r}=0,\"\",(F{r}*0.95+G{r}*0.25+H{r}*0)/I{r})", a))  # AQ

        # ---- SUMIFS autopop columns, each guarded on A ----
        # F — Post Imp outside LOD
        ws.cell(row=r, column=6, value=_guard(
            f"SUMIFS('SDA'!$H${D1}:$H${DL},'SDA'!$A${D1}:$A${DL},{a},'SDA'!$C${D1}:$C${DL},\"Impervious Vehicular\")"
            f"+SUMIFS('SDA'!$H${D1}:$H${DL},'SDA'!$A${D1}:$A${DL},{a},'SDA'!$C${D1}:$C${DL},\"Impervious Non-Vehicular\")",
            a))

        # G — Post Comp outside LOD
        ws.cell(row=r, column=7, value=_guard(
            f"SUMIFS('SDA'!$H${D1}:$H${DL},'SDA'!$A${D1}:$A${DL},{a},'SDA'!$C${D1}:$C${DL},\"Compacted (Open Space)\")",
            a))

        # H — Post Nat outside LOD
        ws.cell(row=r, column=8, value=_guard(
            f"SUMIFS('SDA'!$H${D1}:$H${DL},'SDA'!$A${D1}:$A${DL},{a},'SDA'!$C${D1}:$C${DL},\"Natural (Woods)\")",
            a))

        # L — Conservative-dominant HSG (D > C > B > A). Nested IF (not IFS)
        # for compatibility with Excel 2016 and earlier.
        def _sum_by_hsg(hsg: str) -> str:
            return (f"SUMIFS('SDA'!$G${D1}:$G${DL},"
                    f"'SDA'!$A${D1}:$A${DL},{a},"
                    f"'SDA'!$D${D1}:$D${DL},\"{hsg}\")")
        ws.cell(row=r, column=12, value=_guard(
            f'IF({_sum_by_hsg("D")}>0,"D",'
            f'IF({_sum_by_hsg("C")}>0,"C",'
            f'IF({_sum_by_hsg("B")}>0,"B",'
            f'IF({_sum_by_hsg("A")}>0,"A",""))))',
            a))

        # O — Infiltration rate derived from HSG. Nested IF (not IFS) for
        # compatibility with Excel versions older than 2019 — IFS triggers
        # #NAME? on Excel 2016 and earlier.
        ws.cell(row=r, column=15, value=_guard(
            f"IF(L{r}=\"A\",2.5,"
            f"IF(L{r}=\"B\",0.3,"
            f"IF(L{r}=\"C\",0.1,"
            f"IF(L{r}=\"D\",0.05,\"\"))))", a))

        # Q — # Preserved Small
        ws.cell(row=r, column=17, value=_guard(
            f"SUMIFS('BMP'!$AD${BD1}:$AD${BDL},'BMP'!$B${BD1}:$B${BDL},{a})", a))

        # S — # Preserved Large
        ws.cell(row=r, column=19, value=_guard(
            f"SUMIFS('BMP'!$AE${BD1}:$AE${BDL},'BMP'!$B${BD1}:$B${BDL},{a})", a))

        # U — # Preserved Special + Heritage (combined per DDOT MEP)
        ws.cell(row=r, column=21, value=_guard(
            f"SUMIFS('BMP'!$AF${BD1}:$AF${BDL},'BMP'!$B${BD1}:$B${BDL},{a})"
            f"+SUMIFS('BMP'!$AG${BD1}:$AG${BDL},'BMP'!$B${BD1}:$B${BDL},{a})", a))

        # Y — Bioretention opp area within LOD (BMP SA_top for Bio + Dry Swale)
        ws.cell(row=r, column=25, value=_guard(
            f"SUMIFS('BMP'!$N${BD1}:$N${BDL},'BMP'!$B${BD1}:$B${BDL},{a},'BMP'!$D${BD1}:$D${BDL},\"Bioretention\")"
            f"+SUMIFS('BMP'!$N${BD1}:$N${BDL},'BMP'!$B${BD1}:$B${BDL},{a},'BMP'!$D${BD1}:$D${BDL},\"Dry Swale\")",
            a))

        # AA — PP opp area within LOD
        ws.cell(row=r, column=27, value=_guard(
            f"SUMIFS('BMP'!$F${BD1}:$F${BDL},'BMP'!$B${BD1}:$B${BDL},{a},'BMP'!$D${BD1}:$D${BDL},\"Permeable Pavement\")",
            a))

        # AC — Total BMP CDA within LOD
        ws.cell(row=r, column=29, value=_guard(
            f"SUMIFS('CDA'!$E${CD1}:$E${CDL},'CDA'!$B${CD1}:$B${CDL},{a})", a))

        # AD — Total BMP CDA outside LOD
        ws.cell(row=r, column=30, value=_guard(
            f"SUMIFS('CDA'!$F${CD1}:$F${CDL},'CDA'!$B${CD1}:$B${CDL},{a})", a))

        # AG — Max Bioretention Sv (Bio + Dry Swale)
        ws.cell(row=r, column=33, value=_guard(
            f"SUMIFS('BMP'!$W${BD1}:$W${BDL},'BMP'!$B${BD1}:$B${BDL},{a},'BMP'!$D${BD1}:$D${BDL},\"Bioretention\")"
            f"+SUMIFS('BMP'!$W${BD1}:$W${BDL},'BMP'!$B${BD1}:$B${BDL},{a},'BMP'!$D${BD1}:$D${BDL},\"Dry Swale\")",
            a))

        # AH — Max PP Sv
        ws.cell(row=r, column=34, value=_guard(
            f"SUMIFS('BMP'!$K${BD1}:$K${BDL},'BMP'!$B${BD1}:$B${BDL},{a},'BMP'!$D${BD1}:$D${BDL},\"Permeable Pavement\")",
            a))

        # AI — Max Other Sv (Wet Swale)
        ws.cell(row=r, column=35, value=_guard(
            f"SUMIFS('BMP'!$AA${BD1}:$AA${BDL},'BMP'!$B${BD1}:$B${BDL},{a},'BMP'!$D${BD1}:$D${BDL},\"Wet Swale\")",
            a))

        # AJ — # Planted Small
        ws.cell(row=r, column=36, value=_guard(
            f"SUMIFS('BMP'!$AB${BD1}:$AB${BDL},'BMP'!$B${BD1}:$B${BDL},{a})", a))

        # AK — # Planted Large
        ws.cell(row=r, column=37, value=_guard(
            f"SUMIFS('BMP'!$AC${BD1}:$AC${BDL},'BMP'!$B${BD1}:$B${BDL},{a})", a))

        # Apply calc style to all formula cells; leave blank input cells unstyled
        _style_da_row(ws, r, is_auto=True)


def _style_da_row(ws, r: int, is_auto: bool) -> None:
    """Apply calc_c style to computed cols and inp style to input cols."""
    # Columns that always have formulas (user-preserved calculated)
    calc_cols = {5, 9, 10, 11, 18, 20, 22, 31, 32, 38, 39, 42, 43}

    # Columns auto-populated for the first 10 rows
    auto_cols = {1, 2, 3, 4, 6, 7, 8, 12, 15, 17, 19, 21, 25, 27, 29, 30, 33, 34, 35, 36, 37}

    # Input columns (always blank, user entry)
    inp_cols = {13, 14, 16, 23, 24, 26, 28}

    for col in calc_cols:
        cell = ws.cell(row=r, column=col)
        if cell.value is not None:
            cell.fill = styles.fill(styles.CALC)
            cell.font = styles.fnt()
            cell.alignment = styles.ctr()
            cell.border = styles.bord()

    if is_auto:
        for col in auto_cols:
            cell = ws.cell(row=r, column=col)
            if cell.value is not None:
                cell.fill = styles.fill(styles.CALC)
                cell.font = styles.fnt()
                cell.alignment = styles.ctr()
                cell.border = styles.bord()

    for col in inp_cols:
        cell = ws.cell(row=r, column=col)
        cell.fill = styles.fill(styles.INP)
        cell.font = styles.fnt()
        cell.alignment = styles.ctr()
        cell.border = styles.bord()


# ---------------------------------------------------------------------------
# Row 45: DATOTAL
# ---------------------------------------------------------------------------
def _write_total_row(ws) -> None:
    ws.cell(row=TOTAL_ROW, column=4, value="DATOTAL")
    sum_cols = {
        5:  f"=SUM(E{DATA_FIRST}:E{DATA_LAST})",   # E45
        9:  f"=SUM(I{DATA_FIRST}:I{DATA_LAST})",   # I45
        10: f"=SUM(J{DATA_FIRST}:J{DATA_LAST})",   # J45
        11: f"=SUM(K{DATA_FIRST}:K{DATA_LAST})",   # K45
        17: f"=SUM(Q{DATA_FIRST}:Q{DATA_LAST})",   # Q45
        18: f"=SUM(R{DATA_FIRST}:R{DATA_LAST})",   # R45
        19: f"=SUM(S{DATA_FIRST}:S{DATA_LAST})",   # S45
        20: f"=SUM(T{DATA_FIRST}:T{DATA_LAST})",   # T45
        21: f"=SUM(U{DATA_FIRST}:U{DATA_LAST})",   # U45
        22: f"=SUM(V{DATA_FIRST}:V{DATA_LAST})",   # V45
        38: f"=SUM(AL{DATA_FIRST}:AL{DATA_LAST})", # AL45
        39: f"=SUM(AM{DATA_FIRST}:AM{DATA_LAST})", # AM45
    }
    for col, formula in sum_cols.items():
        cell = ws.cell(row=TOTAL_ROW, column=col, value=formula)
        cell.fill = styles.fill(styles.CALC)
        cell.font = styles.fnt(bold=True)
        cell.alignment = styles.ctr()
        cell.border = styles.bord()

    # Style the label
    lbl = ws.cell(row=TOTAL_ROW, column=4)
    lbl.fill = styles.fill(styles.GRY)
    lbl.font = styles.fnt(bold=True)
    lbl.alignment = styles.lft()
    lbl.border = styles.bord()


# ---------------------------------------------------------------------------
# Public builder
# ---------------------------------------------------------------------------
def build_correct_mep_summary(wb: Workbook) -> None:
    """Add the CORRECT_MEP_SUMMARY sheet to *wb*.

    Reproduces the DDOT 90%/Final Design Phase MEP Worksheet tabular layout
    (rows 1-45) and auto-populates the first 10 DA rows from SDA, BMP, and
    CDA upstream sheets.
    """
    ws = wb.create_sheet("CORRECT_MEP_SUMMARY")
    ws.sheet_view.showGridLines = False

    _set_dimensions(ws)
    _write_header_rows(ws)
    _write_step_headers(ws)
    _write_step_descriptions(ws)
    _write_col_headers(ws)
    _write_da_rows(ws)
    _write_total_row(ws)
    _apply_step_zone_dividers(ws)


def _apply_step_zone_dividers(ws) -> None:
    """Medium right borders at the end-column of each Step block.

    Steps map to columns:
      Step 1 → B-K   (end col 11)
      Step 2 → L-P   (end col 16)
      Step 3 → Q-V   (end col 22)
      Step 4 → W-AB  (end col 28)
      Step 5 → AC-AM (end col 39)

    Dividers are drawn on the header rows (7-11), data rows (12-44), and total
    row (45). Row banding and other styles are preserved — only the right side
    of the border is modified.
    """
    end_cols = (11, 16, 22, 28, 39)
    for col in end_cols:
        styles.apply_right_divider(ws, col, 7, TOTAL_ROW)
