"""Build the MEP_SUMMARY sheet — DDOT MEP Worksheet 90% Phase layout.

One block per SDA (10 blocks), stacked vertically with a spacer row between
them.  Each block has 4 steps mirroring the DDOT 90% Phase MEP worksheet:
  Step 1 — Drainage Area & Regulated Volumes
  Step 2 — Infiltration (user inputs + dropdowns)
  Step 3 — Constraints (user input + dropdown)
  Step 4 — Tree Credits (DDOT 5/20/30/40 CF multipliers) + BMP Placement
"""
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


# SDA summary data rows: with n_rows=50, sum_data_start = 58.
# Row 57 is the summary *header* row; data rows are 58-67.
SDA_SUMMARY_FIRST_ROW = 58

# SDA data rows live at SDA!4..53 (with n_rows=50).
SDA_DATA_FIRST = 4
SDA_DATA_LAST = 53

# BMP data rows live at BMP!4..53 (with n_rows=50).
BMP_DATA_FIRST = 4
BMP_DATA_LAST = 53


def _project_header(ws) -> int:
    """Write project header rows 1-9. Returns next free row."""
    styles.hdr(ws, 1, 1, "MEP SUMMARY — DDOT 90% Phase (auto-populated)",
               styles.BH, span=7)
    rows = [
        ("Project Name",        "=PROJECT_Name"),
        ("Project Number",      "=PROJECT_Number"),
        ("MS4 / CSS",           "=PROJECT_MS4"),
        ("AWDZ?",               "=PROJECT_AWDZ"),
        ("DOEE Plan Review #",  "=PROJECT_DOEEReview"),
        ("Total LOD Area (SF)", "=PROJECT_TotalLOD"),
        ("95th % Storm (in)",   "=PROJECT_Rainfall"),
    ]
    for i, (label, formula) in enumerate(rows):
        r = 2 + i
        styles.lbl(ws, r, 1, label, styles.GRY, bold=True)
        styles.calc_c(ws, r, 2, formula)
    return 2 + len(rows) + 1  # next free row (= 10)


