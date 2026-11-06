# Task 01: Scaffold + Styles Module

**Depends on:** nothing. **Blocks:** everything else.

## Context

Set up the `workbook/` package, test harness, `requirements.txt`, and `styles.py` module with openpyxl styling helpers. This mirrors the helper pattern in the existing `scripts/generate_sw_spreadsheet.py` (fill/font/border/alignment, `hdr`, `inp`, `calc_c`, `lbl`, `cw`) but as reusable module functions.

## Files

- Create: `requirements.txt`
- Create: `workbook/__init__.py` (empty)
- Create: `workbook/styles.py`
- Create: `workbook/builders/__init__.py` (empty)
- Create: `tests/__init__.py` (empty)
- Create: `tests/conftest.py`
- Create: `tests/test_styles.py`
- Create: `generate_workbook.py` (shell — just `main()` that saves an empty workbook)

## Steps

- [ ] **Step 1: Create `requirements.txt`**

```
openpyxl>=3.1
pytest>=7.0
```

- [ ] **Step 2: Create empty package markers**

```bash
mkdir -p workbook/builders tests
echo "" > workbook/__init__.py
echo "" > workbook/builders/__init__.py
echo "" > tests/__init__.py
```

- [ ] **Step 3: Write `generate_workbook.py` shell**

```python
"""Entry point for SW_Required_Provided_DOEE_EISA438.xlsx generator.

Builds a 12-sheet DOEE + EISA Section 438 compliance workbook. See
docs/superpowers/plans/2026-10-28-swm-workbook-redesign/README.md.
"""
from pathlib import Path
import openpyxl

OUTPUT = Path(__file__).parent / "SW_Required_Provided_DOEE_EISA438.xlsx"


def build_workbook() -> openpyxl.Workbook:
    wb = openpyxl.Workbook()
    # Remove the default empty sheet; builders will add their own.
    default = wb.active
    wb.remove(default)
    return wb


def main() -> Path:
    wb = build_workbook()
    # Builders will be added here as later tasks complete them.
    # Placeholder: write a single sheet so the file is valid.
    wb.create_sheet("PLACEHOLDER")
    wb.save(OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    out = main()
    print(f"Saved: {out}")
```

- [ ] **Step 4: Write failing test for styles helpers**

Create `tests/test_styles.py`:

```python
"""Unit tests for workbook.styles helpers."""
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border

from workbook import styles


def test_fill_returns_pattern_fill():
    f = styles.fill("FFFFFF")
    assert isinstance(f, PatternFill)
    assert f.fgColor.rgb in ("00FFFFFF", "FFFFFFFF")


def test_font_bold_white():
    fnt = styles.fnt(bold=True, white=True, sz=12)
    assert isinstance(fnt, Font)
    assert fnt.bold is True
    assert fnt.color.rgb in ("00FFFFFF", "FFFFFFFF")
    assert fnt.size == 12


def test_border_returns_thin_border():
    b = styles.bord()
    assert isinstance(b, Border)
    assert b.left.style == "thin"
    assert b.top.style == "thin"


def test_alignments():
    assert isinstance(styles.ctr(), Alignment)
    assert styles.ctr().horizontal == "center"
    assert styles.lft().horizontal == "left"


def test_hdr_writes_bold_white_cell():
    wb = Workbook()
    ws = wb.active
    styles.hdr(ws, 1, 1, "TITLE", styles.BH)
    cell = ws.cell(row=1, column=1)
    assert cell.value == "TITLE"
    assert cell.font.bold is True
    assert cell.fill.fgColor.rgb in ("00" + styles.BH, "FF" + styles.BH)


def test_hdr_with_span_merges():
    wb = Workbook()
    ws = wb.active
    styles.hdr(ws, 1, 1, "TITLE", styles.BH, span=3)
    # Columns 1-3 of row 1 should be merged.
    merged = [str(mr) for mr in ws.merged_cells.ranges]
    assert "A1:C1" in merged


def test_inp_writes_yellow_input_cell():
    wb = Workbook()
    ws = wb.active
    styles.inp(ws, 2, 1, 42)
    cell = ws.cell(row=2, column=1)
    assert cell.value == 42
    assert cell.fill.fgColor.rgb in ("00" + styles.INP, "FF" + styles.INP)


def test_calc_c_writes_formula_cell():
    wb = Workbook()
    ws = wb.active
    styles.calc_c(ws, 2, 1, "=1+1")
    cell = ws.cell(row=2, column=1)
    assert cell.value == "=1+1"
    assert cell.fill.fgColor.rgb in ("00" + styles.CALC, "FF" + styles.CALC)


def test_cw_sets_column_width():
    wb = Workbook()
    ws = wb.active
    styles.cw(ws, 3, 24)
    assert ws.column_dimensions["C"].width == 24


def test_cl_converts_index_to_letter():
    assert styles.cl(1) == "A"
    assert styles.cl(27) == "AA"
    assert styles.cl(53) == "BA"
```

