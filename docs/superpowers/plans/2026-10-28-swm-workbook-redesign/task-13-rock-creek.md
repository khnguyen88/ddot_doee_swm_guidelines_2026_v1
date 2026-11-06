# Task 13: Rock Creek Park Validation Test

**Depends on:** 02, 10, 12. **Blocks:** final merge.

## Context

Validate the pure-Python TR-55 calculation against the Rock Creek Park reference values from the design spec:

- Pre-development runoff: **16,901 CF**
- Proposed-condition runoff: **27,159 CF**
- Net runoff (after BMP): **8,988 CF**
- Implied BMP volume: 27,159 − 8,988 = **18,171 CF**

The reference workbook `SW_Required_Provided_DOEE_EISA438_RockCreekPark.xlsx` contains the input data (land-use areas by HSG, BMP dimensions). The test:

1. Opens the reference workbook in `data_only=False` mode (openpyxl reads formula strings; input cells read raw values).
2. Extracts the land-cover inputs from the legacy SDA sheet (`2-SDA LandUse`, rows 6-20, EISA columns O-AN).
3. Runs `calculations.tr55_total_volume_cf(...)` against both pre and post inputs.
4. Compares against the reference totals (16,901 and 27,159) within ±1% tolerance.

### Legacy input cell layout (reference workbook, 2-SDA LandUse sheet)

| Cols | Content |
|---|---|
| 15 (O) | Ex Impervious (SF) |
| 16-19 (P-S) | Ex Woods — HSG A/B/C/D (SF) |
| 20-23 (T-W) | Ex BMP / Pervious — HSG A/B/C/D (SF) |
| 24-27 (X-AA) | Ex Compacted — HSG A/B/C/D (SF) |
| 28 (AB) | Prop Impervious (SF) |
| 29-32 (AC-AF) | Prop Woods — HSG A/B/C/D (SF) |
| 33-36 (AG-AJ) | Prop BMP — HSG A/B/C/D (SF) |
| 37-40 (AK-AN) | Prop Compacted — HSG A/B/C/D (SF) |

### Reference values (from spec validation plan)

- P = 1.7"
- Pre runoff vol = 16,901 CF
- Post runoff vol = 27,159 CF

## Files

- Create: `tests/test_validation_rock_creek.py`

## Steps

- [ ] **Step 1: Write the test**

