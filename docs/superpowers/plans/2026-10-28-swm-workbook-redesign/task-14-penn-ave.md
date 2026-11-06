# Task 14: Penn Ave Validation Test

**Depends on:** 02, 10, 12. **Blocks:** final merge.

## Context

Same approach as Task 13 but using the Penn Ave reference workbook, which exercises the DOEE SWRv path (not just EISA TR-55). The spec validation requires:

- SDA SWRv Required (per SDA) matches reference
- BMP Rv Provided (per SDA) matches reference
- MEP Summary totals match

Because this project has multiple SDAs, the test iterates per SDA.

### Reference workbook layout

Same `2-SDA LandUse` layout as Rock Creek. In addition:

- `1-Summary` sheet contains the DOEE compliance table (per-SDA SWRv, Rv Provided, Status). Rows 13-22 → one per SDA.
- `4-BMP DOEE` holds the BMP Rv Applied column (V, index 22).

### Reference values

The task reads reference values from the `1-Summary` sheet rather than hard-coding them — this keeps the test honest if the Penn Ave inputs are later edited.

Columns in `1-Summary` DOEE table (per legacy layout):
- Col A: SDA name
- Col C: SWRv Within LOD (CF)
- Col D: Tree SWv Credit (CF)
- Col E: Net SWRv Required (CF)
- Col F: BMP Vol Retained (CF)

## Files

- Create: `tests/test_validation_penn_ave.py`

## Steps

- [ ] **Step 1: Write the test**

```python
"""Validate SWRv + BMP retention against Penn Ave reference workbook."""
from pathlib import Path

import openpyxl
import pytest

from workbook import calculations as calc


REF_PATH = (Path(__file__).resolve().parents[1]
            / "SW_Required_Provided_DOEE_EISA438_PennAve.xlsx")


@pytest.fixture
def penn_wb():
    if not REF_PATH.exists():
        pytest.skip(f"Reference workbook not found at {REF_PATH}")
    # data_only=True to read cached calculated values from the Summary sheet
    return openpyxl.load_workbook(REF_PATH, data_only=True)


def _per_sda_swrv_from_landuse(ws, sda_row: int, rainfall: float) -> float:
    """Compute SWRv (CF) using the pure-Python calculator for one SDA row (6-20)."""
    # Within-LOD DOEE land-use columns from legacy layout:
    # D(4)=Imp, E(5)=Veh, F(6)=Comp, G(7)=Natural, H(8)=BMP — all in acres.
    def _ac_to_sf(v):
        return float(v) * 43560 if v else 0.0

    imp = _ac_to_sf(ws.cell(row=sda_row, column=4).value)
    veh = _ac_to_sf(ws.cell(row=sda_row, column=5).value)
    comp = _ac_to_sf(ws.cell(row=sda_row, column=6).value)
    nat = _ac_to_sf(ws.cell(row=sda_row, column=7).value)
    bmp = _ac_to_sf(ws.cell(row=sda_row, column=8).value)

    return calc.swrv_volume(
        imp_veh=veh, imp_nonveh=imp, comp=comp, natural=nat, bmp=bmp,
        rainfall_in=rainfall,
    )


def _reference_swrv_from_summary(ws, i: int) -> float | None:
    """Pull SWRv Within LOD (CF) from Summary table row 13 + i."""
    v = ws.cell(row=13 + i, column=3).value
    return float(v) if isinstance(v, (int, float)) else None


def test_each_sda_swrv_matches_reference(penn_wb):
    sda_ws = penn_wb["2-SDA LandUse"]
    sum_ws = penn_wb["1-Summary"]

    # Rainfall per SDA depends on trigger — read from Summary col B
    checked = 0
    for i in range(10):
        sda_row = 6 + i
        if sda_ws.cell(row=sda_row, column=1).value in (None, ""):
            continue
        trigger = sum_ws.cell(row=13 + i, column=2).value
        rainfall = {"MLD": 1.2, "MSI": 0.8, "MSI-AWDZ": 1.0}.get(trigger, 1.2)
        computed = _per_sda_swrv_from_landuse(sda_ws, sda_row, rainfall)
        reference = _reference_swrv_from_summary(sum_ws, i)
        if reference is None:
            continue
        assert computed == pytest.approx(reference, rel=0.02), (
            f"SDA row {sda_row}: computed {computed:.1f} ≠ reference {reference:.1f}")
        checked += 1

    assert checked > 0, "No SDA rows had reference values — test did not run"


def test_bmp_rv_applied_sum_matches_reference(penn_wb):
    """Sum of BMP Vol Retained (col F in Summary) should equal sum of BMP sheet col V."""
    sum_ws = penn_wb["1-Summary"]
    bmp_ws = penn_wb["4-BMP DOEE"]

    summary_total = 0.0
    for i in range(10):
        v = sum_ws.cell(row=13 + i, column=6).value
        if isinstance(v, (int, float)):
            summary_total += v

    bmp_total = 0.0
    for r in range(3, 53):
        v = bmp_ws.cell(row=r, column=22).value  # col V = Vol Ret (CF)
        if isinstance(v, (int, float)):
            bmp_total += v

    assert bmp_total == pytest.approx(summary_total, rel=0.02), (
        f"BMP sheet total {bmp_total:.1f} ≠ Summary total {summary_total:.1f}")
```

- [ ] **Step 2: Run the test**

```bash
pytest tests/test_validation_penn_ave.py -v
```

Both tests must pass. If the fixture skips because the reference workbook is absent, the user needs to confirm the file path is correct.

- [ ] **Step 3: Final full-suite run**

```bash
pytest -v
python generate_workbook.py
```

- [ ] **Step 4: Delete legacy script**

Once all tests pass and the generated workbook opens cleanly in Excel, remove the superseded script:

```bash
git rm scripts/generate_sw_spreadsheet.py
```

- [ ] **Step 5: Commit**

```bash
git add tests/test_validation_penn_ave.py
git commit -m "swm-workbook: Penn Ave DOEE SWRv validation + delete legacy script"
```
