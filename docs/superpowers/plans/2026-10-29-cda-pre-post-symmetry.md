# CDA Pre/Post Symmetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the `CDA` sheet in `SW_Required_Provided_DOEE_EISA438.xlsx` from a 9-column single-area layout to a 13-column pre/post-mirror of `SDA`. Repoint existing downstream consumers (`workbook/builders/*`, `summary_calculator/src/*`, `populator/src/*`) to the new post-development column positions. Add a new BMP/CDA-level detention sheet `DOEE_DETENTION_BMP` as the first consumer of the Pre CDA columns.

**Architecture:** Thin schema change, deep fan-out. Each builder/mjs file touched independently with its own test. TDD throughout. Keep the summary block's shape identical (only its area-source SUMIFS shifts from col E → col G). Rename `cda.withinLodSf` → `cda.postIn` globally in JS.

**Tech Stack:** Python 3.11, openpyxl 3.x, Node 20+ built-in test runner, SheetJS, JSZip.

**Spec:** `docs/superpowers/specs/2026-10-29-cda-pre-post-symmetry-design.md`

**Branch:** This plan executes on `feat/populator` where the spec already lives. (The spec section 7 suggested a dedicated branch; executing in-place keeps the populator mapping updates and the CDA parse change in one atomic diff. If you prefer branch isolation, cherry-pick commits `becda02` + `a7b7349` onto a new branch off `main` before starting.)

---

## File Structure

### Modified

| File | Change |
|---|---|
| `workbook/builders/cda.py` | Full rewrite — 13-column layout, four SWRv output columns, updated summary SUMIFS |
| `workbook/builders/bmp.py` | `_cda_dominant_hsg_formula`: SUMIFS source col `$E` → `$G` |
| `workbook/builders/doee.py` | `DOEE_BMP_DATA` five SUMIFS: `'CDA'!$E` → `'CDA'!$G`; add `build_doee_detention_bmp` + user note on both detention sheets |
| `workbook/__main__.py` | Wire `doee.build_doee_detention_bmp(wb)` after `doee.build_doee_detention(wb)` |
| `workbook/builders/correct_mep_summary.py` | CDA within/outside SUMIFS: `$E` → `$G`, `$F` → `$H` |
| `workbook/sample.py` | CDA area writes: `column=5` → `column=7` |
| `summary_calculator/src/parse.mjs` | `parseCda` returns `{cdaId, sdaId, landUse, hsg, preIn, preOut, postIn, postOut}` |
| `summary_calculator/src/calc.mjs` | `cda.withinLodSf` → `cda.postIn` |
| `summary_calculator/src/ui.mjs` | Same rename, 2 call sites |
| `summary_calculator/src/render.mjs` | Rename + SDA/CDA Summary CDA block gains Pre and Post Within LOD columns |
| `summary_calculator/tests/parse.test.mjs` | Updated CDA test assertions |
| `summary_calculator/tests/render.test.mjs` | Updated fixtures (`withinLodSf` → `postIn`) |
| `summary_calculator/tests/fixtures/minnesota-ave.xlsx` | Regenerated from new sample.py |
| `summary_calculator/summary-calculator.html` | Rebuilt dist |
| `populator/src/parse.mjs` | Mirror of updated summary_calculator parse |
| `populator/src/mappings/general-retention.mjs` | `c.withinLodSf` → `c.postIn` in `_sumCdaByLandUse` |
| `populator/tests/fixtures/minnesota-ave.xlsx` | Regenerated |
| `populator/tests/mappings/general-retention.test.mjs` | Golden-cell assertions updated if any shifted |

### Not changed

- `workbook/calculations.py` — pure math, no sheet-column coupling.
- `workbook/builders/sda.py` — SDA layout unchanged.
- `workbook/builders/eisa_direct.py`, `eisa_tr55.py` — consume SDA only.
- `summary_calculator/src/styles.css`, `build.js` — unaffected.
- Populator `ddot-mep.mjs` — audited; it does not read CDA land-cover columns. Verify in Task 09.

---

## Task 01: Rewrite `workbook/builders/cda.py` to 13-column pre/post layout

**Files:**
- Modify: `workbook/builders/cda.py` (full rewrite of `build_cda_sheet`)
- Modify: `tests/test_cda.py` (update existing tests, add new ones)

- [ ] **Step 1: Update `tests/test_cda.py` to assert the new 13-column layout**

Replace the entire contents of `tests/test_cda.py` with:

```python
import pytest
import openpyxl

from workbook.builders import params, project, sda, cda


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    return w


def test_cda_sheet_exists(wb):
    assert "CDA" in wb.sheetnames


def test_headers(wb):
    ws = wb["CDA"]
    expected = [
        "CDA_ID", "SDA_ID", "Land Use", "HSG",
        "Pre Within LOD (SF)", "Pre Outside LOD (SF)",
        "Post Within LOD (SF)", "Post Outside LOD (SF)",
        "Rv",
        "Pre CDA SWRv Within (CF)", "Pre CDA SWRv Outside (CF)",
        "Post CDA SWRv Within (CF)", "Post CDA SWRv Outside (CF)",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h, f"header col {i}"


def test_sda_id_dropdown_uses_named_range(wb):
    ws = wb["CDA"]
    dvs = ws.data_validations.dataValidation
    sda_dv = None
    for dv in dvs:
        if "B4" in str(dv.sqref):
            sda_dv = dv
            break
    assert sda_dv is not None
    assert "SDA_IDs" in sda_dv.formula1


def test_data_row_formulas(wb):
    ws = wb["CDA"]
    # Col I: Rv VLOOKUP.
    assert ws.cell(row=4, column=9).value == '=IFERROR(VLOOKUP(C4,PARAMS_Rv,2,FALSE),"")'
    # Cols J-M: SWRv Within/Outside for Pre (E,F) and Post (G,H), driven by Rv (I).
    assert ws.cell(row=4, column=10).value == "=IFERROR(E4*I4*PROJECT_Rainfall/12,0)"
    assert ws.cell(row=4, column=11).value == "=IFERROR(F4*I4*PROJECT_Rainfall/12,0)"
    assert ws.cell(row=4, column=12).value == "=IFERROR(G4*I4*PROJECT_Rainfall/12,0)"
    assert ws.cell(row=4, column=13).value == "=IFERROR(H4*I4*PROJECT_Rainfall/12,0)"


def test_summary_block_cda_ids_pregenerated(wb):
    ws = wb["CDA"]
    found_ids = set()
    for r in range(1, 100):
        v = ws.cell(row=r, column=1).value
        if isinstance(v, str) and v.startswith("CDA-"):
            found_ids.add(v)
    assert "CDA-1" in found_ids
    assert "CDA-10" in found_ids


def test_summary_pulls_post_within_lod(wb):
    ws = wb["CDA"]
    # With n_rows=50: data rows 4-53, summary header at row 56, data at rows 58-67.
    assert ws.cell(row=56, column=3).value == "Total CDA Within LOD (SF) (post)"
    # Col C of first summary row (row 58) = SUMIFS of col G (post within).
    assert ws.cell(row=58, column=3).value == "=SUMIFS($G$4:$G$53,$A$4:$A$53,A58)"
    # Col D = Max BMP Credit — unchanged formula.
    assert ws.cell(row=58, column=4).value == "=C58*1.7/12"


def test_cda_ids_named_range_unchanged(wb):
    assert "CDA_IDs" in wb.defined_names
    assert "$A$58:$A$67" in wb.defined_names["CDA_IDs"].value
```

