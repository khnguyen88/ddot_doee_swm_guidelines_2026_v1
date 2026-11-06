# Task 02: Pure-Python Calculations Module

**Depends on:** Task 01. **Blocks:** 09, 10, 13, 14.

## Context

`workbook/calculations.py` is the source of truth for the stormwater math. Excel formulas in later builders mirror this logic; validation tests (Rock Creek, Penn Ave, Atlanta) check these functions against reference numbers. Builders translate the function logic into formula strings — if these tests pass, the Excel formulas are correct by construction.

Three calculation families are needed:

1. **SWRv** — DOEE Stormwater Retention Volume (CF)
2. **TR-55** — SCS runoff depth / volume (CN method)
3. **Horton** — infiltration loss integral over 24 hr (EISA Direct Determination)

## Files

- Create: `workbook/calculations.py`
- Create: `tests/test_calculations.py`

## Steps

- [ ] **Step 1: Write failing tests for calculations module**

Create `tests/test_calculations.py`:

```python
"""Tests for pure-Python stormwater calculations."""
import math
import pytest

from workbook import calculations as calc


# ────── SWRv ──────────────────────────────────────────────────────────────────

def test_swrv_volume_impervious_only():
    # 10,000 SF impervious at 1.7" = 10000 * 0.95 * 1.7 / 12 = 1345.833 CF
    v = calc.swrv_volume(
        imp_veh=0, imp_nonveh=10000, comp=0, natural=0, bmp=0,
        rainfall_in=1.7,
    )
    assert v == pytest.approx(10000 * 0.95 * 1.7 / 12, rel=1e-6)


def test_swrv_volume_mixed_landuse():
    # imp 5000 at 0.95, veh 2000 at 0.95, comp 3000 at 0.25 → rainfall 1.2"
    v = calc.swrv_volume(
        imp_veh=2000, imp_nonveh=5000, comp=3000, natural=1000, bmp=0,
        rainfall_in=1.2,
    )
    expected = (0.95 * (2000 + 5000) + 0.25 * 3000) * 1.2 / 12
    assert v == pytest.approx(expected, rel=1e-6)


def test_swrv_volume_bmp_contributes_zero():
    # Per spec: BMP Rv = 0.00 for SWRv (differs from the legacy script).
    v = calc.swrv_volume(
        imp_veh=0, imp_nonveh=0, comp=0, natural=0, bmp=5000,
        rainfall_in=1.7,
    )
    assert v == pytest.approx(0.0, abs=1e-9)


def test_swrv_volume_natural_contributes_zero():
    v = calc.swrv_volume(
        imp_veh=0, imp_nonveh=0, comp=0, natural=10000, bmp=0,
        rainfall_in=1.7,
    )
    assert v == pytest.approx(0.0, abs=1e-9)


# ────── TR-55 runoff depth (SCS CN method) ────────────────────────────────────

def test_tr55_runoff_depth_impervious_17():
    # CN=98 at P=1.7" → S=0.204, Ia=0.0408 → Q = (1.7-0.0408)^2 / (1.7-0.0408+0.204) = ~1.459"
    q = calc.tr55_runoff_depth(1.7, 98)
    assert q == pytest.approx(1.459, abs=0.005)


def test_tr55_runoff_depth_woods_hsg_b_17_is_zero():
    # Woods HSG B CN=55: S = 1000/55 - 10 = 8.18, Ia = 1.636" > 1.7" marginally.
    # Spec: HSG-B Woods (CN=55: 0.2S=1.64>1.7) produces ZERO runoff for P=1.7".
    q = calc.tr55_runoff_depth(1.7, 55)
    assert q == pytest.approx(0.0, abs=1e-9)


def test_tr55_runoff_depth_woods_hsg_c_17():
    # CN=70: S=4.286, Ia=0.857 → Q = (1.7-0.857)^2 / (1.7-0.857+4.286) ≈ 0.138
    q = calc.tr55_runoff_depth(1.7, 70)
    assert q == pytest.approx(0.138, abs=0.005)


def test_tr55_runoff_depth_zero_when_p_below_ia():
    # Natural HSG A CN=25: S=30, Ia=6 >> 1.7
    assert calc.tr55_runoff_depth(1.7, 25) == 0.0


def test_tr55_runoff_volume_cf():
    # 10,000 SF impervious at 1.7" → ~1.459" * 10000 / 12 ≈ 1216 CF
    v = calc.tr55_runoff_volume_cf(area_sf=10000, P_in=1.7, CN=98)
    assert v == pytest.approx(10000 * 1.459 / 12, rel=0.01)


# ────── Horton infiltration ──────────────────────────────────────────────────

def test_horton_infil_loss_hsg_b():
    # HSG B: f_max=5, f_min=0.3, k=2.0 over 24 hr → ~2.65"
    loss = calc.horton_infil_loss(f_max=5.0, f_min=0.3, k=2.0, total_t_hr=24.0, dt_hr=0.5)
    # Analytical: integral of f_min + (f_max-f_min)*exp(-k*t) over 24 hr
    # = f_min*24 + (f_max-f_min)/k * (1 - exp(-k*24))
    analytic = 0.3 * 24 + (5.0 - 0.3) / 2.0 * (1 - math.exp(-2.0 * 24))
    assert loss == pytest.approx(analytic, rel=0.02)


def test_horton_infil_loss_hsg_c():
    # HSG C: f_max=3, f_min=0.1, k=3.5 over 24 hr
    loss = calc.horton_infil_loss(f_max=3.0, f_min=0.1, k=3.5)
    analytic = 0.1 * 24 + (3.0 - 0.1) / 3.5 * (1 - math.exp(-3.5 * 24))
    assert loss == pytest.approx(analytic, rel=0.02)


def test_horton_pre_computed_losses_table():
    # The PARAMS block pre-computes these; expose them as constants.
    assert calc.HORTON_INFIL_LOSS_B == pytest.approx(
        calc.horton_infil_loss(5.0, 0.3, 2.0), rel=1e-6)
    assert calc.HORTON_INFIL_LOSS_C == pytest.approx(
        calc.horton_infil_loss(3.0, 0.1, 3.5), rel=1e-6)


# ────── EISA Direct Determination runoff depth per land use × HSG ────────────

def test_eisa_direct_impervious_17():
    # P - depression_imp(0.1) = 1.6"
    assert calc.eisa_direct_runoff_depth("Impervious Vehicular", "C", 1.7) == pytest.approx(1.6, abs=1e-9)
    assert calc.eisa_direct_runoff_depth("Impervious Non-Vehicular", "B", 1.7) == pytest.approx(1.6, abs=1e-9)
    assert calc.eisa_direct_runoff_depth("BMP", "B", 1.7) == pytest.approx(1.6, abs=1e-9)


def test_eisa_direct_natural_hsg_a_is_zero():
    assert calc.eisa_direct_runoff_depth("Natural (Woods)", "A", 1.7) == 0.0
    assert calc.eisa_direct_runoff_depth("Compacted (Open Space)", "A", 1.7) == 0.0


def test_eisa_direct_pervious_hsg_bc_depletes_to_zero_at_17():
    # Horton losses for 24 hr are large (>2"), so pervious HSG B/C return 0 at 1.7".
    assert calc.eisa_direct_runoff_depth("Natural (Woods)", "B", 1.7) == 0.0
    assert calc.eisa_direct_runoff_depth("Natural (Woods)", "C", 1.7) == 0.0
    assert calc.eisa_direct_runoff_depth("Compacted (Open Space)", "B", 1.7) == 0.0
    assert calc.eisa_direct_runoff_depth("Compacted (Open Space)", "C", 1.7) == 0.0


def test_eisa_direct_hsg_d_conservative_default():
    # No Horton params for HSG D → conservative P - 0.2
    assert calc.eisa_direct_runoff_depth("Natural (Woods)", "D", 1.7) == pytest.approx(1.5, abs=1e-9)
    assert calc.eisa_direct_runoff_depth("Compacted (Open Space)", "D", 1.7) == pytest.approx(1.5, abs=1e-9)
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pytest tests/test_calculations.py -v
```

