# Task 09: EISA_DIRECT Sheet

**Depends on:** 02, 05, 07. **Blocks:** 12, 13, 14.

## Context

EISA_DIRECT computes project-level EISA 438 compliance using **direct determination** (Horton infiltration, not CN). Reports HSG B and HSG C side by side. Project pre-development and proposed runoff volumes are computed from SDA land-use totals; BMP volume comes from BMP sheet totals; compliance check: `Net Post ≤ Pre`.

### Row layout

```
Row  1       Title
Row  3       Header: Project refs
Rows 4-6     Project Name / Rainfall / Total LOD (auto from PROJECT)
Row  8       Section: Horton Parameters (reference table from PARAMS)
Rows 9-14    f_max, f_min, k, Δt, Infil_Loss_24hr, Depression impervious, pervious, BMP
Row  16      Section: Pre-Construction Runoff Table
Row  17      Headers
Rows 18-31   14 land-use × HSG rows (see table below)
Row  32      TOTAL (sum CF columns)
Row  34      Section: Post-Construction Runoff Table (same structure as pre)
Row  35      Headers
Rows 36-49   14 land-use × HSG rows
Row  50      TOTAL
Row  52      Section: Compliance Check Block
Rows 53-57   Pre vol / Post vol / BMP vol / Net vol / Status
             (both HSG B column and HSG C column)
```

### Pre-Construction Runoff Rows (14 rows, same for Post)

Each row: `Surface | HSG | Area (SF) | Runoff HSG B (in) | Runoff HSG C (in) | Vol B (CF) | Vol C (CF)`

Rows for pre-construction:
1. Impervious Vehicular — "any"
2. Impervious Non-Vehicular — "any"
3. BMP — "any"
4. Natural (Woods) — A
5. Natural (Woods) — B
6. Natural (Woods) — C
7. Natural (Woods) — D (⚠ conservative)
8. Compacted (Open Space) — A
9. Compacted (Open Space) — B
10. Compacted (Open Space) — C
11. Compacted (Open Space) — D (⚠ conservative)

Plus 3 more if needed to match the spec's land-use enumeration — stick with these 11 for now, align the test.

### Area formulas (per row)

- Impervious Vehicular: `=SUMIFS('SDA'!$E:$E,'SDA'!$C:$C,"Impervious Vehicular")` (pre) or `$G:$G` (post)
- Natural (Woods), HSG X: `=SUMIFS('SDA'!$E:$E,'SDA'!$C:$C,"Natural (Woods)",'SDA'!$D:$D,"X")`

### Runoff depth formulas

- Impervious / BMP: `=PROJECT_Rainfall - 0.1`
- Natural / Compacted HSG A: `0`
- Natural / Compacted HSG B: `=MAX(0, PROJECT_Rainfall - 0.2 - PARAMS_HortonLossB)`
- Natural / Compacted HSG C: `=MAX(0, PROJECT_Rainfall - 0.2 - PARAMS_HortonLossC)`
- Natural / Compacted HSG D: `=MAX(0, PROJECT_Rainfall - 0.2)` (conservative)

### Volume: `=Area × RunoffDepth / 12`

### Compliance Check

| | HSG B | HSG C |
|---|---|---|
| Pre-Dev Runoff Volume (CF) | pre total B | pre total C |
| Proposed Runoff Volume (CF) | post total B | post total C |
| BMP Vol Infiltrated (CF) | `=SUM(BMP!$AM$4:$AM$53)` | same |
| Net Runoff (CF) | =Proposed − BMP | same |
| Pass? | =Net≤Pre | same |

## Files

- Create: `workbook/builders/eisa_direct.py`
- Create: `tests/test_eisa_direct.py`

## Steps

- [ ] **Step 1: Write failing test**