- [ ] **Step 2: Run test to verify failure**

```
pytest tests/test_cda.py -v
```

Expected: `test_headers`, `test_data_row_formulas`, `test_summary_pulls_post_within_lod` FAIL (header has 9 cols, formulas on cols G-I not J-M, summary pulls from E not G).

- [ ] **Step 3: Rewrite `workbook/builders/cda.py`**

Replace the file contents with:

```python
"""Build the CDA sheet — contributing drainage areas with pre/post land cover.

Mirrors the SDA sheet's area-column pattern: Pre Within/Outside LOD + Post
Within/Outside LOD. Downstream calcs (BMP sizing, DOEE_BMP_DATA, MEP summary)
use the Post columns. Pre columns are retained for future record-keeping
exports and audit history.
"""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles
from workbook.builders.sda import LAND_USES


HEADERS = [
    "CDA_ID", "SDA_ID", "Land Use", "HSG",
    "Pre Within LOD (SF)", "Pre Outside LOD (SF)",
    "Post Within LOD (SF)", "Post Outside LOD (SF)",
    "Rv",
    "Pre CDA SWRv Within (CF)", "Pre CDA SWRv Outside (CF)",
    "Post CDA SWRv Within (CF)", "Post CDA SWRv Outside (CF)",
]

N_SUMMARY_ROWS = 10


def build_cda_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("CDA")
    ws.sheet_view.showGridLines = False

    widths = [14, 12, 24, 8, 14, 14, 14, 14, 8, 14, 14, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "CDA — Contributing Drainage Areas (one row per CDA × Land Use × HSG)",
               styles.BH, span=13)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    for r in range(data_start, data_end + 1):
        # Inputs: A..H (CDA_ID, SDA_ID, Land Use, HSG, Pre In, Pre Out, Post In, Post Out).
        for c in range(1, 9):
            styles.inp(ws, r, c)
        # I: Rv VLOOKUP.
        styles.calc_c(ws, r, 9, f'=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")')
        # J-M: SWRv Within/Outside for Pre (E,F) and Post (G,H).
        styles.calc_c(ws, r, 10, f"=IFERROR(E{r}*I{r}*PROJECT_Rainfall/12,0)")
        styles.calc_c(ws, r, 11, f"=IFERROR(F{r}*I{r}*PROJECT_Rainfall/12,0)")
        styles.calc_c(ws, r, 12, f"=IFERROR(G{r}*I{r}*PROJECT_Rainfall/12,0)")
        styles.calc_c(ws, r, 13, f"=IFERROR(H{r}*I{r}*PROJECT_Rainfall/12,0)")

    dv_sda = DataValidation(type="list", formula1="=SDA_IDs",
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_sda)
    dv_sda.sqref = f"B{data_start}:B{data_end}"

    dv_lu = DataValidation(type="list", formula1='"' + ",".join(LAND_USES) + '"',
                           allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_lu)
    dv_lu.sqref = f"C{data_start}:C{data_end}"

    dv_hsg = DataValidation(type="list", formula1='"A,B,C,D"',
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_hsg)
    dv_hsg.sqref = f"D{data_start}:D{data_end}"

    # ── Summary block ──
    sum_header_row = data_end + 3
    styles.hdr(ws, sum_header_row, 1,
               "CDA Summary — Max BMP Credit per CDA (DOEE 1.7\" cap)",
               styles.BH, span=13)
    sum_hdrs = [
        "CDA_ID", "SDA_ID",
        "Total CDA Within LOD (SF) (post)",
        "Max BMP Credit (CF)",
    ]
    sum_row = sum_header_row + 1
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1
    sum_data_end = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        styles.lbl(ws, r, 1, f"CDA-{i+1}", styles.BL, bold=True)
        styles.calc_c(ws, r, 2,
                      f'=IFERROR(INDEX($B${data_start}:$B${data_end},'
                      f'MATCH(A{r},$A${data_start}:$A${data_end},0)),"")')
        # Post Within LOD aggregate — SUMIFS on col G (not E).
        styles.calc_c(ws, r, 3,
                      f'=SUMIFS($G${data_start}:$G${data_end},'
                      f'$A${data_start}:$A${data_end},A{r})')
        styles.calc_c(ws, r, 4, f"=C{r}*1.7/12")

    wb.defined_names.add(DefinedName(
        "CDA_IDs",
        attr_text=f"'CDA'!$A${sum_data_start}:$A${sum_data_end}",
    ))

    styles.apply_top_divider(ws, sum_header_row, 1, 13)
    styles.apply_bottom_divider(ws, sum_data_end, 1, 4)
```

- [ ] **Step 4: Run test to verify pass**

```
pytest tests/test_cda.py -v
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```
git add workbook/builders/cda.py tests/test_cda.py
git commit -m "workbook: expand CDA sheet to pre/post land-cover columns"
```

---

## Task 02: Repoint `bmp.py` + `doee.py` + `correct_mep_summary.py` to new CDA columns

**Files:**
- Modify: `workbook/builders/bmp.py` (`_cda_dominant_hsg_formula`: SUMIFS source col `$E` → `$G`)
- Modify: `workbook/builders/doee.py` (`DOEE_BMP_DATA` five SUMIFS: `'CDA'!$E` → `'CDA'!$G`)
- Modify: `workbook/builders/correct_mep_summary.py` (two SUMIFS: `$E` → `$G`, `$F` → `$H`)
- Modify: `tests/test_bmp.py`, `tests/test_doee.py`, `tests/test_correct_mep_summary.py` (one new assertion each)

- [ ] **Step 1: Discover the actual sheet name produced by `correct_mep_summary.build_correct_mep_summary`**

Before writing the MEP summary test, confirm the sheet title:

```
python -c "from workbook.__main__ import build_workbook; print([s for s in build_workbook().sheetnames if 'MEP' in s])"
```

Note the exact sheet name returned (use it verbatim in the test below as `MEP_SHEET`).

- [ ] **Step 2: Add failing test to `tests/test_bmp.py`**

Append to `tests/test_bmp.py`:

```python
from workbook.builders.bmp import _cda_dominant_hsg_formula


