# Formula-Drift Validators — Design Spec

**Date:** 2026-11-18
**Scope:** New `scripts/validate_doee_calc_parity.py`, `scripts/validate_formula_shapes.py`, `tests/test_calc_mjs_against_doee_hand_calcs.py`, and CI wiring.
**Parent spec:** `docs/superpowers/specs/2026-11-06-summary-calculator-template-gaps-design.md` §8.2.

## 1. Problem

Two regressions this session pinned PARAMS values by hand after they silently drifted from the authoritative DOEE spreadsheets. The existing `test_params_bmp_matches_doee_calc_2020` (in `tests/test_params.py:218`) encodes expected values in a Python list with cell citations in a docstring — fragile: any edit to the DOEE source file doesn't update the test; any edit to the test doesn't force a re-read of the source file.

**Hard rule from `.claude/CLAUDE.md`:** *"Never deviate from DOEE / DDOT / EISA 438 formulas. The populator must write EXACTLY the cells the official spreadsheets expect..."* Current tests rely on reviewer vigilance to catch formula drift.

## 2. Goal

Three complementary checks:

1. **`validate_doee_calc_parity.py`** — open the authoritative DOEE spreadsheets directly; compare every cell in `PARAMS_BMP`, `PARAMS_TR55`, `PARAMS_DetentionCN`, `PARAMS_Rv` of our generated workbook to the corresponding authoritative cell. The DOEE source IS the expected list; no hardcoded expected values in Python.

2. **`validate_formula_shapes.py`** — walk our generator's known formula strings (Bio Sv, SCS runoff `Q = (P−Ia)²/(P+0.8S)`, closed-form inverse CN, EISA Direct depth, TR-55 unit peak lookup). Compare each to a canonical reference — either parsed from the DOEE file where present or pinned to a published equation with a source comment (TR-55 Chapter 4, EISA §438 TG Appendix D, etc.).

3. **`test_calc_mjs_against_doee_hand_calcs.py`** — Python test that spawns Node subprocesses to call selected `summary_calculator/src/calc.mjs` functions, compares outputs to Python-computed reference values derived from hand-worked examples in `docs/manual_guidance/*`. Verifies the JS engine agrees with authoritative hand calcs (not just with itself).

4. **CI wiring** — all three run on PR; fail fast with precise cell/formula/example citations when drift is detected.

## 3. Non-goals

- **No new engine formulas.** Validators are observational — they detect drift, never mutate it.
- **No duplicate testing.** Where `test_params_bmp_matches_doee_calc_2020` already locks a value with a cell citation, the validator extends the citation with runtime verification; we don't delete the hand-rolled test until the validator covers it fully.
- **No "equation parser".** `validate_formula_shapes.py` is a shallow lexical check (operator ordering, variable names, coefficients) — not a symbolic equivalence test. Shallow is enough: if a line edit changes `1000/CN - 10` to `100/CN - 10`, the lexical compare flags it.
- **No coverage of non-DOEE-authoritative values** (e.g., rainfall depths, which come from NOAA Atlas 14 not DOEE).

## 4. Authoritative sources

| Our `PARAMS` block           | Rows in generated wb | Authoritative file                                                                | Authoritative sheet + cells                       |
|------------------------------|---------------------:|------------------------------------------------------------------------------------|---------------------------------------------------|
| `PARAMS_Rv`                  | 7–11                 | `docs/doee_spreadsheet_calculators/2020 General Retention Compliance Calculator 2-5-21.xlsx` | `Watersheds` or `Saved Values` — **audit in Task 1** |
| `PARAMS_BMP`                 | 36–42                | `docs/doee_spreadsheet_calculators/2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm` | Per-BMP sheets; cells already cited in `test_params.py:218` docstring |
| `PARAMS_DetentionCN`         | 61–64                | `docs/doee_spreadsheet_calculators/2020 General Retention Compliance Calculator 2-5-21.xlsx` | `Detention` or `Saved Values` — **audit in Task 1** |
| `PARAMS_TR55` (C0, C1, C2)   | 76–81                | USDA NRCS TR-55 Chapter 4 Exhibit 4-II                                             | Not in a DOEE file — pin to TR-55 printed values with source URL/citation |

**Task 1** of the plan audits each DOEE file to find the exact sheet+cell for each row — writing this spec before that audit would embed guesses.

## 5. `validate_doee_calc_parity.py`

**Shape:**

