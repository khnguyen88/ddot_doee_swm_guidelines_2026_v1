"""Build the four DOEE Compliance Calc mirror sheets.

One module, four builder functions — mirrors the DOEE Compliance Calc
workbook layout so a DOEE reviewer can compare side-by-side.

Sheet order:
  1. DOEE_SDA        — Sheet 1: SDA land cover + SWRv
  2. DOEE_BMP_DATA   — Sheet 2: BMP + CDA land cover
  3. DOEE_DETENTION  — Sheet 3: 2-yr / 15-yr CN detention check
  4. DOEE_COMPLIANCE — Final Pass/Fail summary

All rows are auto-populated via SUMIFS and cross-sheet references.
No user input on any of these sheets.
"""
import openpyxl
from openpyxl import Workbook

from workbook import styles

# Data range constants matching the defaults in sda.py / cda.py / bmp.py.
# BMP range shifted to 6-55 per the new 81-col BMP schema.
# SDA/CDA input ranges bumped to 4..103 (DEFAULT_N_ROWS=100 in sda.py).
SDA_FIRST = 4
SDA_LAST = 103
BMP_FIRST = 6
BMP_LAST = 55

# Area_Summary section anchors (mirrors workbook.builders.area_summary).
from workbook.builders import area_summary as _as
AREA_SHEET          = "Area_Summary"
AREA_SDA_FIRST      = _as.SDA_FIRST_DATA_ROW   # 5
AREA_SDA_LAST       = _as.SDA_LAST_DATA_ROW    # 24
AREA_CDA_FIRST      = _as.CDA_FIRST_DATA_ROW   # 28
AREA_CDA_LAST       = _as.CDA_LAST_DATA_ROW    # 47


# ── 2020 DOEE detention helpers ──
#
# SCS runoff eq:   Q = (P - 0.2S)² / (P + 0.8S)
# Closed-form inverse (positive root, used for adjusted CN after BMP storage):
#   S_adj = 5·(P + 2Q − √(Q·(4Q + 5P)))
#   CN_adj = 1000 / (S_adj + 10)


def _scs_runoff_formula(p_expr: str, s_expr: str) -> str:
    """Return Excel formula body for SCS runoff Q(P,S)."""
    return (f"IF({p_expr}>0.2*{s_expr},"
            f"({p_expr}-0.2*{s_expr})^2/({p_expr}+0.8*{s_expr}),0)")


def _adjusted_cn_formula(q_expr: str, p_expr: str) -> str:
    """Return Excel formula body for CN back-computed from adjusted runoff Q.

    S_adj = 5·(P + 2Q − √(Q·(4Q + 5P)))
    CN_adj = 1000 / (S_adj + 10)
    Returns 0 when Q=0 (sufficient storage — no runoff, no CN needed).
    """
    s_adj = f"5*({p_expr}+2*{q_expr}-SQRT({q_expr}*(4*{q_expr}+5*{p_expr})))"
    return f"IF({q_expr}<=0,0,1000/({s_adj}+10))"

# Summary now lives on Area_Summary. Keep legacy names pointing to the
# Area_Summary rows so DOEE_SDA and DOEE_DETENTION_BMP iterate correctly.
SDA_SUMMARY_FIRST = AREA_SDA_FIRST   # row of SDA-1 on Area_Summary

# CDA data table range (used by DOEE_DETENTION_BMP SUMIFS).
CDA_FIRST = 4
CDA_LAST = 103
CDA_SUMMARY_FIRST = AREA_CDA_FIRST   # row of CDA-1 on Area_Summary

DETENTION_USER_NOTE = (
    "Note: Pre/Post CN composites and runoff depths use land cover "
    "Within LOD per DOEE compliance convention. Physical catchment runoff "
    "may also include flow from Outside LOD or existing PROW; project-specific "
    "exceptions apply. For projects where Outside-LOD contribution is material "
    "(offsite inflow, retrofit along existing ROW, etc.), consult the project's "
    "drainage study and adjust detention sizing accordingly."
)


def _area_sumifs(area_col: str, sda_cell: str, lu: str, sheet: str = "SDA_Proposed") -> str:
    """Return a SUMIFS fragment aggregating area_col from the given SDA sheet by SDA_ID and Land Use."""
    return (
        f"SUMIFS('{sheet}'!${area_col}${SDA_FIRST}:${area_col}${SDA_LAST},"
        f"'{sheet}'!$A${SDA_FIRST}:$A${SDA_LAST},{sda_cell},"
        f"'{sheet}'!$C${SDA_FIRST}:$C${SDA_LAST},\"{lu}\")"
    )