def test_cda_dominant_hsg_sumifs_reads_post_within_column():
    """Ksat HSG lookup must SUMIFS CDA's post-within column (G), not pre-within (E)."""
    formula = _cda_dominant_hsg_formula("C4")
    assert "'CDA'!$G$4:$G$53" in formula
    assert "'CDA'!$E$4:$E$53" not in formula
```

- [ ] **Step 3: Add failing test to `tests/test_doee.py`**

Append to `tests/test_doee.py`:

```python
import openpyxl
from workbook.builders import params, project, sda, cda, bmp, doee


def _full_wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    doee.build_doee_sda(w)
    doee.build_doee_bmp_data(w)
    return w


def test_doee_bmp_data_cda_sumifs_reads_post_within_column():
    """DOEE_BMP_DATA land-cover SUMIFS must point at CDA col G (post within), not E."""
    ws = _full_wb()["DOEE_BMP_DATA"]
    saw_g = False
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if not isinstance(v, str) or "'CDA'!" not in v:
                continue
            # Any 'CDA'! SUMIFS source range must be $G, never $E or $F.
            assert "'CDA'!$E$" not in v, f"stale pre-within $E at {c.coordinate}: {v}"
            if "'CDA'!$G$" in v:
                saw_g = True
    assert saw_g, "no CDA post-within SUMIFS emitted on DOEE_BMP_DATA"
```

- [ ] **Step 4: Add failing test to `tests/test_correct_mep_summary.py`**

Append to `tests/test_correct_mep_summary.py` (replace `MEP_SHEET` with the string you captured in step 1):

```python
import openpyxl
from workbook.builders import params, project, sda, cda, bmp, correct_mep_summary


MEP_SHEET = "Correct MEP Summary"  # replace with value from Task 02 Step 1


def _mep_wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    correct_mep_summary.build_correct_mep_summary(w)
    return w


def test_correct_mep_summary_cda_sumifs_use_post_columns():
    """AC/AD CDA within/outside SUMIFS must use post columns G/H, not pre E/F."""
    ws = _mep_wb()[MEP_SHEET]
    found_g = found_h = False
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if not isinstance(v, str) or "'CDA'!" not in v:
                continue
            if "'CDA'!$G$" in v:
                found_g = True
            if "'CDA'!$H$" in v:
                found_h = True
            assert "'CDA'!$E$" not in v, f"stale $E at {c.coordinate}: {v}"
            assert "'CDA'!$F$" not in v, f"stale $F at {c.coordinate}: {v}"
    assert found_g, "no CDA post-within SUMIFS emitted on MEP summary"
    assert found_h, "no CDA post-outside SUMIFS emitted on MEP summary"
```

- [ ] **Step 5: Run the three new tests to verify failure**

```
pytest tests/test_bmp.py::test_cda_dominant_hsg_sumifs_reads_post_within_column tests/test_doee.py::test_doee_bmp_data_cda_sumifs_reads_post_within_column tests/test_correct_mep_summary.py::test_correct_mep_summary_cda_sumifs_use_post_columns -v
```

Expected: three FAILs.

- [ ] **Step 6: Edit `workbook/builders/bmp.py`**

Change the `_cda_dominant_hsg_formula` SUMIFS source column from `$E` to `$G`:

```python
# bmp.py line ~29
def _sumifs(hsg: str) -> str:
    return (
        f"SUMIFS('CDA'!$G${CDA_D1}:$G${CDA_DL},"   # was $E
        f"'CDA'!$A${CDA_D1}:$A${CDA_DL},{cda_cell},"
        f"'CDA'!$D${CDA_D1}:$D${CDA_DL},\"{hsg}\")"
    )
```

- [ ] **Step 7: Edit `workbook/builders/doee.py`**

Change all five `'CDA'!$E$4:$E$53` references on lines 186-203 to `'CDA'!$G$4:$G$53`:

```python
# doee.py — DOEE_BMP_DATA CDA SUMIFS section (~lines 184-203)
styles.calc_c(ws, r, 8,
              f"=SUMIFS('CDA'!$G$4:$G$53,"
              f"'CDA'!$A$4:$A$53,{cda_cell},"
              f"'CDA'!$C$4:$C$53,\"Natural (Woods)\")")
styles.calc_c(ws, r, 9,
              f"=SUMIFS('CDA'!$G$4:$G$53,"
              f"'CDA'!$A$4:$A$53,{cda_cell},"
              f"'CDA'!$C$4:$C$53,\"Compacted (Open Space)\")")
styles.calc_c(ws, r, 10,
              f"=SUMIFS('CDA'!$G$4:$G$53,"
              f"'CDA'!$A$4:$A$53,{cda_cell},"
              f"'CDA'!$C$4:$C$53,\"Impervious Vehicular\")"
              f"+SUMIFS('CDA'!$G$4:$G$53,"
              f"'CDA'!$A$4:$A$53,{cda_cell},"
              f"'CDA'!$C$4:$C$53,\"Impervious Non-Vehicular\")")
styles.calc_c(ws, r, 11,
              f"=SUMIFS('CDA'!$G$4:$G$53,"
              f"'CDA'!$A$4:$A$53,{cda_cell},"
              f"'CDA'!$C$4:$C$53,\"BMP\")")
```

(Column indices 8-11 inferred from the source line numbers; preserve whatever the current code uses — the only change is `$E` → `$G`.)

- [ ] **Step 8: Edit `workbook/builders/correct_mep_summary.py`**

Change lines 596 and 600:

```python
# line ~596 — AC: Total BMP CDA within LOD → post column G
ws.cell(row=r, column=29, value=_guard(
    f"SUMIFS('CDA'!$G${CD1}:$G${CDL},'CDA'!$B${CD1}:$B${CDL},{a})", a))

# line ~600 — AD: Total BMP CDA outside LOD → post column H
ws.cell(row=r, column=30, value=_guard(
    f"SUMIFS('CDA'!$H${CD1}:$H${CDL},'CDA'!$B${CD1}:$B${CDL},{a})", a))
