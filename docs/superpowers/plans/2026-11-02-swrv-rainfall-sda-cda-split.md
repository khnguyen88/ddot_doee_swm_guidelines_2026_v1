# SWRv Rainfall + SDA/CDA Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix SWRv-rainfall discrepancy across SDA/CDA/MEP by splitting PROJECT rainfall into retention + EISA fields, removing the buggy PROW zero-out, splitting SDA/CDA into Existing + Proposed sheets, and repointing all downstream references.

**Architecture:** Two new `PROJECT_Rainfall_*` named ranges replace the overloaded `PROJECT_Rainfall`. The single `SDA`/`CDA` sheets each decompose into `_Existing` + `_Proposed` pairs, with the Proposed sheet carrying BMP as a land use and the Existing sheet omitting it. All downstream builders (MEP summary, BMP, DOEE sheets) read from `_Proposed`. Parse layers in the three browser apps hard-break on the old schema.

**Tech Stack:** Python 3 (openpyxl), pytest; Node.js (SheetJS), Playwright for JS apps.

**Source spec:** `docs/superpowers/specs/2026-11-02-swrv-rainfall-sda-cda-split-design.md`

---

## File Inventory

**Modified Python (workbook):**
- `workbook/builders/project.py` — add two rainfall rows
- `workbook/builders/params.py` — BMP Rv 0 → 0.95
- `workbook/builders/sda.py` — rewrite: `build_sda_existing_sheet` + `build_sda_proposed_sheet`
- `workbook/builders/cda.py` — rewrite: `build_cda_existing_sheet` + `build_cda_proposed_sheet`
- `workbook/builders/correct_mep_summary.py` — repoint `'SDA'!…` → `'SDA_Proposed'!…`, `'CDA'!…` → `'CDA_Proposed'!…`
- `workbook/builders/bmp.py` — same repoint + update summary row index refs
- `workbook/builders/doee.py` — same repoint
- `workbook/builders/eisa_direct.py` — `PROJECT_Rainfall` → `PROJECT_Rainfall_EISA`
- `workbook/builders/eisa_tr55.py` — same
- `workbook/__main__.py` — swap `sda.build_sda_sheet` and `cda.build_cda_sheet` calls for the four new builders
- `workbook/sample.py`, `workbook/sample_trail.py` — split row inserts

**Modified JS (parse layers):**
- `populator/src/parse.mjs`
- `summary_calculator/src/parse.mjs`
- `education/src/parse.mjs`

**Tests (Python):**
- Delete: `tests/test_sda.py`, `tests/test_cda.py`
- Create: `tests/test_sda_existing.py`, `tests/test_sda_proposed.py`, `tests/test_cda_existing.py`, `tests/test_cda_proposed.py`, `tests/test_rainfall_sources.py`
- Modify: `tests/test_project.py`, `tests/test_params.py`, `tests/test_correct_mep_summary.py`, `tests/test_bmp.py`, `tests/test_doee.py`, `tests/test_eisa_direct.py`, `tests/test_eisa_tr55.py`, `tests/test_structure.py`

**Tests (JS):**
- `summary_calculator/tests/backward-compat.test.mjs` — update to assert rejection
- Parse-layer tests in each app (sheet-name assertions)

**Docs:**
- `README.md` — schema-change note under "Standards Compliance" or "Repo Shape"
- `.claude/CLAUDE.md` — update fixture-naming/sync notes if sheet names referenced

---

## Phase 1 — Foundation

### Task 1: PROJECT sheet — add two rainfall rows

**Files:**
- Modify: `workbook/builders/project.py`
- Modify: `tests/test_project.py`

- [ ] **Step 1: Update the failing test**

Replace the body of `tests/test_project.py` with:

```python
import pytest
import openpyxl

from workbook.builders import project


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    project.build_project_sheet(w)
    return w


def test_project_sheet_exists(wb):
    assert "PROJECT" in wb.sheetnames


def test_project_field_labels(wb):
    ws = wb["PROJECT"]
    expected_labels = [
        (3,  "Project Name"),
        (4,  "Project Number"),
        (5,  "MS4 / CSS"),
        (6,  "In AWDZ?"),
        (7,  "DOEE Plan Review No."),
        (8,  "Total LOD Area (SF)"),
        (9,  "Retention Target (in)"),
        (10, "EISA 438 Depth (in)"),
        (11, "Trigger Type"),
        (12, "EISA Section 438 Applies?"),
    ]
    for r, label in expected_labels:
        assert ws.cell(row=r, column=1).value == label, f"Row {r} label mismatch"


def test_retention_default(wb):
    ws = wb["PROJECT"]
    assert ws.cell(row=9, column=2).value == 1.2


def test_eisa_default(wb):
    ws = wb["PROJECT"]
    assert ws.cell(row=10, column=2).value == 1.7


def test_named_ranges_defined(wb):
    expected = {
        "PROJECT_Name":                "'PROJECT'!$B$3",
        "PROJECT_Number":              "'PROJECT'!$B$4",
        "PROJECT_MS4":                 "'PROJECT'!$B$5",
        "PROJECT_AWDZ":                "'PROJECT'!$B$6",
        "PROJECT_DOEEReview":          "'PROJECT'!$B$7",
        "PROJECT_TotalLOD":            "'PROJECT'!$B$8",
        "PROJECT_Rainfall_Retention":  "'PROJECT'!$B$9",
        "PROJECT_Rainfall_EISA":       "'PROJECT'!$B$10",
        "PROJECT_Trigger":             "'PROJECT'!$B$11",
        "PROJECT_EISA":                "'PROJECT'!$B$12",
    }
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    for name, addr in expected.items():
        assert name in names, f"Missing named range: {name}"
        assert names[name] == addr


def test_rainfall_cell_comments(wb):
    ws = wb["PROJECT"]
    assert ws.cell(row=9, column=2).comment is not None, "Retention cell needs guidance comment"
    assert "MLD" in ws.cell(row=9, column=2).comment.text
    assert ws.cell(row=10, column=2).comment is not None, "EISA cell needs guidance comment"
    assert "95th percentile" in ws.cell(row=10, column=2).comment.text
```

- [ ] **Step 2: Run tests to confirm failure**

Run: `pytest tests/test_project.py -v`
Expected: FAIL on label row 9 (currently "95th Percentile Storm Depth (in)") and missing named ranges.

- [ ] **Step 3: Implement updated project.py**

Replace `workbook/builders/project.py` with:

