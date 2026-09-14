# 02 – SWRv Calculations

**Source:** `docs/doee presentation/02_SWRv Calculations.pptx`

## Overview
Worked examples demonstrating how to calculate SWRv for two real DC development sites.

## SWRv Formula (in cubic feet)

```
SWRv (ft³) = P/12 × (0.95 × Impervious Area + 0.25 × Compacted Area)
```

To convert to gallons: multiply ft³ × 7.48

## Example 1 – 1150 50th Pl NE

**Scenario:** Interior renovation of entire building  
**Building area:** 37,250 SF  
**Activity type:** Major Substantial Improvement (MSI) — 0.8-inch rain event  
**Land cover:** 37,250 SF impervious (building footprint); 0 SF compacted

**Calculation:**
```
SWRv = (0.8 / 12) × (0.95 × 37,250 + 0.25 × 0)
SWRv = 2,359 ft³  or  17,646 gallons
```

## Example 2 – 1207 H St NE

**Scenario:** Renovate existing building + construct new building in parking lot  
**Property area:** 23,220 SF  
**Activity type:** Mixed MLD (1.2-in) and MSI (0.8-in)

| Surface | Area (SF) | Rain Depth |
|---|---|---|
| Proposed renovated building | 4,225 | 0.8 in (MSI) |
| Proposed bioretention area | 3,795 | 1.2 in (MLD) |
| Proposed new building | 15,200 | 1.2 in (MLD) |

**Calculation (combined):**
```
SWRv = (0.8/12) × 0.95 × 4,225 + (1.2/12) × 0.95 × (3,795 + 15,200)
SWRv = 2,072 ft³  or  15,499 gallons
```

## Key Takeaways
- Each surface type uses its applicable rainfall depth (MLD vs. MSI trigger)
- BMP areas are assigned Rv = 0.95 (counted as impervious for SWRv calculation)
- Natural cover (N) contributes zero to SWRv
- Results must be calculated per Site Drainage Area (SDA) when the site has multiple drainage basins
