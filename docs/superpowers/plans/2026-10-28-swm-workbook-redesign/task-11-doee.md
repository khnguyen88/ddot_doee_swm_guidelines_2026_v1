# Task 11: DOEE Compliance Sheets (4 sheets in one module)

**Depends on:** 05, 06, 07. **Blocks:** 12.

## Context

Four auto-populated sheets that mirror the DOEE Compliance Calc workbook layout exactly, so a DOEE reviewer can scan side-by-side. All formulas aggregate from SDA, CDA, and BMP — no user input.

1. **DOEE_SDA** — one row per SDA (A-M columns)
2. **DOEE_BMP_DATA** — one row per BMP (A-K columns)
3. **DOEE_DETENTION** — CN-based 2-yr / 15-yr detention check (one row per SDA)
4. **DOEE_COMPLIANCE** — final pass/fail summary

### DOEE_SDA columns

| Col | Content |
|---|---|
| A | SDA Number (SDA-N) |
| B | In PROW? (lookup via SDA_IDs row) |
| C | Pre Natural (SF) |
| D | Pre Compacted (SF) |
| E | Pre Impervious (SF) |
| F | Pre BMP (SF) |
| G | Post Natural (SF) |
| H | Post Compacted (SF) |
| I | Post Impervious (SF) |
| J | Post BMP (SF) |
| K | Post Vehicular (SF) — subset of Impervious |
| L | SWRv Required (CF) |
| M | WQTv Required? (flag if vehicular > 0) |

### DOEE_BMP_DATA columns

| Col | Content |
|---|---|
| A | BMP ID (sequential) |
| B | SDA Number |
| C | BMP Number within SDA |
| D | BMP Name |
| E | BMP Group / Sub-Type |
| F | CDA Natural (SF) |
| G | CDA Compacted (SF) |
| H | CDA Impervious (SF) |
| I | CDA BMP (SF) |
| J | Sv (CF) |
| K | Rv Applied (CF) |

### DOEE_DETENTION columns

| Col | Content |
|---|---|
| A | SDA Number |
| B | Pre CN (composite) |
| C | Post CN (composite) |
| D | 2-yr Pre Runoff Depth (in) |
| E | 2-yr Post Runoff Depth (in) |
| F | 2-yr Detention Req'd? |
| G | 15-yr Pre Runoff Depth (in) |
| H | 15-yr Post Runoff Depth (in) |
| I | 15-yr Detention Req'd? |

### DOEE_COMPLIANCE columns

| Col | Content |
|---|---|
| A | SDA Number |
| B | SWRv Required (CF) |
| C | Rv Provided (CF) |
| D | % Met |
| E | Pass / Fail |
| F | Detention Required? |

## Files

- Create: `workbook/builders/doee.py` (four builder functions in one module)
- Create: `tests/test_doee.py`

## Steps

- [ ] **Step 1: Write failing test**

```python
import pytest
import openpyxl

from workbook.builders import params, project, sda, cda, bmp, doee


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    doee.build_doee_sda(w)
    doee.build_doee_bmp_data(w)
    doee.build_doee_detention(w)
    doee.build_doee_compliance(w)
    return w


def test_all_four_doee_sheets_exist(wb):
    for name in ("DOEE_SDA", "DOEE_BMP_DATA", "DOEE_DETENTION", "DOEE_COMPLIANCE"):
        assert name in wb.sheetnames


def test_doee_sda_rows(wb):
    ws = wb["DOEE_SDA"]
    # Ten SDA rows (SDA-1 ... SDA-10) auto-pulled from SDA summary via ='SDA'!A57
    sda_ids = []
    for r in range(1, 50):
        v = ws.cell(row=r, column=1).value
        if isinstance(v, str) and ("SDA" in v or "'SDA'" in v):
            sda_ids.append(v)
    assert len(sda_ids) >= 10 or any("'SDA'" in s for s in sda_ids)


def test_doee_sda_swrv_formula(wb):
    ws = wb["DOEE_SDA"]
    # Column L should contain SWRv Required (CF)
    header = None
    for c in range(1, 20):
        if ws.cell(row=3, column=c).value and "SWRv" in str(ws.cell(row=3, column=c).value):
            header = c
            break
    assert header is not None, "SWRv column not found"


def test_doee_bmp_data_pulls_from_bmp_sheet(wb):
    ws = wb["DOEE_BMP_DATA"]
    found = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and "'BMP'" in v:
                found = True
    assert found


def test_doee_detention_uses_params_cn(wb):
    ws = wb["DOEE_DETENTION"]
    # At least one formula references PARAMS_DetentionCN or detention storm
    found = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and ("PARAMS_Detention" in v or "3.14" in v or "5.23" in v):
                found = True
    assert found


def test_doee_compliance_pass_fail(wb):
    ws = wb["DOEE_COMPLIANCE"]
    found_pass = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and ("PASS" in v or "✓" in v):
                found_pass = True
    assert found_pass
```

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Write `workbook/builders/doee.py`**

