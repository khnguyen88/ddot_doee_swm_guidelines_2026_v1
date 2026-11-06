# Task 10: EISA_TR55 Sheet

**Depends on:** 02, 05, 07. **Blocks:** 12, 13, 14.

## Context

EISA_TR55 is the companion sheet to EISA_DIRECT — same compliance question (`Net Post ≤ Pre`) but using the TR-55 Curve Number method instead of Horton. Shows two methods side by side:

1. **Method A — individual CN per row:** each land-use × HSG cell gets its own CN from PARAMS_CN, Q computed per TR-55 formula.
2. **Method B — composite CN:** optional cross-check that computes a weighted composite CN across all non-HSG-A/non-HSG-B-natural areas, applies TR-55 once.

Primary result for compliance = Method A.

### Row layout

```
Row 1       Title
Row 3-5     Project refs
Row 7       Section: CN Lookup Reference (from PARAMS)
Rows 8-12   CN table reference (passthrough from PARAMS_CN)
Row 14      Section: Pre-Construction Runoff (Method A — individual CN)
Row 15      Headers: Surface | HSG | CN | Area (SF) | Q (in) | Vol (CF)
Rows 16-26  11 land-use × HSG rows (same enumeration as EISA_DIRECT)
Row 27      TOTAL
Row 29      Section: Post-Construction Runoff (Method A)
Row 30      Headers
Rows 31-41  11 rows
Row 42      TOTAL
Row 44      Section: Method B — Composite CN (optional cross-check)
Rows 45-48  Active area, Composite CN, S, Ia, Q, Vol — for pre and post
Row 50      Section: Compliance Check (uses Method A totals)
Rows 51-55  Pre vol / Prop vol / BMP vol / Net vol / Pass
```

### Key formulas

**CN lookup:** For each row, CN comes from `PARAMS_CN` using HSG column:

- Impervious / BMP → always 98
- Natural (Woods) HSG A/B/C/D → 25/55/70/77 (from PARAMS_CN row 3, cols 2-5)
- Compacted HSG A/B/C/D → 39/61/74/80 (from PARAMS_CN row 4, cols 2-5)

Since land use + HSG combo is known at build time, emit the exact INDEX call. E.g. Natural HSG B: `=INDEX(PARAMS_CN,3,3)`.

**Runoff depth Q (TR-55):**

```
S = 1000/CN - 10
Ia = 0.2*S
Q = IF(P > Ia, (P-Ia)^2/(P-Ia+S), 0)
```

For a given row with a known CN cell reference `cn_cell`:
```
=IFERROR(IF(PROJECT_Rainfall>0.2*(1000/{cn_cell}-10),
          (PROJECT_Rainfall-0.2*(1000/{cn_cell}-10))^2
           /(PROJECT_Rainfall-0.2*(1000/{cn_cell}-10)+(1000/{cn_cell}-10)),
          0),0)
```

**Volume:** `=Area × Q / 12`

### Composite CN method

Active area = Total LOD − HSG A natural − HSG B natural (negligible-runoff exclusions).
Composite CN = `Σ(Area × CN) / Active Area`.
Then TR-55 applied once.

## Files

- Create: `workbook/builders/eisa_tr55.py`
- Create: `tests/test_eisa_tr55.py`

## Steps

- [ ] **Step 1: Write failing test**

