# 10 – Detention Requirements

**Source:** `docs/doee presentation/10_Detention Requirements.pptx`

## Overview
Chapter 2 and Appendix I cover quantity control (detention) requirements for managing peak discharge rates. Detention is separate from retention — retention captures and infiltrates water, while detention temporarily stores and slowly releases it.

## Quantity Control Requirements

| Storm Event | Design Rainfall | Control Target |
|---|---|---|
| 2-year | 3.14 inches | Peak discharge ≤ pre-development conditions |
| 15-year | 5.23 inches | Peak discharge ≤ pre-project conditions |

**Note:** The 2-year post-development requirement does not apply when all three conditions are met:
1. Site discharges directly to (or through the separate sewer into) the tidal Potomac/Anacostia Rivers, Washington Channel, or C&O Canal
2. Discharges do not flow through any above-ground tributary to those waterbodies
3. Discharges will not cause erosion or sediment transport

This creates a **Tidal MS4 exemption** for sites draining to tidal waters.

## How to Meet Detention Requirements
- Underground storage structures
- Above-ground storage (basins, ponds)
- Increasing BMP size (BMPs reduce CN and provide detention credit)

## Curve Number (CN) Reduction Method
BMPs reduce the effective CN, which lowers post-project peak flows. Steps:
1. Calculate baseline CN and site runoff volume
2. Subtract BMP storage volume from site runoff volume
3. Determine reduced CN from reduced runoff volume
4. Check if reduced peak flow meets pre-development/pre-project targets

## Worked Example

**Site:** Two SDAs totaling ~50,449 SF

### Curve Numbers

| Condition | SDA 1 | SDA 2 | Total Site |
|---|---|---|---|
| Pre-development CN | 70 | 70 | 70 |
| Pre-project CN | 92 | 88 | 90 |
| Post-project CN (no BMPs) | 93 | 89 | — |
| Post-project CN (with 1,800 CF BMP) | 76/80 | — | — |
| Post-project CN (with 2,200 CF BMP) | — | 68/75 | 72/77 |

### Detention Determination

| Storm | Reduced Post-Project CN vs. Required CN | Required? |
|---|---|---|
| 2-year (pre-development = 70) | Post-project CN = 72 > 70 | **Yes** |
| 15-year (pre-project = 90) | Post-project CN = 77 < 90 | **No** |

**Result:** Detention required for 2-year storm only.

## Acceptable Hydrologic Methods (Appendix I)

| Method | Notes |
|---|---|
| TR-55 (Urban Hydrology for Small Watersheds) | Preferred |
| SWMM | Preferred; best accounts for BMP detention benefits |
| HEC-HMS | Acceptable |
| WinTR-55 / TR-20 | Acceptable |
| Rational Method | Limited to sites under 5 acres; not recommended for detention (cannot easily account for BMP benefits) |