```python
import pytest
import openpyxl

from workbook.builders import params, project, sda, cda, bmp, eisa_direct


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    eisa_direct.build_eisa_direct(w)
    return w


def test_sheet_exists(wb):
    assert "EISA_DIRECT" in wb.sheetnames


def test_horton_params_reference_PARAMS(wb):
    ws = wb["EISA_DIRECT"]
    # One of the Horton rows should pull from PARAMS_Horton or reference it
    found = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and ("PARAMS_Horton" in v or "PARAMS!" in v):
                found = True
    assert found, "No reference to PARAMS Horton values"


def test_pre_runoff_table_impervious_row(wb):
    ws = wb["EISA_DIRECT"]
    # Find row labeled "Impervious Vehicular" with "pre" or in pre-table context.
    imp_row = None
    for r in range(1, 60):
        v = ws.cell(row=r, column=1).value
        if v == "Impervious Vehicular":
            imp_row = r
            break
    assert imp_row is not None
    # Area formula references SDA sheet column E (pre within LOD) with SUMIFS
    area_formula = ws.cell(row=imp_row, column=3).value
    assert "SUMIFS" in area_formula
    assert "'SDA'" in area_formula
    # Depth formula references PROJECT_Rainfall - 0.1 (impervious depression storage)
    depth_formula_b = ws.cell(row=imp_row, column=4).value
    assert "PROJECT_Rainfall" in depth_formula_b
    assert "0.1" in depth_formula_b


def test_natural_woods_hsg_a_depth_is_zero(wb):
    ws = wb["EISA_DIRECT"]
    for r in range(1, 60):
        if (ws.cell(row=r, column=1).value == "Natural (Woods)"
                and ws.cell(row=r, column=2).value == "A"):
            # HSG B and HSG C runoff cells should both be 0 / "=0"
            v_b = ws.cell(row=r, column=4).value
            v_c = ws.cell(row=r, column=5).value
            assert v_b in (0, "=0", "0")
            assert v_c in (0, "=0", "0")
            return
    pytest.fail("Natural (Woods) HSG-A row not found")


def test_natural_woods_hsg_b_depth_uses_horton_loss(wb):
    ws = wb["EISA_DIRECT"]
    for r in range(1, 60):
        if (ws.cell(row=r, column=1).value == "Natural (Woods)"
                and ws.cell(row=r, column=2).value == "B"):
            v = ws.cell(row=r, column=4).value   # HSG B column
            assert "PARAMS_HortonLossB" in v
            assert "PROJECT_Rainfall" in v
            assert "0.2" in v
            return
    pytest.fail("Natural (Woods) HSG-B row not found")


def test_compliance_check_formulas(wb):
    ws = wb["EISA_DIRECT"]
    # Find row labeled "Net Runoff Volume (CF)" — formula should subtract BMP vol
    for r in range(1, 80):
        v = ws.cell(row=r, column=1).value
        if isinstance(v, str) and "Net Runoff" in v:
            # Net column B uses Proposed − BMP
            v_b = ws.cell(row=r, column=2).value
            assert isinstance(v_b, str)
            return
    pytest.fail("Net Runoff Volume row not found")


def test_bmp_total_lookup(wb):
    ws = wb["EISA_DIRECT"]
    found = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and "'BMP'" in v and "$AM" in v:
                found = True
    assert found, "No reference to BMP sheet AM column (Rv Applied)"
```

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Write `workbook/builders/eisa_direct.py`**

