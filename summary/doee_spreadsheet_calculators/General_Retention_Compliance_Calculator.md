# General Retention Compliance Calculator

**Source:** `docs/doee_spreadsheet_calculators/2020 General Retention Compliance Calculator 2-5-21.xlsx`
**Version:** 3 (February 5, 2021)
**Reference:** DOEE Stormwater Management Guidebook (January 2020), 21 DCMR Chapter 5

---

## Overview

The primary submission tool for preparing Stormwater Management Plan (SWMP) compliance documentation. It calculates the Stormwater Retention Volume (SWRv) required for each Site Drainage Area (SDA), tracks BMP retention credits, checks detention requirements, and produces a Compliance Check Summary for DOEE review. Output data feeds directly into the DOEE Stormwater Database (SWDB). White cells are user inputs; blue cells are auto-calculated.

---

## Tabs and Their Purpose

| Sheet | Role |
|---|---|
| **Instructions** | Color key, field definitions, and data entry order |
| **Compliance Check Summary** | Auto-generated pass/fail summary by SDA and site total |
| **Site Data** | Aggregated land cover and SWRv/WQTv totals |
| **1. Site Drainage Areas** | Core input sheet — land cover by SDA, SWRv calculations |
| **2. BMP Data** | BMP-level input — CDA, storage volume, BMP type per practice |
| **3. Detention** | Detention check using Curve Numbers for 2-yr and 15-yr storms |
| **Saved Values** | Internal lookup tables (CN lookup, watershed lists, dropdown sources) |
| **Watersheds** | Dropdown list of DC watersheds (Anacostia, Potomac, Rock Creek) |
| **BMP Types** | BMP group list and retention multipliers |
| **Retention Calculations** | Internal formulas (no user input) |

---

## Data Entry Order

Enter sheets in this sequence — BMP Data requires SDA data to be complete first:

1. **Site Drainage Areas** → 2. **BMP Data** → 3. **Detention**

---

## Sheet 1 — Site Drainage Areas: Inputs

### Site Information (top of sheet)

| Field | Description |
|---|---|
| SWMP Number | Assigned by DOEE |
| Site Name | Project name |
| Is Site an "AWDZ Site"? | Yes/No — Anacostia Waterfront Development Zone triggers enhanced requirements |
| MS4 / CSS / CSS w/ tunnels | Location type determines detention applicability |

### Per-SDA Inputs (one row per SDA)

| Field | Units | Notes |
|---|---|---|
| SDA Number | Integer | Sequential, no gaps |
| In Public Right of Way? | Yes/No | PROW SDAs use MEP standard, not numerical SWRv |
| **Pre-Construction Land Cover** | | |
| — Natural Cover Area (MLD/PROW) | SF | Forest, meadow |
| — Compacted Cover Area (MLD/PROW) | SF | Lawn, managed turf, planted beds |
| — Impervious Cover Area (MLD/PROW) | SF | Roof, pavement, deck — excludes BMP surface |
| — BMP Cover Area (MLD/PROW) | SF | Existing green infrastructure surface area |
| — Same fields for Major Substantial Improvement area | SF | |
| **Post-Construction Land Cover** | | |
| — Same four cover types as above | SF | |
| — Vehicular Access Area | SF | Subset of impervious; triggers oil/grit separator requirement |

### Auto-Calculated SWRv Output (per SDA)

The calculator applies the SWRv formula:

```
SWRv (CF) = (Rainfall Depth × Rv × Drainage Area) / 12
```

Where:
- Rainfall depth = 1.2" for MLD, 0.8" for MSI, 0.0" for PROW (MEP applies)
- Rv = Runoff coefficient: 0.95 for impervious; 0.25 for compacted; 0.00 for natural/BMP
- WQTv is calculated only for sites in the Chesapeake Bay tributary area (non-tidal MS4/CSS w/ GI)

---

## Sheet 2 — BMP Data: Inputs

Each individual BMP is entered on a separate row.

