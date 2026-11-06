# Task 03: PARAMS Sheet

**Depends on:** Task 01. **Blocks:** 05-11.

## Context

PARAMS is the single source of truth for every constant in the workbook — Rv, CN, Horton parameters, depression storage, BMP design parameters, tree credits, detention storm depths. All later sheets VLOOKUP into PARAMS via **named ranges**. Builders register named ranges when they write their sheet so the row/column numbers used in formulas are isolated to this module.

### Fixed row layout (used by named ranges)

| Rows | Named range | Content |
|---|---|---|
| 3 | — | Title |
| 5 | — | Section: "Runoff Coefficients (Rv)" |
| 6 | — | Header: Land Use \| Rv |
| 7-11 | `PARAMS_Rv` → `A7:B11` | Rv values (5 land uses) |
| 13 | — | Section: "TR-55 Curve Numbers" |
| 14 | — | Header: Land Use \| HSG A \| HSG B \| HSG C \| HSG D |
| 15-18 | `PARAMS_CN` → `A15:E18` | CN table (4 land uses) |
| 20 | — | Section: "Horton Parameters" |
| 21 | — | Header: Parameter \| HSG B \| HSG C |
| 22-25 | `PARAMS_Horton` → `A22:C25` | f_max, f_min, k, Δt |
| 26 | — | Pre-computed loss row: Infil Loss (in) \| B value \| C value |
| 28 | — | Section: "Depression Storage" |
| 29 | — | Header: Surface \| Depth (in) |
| 30-32 | `PARAMS_Depression` → `A30:B32` | 3 surface types |
| 34 | — | Section: "BMP Design Parameters" |
| 35 | — | Header |
| 36-42 | `PARAMS_BMP` → `A36:G42` | 7 BMP type/sub-type rows |
| 44 | — | Section: "Tree Credits" |
| 45 | — | Header |
| 46-51 | `PARAMS_Trees` → `A46:C51` | 6 tree types |
| 53 | — | Section: "Detention Storm Depths" |
| 54 | — | Header |
| 55-57 | `PARAMS_Detention` → `A55:B57` | 3 storms |
| 59 | — | Section: "DOEE Detention CN Defaults" |
| 60 | — | Header |
| 61-64 | `PARAMS_DetentionCN` → `A61:B64` | 4 land cover types |

## Files

- Create: `workbook/builders/params.py`
- Create: `tests/test_params.py`

## Steps

- [ ] **Step 1: Write failing test**

Create `tests/test_params.py`:

```python
"""Tests for the PARAMS sheet builder."""
import pytest
import openpyxl

from workbook.builders import params


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    return w


def test_params_sheet_exists(wb):
    assert "PARAMS" in wb.sheetnames


def test_rv_table_values(wb):
    ws = wb["PARAMS"]
    expected = [
        ("Impervious Vehicular", 0.95),
        ("Impervious Non-Vehicular", 0.95),
        ("Compacted (Open Space)", 0.25),
        ("Natural (Woods)", 0.00),
        ("BMP", 0.00),
    ]
    for i, (name, rv) in enumerate(expected):
        r = 7 + i
        assert ws.cell(row=r, column=1).value == name
        assert ws.cell(row=r, column=2).value == pytest.approx(rv)


def test_cn_table_values(wb):
    ws = wb["PARAMS"]
    # Row 15 Impervious, 16 BMP, 17 Natural, 18 Compacted — per layout.
    expected = [
        (15, "Impervious", 98, 98, 98, 98),
        (16, "BMP",        98, 98, 98, 98),
        (17, "Natural (Woods)",       25, 55, 70, 77),
        (18, "Compacted (Open Space)", 39, 61, 74, 80),
    ]
    for r, label, a, b, c, d in expected:
        assert ws.cell(row=r, column=1).value == label
        assert ws.cell(row=r, column=2).value == a
        assert ws.cell(row=r, column=3).value == b
        assert ws.cell(row=r, column=4).value == c
        assert ws.cell(row=r, column=5).value == d


def test_horton_parameters(wb):
    ws = wb["PARAMS"]
    # Row 22 f_max, 23 f_min, 24 k, 25 Δt
    assert ws.cell(row=22, column=2).value == 5.0
    assert ws.cell(row=22, column=3).value == 3.0
    assert ws.cell(row=23, column=2).value == 0.3
    assert ws.cell(row=23, column=3).value == 0.1
    assert ws.cell(row=24, column=2).value == 2.0
    assert ws.cell(row=24, column=3).value == 3.5
    assert ws.cell(row=25, column=2).value == 0.5
    assert ws.cell(row=25, column=3).value == 0.5


def test_horton_precomputed_losses(wb):
    """Row 26 holds the pre-computed Horton infil-loss integrals."""
    from workbook import calculations as calc
    ws = wb["PARAMS"]
    assert ws.cell(row=26, column=2).value == pytest.approx(calc.HORTON_INFIL_LOSS_B, rel=1e-6)
    assert ws.cell(row=26, column=3).value == pytest.approx(calc.HORTON_INFIL_LOSS_C, rel=1e-6)


def test_depression_storage(wb):
    ws = wb["PARAMS"]
    assert ws.cell(row=30, column=2).value == 0.1   # Impervious
    assert ws.cell(row=31, column=2).value == 0.2   # Pervious
    assert ws.cell(row=32, column=2).value == 0.1   # BMP surface


def test_bmp_parameters_rows(wb):
    ws = wb["PARAMS"]
    # Row 36 Permeable Pavement Enhanced — retention mult 1.0
    assert ws.cell(row=36, column=1).value == "Permeable Pavement"
    assert ws.cell(row=36, column=2).value == "Enhanced"
    assert ws.cell(row=36, column=6).value == pytest.approx(1.0)
    # Row 37 Permeable Pavement Underdrained Enhanced — mult 0.6
    assert ws.cell(row=37, column=2).value == "Underdrained Enhanced"
    assert ws.cell(row=37, column=6).value == pytest.approx(0.6)
    # Row 38 Bioretention Standard — mult 0.6
    assert ws.cell(row=38, column=1).value == "Bioretention"
    assert ws.cell(row=38, column=2).value == "Standard"
    assert ws.cell(row=38, column=6).value == pytest.approx(0.6)
    # Row 39 Bioretention Enhanced — mult 1.0
    assert ws.cell(row=39, column=6).value == pytest.approx(1.0)
    # Row 40 Bioretention Enhanced w/ Underdrain — mult 0.6
    assert ws.cell(row=40, column=6).value == pytest.approx(0.6)
    # Row 41 Dry Swale — mult 0.6
    assert ws.cell(row=41, column=1).value == "Dry Swale"
    assert ws.cell(row=41, column=6).value == pytest.approx(0.6)
    # Row 42 Wet Swale — mult 0.1
    assert ws.cell(row=42, column=1).value == "Wet Swale"
    assert ws.cell(row=42, column=6).value == pytest.approx(0.1)


def test_tree_credits(wb):
    ws = wb["PARAMS"]
    expected = [
        ("T-1 Small",     5),
        ("T-1 Large",     10),
        ("T-2 Small",     10),
        ("T-2 Large",     20),
        ("T-2 Special",   30),
        ("T-2 Heritage",  40),
    ]
    for i, (code, credit) in enumerate(expected):
        r = 46 + i
        assert ws.cell(row=r, column=1).value == code
        assert ws.cell(row=r, column=3).value == credit


def test_detention_storm_depths(wb):
    ws = wb["PARAMS"]
    assert ws.cell(row=55, column=1).value == "2-year"
    assert ws.cell(row=55, column=2).value == pytest.approx(3.14)
    assert ws.cell(row=56, column=1).value == "15-year"
    assert ws.cell(row=56, column=2).value == pytest.approx(5.23)
    assert ws.cell(row=57, column=1).value == "100-year"
    assert ws.cell(row=57, column=2).value == pytest.approx(8.34)


def test_detention_cn_defaults(wb):
    ws = wb["PARAMS"]
    expected = [("Natural", 70), ("Compacted", 74), ("Impervious", 98), ("BMP", 98)]
    for i, (name, cn) in enumerate(expected):
        r = 61 + i
        assert ws.cell(row=r, column=1).value == name
        assert ws.cell(row=r, column=2).value == cn


def test_named_ranges_defined(wb):
    expected_names = {
        "PARAMS_Rv":           "'PARAMS'!$A$7:$B$11",
        "PARAMS_CN":           "'PARAMS'!$A$15:$E$18",
        "PARAMS_Horton":       "'PARAMS'!$A$22:$C$25",
        "PARAMS_Depression":   "'PARAMS'!$A$30:$B$32",
        "PARAMS_BMP":          "'PARAMS'!$A$36:$G$42",
        "PARAMS_Trees":        "'PARAMS'!$A$46:$C$51",
        "PARAMS_Detention":    "'PARAMS'!$A$55:$B$57",
        "PARAMS_DetentionCN":  "'PARAMS'!$A$61:$B$64",
        "PARAMS_HortonLossB":  "'PARAMS'!$B$26",
        "PARAMS_HortonLossC":  "'PARAMS'!$C$26",
    }
    actual_names = {dn.name for dn in wb.defined_names.values()}
    for name in expected_names:
        assert name in actual_names, f"Missing named range: {name}"
    for name, addr in expected_names.items():
        dn = wb.defined_names[name]
        assert dn.attr_text == addr, f"{name}: {dn.attr_text!r} != {addr!r}"
```