```

- [ ] **Step 9: Run tests to verify pass**

```
pytest tests/test_bmp.py tests/test_doee.py tests/test_correct_mep_summary.py -v
```

Expected: all tests PASS, including the three new ones added in steps 2-4.

- [ ] **Step 10: Commit**

```
git add workbook/builders/bmp.py workbook/builders/doee.py workbook/builders/correct_mep_summary.py tests/test_bmp.py tests/test_doee.py tests/test_correct_mep_summary.py
git commit -m "workbook: repoint CDA consumers to new post-development columns"
```

---

## Task 03: Add `DOEE_DETENTION_BMP` sheet (CDA-keyed) + user note on both detention sheets

**Files:**
- Modify: `workbook/builders/doee.py` (add `build_doee_detention_bmp` + inject user note into `build_doee_detention`)
- Modify: `workbook/__main__.py` (wire the new builder)
- Modify: `tests/test_doee.py` (add tests)

**Context:** Pre CDA columns are introduced in Task 01 for record-keeping. This task gives them their first consumer: a BMP-level detention compliance sheet mirroring the existing SDA-keyed `DOEE_DETENTION` but keyed by CDA_ID, so each proposed BMP's catchment gets its own pre-vs-post runoff check.

- [ ] **Step 1: Write failing test for new sheet existence, headers, and auto-populated formulas**

Append to `tests/test_doee.py`:

```python
def test_doee_detention_bmp_sheet_exists_with_11_cols():
    """New BMP/CDA-level detention sheet is emitted with the expected headers."""
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    doee.build_doee_sda(w)
    doee.build_doee_detention(w)
    doee.build_doee_detention_bmp(w)
    assert "DOEE_DETENTION_BMP" in w.sheetnames
    ws = w["DOEE_DETENTION_BMP"]
    expected = [
        "CDA Number", "BMP Name", "SDA Number",
        "Pre CN", "Post CN",
        "2-yr Pre Q (in)", "2-yr Post Q (in)", "2-yr Det Req'd?",
        "15-yr Pre Q (in)", "15-yr Post Q (in)", "15-yr Det Req'd?",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h, f"header col {i}"


def test_doee_detention_bmp_rows_fully_formula_driven():
    """Rows 4..13 should be CDA-1..CDA-10 labels in col A; cols B..K all formulas."""
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    doee.build_doee_sda(w)
    doee.build_doee_detention(w)
    doee.build_doee_detention_bmp(w)
    ws = w["DOEE_DETENTION_BMP"]
    for i in range(10):
        r = 4 + i
        assert ws.cell(row=r, column=1).value == f"CDA-{i+1}"
        for c in range(2, 12):
            v = ws.cell(row=r, column=c).value
            assert isinstance(v, str) and v.startswith("="), (
                f"row {r} col {c} should be a formula; got {v!r}"
            )


def test_doee_detention_bmp_pre_cn_uses_cda_col_e():
    """Pre CN composite must SUMIFS 'CDA'!$E (Pre Within LOD), not $G (Post)."""
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    doee.build_doee_sda(w)
    doee.build_doee_detention(w)
    doee.build_doee_detention_bmp(w)
    ws = w["DOEE_DETENTION_BMP"]
    pre_cn = ws.cell(row=4, column=4).value  # Pre CN first row
    assert "'CDA'!$E$4:$E$53" in pre_cn
    assert "'CDA'!$G" not in pre_cn
    post_cn = ws.cell(row=4, column=5).value
    assert "'CDA'!$G$4:$G$53" in post_cn
    assert "'CDA'!$E$4:$E$53" not in post_cn


def test_doee_detention_sheets_have_user_note():
    """Both DOEE_DETENTION (SDA) and DOEE_DETENTION_BMP (CDA) carry a user note on row 2."""
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    doee.build_doee_sda(w)
    doee.build_doee_detention(w)
    doee.build_doee_detention_bmp(w)
    for sheet in ("DOEE_DETENTION", "DOEE_DETENTION_BMP"):
        note = w[sheet].cell(row=2, column=1).value
        assert note and "Within LOD" in note and "project-specific" in note.lower(), (
            f"{sheet} row-2 note missing or incomplete: {note!r}"
        )
```

- [ ] **Step 2: Run tests to verify failure**

```
pytest tests/test_doee.py -k "detention_bmp or detention_sheets_have_user_note" -v
```

Expected: 4 FAILs (sheet not created, `build_doee_detention_bmp` not defined).

- [ ] **Step 3: Add constants + user-note helper at the top of `workbook/builders/doee.py`**

Just after the existing `SDA_SUMMARY_FIRST = 58` line, add:

```python
# CDA data table range (used by DOEE_DETENTION_BMP SUMIFS).
CDA_FIRST = 4
CDA_LAST = 53
# CDA summary data starts at row 58 when n_rows=50 (mirrors SDA_SUMMARY_FIRST layout).
CDA_SUMMARY_FIRST = 58

DETENTION_USER_NOTE = (
    "Note: Pre/Post CN composites and runoff depths use land cover "
    "Within LOD per DOEE compliance convention. Physical catchment runoff "
    "may also include flow from Outside LOD or existing PROW; project-specific "
    "exceptions apply. For projects where Outside-LOD contribution is material "
    "(offsite inflow, retrofit along existing ROW, etc.), consult the project's "
    "drainage study and adjust detention sizing accordingly."
)
```

- [ ] **Step 4: Inject the user note into the existing `build_doee_detention`**

Inside `build_doee_detention`, immediately after `styles.hdr(ws, 1, 1, "DOEE_DETENTION — Compliance Calc Sheet 3 mirror", styles.BH, span=9)` (line ~247) and the `ws.row_dimensions[1].height = 24` line, insert:

```python
    # User note on row 2 (spans A-I).
    styles.lbl(ws, 2, 1, DETENTION_USER_NOTE, styles.BL, bold=False)
    ws.cell(row=2, column=1).alignment = openpyxl.styles.Alignment(
        wrap_text=True, vertical="top"
    )
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=9)
    ws.row_dimensions[2].height = 48
