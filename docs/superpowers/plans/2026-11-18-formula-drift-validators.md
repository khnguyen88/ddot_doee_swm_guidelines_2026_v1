# Formula-Drift Validators — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three complementary drift checks + CI wiring per the 2026-11-18 formula-drift spec. Catches silent regressions in PARAMS values and canonical formulas before they merge.

**Spec:** `docs/superpowers/specs/2026-11-18-formula-drift-validators-design.md`

**Order of operations:** Two audit tasks (8.0, 8.1) produce the authoritative mappings; implementation tasks (8.2, 8.3, 8.4) consume them; CI + integration (8.5, 8.6) wrap up.

---

## Task 8.0 — Audit DOEE spreadsheet cells

**Files:**
- Create: `docs/superpowers/notes/2026-11-18-doee-cell-audit.md` (written by the auditor; becomes the mapping dictionary for Task 8.2)

**Audit scope** — for each row of each of our PARAMS blocks below, find the authoritative cell in the DOEE spreadsheets:

| Our block             | Our rows / cols        | Candidate DOEE file + sheet                                                                      |
|-----------------------|------------------------|--------------------------------------------------------------------------------------------------|
| `PARAMS_Rv`           | rows 7–11, col B       | `2020 General Retention Compliance Calculator 2-5-21.xlsx` — check `Watersheds`, `Saved Values`, or the formula in `1. Site Drainage Areas` col P |
| `PARAMS_DetentionCN`  | rows 61–64, col B      | `2020 General Retention Compliance Calculator 2-5-21.xlsx` — check `3. Detention` or `Saved Values` |
| `PARAMS_BMP`          | rows 36–42, cols C-G   | `2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm` — per-BMP sheets; cells already cited in `tests/test_params.py:218-235` docstring |

- [ ] **Step 1: Open each DOEE file and locate the authoritative cells**

Script `scripts/dump_reference.py` already demonstrates how to load with openpyxl. For each row in each block, record the sheet name + cell address + value. If the value lives inside a formula (e.g., `=IF(land_use="Impervious", 0.95, ...)`), record the formula text and the extracted literal.

- [ ] **Step 2: Author `docs/superpowers/notes/2026-11-18-doee-cell-audit.md`**

Format each block as a table:

```markdown
## PARAMS_Rv (ours: PARAMS!B7:B11)

| Our row | Our value | Land use              | DOEE source cell                | DOEE value | Notes                           |
|--------:|----------:|------------------------|---------------------------------|-----------:|---------------------------------|
| 7       | 0.95      | Impervious Vehicular   | `Watersheds!B4`                 | 0.95       |                                 |
| 8       | 0.95      | Impervious Non-Veh.    | `Watersheds!B5`                 | 0.95       |                                 |
| ...     |           |                        |                                 |            | Formula-embedded, see §Formula  |
```

Any DOEE value that's **formula-embedded** (not a cell literal) gets a separate `## Formula-embedded values` subsection listing the formula + the extracted constant.

Any value that **has no DOEE source** (e.g., PARAMS_TR55 — comes from USDA NRCS, not DOEE) is listed with a `## Pinned to published reference` subsection and a citation to the published source + the printed value.

- [ ] **Step 3: Commit the audit**

```bash
git add docs/superpowers/notes/2026-11-18-doee-cell-audit.md
git commit -m "docs: audit DOEE spreadsheet cells for formula-drift validator

Maps each PARAMS row in our generator to the authoritative DOEE cell
or published reference. Blocks: Rv (5 rows), BMP (7 rows, 4 cols),
DetentionCN (4 rows), TR55 (6 rows, 3 cols)."
```

---

## Task 8.1 — Audit hand-worked examples

**Files:**
- Create: `docs/superpowers/notes/2026-11-18-hand-calc-audit.md`

**Audit scope** — identify at least 5 hand-worked examples in the docs that have (input, expected output) pairs suitable for `test_calc_mjs_against_doee_hand_calcs.py`.

**Candidate sources:**
- `docs/doee stormwater guidebook*.pdf` — any worked example tables
- `docs/eisa 438*.pdf` — Appendix D worked examples
- `docs/manual_guidance/*` — hand-worked examples the user explicitly compiled
- `docs/doee presentation/` summary files (search `summary/doee_presentation/` for anything with explicit input + output numbers)

- [ ] **Step 1: Scan each candidate for worked examples**

Grep for keywords: "worked", "example", "sample calculation", "given", "Rv =", "SWRv =", "Q =". Open each hit and assess whether the example has:
- Every input explicitly stated
- A single scalar expected output (or a small vector)
- Attribution to a specific regulatory section

- [ ] **Step 2: Author `docs/superpowers/notes/2026-11-18-hand-calc-audit.md`**

Format:

