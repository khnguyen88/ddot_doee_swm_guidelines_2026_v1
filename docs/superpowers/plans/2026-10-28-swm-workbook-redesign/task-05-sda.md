# Task 05: SDA Sheet

**Depends on:** 03, 04. **Blocks:** 06, 07, 08, 09, 10, 11.

## Context

SDA is the first *relational* sheet — one row per `(SDA_ID, Land Use, HSG)` combination, for both pre- and post-construction. All downstream sheets (CDA, BMP, MEP_SUMMARY, EISA_DIRECT, EISA_TR55, DOEE_SDA) aggregate from this table via SUMIFS. This replaces the old wide-row-per-SDA layout.

### Column layout

| Col | Letter | Content |
|---|---|---|
| 1 | A | SDA_ID (user text input) |
| 2 | B | In PROW? (Yes/No dropdown) |
| 3 | C | Land Use (dropdown: 5 options) |
| 4 | D | HSG (dropdown: A/B/C/D) |
| 5 | E | Pre-Construction Within LOD (SF) |
| 6 | F | Pre-Construction Outside LOD (SF) |
| 7 | G | Post-Construction Within LOD (SF) |
| 8 | H | Post-Construction Outside LOD (SF) |
| 9 | I | Rv Coefficient (auto VLOOKUP) |
| 10 | J | Rainfall Depth (auto — PROW→0, else PROJECT_Rainfall) |
| 11 | K | Pre SWRv Within LOD (CF) |
| 12 | L | Pre SWRv Outside LOD (CF) |
| 13 | M | Post SWRv Within LOD (CF) |
| 14 | N | Post SWRv Outside LOD (CF) |

Data rows: 4 through 4 + n_rows - 1 (default n_rows=50 → rows 4-53).

### SDA Summary Block (below table)

Starts at row `n_rows + 6`. Pre-generates 10 SDA summary rows: `SDA-1`, `SDA-2`, ..., `SDA-10`. Each row uses SUMIFS over the data table.

### Key formulas (row r in data table)

- **I (Rv):**  `=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")`
- **J (Rainfall):** `=IF(B{r}="Yes",0,PROJECT_Rainfall)`
- **K (Pre SWRv Within):** `=IFERROR(E{r}*I{r}*J{r}/12,0)`
- **L (Pre SWRv Outside):** `=IFERROR(F{r}*I{r}*J{r}/12,0)`
- **M (Post SWRv Within):** `=IFERROR(G{r}*I{r}*J{r}/12,0)`
- **N (Post SWRv Outside):** `=IFERROR(H{r}*I{r}*J{r}/12,0)`

### Summary row s (for SDA_ID in column A of summary block)

- **Pre Imp Total:**  `=SUMIFS($E$4:$E$53,$A$4:$A$53,A{s},$C$4:$C$53,"Impervious Vehicular")+SUMIFS($E$4:$E$53,$A$4:$A$53,A{s},$C$4:$C$53,"Impervious Non-Vehicular")`
- **Post SWRv Required (CF):** `=SUMIFS($M$4:$M$53,$A$4:$A$53,A{s})`

## Files

- Create: `workbook/builders/sda.py`
- Create: `tests/test_sda.py`

## Steps

- [ ] **Step 1: Write failing test**

Create `tests/test_sda.py`:

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
    sda.build_sda_sheet(w, n_rows=50)
    return w


def test_sda_sheet_exists(wb):
    assert "SDA" in wb.sheetnames


def test_column_headers(wb):
    ws = wb["SDA"]
    expected = [
        "SDA_ID", "In PROW?", "Land Use", "HSG",
        "Pre Within LOD (SF)", "Pre Outside LOD (SF)",
        "Post Within LOD (SF)", "Post Outside LOD (SF)",
        "Rv", "Rainfall (in)",
        "Pre SWRv Within (CF)", "Pre SWRv Outside (CF)",
        "Post SWRv Within (CF)", "Post SWRv Outside (CF)",
    ]
    for i, h in enumerate(expected, 1):
        assert ws.cell(row=3, column=i).value == h, f"col {i} header mismatch"


def test_rv_lookup_formula(wb):
    ws = wb["SDA"]
    # Data starts at row 4
    assert ws.cell(row=4, column=9).value == '=IFERROR(VLOOKUP(C4,PARAMS_Rv,2,FALSE),"")'
    assert ws.cell(row=53, column=9).value == '=IFERROR(VLOOKUP(C53,PARAMS_Rv,2,FALSE),"")'