def build_doee_sda(wb: Workbook) -> None:
    """Add DOEE_SDA — Compliance Calc Sheet 1 mirror (one row per SDA).

    Columns A-M:
      A  SDA Number
      B  In PROW? (from SDA summary row via lookup)
      C  Pre Natural (SF)    — SUMIFS col E, Land Use = "Natural (Woods)"
      D  Pre Compacted (SF)  — SUMIFS col E, Land Use = "Compacted (Open Space)"
      E  Pre Impervious (SF) — SUMIFS col E, Vehicular + Non-Vehicular
      F  Pre BMP (SF)        — SUMIFS col E, Land Use = "BMP"
      G  Post Natural (SF)
      H  Post Compacted (SF)
      I  Post Impervious (SF)
      J  Post BMP (SF)
      K  Post Vehicular (SF) — subset of Impervious
      L  SWRv Required (CF)  — pulled from SDA summary col J
      M  WQTv Required?      — "Yes" if Post Vehicular > 0
    """
    ws = wb.create_sheet("DOEE_SDA")
    ws.sheet_view.showGridLines = False

    widths = [12, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 15, 10]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "DOEE_SDA — Compliance Calc Sheet 1 mirror",
               styles.BH, span=13)
    ws.row_dimensions[1].height = 24

    headers = [
        "SDA Number", "In PROW?",
        "Pre Nat (SF)", "Pre Comp (SF)", "Pre Imp (SF)", "Pre BMP (SF)",
        "Post Nat (SF)", "Post Comp (SF)", "Post Imp (SF)", "Post BMP (SF)",
        "Post Veh (SF)", "SWRv Required (CF)", "WQTv Req'd?",
    ]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    for i in range(10):
        r = 4 + i
        sda_summary_row = SDA_SUMMARY_FIRST + i
        sda_cell = f"'{AREA_SHEET}'!A{sda_summary_row}"

        # Col A: SDA Number (label from Area_Summary SDA section)
        styles.calc_c(ws, r, 1, f"={sda_cell}")

        # Col B: In PROW? — first "Yes/No" value in SDA_Proposed data rows for this SDA
        styles.calc_c(ws, r, 2,
                      f"=IFERROR(INDEX('SDA_Proposed'!$B${SDA_FIRST}:$B${SDA_LAST},"
                      f"MATCH(A{r},'SDA_Proposed'!$A${SDA_FIRST}:$A${SDA_LAST},0)),\"\")")

        # Cols C-F: Pre land cover from SDA_Existing (col E = Area Within LOD SF)
        styles.calc_c(ws, r, 3,
                      "=" + _area_sumifs("E", f"A{r}", "Natural (Woods)", "SDA_Existing"))
        styles.calc_c(ws, r, 4,
                      "=" + _area_sumifs("E", f"A{r}", "Compacted (Open Space)", "SDA_Existing"))
        styles.calc_c(ws, r, 5,
                      "=" + _area_sumifs("E", f"A{r}", "Impervious Vehicular", "SDA_Existing")
                      + "+" + _area_sumifs("E", f"A{r}", "Impervious Non-Vehicular", "SDA_Existing"))
        styles.calc_c(ws, r, 6,
                      "=" + _area_sumifs("E", f"A{r}", "BMP", "SDA_Existing"))

        # Cols G-J: Post land cover from SDA_Proposed (col E = Area Within LOD SF)
        styles.calc_c(ws, r, 7,
                      "=" + _area_sumifs("E", f"A{r}", "Natural (Woods)"))
        styles.calc_c(ws, r, 8,
                      "=" + _area_sumifs("E", f"A{r}", "Compacted (Open Space)"))
        styles.calc_c(ws, r, 9,
                      "=" + _area_sumifs("E", f"A{r}", "Impervious Vehicular")
                      + "+" + _area_sumifs("E", f"A{r}", "Impervious Non-Vehicular"))
        styles.calc_c(ws, r, 10,
                      "=" + _area_sumifs("E", f"A{r}", "BMP"))

        # Col K: Post Vehicular only
        styles.calc_c(ws, r, 11,
                      "=" + _area_sumifs("E", f"A{r}", "Impervious Vehicular"))

        # Col L: SWRv Required (CF) — from Area_Summary SDA section col K (11)
        styles.calc_c(ws, r, 12, f"='{AREA_SHEET}'!K{sda_summary_row}")

        # Col M: WQTv flag
        styles.calc_c(ws, r, 13, f'=IF(K{r}>0,"Yes","No")')