```markdown
### Example 1: SWRv for a hypothetical MLD project

**Source:** `docs/doee_stormwater_guidebook_v4.pdf`, §2.4, Table 2.4, Row 3
**Covers:** `swrvVolume` function in `calc.mjs`

**Inputs (verbatim from source):**
- Impervious Vehicular: 20,000 sf
- Compacted Open Space: 5,000 sf
- Natural Woods: 2,000 sf
- Rainfall: 1.2″

**Expected output:** SWRv = 2,208 cf (±1 cf rounding tolerance)

**JS function to call:** `swrvVolume({...areas}, 1.2)`
```

Aim for 5–7 cases spanning: SWRv basic, SWRv MLD vs MSI (0.8 vs 1.2), EISA Direct, EISA TR-55, Bio Sv, Peak discharge, Detention-BMP adjusted CN.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/notes/2026-11-18-hand-calc-audit.md
git commit -m "docs: audit hand-worked DOEE examples for JS-parity tests"
```

---

## Task 8.2 — Implement `validate_doee_calc_parity.py`

**Files:**
- Create: `scripts/validate_doee_calc_parity.py`
- Test: `tests/test_validate_doee_calc_parity.py` (integration test — checks exit code + output format)
- Reference: `docs/superpowers/notes/2026-11-18-doee-cell-audit.md` (from Task 8.0)

- [ ] **Step 1: Write failing integration test**

`tests/test_validate_doee_calc_parity.py`:

```python
import subprocess, sys

def test_validator_exits_zero_on_clean_generator():
    result = subprocess.run([sys.executable, 'scripts/validate_doee_calc_parity.py'],
                            capture_output=True, text=True)
    assert result.returncode == 0, f"Validator should pass on clean tree. stderr={result.stderr}"

def test_validator_output_cites_params_blocks():
    # Verbose mode prints each block checked.
    result = subprocess.run([sys.executable, 'scripts/validate_doee_calc_parity.py', '-v'],
                            capture_output=True, text=True)
    for block in ['PARAMS_Rv', 'PARAMS_BMP', 'PARAMS_DetentionCN', 'PARAMS_TR55']:
        assert block in result.stdout

def test_validator_fails_on_injected_drift(tmp_path, monkeypatch):
    # Stub build_wb to return a workbook with a wrong PARAMS_Rv value; run validator; assert exit 1.
    ...
```

Run: `python -m pytest tests/test_validate_doee_calc_parity.py -v 2>&1 | tail -10`. Expected: all 3 fail (script doesn't exist).

- [ ] **Step 2: Implement `validate_doee_calc_parity.py`**

Shape (verbatim from spec §5):

```python
#!/usr/bin/env python3
"""Validate that our generator's PARAMS values match the authoritative DOEE spreadsheets.
Exits 0 on clean, 1 on drift with cell citations."""

import sys
from pathlib import Path
from openpyxl import load_workbook

REPO_ROOT = Path(__file__).resolve().parent.parent

AUTHORITATIVE = { ... }  # populate from docs/superpowers/notes/2026-11-18-doee-cell-audit.md

def main():
    # 1. Generate our blank workbook in-memory
    # 2. For each PARAMS block, open the authoritative source
    # 3. For each (our_cell, auth_cell) pair, compare
    # 4. Collect all drifts
    # 5. Print report + exit non-zero if any
    ...

if __name__ == '__main__':
    sys.exit(main())
```

- [ ] **Step 3: Run tests, verify green**

- [ ] **Step 4: Prune the hand-rolled `test_params_bmp_matches_doee_calc_2020`**

Edit `tests/test_params.py`: convert the test to a shim that imports and calls the validator, OR add a comment pointing to the validator and leave the test as a belt-and-suspenders check. Document the decision in the commit.

- [ ] **Step 5: Run full Python test suite**

```bash
cd C:/_AAA/WS_HH/ddot_doee_swm_guidelines_2026_v1 && python -m pytest tests/ -q 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(scripts): validate_doee_calc_parity.py — runtime PARAMS drift check

Compares every PARAMS row in our generator to the authoritative cell
in the DOEE spreadsheets listed in docs/superpowers/notes/
2026-11-18-doee-cell-audit.md. Exits 1 with cell citations on drift.

Replaces hand-rolled expected list in test_params_bmp_matches_doee_calc_2020."
```

---

## Task 8.3 — Implement `validate_formula_shapes.py`

**Files:**
- Create: `scripts/validate_formula_shapes.py`
- Test: `tests/test_validate_formula_shapes.py`

- [ ] **Step 1: Write failing integration test**

Mirror structure of Task 8.2 tests: clean exit 0, verbose mode lists formulas checked, injected drift (rename a variable in `tr55RunoffDepth`) causes exit 1.

- [ ] **Step 2: Implement script**

Per spec §6: a `CANONICAL_FORMULAS` list with 5 entries (SCS Runoff, inverse CN, Bio Sv, EISA Direct depth, TR-55 unit peak lookup). For each:
- Load the implementation file (`.py` or `.mjs`).
- Locate the function body or formula string by regex.
- Assert every expected token appears in the expected order.
- On mismatch, print the canonical + our line + which token was out of order.

**Tolerant to whitespace, comments, and naming variations within reason** — the goal is "did the SHAPE of the formula change", not "is the text identical".

- [ ] **Step 3: Run tests, verify green**

- [ ] **Step 4: Run full suite**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(scripts): validate_formula_shapes.py — lexical drift check

Checks 5 canonical formulas (SCS runoff, inverse CN, Bio Sv, EISA
Direct depth, TR-55 unit peak) against our Python + JS implementations.
Flags shape drift (missing variable, swapped coefficient, wrong operator)."
```