def test_rainfall_formula(wb):
    ws = wb["SDA"]
    assert ws.cell(row=4, column=10).value == '=IF(B4="Yes",0,PROJECT_Rainfall)'


def test_swrv_formulas(wb):
    ws = wb["SDA"]
    # K4: Pre SWRv Within
    assert ws.cell(row=4, column=11).value == "=IFERROR(E4*I4*J4/12,0)"
    # L4: Pre SWRv Outside
    assert ws.cell(row=4, column=12).value == "=IFERROR(F4*I4*J4/12,0)"
    # M4: Post SWRv Within
    assert ws.cell(row=4, column=13).value == "=IFERROR(G4*I4*J4/12,0)"
    # N4: Post SWRv Outside
    assert ws.cell(row=4, column=14).value == "=IFERROR(H4*I4*J4/12,0)"


def test_data_validations(wb):
    ws = wb["SDA"]
    dvs = ws.data_validations.dataValidation
    sqrefs_formulas = [(str(dv.sqref), dv.formula1) for dv in dvs]
    # In PROW? dropdown on col B
    assert any("B4" in s and "Yes" in f for s, f in sqrefs_formulas)
    # Land Use dropdown on col C with 5 options
    assert any("C4" in s and "Impervious Vehicular" in f for s, f in sqrefs_formulas)
    # HSG dropdown on col D
    assert any("D4" in s and ("A" in f or "A,B,C,D" in f) for s, f in sqrefs_formulas)


def test_summary_block_exists(wb):
    ws = wb["SDA"]
    # Summary block starts at row 56 (n_rows=50 → data rows 4..53, blank 54, 55, header 56-57)
    # Just verify a "SDA Summary" header appears somewhere between rows 54-58
    found = False
    for r in range(54, 60):
        v = ws.cell(row=r, column=1).value
        if v and "Summary" in str(v):
            found = True
            break
    assert found


def test_summary_sumifs_formulas(wb):
    ws = wb["SDA"]
    # Summary data rows start at summary_start_row + 2 (after header)
    # Pre-generated for SDA-1 ... SDA-10
    # Find the row where A column = "SDA-1"
    sda1_row = None
    for r in range(1, 100):
        if ws.cell(row=r, column=1).value == "SDA-1":
            sda1_row = r
            break
    assert sda1_row is not None, "SDA-1 summary row not found"

    # Check Post SWRv Required (CF) formula uses SUMIFS over M4:M53
    # The exact column position depends on summary layout; check SUMIFS referencing M range
    # Expected columns in summary block:
    #   A=SDA_ID, B=Pre Imp Total, C=Pre Comp Total, D=Pre Nat Total, E=Pre BMP Total,
    #   F=Post Imp Total, G=Post Comp Total, H=Post Nat Total, I=Post BMP Total,
    #   J=Post SWRv Required (CF)
    swrv_formula = ws.cell(row=sda1_row, column=10).value
    assert "SUMIFS" in swrv_formula
    assert "$M$4:$M$53" in swrv_formula
    assert "A" + str(sda1_row) in swrv_formula


def test_named_range_sda_ids(wb):
    """SDA_IDs is the dynamic list used by CDA / BMP dropdowns."""
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    assert "SDA_IDs" in names
    # Should point to A column of summary block (SDA-1 through SDA-10 pre-generated)
    assert "$A$" in names["SDA_IDs"]