```

(Adjust imports in `doee.py` as needed: `from openpyxl.styles import Alignment` already imported? If not, add it at the top.)

- [ ] **Step 5: Add `build_doee_detention_bmp` to `workbook/builders/doee.py`**

Append to the file, after `build_doee_detention`:

```python
def build_doee_detention_bmp(wb: Workbook) -> None:
    """Add DOEE_DETENTION_BMP — BMP/CDA-level detention compliance (one row per CDA).

    Fully auto-populated: col A is the hard-coded CDA-N label, every other
    column is a formula pulling from the CDA, BMP, and PARAMS sheets.
    """
    ws = wb.create_sheet("DOEE_DETENTION_BMP")
    ws.sheet_view.showGridLines = False

    widths = [12, 18, 12, 10, 10, 14, 14, 14, 14, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "DOEE_DETENTION_BMP — BMP/CDA-level detention compliance",
               styles.BH, span=11)
    ws.row_dimensions[1].height = 24

    # User note on row 2 (spans A-K).
    styles.lbl(ws, 2, 1, DETENTION_USER_NOTE, styles.BL, bold=False)
    ws.cell(row=2, column=1).alignment = openpyxl.styles.Alignment(
        wrap_text=True, vertical="top"
    )
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=11)
    ws.row_dimensions[2].height = 48

    headers = [
        "CDA Number", "BMP Name", "SDA Number",
        "Pre CN", "Post CN",
        "2-yr Pre Q (in)", "2-yr Post Q (in)", "2-yr Det Req'd?",
        "15-yr Pre Q (in)", "15-yr Post Q (in)", "15-yr Det Req'd?",
    ]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    cda_summary_last = CDA_SUMMARY_FIRST + 10 - 1  # row 67

    def _sumifs_cda_landuse(area_col: str, cda_cell: str, land_use: str) -> str:
        return (
            f"SUMIFS('CDA'!${area_col}${CDA_FIRST}:${area_col}${CDA_LAST},"
            f"'CDA'!$A${CDA_FIRST}:$A${CDA_LAST},{cda_cell},"
            f"'CDA'!$C${CDA_FIRST}:$C${CDA_LAST},\"{land_use}\")"
        )

    def _cn_composite(area_col: str, cda_cell: str) -> str:
        """Area-weighted CN composite formula for the given CDA area column."""
        nat  = _sumifs_cda_landuse(area_col, cda_cell, "Natural (Woods)")
        comp = _sumifs_cda_landuse(area_col, cda_cell, "Compacted (Open Space)")
        imp  = (_sumifs_cda_landuse(area_col, cda_cell, "Impervious Vehicular")
                + "+" + _sumifs_cda_landuse(area_col, cda_cell, "Impervious Non-Vehicular"))
        bmp_ = _sumifs_cda_landuse(area_col, cda_cell, "BMP")
        total = f"({nat}+{comp}+{imp}+{bmp_})"
        num = (f"({nat}*INDEX(PARAMS_DetentionCN,1,2)"
               f"+{comp}*INDEX(PARAMS_DetentionCN,2,2)"
               f"+({imp})*INDEX(PARAMS_DetentionCN,3,2)"
               f"+{bmp_}*INDEX(PARAMS_DetentionCN,4,2))")
        return f"=IFERROR({num}/{total},0)"

    for i in range(10):
        r = 4 + i
        cda_cell = f"A{r}"

        # Col A: hard-coded CDA label.
        styles.lbl(ws, r, 1, f"CDA-{i+1}", styles.BL, bold=True)

        # Col B: BMP Name — reverse lookup by CDA_ID into BMP col A.
        styles.calc_c(ws, r, 2,
                      f"=IFERROR(INDEX('BMP'!$A$4:$A$53,"
                      f"MATCH({cda_cell},'BMP'!$C$4:$C$53,0)),\"\")")

        # Col C: SDA Number — from CDA summary block col B.
        styles.calc_c(ws, r, 3,
                      f"=IFERROR(INDEX('CDA'!$B${CDA_SUMMARY_FIRST}:$B${cda_summary_last},"
                      f"MATCH({cda_cell},'CDA'!$A${CDA_SUMMARY_FIRST}:$A${cda_summary_last},0)),\"\")")

        # Col D: Pre CN composite — CDA col E (Pre Within LOD).
        styles.calc_c(ws, r, 4, _cn_composite("E", cda_cell))

        # Col E: Post CN composite — CDA col G (Post Within LOD).
        styles.calc_c(ws, r, 5, _cn_composite("G", cda_cell))

        p2  = "INDEX(PARAMS_Detention,1,2)"
        p15 = "INDEX(PARAMS_Detention,2,2)"
        s_pre  = f"(1000/D{r}-10)"
        s_post = f"(1000/E{r}-10)"

        # F, G: 2-yr Pre Q, Post Q.
        styles.calc_c(ws, r, 6,
                      f"=IFERROR(IF({p2}>0.2*{s_pre},"
                      f"({p2}-0.2*{s_pre})^2/({p2}+0.8*{s_pre}),0),0)")
        styles.calc_c(ws, r, 7,
                      f"=IFERROR(IF({p2}>0.2*{s_post},"
                      f"({p2}-0.2*{s_post})^2/({p2}+0.8*{s_post}),0),0)")
        # H: 2-yr Det Req'd?
        styles.calc_c(ws, r, 8, f'=IF(G{r}>F{r},"Yes","No")')

        # I, J: 15-yr Pre Q, Post Q.
        styles.calc_c(ws, r, 9,
                      f"=IFERROR(IF({p15}>0.2*{s_pre},"
                      f"({p15}-0.2*{s_pre})^2/({p15}+0.8*{s_pre}),0),0)")
        styles.calc_c(ws, r, 10,
                      f"=IFERROR(IF({p15}>0.2*{s_post},"
                      f"({p15}-0.2*{s_post})^2/({p15}+0.8*{s_post}),0),0)")
        # K: 15-yr Det Req'd?
        styles.calc_c(ws, r, 11, f'=IF(J{r}>I{r},"Yes","No")')

    last_row = 4 + 10 - 1
    styles.apply_right_divider(ws, 3, 3, last_row)   # right of col C (ID block)
    styles.apply_right_divider(ws, 5, 3, last_row)   # right of col E (CN block)
    styles.apply_right_divider(ws, 8, 3, last_row)   # right of col H (2-yr block)
```

Make sure `import openpyxl` is at the top of `doee.py` (for `openpyxl.styles.Alignment`). If only `from openpyxl import Workbook` is present, add `import openpyxl` alongside or `from openpyxl.styles import Alignment` and use `Alignment(...)` directly.

- [ ] **Step 6: Wire the new builder into `workbook/__main__.py`**

Edit `workbook/__main__.py` — add `build_doee_detention_bmp` after the existing `doee.build_doee_detention(wb)` line:

```python
    doee.build_doee_detention(wb)
    doee.build_doee_detention_bmp(wb)
    doee.build_doee_compliance(wb)
