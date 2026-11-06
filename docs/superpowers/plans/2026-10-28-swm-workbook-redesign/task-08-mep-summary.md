# Task 08: MEP_SUMMARY Sheet

**Depends on:** 05, 07. **Blocks:** 12.

## Context

MEP_SUMMARY mirrors the DDOT MEP Worksheet 90% Phase layout exactly, so a reviewer can scan and compare side-by-side. The script pre-generates one block per SDA (`N_SDAS = 10`), each with 4 steps: Drainage Area, Infiltration, Constraints, Tree Credits + BMP Placement.

Each SDA block is a vertical sub-table with ~20 rows. Blocks are stacked with a separator row between them. Blank blocks (no data in corresponding SDA summary row) render but display blank calculated values via IFERROR.

### Block anatomy (per SDA)

```
Row:  r+0  "SDA-N" header (merged across 7 cols)
      r+1  Step 1 — Drainage Area & Regulated Volumes
      r+2  Drainage Area ID               | =SDA_IDs(N)
      r+3  Impervious within LOD (SF)     | SUMIFS
      r+4  Compacted within LOD (SF)      | SUMIFS
      r+5  Natural within LOD (SF)        | SUMIFS
      r+6  Total within LOD (SF)          | SUM
      r+7  Impervious outside LOD (SF)    | SUMIFS
      r+8  Compacted outside LOD (SF)     | SUMIFS
      r+9  Natural outside LOD (SF)       | SUMIFS
      r+10 Total outside LOD (SF)         | SUM
      r+11 SWRv Within LOD (CF)           | =SDA summary J row
      r+12 Step 2 — Infiltration
      r+13 Hydrologic Soil Group          | USER
      r+14 Water Table OK?                | USER (dropdown Yes/No)
      r+15 Bedrock OK?                    | USER (dropdown Yes/No)
      r+16 Infiltration Rate (in/hr)      | USER
      r+17 Step 3 — Constraints
      r+18 Hotspot Concern?               | USER (dropdown Yes/No)
      r+19 Step 4 — Tree Credits
      r+20 Small Trees (preserved+planted)| SUMIFS (DDOT credit 5 CF)
      r+21 Large Trees                    | SUMIFS (DDOT credit 20 CF)
      r+22 Special Trees                  | SUMIFS (DDOT credit 30 CF)
      r+23 Heritage Trees                 | SUMIFS (DDOT credit 40 CF)
      r+24 Step 4 — BMP Placement (up to 5 BMPs per SDA, pre-generated rows)
      r+25..29  BMP row 1..5: nth BMP per SDA via INDEX/SMALL/ROW array formula
      r+30 Cumulative Surplus / Deficit   | Σ Rv Provided − Σ SWRv Required
      r+31 (blank spacer)
```

Block height: 32 rows. 10 SDAs × 32 rows = 320 rows total (plus header rows at top).

### Project header (top of sheet)

Rows 1-10 pull project info from PROJECT named ranges.

## Files

- Create: `workbook/builders/mep_summary.py`
- Create: `tests/test_mep_summary.py`

## Steps

- [ ] **Step 1: Write failing test**

Create `tests/test_mep_summary.py`:

```python
import pytest
import openpyxl

from workbook.builders import params, project, sda, cda, bmp, mep_summary


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    mep_summary.build_mep_summary(w, n_sdas=10)
    return w


def test_mep_summary_sheet_exists(wb):
    assert "MEP_SUMMARY" in wb.sheetnames


def test_project_header_references(wb):
    ws = wb["MEP_SUMMARY"]
    # Row 2 should show Project Name — formula references PROJECT_Name
    found = False
    for r in range(1, 11):
        for c in range(1, 10):
            v = ws.cell(row=r, column=c).value
            if isinstance(v, str) and "PROJECT_Name" in v:
                found = True
    assert found


def test_ten_sda_blocks_present(wb):
    ws = wb["MEP_SUMMARY"]
    sda_header_count = 0
    for r in range(1, 400):
        v = ws.cell(row=r, column=1).value
        if isinstance(v, str) and v.startswith("SDA-"):
            sda_header_count += 1
    assert sda_header_count == 10


def test_step_labels_present(wb):
    ws = wb["MEP_SUMMARY"]
    all_vals = []
    for row in ws.iter_rows(values_only=True):
        for v in row:
            if isinstance(v, str):
                all_vals.append(v)
    assert any("Step 1" in v for v in all_vals)
    assert any("Step 2" in v for v in all_vals)
    assert any("Step 3" in v for v in all_vals)
    assert any("Step 4" in v for v in all_vals)


def test_sda_block_impervious_sumifs(wb):
    ws = wb["MEP_SUMMARY"]
    # Find any cell whose formula references SDA sheet post-within-LOD column (G)
    found_sumifs = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and "SUMIFS" in v and "'SDA'" in v and "$G" in v:
                found_sumifs = True
    assert found_sumifs


def test_infiltration_dropdowns(wb):
    ws = wb["MEP_SUMMARY"]
    dvs = ws.data_validations.dataValidation
    # At least one Yes/No dropdown for Water Table OK?
    assert any("Yes" in dv.formula1 for dv in dvs)
```

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Write `workbook/builders/mep_summary.py`**