def build_doee_bmp_data(wb: Workbook) -> None:
    """Add DOEE_BMP_DATA — Compliance Calc Sheet 2 mirror (one row per BMP).

    Columns A-K:
      A  BMP ID (sequential label)
      B  SDA Number  (from BMP col B)
      C  BMP # within SDA (COUNTIF of SDA matches up to this row)
      D  BMP Name    (from BMP col A)
      E  BMP Group / Sub-Type (D & " / " & E from BMP)
      F  CDA Natural (SF)
      G  CDA Compacted (SF)
      H  CDA Impervious (SF)
      I  CDA BMP (SF)
      J  Sv (CF)     — BMP col AO (41) in new 81-col schema
      K  Rv Applied (CF) — BMP col AS (45) in new 81-col schema
    """
    ws = wb.create_sheet("DOEE_BMP_DATA")
    ws.sheet_view.showGridLines = False

    widths = [10, 12, 10, 20, 20, 12, 12, 12, 12, 12, 12]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "DOEE_BMP_DATA — Compliance Calc Sheet 2 mirror",
               styles.BH, span=11)
    ws.row_dimensions[1].height = 24

    headers = [
        "BMP ID", "SDA Number", "BMP # in SDA", "BMP Name",
        "BMP Group / Sub-Type",
        "CDA Nat (SF)", "CDA Comp (SF)", "CDA Imp (SF)", "CDA BMP (SF)",
        "Sv (CF)", "Rv Applied (CF)",
    ]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    for i in range(BMP_LAST - BMP_FIRST + 1):
        r = 4 + i
        src = BMP_FIRST + i          # corresponding row in BMP sheet

        # Col A: BMP ID label — blank if BMP Name is empty
        styles.calc_c(ws, r, 1,
                      f'=IF(\'BMP\'!A{src}="","","BMP-"&TEXT(ROW()-3,"0"))')

        # Col B: SDA Number from BMP col B
        styles.calc_c(ws, r, 2, f"='BMP'!B{src}")

        # Col C: BMP number within SDA (how many times this SDA appears up to here)
        styles.calc_c(ws, r, 3,
                      f"=IFERROR(COUNTIF('BMP'!$B${BMP_FIRST}:$B${src},'BMP'!B{src}),\"\")")

        # Col D: BMP Name
        styles.calc_c(ws, r, 4, f"='BMP'!A{src}")

        # Col E: Type / Sub-Type concatenated
        styles.calc_c(ws, r, 5,
                      f'=IFERROR(\'BMP\'!D{src}&" / "&\'BMP\'!E{src},"")')

        # CDA land cover — SUMIFS from CDA_Proposed sheet by CDA_ID (BMP col C) + Land Use
        # col E = Area Within LOD (SF) on CDA_Proposed (post data)
        cda_cell = f"'BMP'!C{src}"
        styles.calc_c(ws, r, 6,
                      f"=SUMIFS('CDA_Proposed'!$E${CDA_FIRST}:$E${CDA_LAST},"
                      f"'CDA_Proposed'!$A${CDA_FIRST}:$A${CDA_LAST},{cda_cell},"
                      f"'CDA_Proposed'!$C${CDA_FIRST}:$C${CDA_LAST},\"Natural (Woods)\")")
        styles.calc_c(ws, r, 7,
                      f"=SUMIFS('CDA_Proposed'!$E${CDA_FIRST}:$E${CDA_LAST},"
                      f"'CDA_Proposed'!$A${CDA_FIRST}:$A${CDA_LAST},{cda_cell},"
                      f"'CDA_Proposed'!$C${CDA_FIRST}:$C${CDA_LAST},\"Compacted (Open Space)\")")
        styles.calc_c(ws, r, 8,
                      f"=SUMIFS('CDA_Proposed'!$E${CDA_FIRST}:$E${CDA_LAST},"
                      f"'CDA_Proposed'!$A${CDA_FIRST}:$A${CDA_LAST},{cda_cell},"
                      f"'CDA_Proposed'!$C${CDA_FIRST}:$C${CDA_LAST},\"Impervious Vehicular\")"
                      f"+SUMIFS('CDA_Proposed'!$E${CDA_FIRST}:$E${CDA_LAST},"
                      f"'CDA_Proposed'!$A${CDA_FIRST}:$A${CDA_LAST},{cda_cell},"
                      f"'CDA_Proposed'!$C${CDA_FIRST}:$C${CDA_LAST},\"Impervious Non-Vehicular\")")
        styles.calc_c(ws, r, 9,
                      f"=SUMIFS('CDA_Proposed'!$E${CDA_FIRST}:$E${CDA_LAST},"
                      f"'CDA_Proposed'!$A${CDA_FIRST}:$A${CDA_LAST},{cda_cell},"
                      f"'CDA_Proposed'!$C${CDA_FIRST}:$C${CDA_LAST},\"BMP\")")

        # Col J: Sv Total — BMP col AO (41) in new 81-col schema.
        styles.calc_c(ws, r, 10, f"='BMP'!AO{src}")

        # Col K: Rv Applied — BMP col AS (45) in new 81-col schema.
        styles.calc_c(ws, r, 11, f"='BMP'!AS{src}")