```

- [ ] **Step 7: Run tests to verify pass**

```
pytest tests/test_doee.py -v
```

Expected: all tests PASS, including the four new ones.

- [ ] **Step 8: Smoke-check by rebuilding the full workbook**

```
python -m workbook
python -c "
import openpyxl
wb = openpyxl.load_workbook('SW_Required_Provided_DOEE_EISA438.xlsx')
assert 'DOEE_DETENTION_BMP' in wb.sheetnames
ws = wb['DOEE_DETENTION_BMP']
print('row 2 note:', ws['A2'].value[:80], '...')
print('row 4 col A:', ws['A4'].value)
print('row 4 col B:', ws['B4'].value[:60], '...')
print('row 4 col D (Pre CN):', ws['D4'].value[:80], '...')
"
```

Expected: no errors; row-2 note present; row-4 col-A is `CDA-1`; cols B and D are formulas.

- [ ] **Step 9: Commit**

```
git add workbook/builders/doee.py workbook/__main__.py tests/test_doee.py
git commit -m "workbook: add DOEE_DETENTION_BMP sheet for per-BMP detention compliance"
```

---

## Task 04: Update `workbook/sample.py` to write to the new Post Within column

**Files:**
- Modify: `workbook/sample.py:188` (single cell write)

- [ ] **Step 1: Edit `workbook/sample.py`**

Change the CDA area write in `_fill_cda` from column 5 to column 7:

```python
# sample.py line ~188
ws.cell(row=row, column=7).value = cda_area  # Post Within LOD
```

Leave columns 5 and 6 (Pre Within/Outside) blank — per spec, pre-development land cover inside the proposed CDA footprint is "unknown or not meaningful" for the Minnesota Ave sample.

- [ ] **Step 2: Verify by regenerating the sample**

```
python -m workbook.sample
```

Expected: `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx` written at the project root. No errors.

- [ ] **Step 3: Spot-check the regenerated CDA sheet**

```
python -c "
import openpyxl
wb = openpyxl.load_workbook('SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx')
ws = wb['CDA']
for row in range(4, 10):
    print([ws.cell(row=row, column=c).value for c in range(1, 14)])
"
```

Expected: columns E and F (Pre) are `None`, column G has the CDA area, column H is `None`, columns J-M show computed SWRv values.

- [ ] **Step 4: Commit**

```
git add workbook/sample.py SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx
git commit -m "workbook: write CDA sample area to new Post Within LOD column"
```

(Commit the regenerated .xlsx too — the sample workbook is a tracked artifact that other tests consume as a reference.)

---

## Task 05: Regenerate blank template and smoke-verify

**Files:**
- Modify: `SW_Required_Provided_DOEE_EISA438.xlsx` (regenerated)

- [ ] **Step 1: Rebuild blank**

```
python -m workbook
```

Expected: `SW_Required_Provided_DOEE_EISA438.xlsx` written. No tracebacks.

- [ ] **Step 2: Verify no `#REF!` or `#NAME?` errors by inspecting formulas**

```
python -c "
import openpyxl
wb = openpyxl.load_workbook('SW_Required_Provided_DOEE_EISA438.xlsx')
for sheet_name in ['CDA','BMP','DOEE_BMP_DATA','Correct MEP Summary']:
    if sheet_name not in wb.sheetnames:
        continue
    ws = wb[sheet_name]
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if isinstance(v, str) and 'CDA' in v:
                assert '\$E\$' not in v or 'CDA' not in sheet_name, f'{sheet_name} {c.coordinate}: {v}'
"
```

Expected: no assertion error. (Script sanity-checks that no CDA-referencing formula still points at col E, which would be the stale pre column.)

- [ ] **Step 3: Verify the sample loads in SheetJS (dry run)**

```
cd summary_calculator
node -e "
const fs = require('fs');
const XLSX = require('./lib/sheetjs-bundle.js');
const buf = fs.readFileSync('../SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx');
const wb = XLSX.read(new Uint8Array(buf), {type:'array'});
console.log('Sheets:', wb.SheetNames);
console.log('CDA!G4:', wb.Sheets.CDA['G4']?.v);
console.log('CDA!E4:', wb.Sheets.CDA['E4']?.v);
"
cd ..
```

Expected: `Sheets:` list includes `CDA`; `CDA!G4` is a number (the sample CDA area); `CDA!E4` is `undefined` (pre column empty).

- [ ] **Step 4: Commit**

```
git add SW_Required_Provided_DOEE_EISA438.xlsx
git commit -m "workbook: regenerate blank template with new CDA layout"
```

---

## Task 06: Expand `summary_calculator/src/parse.mjs` `parseCda`

**Files:**
- Modify: `summary_calculator/src/parse.mjs:80-97, 220-240`
- Modify: `summary_calculator/tests/fixtures/minnesota-ave.xlsx` (copy regenerated sample)

- [ ] **Step 1: Copy regenerated sample into test fixtures**

```
cp SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx summary_calculator/tests/fixtures/minnesota-ave.xlsx
```

- [ ] **Step 2: Write failing test for new `parseCda` shape**

Edit `summary_calculator/tests/parse.test.mjs` — replace the existing `parse: CDA rows` test:

```js
test('parse: CDA rows have pre/post land-cover fields', () => {
  const { cdas } = parseWorkbook(wb);
  assert.ok(cdas.length >= 1);
  const first = cdas[0];
  assert.ok(first.cdaId, 'cdaId required');
  assert.ok(first.sdaId, 'sdaId required');
  assert.equal(typeof first.hsg, 'string');
  assert.equal(typeof first.preIn,  'number');
  assert.equal(typeof first.preOut, 'number');
  assert.equal(typeof first.postIn, 'number');
  assert.equal(typeof first.postOut,'number');
  // Sample populates only Post Within — Pre columns are 0.
  assert.equal(first.preIn,  0);
  assert.equal(first.preOut, 0);
  assert.ok(first.postIn > 0, 'sample CDA Post Within LOD must be populated');
});
```

- [ ] **Step 3: Run test to verify failure**

```
cd summary_calculator
node --test tests/parse.test.mjs
```

Expected: FAIL — `preIn is not a number`.

- [ ] **Step 4: Update `summary_calculator/src/parse.mjs`**

Replace `parseCda` and its JSDoc:

```js
// CDA layout (from workbook/builders/cda.py — 13 cols A..M):
//   A=cdaId, B=sdaId, C=landUse, D=hsg,
//   E=preIn, F=preOut, G=postIn, H=postOut,
//   I=Rv (calc), J-M=SWRv outputs (calc).
// Parser reads A, B, C, D, E, F, G, H only; downstream calcs recompute SWRv.
function parseCda(sheet) {
  const rows = [];
  for (let r = DATA_FIRST_ROW; r <= DATA_LAST_ROW; r++) {
    const cdaId = cell(sheet, r, 1);
    if (!cdaId) break;
    rows.push({
      cdaId,
      sdaId:  cell(sheet, r, 2),
      landUse: cell(sheet, r, 3),
      hsg:    cell(sheet, r, 4) || 'D',
      preIn:  cell(sheet, r, 5) || 0,
      preOut: cell(sheet, r, 6) || 0,
      postIn: cell(sheet, r, 7) || 0,
      postOut: cell(sheet, r, 8) || 0,
    });
  }
  return rows;
}
```

Also update the `parseWorkbook` JSDoc return-type line for `cdas`:

```js
 *   cdas:    Array<{cdaId, sdaId, landUse, hsg, preIn, preOut, postIn, postOut}>,
```

