# Task 04: PROJECT Sheet

**Depends on:** Task 01. **Blocks:** 05-11.

## Context

PROJECT holds the 9 project-header fields entered once at setup. Every other sheet references these via `PROJECT_*` named ranges — e.g. `PROJECT_Rainfall` controls per-SDA rainfall depth, `PROJECT_Trigger` controls which rainfall depth applies.

### Fixed row layout

| Row | Field | Named range (points at col B) |
|---|---|---|
| 3 | Project Name | `PROJECT_Name` |
| 4 | Project Number | `PROJECT_Number` |
| 5 | MS4 / CSS | `PROJECT_MS4` |
| 6 | In AWDZ? | `PROJECT_AWDZ` |
| 7 | DOEE Plan Review No. | `PROJECT_DOEEReview` |
| 8 | Total LOD Area (SF) | `PROJECT_TotalLOD` |
| 9 | 95th Percentile Storm Depth (in) | `PROJECT_Rainfall` |
| 10 | Trigger Type (MLD / MSI / PROW) | `PROJECT_Trigger` |
| 11 | EISA Section 438 Applies? | `PROJECT_EISA` |

Rainfall default = 1.7". Trigger Type is a dropdown; MLD and PROW use 1.2", MSI uses 0.8" — but the actual rainfall value is user-supplied in B9, so Trigger is informational for the SDA sheet (which uses `PROJECT_Rainfall` directly).

## Files

- Create: `workbook/builders/project.py`
- Create: `tests/test_project.py`

## Steps

- [ ] **Step 1: Write failing test**

Create `tests/test_project.py`:

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
        (3, "Project Name"),
        (4, "Project Number"),
        (5, "MS4 / CSS"),
        (6, "In AWDZ?"),
        (7, "DOEE Plan Review No."),
        (8, "Total LOD Area (SF)"),
        (9, "95th Percentile Storm Depth (in)"),
        (10, "Trigger Type"),
        (11, "EISA Section 438 Applies?"),
    ]
    for r, label in expected_labels:
        assert ws.cell(row=r, column=1).value == label, f"Row {r} label mismatch"


def test_rainfall_default(wb):
    ws = wb["PROJECT"]
    assert ws.cell(row=9, column=2).value == 1.7


def test_named_ranges_defined(wb):
    expected = {
        "PROJECT_Name":        "'PROJECT'!$B$3",
        "PROJECT_Number":      "'PROJECT'!$B$4",
        "PROJECT_MS4":         "'PROJECT'!$B$5",
        "PROJECT_AWDZ":        "'PROJECT'!$B$6",
        "PROJECT_DOEEReview":  "'PROJECT'!$B$7",
        "PROJECT_TotalLOD":    "'PROJECT'!$B$8",
        "PROJECT_Rainfall":    "'PROJECT'!$B$9",
        "PROJECT_Trigger":     "'PROJECT'!$B$10",
        "PROJECT_EISA":        "'PROJECT'!$B$11",
    }
    names = {dn.name: dn.attr_text for dn in wb.defined_names.values()}
    for name, addr in expected.items():
        assert name in names, f"Missing named range: {name}"
        assert names[name] == addr


def test_data_validations_set(wb):
    """MS4/CSS, AWDZ, Trigger, EISA have Yes/No or list dropdowns."""
    ws = wb["PROJECT"]
    dvs = ws.data_validations.dataValidation
    sqrefs = [str(dv.sqref) for dv in dvs]
    assert any("B5" in s for s in sqrefs), "MS4/CSS dropdown missing"
    assert any("B6" in s for s in sqrefs), "AWDZ dropdown missing"
    assert any("B10" in s for s in sqrefs), "Trigger dropdown missing"
    assert any("B11" in s for s in sqrefs), "EISA dropdown missing"
```

- [ ] **Step 2: Run test — expect failure**

```bash
pytest tests/test_project.py -v
```

Expected: FAIL (module missing).

- [ ] **Step 3: Write `workbook/builders/project.py`**

```python
"""Build the PROJECT sheet — project header + named ranges."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


FIELDS = [
    (3,  "Project Name",                       "PROJECT_Name",       None),
    (4,  "Project Number",                     "PROJECT_Number",     None),
    (5,  "MS4 / CSS",                          "PROJECT_MS4",        '"MS4,CSS"'),
    (6,  "In AWDZ?",                           "PROJECT_AWDZ",       '"Yes,No"'),
    (7,  "DOEE Plan Review No.",               "PROJECT_DOEEReview", None),
    (8,  "Total LOD Area (SF)",                "PROJECT_TotalLOD",   None),
    (9,  "95th Percentile Storm Depth (in)",   "PROJECT_Rainfall",   None),
    (10, "Trigger Type",                       "PROJECT_Trigger",    '"MLD,MSI,PROW"'),
    (11, "EISA Section 438 Applies?",          "PROJECT_EISA",       '"Yes,No"'),
]


def build_project_sheet(wb: Workbook) -> None:
    ws = wb.create_sheet("PROJECT")
    ws.sheet_view.showGridLines = False

    styles.cw(ws, 1, 40)
    styles.cw(ws, 2, 32)

    styles.hdr(ws, 1, 1, "PROJECT — Project Header (enter once)",
               styles.BH, span=2)
    ws.row_dimensions[1].height = 24

    for row, label, _name, dv_formula in FIELDS:
        styles.lbl(ws, row, 1, label, styles.GRY, bold=True)
        default = 1.7 if row == 9 else None
        styles.inp(ws, row, 2, default)
        if dv_formula:
            dv = DataValidation(type="list", formula1=dv_formula,
                                allow_blank=True, showDropDown=False)
            ws.add_data_validation(dv)
            dv.sqref = f"B{row}"

    for row, _label, name, _dv in FIELDS:
        wb.defined_names.add(DefinedName(name, attr_text=f"'PROJECT'!$B${row}"))
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_project.py -v
```

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/project.py tests/test_project.py
git commit -m "swm-workbook: add PROJECT sheet with named ranges and dropdowns"
```