```python
"""Build the PROJECT sheet — project header + named ranges."""
from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


FIELDS = [
    (3,  "Project Name",                   "PROJECT_Name",               None),
    (4,  "Project Number",                 "PROJECT_Number",             None),
    (5,  "MS4 / CSS",                      "PROJECT_MS4",                '"MS4,CSS"'),
    (6,  "In AWDZ?",                       "PROJECT_AWDZ",               '"Yes,No"'),
    (7,  "DOEE Plan Review No.",           "PROJECT_DOEEReview",         None),
    (8,  "Total LOD Area (SF)",            "PROJECT_TotalLOD",           None),
    (9,  "Retention Target (in)",          "PROJECT_Rainfall_Retention", None),
    (10, "EISA 438 Depth (in)",            "PROJECT_Rainfall_EISA",      None),
    (11, "Trigger Type",                   "PROJECT_Trigger",            '"MLD,MSI,PROW"'),
    (12, "EISA Section 438 Applies?",      "PROJECT_EISA",               '"Yes,No"'),
]

RAINFALL_COMMENTS = {
    9:  "1.2\" MLD · 0.8\" MSI · higher for AWDZ. Edit per project.",
    10: "95th percentile storm for DC. Fixed per EISA 438.",
}


def build_project_sheet(wb: Workbook) -> None:
    ws = wb.create_sheet("PROJECT")
    ws.sheet_view.showGridLines = False

    styles.cw(ws, 1, 40)
    styles.cw(ws, 2, 32)

    styles.hdr(ws, 1, 1, "PROJECT — Project Header (enter once)", styles.BH, span=2)
    ws.row_dimensions[1].height = 24

    defaults = {9: 1.2, 10: 1.7}
    for row, label, _name, dv_formula in FIELDS:
        styles.lbl(ws, row, 1, label, styles.GRY, bold=True)
        styles.inp(ws, row, 2, defaults.get(row))
        if row in defaults:
            ws.cell(row=row, column=2).number_format = "0.0"
        if row in RAINFALL_COMMENTS:
            ws.cell(row=row, column=2).comment = Comment(
                RAINFALL_COMMENTS[row], "SWM Workbook")
        if dv_formula:
            dv = DataValidation(
                type="list", formula1=dv_formula, allow_blank=True,
                showErrorMessage=True, errorTitle="Invalid entry",
                error="Pick a value from the dropdown list.")
            ws.add_data_validation(dv)
            dv.sqref = f"B{row}"

    for row, _label, name, _dv in FIELDS:
        wb.defined_names.add(DefinedName(name, attr_text=f"'PROJECT'!$B${row}"))
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `pytest tests/test_project.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add workbook/builders/project.py tests/test_project.py
git commit -m "project: split rainfall into Retention (1.2) + EISA (1.7) fields"
```

---

### Task 2: PARAMS — BMP Rv 0.00 → 0.95

**Files:**
- Modify: `workbook/builders/params.py:29`
- Modify: `tests/test_params.py`

- [ ] **Step 1: Update the failing test**

In `tests/test_params.py`, update `test_rv_table_values` — change the BMP line from `("BMP", 0.00)` to `("BMP", 0.95)`.

- [ ] **Step 2: Run test, confirm failure**

Run: `pytest tests/test_params.py::test_rv_table_values -v`
Expected: FAIL — BMP currently 0.00.

- [ ] **Step 3: Change the value**

In `workbook/builders/params.py`, change line 29:

```python
("BMP",                       0.00),
```

to:

```python
("BMP",                       0.95),
```

- [ ] **Step 4: Confirm pass**

Run: `pytest tests/test_params.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add workbook/builders/params.py tests/test_params.py
git commit -m "params: BMP Rv 0.00 -> 0.95 (treat BMP footprint as impervious)"
```

---

## Phase 2 — SDA Split

### Task 3: Delete legacy SDA test; add SDA_Existing test (fail-first)

**Files:**
- Delete: `tests/test_sda.py`
- Create: `tests/test_sda_existing.py`

- [ ] **Step 1: Delete the old test**

```powershell
git rm tests/test_sda.py
```

- [ ] **Step 2: Create `tests/test_sda_existing.py`**

```python
import pytest
import openpyxl

from workbook.builders import params, project, sda


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    return w


def test_sheet_exists(wb):
    assert "SDA_Existing" in wb.sheetnames