```python
import pytest
import openpyxl

from workbook.builders import params, project, sda, cda, bmp, eisa_tr55


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    eisa_tr55.build_eisa_tr55(w)
    return w


def test_sheet_exists(wb):
    assert "EISA_TR55" in wb.sheetnames


def test_cn_lookup_impervious_98(wb):
    ws = wb["EISA_TR55"]
    for r in range(1, 60):
        if ws.cell(row=r, column=1).value == "Impervious Vehicular":
            cn_val = ws.cell(row=r, column=3).value
            assert cn_val == 98 or cn_val == "=98" or (isinstance(cn_val, str) and "98" in cn_val)
            return
    pytest.fail("Impervious Vehicular row not found")


def test_cn_lookup_natural_hsg_b(wb):
    ws = wb["EISA_TR55"]
    for r in range(1, 60):
        if (ws.cell(row=r, column=1).value == "Natural (Woods)"
                and ws.cell(row=r, column=2).value == "B"):
            cn_val = ws.cell(row=r, column=3).value
            # Expect INDEX(PARAMS_CN,3,3) OR literal 55
            assert cn_val == 55 or "PARAMS_CN" in str(cn_val)
            return
    pytest.fail("Natural (Woods) HSG-B row not found")


def test_tr55_runoff_formula(wb):
    ws = wb["EISA_TR55"]
    # Find any Q column cell and check it contains the TR-55 formula pattern
    found = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and "PROJECT_Rainfall" in v and "1000/" in v:
                found = True
    assert found, "No TR-55 runoff formula found"


def test_compliance_check_exists(wb):
    ws = wb["EISA_TR55"]
    labels = []
    for r in range(1, 80):
        v = ws.cell(row=r, column=1).value
        if v: labels.append(str(v))
    assert any("Net" in l for l in labels)
    assert any("Pass" in l or "PASS" in l or "Compliance" in l for l in labels)


def test_bmp_total_referenced(wb):
    ws = wb["EISA_TR55"]
    found = False
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and "'BMP'" in v and "AM" in v:
                found = True
    assert found
```

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Write `workbook/builders/eisa_tr55.py`**

