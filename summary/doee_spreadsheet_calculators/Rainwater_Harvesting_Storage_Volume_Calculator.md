# Rainwater Harvesting Storage Volume Calculator

**Source:** `docs/doee_spreadsheet_calculators/2019 Rainwater Harvesting Storage Volume Calculator 5-07-26.xlsx`
**Version:** 3.1 (May 7, 2026)
**Reference:** DOEE Stormwater Management Guidebook (January 2020), §3.3 — Rainwater Harvesting

---

## Overview

Determines the optimal cistern size for a rainwater harvesting (RWH) system and calculates the resulting daily average storage volume (Sv) available for retention credit. The calculator uses a continuous simulation approach — it applies 20 years of DC rainfall data (1999–March 2019) against daily demand from irrigation, indoor use, and other sources to find the cistern size that best balances cost and SWRv compliance. The Sv output is used directly in the SWMP-BMP Calc Spreadsheet and General Retention Compliance Calculator.

---

## Tabs

| Sheet | Contents |
|---|---|
| **Instructions** | Color key, field definitions, notes on each input section |
| **Input** | All user-entry fields — CDA, demand, filter efficiency |
| **Storage Volume Results (in ft³)** | Trade-off table and graph: cistern size vs. average available Sv (ft³) |
| **Storage Volume Results (in gal)** | Same table in gallons |
| **JC** | Internal daily simulation (Journal of Cistern method) |
| **TS** | Internal time-series computation |
| **TS Monthly** | Monthly aggregation of simulation |
| **P" storm** | 1.2"/1.7" storm event runoff calculations |
| **Rainfall data_1999 to 3-2019** | 20-year DC daily precipitation record used for simulation |

---

## Inputs

Color code: white = required entry; orange/yellow = alternate entry; gray = calculated output.

### Storm Event

| Field | Value | Notes |
|---|---|---|
| Storm Event (inches) | **1.7** | Fixed — does not change; this is the maximum CDA credit cap |

### Contributing Drainage Area (CDA)

| Field | Units | Notes |
|---|---|---|
| Impervious cover area in CDA | SF | Roof, pavement, etc. that drains to the cistern inlet |
| Compacted cover area in CDA | SF | Lawn, managed turf draining to cistern |

The calculator assumes:
- 95% of rainfall on impervious area is conveyed to the cistern
- 25% of rainfall on compacted area is conveyed to the cistern

```
Total CDA runoff volume = (Impervious SF × 0.95 + Compacted SF × 0.25) × Rainfall / 12
```

### Contributing BMPs (upstream of cistern)

If any upstream BMPs overflow into the cistern, enter their volumes:

| Field | Units |
|---|---|
| Retention volume from upstream BMP(s) | CF |
| Overflow volume from upstream BMP(s) for 1.7" storm | CF |

### Irrigation Demand

| Field | Units | Notes |
|---|---|---|
| Area to irrigate | SF | |
| Smart controls? | Yes/No | Soil moisture sensor shutoff reduces average demand |
| Monthly irrigation rate | Inches/Week or Gallons/Month | Enter 0 for months with no irrigation |

EPA WaterSense Water Budget Tool can generate monthly landscape water requirements. Select "Gallons/Month" unit if using WaterSense output.

### Indoor Demand — Flushing Toilets/Urinals

| Field | Default | Units |
|---|---|---|
| Number of building occupants | — | persons |
| Urinal water use | 0.80 | gallons/flush |
| Toilet water use | 1.60 | gallons/flush |
| First day of use per week | — | e.g., Monday |
| Last day of use per week | — | e.g., Friday |
| Hours per day building is occupied | — | hours |

Calculated daily demand = occupants × (urinal flushes × 0.80 + toilet flushes × 1.60) × use schedule. Can override with a known daily demand value directly.

### Indoor Demand — Laundry

| Field | Default | Units |
|---|---|---|
| Loads per day | — | loads/day |
| Water per load | 42 | gallons/load |
| Days of use per week | — | |

### Additional Daily Use

Free-form monthly demand entry (gallons/day per month) for any use not covered above — e.g., bus washing, street sweeping, process water.

### Cooling Towers

Monthly average daily demand (gallons/day per month) for cooling tower makeup water — typically applicable for large commercial/institutional projects.

### Contribution from Other Sources

Monthly daily input from sources that add water to the cistern (e.g., HVAC condensate, greywater). Treated as negative daily demand (reduces net cistern draw).

### First Flush Filter Diversion and Efficiency

| Field | Value | Applies to |
|---|---|---|
| Minimum capture efficiency for 1.2" storm | 95% | Ensures nearly all SWRv storm is captured |
| Minimum capture efficiency for 3.2" storm | 90% | Larger storm partial capture acceptable |

---

## Output — Storage Volume Results

The results sheets present a trade-off table across a range of cistern sizes:

| Column | Description |
|---|---|
| Cistern Volume (gallons) | Range of cistern sizes scaled to CDA |
| Daily Average Available Storage Volume (Sv) | Average available cistern capacity — this is the value entered as Sv in the SWMP-BMP Calc |
| Overflow Volume (gallons/ft³) | Average volume that overflows for the 1.7" storm event |

The accompanying graph shows diminishing returns: doubling cistern size does not double retention. Choose the cistern size where the Sv meets or exceeds the SWRv, or the curve flattens to avoid over-sizing. Once a cistern size is selected, carry the corresponding Sv into the General Retention Compliance Calculator.

---

## Methodology

The calculator uses a **continuous daily mass balance simulation** over the 20-year rainfall record:

```
V_cistern(t) = V_cistern(t-1) + Inflow(t) - Demand(t)
```

Where:
- `Inflow(t)` = daily rainfall × CDA runoff coefficients × filter efficiency
- `Demand(t)` = sum of all daily uses (irrigation, toilets, laundry, cooling towers, etc.)
- Cistern volume is clamped between 0 and the cistern capacity

Daily average available storage = mean of daily cistern void space over 20 years. This represents how much of a storm event the cistern can typically absorb on any given day.

---

## Key Notes

- The 1.7" storm event is the CDA cap — a BMP cannot claim retention credit for more than 1.7" of runoff from its CDA, so cistern Sv is capped at `1.7" × CDA × 0.95/12` in CF (Guidebook §3.1; 21 DCMR §508.5).
- Rainwater Harvesting systems require DOEE approval of the demand calculations — document all end uses in the SWMP narrative.
- Systems used for irrigation only may underperform in winter months when demand is zero; the 20-year simulation accounts for this seasonality.
- If condensate or greywater contributes to the cistern, enter it as a negative demand (contribution from other sources section) — it counts toward the 1.7" cap only as actual cistern inflow.
- Guidebook §3.3 requires that for the 1.2" storm, ≥95% of runoff enters the cistern after first flush diversion.