```python
# scripts/validate_doee_calc_parity.py
from openpyxl import load_workbook
from workbook import build_wb  # generates the blank template in-memory

AUTHORITATIVE = {
    'PARAMS_Rv': {
        'source':  'docs/doee_spreadsheet_calculators/2020 General Retention Compliance Calculator 2-5-21.xlsx',
        'sheet':   '<audited>',
        'mapping': [
            # (our row in PARAMS, our col, authoritative sheet cell, land_use label)
            ((7, 2), 'Watersheds!<cell>', 'Impervious Vehicular'),
            ...
        ],
    },
    'PARAMS_BMP': { ... },
    'PARAMS_DetentionCN': { ... },
    'PARAMS_TR55': {
        'source':  None,  # printed reference, not a workbook
        'citation': 'USDA NRCS TR-55 (1986), Chapter 4, Exhibit 4-II, Type-II rainfall distribution',
        'mapping': [
            # (our row, our col, expected value, Ia/P row label)
            ((76, 2), 2.00334, '0.10'),  # C0 at Ia/P = 0.10
            ...
        ],
    },
}

def main():
    wb_ours = build_wb()
    drift = []
    for params_block, cfg in AUTHORITATIVE.items():
        if cfg.get('source'):
            wb_auth = load_workbook(cfg['source'], data_only=True, read_only=True)
            for (our_row, our_col), auth_ref, label in cfg['mapping']:
                ours = wb_ours['PARAMS'].cell(row=our_row, column=our_col).value
                auth = resolve_cell(wb_auth, auth_ref)  # 'SheetName!A5' → value
                if not values_match(ours, auth):
                    drift.append((params_block, label, auth_ref, auth, ours))
        else:
            # Printed reference — pin value
            for (our_row, our_col), expected, label in cfg['mapping']:
                ours = wb_ours['PARAMS'].cell(row=our_row, column=our_col).value
                if not values_match(ours, expected):
                    drift.append((params_block, label, cfg['citation'], expected, ours))

    if drift:
        print_drift(drift)
        sys.exit(1)

def values_match(ours, auth, atol=1e-6):
    # Numbers → close compare; em-dash placeholder → exact string match.
    ...
```

**Output on drift:**

```
PARAMS_Rv drift at "Impervious Vehicular":
  our  PARAMS row 7 col 2:  0.90
  auth Watersheds!B4 (docs/doee.../2020 General.xlsx):  0.95
  Fix: edit workbook/builders/params.py rv_rows[0]
```

**Replaces:** the hardcoded `expected` list in `test_params.py:237-246`. Keep the existing test until the validator covers Bio/Dry Swale/Wet Swale/PP; then delete the hand-rolled list.

## 6. `validate_formula_shapes.py`

**Shape:**

```python
# scripts/validate_formula_shapes.py
# Walks known formula strings in workbook/builders/*.py AND in summary_calculator/src/calc.mjs,
# checks each against a canonical reference stored inline with a source citation.

CANONICAL_FORMULAS = [
    {
        'name': 'SCS Runoff Depth (TR-55 Eq 2-3, 2-4)',
        'canonical': 'Q = (P - Ia)**2 / (P + 0.8*S)   where S = 1000/CN - 10, Ia = 0.2*S',
        'citation':  'USDA NRCS TR-55 (1986), Chapter 2, Eq 2-3, 2-4, 2-5',
        'our_implementations': [
            {'file': 'summary_calculator/src/calc.mjs', 'symbol': 'tr55RunoffDepth',
             'expected_shape': ['P', 'Ia', 'S', '(P - Ia)**2', '(P + 0.8*S)']},
            {'file': 'workbook/builders/doee_compliance_calc.py', 'symbol': None,
             'expected_formula_substring': '(P-Ia)^2 / (P + 0.8*S)'},
        ],
    },
    {
        'name': 'Closed-form inverse CN (from Q and P back to CN)',
        'canonical': 'S = ... (quadratic root selection) ; CN = 1000 / (S + 10)',
        ...
    },
    {
        'name': 'Bio Sv (3-layer storage)',
        'canonical': 'Sv = SA_bot*d_media*n_media + SA_bot*d_gravel*n_gravel + trapezoid_frustum(SA_top, SA_pond_top, d_pond)',
        ...
    },
    {
        'name': 'EISA Direct depth',
        'canonical': 'depth = P - depression_storage - horton_integral(f_max, f_min, k, 24)',
        ...
    },
    {
        'name': 'TR-55 unit peak lookup',
        'canonical': 'log10(qu) = C0 + C1*log10(Tc) + C2*(log10(Tc))**2 ; C0,C1,C2 interpolated across Ia/P',
        ...
    },
]

def main():
    drift = []
    for formula in CANONICAL_FORMULAS:
        for impl in formula['our_implementations']:
            if not shape_matches(impl, formula):
                drift.append((formula['name'], impl))
    if drift:
        ...
```

**Match rule:** each canonical formula has a set of "expected tokens" (variable names, coefficients, operator groupings). We scan our implementation's source line and assert every expected token appears in the expected order. False positives possible if someone renames variables — accept and update the canonical.