Expected: ALL FAIL with `ModuleNotFoundError`.

- [ ] **Step 3: Write `workbook/calculations.py`**

```python
"""Pure-Python stormwater calculations.

These functions ARE the project's source of math truth. Excel formulas emitted
by the sheet builders mirror this logic; validation tests check against reference
numbers (Rock Creek Park, Penn Ave, EPA Atlanta scenario).

All volumes in cubic feet (CF), all depths in inches, all areas in square feet.
"""
from __future__ import annotations
import math
from typing import Iterable


# ── Constants ────────────────────────────────────────────────────────────────

# Runoff coefficients for SWRv — per 2026-10-28 design spec PARAMS table.
# Note: BMP is 0.00 (differs from legacy script).
RV = {
    "Impervious Vehicular":     0.95,
    "Impervious Non-Vehicular": 0.95,
    "Compacted (Open Space)":   0.25,
    "Natural (Woods)":          0.00,
    "BMP":                      0.00,
}

# TR-55 curve numbers by (land use, HSG). Woods = good condition.
CN = {
    ("Impervious Vehicular",     "A"): 98, ("Impervious Vehicular",     "B"): 98,
    ("Impervious Vehicular",     "C"): 98, ("Impervious Vehicular",     "D"): 98,
    ("Impervious Non-Vehicular", "A"): 98, ("Impervious Non-Vehicular", "B"): 98,
    ("Impervious Non-Vehicular", "C"): 98, ("Impervious Non-Vehicular", "D"): 98,
    ("BMP",                      "A"): 98, ("BMP",                      "B"): 98,
    ("BMP",                      "C"): 98, ("BMP",                      "D"): 98,
    ("Natural (Woods)",          "A"): 25, ("Natural (Woods)",          "B"): 55,
    ("Natural (Woods)",          "C"): 70, ("Natural (Woods)",          "D"): 77,
    ("Compacted (Open Space)",   "A"): 39, ("Compacted (Open Space)",   "B"): 61,
    ("Compacted (Open Space)",   "C"): 74, ("Compacted (Open Space)",   "D"): 80,
}

# Horton infiltration parameters (EPA EISA Section 438 Technical Guidance).
HORTON_PARAMS = {
    "B": {"f_max": 5.0, "f_min": 0.3, "k": 2.0},
    "C": {"f_max": 3.0, "f_min": 0.1, "k": 3.5},
}

# Depression storage (inches) by surface type.
DEPRESSION_IMPERVIOUS = 0.1
DEPRESSION_PERVIOUS   = 0.2
DEPRESSION_BMP_SURFACE = 0.1

IMPERVIOUS_LAND_USES = {"Impervious Vehicular", "Impervious Non-Vehicular", "BMP"}


# ── SWRv ─────────────────────────────────────────────────────────────────────

def swrv_volume(imp_veh: float, imp_nonveh: float, comp: float,
                natural: float, bmp: float, rainfall_in: float) -> float:
    """Stormwater Retention Volume (CF) per 21 DCMR §599.

    SWRv = (rainfall/12) × Σ (area_i × Rv_i)
    """
    rv_contribution = (
        RV["Impervious Vehicular"]     * imp_veh
        + RV["Impervious Non-Vehicular"] * imp_nonveh
        + RV["Compacted (Open Space)"] * comp
        + RV["Natural (Woods)"]        * natural
        + RV["BMP"]                     * bmp
    )
    return rv_contribution * rainfall_in / 12.0


# ── TR-55 runoff ─────────────────────────────────────────────────────────────

def tr55_runoff_depth(P_in: float, cn: float) -> float:
    """SCS/TR-55 runoff depth Q (in). Q = 0 when P ≤ 0.2 S."""
    if cn <= 0:
        return 0.0
    S = 1000.0 / cn - 10.0
    Ia = 0.2 * S
    if P_in <= Ia:
        return 0.0
    return (P_in - Ia) ** 2 / (P_in - Ia + S)


def tr55_runoff_volume_cf(area_sf: float, P_in: float, CN: float) -> float:
    """TR-55 runoff volume in CF for one area × CN cell."""
    return area_sf * tr55_runoff_depth(P_in, CN) / 12.0


def tr55_total_volume_cf(rows: Iterable[tuple[float, str, str]], P_in: float) -> float:
    """Sum TR-55 runoff volume across a list of (area_sf, land_use, hsg) rows."""
    total = 0.0
    for area_sf, land_use, hsg in rows:
        cn = CN.get((land_use, hsg), 98)
        total += tr55_runoff_volume_cf(area_sf, P_in, cn)
    return total


# ── Horton infiltration ──────────────────────────────────────────────────────

def horton_infil_loss(f_max: float, f_min: float, k: float,
                      total_t_hr: float = 24.0, dt_hr: float = 0.5) -> float:
    """Integrated infiltration depth (in) over total_t_hr hours.

    f(t) = f_min + (f_max - f_min) * exp(-k*t). Riemann sum with step dt_hr.
    """
    n_steps = int(round(total_t_hr / dt_hr))
    total = 0.0
    for i in range(n_steps):
        t = i * dt_hr
        f_t = f_min + (f_max - f_min) * math.exp(-k * t)
        total += f_t * dt_hr
    return total


# Pre-computed loss constants used by the PARAMS sheet.
HORTON_INFIL_LOSS_B = horton_infil_loss(**HORTON_PARAMS["B"])
HORTON_INFIL_LOSS_C = horton_infil_loss(**HORTON_PARAMS["C"])


# ── EISA Direct Determination ────────────────────────────────────────────────

def eisa_direct_runoff_depth(land_use: str, hsg: str, P_in: float) -> float:
    """Direct-determination runoff depth (in) per land use × HSG.

    Rules (from design spec):
      Impervious / BMP: P - 0.1" (depression only, no infiltration)
      HSG A pervious:   0 (very high infiltration)
      HSG B pervious:   max(0, P - 0.2 - Horton_loss_B)
      HSG C pervious:   max(0, P - 0.2 - Horton_loss_C)
      HSG D pervious:   max(0, P - 0.2)  (conservative; no Horton params in EPA guidance)
    """
    if land_use in IMPERVIOUS_LAND_USES:
        return max(0.0, P_in - DEPRESSION_IMPERVIOUS)
    if hsg == "A":
        return 0.0
    if hsg == "B":
        return max(0.0, P_in - DEPRESSION_PERVIOUS - HORTON_INFIL_LOSS_B)
    if hsg == "C":
        return max(0.0, P_in - DEPRESSION_PERVIOUS - HORTON_INFIL_LOSS_C)
    if hsg == "D":
        return max(0.0, P_in - DEPRESSION_PERVIOUS)
    raise ValueError(f"Unknown HSG: {hsg!r}")


def eisa_direct_total_volume_cf(rows: Iterable[tuple[float, str, str]], P_in: float) -> float:
    """Sum direct-determination runoff volume across (area_sf, land_use, hsg) rows."""
    total = 0.0
    for area_sf, land_use, hsg in rows:
        total += area_sf * eisa_direct_runoff_depth(land_use, hsg, P_in) / 12.0
    return total
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pytest tests/test_calculations.py -v
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add workbook/calculations.py tests/test_calculations.py
git commit -m "swm-workbook: add pure-Python calculation module (SWRv, TR-55, Horton)"
```
