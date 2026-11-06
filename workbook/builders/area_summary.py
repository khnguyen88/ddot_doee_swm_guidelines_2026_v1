"""Build the Area_Summary sheet.

Consolidates SDA and CDA rollups + Area Match checks onto a single sheet so
the input sheets (SDA_Existing / SDA_Proposed / CDA_Existing / CDA_Proposed)
stay pure-input. Row-aligned cross-sheet Area Match formulas are replaced
with VLOOKUP-by-ID so reordering or extending a summary section cannot
silently desynchronize the check.

Layout:
    Row 1       : workbook-wide banner
    Row 3       : SDA section banner (merged A3:L3)
    Row 4       : SDA section column headers
    Rows 5..24  : SDA summary data rows (N_SUMMARY_ROWS = 20)
    Row 26      : CDA section banner (merged A26:F26)
    Row 27      : CDA section column headers
    Rows 28..47 : CDA summary data rows

SDA section columns (A..L):
    A: SDA_ID (placeholder)
    B..D: Pre Imp / Comp / Nat totals Within LOD  (from SDA_Existing)
    E:   Pre Total Within        (= B + C + D)
    F..I: Post Imp / Comp / Nat / BMP totals Within LOD  (from SDA_Proposed)
    J:   Post Total Within       (= F + G + H + I)
    K:   SWRv Required (CF)      (sum of SDA_Proposed col I)
    L:   Area Match? (OK vs. MISMATCH, ±1 SF tolerance)

CDA section columns (A..F):
    A: CDA_ID (placeholder)
    B: SDA_ID (INDEX/MATCH into CDA_Proposed inputs)
    C: Pre Total Within          (from CDA_Existing)
    D: Post Total Within         (from CDA_Proposed)
    E: Max BMP Credit (CF)       (= D × 1.7 / 12  — DOEE 1.7″ cap)
    F: Area Match?               (VLOOKUP-by-ID; D vs. C, ±1 SF tolerance)

Downstream builders (bmp.py, doee.py, correct_mep_summary.py) read from
these sections — they must import the row/column constants from this
module and never hard-code row numbers.
"""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName

from workbook import styles


# ── Section row anchors ──
N_SUMMARY_ROWS = 20

SDA_BANNER_ROW       = 3
SDA_HEADER_ROW       = 4
SDA_FIRST_DATA_ROW   = 5
SDA_LAST_DATA_ROW    = SDA_FIRST_DATA_ROW + N_SUMMARY_ROWS - 1   # 24
SDA_LAST_COL         = 12   # L

# Two blank rows between sections to keep the sheet readable.
CDA_BANNER_ROW       = SDA_LAST_DATA_ROW + 2                     # 26
CDA_HEADER_ROW       = CDA_BANNER_ROW + 1                        # 27
CDA_FIRST_DATA_ROW   = CDA_HEADER_ROW + 1                        # 28
CDA_LAST_DATA_ROW    = CDA_FIRST_DATA_ROW + N_SUMMARY_ROWS - 1   # 47
CDA_LAST_COL         = 6    # F

# ── Input sheet data ranges (must match n_rows=100 default in sda.py/cda.py) ──
INPUT_FIRST_ROW = 4
INPUT_LAST_ROW  = 103


def _sumifs_sda(exist_or_prop: str, land_use: str, r: int, input_sheet: str) -> str:
    """SUMIFS over SDA_Existing/SDA_Proposed col E (Area Within LOD) by SDA_ID + Land Use."""
    return (
        f"SUMIFS('{input_sheet}'!$E${INPUT_FIRST_ROW}:$E${INPUT_LAST_ROW},"
        f"'{input_sheet}'!$A${INPUT_FIRST_ROW}:$A${INPUT_LAST_ROW},A{r},"
        f"'{input_sheet}'!$C${INPUT_FIRST_ROW}:$C${INPUT_LAST_ROW},\"{land_use}\")"
    )