- [ ] **Step 5: Run test to verify pass**

```
node --test tests/parse.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```
cd ..
git add summary_calculator/src/parse.mjs summary_calculator/tests/parse.test.mjs summary_calculator/tests/fixtures/minnesota-ave.xlsx
git commit -m "summary_calculator: parseCda returns pre/post land-cover fields"
```

---

## Task 07: Rename `withinLodSf` → `postIn` across `summary_calculator/src/`

**Files:**
- Modify: `summary_calculator/src/calc.mjs` (none directly — verify via grep; renames live in ui.mjs and render.mjs)
- Modify: `summary_calculator/src/ui.mjs:52,57,61`
- Modify: `summary_calculator/src/render.mjs:164,198,241`

- [ ] **Step 1: Grep to confirm the three sites in `ui.mjs`**

```
grep -n withinLodSf summary_calculator/src/ui.mjs
```

Expected: three matches on lines 52, 57, 61 inside `renderBmp` or equivalent.

- [ ] **Step 2: Edit `summary_calculator/src/ui.mjs`**

Replace every `cda.withinLodSf` with `cda.postIn`. The three call sites look like:

```js
// line 52 — unchanged
const cda = cdas.find(c => c.cdaId === bmp.cdaId);

// line 57
rv = Math.min(sv * design.retMultiplier, cda ? maxBmpCredit(cda.postIn).value : Infinity);