def build_doee_detention(wb: Workbook) -> None:
    """Add DOEE_DETENTION — 2020 Compliance Calc methodology, one row per SDA.

    Columns A-V (22 cols):
      A  SDA Number
      B  Pre CN (composite)
      C  Post CN (no BMP) (composite)
      D  DA total (SF)
      E  BMP Sv total (CF)
      F  2-yr rain (in)
      G  2-yr Pre Q (in)
      H  2-yr Post Q no BMP (in)
      I  2-yr Adj Q (in)
      J  2-yr Adj CN
      K  2-yr Det Req'd?    (trigger: Adj CN > 70)
      L  15-yr rain (in)
      M-Q 15-yr block (Pre Q, Post Q, Adj Q, Adj CN, Det Req'd?)  (trigger: Adj CN > Pre CN)
      R  100-yr rain (in)
      S-V 100-yr block (Pre Q, Post Q, Adj Q, Adj CN)             (reported only)

    Adjusted runoff Q_adj = MAX(0, Q_post − Sv*12/DA_SF); adjusted CN via
    closed-form inverse of the SCS runoff equation (see _adjusted_cn_formula).
    """
    ws = wb.create_sheet("DOEE_DETENTION")
    ws.sheet_view.showGridLines = False

    widths = [12, 10, 10, 12, 14, 10, 12, 12, 12, 10, 12,
              10, 12, 12, 12, 10, 12,
              10, 12, 12, 12, 10]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "DOEE_DETENTION — 2020 Compliance Calc Methodology",
               styles.BH, span=22)
    ws.row_dimensions[1].height = 24

    styles.lbl(ws, 2, 1, DETENTION_USER_NOTE, styles.BL, bold=False)
    ws.cell(row=2, column=1).alignment = openpyxl.styles.Alignment(
        wrap_text=True, vertical="top")
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=22)
    ws.row_dimensions[2].height = 48

    headers = [
        "SDA Number", "Pre CN", "Post CN (no BMP)", "DA (SF)", "BMP Sv (CF)",
        "2-yr Rain (in)", "2-yr Pre Q (in)", "2-yr Post Q (in)", "2-yr Adj Q (in)",
        "2-yr Adj CN", "2-yr Det Req'd?",
        "15-yr Rain (in)", "15-yr Pre Q (in)", "15-yr Post Q (in)", "15-yr Adj Q (in)",
        "15-yr Adj CN", "15-yr Det Req'd?",
        "100-yr Rain (in)", "100-yr Pre Q (in)", "100-yr Post Q (in)", "100-yr Adj Q (in)",
        "100-yr Adj CN",
    ]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 42

    for i in range(10):
        r = 4 + i
        sr = r   # DOEE_SDA row is 4+i too

        # A: SDA Number
        styles.calc_c(ws, r, 1, f"='DOEE_SDA'!A{sr}")

        # B: Pre CN composite (DOEE_SDA cols C-F)
        pre_nat  = f"'DOEE_SDA'!C{sr}"
        pre_comp = f"'DOEE_SDA'!D{sr}"
        pre_imp  = f"'DOEE_SDA'!E{sr}"
        pre_bmp  = f"'DOEE_SDA'!F{sr}"
        pre_area = f"({pre_nat}+{pre_comp}+{pre_imp}+{pre_bmp})"
        pre_num  = (f"({pre_nat}*INDEX(PARAMS_DetentionCN,1,2)"
                    f"+{pre_comp}*INDEX(PARAMS_DetentionCN,2,2)"
                    f"+{pre_imp}*INDEX(PARAMS_DetentionCN,3,2)"
                    f"+{pre_bmp}*INDEX(PARAMS_DetentionCN,4,2))")
        styles.calc_c(ws, r, 2, f"=IFERROR({pre_num}/{pre_area},0)")

        # C: Post CN composite (DOEE_SDA cols G-J)
        post_nat  = f"'DOEE_SDA'!G{sr}"
        post_comp = f"'DOEE_SDA'!H{sr}"
        post_imp  = f"'DOEE_SDA'!I{sr}"
        post_bmp  = f"'DOEE_SDA'!J{sr}"
        post_area = f"({post_nat}+{post_comp}+{post_imp}+{post_bmp})"
        post_num  = (f"({post_nat}*INDEX(PARAMS_DetentionCN,1,2)"
                     f"+{post_comp}*INDEX(PARAMS_DetentionCN,2,2)"
                     f"+{post_imp}*INDEX(PARAMS_DetentionCN,3,2)"
                     f"+{post_bmp}*INDEX(PARAMS_DetentionCN,4,2))")
        styles.calc_c(ws, r, 3, f"=IFERROR({post_num}/{post_area},0)")

        # D: DA total SF = post_area (within-LOD total)
        styles.calc_c(ws, r, 4, f"={post_area}")

        # E: BMP Sv total — SUMIFS BMP AO (Sv Total) by SDA_ID (BMP col B)
        styles.calc_c(ws, r, 5,
            f"=SUMIFS('BMP'!$AO${BMP_FIRST}:$AO${BMP_LAST},"
            f"'BMP'!$B${BMP_FIRST}:$B${BMP_LAST},A{r})")

        s_pre  = f"(1000/B{r}-10)"
        s_post = f"(1000/C{r}-10)"

        # Per-storm blocks: (rain_col, pre_q_col, post_q_col, adj_q_col,
        #                    adj_cn_col, req_col, params_row)
        for storm_idx, (rain_col, pre_q_col, post_q_col, adj_q_col,
                        adj_cn_col, req_col, params_row) in enumerate([
            (6, 7, 8, 9, 10, 11, 1),      # 2-yr
            (12, 13, 14, 15, 16, 17, 2),  # 15-yr
            (18, 19, 20, 21, 22, None, 3),  # 100-yr (no Det Req'd?)
        ]):
            # Rain depth from PARAMS_Detention row params_row col 2
            p_expr = f"INDEX(PARAMS_Detention,{params_row},2)"
            styles.calc_c(ws, r, rain_col, f"={p_expr}")
            p_ref = f"{styles.cl(rain_col)}{r}"

            # Pre Q
            styles.calc_c(ws, r, pre_q_col,
                f"=IFERROR({_scs_runoff_formula(p_ref, s_pre)},0)")
            # Post Q (no BMP)
            styles.calc_c(ws, r, post_q_col,
                f"=IFERROR({_scs_runoff_formula(p_ref, s_post)},0)")
            # Adj Q = MAX(0, Post Q − BMP_Sv × 12 / DA_SF)
            post_q_ref = f"{styles.cl(post_q_col)}{r}"
            styles.calc_c(ws, r, adj_q_col,
                f"=IFERROR(MAX(0,{post_q_ref}-E{r}*12/D{r}),{post_q_ref})")
            # Adj CN (closed-form back-compute)
            adj_q_ref = f"{styles.cl(adj_q_col)}{r}"
            styles.calc_c(ws, r, adj_cn_col,
                f"=IFERROR({_adjusted_cn_formula(adj_q_ref, p_ref)},0)")

            # Det Req'd? (skipped for 100-yr)
            if req_col is None:
                continue
            adj_cn_ref = f"{styles.cl(adj_cn_col)}{r}"
            if storm_idx == 0:   # 2-yr: trigger when Adj CN > 70 (Natural baseline)
                styles.calc_c(ws, r, req_col,
                    f'=IF({adj_cn_ref}>70,"Yes","No")')
            else:                # 15-yr: trigger when Adj CN > Pre CN
                styles.calc_c(ws, r, req_col,
                    f'=IF({adj_cn_ref}>B{r},"Yes","No")')

    # Column-group dividers
    last_row = 4 + 10 - 1
    styles.apply_right_divider(ws, 5, 3, last_row)    # end of ID+CN+DA+Sv
    styles.apply_right_divider(ws, 11, 3, last_row)   # end of 2-yr block
    styles.apply_right_divider(ws, 17, 3, last_row)   # end of 15-yr block