- [ ] **Step 2: Run test — expect failure**

```bash
pytest tests/test_params.py -v
```

Expected: ALL FAIL (module does not exist).

- [ ] **Step 3: Write `workbook/builders/params.py`**

```python
"""Build the PARAMS sheet — all lookup tables + named ranges."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName

from workbook import styles, calculations as calc


def build_params_sheet(wb: Workbook) -> None:
    ws = wb.create_sheet("PARAMS")
    ws.sheet_view.showGridLines = False

    for i, w in enumerate([36, 14, 14, 14, 14, 14, 14], 1):
        styles.cw(ws, i, w)

    # Title.
    styles.hdr(ws, 1, 1, "PARAMS — Locked Lookup Tables (do not edit)",
               styles.BH, span=7)
    ws.row_dimensions[1].height = 24

    # ── Section 1: Rv ──
    styles.hdr(ws, 5, 1, "Runoff Coefficients (Rv) for SWRv", styles.BS, span=7)
    styles.lbl(ws, 6, 1, "Land Use", styles.BL, bold=True)
    styles.lbl(ws, 6, 2, "Rv", styles.BL, bold=True)
    rv_rows = [
        ("Impervious Vehicular",     0.95),
        ("Impervious Non-Vehicular", 0.95),
        ("Compacted (Open Space)",   0.25),
        ("Natural (Woods)",          0.00),
        ("BMP",                       0.00),
    ]
    for i, (name, rv) in enumerate(rv_rows):
        r = 7 + i
        styles.lbl(ws, r, 1, name)
        styles.lbl(ws, r, 2, rv, styles.GRY)

    # ── Section 2: TR-55 CN ──
    styles.hdr(ws, 13, 1, "TR-55 Curve Numbers by Land Use × HSG",
               styles.GS, span=7)
    for i, h in enumerate(["Land Use", "HSG A", "HSG B", "HSG C", "HSG D"], 1):
        styles.lbl(ws, 14, i, h, styles.GL, bold=True)
    cn_rows = [
        ("Impervious",              98, 98, 98, 98),
        ("BMP",                     98, 98, 98, 98),
        ("Natural (Woods)",         25, 55, 70, 77),
        ("Compacted (Open Space)",  39, 61, 74, 80),
    ]
    for i, row in enumerate(cn_rows):
        r = 15 + i
        for j, v in enumerate(row):
            styles.lbl(ws, r, j + 1, v, styles.GRY)

    # ── Section 3: Horton parameters ──
    styles.hdr(ws, 20, 1, "Horton Infiltration Parameters", styles.GS, span=7)
    for i, h in enumerate(["Parameter", "HSG B", "HSG C"], 1):
        styles.lbl(ws, 21, i, h, styles.GL, bold=True)
    horton_rows = [
        ("f_max (in/hr)",  5.0, 3.0),
        ("f_min (in/hr)",  0.3, 0.1),
        ("k (1/hr)",       2.0, 3.5),
        ("Δt (hr)",        0.5, 0.5),
    ]
    for i, row in enumerate(horton_rows):
        r = 22 + i
        for j, v in enumerate(row):
            styles.lbl(ws, r, j + 1, v, styles.GRY)

    # Pre-computed loss integrals.
    styles.lbl(ws, 26, 1, "Infil Loss over 24 hr (in)", styles.GL, bold=True)
    styles.lbl(ws, 26, 2, calc.HORTON_INFIL_LOSS_B, styles.GRY)
    styles.lbl(ws, 26, 3, calc.HORTON_INFIL_LOSS_C, styles.GRY)

    # ── Section 4: Depression storage ──
    styles.hdr(ws, 28, 1, "Depression Storage", styles.BS, span=7)
    for i, h in enumerate(["Surface", "Depth (in)"], 1):
        styles.lbl(ws, 29, i, h, styles.BL, bold=True)
    for i, (name, d) in enumerate([
        ("Impervious (roof/pavement)", 0.1),
        ("Pervious",                   0.2),
        ("BMP surface",                0.1),
    ]):
        r = 30 + i
        styles.lbl(ws, r, 1, name)
        styles.lbl(ws, r, 2, d, styles.GRY)

    # ── Section 5: BMP design parameters ──
    styles.hdr(ws, 34, 1, "BMP Design Parameters", styles.BS, span=7)
    for i, h in enumerate([
        "BMP Type", "Sub-Type", "n_media", "n_gravel", "n_reservoir",
        "Ret. Multiplier", "Max Drawdown (days)",
    ], 1):
        styles.lbl(ws, 35, i, h, styles.BL, bold=True)
    bmp_rows = [
        ("Permeable Pavement", "Enhanced",               None, None, 0.40, 1.0, 2),
        ("Permeable Pavement", "Underdrained Enhanced",  None, None, 0.40, 0.6, 2),
        ("Bioretention",       "Standard",               0.40, 0.40, None, 0.6, 3),
        ("Bioretention",       "Enhanced",               0.40, 0.40, None, 1.0, 3),
        ("Bioretention",       "Enhanced w/ Underdrain", 0.40, 0.40, None, 0.6, 3),
        ("Dry Swale",          "—",                      0.40, 0.40, None, 0.6, 3),
        ("Wet Swale",          "—",                      None, None, None, 0.1, None),
    ]
    for i, row in enumerate(bmp_rows):
        r = 36 + i
        for j, v in enumerate(row):
            if v is None:
                styles.locked(ws, r, j + 1, "—")
            else:
                styles.lbl(ws, r, j + 1, v, styles.GRY)

    # ── Section 6: Tree Credits ──
    styles.hdr(ws, 44, 1, "Tree Credits", styles.GS, span=7)
    for i, h in enumerate(["Code", "Description", "Rv per unit (CF)"], 1):
        styles.lbl(ws, 45, i, h, styles.GL, bold=True)
    tree_rows = [
        ("T-1 Small",    "Planted small tree",     5),
        ("T-1 Large",    "Planted large tree",     10),
        ("T-2 Small",    "Preserved small tree",   10),
        ("T-2 Large",    "Preserved large tree",   20),
        ("T-2 Special",  "Preserved special tree", 30),
        ("T-2 Heritage", "Preserved heritage tree",40),
    ]
    for i, (code, desc, credit) in enumerate(tree_rows):
        r = 46 + i
        styles.lbl(ws, r, 1, code, styles.GRY, bold=True)
        styles.lbl(ws, r, 2, desc)
        styles.lbl(ws, r, 3, credit, styles.GRY)

    # ── Section 7: Detention storm depths ──
    styles.hdr(ws, 53, 1, "Detention Storm Depths (DC, from NRCS TR-55)",
               styles.BS, span=7)
    for i, h in enumerate(["Storm", "Depth (in)"], 1):
        styles.lbl(ws, 54, i, h, styles.BL, bold=True)
    for i, (name, d) in enumerate([("2-year", 3.14), ("15-year", 5.23), ("100-year", 8.34)]):
        r = 55 + i
        styles.lbl(ws, r, 1, name)
        styles.lbl(ws, r, 2, d, styles.GRY)

    # ── Section 8: Detention CN defaults ──
    styles.hdr(ws, 59, 1, "DOEE Detention CN Defaults", styles.BS, span=7)
    for i, h in enumerate(["Land Cover", "CN"], 1):
        styles.lbl(ws, 60, i, h, styles.BL, bold=True)
    for i, (name, cn) in enumerate([("Natural", 70), ("Compacted", 74),
                                     ("Impervious", 98), ("BMP", 98)]):
        r = 61 + i
        styles.lbl(ws, r, 1, name)
        styles.lbl(ws, r, 2, cn, styles.GRY)

    # ── Named ranges ──
    _add_named_ranges(wb)


def _add_named_ranges(wb: Workbook) -> None:
    ranges = {
        "PARAMS_Rv":           "'PARAMS'!$A$7:$B$11",
        "PARAMS_CN":           "'PARAMS'!$A$15:$E$18",
        "PARAMS_Horton":       "'PARAMS'!$A$22:$C$25",
        "PARAMS_Depression":   "'PARAMS'!$A$30:$B$32",
        "PARAMS_BMP":          "'PARAMS'!$A$36:$G$42",
        "PARAMS_Trees":        "'PARAMS'!$A$46:$C$51",
        "PARAMS_Detention":    "'PARAMS'!$A$55:$B$57",
        "PARAMS_DetentionCN":  "'PARAMS'!$A$61:$B$64",
        "PARAMS_HortonLossB":  "'PARAMS'!$B$26",
        "PARAMS_HortonLossC":  "'PARAMS'!$C$26",
    }
    for name, addr in ranges.items():
        wb.defined_names.add(DefinedName(name, attr_text=addr))
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_params.py -v
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/params.py tests/test_params.py
git commit -m "swm-workbook: add PARAMS sheet with lookup tables and named ranges"
```