// line 61
rv = Math.min(sv * design.retMultiplier, cda ? maxBmpCredit(cda.postIn).value : Infinity);
```

- [ ] **Step 3: Edit `summary_calculator/src/render.mjs`**

Line 164 — update the CDA row mapping in the SDA/CDA Summary (will be extended further in Task 07; for this task just rename the field):

```js
const cdaRows = cdas.map(c => [c.cdaId, c.sdaId, c.landUse, fmtN(c.postIn)]);
```

Lines 198 and 241 — update the `cdaArea` extraction:

```js
const cdaArea = cda ? cda.postIn : 0;
```

- [ ] **Step 4: Run tests**

```
cd summary_calculator
node --test tests/calc.test.mjs tests/render.test.mjs
```

Expected: `render.test.mjs` fails because its fixture CDA rows still use `withinLodSf`. Proceed to step 5.

- [ ] **Step 5: Update `summary_calculator/tests/render.test.mjs`**

Rename every `withinLodSf:` in fixture objects to `postIn:` (two sites, lines 96 and 118):

```js
const cdas = [{ cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular', postIn: 100 }];
// …
const cdas = [{ cdaId: 'CDA-2', sdaId: 'SDA-2', landUse: 'Impervious Vehicular', postIn: 1000 }];
```

- [ ] **Step 6: Run tests to verify pass**

```
node --test tests/calc.test.mjs tests/render.test.mjs tests/parity.test.mjs
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```
cd ..
git add summary_calculator/src/ui.mjs summary_calculator/src/render.mjs summary_calculator/tests/render.test.mjs
git commit -m "summary_calculator: rename cda.withinLodSf to cda.postIn"
```

---

## Task 08: Extend SDA/CDA Summary CDA block to show Pre + Post Within LOD

**Files:**
- Modify: `summary_calculator/src/render.mjs:160-170` (the `renderSdaCdaSummary` CDA table)
- Modify: `summary_calculator/tests/render.test.mjs` (assert new column headers)

- [ ] **Step 1: Write failing test**

Append to `summary_calculator/tests/render.test.mjs` (replacing or supplementing the existing CDA assertion in the `renderSdaCdaSummary` test):

```js
test('renderSdaCdaSummary: CDA block shows Pre and Post Within LOD columns', () => {
  const sampleProject = { name: 'Test', number: 'T-1', rainfallIn: 1.2, trigger: 'MLD' };
  const sdas = [{
    sdaId: 'SDA-1', landUse: 'Impervious Vehicular', hsg: 'B',
    preIn: 100, preOut: 0, postIn: 100, postOut: 0,
  }];
  const cdas = [{
    cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular', hsg: 'B',
    preIn: 50, preOut: 0, postIn: 150, postOut: 0,
  }];
  const pages = renderSdaCdaSummary(sampleProject, sdas, cdas);
  // Expect the CDA page to include both headers.
  const cdaPage = pages.find(p => p.includes('CDA-1'));
  assert.ok(cdaPage, 'CDA page present');
  assert.ok(cdaPage.includes('Pre Within LOD'),  'Pre column header present');
  assert.ok(cdaPage.includes('Post Within LOD'), 'Post column header present');
  // And the data cells for both.
  assert.ok(cdaPage.includes('>50<'),  'Pre value rendered');
  assert.ok(cdaPage.includes('>150<'), 'Post value rendered');
});
```

- [ ] **Step 2: Run test to verify failure**

```
cd summary_calculator
node --test tests/render.test.mjs
```

Expected: FAIL — the current CDA table has one area column, not two.

- [ ] **Step 3: Update `renderSdaCdaSummary` CDA block in `summary_calculator/src/render.mjs`**

Locate the block near line 160-170 that builds the CDA table (previously `const cdaRows = cdas.map(c => [c.cdaId, c.sdaId, c.landUse, fmtN(c.postIn)])`) and expand it:

```js
if (cdas.length) {
  const cdaHeaders = ['CDA_ID', 'SDA_ID', 'Land Use', 'Pre Within LOD (SF)', 'Post Within LOD (SF)'];
  const cdaRows = cdas.map(c => [
    c.cdaId,
    c.sdaId,
    c.landUse,
    fmtN(c.preIn),
    fmtN(c.postIn),
  ]);
  pages.push(renderTablePage({
    title: 'CDA — Contributing Drainage Areas',
    headers: cdaHeaders,
    rows: cdaRows,
    project,
  }));
}
```

(Adjust helper names — `renderTablePage` or whatever the existing helper is — to match the file's conventions.)

- [ ] **Step 4: Run tests to verify pass**

```
node --test tests/render.test.mjs
```

Expected: all tests in render.test.mjs PASS.

- [ ] **Step 5: Rebuild dist**

```
node build.js
```

Expected: `summary-calculator.html` regenerated (~2 MB range).

- [ ] **Step 6: Smoke-test the dist**

Open `summary_calculator/summary-calculator.html` in a browser (double-click or `file://`), drop the regenerated sample, verify the SDA/CDA Summary page's CDA block shows both Pre Within LOD and Post Within LOD columns.

- [ ] **Step 7: Commit**

```
cd ..
git add summary_calculator/src/render.mjs summary_calculator/tests/render.test.mjs summary_calculator/summary-calculator.html
git commit -m "summary_calculator: CDA summary block shows Pre and Post Within LOD"
```

---

## Task 09: Sync populator `parse.mjs` + rename in mappings

**Files:**
- Modify: `populator/src/parse.mjs` (overwrite with summary_calculator version)
- Modify: `populator/src/mappings/general-retention.mjs:228-235`

- [ ] **Step 1: Copy updated parse module**

```
cp summary_calculator/src/parse.mjs populator/src/parse.mjs
```

- [ ] **Step 2: Verify parse copy with a quick test run against existing populator fixtures**

```
cd populator
node --test tests/mappings/general-retention.test.mjs
```

Expected: FAIL — `c.withinLodSf` is undefined in `_sumCdaByLandUse` (field has been renamed).

- [ ] **Step 3: Update `populator/src/mappings/general-retention.mjs`**

Edit `_sumCdaByLandUse` (line ~228-234):

```js
// Sum a parsed CDA's postIn across rows matching cdaId + landUse list.
function _sumCdaByLandUse(cdas, cdaId, landUses) {
  if (!cdaId) return 0;
  const set = new Set(landUses);
  return cdas
    .filter(c => c.cdaId === cdaId && set.has(c.landUse))
    .reduce((n, c) => n + (c.postIn || 0), 0);
}
```

Also update the module-level comment block at the top of the file (around line 23) if it describes CDA shape — change `J-M = CDA Pre-Construction Land Cover` note's cell-source if it needs clarification. Current comment is about the DOEE target spreadsheet, not the parsed CDA — probably no change needed; skim the block and leave if unrelated.

- [ ] **Step 4: Audit `populator/src/mappings/ddot-mep.mjs` for CDA field reads**

```
grep -n "withinLodSf\|c\\.pre\|c\\.post" populator/src/mappings/ddot-mep.mjs
```

Expected: no `withinLodSf` matches. (If any show up, rename to `postIn` with the same pattern.)

- [ ] **Step 5: Run populator tests**

```
node --test tests/xlsx-surgical.test.mjs tests/mappings/general-retention.test.mjs tests/mappings/ddot-mep.test.mjs tests/populate.test.mjs
```

Expected: all PASS. If the Minnesota Ave fixture here is still the old-layout version, this task will fail on populate-reads; move to Task 09 first for the fixture refresh.

- [ ] **Step 6: Commit**

```
cd ..
git add populator/src/parse.mjs populator/src/mappings/general-retention.mjs
git commit -m "populator: sync parse.mjs and rename cda.withinLodSf to cda.postIn"
```

---

## Task 10: Regenerate populator fixture + verify mapping tests

**Files:**
- Modify: `populator/tests/fixtures/minnesota-ave.xlsx` (replace with new sample)
- Modify: `populator/tests/mappings/general-retention.test.mjs` (adjust any golden-cell assertions that shifted)

- [ ] **Step 1: Replace populator fixture with regenerated sample**

```
cp SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx populator/tests/fixtures/minnesota-ave.xlsx
```

- [ ] **Step 2: Run full populator test suite**

```
cd populator
node --test tests/xlsx-surgical.test.mjs tests/mappings/general-retention.test.mjs tests/mappings/ddot-mep.test.mjs tests/populate.test.mjs
```

Expected: tests either PASS or FAIL with cell-value mismatches on the General Retention or DDOT MEP target workbooks.

- [ ] **Step 3: If any golden-cell assertions fail with numeric mismatch**

Open the failing test, re-derive the expected value from the regenerated fixture (open the fixture in Excel or via `node -e "const XLSX=require('./lib/...')"` reads), and update the assertion. **Do not** adjust the mapping logic unless the mismatch indicates a semantic bug — if `c.postIn` returns the same value as the old `c.withinLodSf` did (which it should), nothing in the mapping output should change.

- [ ] **Step 4: Confirm all tests green**

```
node --test tests/xlsx-surgical.test.mjs tests/mappings/general-retention.test.mjs tests/mappings/ddot-mep.test.mjs tests/populate.test.mjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```
cd ..
git add populator/tests/fixtures/minnesota-ave.xlsx populator/tests/mappings/
git commit -m "populator: regenerate Minnesota Ave fixture for new CDA layout"
```

---

## Task 11: Full project-level test sweep

**Files:** no changes; validation only.

- [ ] **Step 1: Workbook build**

```
python -m workbook && python -m workbook.sample
```

Expected: both commands exit 0.

- [ ] **Step 2: Workbook tests**

```
pytest tests/ -v
```

Expected: all PASS.

- [ ] **Step 3: summary_calculator tests**

```
cd summary_calculator
node --test tests/parse.test.mjs tests/calc.test.mjs tests/render.test.mjs tests/parity.test.mjs
cd ..
```

Expected: all PASS.

- [ ] **Step 4: populator tests**

```
cd populator
node --test tests/xlsx-surgical.test.mjs tests/mappings/general-retention.test.mjs tests/mappings/ddot-mep.test.mjs tests/populate.test.mjs
cd ..
```

Expected: all PASS.

- [ ] **Step 5: Final manual check**

Open `summary_calculator/summary-calculator.html` in a browser from `file://`. Load `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`. Verify:
- SDA/CDA Summary page CDA block shows Pre Within LOD and Post Within LOD columns with sample values.
- A BMP page's Max Credit cap is unchanged vs. pre-refactor (regression check — if numbers moved, a formula is still pointing at the wrong column).

Then open the regenerated workbook `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx` directly in Excel (or LibreOffice). Verify:
- `DOEE_DETENTION_BMP` sheet is present.
- Row 2 shows the user note about Within LOD / project-specific exceptions.
- Row 4 col A is `CDA-1`; col B shows the BMP name auto-looked-up from the BMP sheet; col C shows the parent SDA number from the CDA summary block.
- Pre CN column reads 0 (sample doesn't fill CDA Pre), Post CN reads a reasonable composite CN (e.g., 90-98 for impervious-dominated catchments), and `Det Req'd?` reads `Yes` on populated rows.

- [ ] **Step 6: No commit** (validation only). If the browser smoke check surfaces an issue, open a new task to fix and loop back.

---

## Convention summary

- **TDD everywhere.** Each code change starts with a failing test — never commit code with no test.
- **One commit per task** unless the task says otherwise.
- **Commit messages:** plain language, imperative mood, no AI references (project convention from `.claude/CLAUDE.md`).
- **Field naming:** `cda.postIn` (not `withinLodSf`) is the canonical field name. The old name is gone from the codebase — grep for it should return empty after Task 09.
- **Pre columns are plumbing-only in v1.** They parse into `cda.preIn` / `cda.preOut`, but no calc or mapping reads them. Keep it that way until a future spec explicitly adds a consumer.