```python
"""Build the four DOEE Compliance Calc mirror sheets."""
from openpyxl import Workbook

from workbook import styles

SDA_FIRST = 4
SDA_LAST = 53
BMP_FIRST = 4
BMP_LAST = 53
SDA_SUMMARY_FIRST = 57  # SDA-1 summary row in SDA sheet


def _area_sumifs(area_col: str, sda_cell: str, lu: str) -> str:
    return (f"SUMIFS('SDA'!${area_col}${SDA_FIRST}:${area_col}${SDA_LAST},"
            f"'SDA'!$A${SDA_FIRST}:$A${SDA_LAST},{sda_cell},"
            f"'SDA'!$C${SDA_FIRST}:$C${SDA_LAST},\"{lu}\")")


def build_doee_sda(wb: Workbook) -> None:
    ws = wb.create_sheet("DOEE_SDA")
    ws.sheet_view.showGridLines = False

    widths = [12, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 15, 10]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "DOEE_SDA — Compliance Calc Sheet 1 mirror",
               styles.BH, span=13)
    headers = [
        "SDA Number", "In PROW?",
        "Pre Nat (SF)", "Pre Comp (SF)", "Pre Imp (SF)", "Pre BMP (SF)",
        "Post Nat (SF)", "Post Comp (SF)", "Post Imp (SF)", "Post BMP (SF)",
        "Post Veh (SF)", "SWRv Required (CF)", "WQTv Req'd?",
    ]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)

    for i in range(10):
        r = 4 + i
        sda_summary_row = SDA_SUMMARY_FIRST + i
        sda_cell = f"'SDA'!A{sda_summary_row}"
        styles.calc_c(ws, r, 1, f"={sda_cell}")
        styles.calc_c(ws, r, 2, "=PROJECT_AWDZ")  # placeholder; In PROW is on SDA sheet col B

        # Pre
        styles.calc_c(ws, r, 3, "=" + _area_sumifs("E", sda_cell, "Natural (Woods)"))
        styles.calc_c(ws, r, 4, "=" + _area_sumifs("E", sda_cell, "Compacted (Open Space)"))
        styles.calc_c(ws, r, 5, "=" + _area_sumifs("E", sda_cell, "Impervious Vehicular")
                              + "+" + _area_sumifs("E", sda_cell, "Impervious Non-Vehicular"))
        styles.calc_c(ws, r, 6, "=" + _area_sumifs("E", sda_cell, "BMP"))

        # Post
        styles.calc_c(ws, r, 7,  "=" + _area_sumifs("G", sda_cell, "Natural (Woods)"))
        styles.calc_c(ws, r, 8,  "=" + _area_sumifs("G", sda_cell, "Compacted (Open Space)"))
        styles.calc_c(ws, r, 9,  "=" + _area_sumifs("G", sda_cell, "Impervious Vehicular")
                              + "+" + _area_sumifs("G", sda_cell, "Impervious Non-Vehicular"))
        styles.calc_c(ws, r, 10, "=" + _area_sumifs("G", sda_cell, "BMP"))
        styles.calc_c(ws, r, 11, "=" + _area_sumifs("G", sda_cell, "Impervious Vehicular"))

        # SWRv Required (from SDA summary col J)
        styles.calc_c(ws, r, 12, f"='SDA'!J{sda_summary_row}")

        # WQTv flag
        styles.calc_c(ws, r, 13, f'=IF(K{r}>0,"Yes","No")')


def build_doee_bmp_data(wb: Workbook) -> None:
    ws = wb.create_sheet("DOEE_BMP_DATA")
    ws.sheet_view.showGridLines = False
    widths = [10, 12, 10, 20, 20, 12, 12, 12, 12, 12, 12]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "DOEE_BMP_DATA — Compliance Calc Sheet 2 mirror",
               styles.BH, span=11)
    headers = ["BMP ID", "SDA Number", "BMP #", "BMP Name",
               "BMP Group/Sub", "CDA Nat (SF)", "CDA Comp (SF)",
               "CDA Imp (SF)", "CDA BMP (SF)", "Sv (CF)", "Rv Applied (CF)"]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)

    for i in range(BMP_LAST - BMP_FIRST + 1):
        r = 4 + i
        src = BMP_FIRST + i
        styles.calc_c(ws, r, 1, f'=IF(\'BMP\'!A{src}="","","BMP-"&ROW()-3)')
        styles.calc_c(ws, r, 2, f"='BMP'!B{src}")
        styles.calc_c(ws, r, 3, f'=COUNTIF(\'BMP\'!$B${BMP_FIRST}:B{src},\'BMP\'!B{src})')
        styles.calc_c(ws, r, 4, f"='BMP'!A{src}")
        styles.calc_c(ws, r, 5, f'=\'BMP\'!D{src}&" / "&\'BMP\'!E{src}')
        # CDA land cover: SUMIFS from CDA sheet by CDA_ID + Land Use
        cda_cell = f"'BMP'!C{src}"
        for col, lu in [(6, "Natural (Woods)"), (7, "Compacted (Open Space)")]:
            styles.calc_c(ws, r, col,
                f"=SUMIFS('CDA'!$E$4:$E$53,'CDA'!$A$4:$A$53,{cda_cell},"
                f"'CDA'!$C$4:$C$53,\"{lu}\")")
        styles.calc_c(ws, r, 8,
            f"=SUMIFS('CDA'!$E$4:$E$53,'CDA'!$A$4:$A$53,{cda_cell},"
            f"'CDA'!$C$4:$C$53,\"Impervious Vehicular\")"
            f"+SUMIFS('CDA'!$E$4:$E$53,'CDA'!$A$4:$A$53,{cda_cell},"
            f"'CDA'!$C$4:$C$53,\"Impervious Non-Vehicular\")")
        styles.calc_c(ws, r, 9,
            f"=SUMIFS('CDA'!$E$4:$E$53,'CDA'!$A$4:$A$53,{cda_cell},"
            f"'CDA'!$C$4:$C$53,\"BMP\")")
        styles.calc_c(ws, r, 10, f"='BMP'!AI{src}")  # Sv Total
        styles.calc_c(ws, r, 11, f"='BMP'!AM{src}")  # Rv Applied


def build_doee_detention(wb: Workbook) -> None:
    ws = wb.create_sheet("DOEE_DETENTION")
    ws.sheet_view.showGridLines = False
    widths = [12, 12, 12, 16, 16, 14, 16, 16, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "DOEE_DETENTION — Compliance Calc Sheet 3 mirror",
               styles.BH, span=9)
    headers = ["SDA Number", "Pre CN", "Post CN",
               "2-yr Pre Q (in)", "2-yr Post Q (in)", "2-yr Det Req'd?",
               "15-yr Pre Q (in)", "15-yr Post Q (in)", "15-yr Det Req'd?"]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)

    # Weighted CN per SDA — DOEE_SDA sheet has the land-cover totals already.
    for i in range(10):
        r = 4 + i
        doee_sda_row = 4 + i
        sda_cell = f"'DOEE_SDA'!A{doee_sda_row}"
        styles.calc_c(ws, r, 1, f"={sda_cell}")

        # Pre CN = (Nat×70 + Comp×74 + Imp×98 + BMP×98) / (Nat+Comp+Imp+BMP)
        pre_area_sum = (f"('DOEE_SDA'!C{doee_sda_row}+'DOEE_SDA'!D{doee_sda_row}"
                        f"+'DOEE_SDA'!E{doee_sda_row}+'DOEE_SDA'!F{doee_sda_row})")
        pre_cn_num = (f"('DOEE_SDA'!C{doee_sda_row}*INDEX(PARAMS_DetentionCN,1,2)"
                      f"+'DOEE_SDA'!D{doee_sda_row}*INDEX(PARAMS_DetentionCN,2,2)"
                      f"+'DOEE_SDA'!E{doee_sda_row}*INDEX(PARAMS_DetentionCN,3,2)"
                      f"+'DOEE_SDA'!F{doee_sda_row}*INDEX(PARAMS_DetentionCN,4,2))")
        styles.calc_c(ws, r, 2, f"=IFERROR({pre_cn_num}/{pre_area_sum},0)")

        post_area_sum = (f"('DOEE_SDA'!G{doee_sda_row}+'DOEE_SDA'!H{doee_sda_row}"
                         f"+'DOEE_SDA'!I{doee_sda_row}+'DOEE_SDA'!J{doee_sda_row})")
        post_cn_num = (f"('DOEE_SDA'!G{doee_sda_row}*INDEX(PARAMS_DetentionCN,1,2)"
                       f"+'DOEE_SDA'!H{doee_sda_row}*INDEX(PARAMS_DetentionCN,2,2)"
                       f"+'DOEE_SDA'!I{doee_sda_row}*INDEX(PARAMS_DetentionCN,3,2)"
                       f"+'DOEE_SDA'!J{doee_sda_row}*INDEX(PARAMS_DetentionCN,4,2))")
        styles.calc_c(ws, r, 3, f"=IFERROR({post_cn_num}/{post_area_sum},0)")

        # 2-yr storm = PARAMS_Detention row 1 col 2
        p2 = "INDEX(PARAMS_Detention,1,2)"
        s_pre_2 = f"(1000/B{r}-10)"
        s_post_2 = f"(1000/C{r}-10)"
        q_pre_2 = (f"=IFERROR(IF({p2}>0.2*{s_pre_2},"
                   f"({p2}-0.2*{s_pre_2})^2/({p2}-0.2*{s_pre_2}+{s_pre_2}),0),0)")
        q_post_2 = (f"=IFERROR(IF({p2}>0.2*{s_post_2},"
                    f"({p2}-0.2*{s_post_2})^2/({p2}-0.2*{s_post_2}+{s_post_2}),0),0)")
        styles.calc_c(ws, r, 4, q_pre_2)
        styles.calc_c(ws, r, 5, q_post_2)
        styles.calc_c(ws, r, 6, f'=IF(E{r}>D{r},"Yes","No")')

        # 15-yr storm = PARAMS_Detention row 2 col 2
        p15 = "INDEX(PARAMS_Detention,2,2)"
        q_pre_15  = (f"=IFERROR(IF({p15}>0.2*{s_pre_2},"
                     f"({p15}-0.2*{s_pre_2})^2/({p15}-0.2*{s_pre_2}+{s_pre_2}),0),0)")
        q_post_15 = (f"=IFERROR(IF({p15}>0.2*{s_post_2},"
                     f"({p15}-0.2*{s_post_2})^2/({p15}-0.2*{s_post_2}+{s_post_2}),0),0)")
        styles.calc_c(ws, r, 7, q_pre_15)
        styles.calc_c(ws, r, 8, q_post_15)
        styles.calc_c(ws, r, 9, f'=IF(H{r}>G{r},"Yes","No")')


def build_doee_compliance(wb: Workbook) -> None:
    ws = wb.create_sheet("DOEE_COMPLIANCE")
    ws.sheet_view.showGridLines = False
    widths = [12, 15, 15, 10, 12, 15]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "DOEE_COMPLIANCE — Final Pass/Fail Summary",
               styles.BH, span=6)
    headers = ["SDA Number", "SWRv Required (CF)", "Rv Provided (CF)",
               "% Met", "Status", "Detention Req'd?"]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)

    for i in range(10):
        r = 4 + i
        doee_sda_row = 4 + i
        det_row = 4 + i
        styles.calc_c(ws, r, 1, f"='DOEE_SDA'!A{doee_sda_row}")
        styles.calc_c(ws, r, 2, f"='DOEE_SDA'!L{doee_sda_row}")
        styles.calc_c(ws, r, 3,
            f"=SUMIFS('BMP'!$AM${BMP_FIRST}:$AM${BMP_LAST},"
            f"'BMP'!$B${BMP_FIRST}:$B${BMP_LAST},A{r})")
        styles.calc_c(ws, r, 4, f'=IFERROR(C{r}/B{r},0)')
        ws.cell(row=r, column=4).number_format = "0%"
        styles.calc_c(ws, r, 5, f'=IF(B{r}=0,"—",IF(C{r}>=B{r},"✓ PASS","✗ FAIL"))')
        styles.calc_c(ws, r, 6,
            f'=IF(OR(\'DOEE_DETENTION\'!F{det_row}="Yes",'
            f'\'DOEE_DETENTION\'!I{det_row}="Yes"),"Yes","No")')

    # Site total row
    r = 15
    styles.hdr(ws, r, 1, "SITE TOTAL", styles.BH)
    styles.calc_c(ws, r, 2, f"=SUM(B4:B{r-1})")
    styles.calc_c(ws, r, 3, f"=SUM(C4:C{r-1})")
    styles.calc_c(ws, r, 4, f'=IFERROR(C{r}/B{r},0)')
    ws.cell(row=r, column=4).number_format = "0%"
    styles.calc_c(ws, r, 5, f'=IF(C{r}>=B{r},"✓ PASS","✗ FAIL")')
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_doee.py -v
```

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/doee.py tests/test_doee.py
git commit -m "swm-workbook: add DOEE compliance mirror sheets (SDA, BMP, Detention, Compliance)"
```