def build_area_summary(wb: Workbook) -> None:
    ws = wb.create_sheet("Area_Summary")
    ws.sheet_view.showGridLines = False

    # Column widths (A..L): generous for stacked SDA section headers, tighter for CDA.
    widths = [12, 12, 12, 12, 14, 12, 12, 12, 12, 14, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "Area_Summary — SDA + CDA rollups and Area Match checks",
               styles.BH, span=SDA_LAST_COL)
    ws.row_dimensions[1].height = 24

    # ── SDA section ──
    styles.hdr(ws, SDA_BANNER_ROW, 1,
               "SDA Summary — Pre vs. Post land cover + SWRv per SDA_ID",
               styles.BH, span=SDA_LAST_COL)
    ws.row_dimensions[SDA_BANNER_ROW].height = 22
    sda_hdrs = [
        "SDA_ID",
        "Pre Imp (SF)", "Pre Comp (SF)", "Pre Nat (SF)",
        "Pre Total Within (SF)",
        "Post Imp (SF)", "Post Comp (SF)", "Post Nat (SF)", "Post BMP (SF)",
        "Post Total Within (SF)",
        "SWRv Required (CF)",
        "Area Match?",
    ]
    for i, h in enumerate(sda_hdrs, 1):
        styles.hdr(ws, SDA_HEADER_ROW, i, h, styles.BS)
    ws.row_dimensions[SDA_HEADER_ROW].height = 36

    for i in range(N_SUMMARY_ROWS):
        r = SDA_FIRST_DATA_ROW + i
        styles.lbl(ws, r, 1, f"SDA-{i+1}", styles.BL, bold=True)

        # Pre: SDA_Existing cols B/C/D
        imp_pre = (
            _sumifs_sda("Pre", "Impervious Vehicular", r, "SDA_Existing")
            + "+" + _sumifs_sda("Pre", "Impervious Non-Vehicular", r, "SDA_Existing")
        )
        styles.calc_c(ws, r, 2, f"={imp_pre}")
        styles.calc_c(ws, r, 3,
            "=" + _sumifs_sda("Pre", "Compacted (Open Space)", r, "SDA_Existing"))
        styles.calc_c(ws, r, 4,
            "=" + _sumifs_sda("Pre", "Natural (Woods)", r, "SDA_Existing"))
        styles.calc_c(ws, r, 5, f"=B{r}+C{r}+D{r}")

        # Post: SDA_Proposed cols F/G/H/I
        imp_post = (
            _sumifs_sda("Post", "Impervious Vehicular", r, "SDA_Proposed")
            + "+" + _sumifs_sda("Post", "Impervious Non-Vehicular", r, "SDA_Proposed")
        )
        styles.calc_c(ws, r, 6, f"={imp_post}")
        styles.calc_c(ws, r, 7,
            "=" + _sumifs_sda("Post", "Compacted (Open Space)", r, "SDA_Proposed"))
        styles.calc_c(ws, r, 8,
            "=" + _sumifs_sda("Post", "Natural (Woods)", r, "SDA_Proposed"))
        styles.calc_c(ws, r, 9,
            "=" + _sumifs_sda("Post", "BMP", r, "SDA_Proposed"))
        styles.calc_c(ws, r, 10, f"=F{r}+G{r}+H{r}+I{r}")

        # SWRv Required (CF) — SUMIFS on SDA_Proposed col I (SWRv Within)
        styles.calc_c(ws, r, 11,
            f"=SUMIFS('SDA_Proposed'!$I${INPUT_FIRST_ROW}:$I${INPUT_LAST_ROW},"
            f"'SDA_Proposed'!$A${INPUT_FIRST_ROW}:$A${INPUT_LAST_ROW},A{r})")

        # Area Match? — Pre vs. Post totals (±1 SF)
        styles.calc_c(ws, r, 12,
            f'=IF(ABS(J{r}-E{r})<=1,"OK","⚠ MISMATCH")')

    # ── CDA section ──
    styles.hdr(ws, CDA_BANNER_ROW, 1,
               "CDA Summary — Max BMP Credit per CDA (DOEE 1.7\" cap)",
               styles.BH, span=CDA_LAST_COL)
    ws.row_dimensions[CDA_BANNER_ROW].height = 22
    cda_hdrs = [
        "CDA_ID", "SDA_ID",
        "Pre Total Within (SF)", "Post Total Within (SF)",
        "Max BMP Credit (CF)", "Area Match?",
    ]
    for i, h in enumerate(cda_hdrs, 1):
        styles.hdr(ws, CDA_HEADER_ROW, i, h, styles.BS)
    ws.row_dimensions[CDA_HEADER_ROW].height = 36

    for i in range(N_SUMMARY_ROWS):
        r = CDA_FIRST_DATA_ROW + i
        styles.lbl(ws, r, 1, f"CDA-{i+1}", styles.BL, bold=True)

        # SDA_ID — INDEX/MATCH into CDA_Proposed inputs (col B = SDA_ID)
        styles.calc_c(ws, r, 2,
            f"=IFERROR(INDEX('CDA_Proposed'!$B${INPUT_FIRST_ROW}:$B${INPUT_LAST_ROW},"
            f"MATCH(A{r},'CDA_Proposed'!$A${INPUT_FIRST_ROW}:$A${INPUT_LAST_ROW},0)),\"\")")

        # Pre Total Within — SUMIFS CDA_Existing col E
        styles.calc_c(ws, r, 3,
            f"=SUMIFS('CDA_Existing'!$E${INPUT_FIRST_ROW}:$E${INPUT_LAST_ROW},"
            f"'CDA_Existing'!$A${INPUT_FIRST_ROW}:$A${INPUT_LAST_ROW},A{r})")

        # Post Total Within — SUMIFS CDA_Proposed col E
        styles.calc_c(ws, r, 4,
            f"=SUMIFS('CDA_Proposed'!$E${INPUT_FIRST_ROW}:$E${INPUT_LAST_ROW},"
            f"'CDA_Proposed'!$A${INPUT_FIRST_ROW}:$A${INPUT_LAST_ROW},A{r})")

        # Max BMP Credit — DOEE 1.7″ hardcoded ceiling
        styles.calc_c(ws, r, 5, f"=D{r}*1.7/12")

        # Area Match? — Pre vs. Post totals (±1 SF); IFERROR→"—" if no match
        styles.calc_c(ws, r, 6,
            f'=IFERROR(IF(ABS(D{r}-C{r})<=1,"OK","⚠ MISMATCH"),"—")')

    # Defined names: point SDA_IDs/CDA_IDs at the new summary sections so
    # dropdowns on BMP sheet and anywhere else keep working.
    _redefine(wb, "SDA_IDs",
              f"'Area_Summary'!$A${SDA_FIRST_DATA_ROW}:$A${SDA_LAST_DATA_ROW}")
    _redefine(wb, "CDA_IDs",
              f"'Area_Summary'!$A${CDA_FIRST_DATA_ROW}:$A${CDA_LAST_DATA_ROW}")

    styles.apply_top_divider(ws, SDA_BANNER_ROW, 1, SDA_LAST_COL)
    styles.apply_bottom_divider(ws, SDA_LAST_DATA_ROW, 1, SDA_LAST_COL)
    styles.apply_top_divider(ws, CDA_BANNER_ROW, 1, CDA_LAST_COL)
    styles.apply_bottom_divider(ws, CDA_LAST_DATA_ROW, 1, CDA_LAST_COL)


def _redefine(wb: Workbook, name: str, attr_text: str) -> None:
    """Replace a defined name if present; add if not. Lets sda.py/cda.py
    create the initial name and this builder update the target."""
    if name in wb.defined_names:
        del wb.defined_names[name]
    wb.defined_names[name] = DefinedName(name, attr_text=attr_text)