def build_doee_compliance(wb: Workbook) -> None:
    """Add DOEE_COMPLIANCE — final Pass/Fail summary (one row per SDA + site total).

    Columns A-F:
      A  SDA Number
      B  SWRv Required (CF)  — from DOEE_SDA col L
      C  Rv Provided (CF)    — SUMIFS BMP AS by SDA_ID
      D  % Met               — C / B
      E  Status              — "✓ PASS" or "✗ FAIL"
      F  Detention Req'd?    — Yes if 2-yr or 15-yr detention triggered
    """
    ws = wb.create_sheet("DOEE_COMPLIANCE")
    ws.sheet_view.showGridLines = False

    widths = [12, 15, 15, 10, 12, 15]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "DOEE_COMPLIANCE — Final Pass/Fail Summary",
               styles.BH, span=6)
    ws.row_dimensions[1].height = 24

    headers = [
        "SDA Number", "SWRv Required (CF)", "Rv Provided (CF)",
        "% Met", "Status", "Detention Req'd?",
    ]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    for i in range(10):
        r = 4 + i
        sr = 4 + i          # same row in DOEE_SDA / DOEE_DETENTION

        # Col A: SDA Number
        styles.calc_c(ws, r, 1, f"='DOEE_SDA'!A{sr}")

        # Col B: SWRv Required (CF) — DOEE_SDA col L
        styles.calc_c(ws, r, 2, f"='DOEE_SDA'!L{sr}")

        # Col C: Rv Provided — sum of BMP AS (Rv Applied) for this SDA.
        # (AS in the new 81-col BMP schema; was AM in the old 39-col layout.)
        styles.calc_c(ws, r, 3,
                      f"=SUMIFS('BMP'!$AS${BMP_FIRST}:$AS${BMP_LAST},"
                      f"'BMP'!$B${BMP_FIRST}:$B${BMP_LAST},A{r})")

        # Col D: % Met
        styles.calc_c(ws, r, 4, f"=IFERROR(C{r}/B{r},0)")
        ws.cell(row=r, column=4).number_format = "0%"

        # Col E: Status
        styles.calc_c(ws, r, 5,
                      f'=IF(B{r}=0,"—",IF(C{r}>=B{r},"✓ PASS","✗ FAIL"))')

        # Col F: Detention Required? — col K on DOEE_DETENTION is 2-yr trigger,
        # col Q is 15-yr trigger in the new 22-col 2020 methodology layout.
        styles.calc_c(ws, r, 6,
                      f'=IF(OR(\'DOEE_DETENTION\'!K{sr}="Yes",'
                      f'\'DOEE_DETENTION\'!Q{sr}="Yes"),"Yes","No")')

    # Site total row — styled as a prominent BH header-bar for closure.
    total_r = 15
    styles.hdr(ws, total_r, 1, "SITE TOTAL", styles.BH)
    styles.calc_c(ws, total_r, 2, "=SUM(B4:B13)")
    styles.calc_c(ws, total_r, 3, "=SUM(C4:C13)")
    styles.calc_c(ws, total_r, 4, f"=IFERROR(C{total_r}/B{total_r},0)")
    ws.cell(row=total_r, column=4).number_format = "0%"
    styles.calc_c(ws, total_r, 5,
                  f'=IF(C{total_r}>=B{total_r},"✓ PASS","✗ FAIL")')
    # Promote the total-row's B-E cells to bold + BH fill (matching the SITE TOTAL label).
    for col in range(2, 7):
        cell = ws.cell(row=total_r, column=col)
        cell.fill = styles.fill(styles.BH)
        cell.font = styles.fnt(bold=True, white=True)
        cell.alignment = styles.ctr()
    # Thick separator above the total row.
    styles.apply_top_divider(ws, total_r, 1, 6)
    # Row banding on data rows 4-13 (alternating light gray for scanability).
    for i in range(10):
        if i % 2 == 1:
            for col in range(1, 7):
                cell = ws.cell(row=4 + i, column=col)
                # Only re-fill cells currently using the default CALC bg (preserves label fills)
                try:
                    cur = cell.fill.fgColor.rgb or ""
                except Exception:
                    cur = ""
                if str(cur).endswith(styles.CALC) or str(cur).endswith("DEEAF1"):
                    cell.fill = styles.fill(styles.GRY)


