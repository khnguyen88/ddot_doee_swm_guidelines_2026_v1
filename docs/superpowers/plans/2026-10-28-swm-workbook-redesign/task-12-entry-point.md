# Task 12: Entry Point `generate_workbook.py`

**Depends on:** 01-11. **Blocks:** 13, 14.

## Context

Wire all 11 builder functions together in the correct order so the final workbook has:

1. PROJECT (first — user enters data here)
2. PARAMS (lookup tables)
3. SDA (relational land-use table)
4. CDA (contributing drainage areas)
5. BMP (BMP sizing)
6. MEP_SUMMARY (DDOT MEP mirror)
7. EISA_DIRECT (Horton compliance)
8. EISA_TR55 (TR-55 compliance)
9. DOEE_SDA
10. DOEE_BMP_DATA
11. DOEE_DETENTION
12. DOEE_COMPLIANCE

Replace the placeholder main() from Task 01. Also update the test harness so `tests/conftest.py` uses the real builder stack.

## Files

- Modify: `generate_workbook.py` (replace Task 01 placeholder)
- Modify: `tests/conftest.py` (session-scoped wb now wires full stack)
- Create: `tests/test_structure.py` (validates sheet order + presence)

## Steps

- [ ] **Step 1: Write failing test for sheet order**

Create `tests/test_structure.py`:

```python
"""Integration test — full workbook has correct sheet set and order."""
import pytest

import generate_workbook


EXPECTED_ORDER = [
    "PROJECT", "PARAMS", "SDA", "CDA", "BMP", "MEP_SUMMARY",
    "EISA_DIRECT", "EISA_TR55",
    "DOEE_SDA", "DOEE_BMP_DATA", "DOEE_DETENTION", "DOEE_COMPLIANCE",
]


@pytest.fixture(scope="module")
def wb():
    return generate_workbook.build_workbook()


def test_all_twelve_sheets_present(wb):
    for name in EXPECTED_ORDER:
        assert name in wb.sheetnames, f"Missing sheet: {name}"


def test_sheet_order(wb):
    assert wb.sheetnames == EXPECTED_ORDER


def test_no_placeholder_sheet(wb):
    assert "PLACEHOLDER" not in wb.sheetnames


def test_file_writes_cleanly(tmp_path, monkeypatch):
    out = tmp_path / "test.xlsx"
    monkeypatch.setattr(generate_workbook, "OUTPUT", out)
    result = generate_workbook.main()
    assert result == out
    assert out.exists()
```

- [ ] **Step 2: Run test — expect failure**

```bash
pytest tests/test_structure.py -v
```

Expected: fails because the current `main()` only writes a PLACEHOLDER sheet.

- [ ] **Step 3: Rewrite `generate_workbook.py`**

```python
"""Entry point for SW_Required_Provided_DOEE_EISA438.xlsx generator.

Builds a 12-sheet DOEE + EISA Section 438 compliance workbook. See
docs/superpowers/plans/2026-10-28-swm-workbook-redesign/README.md.

Run:
    python generate_workbook.py
"""
from pathlib import Path
import openpyxl

from workbook.builders import (
    params, project, sda, cda, bmp, mep_summary,
    eisa_direct, eisa_tr55, doee,
)


OUTPUT = Path(__file__).parent / "SW_Required_Provided_DOEE_EISA438.xlsx"


def build_workbook() -> openpyxl.Workbook:
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # Order of construction = order shown in Excel.
    project.build_project_sheet(wb)
    params.build_params_sheet(wb)
    sda.build_sda_sheet(wb, n_rows=50)
    cda.build_cda_sheet(wb, n_rows=50)
    bmp.build_bmp_sheet(wb, n_rows=50)
    mep_summary.build_mep_summary(wb, n_sdas=10)
    eisa_direct.build_eisa_direct(wb)
    eisa_tr55.build_eisa_tr55(wb)
    doee.build_doee_sda(wb)
    doee.build_doee_bmp_data(wb)
    doee.build_doee_detention(wb)
    doee.build_doee_compliance(wb)

    return wb


def main() -> Path:
    wb = build_workbook()
    wb.save(OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    out = main()
    print(f"Saved: {out}")
```

- [ ] **Step 4: Rewrite `tests/conftest.py` to use the full stack**

```python
"""Shared pytest fixtures."""
import pytest

import generate_workbook


@pytest.fixture(scope="session")
def wb():
    """Session-scoped workbook — built once, read by all structural tests."""
    return generate_workbook.build_workbook()
```

- [ ] **Step 5: Run full test suite**

```bash
pytest -v
```

Expected: ALL tests pass across every module.

- [ ] **Step 6: Run the generator for real**

```bash
python generate_workbook.py
```

Expected: prints `Saved: ...SW_Required_Provided_DOEE_EISA438.xlsx`. No tracebacks, no openpyxl warnings.

- [ ] **Step 7: Commit**

```bash
git add generate_workbook.py tests/conftest.py tests/test_structure.py
git commit -m "swm-workbook: wire all 12 sheets in entry point + structure test"
```