**Scope:** 5 formulas listed above. Each is one that drifted historically or is pedagogically load-bearing.

## 7. `test_calc_mjs_against_doee_hand_calcs.py`

**Shape:**

```python
# tests/test_calc_mjs_against_doee_hand_calcs.py
import subprocess, json
import pytest

HAND_CALCS = [
    {
        'name': 'DOEE Guidebook §2.4 worked SWRv example',
        'source': 'docs/doee_stormwater_guidebook_chapter_2.pdf, §2.4, Table 2.4',
        'js_call': {
            'module':   'summary_calculator/src/calc.mjs',
            'function': 'swrvVolume',
            'args':     [{'Impervious Vehicular': 20000, 'Compacted (Open Space)': 5000}, 1.2],
        },
        'expected': 2208.333,  # cf — hand-computed per guidebook row
        'atol':     0.5,
    },
    {
        'name': 'EISA §438 TG Appendix D worked example (federal site)',
        'source': 'docs/eisa_438_tg_hunt_et_al.pdf, Appendix D.1',
        'js_call': { ... },
        'expected': ...,
    },
    ...
]

@pytest.mark.parametrize('case', HAND_CALCS, ids=lambda c: c['name'])
def test_calc_mjs_against_doee_hand(case):
    result = run_node(case['js_call'])
    assert abs(result - case['expected']) < case['atol'], (
        f"{case['name']}: JS returned {result}, DOEE hand calc gives {case['expected']} "
        f"(source: {case['source']})"
    )

def run_node(call):
    # Spawn: node -e "import('<module>').then(m => console.log(JSON.stringify(m.<function>(...<args>))))"
    ...
```

**Case selection** — pick 5-7 hand-worked examples that cover: basic SWRv, EISA Direct, EISA TR-55, Bio Sv, detention adjusted CN. Each is CITED by document section — never invented by us.

**Source identification** (Task 2 of the plan) — audits `docs/manual_guidance/*` + the Guidebook PDFs for examples with full input + expected output tables. If fewer than 5 are available, flag the gap for the user.

## 8. CI wiring

Add a new workflow `.github/workflows/formula-drift.yml`:

```yaml
name: formula-drift
on: [push, pull_request]
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

Separate workflow (not folded into `summary-calculator.yml`) because:
- It covers Python + JS + workbook/ holistically, not scoped to one app.
- Failure here is a drift alarm; separate signal is useful for triage.

## 9. Done definition

- `scripts/validate_doee_calc_parity.py` exists, runs, exits 0 against the current generator, exits 1 with cell citations if any PARAMS value diverges from the DOEE source.
- `scripts/validate_formula_shapes.py` exists, runs, exits 0, covers the 5 formulas listed in §6.
- `tests/test_calc_mjs_against_doee_hand_calcs.py` exists, has ≥5 cases, all pass.
- `.github/workflows/formula-drift.yml` exists and runs all three on PR.
- Existing `test_params_bmp_matches_doee_calc_2020` either (a) deleted if validator covers it fully, or (b) kept with a comment pointing to the validator for drift detection.
- Documentation update in `docs/superpowers/plans/2026-11-06-summary-calculator-template-gaps.md` §8.2 noting these follow-ons are now shipped.

## 10. Risks

- **DOEE source cells may not exist for every PARAMS row.** The Rv and DetentionCN values may be embedded in formulas rather than exposed as cells (e.g., a DOEE formula `= IF(land_use="Impervious", 0.95, ...)` has the 0.95 inside the formula, not in a named cell). Task 1 audit will catch this — if a value is formula-embedded, we pin to the formula literal with a citation + line reference.

- **TR-55 coefficients vary slightly between published sources.** The TR-55 1986 printing uses one rounding; later reprints may differ in the 5th decimal. Pin to the DOEE-used values (whatever `workbook/builders/params.py` currently emits) with a citation to the TR-55 printing version. If DOEE's own implementation uses a different set, flag it.

- **Hand-calc examples may have typos.** DOEE Guidebook examples have been wrong before. If a JS-vs-hand mismatch is traced to a Guidebook typo, document it in the test case with `expected = <corrected value>` and a comment explaining the known typo.

## 11. Out of scope

- **Populator-level cell parity.** The populator writes INTO DOEE workbooks; a parallel drift check that *reads back* the written cells and asserts the official sheets' own formulas produce the expected compliance numbers is valuable but belongs in a separate spec. (Would catch cases where we write the right cell but the sheet's formula has changed since the populator mapping was authored.)

- **Education app formula validation.** Education pedagogy paragraphs cite equations in narrative form; drift there is lower-stakes and reviewer-catchable.