def build_doee_detention_bmp(wb: Workbook) -> None:
    """Add DOEE_DETENTION_BMP — 2020 methodology at CDA level (24 cols).

    Columns A-X:
      A  CDA Number (label)
      B  BMP Name (reverse-lookup by CDA_ID)
      C  SDA Number (from CDA_Proposed summary)
      D  Pre CN  (area-weighted from CDA_Existing)
      E  Post CN (area-weighted from CDA_Proposed)
      F  DA (SF)  (from CDA_Proposed summary col C)
      G  BMP Sv (CF) (SUMIFS BMP AO by CDA_ID)
      H-M  2-yr block (Rain, Pre Q, Post Q, Adj Q, Adj CN, Det Req'd?)
      N-S  15-yr block (Rain, Pre Q, Post Q, Adj Q, Adj CN, Det Req'd?)
      T-X  100-yr block (Rain, Pre Q, Post Q, Adj Q, Adj CN — no Det flag)

    Adj Q = MAX(0, Post Q − BMP_Sv × 12 / DA_SF); Adj CN via closed-form
    inverse (see _adjusted_cn_formula).  2-yr trigger when Adj CN > 70;
    15-yr trigger when Adj CN > Pre CN.
    """
    ws = wb.create_sheet("DOEE_DETENTION_BMP")
    ws.sheet_view.showGridLines = False

    widths = [12, 18, 12, 10, 10, 12, 14,
              10, 12, 12, 12, 10, 12,     # 2-yr block (H-M)
              10, 12, 12, 12, 10, 12,     # 15-yr block (N-S)
              10, 12, 12, 12, 10]         # 100-yr block (T-X)
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "DOEE_DETENTION_BMP — 2020 Compliance Calc Methodology (per CDA)",
               styles.BH, span=24)
    ws.row_dimensions[1].height = 24

    styles.lbl(ws, 2, 1, DETENTION_USER_NOTE, styles.BL, bold=False)
    ws.cell(row=2, column=1).alignment = openpyxl.styles.Alignment(
        wrap_text=True, vertical="top")
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=24)
    ws.row_dimensions[2].height = 48

    headers = [
        "CDA Number", "BMP Name", "SDA Number",
        "Pre CN", "Post CN", "DA (SF)", "BMP Sv (CF)",
        "2-yr Rain (in)", "2-yr Pre Q (in)", "2-yr Post Q (in)", "2-yr Adj Q (in)",
        "2-yr Adj CN", "2-yr Det Req'd?",
        "15-yr Rain (in)", "15-yr Pre Q (in)", "15-yr Post Q (in)", "15-yr Adj Q (in)",
        "15-yr Adj CN", "15-yr Det Req'd?",
        "100-yr Rain (in)", "100-yr Pre Q (in)", "100-yr Post Q (in)", "100-yr Adj Q (in)",
        "100-yr Adj CN",
    ]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 42

    # DOEE_DETENTION_BMP mirrors the official sheet's 10-row capacity,
    # so iterate over the first 10 Area_Summary CDA rows.
    cda_summary_last = CDA_SUMMARY_FIRST + 10 - 1

    def _sumifs_cda_landuse(area_col: str, cda_cell: str, land_use: str,
                            sheet: str = "CDA_Proposed") -> str:
        return (
            f"SUMIFS('{sheet}'!${area_col}${CDA_FIRST}:${area_col}${CDA_LAST},"
            f"'{sheet}'!$A${CDA_FIRST}:$A${CDA_LAST},{cda_cell},"
            f"'{sheet}'!$C${CDA_FIRST}:$C${CDA_LAST},\"{land_use}\")"
        )

    def _cn_composite(area_col: str, cda_cell: str, sheet: str = "CDA_Proposed") -> str:
        """Area-weighted CN composite for the given CDA sheet/area column."""
        nat  = _sumifs_cda_landuse(area_col, cda_cell, "Natural (Woods)", sheet)
        comp = _sumifs_cda_landuse(area_col, cda_cell, "Compacted (Open Space)", sheet)
        imp  = (_sumifs_cda_landuse(area_col, cda_cell, "Impervious Vehicular", sheet)
                + "+" + _sumifs_cda_landuse(area_col, cda_cell, "Impervious Non-Vehicular", sheet))
        bmp_ = _sumifs_cda_landuse(area_col, cda_cell, "BMP", sheet)
        total = f"({nat}+{comp}+{imp}+{bmp_})"
        num = (f"({nat}*INDEX(PARAMS_DetentionCN,1,2)"
               f"+{comp}*INDEX(PARAMS_DetentionCN,2,2)"
               f"+({imp})*INDEX(PARAMS_DetentionCN,3,2)"
               f"+{bmp_}*INDEX(PARAMS_DetentionCN,4,2))")
        return f"=IFERROR({num}/{total},0)"

    for i in range(10):
        r = 4 + i
        cda_cell = f"A{r}"

        # A: hard-coded CDA label.
        styles.lbl(ws, r, 1, f"CDA-{i+1}", styles.BL, bold=True)

        # B: BMP Name — reverse lookup by CDA_ID into BMP col A (data rows 6-55).
        styles.calc_c(ws, r, 2,
                      f"=IFERROR(INDEX('BMP'!$A${BMP_FIRST}:$A${BMP_LAST},"
                      f"MATCH({cda_cell},'BMP'!$C${BMP_FIRST}:$C${BMP_LAST},0)),\"\")")

        # C: SDA Number — from Area_Summary CDA section col B.
        styles.calc_c(ws, r, 3,
                      f"=IFERROR(INDEX('{AREA_SHEET}'!$B${CDA_SUMMARY_FIRST}:$B${cda_summary_last},"
                      f"MATCH({cda_cell},'{AREA_SHEET}'!$A${CDA_SUMMARY_FIRST}:$A${cda_summary_last},0)),\"\")")

        # D: Pre CN composite — CDA_Existing col E (Area Within LOD).
        styles.calc_c(ws, r, 4, _cn_composite("E", cda_cell, "CDA_Existing"))

        # E: Post CN composite — CDA_Proposed col E (Area Within LOD).
        styles.calc_c(ws, r, 5, _cn_composite("E", cda_cell, "CDA_Proposed"))

        # F: DA total SF — from Area_Summary CDA section col D (Post Total Within).
        styles.calc_c(ws, r, 6,
                      f"=IFERROR(INDEX('{AREA_SHEET}'!$D${CDA_SUMMARY_FIRST}:$D${cda_summary_last},"
                      f"MATCH({cda_cell},'{AREA_SHEET}'!$A${CDA_SUMMARY_FIRST}:$A${cda_summary_last},0)),0)")

        # G: BMP Sv total — SUMIFS BMP AO by CDA_ID (BMP col C).
        styles.calc_c(ws, r, 7,
                      f"=SUMIFS('BMP'!$AO${BMP_FIRST}:$AO${BMP_LAST},"
                      f"'BMP'!$C${BMP_FIRST}:$C${BMP_LAST},{cda_cell})")

        s_pre  = f"(1000/D{r}-10)"
        s_post = f"(1000/E{r}-10)"

        # Per-storm blocks: (rain_col, pre_q_col, post_q_col, adj_q_col,
        #                    adj_cn_col, req_col, params_row)
        for storm_idx, (rain_col, pre_q_col, post_q_col, adj_q_col,
                        adj_cn_col, req_col, params_row) in enumerate([
            (8,  9,  10, 11, 12, 13, 1),    # 2-yr   (H-M)
            (14, 15, 16, 17, 18, 19, 2),    # 15-yr  (N-S)
            (20, 21, 22, 23, 24, None, 3),  # 100-yr (T-X)
        ]):
            p_expr = f"INDEX(PARAMS_Detention,{params_row},2)"
            styles.calc_c(ws, r, rain_col, f"={p_expr}")
            p_ref = f"{styles.cl(rain_col)}{r}"

            # Pre Q
            styles.calc_c(ws, r, pre_q_col,
                f"=IFERROR({_scs_runoff_formula(p_ref, s_pre)},0)")
            # Post Q (no BMP)
            styles.calc_c(ws, r, post_q_col,
                f"=IFERROR({_scs_runoff_formula(p_ref, s_post)},0)")
            # Adj Q = MAX(0, Post Q − BMP_Sv × 12 / DA_SF)
            post_q_ref = f"{styles.cl(post_q_col)}{r}"
            styles.calc_c(ws, r, adj_q_col,
                f"=IFERROR(MAX(0,{post_q_ref}-G{r}*12/F{r}),{post_q_ref})")
            # Adj CN (closed-form)
            adj_q_ref = f"{styles.cl(adj_q_col)}{r}"
            styles.calc_c(ws, r, adj_cn_col,
                f"=IFERROR({_adjusted_cn_formula(adj_q_ref, p_ref)},0)")

            if req_col is None:
                continue
            adj_cn_ref = f"{styles.cl(adj_cn_col)}{r}"
            if storm_idx == 0:   # 2-yr: Adj CN > 70
                styles.calc_c(ws, r, req_col,
                    f'=IF({adj_cn_ref}>70,"Yes","No")')
            else:                # 15-yr: Adj CN > Pre CN
                styles.calc_c(ws, r, req_col,
                    f'=IF({adj_cn_ref}>D{r},"Yes","No")')

    # Column-group dividers.
    last_row = 4 + 10 - 1
    styles.apply_right_divider(ws, 3,  3, last_row)   # end of ID block
    styles.apply_right_divider(ws, 7,  3, last_row)   # end of CN+DA+Sv
    styles.apply_right_divider(ws, 13, 3, last_row)   # end of 2-yr block
    styles.apply_right_divider(ws, 19, 3, last_row)   # end of 15-yr block
