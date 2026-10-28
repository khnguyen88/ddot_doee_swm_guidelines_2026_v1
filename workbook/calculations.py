"""Pure-Python stormwater calculations.

These functions ARE the project's source of math truth. Excel formulas emitted
by the sheet builders mirror this logic; validation tests check against reference
numbers (Rock Creek Park, Penn Ave, EPA Atlanta scenario).

All volumes in cubic feet (CF), all depths in inches, all areas in square feet.
"""
from __future__ import annotations
import math
from typing import Iterable


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

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
DEPRESSION_IMPERVIOUS  = 0.1
DEPRESSION_PERVIOUS    = 0.2
DEPRESSION_BMP_SURFACE = 0.1

IMPERVIOUS_LAND_USES = {"Impervious Vehicular", "Impervious Non-Vehicular", "BMP"}


# ---------------------------------------------------------------------------
# SWRv
# ---------------------------------------------------------------------------

def swrv_volume(imp_veh: float, imp_nonveh: float, comp: float,
                natural: float, bmp: float, rainfall_in: float) -> float:
    """Stormwater Retention Volume (CF) per 21 DCMR §599.

    SWRv = (rainfall/12) × Σ (area_i × Rv_i)
    """
    rv_contribution = (
        RV["Impervious Vehicular"]     * imp_veh
        + RV["Impervious Non-Vehicular"] * imp_nonveh
        + RV["Compacted (Open Space)"]   * comp
        + RV["Natural (Woods)"]          * natural
        + RV["BMP"]                      * bmp
    )
    return rv_contribution * rainfall_in / 12.0


# ---------------------------------------------------------------------------
# TR-55 runoff
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Horton infiltration
# ---------------------------------------------------------------------------

def horton_infil_loss(f_max: float, f_min: float, k: float,
                      total_t_hr: float = 24.0, dt_hr: float = 0.5) -> float:
    """Integrated infiltration depth (in) over total_t_hr hours.

    f(t) = f_min + (f_max - f_min) * exp(-k*t)

    Closed-form integral (exact):
        F(T) = f_min*T + (f_max - f_min)/k * (1 - exp(-k*T))

    The dt_hr parameter is accepted for API compatibility but not used;
    the closed-form result is exact regardless of step size.
    """
    return f_min * total_t_hr + (f_max - f_min) / k * (1.0 - math.exp(-k * total_t_hr))


# Pre-computed loss constants used by the PARAMS sheet.
HORTON_INFIL_LOSS_B = horton_infil_loss(**HORTON_PARAMS["B"])
HORTON_INFIL_LOSS_C = horton_infil_loss(**HORTON_PARAMS["C"])


# ---------------------------------------------------------------------------
# EISA Direct Determination
# ---------------------------------------------------------------------------

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