- [ ] **Step 5: Write `conftest.py`**

```python
"""Shared pytest fixtures."""
import pytest

import generate_workbook


@pytest.fixture(scope="session")
def wb():
    """Session-scoped workbook — built once, read by all structural tests."""
    return generate_workbook.build_workbook()
```

- [ ] **Step 6: Run tests — expect failure**

```bash
pytest tests/test_styles.py -v
```

Expected: ALL FAIL with `ModuleNotFoundError: No module named 'workbook.styles'`.

- [ ] **Step 7: Write `workbook/styles.py`**

```python
"""Shared openpyxl styling helpers.

Color constants and helpers for building DOEE/EISA stormwater workbook sheets.
Mirrors the helper API used in the legacy scripts/generate_sw_spreadsheet.py.
"""
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet

# ── Color palette ─────────────────────────────────────────────────────────────
BH = "1F4E79"   # DOEE dark header
BS = "2E75B6"   # DOEE mid
BL = "BDD7EE"   # DOEE light
GH = "375623"   # EISA dark header
GS = "538135"   # EISA mid
GL = "E2EFDA"   # EISA light
INP = "FFFFC7"  # input cell (yellow)
CALC = "DEEAF1" # auto-calc cell (pale blue)
GRY = "F2F2F2"  # label background
WHT = "FFFFFF"  # white
LOCK = "D9D9D9" # locked / inactive column background
WARN = "FFF2CC" # yellow warning (data validation flag)
FAIL = "F8CBAD" # red / fail


def fill(color_hex: str) -> PatternFill:
    return PatternFill("solid", fgColor=color_hex)


def fnt(bold: bool = False, white: bool = False, sz: int = 10) -> Font:
    return Font(bold=bold, color="FFFFFF" if white else "000000", size=sz)


def bord() -> Border:
    s = Side(style="thin", color="BFBFBF")
    return Border(left=s, right=s, top=s, bottom=s)


def ctr() -> Alignment:
    return Alignment(horizontal="center", vertical="center", wrap_text=True)


def lft() -> Alignment:
    return Alignment(horizontal="left", vertical="center", wrap_text=True)


def hdr(ws: Worksheet, r: int, c: int, val, bg: str,
        bold: bool = True, white: bool = True, span: int | None = None):
    cell = ws.cell(row=r, column=c, value=val)
    cell.fill = fill(bg)
    cell.font = fnt(bold, white)
    cell.alignment = ctr()
    cell.border = bord()
    if span:
        ws.merge_cells(start_row=r, start_column=c, end_row=r, end_column=span)
        for cc in range(c + 1, span + 1):
            ws.cell(row=r, column=cc).fill = fill(bg)
    return cell


def inp(ws: Worksheet, r: int, c: int, val=None):
    cell = ws.cell(row=r, column=c, value=val)
    cell.fill = fill(INP)
    cell.font = fnt()
    cell.alignment = ctr()
    cell.border = bord()
    return cell


def calc_c(ws: Worksheet, r: int, c: int, formula: str):
    cell = ws.cell(row=r, column=c, value=formula)
    cell.fill = fill(CALC)
    cell.font = fnt()
    cell.alignment = ctr()
    cell.border = bord()
    return cell


def lbl(ws: Worksheet, r: int, c: int, val, bg: str = GRY,
        bold: bool = False, span: int | None = None):
    cell = ws.cell(row=r, column=c, value=val)
    cell.fill = fill(bg)
    cell.font = fnt(bold)
    cell.alignment = lft()
    cell.border = bord()
    if span:
        ws.merge_cells(start_row=r, start_column=c, end_row=r, end_column=span)
        for cc in range(c + 1, span + 1):
            ws.cell(row=r, column=cc).fill = fill(bg)
    return cell


def locked(ws: Worksheet, r: int, c: int, val=None):
    """Grayed-out cell used when a column does not apply to a BMP type."""
    cell = ws.cell(row=r, column=c, value=val)
    cell.fill = fill(LOCK)
    cell.font = fnt()
    cell.alignment = ctr()
    cell.border = bord()
    return cell


def cw(ws: Worksheet, c: int, w: float):
    ws.column_dimensions[get_column_letter(c)].width = w


def cl(c: int) -> str:
    return get_column_letter(c)
```

- [ ] **Step 8: Run tests — expect pass**

```bash
pytest tests/test_styles.py -v
```

Expected: all tests PASS.

- [ ] **Step 9: Verify `generate_workbook.py` runs**

```bash
python generate_workbook.py
```

Expected: prints `Saved: ...SW_Required_Provided_DOEE_EISA438.xlsx` and the file exists.

- [ ] **Step 10: Commit**

```bash
git add requirements.txt workbook/ tests/ generate_workbook.py
git commit -m "swm-workbook: scaffold package, styles helpers, test harness"
```