```python
"""Validate TR-55 calculation against Rock Creek Park reference workbook."""
from pathlib import Path

import openpyxl
import pytest

from workbook import calculations as calc


REF_PATH = (Path(__file__).resolve().parents[1]
            / "SW_Required_Provided_DOEE_EISA438_RockCreekPark.xlsx")

# Columns per legacy SDA sheet layout (`2-SDA LandUse`).
PRE_COLS = {
    "imp_veh":           [15],   # we treat Ex Imp as all vehicular (worst case)
    "nat":  {"A": 16, "B": 17, "C": 18, "D": 19},
    "bmp":  {"A": 20, "B": 21, "C": 22, "D": 23},
    "comp": {"A": 24, "B": 25, "C": 26, "D": 27},
}
POST_COLS = {
    "imp_veh":           [28],
    "nat":  {"A": 29, "B": 30, "C": 31, "D": 32},
    "bmp":  {"A": 33, "B": 34, "C": 35, "D": 36},
    "comp": {"A": 37, "B": 38, "C": 39, "D": 40},
}


def _collect_rows(ws, cols):
    """Build list of (area_sf, land_use, hsg) tuples from reference SDA rows 6-20."""
    rows = []
    for r in range(6, 21):
        for col in cols["imp_veh"]:
            area = ws.cell(row=r, column=col).value or 0
            if area:
                rows.append((float(area), "Impervious Vehicular", "C"))  # CN=98 regardless
        for hsg, col in cols["nat"].items():
            area = ws.cell(row=r, column=col).value or 0
            if area:
                rows.append((float(area), "Natural (Woods)", hsg))
        for hsg, col in cols["bmp"].items():
            area = ws.cell(row=r, column=col).value or 0
            if area:
                rows.append((float(area), "BMP", hsg))
        for hsg, col in cols["comp"].items():
            area = ws.cell(row=r, column=col).value or 0
            if area:
                rows.append((float(area), "Compacted (Open Space)", hsg))
    return rows


@pytest.fixture
def rock_creek_wb():
    if not REF_PATH.exists():
        pytest.skip(f"Reference workbook not found at {REF_PATH}")
    return openpyxl.load_workbook(REF_PATH, data_only=False)


def test_rock_creek_pre_runoff_matches_reference(rock_creek_wb):
    ws = rock_creek_wb["2-SDA LandUse"]
    rows = _collect_rows(ws, PRE_COLS)
    assert rows, "No pre-construction input data found in reference"
    vol = calc.tr55_total_volume_cf(rows, P_in=1.7)
    # Spec: predevelopment 16,901 CF — ±1 % tolerance
    assert vol == pytest.approx(16901, rel=0.01), f"Pre volume {vol} ≠ reference 16,901"


def test_rock_creek_post_runoff_matches_reference(rock_creek_wb):
    ws = rock_creek_wb["2-SDA LandUse"]
    rows = _collect_rows(ws, POST_COLS)
    vol = calc.tr55_total_volume_cf(rows, P_in=1.7)
    # Spec: proposed 27,159 CF — ±1 % tolerance
    assert vol == pytest.approx(27159, rel=0.01), f"Post volume {vol} ≠ reference 27,159"


def test_rock_creek_net_after_bmp(rock_creek_wb):
    """Net post-dev runoff (proposed - BMP vol) must be ≤ pre-dev."""
    ws = rock_creek_wb["2-SDA LandUse"]
    pre  = calc.tr55_total_volume_cf(_collect_rows(ws, PRE_COLS), P_in=1.7)
    post = calc.tr55_total_volume_cf(_collect_rows(ws, POST_COLS), P_in=1.7)

    bmp_ws = rock_creek_wb["5-BMP EISA438"]
    # BMP vol inf = sum of column Q, rows 4..53 (per legacy layout)
    bmp_vol = 0.0
    for r in range(4, 54):
        v = bmp_ws.cell(row=r, column=17).value
        if isinstance(v, (int, float)):
            bmp_vol += v
    # Spec: net 8,988 CF — ±5 % tolerance (BMP sheet may be formula-populated)
    net = post - bmp_vol
    assert net <= pre + pre * 0.01, f"Net {net} > pre {pre}: compliance fails"
    assert net == pytest.approx(8988, rel=0.05), (
        f"Net {net} outside reference 8,988 (±5 %). BMP vol inferred = {bmp_vol}")
```

- [ ] **Step 2: Run the test**

```bash
pytest tests/test_validation_rock_creek.py -v
```

If the reference workbook is present, the three assertions must pass. If `test_rock_creek_net_after_bmp` fails on BMP vol (because the BMP sheet in the reference file is formula-populated and openpyxl without `data_only=True` returns the formula string), re-run with:

```bash
pytest tests/test_validation_rock_creek.py -v --data-only
```

...OR, if that's not feasible, open the reference file once in Excel (so the formula cache is populated), save it, then re-run the test with `openpyxl.load_workbook(REF_PATH, data_only=True)` in the fixture.

- [ ] **Step 3: Document the manual Excel-open prerequisite**

If BMP vol reads come back as formula strings, add a comment at the top of the test file:

```python
# NOTE: If BMP sheet values read as formula strings, open the reference workbook
# in Excel once and save it so openpyxl can read cached values (data_only=True).
```

- [ ] **Step 4: Commit**

```bash
git add tests/test_validation_rock_creek.py
git commit -m "swm-workbook: Rock Creek Park TR-55 validation test"
```