```

- [ ] **Step 2: Run test — expect failure**

```bash
pytest tests/test_sda.py -v
```

- [ ] **Step 3: Write `workbook/builders/sda.py`**

```python
"""Build the SDA sheet — relational land-use table with Rv/SWRv formulas."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


LAND_USES = [
    "Impervious Vehicular",
    "Impervious Non-Vehicular",
    "Compacted (Open Space)",
    "Natural (Woods)",
    "BMP",
]

HEADERS = [
    "SDA_ID", "In PROW?", "Land Use", "HSG",
    "Pre Within LOD (SF)", "Pre Outside LOD (SF)",
    "Post Within LOD (SF)", "Post Outside LOD (SF)",
    "Rv", "Rainfall (in)",
    "Pre SWRv Within (CF)", "Pre SWRv Outside (CF)",
    "Post SWRv Within (CF)", "Post SWRv Outside (CF)",
]

N_SUMMARY_ROWS = 10


def build_sda_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("SDA")
    ws.sheet_view.showGridLines = False

    widths = [12, 10, 24, 8, 14, 14, 14, 14, 8, 11, 14, 14, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "SDA — Site Drainage Areas (one row per SDA × Land Use × HSG)",
               styles.BH, span=14)
    ws.row_dimensions[1].height = 24

    # Header row at row 3.
    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    for r in range(data_start, data_end + 1):
        for c in range(1, 9):
            styles.inp(ws, r, c)
        styles.calc_c(ws, r, 9,  f'=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")')
        styles.calc_c(ws, r, 10, f'=IF(B{r}="Yes",0,PROJECT_Rainfall)')
        styles.calc_c(ws, r, 11, f"=IFERROR(E{r}*I{r}*J{r}/12,0)")
        styles.calc_c(ws, r, 12, f"=IFERROR(F{r}*I{r}*J{r}/12,0)")
        styles.calc_c(ws, r, 13, f"=IFERROR(G{r}*I{r}*J{r}/12,0)")
        styles.calc_c(ws, r, 14, f"=IFERROR(H{r}*I{r}*J{r}/12,0)")

    # Data validations.
    dv_prow = DataValidation(type="list", formula1='"Yes,No"',
                             allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_prow)
    dv_prow.sqref = f"B{data_start}:B{data_end}"

    dv_lu = DataValidation(type="list", formula1='"' + ",".join(LAND_USES) + '"',
                           allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_lu)
    dv_lu.sqref = f"C{data_start}:C{data_end}"

    dv_hsg = DataValidation(type="list", formula1='"A,B,C,D"',
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_hsg)
    dv_hsg.sqref = f"D{data_start}:D{data_end}"

    # ── Summary block ──
    summary_header_row = data_end + 3  # one blank, one spacer, then header
    styles.hdr(ws, summary_header_row, 1,
               "SDA Summary (SUMIFS aggregation per SDA_ID)",
               styles.BH, span=14)

    sum_headers = [
        "SDA_ID",
        "Pre Imp Total (SF)", "Pre Comp Total (SF)",
        "Pre Nat Total (SF)", "Pre BMP Total (SF)",
        "Post Imp Total (SF)", "Post Comp Total (SF)",
        "Post Nat Total (SF)", "Post BMP Total (SF)",
        "Post SWRv Required (CF)",
    ]
    sum_row = summary_header_row + 1
    for i, h in enumerate(sum_headers, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1
    sum_data_end   = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        sda_id = f"SDA-{i+1}"
        styles.lbl(ws, r, 1, sda_id, styles.BL, bold=True)

        imp_pre = (f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
                   f'$C${data_start}:$C${data_end},"Impervious Vehicular")'
                   f'+SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
                   f'$C${data_start}:$C${data_end},"Impervious Non-Vehicular")')
        styles.calc_c(ws, r, 2, "=" + imp_pre[1:])  # already has '='

        for col, lu in [(3, "Compacted (Open Space)"), (4, "Natural (Woods)"), (5, "BMP")]:
            f = (f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
                 f'$C${data_start}:$C${data_end},"{lu}")')
            styles.calc_c(ws, r, col, f)

        imp_post = (f'=SUMIFS($G${data_start}:$G${data_end},$A${data_start}:$A${data_end},A{r},'
                    f'$C${data_start}:$C${data_end},"Impervious Vehicular")'
                    f'+SUMIFS($G${data_start}:$G${data_end},$A${data_start}:$A${data_end},A{r},'
                    f'$C${data_start}:$C${data_end},"Impervious Non-Vehicular")')
        styles.calc_c(ws, r, 6, imp_post)

        for col, lu in [(7, "Compacted (Open Space)"), (8, "Natural (Woods)"), (9, "BMP")]:
            f = (f'=SUMIFS($G${data_start}:$G${data_end},$A${data_start}:$A${data_end},A{r},'
                 f'$C${data_start}:$C${data_end},"{lu}")')
            styles.calc_c(ws, r, col, f)

        swrv_req = (f'=SUMIFS($M${data_start}:$M${data_end},'
                    f'$A${data_start}:$A${data_end},A{r})')
        styles.calc_c(ws, r, 10, swrv_req)

    # Named range for SDA_IDs (used by CDA/BMP dropdowns).
    wb.defined_names.add(DefinedName(
        "SDA_IDs",
        attr_text=f"'SDA'!$A${sum_data_start}:$A${sum_data_end}",
    ))
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_sda.py -v
```

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/sda.py tests/test_sda.py
git commit -m "swm-workbook: add SDA sheet with relational land-use table and SUMIFS summary"
```
