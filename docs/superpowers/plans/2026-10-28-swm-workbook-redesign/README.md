# SWM Workbook Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to dispatch one subagent per task file. Each subagent reads ONLY its own task file plus this README — never the whole plan.

**Goal:** Replace `scripts/generate_sw_spreadsheet.py` with a new modular Python workbook generator producing a 12-sheet DOEE + EISA Section 438 compliance calculator per the design spec at `docs/superpowers/specs/2026-10-28-swm-workbook-design.md`.

**Architecture:** Modular `workbook/` package with one builder module per sheet, a shared `styles.py`, a pure-Python `calculations.py` for math validation, and entry point `generate_workbook.py` at project root. All constants live in PARAMS; all cross-sheet references use named ranges. Builders emit Excel formulas that mirror the pure-Python calc logic.

**Tech Stack:** Python 3.11+, openpyxl 3.1+, pytest 7+

---

## Final File Structure

```
generate_workbook.py                       # entry point
workbook/
  __init__.py
  styles.py                                # openpyxl helpers
  calculations.py                          # pure Python math
  builders/
    __init__.py
    params.py            project.py
    sda.py               cda.py             bmp.py
    mep_summary.py       eisa_direct.py     eisa_tr55.py
    doee.py                                # 4 DOEE sheets in one module
tests/
  __init__.py
  conftest.py                              # wb fixture (session scope)
  test_calculations.py                     # pure-Python validation
  test_params.py           test_project.py
  test_sda.py              test_cda.py        test_bmp.py
  test_mep_summary.py      test_eisa_direct.py  test_eisa_tr55.py
  test_doee.py             test_structure.py
  test_validation_rock_creek.py            # Rock Creek reference
  test_validation_penn_ave.py              # Penn Ave reference
requirements.txt
```

---

## Task Order (dependencies in parentheses)

| # | Task | File | Depends on |
|---|---|---|---|
| 01 | Scaffold + styles | `task-01-scaffold.md` | — |
| 02 | Calculations module | `task-02-calculations.md` | 01 |
| 03 | PARAMS sheet | `task-03-params.md` | 01 |
| 04 | PROJECT sheet | `task-04-project.md` | 01 |
| 05 | SDA sheet | `task-05-sda.md` | 03, 04 |
| 06 | CDA sheet | `task-06-cda.md` | 05 |
| 07 | BMP sheet | `task-07-bmp.md` | 05, 06 |
| 08 | MEP_SUMMARY | `task-08-mep-summary.md` | 05, 07 |
| 09 | EISA_DIRECT | `task-09-eisa-direct.md` | 02, 05, 07 |
| 10 | EISA_TR55 | `task-10-eisa-tr55.md` | 02, 05, 07 |
| 11 | DOEE sheets (×4) | `task-11-doee.md` | 05, 06, 07 |
| 12 | Entry point | `task-12-entry-point.md` | all above |
| 13 | Rock Creek validation | `task-13-rock-creek.md` | 02, 10, 12 |
| 14 | Penn Ave validation | `task-14-penn-ave.md` | 02, 10, 12 |

---

## Common Conventions (all tasks follow these)

### Named-range convention
Named ranges live on the workbook, not on sheets. Builders register their own named ranges when they build their sheet. Convention:

- `PROJECT_*` — scalar PROJECT fields (e.g. `PROJECT_Rainfall`)
- `PARAMS_*` — PARAMS lookup tables (e.g. `PARAMS_Rv`, `PARAMS_CN`)
- `SDA_IDs`, `CDA_IDs` — dynamic lists from the respective sheets (for dropdowns)

### openpyxl 3.1+ named-range API
```python
from openpyxl.workbook.defined_name import DefinedName
wb.defined_names.add(DefinedName('PROJECT_Rainfall', attr_text="'PROJECT'!$B$9"))
```

### Formula style
- All formulas wrapped in `IFERROR(..., "")` or `IFERROR(..., 0)` as appropriate.
- Cross-sheet references via named range OR `'Sheet Name'!$A$1` (single-quote the sheet name).
- Lookup tables addressed by named range, never raw cell coordinates in formulas.

### Pytest conventions
- `tests/conftest.py` exposes a session-scoped `wb` fixture that runs `generate_workbook.main()` once and returns the resulting `openpyxl.Workbook`. Individual tests read from this one `wb`.
- Each test module tests ONE sheet or ONE module. Tests check structure, not computed values. Computed values are tested by `test_calculations.py` and the validation tests.

### Commit style
One commit per task. Message format: `swm-workbook: <sheet or module name>` — e.g. `swm-workbook: add PARAMS sheet with lookup tables`. Follow the project CLAUDE.md commit rules (no AI references).

---

## Validation Gates (must all pass before marking the plan complete)

1. **Unit tests green** — `pytest tests/` passes.
2. **`generate_workbook.py` runs clean** — produces `SW_Required_Provided_DOEE_EISA438.xlsx` without errors or warnings.
3. **Rock Creek calc test green** (task 13).
4. **Penn Ave calc test green** (task 14).
5. **Opening the generated .xlsx in Excel** — manual: open the file, verify sheet tabs are in the correct order and no `#REF!` errors appear. (This is a human check — the agent reports when ready for the user to open.)

Delete `scripts/generate_sw_spreadsheet.py` only AFTER all five gates pass.

---

## Reference Documents

- Design spec: `docs/superpowers/specs/2026-10-28-swm-workbook-design.md`
- Reference workbooks for validation:
  - `SW_Required_Provided_DOEE_EISA438_RockCreekPark.xlsx`
  - `SW_Required_Provided_DOEE_EISA438_PennAve.xlsx`
- Existing script (to be replaced): `scripts/generate_sw_spreadsheet.py`
- Project standards: `.claude/CLAUDE.md`
