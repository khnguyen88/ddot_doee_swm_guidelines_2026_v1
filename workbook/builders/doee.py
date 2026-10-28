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
from openpyxl import Workbook

from workbook import styles

# Data range constants matching the defaults in sda.py / cda.py / bmp.py
SDA_FIRST = 4
SDA_LAST = 53
BMP_FIRST = 4
BMP_LAST = 53

# SDA summary data starts at row 58 when n_rows=50:
#   data_end = 53, summary_header_row = 56, sum_row = 57, sum_data_start = 58
SDA_SUMMARY_FIRST = 58   # row of SDA-1 in SDA summary block


def _area_sumifs(area_col: str, sda_cell: str, lu: str) -> str:
    """Return a SUMIFS fragment aggregating area_col from SDA by SDA_ID and Land Use."""
    return (
        f"SUMIFS('SDA'!${area_col}${SDA_FIRST}:${area_col}${SDA_LAST},"
        f"'SDA'!$A${SDA_FIRST}:$A${SDA_LAST},{sda_cell},"
        f"'SDA'!$C${SDA_FIRST}:$C${SDA_LAST},\"{lu}\")"
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
        sda_cell = f"'SDA'!A{sda_summary_row}"

        # Col A: SDA Number (label from SDA summary)
        styles.calc_c(ws, r, 1, f"={sda_cell}")

        # Col B: In PROW? — first "Yes/No" value in SDA data rows for this SDA
        styles.calc_c(ws, r, 2,
                      f"=IFERROR(INDEX('SDA'!$B${SDA_FIRST}:$B${SDA_LAST},"
                      f"MATCH(A{r},'SDA'!$A${SDA_FIRST}:$A${SDA_LAST},0)),\"\")")

        # Cols C-F: Pre land cover (SDA col E = Pre Within LOD SF)
        styles.calc_c(ws, r, 3,
                      "=" + _area_sumifs("E", f"A{r}", "Natural (Woods)"))
        styles.calc_c(ws, r, 4,
                      "=" + _area_sumifs("E", f"A{r}", "Compacted (Open Space)"))
        styles.calc_c(ws, r, 5,
                      "=" + _area_sumifs("E", f"A{r}", "Impervious Vehicular")
                      + "+" + _area_sumifs("E", f"A{r}", "Impervious Non-Vehicular"))
        styles.calc_c(ws, r, 6,
                      "=" + _area_sumifs("E", f"A{r}", "BMP"))

        # Cols G-J: Post land cover (SDA col G = Post Within LOD SF)
        styles.calc_c(ws, r, 7,
                      "=" + _area_sumifs("G", f"A{r}", "Natural (Woods)"))
        styles.calc_c(ws, r, 8,
                      "=" + _area_sumifs("G", f"A{r}", "Compacted (Open Space)"))
        styles.calc_c(ws, r, 9,
                      "=" + _area_sumifs("G", f"A{r}", "Impervious Vehicular")
                      + "+" + _area_sumifs("G", f"A{r}", "Impervious Non-Vehicular"))
        styles.calc_c(ws, r, 10,
                      "=" + _area_sumifs("G", f"A{r}", "BMP"))

        # Col K: Post Vehicular only
        styles.calc_c(ws, r, 11,
                      "=" + _area_sumifs("G", f"A{r}", "Impervious Vehicular"))

        # Col L: SWRv Required (CF) — from SDA summary col J (10)
        styles.calc_c(ws, r, 12, f"='SDA'!J{sda_summary_row}")

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
      J  Sv (CF)     — BMP col AI (35)
      K  Rv Applied (CF) — BMP col AM (39)
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

        # CDA land cover — SUMIFS from CDA sheet by CDA_ID (BMP col C) + Land Use
        cda_cell = f"'BMP'!C{src}"
        styles.calc_c(ws, r, 6,
                      f"=SUMIFS('CDA'!$E$4:$E$53,"
                      f"'CDA'!$A$4:$A$53,{cda_cell},"
                      f"'CDA'!$C$4:$C$53,\"Natural (Woods)\")")
        styles.calc_c(ws, r, 7,
                      f"=SUMIFS('CDA'!$E$4:$E$53,"
                      f"'CDA'!$A$4:$A$53,{cda_cell},"
                      f"'CDA'!$C$4:$C$53,\"Compacted (Open Space)\")")
        styles.calc_c(ws, r, 8,
                      f"=SUMIFS('CDA'!$E$4:$E$53,"
                      f"'CDA'!$A$4:$A$53,{cda_cell},"
                      f"'CDA'!$C$4:$C$53,\"Impervious Vehicular\")"
                      f"+SUMIFS('CDA'!$E$4:$E$53,"
                      f"'CDA'!$A$4:$A$53,{cda_cell},"
                      f"'CDA'!$C$4:$C$53,\"Impervious Non-Vehicular\")")
        styles.calc_c(ws, r, 9,
                      f"=SUMIFS('CDA'!$E$4:$E$53,"
                      f"'CDA'!$A$4:$A$53,{cda_cell},"
                      f"'CDA'!$C$4:$C$53,\"BMP\")")

        # Col J: Sv Total — BMP col AI (35)
        styles.calc_c(ws, r, 10, f"='BMP'!AI{src}")

        # Col K: Rv Applied — BMP col AM (39)
        styles.calc_c(ws, r, 11, f"='BMP'!AM{src}")


def build_doee_detention(wb: Workbook) -> None:
    """Add DOEE_DETENTION — Compliance Calc Sheet 3 mirror (one row per SDA).

    Columns A-I:
      A  SDA Number
      B  Pre CN (composite, area-weighted)
      C  Post CN (composite, area-weighted)
      D  2-yr Pre Runoff Depth (in)  — SCS CN method
      E  2-yr Post Runoff Depth (in)
      F  2-yr Detention Required?    — Yes if Post > Pre
      G  15-yr Pre Runoff Depth (in)
      H  15-yr Post Runoff Depth (in)
      I  15-yr Detention Required?

    CN values pulled from PARAMS_DetentionCN:
      Row 1 = Natural   (CN 70)
      Row 2 = Compacted (CN 74)
      Row 3 = Impervious (CN 98)
      Row 4 = BMP       (CN 98)

    Land-cover areas from DOEE_SDA:
      C = Pre Natural, D = Pre Compacted, E = Pre Impervious, F = Pre BMP
      G = Post Natural, H = Post Compacted, I = Post Impervious, J = Post BMP

    Storm depths from PARAMS_Detention:
      Row 1 col 2 = 3.14 in (2-year)
      Row 2 col 2 = 5.23 in (15-year)
    """
    ws = wb.create_sheet("DOEE_DETENTION")
    ws.sheet_view.showGridLines = False

    widths = [12, 12, 12, 16, 16, 14, 16, 16, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "DOEE_DETENTION — Compliance Calc Sheet 3 mirror",
               styles.BH, span=9)
    ws.row_dimensions[1].height = 24

    headers = [
        "SDA Number", "Pre CN", "Post CN",
        "2-yr Pre Q (in)", "2-yr Post Q (in)", "2-yr Det Req'd?",
        "15-yr Pre Q (in)", "15-yr Post Q (in)", "15-yr Det Req'd?",
    ]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    for i in range(10):
        r = 4 + i
        sr = 4 + i          # same row in DOEE_SDA (data starts at row 4)

        # Col A: SDA Number (mirror from DOEE_SDA)
        styles.calc_c(ws, r, 1, f"='DOEE_SDA'!A{sr}")

        # Pre CN = weighted average:
        #   (Nat × CN_nat + Comp × CN_comp + Imp × CN_imp + BMP × CN_bmp) / total_area
        # DOEE_SDA cols: C=Pre Nat, D=Pre Comp, E=Pre Imp, F=Pre BMP
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

        # Post CN — DOEE_SDA cols: G=Post Nat, H=Post Comp, I=Post Imp, J=Post BMP
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

        # SCS CN runoff equation:  Q = (P - 0.2S)^2 / (P - 0.2S + S)   where S = 1000/CN - 10
        # Storm depths via named range INDEX:
        p2  = "INDEX(PARAMS_Detention,1,2)"    # 3.14 in
        p15 = "INDEX(PARAMS_Detention,2,2)"    # 5.23 in

        # S values as functions of CN (cols B and C of this sheet)
        s_pre  = f"(1000/B{r}-10)"
        s_post = f"(1000/C{r}-10)"

        # 2-yr Pre
        styles.calc_c(ws, r, 4,
                      f"=IFERROR(IF({p2}>0.2*{s_pre},"
                      f"({p2}-0.2*{s_pre})^2/({p2}+0.8*{s_pre}),0),0)")
        # 2-yr Post
        styles.calc_c(ws, r, 5,
                      f"=IFERROR(IF({p2}>0.2*{s_post},"
                      f"({p2}-0.2*{s_post})^2/({p2}+0.8*{s_post}),0),0)")
        # 2-yr Required?
        styles.calc_c(ws, r, 6, f'=IF(E{r}>D{r},"Yes","No")')

        # 15-yr Pre
        styles.calc_c(ws, r, 7,
                      f"=IFERROR(IF({p15}>0.2*{s_pre},"
                      f"({p15}-0.2*{s_pre})^2/({p15}+0.8*{s_pre}),0),0)")
        # 15-yr Post
        styles.calc_c(ws, r, 8,
                      f"=IFERROR(IF({p15}>0.2*{s_post},"
                      f"({p15}-0.2*{s_post})^2/({p15}+0.8*{s_post}),0),0)")
        # 15-yr Required?
        styles.calc_c(ws, r, 9, f'=IF(H{r}>G{r},"Yes","No")')

    # Column-group dividers:
    #   • between CN pair (B, C) and 2-yr storm block (D, E, F) — right border on C
    #   • between 2-yr block and 15-yr block — right border on F
    last_row = 4 + 10 - 1   # 13
    styles.apply_right_divider(ws, 3, 3, last_row)   # right side of col C (Pre/Post CN)
    styles.apply_right_divider(ws, 6, 3, last_row)   # right side of col F (end of 2-yr block)


def build_doee_compliance(wb: Workbook) -> None:
    """Add DOEE_COMPLIANCE — final Pass/Fail summary (one row per SDA + site total).

    Columns A-F:
      A  SDA Number
      B  SWRv Required (CF)  — from DOEE_SDA col L
      C  Rv Provided (CF)    — SUMIFS BMP AM by SDA_ID
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

        # Col C: Rv Provided — sum of BMP AM (Rv Applied) for this SDA
        styles.calc_c(ws, r, 3,
                      f"=SUMIFS('BMP'!$AM${BMP_FIRST}:$AM${BMP_LAST},"
                      f"'BMP'!$B${BMP_FIRST}:$B${BMP_LAST},A{r})")

        # Col D: % Met
        styles.calc_c(ws, r, 4, f"=IFERROR(C{r}/B{r},0)")
        ws.cell(row=r, column=4).number_format = "0%"

        # Col E: Status
        styles.calc_c(ws, r, 5,
                      f'=IF(B{r}=0,"—",IF(C{r}>=B{r},"✓ PASS","✗ FAIL"))')

        # Col F: Detention Required?
        styles.calc_c(ws, r, 6,
                      f'=IF(OR(\'DOEE_DETENTION\'!F{sr}="Yes",'
                      f'\'DOEE_DETENTION\'!I{sr}="Yes"),"Yes","No")')

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