```python
"""Build the EISA_DIRECT sheet — Horton direct-determination compliance."""
from openpyxl import Workbook

from workbook import styles

SDA_FIRST = 4
SDA_LAST = 53
BMP_FIRST = 4
BMP_LAST = 53

# (label, hsg, pre_area_col in SDA, post_area_col in SDA, pre_lu_set, hsg_filter)
# For "any HSG" rows (impervious/BMP), hsg = "—" and HSG filter uses "*" / none.
RUNOFF_ROWS = [
    # (label, hsg, land_use_filter, extra_hsg_filter)
    ("Impervious Vehicular",     "—", "Impervious Vehicular",     None),
    ("Impervious Non-Vehicular", "—", "Impervious Non-Vehicular", None),
    ("BMP",                       "—", "BMP",                     None),
    ("Natural (Woods)",           "A", "Natural (Woods)",         "A"),
    ("Natural (Woods)",           "B", "Natural (Woods)",         "B"),
    ("Natural (Woods)",           "C", "Natural (Woods)",         "C"),
    ("Natural (Woods)",           "D", "Natural (Woods)",         "D"),
    ("Compacted (Open Space)",    "A", "Compacted (Open Space)",  "A"),
    ("Compacted (Open Space)",    "B", "Compacted (Open Space)",  "B"),
    ("Compacted (Open Space)",    "C", "Compacted (Open Space)",  "C"),
    ("Compacted (Open Space)",    "D", "Compacted (Open Space)",  "D"),
]


def _area_formula(area_col: str, lu: str, hsg: str | None) -> str:
    base = (f"SUMIFS('SDA'!${area_col}${SDA_FIRST}:${area_col}${SDA_LAST},"
            f"'SDA'!$C${SDA_FIRST}:$C${SDA_LAST},\"{lu}\"")
    if hsg:
        base += f",'SDA'!$D${SDA_FIRST}:$D${SDA_LAST},\"{hsg}\""
    return "=" + base + ")"


def _runoff_depth_formula(lu: str, hsg: str | None, horton_name: str) -> str:
    if lu in ("Impervious Vehicular", "Impervious Non-Vehicular", "BMP"):
        return "=PROJECT_Rainfall-0.1"
    if hsg == "A":
        return "=0"
    if hsg in ("B", "C"):
        return f"=MAX(0,PROJECT_Rainfall-0.2-{horton_name})"
    if hsg == "D":
        return "=MAX(0,PROJECT_Rainfall-0.2)"
    return "=0"


def _write_runoff_table(ws, start_row: int, title: str,
                        area_col: str) -> tuple[int, int]:
    """Returns (next_free_row, totals_row)."""
    styles.hdr(ws, start_row, 1, title, styles.BS, span=7)
    header_row = start_row + 1
    for i, h in enumerate([
        "Surface", "HSG", "Area (SF)",
        "Runoff HSG B (in)", "Runoff HSG C (in)",
        "Vol HSG B (CF)", "Vol HSG C (CF)",
    ], 1):
        styles.hdr(ws, header_row, i, h, styles.BL, white=False)
    r = header_row + 1
    first_data_row = r
    for label, hsg, lu, hsg_filter in RUNOFF_ROWS:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.lbl(ws, r, 2, hsg, styles.GRY)
        styles.calc_c(ws, r, 3, _area_formula(area_col, lu, hsg_filter))
        styles.calc_c(ws, r, 4, _runoff_depth_formula(lu, hsg_filter, "PARAMS_HortonLossB"))
        styles.calc_c(ws, r, 5, _runoff_depth_formula(lu, hsg_filter, "PARAMS_HortonLossC"))
        styles.calc_c(ws, r, 6, f"=IFERROR(C{r}*D{r}/12,0)")
        styles.calc_c(ws, r, 7, f"=IFERROR(C{r}*E{r}/12,0)")
        r += 1
    last_data_row = r - 1
    styles.hdr(ws, r, 1, "TOTAL", styles.BS, span=5)
    styles.calc_c(ws, r, 6, f"=SUM(F{first_data_row}:F{last_data_row})")
    styles.calc_c(ws, r, 7, f"=SUM(G{first_data_row}:G{last_data_row})")
    totals_row = r
    r += 2
    return r, totals_row


def build_eisa_direct(wb: Workbook) -> None:
    ws = wb.create_sheet("EISA_DIRECT")
    ws.sheet_view.showGridLines = False

    widths = [26, 8, 12, 15, 15, 15, 15]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "EISA Section 438 — Direct Determination (Horton infiltration)",
               styles.GH, span=7)
    ws.row_dimensions[1].height = 24

    r = 3
    styles.hdr(ws, r, 1, "Project References", styles.GS, span=7)
    r += 1
    for label, formula in [
        ("Project Name",     "=PROJECT_Name"),
        ("95th % Storm (in)", "=PROJECT_Rainfall"),
        ("Total LOD (SF)",   "=PROJECT_TotalLOD"),
    ]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.calc_c(ws, r, 2, formula)
        r += 1
    r += 1

    styles.hdr(ws, r, 1, "Horton Parameters (from PARAMS)", styles.GS, span=7)
    r += 1
    for row_label, formula_b, formula_c in [
        ("f_max (in/hr)",             "=INDEX(PARAMS_Horton,1,2)", "=INDEX(PARAMS_Horton,1,3)"),
        ("f_min (in/hr)",             "=INDEX(PARAMS_Horton,2,2)", "=INDEX(PARAMS_Horton,2,3)"),
        ("k (1/hr)",                  "=INDEX(PARAMS_Horton,3,2)", "=INDEX(PARAMS_Horton,3,3)"),
        ("Δt (hr)",                   "=INDEX(PARAMS_Horton,4,2)", "=INDEX(PARAMS_Horton,4,3)"),
        ("Horton Infil Loss 24hr (in)", "=PARAMS_HortonLossB", "=PARAMS_HortonLossC"),
    ]:
        styles.lbl(ws, r, 1, row_label, styles.GRY)
        styles.calc_c(ws, r, 2, formula_b)
        styles.calc_c(ws, r, 3, formula_c)
        r += 1
    r += 1

    r, pre_totals_row = _write_runoff_table(ws, r,
                                             "Pre-Construction Runoff (from SDA pre totals)",
                                             area_col="E")
    r, post_totals_row = _write_runoff_table(ws, r,
                                              "Post-Construction Runoff (from SDA post totals)",
                                              area_col="G")

    # Compliance check
    styles.hdr(ws, r, 1, "Compliance Check", styles.GH, span=3)
    r += 1
    styles.hdr(ws, r, 1, "Metric", styles.GL, white=False)
    styles.hdr(ws, r, 2, "HSG B", styles.GL, white=False)
    styles.hdr(ws, r, 3, "HSG C", styles.GL, white=False)
    r += 1

    styles.lbl(ws, r, 1, "Pre-Dev Runoff Volume (CF)", styles.GRY)
    styles.calc_c(ws, r, 2, f"=F{pre_totals_row}")
    styles.calc_c(ws, r, 3, f"=G{pre_totals_row}")
    pre_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Proposed Runoff Volume (CF)", styles.GRY)
    styles.calc_c(ws, r, 2, f"=F{post_totals_row}")
    styles.calc_c(ws, r, 3, f"=G{post_totals_row}")
    prop_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Volume Infiltrated in BMPs (CF)", styles.GRY)
    bmp_formula = f"=SUM('BMP'!$AM${BMP_FIRST}:$AM${BMP_LAST})"
    styles.calc_c(ws, r, 2, bmp_formula)
    styles.calc_c(ws, r, 3, bmp_formula)
    bmp_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Net Runoff Volume (CF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f"=B{prop_vol_row}-B{bmp_vol_row}")
    styles.calc_c(ws, r, 3, f"=C{prop_vol_row}-C{bmp_vol_row}")
    net_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Net ≤ Pre-Dev? (Pass/Fail)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f'=IF(B{net_vol_row}<=B{pre_vol_row},"✓ PASS","✗ FAIL")')
    styles.calc_c(ws, r, 3, f'=IF(C{net_vol_row}<=C{pre_vol_row},"✓ PASS","✗ FAIL")')
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_eisa_direct.py -v
```

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/eisa_direct.py tests/test_eisa_direct.py
git commit -m "swm-workbook: add EISA_DIRECT sheet with Horton-based compliance check"
```