```python
"""Build the MEP_SUMMARY sheet — DDOT MEP Worksheet 90% Phase layout."""
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


# SDA summary data rows live at SDA!A57..A66 (per task-05 layout).
# We hard-code this coordinate because SDA locks its layout.
SDA_SUMMARY_FIRST_ROW = 57

# BMP data rows live at BMP!4..53.
BMP_DATA_FIRST = 4
BMP_DATA_LAST = 53

# SDA data rows live at SDA!4..53.
SDA_DATA_FIRST = 4
SDA_DATA_LAST = 53


def _project_header(ws) -> int:
    """Write the project header rows 1-9. Return next free row."""
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
    return 2 + len(rows) + 1  # next free row


def _write_sda_block(ws, start_row: int, sda_index: int) -> int:
    """Write one SDA block starting at `start_row`. Returns next free row."""
    r = start_row
    sda_summary_row = SDA_SUMMARY_FIRST_ROW + sda_index

    # Header
    styles.hdr(ws, r, 1, f"SDA-{sda_index + 1}", styles.BH, span=7)
    r += 1

    # Step 1
    styles.hdr(ws, r, 1, "Step 1 — Drainage Area & Regulated Volumes",
               styles.BS, span=7)
    r += 1
    styles.lbl(ws, r, 1, "Drainage Area ID", styles.GRY)
    styles.calc_c(ws, r, 2, f"='SDA'!A{sda_summary_row}")
    r += 1

    for label, src_col in [
        ("Impervious within LOD (SF)", "F"),   # Post Imp Total → SDA summary col F
        ("Compacted within LOD (SF)", "G"),
        ("Natural within LOD (SF)",   "H"),
    ]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.calc_c(ws, r, 2, f"='SDA'!{src_col}{sda_summary_row}")
        r += 1

    styles.lbl(ws, r, 1, "Total within LOD (SF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f"=SUM(B{r-3}:B{r-1})")
    r += 1

    # Outside LOD values: SUMIFS over SDA data table col H by post, grouped by land use + SDA_ID
    for label, lu_set in [
        ("Impervious outside LOD (SF)",
         ["Impervious Vehicular", "Impervious Non-Vehicular"]),
        ("Compacted outside LOD (SF)", ["Compacted (Open Space)"]),
        ("Natural outside LOD (SF)",   ["Natural (Woods)"]),
    ]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        terms = []
        for lu in lu_set:
            terms.append(
                f"SUMIFS('SDA'!$H${SDA_DATA_FIRST}:$H${SDA_DATA_LAST},"
                f"'SDA'!$A${SDA_DATA_FIRST}:$A${SDA_DATA_LAST},'SDA'!A{sda_summary_row},"
                f"'SDA'!$C${SDA_DATA_FIRST}:$C${SDA_DATA_LAST},\"{lu}\")")
        styles.calc_c(ws, r, 2, "=" + "+".join(terms))
        r += 1

    styles.lbl(ws, r, 1, "Total outside LOD (SF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f"=SUM(B{r-3}:B{r-1})")
    r += 1

    styles.lbl(ws, r, 1, "SWRv Within LOD (CF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f"='SDA'!J{sda_summary_row}")
    r += 1

    # Step 2
    styles.hdr(ws, r, 1, "Step 2 — Infiltration", styles.BS, span=7)
    r += 1
    for label in ["Hydrologic Soil Group", "Water Table OK?", "Bedrock OK?",
                  "Infiltration Rate (in/hr)"]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.inp(ws, r, 2)
        r += 1

    # Step 3
    styles.hdr(ws, r, 1, "Step 3 — Constraints", styles.BS, span=7)
    r += 1
    styles.lbl(ws, r, 1, "Hotspot Concern?", styles.GRY)
    styles.inp(ws, r, 2)
    hotspot_row = r
    r += 1

    # Yes/No dropdowns for Water Table OK, Bedrock OK, Hotspot
    yesno_cells = [hotspot_row - 4, hotspot_row - 3, hotspot_row]  # three Y/N cells in this block
    for cell_row in yesno_cells:
        dv = DataValidation(type="list", formula1='"Yes,No"',
                            allow_blank=True, showDropDown=False)
        ws.add_data_validation(dv)
        dv.sqref = f"B{cell_row}"

    # Step 4 — Tree Credits (DDOT 5/20/30/40 credit values)
    styles.hdr(ws, r, 1, "Step 4 — Tree Credits (DDOT)", styles.BS, span=7)
    r += 1

    for label, planted_col, preserved_col, credit in [
        ("Small Trees (preserved+planted)", "AB", "AD", 5),
        ("Large Trees (preserved+planted)", "AC", "AE", 20),
        ("Special Trees preserved",         None, "AF", 30),
        ("Heritage Trees preserved",        None, "AG", 40),
    ]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        if planted_col:
            formula = (f"=({credit})*("
                       f"SUMIFS('BMP'!${planted_col}${BMP_DATA_FIRST}:${planted_col}${BMP_DATA_LAST},"
                       f"'BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST},'SDA'!A{sda_summary_row})"
                       f"+SUMIFS('BMP'!${preserved_col}${BMP_DATA_FIRST}:${preserved_col}${BMP_DATA_LAST},"
                       f"'BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST},'SDA'!A{sda_summary_row}))")
        else:
            formula = (f"=({credit})*"
                       f"SUMIFS('BMP'!${preserved_col}${BMP_DATA_FIRST}:${preserved_col}${BMP_DATA_LAST},"
                       f"'BMP'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST},'SDA'!A{sda_summary_row})")
        styles.calc_c(ws, r, 2, formula)
        r += 1

    # Step 4 — BMP Placement (5 rows per SDA)
    styles.hdr(ws, r, 1, "Step 4 — BMP Placement", styles.BS, span=7)
    r += 1
    for i, h in enumerate(["BMP Surface Area (SF)", "BMP Type", "CDA_ID",
                           "CDA Within LOD (SF)", "CDA Outside LOD (SF)", "BMP Rv (CF)"], 1):
        styles.hdr(ws, r, i, h, styles.BL, white=False)
    r += 1
    for k in range(5):
        # BMP Surface Area — look up kth BMP matching this SDA. Using INDEX+SMALL+IF array style
        # which Excel supports; openpyxl writes it as-is.
        bmp_formula = (
            f'=IFERROR(INDEX(\'BMP\'!$F${BMP_DATA_FIRST}:$F${BMP_DATA_LAST},'
            f'SMALL(IF(\'BMP\'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST}=\'SDA\'!A{sda_summary_row},'
            f'ROW(\'BMP\'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST})-{BMP_DATA_FIRST - 1}),{k+1})),"")'
        )
        styles.calc_c(ws, r, 1, bmp_formula)
        # BMP Type
        styles.calc_c(ws, r, 2,
            f'=IFERROR(INDEX(\'BMP\'!$D${BMP_DATA_FIRST}:$D${BMP_DATA_LAST},'
            f'SMALL(IF(\'BMP\'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST}=\'SDA\'!A{sda_summary_row},'
            f'ROW(\'BMP\'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST})-{BMP_DATA_FIRST - 1}),{k+1})),"")')
        # CDA_ID
        styles.calc_c(ws, r, 3,
            f'=IFERROR(INDEX(\'BMP\'!$C${BMP_DATA_FIRST}:$C${BMP_DATA_LAST},'
            f'SMALL(IF(\'BMP\'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST}=\'SDA\'!A{sda_summary_row},'
            f'ROW(\'BMP\'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST})-{BMP_DATA_FIRST - 1}),{k+1})),"")')
        # BMP Rv (from BMP AM col = 39)
        styles.calc_c(ws, r, 6,
            f'=IFERROR(INDEX(\'BMP\'!$AM${BMP_DATA_FIRST}:$AM${BMP_DATA_LAST},'
            f'SMALL(IF(\'BMP\'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST}=\'SDA\'!A{sda_summary_row},'
            f'ROW(\'BMP\'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST})-{BMP_DATA_FIRST - 1}),{k+1})),"")')
        r += 1

    # Cumulative Surplus / Deficit
    styles.lbl(ws, r, 1, "Cumulative Surplus / Deficit (CF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2,
        f'=IFERROR(SUMIFS(\'BMP\'!$AM${BMP_DATA_FIRST}:$AM${BMP_DATA_LAST},'
        f'\'BMP\'!$B${BMP_DATA_FIRST}:$B${BMP_DATA_LAST},\'SDA\'!A{sda_summary_row})'
        f'-\'SDA\'!J{sda_summary_row},"")')
    r += 2  # one spacer row

    return r


def build_mep_summary(wb: Workbook, n_sdas: int = 10) -> None:
    ws = wb.create_sheet("MEP_SUMMARY")
    ws.sheet_view.showGridLines = False

    for i, w in enumerate([32, 20, 16, 16, 16, 16, 16], 1):
        styles.cw(ws, i, w)

    r = _project_header(ws)
    for i in range(n_sdas):
        r = _write_sda_block(ws, r, i)
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_mep_summary.py -v
```

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/mep_summary.py tests/test_mep_summary.py
git commit -m "swm-workbook: add MEP_SUMMARY sheet with per-SDA DDOT 90% blocks"
```