def test_column_headers(wb):
    ws = wb["SDA_Existing"]
    expected = [
        "SDA_ID", "In PROW?", "Land Use", "HSG",
        "Area Within LOD (SF)", "Area Outside LOD (SF)",
        "Rv", "Rainfall (in)",
        "SWRv Within (CF)", "SWRv Outside (CF)",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h, f"col {i}"


def test_rv_lookup(wb):
    ws = wb["SDA_Existing"]
    assert ws.cell(row=4, column=7).value == '=IFERROR(VLOOKUP(C4,PARAMS_Rv,2,FALSE),"")'


def test_rainfall_formula_unconditional(wb):
    """Existing sheet uses retention target regardless of PROW."""
    ws = wb["SDA_Existing"]
    assert ws.cell(row=4, column=8).value == "=PROJECT_Rainfall_Retention"


def test_swrv_formulas(wb):
    ws = wb["SDA_Existing"]
    # I = Within, J = Outside
    assert ws.cell(row=4, column=9).value  == "=IFERROR(E4*G4*H4/12,0)"
    assert ws.cell(row=4, column=10).value == "=IFERROR(F4*G4*H4/12,0)"


def test_land_use_dropdown_excludes_bmp(wb):
    ws = wb["SDA_Existing"]
    dvs = ws.data_validations.dataValidation
    lu_dvs = [dv for dv in dvs if "C4" in str(dv.sqref)]
    assert len(lu_dvs) == 1
    formula = lu_dvs[0].formula1
    assert "Impervious Vehicular" in formula
    assert "Impervious Non-Vehicular" in formula
    assert "Compacted (Open Space)" in formula
    assert "Natural (Woods)" in formula
    assert "BMP" not in formula


def test_summary_block(wb):
    ws = wb["SDA_Existing"]
    # Summary header at row 56 for n_rows=50 (data_end=53 + 3).
    assert ws.cell(row=57, column=1).value == "SDA_ID"
    assert ws.cell(row=57, column=2).value == "Imp Total (SF)"
    assert ws.cell(row=57, column=3).value == "Comp Total (SF)"
    assert ws.cell(row=57, column=4).value == "Nat Total (SF)"
    assert ws.cell(row=57, column=5).value == "Pre Total Within (SF)"
    # First summary data row.
    assert ws.cell(row=58, column=1).value == "SDA-1"
```

- [ ] **Step 3: Run tests, confirm failure**

Run: `pytest tests/test_sda_existing.py -v`
Expected: FAIL — `build_sda_existing_sheet` doesn't exist yet.

- [ ] **Step 4: Commit the test-only change**

```powershell
git add tests/test_sda_existing.py
git commit -m "sda: add failing test for SDA_Existing split"
```

---

### Task 4: Implement `build_sda_existing_sheet`

**Files:**
- Modify: `workbook/builders/sda.py`

- [ ] **Step 1: Replace `workbook/builders/sda.py`**

Replace the whole file with the following. (This file is rewritten end-to-end; Task 5 adds the Proposed builder in the same module.)

```python
"""Build SDA sheets — one for existing conditions, one for proposed."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


LAND_USES_EXISTING = [
    "Impervious Vehicular",
    "Impervious Non-Vehicular",
    "Compacted (Open Space)",
    "Natural (Woods)",
]

LAND_USES_PROPOSED = LAND_USES_EXISTING + ["BMP"]

HEADERS = [
    "SDA_ID", "In PROW?", "Land Use", "HSG",
    "Area Within LOD (SF)", "Area Outside LOD (SF)",
    "Rv", "Rainfall (in)",
    "SWRv Within (CF)", "SWRv Outside (CF)",
]

N_SUMMARY_ROWS = 10


def _list_dv(formula1: str) -> DataValidation:
    return DataValidation(
        type="list", formula1=formula1, allow_blank=True,
        showErrorMessage=True, errorTitle="Invalid entry",
        error="Pick a value from the dropdown list.")


def _build_data_rows(ws, data_start: int, data_end: int) -> None:
    for r in range(data_start, data_end + 1):
        for c in range(1, 7):  # A-F are user inputs
            styles.inp(ws, r, c)
        styles.calc_c(ws, r, 7, f'=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")')
        styles.calc_c(ws, r, 8, "=PROJECT_Rainfall_Retention")
        styles.calc_c(ws, r, 9,  f"=IFERROR(E{r}*G{r}*H{r}/12,0)")
        styles.calc_c(ws, r, 10, f"=IFERROR(F{r}*G{r}*H{r}/12,0)")


def _add_dropdowns(ws, data_start: int, data_end: int, land_uses: list[str]) -> None:
    dv_prow = _list_dv('"Yes,No"')
    ws.add_data_validation(dv_prow)
    dv_prow.sqref = f"B{data_start}:B{data_end}"

    dv_lu = _list_dv('"' + ",".join(land_uses) + '"')
    ws.add_data_validation(dv_lu)
    dv_lu.sqref = f"C{data_start}:C{data_end}"

    dv_hsg = _list_dv('"A,B,C,D"')
    ws.add_data_validation(dv_hsg)
    dv_hsg.sqref = f"D{data_start}:D{data_end}"


def build_sda_existing_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("SDA_Existing")
    ws.sheet_view.showGridLines = False

    widths = [12, 10, 24, 8, 14, 14, 8, 11, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "SDA_Existing — Existing Site Drainage Areas (one row per SDA × Land Use × HSG)",
               styles.BH, span=10)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    _build_data_rows(ws, data_start, data_end)
    _add_dropdowns(ws, data_start, data_end, LAND_USES_EXISTING)

    # Summary block.
    summary_header_row = data_end + 3   # e.g. 56
    styles.hdr(ws, summary_header_row, 1,
               "SDA_Existing Summary (SUMIFS aggregation per SDA_ID)",
               styles.BH, span=10)
    sum_hdrs = ["SDA_ID", "Imp Total (SF)", "Comp Total (SF)",
                "Nat Total (SF)", "Pre Total Within (SF)"]
    sum_row = summary_header_row + 1    # 57
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1        # 58
    sum_data_end = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        styles.lbl(ws, r, 1, f"SDA-{i+1}", styles.BL, bold=True)
        # Imp = Impervious Vehicular + Non-Vehicular SUMIFS on E (within LOD)
        imp = (
            f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Vehicular")'
            f'+SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Non-Vehicular")'
        )
        styles.calc_c(ws, r, 2, imp)
        for col, lu in [(3, "Compacted (Open Space)"), (4, "Natural (Woods)")]:
            f = (
                f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
                f'$C${data_start}:$C${data_end},"{lu}")'
            )
            styles.calc_c(ws, r, col, f)
        styles.calc_c(ws, r, 5, f"=B{r}+C{r}+D{r}")

    styles.apply_top_divider(ws, summary_header_row, 1, 10)
    styles.apply_bottom_divider(ws, sum_data_end, 1, 5)
```

- [ ] **Step 2: Run the existing test**

Run: `pytest tests/test_sda_existing.py -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add workbook/builders/sda.py
git commit -m "sda: implement build_sda_existing_sheet (4-land-use, 10-col)"
```

---

### Task 5: Add `build_sda_proposed_sheet` (TDD)

**Files:**
- Create: `tests/test_sda_proposed.py`
- Modify: `workbook/builders/sda.py`

- [ ] **Step 1: Create `tests/test_sda_proposed.py`**

```python
import pytest
import openpyxl

from workbook.builders import params, project, sda


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    return w


def test_sheet_exists(wb):
    assert "SDA_Proposed" in wb.sheetnames


def test_column_headers(wb):
    ws = wb["SDA_Proposed"]
    expected = [
        "SDA_ID", "In PROW?", "Land Use", "HSG",
        "Area Within LOD (SF)", "Area Outside LOD (SF)",
        "Rv", "Rainfall (in)",
        "SWRv Within (CF)", "SWRv Outside (CF)",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h


def test_rainfall_formula_unconditional(wb):
    ws = wb["SDA_Proposed"]
    assert ws.cell(row=4, column=8).value == "=PROJECT_Rainfall_Retention"


def test_land_use_dropdown_includes_bmp(wb):
    ws = wb["SDA_Proposed"]
    dvs = ws.data_validations.dataValidation
    lu_dvs = [dv for dv in dvs if "C4" in str(dv.sqref)]
    assert len(lu_dvs) == 1
    assert "BMP" in lu_dvs[0].formula1


def test_summary_block_has_bmp_column(wb):
    ws = wb["SDA_Proposed"]
    assert ws.cell(row=57, column=1).value == "SDA_ID"
    assert ws.cell(row=57, column=2).value == "Imp Total (SF)"
    assert ws.cell(row=57, column=3).value == "Comp Total (SF)"
    assert ws.cell(row=57, column=4).value == "Nat Total (SF)"
    assert ws.cell(row=57, column=5).value == "BMP Total (SF)"
    assert ws.cell(row=57, column=6).value == "Post Total Within (SF)"
    assert ws.cell(row=57, column=7).value == "SWRv Required (CF)"
    assert ws.cell(row=57, column=8).value == "Area Match?"


def test_swrv_required_sumifs_on_within(wb):
    ws = wb["SDA_Proposed"]
    f = ws.cell(row=58, column=7).value
    assert "SUMIFS" in f and "$I$4:$I$53" in f and "A58" in f


def test_area_match_cross_sheet(wb):
    ws = wb["SDA_Proposed"]
    f = ws.cell(row=58, column=8).value
    assert "SDA_Existing" in f
    assert "MISMATCH" in f


def test_sda_ids_named_range_points_to_proposed(wb):
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    assert "SDA_IDs" in names
    assert "SDA_Proposed" in names["SDA_IDs"]
```

- [ ] **Step 2: Run tests, confirm failure**

Run: `pytest tests/test_sda_proposed.py -v`
Expected: FAIL — `build_sda_proposed_sheet` does not exist.

- [ ] **Step 3: Append `build_sda_proposed_sheet` to `workbook/builders/sda.py`**

Append this function to the end of `workbook/builders/sda.py`:

```python
def build_sda_proposed_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("SDA_Proposed")
    ws.sheet_view.showGridLines = False

    widths = [12, 10, 24, 8, 14, 14, 8, 11, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "SDA_Proposed — Proposed Site Drainage Areas (one row per SDA × Land Use × HSG)",
               styles.BH, span=10)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    _build_data_rows(ws, data_start, data_end)
    _add_dropdowns(ws, data_start, data_end, LAND_USES_PROPOSED)

    # Summary block (8 columns, including BMP + SWRv Required + Area Match).
    summary_header_row = data_end + 3    # 56
    styles.hdr(ws, summary_header_row, 1,
               "SDA_Proposed Summary (SUMIFS aggregation per SDA_ID)",
               styles.BH, span=10)
    sum_hdrs = [
        "SDA_ID", "Imp Total (SF)", "Comp Total (SF)",
        "Nat Total (SF)", "BMP Total (SF)",
        "Post Total Within (SF)", "SWRv Required (CF)", "Area Match?",
    ]
    sum_row = summary_header_row + 1     # 57
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1         # 58
    sum_data_end = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        styles.lbl(ws, r, 1, f"SDA-{i+1}", styles.BL, bold=True)

        imp = (
            f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Vehicular")'
            f'+SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Non-Vehicular")'
        )
        styles.calc_c(ws, r, 2, imp)
        for col, lu in [(3, "Compacted (Open Space)"), (4, "Natural (Woods)"), (5, "BMP")]:
            f = (
                f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
                f'$C${data_start}:$C${data_end},"{lu}")'
            )
            styles.calc_c(ws, r, col, f)

        styles.calc_c(ws, r, 6, f"=B{r}+C{r}+D{r}+E{r}")
        swrv_req = (
            f'=SUMIFS($I${data_start}:$I${data_end},'
            f'$A${data_start}:$A${data_end},A{r})'
        )
        styles.calc_c(ws, r, 7, swrv_req)

        # Area Match? — cross-sheet to SDA_Existing's "Pre Total Within (SF)"
        # at the same summary row index (col E on Existing summary).
        area_match = (
            f'=IF(ABS(F{r}-'
            f"'SDA_Existing'!E{r})<=1,\"OK\",\"⚠ MISMATCH\")"
        )
        styles.calc_c(ws, r, 8, area_match)

    wb.defined_names.add(DefinedName(
        "SDA_IDs",
        attr_text=f"'SDA_Proposed'!$A${sum_data_start}:$A${sum_data_end}",
    ))

    styles.apply_top_divider(ws, summary_header_row, 1, 10)
    styles.apply_bottom_divider(ws, sum_data_end, 1, 8)
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `pytest tests/test_sda_proposed.py tests/test_sda_existing.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add workbook/builders/sda.py tests/test_sda_proposed.py
git commit -m "sda: implement build_sda_proposed_sheet with BMP + area match"
```

---

### Task 6: Wire the two new SDA builders into `__main__.py`

**Files:**
- Modify: `workbook/__main__.py`

- [ ] **Step 1: Update the call site**

In `workbook/__main__.py`, replace:

```python
    sda.build_sda_sheet(wb, n_rows=50)
```

with:

```python
    sda.build_sda_existing_sheet(wb, n_rows=50)
    sda.build_sda_proposed_sheet(wb, n_rows=50)
```

- [ ] **Step 2: Run smoke test**

Run: `python -m workbook`
Expected: Workbook built, written to `SW_Required_Provided_DOEE_EISA438.xlsx`. (BMP/MEP/DOEE builders will fail — that's fine for now, we fix them in Phase 4. If `python -m workbook` fails here because downstream builders can't find `SDA` sheet, skip Step 2 and proceed; it will all resolve once Phase 4 lands. Note the failure for the exec log.)

- [ ] **Step 3: Commit**

```powershell
git add workbook/__main__.py
git commit -m "workbook: wire SDA_Existing + SDA_Proposed builders"
```

---

## Phase 3 — CDA Split

### Task 7: Delete legacy CDA test; add CDA_Existing test (fail-first)

**Files:**
- Delete: `tests/test_cda.py`
- Create: `tests/test_cda_existing.py`

- [ ] **Step 1: Delete the old test**

```powershell
git rm tests/test_cda.py
```

- [ ] **Step 2: Create `tests/test_cda_existing.py`**

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
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    return w


def test_sheet_exists(wb):
    assert "CDA_Existing" in wb.sheetnames


def test_column_headers(wb):
    ws = wb["CDA_Existing"]
    expected = [
        "CDA_ID", "SDA_ID", "Land Use", "HSG",
        "Area Within LOD (SF)", "Area Outside LOD (SF)",
        "Rv", "Rainfall (in)",
        "SWRv Within (CF)", "SWRv Outside (CF)",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h


def test_rainfall_formula(wb):
    ws = wb["CDA_Existing"]
    assert ws.cell(row=4, column=8).value == "=PROJECT_Rainfall_Retention"


def test_sda_id_dropdown(wb):
    ws = wb["CDA_Existing"]
    dvs = ws.data_validations.dataValidation
    assert any("B4" in str(dv.sqref) and dv.formula1 == "=SDA_IDs" for dv in dvs)


def test_land_use_dropdown_excludes_bmp(wb):
    ws = wb["CDA_Existing"]
    dvs = ws.data_validations.dataValidation
    lu_dvs = [dv for dv in dvs if "C4" in str(dv.sqref)]
    assert len(lu_dvs) == 1
    assert "BMP" not in lu_dvs[0].formula1


def test_summary_block(wb):
    ws = wb["CDA_Existing"]
    assert ws.cell(row=57, column=1).value == "CDA_ID"
    assert ws.cell(row=57, column=2).value == "Pre Total Within LOD (SF)"
    assert ws.cell(row=58, column=1).value == "CDA-1"
```

- [ ] **Step 3: Confirm failure**

Run: `pytest tests/test_cda_existing.py -v`
Expected: FAIL — `build_cda_existing_sheet` missing.

- [ ] **Step 4: Commit the test only**

```powershell
git add tests/test_cda_existing.py
git commit -m "cda: add failing test for CDA_Existing split"
```

---

### Task 8: Rewrite `cda.py` to supply `build_cda_existing_sheet`

**Files:**
- Modify: `workbook/builders/cda.py`

- [ ] **Step 1: Replace `workbook/builders/cda.py`**

Replace the whole file:

```python
"""Build CDA sheets — one for existing conditions, one for proposed."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles
from workbook.builders.sda import LAND_USES_EXISTING, LAND_USES_PROPOSED


HEADERS = [
    "CDA_ID", "SDA_ID", "Land Use", "HSG",
    "Area Within LOD (SF)", "Area Outside LOD (SF)",
    "Rv", "Rainfall (in)",
    "SWRv Within (CF)", "SWRv Outside (CF)",
]

N_SUMMARY_ROWS = 10


def _list_dv(formula1: str) -> DataValidation:
    return DataValidation(
        type="list", formula1=formula1, allow_blank=True,
        showErrorMessage=True, errorTitle="Invalid entry",
        error="Pick a value from the dropdown list.")


def _build_data_rows(ws, data_start: int, data_end: int) -> None:
    for r in range(data_start, data_end + 1):
        for c in range(1, 7):
            styles.inp(ws, r, c)
        styles.calc_c(ws, r, 7, f'=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")')
        styles.calc_c(ws, r, 8, "=PROJECT_Rainfall_Retention")
        styles.calc_c(ws, r, 9,  f"=IFERROR(E{r}*G{r}*H{r}/12,0)")
        styles.calc_c(ws, r, 10, f"=IFERROR(F{r}*G{r}*H{r}/12,0)")


def _add_dropdowns(ws, data_start: int, data_end: int, land_uses: list[str]) -> None:
    dv_sda = _list_dv("=SDA_IDs")
    ws.add_data_validation(dv_sda)
    dv_sda.sqref = f"B{data_start}:B{data_end}"

    dv_lu = _list_dv('"' + ",".join(land_uses) + '"')
    ws.add_data_validation(dv_lu)
    dv_lu.sqref = f"C{data_start}:C{data_end}"

    dv_hsg = _list_dv('"A,B,C,D"')
    ws.add_data_validation(dv_hsg)
    dv_hsg.sqref = f"D{data_start}:D{data_end}"


def build_cda_existing_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("CDA_Existing")
    ws.sheet_view.showGridLines = False

    widths = [14, 12, 24, 8, 14, 14, 8, 11, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "CDA_Existing — Pre-development makeup of contributing drainage areas "
               "(audit trail — one row per CDA × Land Use × HSG)",
               styles.BH, span=10)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    _build_data_rows(ws, data_start, data_end)
    _add_dropdowns(ws, data_start, data_end, LAND_USES_EXISTING)

    # Summary block.
    summary_header_row = data_end + 3   # 56
    styles.hdr(ws, summary_header_row, 1,
               "CDA_Existing Summary — Pre Total Within LOD per CDA_ID",
               styles.BH, span=10)
    sum_hdrs = ["CDA_ID", "Pre Total Within LOD (SF)"]
    sum_row = summary_header_row + 1    # 57
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1        # 58
    sum_data_end = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        styles.lbl(ws, r, 1, f"CDA-{i+1}", styles.BL, bold=True)
        pre_total = (
            f'=SUMIFS($E${data_start}:$E${data_end},'
            f'$A${data_start}:$A${data_end},A{r})'
        )
        styles.calc_c(ws, r, 2, pre_total)

    styles.apply_top_divider(ws, summary_header_row, 1, 10)
    styles.apply_bottom_divider(ws, sum_data_end, 1, 2)
```

- [ ] **Step 2: Run the test**

Run: `pytest tests/test_cda_existing.py -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add workbook/builders/cda.py
git commit -m "cda: implement build_cda_existing_sheet (audit-trail Pre layout)"
```

---

### Task 9: Add `build_cda_proposed_sheet` (TDD)

**Files:**
- Create: `tests/test_cda_proposed.py`
- Modify: `workbook/builders/cda.py`

- [ ] **Step 1: Create `tests/test_cda_proposed.py`**

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
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    return w


def test_sheet_exists(wb):
    assert "CDA_Proposed" in wb.sheetnames


def test_rainfall_formula(wb):
    ws = wb["CDA_Proposed"]
    assert ws.cell(row=4, column=8).value == "=PROJECT_Rainfall_Retention"


def test_land_use_includes_bmp(wb):
    ws = wb["CDA_Proposed"]
    dvs = ws.data_validations.dataValidation
    lu_dvs = [dv for dv in dvs if "C4" in str(dv.sqref)]
    assert "BMP" in lu_dvs[0].formula1


def test_summary_has_max_bmp_credit_hardcoded_17(wb):
    ws = wb["CDA_Proposed"]
    assert ws.cell(row=57, column=1).value == "CDA_ID"
    assert ws.cell(row=57, column=2).value == "SDA_ID"
    assert ws.cell(row=57, column=3).value == "Total CDA Within LOD (SF) (post)"
    assert ws.cell(row=57, column=4).value == "Max BMP Credit (CF)"
    assert ws.cell(row=57, column=5).value == "Area Match?"
    # Max BMP Credit must stay hardcoded 1.7 (DOEE ceiling).
    assert ws.cell(row=58, column=4).value == "=C58*1.7/12"


def test_area_match_cross_sheet(wb):
    ws = wb["CDA_Proposed"]
    f = ws.cell(row=58, column=5).value
    assert "CDA_Existing" in f and "MISMATCH" in f


def test_cda_ids_named_range_points_to_proposed(wb):
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    assert "CDA_IDs" in names
    assert "CDA_Proposed" in names["CDA_IDs"]
```

- [ ] **Step 2: Confirm failure**

Run: `pytest tests/test_cda_proposed.py -v`
Expected: FAIL — function missing.

- [ ] **Step 3: Append `build_cda_proposed_sheet` to `workbook/builders/cda.py`**

```python
def build_cda_proposed_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("CDA_Proposed")
    ws.sheet_view.showGridLines = False

    widths = [14, 12, 24, 8, 14, 14, 8, 11, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "CDA_Proposed — Proposed contributing drainage areas "
               "(one row per CDA × Land Use × HSG)",
               styles.BH, span=10)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    _build_data_rows(ws, data_start, data_end)
    _add_dropdowns(ws, data_start, data_end, LAND_USES_PROPOSED)

    # Summary block.
    summary_header_row = data_end + 3   # 56
    styles.hdr(ws, summary_header_row, 1,
               "CDA_Proposed Summary — Max BMP Credit per CDA (DOEE 1.7\" cap)",
               styles.BH, span=10)
    sum_hdrs = [
        "CDA_ID", "SDA_ID", "Total CDA Within LOD (SF) (post)",
        "Max BMP Credit (CF)", "Area Match?",
    ]
    sum_row = summary_header_row + 1    # 57
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1        # 58
    sum_data_end = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        styles.lbl(ws, r, 1, f"CDA-{i+1}", styles.BL, bold=True)
        # SDA_ID lookup for the CDA_ID on A{r}.
        styles.calc_c(ws, r, 2,
                      f'=IFERROR(INDEX($B${data_start}:$B${data_end},'
                      f'MATCH(A{r},$A${data_start}:$A${data_end},0)),"")')
        # Total CDA Within LOD (post) — SUMIFS on E (within).
        styles.calc_c(ws, r, 3,
                      f'=SUMIFS($E${data_start}:$E${data_end},'
                      f'$A${data_start}:$A${data_end},A{r})')
        # Max BMP Credit — 1.7" DOEE ceiling, hardcoded.
        styles.calc_c(ws, r, 4, f"=C{r}*1.7/12")
        # Area Match? — vs CDA_Existing summary col B (Pre Total Within LOD).
        area_match = (
            f'=IF(ABS(C{r}-'
            f"'CDA_Existing'!B{r})<=1,\"OK\",\"⚠ MISMATCH\")"
        )
        styles.calc_c(ws, r, 5, area_match)

    wb.defined_names.add(DefinedName(
        "CDA_IDs",
        attr_text=f"'CDA_Proposed'!$A${sum_data_start}:$A${sum_data_end}",
    ))

    styles.apply_top_divider(ws, summary_header_row, 1, 10)
    styles.apply_bottom_divider(ws, sum_data_end, 1, 5)
```

- [ ] **Step 4: Confirm pass**

Run: `pytest tests/test_cda_proposed.py tests/test_cda_existing.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add workbook/builders/cda.py tests/test_cda_proposed.py
git commit -m "cda: implement build_cda_proposed_sheet with 1.7 cap + area match"
```

---

### Task 10: Wire the two new CDA builders into `__main__.py`

**Files:**
- Modify: `workbook/__main__.py`

- [ ] **Step 1: Update call site**

Replace:

```python
    cda.build_cda_sheet(wb, n_rows=50)
```

with:

```python
    cda.build_cda_existing_sheet(wb, n_rows=50)
    cda.build_cda_proposed_sheet(wb, n_rows=50)
```

- [ ] **Step 2: Commit**

```powershell
git add workbook/__main__.py
git commit -m "workbook: wire CDA_Existing + CDA_Proposed builders"
```

---

## Phase 4 — Downstream Repoint

### Task 11: Repoint `correct_mep_summary.py` + update test

**Files:**
- Modify: `workbook/builders/correct_mep_summary.py`
- Modify: `tests/test_correct_mep_summary.py`

- [ ] **Step 1: Replace all occurrences in `workbook/builders/correct_mep_summary.py`**

Using global replace:
- `'SDA'!` → `'SDA_Proposed'!`
- `'CDA'!` → `'CDA_Proposed'!`

Hardcoded `1.2/12` and `1.7/12` in formulas are intentionally unchanged (DDOT template verbatim).

Also update the summary row lookup for SDA land-use columns. The current code reads:

```python
# ---- B/C/D: SDA summary direct references, guarded on A ----
ws.cell(row=r, column=2, value=_guard(f"'SDA'!F{s}", a))  # B
ws.cell(row=r, column=3, value=_guard(f"'SDA'!G{s}", a))  # C
ws.cell(row=r, column=4, value=_guard(f"'SDA'!H{s}", a))  # D
```

Now that SDA_Proposed summary layout is `A=SDA_ID, B=Imp, C=Comp, D=Nat, E=BMP, F=Post Total Within, G=SWRv Required, H=Area Match?`, update to pull Imp/Comp/Nat into the MEP's B/C/D (Impervious/Compacted/Natural within LOD):

```python
# ---- B/C/D: SDA_Proposed summary direct references, guarded on A ----
# SDA_Proposed summary cols: A=ID, B=Imp, C=Comp, D=Nat
ws.cell(row=r, column=2, value=_guard(f"'SDA_Proposed'!B{s}", a))  # B — Imp Within
ws.cell(row=r, column=3, value=_guard(f"'SDA_Proposed'!C{s}", a))  # C — Comp Within
ws.cell(row=r, column=4, value=_guard(f"'SDA_Proposed'!D{s}", a))  # D — Nat Within
```

The row 505 SDA_ID lookup `=IF('SDA'!A{s}="","",'SDA'!A{s})` becomes `=IF('SDA_Proposed'!A{s}="","",'SDA_Proposed'!A{s})`.

All SUMIFS blocks referencing the SDA data table (`'SDA'!$G$`, etc.) → `'SDA_Proposed'!$...`.
All SUMIFS referencing CDA data table → `'CDA_Proposed'!$...`.

- [ ] **Step 2: Update `tests/test_correct_mep_summary.py`**

Any assertion matching `'SDA'!` → `'SDA_Proposed'!`; any matching `'CDA'!` → `'CDA_Proposed'!`. Also update the fixture to call the four new sheet builders in order.

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_correct_mep_summary.py -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add workbook/builders/correct_mep_summary.py tests/test_correct_mep_summary.py
git commit -m "mep_summary: repoint SDA/CDA refs to _Proposed sheets"
```

---

### Task 12: Repoint `bmp.py` + update test

**Files:**
- Modify: `workbook/builders/bmp.py`
- Modify: `tests/test_bmp.py`

- [ ] **Step 1: Replace sheet-name references in `bmp.py`**

- Replace `'SDA'!` with `'SDA_Proposed'!` in `_cda_dominant_hsg_formula` and anywhere else.
- Wait — that function uses CDA, not SDA. Correct: `'CDA'!` → `'CDA_Proposed'!`.
- Replace `'CDA'!` with `'CDA_Proposed'!` globally in `bmp.py`.
- Line ~308: `VLOOKUP(C{r},'CDA'!$A$58:$D$67,4,FALSE)` → `VLOOKUP(C{r},'CDA_Proposed'!$A$58:$D$67,4,FALSE)`. BUT: the CDA_Proposed summary has only 5 columns now (A-E). Column 4 was HSG in the old 6-col summary; in the new summary, col 2 = SDA_ID, col 3 = Total CDA Within LOD, col 4 = Max BMP Credit, col 5 = Area Match. No HSG column.

  The HSG for a CDA is derived via SUMIFS in `_cda_dominant_hsg_formula`, which reads from the data rows (`CDA_Proposed` data cols G/A/D), not the summary. The VLOOKUP at line ~308 is pulling what the comment says is HSG. Audit the surrounding code: if it's actually using the summary's "Max BMP Credit (CF)" as HSG now, that's a bug. Replace this VLOOKUP line with the `_cda_dominant_hsg_formula(f"C{r}")` call that already exists elsewhere in the file.

- Line ~395: `='SDA'!A{sda_sum_data_start + i}` → `='SDA_Proposed'!A{sda_sum_data_start + i}`.
- Line ~397: `='SDA'!J{sda_sum_data_start + i}` — this was reading "Post SWRv Required" from the old SDA summary col J. In SDA_Proposed summary, SWRv Required is now col G. Change to `='SDA_Proposed'!G{sda_sum_data_start + i}`.

- [ ] **Step 2: Update `tests/test_bmp.py` assertions on sheet names + column indices**

Any assertion comparing to `'SDA'!A…` or `'SDA'!J…` → update sheet name and (for `J`) column letter to `G`. Any `'CDA'!` → `'CDA_Proposed'!`.

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_bmp.py -v`
Expected: PASS. If the HSG VLOOKUP replacement breaks assertions, update the test to assert the new `_cda_dominant_hsg_formula` output pattern.

- [ ] **Step 4: Commit**

```powershell
git add workbook/builders/bmp.py tests/test_bmp.py
git commit -m "bmp: repoint SDA/CDA refs to _Proposed sheets + fix HSG lookup"
```

---

### Task 13: Repoint `doee.py` + update test

**Files:**
- Modify: `workbook/builders/doee.py`
- Modify: `tests/test_doee.py`

- [ ] **Step 1: Global replace in `doee.py`**

- `'SDA'!` → `'SDA_Proposed'!`
- `'CDA'!` → `'CDA_Proposed'!`

Also: the current doee.py may read `'SDA'!E{r}` (Pre Within) and `'SDA'!G{r}` (Post Within). On the new split sheets, both pre and post `Area Within LOD` live in column E (just on different sheets). Audit the SUMIFS column letters — on `SDA_Proposed`, `Area Within LOD` is column E (was E for pre or G for post on the old single sheet). Update the `area_col` parameter / column letter accordingly: it should always be `E` (within) or `F` (outside) on the new sheets, never `G`/`H`.

- [ ] **Step 2: Update `tests/test_doee.py` assertions on sheet names + column letters**

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_doee.py -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add workbook/builders/doee.py tests/test_doee.py
git commit -m "doee: repoint SDA/CDA refs to _Proposed; fix area column letters"
```

---

### Task 14: Rename `PROJECT_Rainfall` → `PROJECT_Rainfall_EISA` in EISA builders

**Files:**
- Modify: `workbook/builders/eisa_direct.py`
- Modify: `workbook/builders/eisa_tr55.py`
- Modify: `tests/test_eisa_direct.py`
- Modify: `tests/test_eisa_tr55.py`

- [ ] **Step 1: Global replace in both builders**

In `workbook/builders/eisa_direct.py` and `workbook/builders/eisa_tr55.py`, replace `PROJECT_Rainfall` with `PROJECT_Rainfall_EISA` everywhere.

- [ ] **Step 2: Update test assertions**

Any `tests/test_eisa_*.py` assertion matching the old named range → updated name.

- [ ] **Step 3: Run tests**

Run: `pytest tests/test_eisa_direct.py tests/test_eisa_tr55.py -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add workbook/builders/eisa_direct.py workbook/builders/eisa_tr55.py tests/test_eisa_direct.py tests/test_eisa_tr55.py
git commit -m "eisa: use PROJECT_Rainfall_EISA named range (was PROJECT_Rainfall)"
```

---

## Phase 5 — Samples + Structure Test

### Task 15: Update `sample.py` (Minnesota Ave)

**Files:**
- Modify: `workbook/sample.py`

- [ ] **Step 1: Audit the file**

Read `workbook/sample.py` fully. Identify every helper that writes an SDA row or CDA row.

- [ ] **Step 2: Split SDA row inserts**

Where the sample previously wrote one row with pre + post columns on `'SDA'`, split into:
- Write a row with `Pre Within/Outside` values on `'SDA_Existing'` (land use must be non-BMP).
- Write a row with `Post Within/Outside` values on `'SDA_Proposed'` (land use may be BMP). The post land use for the same SDA_ID may differ from pre (e.g., old impervious area now classified as BMP).

Keep the 1.7 rainfall default in `PROJECT_Rainfall_EISA`; set `PROJECT_Rainfall_Retention` to 1.2 (MLD trigger for Minnesota Ave) or whatever the real sample uses.

- [ ] **Step 3: Split CDA row inserts**

Same pattern. Pre split land-use rows go to CDA_Existing; post to CDA_Proposed.

- [ ] **Step 4: Rebuild and manually open the output**

Run: `python -m workbook` after setting `SWM_WORKBOOK_OUT` to a sample path, or run whatever script invokes `sample.py`. Open the resulting XLSX. Spot-check:
- `SDA_Existing` / `SDA_Proposed` both populate
- Area Match on `SDA_Proposed` summary shows "OK" or expected mismatch
- SWRv Required column on `SDA_Proposed` is non-zero for PROW rows (this is the bug we fixed)

- [ ] **Step 5: Commit**

```powershell
git add workbook/sample.py
git commit -m "sample: split Minnesota Ave into SDA/CDA Existing + Proposed"
```

---

### Task 16: Update `sample_trail.py`

**Files:**
- Modify: `workbook/sample_trail.py`

- [ ] **Step 1: Apply the same split pattern as Task 15.**

- [ ] **Step 2: Rebuild and spot-check.**

- [ ] **Step 3: Commit**

```powershell
git add workbook/sample_trail.py
git commit -m "sample_trail: split Multi-Use Trail into Existing + Proposed"
```

---

### Task 17: Add cross-cutting rainfall-source test

**Files:**
- Create: `tests/test_rainfall_sources.py`

- [ ] **Step 1: Write the test file**

```python
"""Cross-cutting test — ensures each sheet uses the correct PROJECT_Rainfall_*.

Guards against drift where a future edit accidentally re-wires SDA/CDA
to PROJECT_Rainfall_EISA, or EISA sheets to PROJECT_Rainfall_Retention.
"""
import pytest
import openpyxl

from workbook.builders import (
    params, project, sda, cda, bmp, correct_mep_summary,
    eisa_direct, eisa_tr55, doee,
)


@pytest.fixture(scope="module")
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    project.build_project_sheet(w)
    params.build_params_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    correct_mep_summary.build_correct_mep_summary(w)
    eisa_direct.build_eisa_direct(w)
    eisa_tr55.build_eisa_tr55(w)
    return w


@pytest.mark.parametrize("sheet", [
    "SDA_Existing", "SDA_Proposed", "CDA_Existing", "CDA_Proposed"])
def test_retention_sheets_use_retention_named_range(wb, sheet):
    ws = wb[sheet]
    v = ws.cell(row=4, column=8).value  # H4 = Rainfall column
    assert v == "=PROJECT_Rainfall_Retention", f"{sheet} must use retention"


def test_eisa_direct_uses_eisa_named_range(wb):
    text = _flatten_formulas(wb["EISA_Direct"])
    assert "PROJECT_Rainfall_EISA" in text
    assert "PROJECT_Rainfall_Retention" not in text


def test_eisa_tr55_uses_eisa_named_range(wb):
    text = _flatten_formulas(wb["EISA_TR55"])
    assert "PROJECT_Rainfall_EISA" in text
    assert "PROJECT_Rainfall_Retention" not in text


def test_mep_summary_keeps_hardcoded_depths(wb):
    """MEP sheet must stay verbatim: 1.2 for J/K SWRv, 1.7 for AE/AF ceiling."""
    text = _flatten_formulas(wb["CORRECT_MEP_SUMMARY"])
    assert "*1.2/12" in text
    assert "*1.7/12" in text
    # Must NOT have re-wired itself to the named ranges.
    assert "PROJECT_Rainfall_Retention" not in text
    assert "PROJECT_Rainfall_EISA" not in text


def _flatten_formulas(ws) -> str:
    out = []
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if isinstance(v, str) and v.startswith("="):
                out.append(v)
    return "\n".join(out)
```

- [ ] **Step 2: Run the test**

Run: `pytest tests/test_rainfall_sources.py -v`
Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add tests/test_rainfall_sources.py
git commit -m "tests: add rainfall-source parity test across sheets"
```

---

### Task 18: Update `tests/test_structure.py`

**Files:**
- Modify: `tests/test_structure.py`

- [ ] **Step 1: Audit the test**

Read the current file. It likely asserts the list of sheet names in the final workbook.

- [ ] **Step 2: Update sheet-name list**

Replace any `"SDA"` / `"CDA"` entries with the four new names in order: `SDA_Existing`, `CDA_Existing`, `SDA_Proposed`, `CDA_Proposed` (match the order in `__main__.py`).

Actually the __main__.py order right now is:
```
SDA_Existing, SDA_Proposed, CDA_Existing, CDA_Proposed, BMP, …
```
Match that in the test.

- [ ] **Step 3: Decide builder order**

In `workbook/__main__.py`, the four sheets should appear grouped so Excel tabs read naturally: `SDA_Existing, SDA_Proposed, CDA_Existing, CDA_Proposed`. Confirm __main__.py matches this order; if not, reorder in Task 6/10's follow-up (it's fine to amend here since we didn't commit a specific order).

- [ ] **Step 4: Run full suite**

Run: `pytest -v`
Expected: PASS across the whole workbook test suite.

- [ ] **Step 5: Commit**

```powershell
git add tests/test_structure.py workbook/__main__.py
git commit -m "tests: update structure test for new SDA/CDA sheet names"
```

---

## Phase 6 — JS Parse Layers

### Task 19: Update populator `parse.mjs`

**Files:**
- Modify: `populator/src/parse.mjs`

- [ ] **Step 1: Change the required sheets check**

In `populator/src/parse.mjs`, replace:

```javascript
const REQUIRED_SHEETS = ['PROJECT', 'SDA', 'CDA', 'BMP', 'PARAMS'];
```

with:

```javascript
const REQUIRED_SHEETS = ['PROJECT', 'SDA_Existing', 'SDA_Proposed',
                        'CDA_Existing', 'CDA_Proposed', 'BMP', 'PARAMS'];

// Hard-break on the pre-split schema.
const LEGACY_SHEETS = ['SDA', 'CDA'];

function rejectLegacySchema(wb) {
  for (const name of LEGACY_SHEETS) {
    if (wb.SheetNames.includes(name) &&
        !wb.SheetNames.includes(`${name}_Existing`)) {
      throw new Error(
        `This workbook uses the old ${name} pre/post layout. ` +
        `Regenerate from the current blank template ` +
        `(SW_Required_Provided_DOEE_EISA438.xlsx).`);
    }
  }
}
```

Call `rejectLegacySchema(wb)` at the top of the public parse function (before `requireSheet` calls).

- [ ] **Step 2: Rewrite `parseProject` row map**

Rainfall shifts from one row to two; Trigger and EISA shift from rows 10/11 to 11/12:

```javascript
function parseProject(sheet) {
  const retention = cell(sheet, 9, 2);
  const eisa = cell(sheet, 10, 2);
  if (retention == null || eisa == null) {
    throw new Error('Missing PROJECT!B9 (Retention) or !B10 (EISA)');
  }
  return {
    name: cell(sheet, 3, 2),
    number: cell(sheet, 4, 2),
    ms4: cell(sheet, 5, 2),
    awdz: cell(sheet, 6, 2),
    doeeReview: cell(sheet, 7, 2),
    totalLod: cell(sheet, 8, 2),
    rainfallRetention: retention,
    rainfallEisa: eisa,
    trigger: cell(sheet, 11, 2),
    eisa438Applies: cell(sheet, 12, 2),
  };
}
```

Downstream consumers in the populator that read `rainfallIn` must be updated to read `rainfallRetention` for DOEE-compliance workbook writes and `rainfallEisa` for EISA 438 output. Grep for `rainfallIn` and audit each call site.

- [ ] **Step 3: Rewrite `parseSda` / `parseCda`**

Each becomes two functions (or one function that takes the sheet name + flag). The 10-column layout now reads:

```javascript
function parseSdaRow(sheet, row) {
  return {
    sdaId:   cell(sheet, row, 1),
    inProw:  cell(sheet, row, 2),
    landUse: cell(sheet, row, 3),
    hsg:     cell(sheet, row, 4),
    areaIn:  cell(sheet, row, 5),
    areaOut: cell(sheet, row, 6),
  };
}

function parseSdaSheet(sheet) {
  const rows = [];
  for (let r = DATA_FIRST_ROW; r <= DATA_LAST_ROW; r++) {
    const row = parseSdaRow(sheet, r);
    if (row.sdaId == null && row.landUse == null) continue;
    rows.push(row);
  }
  return rows;
}
```

Expose:

```javascript
export function parse(wb) {
  rejectLegacySchema(wb);
  return {
    project: parseProject(requireSheet(wb, 'PROJECT')),
    sdaExisting: parseSdaSheet(requireSheet(wb, 'SDA_Existing')),
    sdaProposed: parseSdaSheet(requireSheet(wb, 'SDA_Proposed')),
    cdaExisting: parseCdaSheet(requireSheet(wb, 'CDA_Existing')),
    cdaProposed: parseCdaSheet(requireSheet(wb, 'CDA_Proposed')),
    bmp: parseBmp(requireSheet(wb, 'BMP')),
    params: parsePARAMS(requireSheet(wb, 'PARAMS')),
  };
}
```

Mirror the SDA structure for `parseCdaSheet` (col B is SDA_ID instead of inProw).

- [ ] **Step 4: Grep populator for downstream consumers**

Run: Grep for `parsed.sda`, `parsed.cda`, `rainfallIn` across `populator/`. Update each call site to use the new field names and new split data (`sdaExisting` vs `sdaProposed`).

- [ ] **Step 5: Run populator tests**

Run: `cd populator; node --test tests/`
Expected: PASS. Any failures surface downstream consumers that still read the old shape — fix each one.

- [ ] **Step 6: Commit**

```powershell
git add populator/
git commit -m "populator: parse new SDA/CDA split schema; reject legacy on old sheets"
```

---

### Task 20: Update `summary_calculator/src/parse.mjs`

**Files:**
- Modify: `summary_calculator/src/parse.mjs`
- Modify: `summary_calculator/tests/backward-compat.test.mjs`

- [ ] **Step 1: Apply the same changes as Task 19**

Same `REQUIRED_SHEETS`, same `rejectLegacySchema`, same `parseProject` row map, same `parseSda*` / `parseCda*` structure.

- [ ] **Step 2: Update backward-compat test**

In `summary_calculator/tests/backward-compat.test.mjs`, change the assertion so the frozen `minnesota-ave-pre-geometry.xlsx` fixture now triggers `rejectLegacySchema`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { parse } from '../src/parse.mjs';

test('legacy pre-geometry fixture is rejected by hard-break', () => {
  const buf = readFileSync(
    'tests/fixtures/minnesota-ave-pre-geometry.xlsx');
  const wb = XLSX.read(buf, { type: 'buffer' });
  assert.throws(
    () => parse(wb),
    /old SDA pre\/post layout/,
    'parse must reject legacy sheet names');
});
```

- [ ] **Step 3: Run tests**

Run: `cd summary_calculator; node --test tests/`
Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add summary_calculator/
git commit -m "summary_calculator: parse new split; assert legacy fixture rejected"
```

---

### Task 21: Update `education/src/parse.mjs` + sync engines

**Files:**
- Modify: `education/src/parse.mjs`
- Verify: `scripts/sync-education-engines.sh`

- [ ] **Step 1: Apply the same parse.mjs changes as Task 19**

Education's `parse.mjs` is byte-identical to summary_calculator's by project rule. Copy the updated `summary_calculator/src/parse.mjs` over `education/src/parse.mjs`.

Or run the sync script:

```powershell
bash scripts/sync-education-engines.sh
```

- [ ] **Step 2: Confirm engine-parity test still passes**

Run: `cd education; node --test tests/engine-parity.test.mjs`
Expected: PASS.

- [ ] **Step 3: Run full education suite**

Run: `cd education; node --test tests/`
Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add education/
git commit -m "education: sync parse.mjs with summary_calculator split-schema update"
```

---

## Phase 7 — Fixture Regeneration + Verification

### Task 22: Regenerate blank template + sample fixtures

**Files:**
- Overwrite: `SW_Required_Provided_DOEE_EISA438.xlsx` (project root)
- Overwrite: `workbook/samples/SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`
- Overwrite: `workbook/samples/SW_Required_Provided_DOEE_EISA438_SAMPLE_Trail.xlsx`

- [ ] **Step 1: Regenerate blank template**

Run: `python -m workbook`
Expected: Writes `SW_Required_Provided_DOEE_EISA438.xlsx` at repo root.

- [ ] **Step 2: Regenerate samples**

```powershell
python -m workbook.sample
python -m workbook.sample_trail
```

(If sample.py / sample_trail.py don't expose a `__main__` block, run `python -c "import workbook.sample"` and verify output path.)

- [ ] **Step 3: Open each in Excel and spot-check**

- Open `SW_Required_Provided_DOEE_EISA438.xlsx` and `_SAMPLE_MinnesotaAve.xlsx`.
- Confirm `SDA_Existing`, `SDA_Proposed`, `CDA_Existing`, `CDA_Proposed` tabs are present and the old `SDA` / `CDA` are gone.
- Click a Land Use cell on each sheet; confirm dropdown arrow is visible and the Existing options exclude "BMP".
- On the sample workbook, confirm `SDA_Proposed` summary "SWRv Required (CF)" is non-zero for PROW drainage areas (the fixed bug).
- Confirm Minnesota Ave MEP summary `J45` (total SWRv) is roughly equal to the sum of `SDA_Proposed`'s `SWRv Required` column (both now use 1.2″).

- [ ] **Step 4: Commit**

```powershell
git add SW_Required_Provided_DOEE_EISA438.xlsx workbook/samples/*.xlsx
git commit -m "fixtures: regenerate blank + MinnesotaAve + Trail samples (split schema)"
```

---

### Task 23: Build all three JS apps and smoke-test

**Files:** none; verification only

- [ ] **Step 1: Build all three apps**

```powershell
node summary_calculator/build.js
node populator/build.js
node education/build.js
```

- [ ] **Step 2: Open each dist in a browser**

- Open `summary_calculator/dist/index.html`. Load the new `_SAMPLE_MinnesotaAve.xlsx`. Confirm the summary deck renders without parse errors.
- Open `populator/dist/index.html`. Load the sample. Confirm the DOEE SWMP output files download. Open one of the generated SWMP-BMP Calc xlsm files and spot-check that the SWRv value matches our template's `SDA_Proposed` summary.
- Open `education/dist/index.html`. Confirm demo button loads bundled sample, confirm walkthrough pages still render all four blocks (Overview/Why/Formula/Worked) for EISA 438 Direct, TR-55, and TR-16.

- [ ] **Step 3: Run Playwright smoke tests**

Run (per-app directory):

```powershell
cd summary_calculator; npx playwright test
cd ../populator; npx playwright test
cd ../education; npx playwright test
```

Expected: PASS. Any failures indicate downstream consumers broke on the schema change.

- [ ] **Step 4: If all clean, commit no-op if the build.js output changed anything**

Nothing to commit here if steps pass. If dist/ files are committed in your repo convention, update them:

```powershell
git add summary_calculator/dist/ populator/dist/ education/dist/
git commit -m "dist: rebuild all three apps against split schema"
```

---

### Task 24: README + CLAUDE.md documentation updates

**Files:**
- Modify: `README.md`
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Add a note in README**

Under the section that describes the workbook template (likely "Repo Shape" or a new "Schema" section), add:

```markdown
### Schema change — 2026-11

The blank template now splits SDA and CDA into Existing + Proposed pairs
(`SDA_Existing` + `SDA_Proposed`, `CDA_Existing` + `CDA_Proposed`). Pre/post columns
on one sheet were replaced because "BMP" as a land use has no coherent
pre-development identity.

Templates generated before this change (with single `SDA` / `CDA` sheets) are
not readable by the current parse layer — regenerate from the current blank
template with `python -m workbook`.

The PROJECT sheet also splits rainfall into two fields:
- `PROJECT_Rainfall_Retention` (default 1.2″) — SDA/CDA SWRv
- `PROJECT_Rainfall_EISA` (default 1.7″) — EISA 438 Direct + TR-55
```

- [ ] **Step 2: Update `.claude/CLAUDE.md`**

In the "Fixture Naming" section, update:
- Rephrase anything mentioning "`SDA` sheet" or "`CDA` sheet" to use the new names.
- Add a bullet under "Key DOEE/DDOT/EISA Distinctions" clarifying:
  > `PROJECT_Rainfall_Retention` drives SDA/CDA SWRv (defaults 1.2″). `PROJECT_Rainfall_EISA` drives EISA 438 (defaults 1.7″). MEP Worksheet keeps 1.2″ hardcoded per DDOT template.

- [ ] **Step 3: Commit**

```powershell
git add README.md .claude/CLAUDE.md
git commit -m "docs: document SDA/CDA split + two-rainfall schema change"
```

---

### Task 25: Final gate — full test matrix

**Files:** none; verification only

- [ ] **Step 1: Run full Python test suite**

```powershell
pytest -v
```

Expected: PASS. Zero skips except any pre-existing skipped tests.

- [ ] **Step 2: Run all JS test suites**

```powershell
cd summary_calculator; node --test tests/
cd ../populator; node --test tests/
cd ../education; node --test tests/
```

Expected: PASS each.

- [ ] **Step 3: Playwright smoke across all three apps**

```powershell
cd summary_calculator; npx playwright test
cd ../populator; npx playwright test
cd ../education; npx playwright test
```

Expected: PASS each.

- [ ] **Step 4: Verify no reference to the old schema remains**

Run (via the Grep tool, not here):

- Grep for `'SDA'!` across `workbook/` and all three JS apps — expected: zero matches.
- Grep for `'CDA'!` — expected: zero matches.
- Grep for `PROJECT_Rainfall[^_]` (word boundary) — expected: zero matches.
- Grep for `build_sda_sheet`, `build_cda_sheet` (unsuffixed) — expected: zero matches.

- [ ] **Step 5: Final commit if any touch-ups were made**

```powershell
git status
# Only commit if there are uncommitted follow-ups.
```

---

## Self-Review Checklist (post-plan)

- [x] Every spec section mapped: Section 1 → Task 1; Section 2 → Task 2; Section 3 → Tasks 3-6; Section 4 → Tasks 7-10; Section 5 → built into every new DV via `_list_dv` helper; Section 6 → Tasks 11-14; Section 7 → Tasks 15-16 (fixtures), 22; Section 8 → Task 20 (backward-compat assertion); Section 9 → Tasks 1-21 interleaved + Task 25 final gate.
- [x] No placeholders: every code block is complete; every command has expected output; file paths exact.
- [x] Type/name consistency: `build_sda_existing_sheet`, `build_sda_proposed_sheet`, `build_cda_existing_sheet`, `build_cda_proposed_sheet`, `PROJECT_Rainfall_Retention`, `PROJECT_Rainfall_EISA`, `SDA_IDs`, `CDA_IDs`, `LAND_USES_EXISTING`, `LAND_USES_PROPOSED` — used identically across all tasks.
- [x] Decision points from spec locked: hard-break backward-compat (Task 20), column reshuffle allowed (Tasks 11-13 enumerate the new column maps), populator XML surgery untouched (Task 23 verifies).
