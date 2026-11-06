# Task 06: CDA Sheet

**Depends on:** 05. **Blocks:** 07, 11.

## Context

CDA = contributing drainage area to a specific BMP. One row per `(CDA_ID, SDA_ID, Land Use, HSG)` combination. Each CDA belongs to exactly one SDA (dropdown). The CDA summary block computes `Max BMP Credit (CF)` = `Total × 1.7 / 12` — the DOEE retention cap used by the BMP sheet.

### Column layout

| Col | Letter | Content |
|---|---|---|
| 1 | A | CDA_ID (user input, e.g. "CDA-1A") |
| 2 | B | SDA_ID (dropdown → `SDA_IDs` named range) |
| 3 | C | Land Use (dropdown — same 5 as SDA) |
| 4 | D | HSG (A/B/C/D) |
| 5 | E | Within LOD (SF) |
| 6 | F | Outside LOD (SF) |
| 7 | G | Rv (auto VLOOKUP from PARAMS_Rv) |
| 8 | H | CDA SWRv Within (CF) — info only |
| 9 | I | CDA SWRv Outside (CF) — info only |

Data rows: 4..53 (n_rows=50).

### Summary block (pre-generated for CDA-1 … CDA-10)

| Col | Content |
|---|---|
| A | CDA_ID |
| B | SDA_ID (first match from data table) |
| C | Total CDA Area Within LOD (SF) |
| D | Max BMP Credit (CF) = `Total × 1.7 / 12` |

Named range `CDA_IDs` points at col A of the summary block.

### Key formulas (data row r)

- **G:** `=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")`
- **H:** `=IFERROR(E{r}*G{r}*PROJECT_Rainfall/12,0)`
- **I:** `=IFERROR(F{r}*G{r}*PROJECT_Rainfall/12,0)`

### Summary formulas (summary row s, CDA_ID in A{s})

- **B (SDA_ID lookup):** `=IFERROR(INDEX($B$4:$B$53,MATCH(A{s},$A$4:$A$53,0)),"")`
- **C (Total within LOD):** `=SUMIFS($E$4:$E$53,$A$4:$A$53,A{s})`
- **D (Max BMP Credit):** `=C{s}*1.7/12`

## Files

- Create: `workbook/builders/cda.py`
- Create: `tests/test_cda.py`

## Steps

- [ ] **Step 1: Write failing test**

Create `tests/test_cda.py`:

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
        "Within LOD (SF)", "Outside LOD (SF)",
        "Rv", "CDA SWRv Within (CF)", "CDA SWRv Outside (CF)",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h


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
    assert ws.cell(row=4, column=7).value == '=IFERROR(VLOOKUP(C4,PARAMS_Rv,2,FALSE),"")'
    assert ws.cell(row=4, column=8).value == "=IFERROR(E4*G4*PROJECT_Rainfall/12,0)"
    assert ws.cell(row=4, column=9).value == "=IFERROR(F4*G4*PROJECT_Rainfall/12,0)"


def test_summary_block_cda_ids_pregenerated(wb):
    ws = wb["CDA"]
    found_ids = set()
    for r in range(1, 100):
        v = ws.cell(row=r, column=1).value
        if isinstance(v, str) and v.startswith("CDA-"):
            found_ids.add(v)
    assert "CDA-1" in found_ids
    assert "CDA-10" in found_ids


def test_summary_max_bmp_credit_formula(wb):
    ws = wb["CDA"]
    # Find CDA-1 row in summary block
    for r in range(1, 100):
        if ws.cell(row=r, column=1).value == "CDA-1":
            cda1_row = r
            break
    else:
        pytest.fail("CDA-1 summary row not found")

    # B: SDA_ID lookup via INDEX/MATCH
    b_val = ws.cell(row=cda1_row, column=2).value
    assert "INDEX" in b_val and "MATCH" in b_val
    # C: Total within LOD SUMIFS
    c_val = ws.cell(row=cda1_row, column=3).value
    assert "SUMIFS" in c_val and "$E$4:$E$53" in c_val
    # D: Max BMP Credit = C * 1.7 / 12
    d_val = ws.cell(row=cda1_row, column=4).value
    assert f"C{cda1_row}" in d_val and "1.7" in d_val and "/12" in d_val


def test_named_range_cda_ids(wb):
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    assert "CDA_IDs" in names
    assert "$A$" in names["CDA_IDs"]
```

- [ ] **Step 2: Run test — expect failure**

```bash
pytest tests/test_cda.py -v
```

- [ ] **Step 3: Write `workbook/builders/cda.py`**

```python
"""Build the CDA sheet — contributing drainage areas, one per BMP."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles
from workbook.builders.sda import LAND_USES


HEADERS = [
    "CDA_ID", "SDA_ID", "Land Use", "HSG",
    "Within LOD (SF)", "Outside LOD (SF)",
    "Rv", "CDA SWRv Within (CF)", "CDA SWRv Outside (CF)",
]

N_SUMMARY_ROWS = 10


def build_cda_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("CDA")
    ws.sheet_view.showGridLines = False

    widths = [14, 12, 24, 8, 14, 14, 8, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "CDA — Contributing Drainage Areas (one row per CDA × Land Use × HSG)",
               styles.BH, span=9)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    for r in range(data_start, data_end + 1):
        for c in range(1, 7):
            styles.inp(ws, r, c)
        styles.calc_c(ws, r, 7, f'=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")')
        styles.calc_c(ws, r, 8, f"=IFERROR(E{r}*G{r}*PROJECT_Rainfall/12,0)")
        styles.calc_c(ws, r, 9, f"=IFERROR(F{r}*G{r}*PROJECT_Rainfall/12,0)")

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
               styles.BH, span=9)
    sum_hdrs = ["CDA_ID", "SDA_ID", "Total CDA Within LOD (SF)",
                "Max BMP Credit (CF)"]
    sum_row = sum_header_row + 1
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1
    sum_data_end   = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        styles.lbl(ws, r, 1, f"CDA-{i+1}", styles.BL, bold=True)
        styles.calc_c(ws, r, 2,
                      f'=IFERROR(INDEX($B${data_start}:$B${data_end},'
                      f'MATCH(A{r},$A${data_start}:$A${data_end},0)),"")')
        styles.calc_c(ws, r, 3,
                      f'=SUMIFS($E${data_start}:$E${data_end},'
                      f'$A${data_start}:$A${data_end},A{r})')
        styles.calc_c(ws, r, 4, f"=C{r}*1.7/12")

    wb.defined_names.add(DefinedName(
        "CDA_IDs",
        attr_text=f"'CDA'!$A${sum_data_start}:$A${sum_data_end}",
    ))
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_cda.py -v
```

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/cda.py tests/test_cda.py
git commit -m "swm-workbook: add CDA sheet with Max BMP Credit summary"
```