---

## Task 8.4 — Implement `test_calc_mjs_against_doee_hand_calcs.py`

**Files:**
- Create: `tests/test_calc_mjs_against_doee_hand_calcs.py`
- Reference: `docs/superpowers/notes/2026-11-18-hand-calc-audit.md` (from Task 8.1)

- [ ] **Step 1: Write the test module**

```python
import json, subprocess
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent

HAND_CALCS = [ ... ]  # populate from audit notes

def _run_node(module, function, args):
    script = f'''
import('./{module}').then(m => {{
    const result = m.{function}(...{json.dumps(args)});
    console.log(JSON.stringify(result));
}}).catch(e => {{ console.error(e); process.exit(1); }});
'''
    r = subprocess.run(['node', '--input-type=module', '-e', script],
                       cwd=REPO_ROOT, capture_output=True, text=True)
    r.check_returncode()
    return json.loads(r.stdout.strip())

@pytest.mark.parametrize('case', HAND_CALCS, ids=lambda c: c['name'])
def test_calc_mjs_against_hand_calc(case):
    got = _run_node(case['js_call']['module'], case['js_call']['function'], case['js_call']['args'])
    atol = case.get('atol', 1.0)
    assert abs(got - case['expected']) <= atol, (
        f"{case['name']}: JS returned {got}, DOEE hand calc gives {case['expected']} "
        f"(source: {case['source']})"
    )
```

- [ ] **Step 2: Run test, verify green against the 5+ cases from Task 8.1**

If any case fails, investigate: is the hand calc wrong (Guidebook typo), is our JS wrong (drift), or is the test harness wrong (arg passing)? File a clear report before proceeding.

- [ ] **Step 3: Commit**

```bash
git commit -m "test: JS calc.mjs vs DOEE hand-worked examples

Spawns Node from pytest and compares outputs for N cases drawn from
docs/superpowers/notes/2026-11-18-hand-calc-audit.md. Catches cases
where the JS engine agrees with itself but disagrees with authoritative
DOEE calculations."
```

---

## Task 8.5 — Wire CI workflow

**Files:**
- Create: `.github/workflows/formula-drift.yml`

- [ ] **Step 1: Write workflow**

Verbatim from spec §8:

```yaml
name: formula-drift
on:
  push:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements.txt
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Validate DOEE spreadsheet parity
        run: python scripts/validate_doee_calc_parity.py

      - name: Validate formula shapes
        run: python scripts/validate_formula_shapes.py

      - name: Run JS hand-calc parity tests
        run: python -m pytest tests/test_calc_mjs_against_doee_hand_calcs.py -v
```

- [ ] **Step 2: Lint the YAML**

```bash
python -c "import yaml; yaml.safe_load(open('.github/workflows/formula-drift.yml'))"
```

- [ ] **Step 3: Commit**

```bash
git commit -m "ci: add formula-drift workflow on push + PR"
```

---

## Task 8.6 — Integration pass

- [ ] **Step 1: Run all three validators locally**

```bash
cd C:/_AAA/WS_HH/ddot_doee_swm_guidelines_2026_v1
python scripts/validate_doee_calc_parity.py -v
python scripts/validate_formula_shapes.py -v
python -m pytest tests/test_calc_mjs_against_doee_hand_calcs.py -v
```

All exit 0.

- [ ] **Step 2: Run full test matrix**

```bash
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education         && npm test 2>&1 | tail -3
cd ../populator         && npm test 2>&1 | tail -3
cd ..                   && python -m pytest tests/ -q 2>&1 | tail -3
```

All green.

- [ ] **Step 3: Update parent plan to note completion**

Append to `docs/superpowers/plans/2026-11-06-summary-calculator-template-gaps.md` under §8.2:

```markdown
### Status update (2026-11-18)

8.2 shipped. See:
- `docs/superpowers/specs/2026-11-18-formula-drift-validators-design.md`
- `docs/superpowers/plans/2026-11-18-formula-drift-validators.md`
```

- [ ] **Step 4: Commit integration note**

```bash
git commit --allow-empty -m "chore: integration pass for formula-drift validators

All three validators + CI workflow landed. PARAMS_Rv, PARAMS_BMP,
PARAMS_DetentionCN, PARAMS_TR55 all parity-checked at runtime. 5
canonical formulas lexically pinned. N hand-worked DOEE examples run
through JS calc.mjs on CI."
```

- [ ] **Step 5: Push**

```bash
git push origin feature/formula-drift-validators
```