```python
"""Build the EISA_TR55 sheet — CN-based compliance (Method A + Method B)."""
from openpyxl import Workbook

from workbook import styles

SDA_FIRST = 4
SDA_LAST = 53
BMP_FIRST = 4
BMP_LAST = 53

# (label, hsg, land_use, hsg_filter, cn_formula)
# CN formulas: for impervious/BMP → 98; natural/compacted → INDEX(PARAMS_CN, row, col)
# PARAMS_CN rows: 1=Impervious, 2=BMP, 3=Natural (Woods), 4=Compacted (Open Space)
# PARAMS_CN cols: 2=A, 3=B, 4=C, 5=D
RUNOFF_ROWS = [
    ("Impervious Vehicular",     "—", "Impervious Vehicular",     None,  98),
    ("Impervious Non-Vehicular", "—", "Impervious Non-Vehicular", None,  98),
    ("BMP",                       "—", "BMP",                     None,  "=INDEX(PARAMS_CN,2,2)"),
    ("Natural (Woods)",           "A", "Natural (Woods)",         "A",   "=INDEX(PARAMS_CN,3,2)"),
    ("Natural (Woods)",           "B", "Natural (Woods)",         "B",   "=INDEX(PARAMS_CN,3,3)"),
    ("Natural (Woods)",           "C", "Natural (Woods)",         "C",   "=INDEX(PARAMS_CN,3,4)"),
    ("Natural (Woods)",           "D", "Natural (Woods)",         "D",   "=INDEX(PARAMS_CN,3,5)"),
    ("Compacted (Open Space)",    "A", "Compacted (Open Space)",  "A",   "=INDEX(PARAMS_CN,4,2)"),
    ("Compacted (Open Space)",    "B", "Compacted (Open Space)",  "B",   "=INDEX(PARAMS_CN,4,3)"),
    ("Compacted (Open Space)",    "C", "Compacted (Open Space)",  "C",   "=INDEX(PARAMS_CN,4,4)"),
    ("Compacted (Open Space)",    "D", "Compacted (Open Space)",  "D",   "=INDEX(PARAMS_CN,4,5)"),
]


def _area_formula(area_col: str, lu: str, hsg_filter: str | None) -> str:
    base = (f"SUMIFS('SDA'!${area_col}${SDA_FIRST}:${area_col}${SDA_LAST},"
            f"'SDA'!$C${SDA_FIRST}:$C${SDA_LAST},\"{lu}\"")
    if hsg_filter:
        base += f",'SDA'!$D${SDA_FIRST}:$D${SDA_LAST},\"{hsg_filter}\""
    return "=" + base + ")"


def _q_formula(cn_cell: str) -> str:
    S = f"(1000/{cn_cell}-10)"
    Ia = f"0.2*{S}"
    return (f"=IFERROR(IF(PROJECT_Rainfall>{Ia},"
            f"(PROJECT_Rainfall-{Ia})^2/(PROJECT_Rainfall-{Ia}+{S}),0),0)")


def _write_runoff_table(ws, start_row: int, title: str, area_col: str
                        ) -> tuple[int, int]:
    styles.hdr(ws, start_row, 1, title, styles.GS, span=6)
    header_row = start_row + 1
    for i, h in enumerate([
        "Surface", "HSG", "CN", "Area (SF)", "Q (in)", "Vol (CF)",
    ], 1):
        styles.hdr(ws, header_row, i, h, styles.GL, white=False)

    r = header_row + 1
    first_data = r
    for label, hsg, lu, hsg_filter, cn_val in RUNOFF_ROWS:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.lbl(ws, r, 2, hsg, styles.GRY)
        if isinstance(cn_val, int):
            styles.lbl(ws, r, 3, cn_val, styles.GRY, bold=True)
        else:
            styles.calc_c(ws, r, 3, cn_val)
        styles.calc_c(ws, r, 4, _area_formula(area_col, lu, hsg_filter))
        styles.calc_c(ws, r, 5, _q_formula(f"C{r}"))
        styles.calc_c(ws, r, 6, f"=IFERROR(D{r}*E{r}/12,0)")
        r += 1
    last_data = r - 1
    styles.hdr(ws, r, 1, "TOTAL", styles.GS, span=5)
    styles.calc_c(ws, r, 6, f"=SUM(F{first_data}:F{last_data})")
    totals_row = r
    r += 2
    return r, totals_row


def build_eisa_tr55(wb: Workbook) -> None:
    ws = wb.create_sheet("EISA_TR55")
    ws.sheet_view.showGridLines = False

    widths = [26, 8, 10, 13, 11, 13]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "EISA Section 438 — TR-55 CN Method (Method A primary)",
               styles.GH, span=6)
    ws.row_dimensions[1].height = 24

    r = 3
    styles.hdr(ws, r, 1, "Project References", styles.GS, span=6)
    r += 1
    for label, formula in [
        ("Project Name",      "=PROJECT_Name"),
        ("95th % Storm (in)", "=PROJECT_Rainfall"),
        ("Total LOD (SF)",    "=PROJECT_TotalLOD"),
    ]:
        styles.lbl(ws, r, 1, label, styles.GRY)
        styles.calc_c(ws, r, 2, formula)
        r += 1
    r += 1

    r, pre_totals_row  = _write_runoff_table(ws, r, "Pre-Construction Runoff (Method A)", "E")
    r, post_totals_row = _write_runoff_table(ws, r, "Post-Construction Runoff (Method A)", "G")

    # Compliance check
    styles.hdr(ws, r, 1, "Compliance Check (Method A)", styles.GH, span=2)
    r += 1

    styles.lbl(ws, r, 1, "Pre-Dev Runoff Volume (CF)", styles.GRY)
    styles.calc_c(ws, r, 2, f"=F{pre_totals_row}")
    pre_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Proposed Runoff Volume (CF)", styles.GRY)
    styles.calc_c(ws, r, 2, f"=F{post_totals_row}")
    prop_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Volume Infiltrated in BMPs (CF)", styles.GRY)
    styles.calc_c(ws, r, 2, f"=SUM('BMP'!$AM${BMP_FIRST}:$AM${BMP_LAST})")
    bmp_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Net Runoff Volume (CF)", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2, f"=B{prop_vol_row}-B{bmp_vol_row}")
    net_vol_row = r
    r += 1

    styles.lbl(ws, r, 1, "Net ≤ Pre-Dev?", styles.GRY, bold=True)
    styles.calc_c(ws, r, 2,
                  f'=IF(B{net_vol_row}<=B{pre_vol_row},"✓ PASS","✗ FAIL")')
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_eisa_tr55.py -v
```

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/eisa_tr55.py tests/test_eisa_tr55.py
git commit -m "swm-workbook: add EISA_TR55 sheet with CN-based compliance (Method A)"
```