| Field | Description |
|---|---|
| BMP ID | Auto-generated |
| Site Drainage Area Number | Must match an SDA entered in Sheet 1 |
| BMP Number | Integer, sequential within each SDA (restart at 1 per SDA) |
| BMP Name | Optional label (stored in SWDB for reference) |
| BMP Group | Select from dropdown — see BMP Types table below |
| BMP Type | Sub-type within group (e.g., Bioretention - Standard vs. Enhanced) |
| Number of Trees | For tree planting/preservation BMPs only |
| **Contributing Drainage Area (CDA) Land Cover** | |
| — Natural / Compacted / Impervious / BMP SF | Inside LOD only |
| — Vehicular Access Area | SF |
| Storage Volume (Sv) | CF — from SWMP-BMP Calc spreadsheet (see separate calculator) |
| Downstream BMP | If BMP overflows to another BMP, select from dropdown |

### BMP Retention Multipliers

These multipliers convert Sv to Rv (retention credit) depending on BMP type:

| BMP Type | Retention Multiplier |
|---|---|
| Green Roof | 1.0 |
| Rainwater Harvesting | 1.0 |
| Permeable Pavement — Enhanced w/o Underdrain | 1.0 |
| Bioretention — Enhanced | 1.0 |
| Infiltration | 1.0 |
| Bioretention — Standard | 0.6 |
| Dry Swale | 0.6 |
| Grass Channel — Amended Soils | 0.3 |
| Grass Channel | 0.1 |
| Wet Swale | 0.1 |
| Pond | 0.1 |
| Wetland | 0.1 |
| Filtering System | 0.0 |
| Proprietary Practice | 0.0 |

Tree BMPs receive a fixed Rv credit (no Sv field): Small Tree = 5 CF, Large Tree = 10 CF, Small Preservation = 10 CF, Large Preservation = 20 CF, Special = 30 CF, Heritage = 40 CF.

---

## Sheet 3 — Detention: Inputs

Completed last. Checks whether post-development peak discharge for the 2-year and 15-year storms exceeds pre-development levels (required in non-tidal MS4 and CSS areas).

| Field | Default CN | Notes |
|---|---|---|
| CN — Natural | 70 | User-adjustable |
| CN — Compacted | 74 | User-adjustable |
| CN — Impervious | 98 | User-adjustable |
| CN — BMP Land Cover | 98 | User-adjustable |

The calculator looks up rainfall depths (2-yr = ~3.14", 15-yr = ~5.23", 100-yr = ~8.34") from an internal table and computes composite CN for pre- and post-development conditions. If post-CN exceeds pre-CN thresholds, additional detention storage is flagged as required.

---

## Compliance Check Summary Output

The summary sheet auto-populates once all data is entered:

| Output | Units | Notes |
|---|---|---|
| PROW SWRv Required | CF | 0 if MEP applies |
| Parcel SWRv Required | CF | Sum across all parcel SDAs |
| Total SWRv Required | CF | |
| Volume Retained — PROW / Parcel / Total | CF | Sum of BMP Rv credits |
| % of Requirement Met | % | Flags if < 100% |
| Per-SDA compliance flag | Yes/No | Must be Yes for every SDA |
| Additional Detention Required? | Yes/No | Per SDA, 2-yr and 15-yr |

---

## Key Notes

- SWRv must be met **within each SDA separately** — surplus retention in one SDA cannot offset a deficit in another (see DOEE Guidebook §2.2; 21 DCMR §508).
- BMP credit is **capped at 1.7" × CDA** — a BMP cannot claim retention credit for more than 1.7 inches of runoff from its CDA, regardless of physical size (Guidebook §3.1).
- PROW SDAs are always marked as passing for SWRv (MEP standard applies); detention check still applies in non-tidal MS4.
- The AWDZ flag changes the applicable SWRv standard from 1.2" to 1.2" with additional requirements per the Anacostia Waterfront Framework Plan.
- WQTv treatment (filtering, not retention) is required for vehicular access areas draining to non-tidal MS4 or CSS with GI.