def _write_sda_block(ws, start_row: int, sda_index: int) -> int:
    """Write one SDA block starting at *start_row*. Returns next free row."""
    r = start_row
    sda_summary_row = SDA_SUMMARY_FIRST_ROW + sda_index

    # ── Block header ──────────────────────────────────────────────────────────
    styles.hdr(ws, r, 1, f"SDA-{sda_index + 1}", styles.BH, span=7)
    r += 1

    # ── Step 1 — Drainage Area & Regulated Volumes ───────────────────────────
    styles.hdr(ws, r, 1, "Step 1 — Drainage Area & Regulated Volumes",
               styles.BS, span=7)
    r += 1

    # Drainage Area ID — pulled from SDA summary col A
    styles.lbl(ws, r, 1, "Drainage Area ID", styles.GRY)
    styles.calc_c(ws, r, 2, f"='SDA'!A{sda_summary_row}")
    r += 1

    # Within-LOD areas — SUMIFS on SDA data table Post Within LOD col G
    # grouped by SDA_ID (col A) and land-use type (col C)
    for label, lu_terms in [
        ("Impervious within LOD (SF)",
         ["Impervious Vehicular", "Impervious Non-Vehicular"]),
        ("Compacted within LOD (SF)",
         ["Compacted (Open Space)"]),
        ("Natural within LOD (SF)",
         ["Natural (Woods)"]),
    ]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        terms = []
        for lu in lu_terms:
            terms.append(
                f"SUMIFS('SDA'!$G${SDA_DATA_FIRST}:$G${SDA_DATA_LAST},"
                f"'SDA'!$A${SDA_DATA_FIRST}:$A${SDA_DATA_LAST},'SDA'!A{sda_summary_row},"
                f"'SDA'!$C${SDA_DATA_FIRST}:$C${SDA_DATA_LAST},\"{lu}\")"
            )
        styles.calc_c(ws, r, 2, "=" + "+".join(terms))
        r += 1

    styles.lbl(ws, r, 1, "Total within LOD (SF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f"=SUM(B{r - 3}:B{r - 1})")
    r += 1

    # Outside-LOD areas — SUMIFS on SDA data table Post Outside LOD col H
    for label, lu_terms in [
        ("Impervious outside LOD (SF)",
         ["Impervious Vehicular", "Impervious Non-Vehicular"]),
        ("Compacted outside LOD (SF)",
         ["Compacted (Open Space)"]),
        ("Natural outside LOD (SF)",
         ["Natural (Woods)"]),
    ]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        terms = []
        for lu in lu_terms:
            terms.append(
                f"SUMIFS('SDA'!$H${SDA_DATA_FIRST}:$H${SDA_DATA_LAST},"
                f"'SDA'!$A${SDA_DATA_FIRST}:$A${SDA_DATA_LAST},'SDA'!A{sda_summary_row},"
                f"'SDA'!$C${SDA_DATA_FIRST}:$C${SDA_DATA_LAST},\"{lu}\")"
            )
        styles.calc_c(ws, r, 2, "=" + "+".join(terms))
        r += 1

    styles.lbl(ws, r, 1, "Total outside LOD (SF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f"=SUM(B{r - 3}:B{r - 1})")
    r += 1

    # SWRv Within LOD — pulled from SDA summary col J (Post SWRv Required)
    styles.lbl(ws, r, 1, "SWRv Within LOD (CF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f"='SDA'!J{sda_summary_row}")
    r += 1

    # ── Step 2 — Infiltration ─────────────────────────────────────────────────
    styles.hdr(ws, r, 1, "Step 2 — Infiltration", styles.BS, span=7)
    r += 1

    water_table_row = None
    bedrock_row = None
    for label in ["Hydrologic Soil Group", "Water Table OK?",
                  "Bedrock OK?", "Infiltration Rate (in/hr)"]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.inp(ws, r, 2)
        if label == "Water Table OK?":
            water_table_row = r
        elif label == "Bedrock OK?":
            bedrock_row = r
        r += 1

    # ── Step 3 — Constraints ──────────────────────────────────────────────────
    styles.hdr(ws, r, 1, "Step 3 — Constraints", styles.BS, span=7)
    r += 1
    styles.lbl(ws, r, 1, "Hotspot Concern?", styles.GRY)
    styles.inp(ws, r, 2)
    hotspot_row = r
    r += 1

    # Yes/No dropdowns for Water Table OK?, Bedrock OK?, Hotspot Concern?
    for yn_row in (water_table_row, bedrock_row, hotspot_row):
        dv = DataValidation(type="list", formula1='"Yes,No"',
                            allow_blank=True, showDropDown=False)
        ws.add_data_validation(dv)
        dv.sqref = f"B{yn_row}"

    # ── Step 4 — Tree Credits (DDOT 5/20/30/40 CF multipliers) ───────────────
    styles.hdr(ws, r, 1, "Step 4 — Tree Credits (DDOT)", styles.BS, span=7)
    r += 1

    # BMP tree columns (all referenced as BMP data cols AB-AG):
    #   AB (28) = # Planted Small   → credit 5 CF each
    #   AC (29) = # Planted Large   → credit 20 CF each
    #   AD (30) = # Preserved Small → credit 5 CF each
    #   AE (31) = # Preserved Large → credit 20 CF each
    #   AF (32) = # Preserved Special  → credit 30 CF each
    #   AG (33) = # Preserved Heritage → credit 40 CF each
    for label, planted_col, preserved_col, credit in [
        ("Small Trees (preserved+planted)", "AB", "AD", 5),
        ("Large Trees (preserved+planted)", "AC", "AE", 20),
        ("Special Trees preserved",         None, "AF", 30),
        ("Heritage Trees preserved",        None, "AG", 40),
    ]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        if planted_col:
            formula = (
                f"=({credit})*("
                f"SUMIFS('BMP'!${planted_col}${BMP_DATA_FIRST}:${planted_col}${BMP_DATA_LAST},"
                f"'BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST},'SDA'!A{sda_summary_row})"
                f"+SUMIFS('BMP'!${preserved_col}${BMP_DATA_FIRST}:${preserved_col}${BMP_DATA_LAST},"
                f"'BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST},'SDA'!A{sda_summary_row}))"
            )
        else:
            formula = (
                f"=({credit})*"
                f"SUMIFS('BMP'!${preserved_col}${BMP_DATA_FIRST}:${preserved_col}${BMP_DATA_LAST},"
                f"'BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST},'SDA'!A{sda_summary_row})"
            )
        styles.calc_c(ws, r, 2, formula)
        r += 1

    # ── Step 4 — BMP Placement (up to 5 BMPs per SDA) ────────────────────────
    styles.hdr(ws, r, 1, "Step 4 — BMP Placement", styles.BS, span=7)
    r += 1

    # Column sub-headers for BMP placement table
    for i, h in enumerate(
        ["BMP Name", "BMP Type", "CDA_ID",
         "CDA Within LOD (SF)", "CDA Outside LOD (SF)", "BMP Rv (CF)"],
        1,
    ):
        styles.hdr(ws, r, i, h, styles.BL, white=False)
    r += 1

    # Up to 5 BMP rows per SDA — INDEX/SMALL/IF array formula picks the nth
    # BMP row whose SDA_ID matches this block's SDA.  Excel 365 evaluates
    # these as dynamic arrays natively; legacy Excel needs Ctrl+Shift+Enter.
    # openpyxl writes the formula string as-is; evaluation is deferred to Excel.
    offset = BMP_DATA_FIRST - 1  # = 3; ROW()-offset gives 1-based index within range
    for k in range(5):
        nth = k + 1
        # BMP Name (col A = 1, col F in BMP sheet)
        styles.calc_c(
            ws, r, 1,
            f"=IFERROR(INDEX('BMP'!$A${BMP_DATA_FIRST}:$A${BMP_DATA_LAST},"
            f"SMALL(IF('BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST}='SDA'!A{sda_summary_row},"
            f"ROW('BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST})-{offset}),{nth})),\"\")",
        )
        # BMP Type (col D = 4)
        styles.calc_c(
            ws, r, 2,
            f"=IFERROR(INDEX('BMP'!$D${BMP_DATA_FIRST}:$D${BMP_DATA_LAST},"
            f"SMALL(IF('BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST}='SDA'!A{sda_summary_row},"
            f"ROW('BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST})-{offset}),{nth})),\"\")",
        )
        # CDA_ID (col C = 3)
        styles.calc_c(
            ws, r, 3,
            f"=IFERROR(INDEX('BMP'!$C${BMP_DATA_FIRST}:$C${BMP_DATA_LAST},"
            f"SMALL(IF('BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST}='SDA'!A{sda_summary_row},"
            f"ROW('BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST})-{offset}),{nth})),\"\")",
        )
        # BMP Rv Applied (col AM = 39)
        styles.calc_c(
            ws, r, 6,
            f"=IFERROR(INDEX('BMP'!$AM${BMP_DATA_FIRST}:$AM${BMP_DATA_LAST},"
            f"SMALL(IF('BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST}='SDA'!A{sda_summary_row},"
            f"ROW('BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST})-{offset}),{nth})),\"\")",
        )
        r += 1

    # ── Cumulative Surplus / Deficit ──────────────────────────────────────────
    styles.lbl(ws, r, 1, "Cumulative Surplus / Deficit (CF)", styles.GRY, bold=True)
    styles.calc_c(
        ws, r, 2,
        f"=IFERROR("
        f"SUMIFS('BMP'!$AM${BMP_DATA_FIRST}:$AM${BMP_DATA_LAST},"
        f"'BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST},'SDA'!A{sda_summary_row})"
        f"-'SDA'!J{sda_summary_row},\"\")",
    )
    r += 1

    # Spacer row
    r += 1

    return r


def build_mep_summary(wb: Workbook, n_sdas: int = 10) -> None:
    """Add the MEP_SUMMARY sheet to *wb*.

    Layout:
      Rows 1-9:  project header (named-range pull-throughs)
      Row 10+:   10 SDA blocks, each ~32 rows, separated by a spacer row
    """
    ws = wb.create_sheet("MEP_SUMMARY")
    ws.sheet_view.showGridLines = False

    # Column widths: col 1 (labels) wide, cols 2-7 medium
    for i, w in enumerate([36, 20, 16, 16, 16, 16, 16], 1):
        styles.cw(ws, i, w)

    r = _project_header(ws)
    for i in range(n_sdas):
        r = _write_sda_block(ws, r, i)
