# DDOT MEP Worksheet

**Source:** `docs/doee_spreadsheet_calculators/DDOT MEP Worksheet 012019.xlsx`
**Version:** January 2019
**Reference:** DOEE Stormwater Management Guidebook (January 2020), §2.3 (MEP); 21 DCMR §508.9; DDOT 2014 Green Infrastructure Standards

---

## Overview

The DDOT Maximum Extent Practicable (MEP) Worksheet is the required documentation tool for Public Right-of-Way (PROW) stormwater management. Because PROW projects cannot always meet the full numerical SWRv target (1.2" × disturbed area × Rv), DOEE allows an MEP compliance path. This worksheet guides the designer through a four-step analytical process at three design phases (30%, 65%, 90%) and tracks how much retention volume has been identified vs. how much is required. The sample tabs use the "Minnesota Ave Great Street" project as a worked example.

---

## Tabs

| Sheet | Contents |
|---|---|
| **30% Phase** | Blank template — 30% design submittal |
| **65% Phase** | Blank template — 65% design submittal with infiltration data added |
| **90% Phase** | Blank template — 90%/Final design submittal |
| **30% Phase Sample** | Completed example (Minnesota Ave, 33 drainage areas, 5.1 ac) |
| **65% Phase Sample** | Completed 65% example with BMP volumes assigned |
| **90% Phase Sample** | Completed 90% example with final BMP configuration |

---

## Project Header (All Phases)

| Field | Notes |
|---|---|
| Project Name | |
| Project No. | DDOT project number |
| Check One: MS4 / CSS | Determines detention applicability |
| Check if in AWDZ | Anacostia Waterfront Development Zone flag |
| DOEE Plan Review No. | Assigned after 30% submission |
| Disturbance Area (ac.) | Total LOD area — auto-converts SF to acres |
| No. of Drainage Areas | Count of individual drainage areas in project |
| Regulated Retention Volume (1.2") | Auto-calculated from Step 1 data (CF) |
| Volume Retained | Sum of BMP Rv credits across all drainage areas (CF) |
| Difference | Volume Retained − Regulated Volume (negative = deficit) |

---

## Four-Step MEP Process

Each drainage area row progresses through four steps, with additional fields unlocked at each phase.

### Step 1 — Drainage Area and Regulated Volumes (All Phases)

Identify and quantify each drainage area within the LOD:

| Field | Units | Notes |
|---|---|---|
| Drainage Area ID | Text/number | e.g., "57", "EX-61" |
| Impervious within LOD | SF | |
| Compacted within LOD | SF | |
| Natural within LOD | SF | |
| **Total within LOD** | SF | Auto-sum |
| Impervious outside LOD | SF | Offsite area draining through project |
| Compacted outside LOD | SF | |
| Natural outside LOD | SF | |
| **Total outside LOD** | SF | Auto-sum |
| **SWRv — Within LOD** | CF | Auto: `Total LOD × Rv × 1.2/12` |
| **SWRv — Outside LOD** | CF | Auto: `Total outside LOD × Rv × 1.2/12` |

---

### Step 2 — Consider Infiltration (65% and 90% only)

Added at 65% when site investigations are more complete:

| Field | Notes |
|---|---|
| Hydrologic Soil Group | A, B, C, D, or Urban Land — determines infiltration feasibility |
| Water Table OK? | Y/N — high water table can preclude infiltration BMPs |
| Bedrock Elevation OK? | Y/N — shallow bedrock can preclude infiltration |
| Infiltration Rate | in/hr — field-verified |

---

### Step 3 — Evaluate Existing Infrastructure Constraints (65% and 90%)

Identifies physical conflicts that prevent BMP placement:

| Field | Notes |
|---|---|
| Hotspot Concern Found? | Y/N — gas stations, industrial uses may preclude infiltration |

At 30%, only Hotspot is checked. At 65%/90%, full infiltration suitability (Step 2) is required.

---

### Step 4 — Identify Land Conversion and BMP Placement Opportunities (All Phases)

Documents what green infrastructure has been or can be placed in each drainage area:

**Tree Credits (all phases):**

| Field | Credit per unit (CF) |
|---|---|
| # Small Trees preserved/planted | 5 CF per tree |
| # Large Trees preserved/planted | 20 CF per tree |
| # Special/Heritage Trees preserved | 30–40 CF per tree |

**BMP Placement (65% and 90%):**

| Field | Description |
|---|---|
| BMP surface area (SF) | Area of each green infrastructure practice |
| BMP type | Bioretention, permeable pavement, etc. |
| CDA assigned to BMP (SF) | Both within-LOD and outside-LOD portions |
| BMP Rv (CF) | Retention credit from SWMP-BMP Calc |
| Cumulative Rv deficit/surplus | Running balance against SWRv target |

---

## Compliance Tracking

Each row shows the running deficit or surplus:

```
Difference = Volume Retained − Regulated Retention Volume (1.2")
```

A negative difference means the MEP target has not yet been met. The MEP process requires the designer to document why the deficit remains — physical constraints, utility conflicts, safety requirements — in the SWMP narrative. DOEE accepts a deficit only if MEP is properly documented.

### Minnesota Ave Sample (30% Phase — for reference)

- Disturbance area: 5.10 ac (33 drainage areas)
- Regulated SWRv: 19,812 CF
- Volume retained at 30%: TBD (no BMPs sized yet)
- At 65%: 11,380 CF retained → −8,432 CF deficit
- At 90%: 9,866 CF retained → −9,947 CF deficit (some BMPs removed due to constructability)

This sample illustrates that MEP is an iterative process — the 90% design may retain less than 65% if constraints are discovered during detailed design, but the documentation of those constraints satisfies MEP.

---

## Key Notes

- The MEP worksheet substitutes for the Compliance Calculator for PROW SDAs — PROW SDAs are marked "Yes" for MEP compliance in the Compliance Calculator without a numerical SWRv check (21 DCMR §508.9; Guidebook §2.3).
- All four steps must be addressed at each phase; gaps in documentation are grounds for DOEE to reject a MEP finding.
- The Outside LOD SWRv column captures offsite drainage passing through the project (e.g., upstream catchments entering a roadway inlet) — retention credit for this runoff may count toward MEP compliance if the BMP captures it.
- Hotspot drainages (gas stations, industrial sites) cannot use infiltration BMPs due to groundwater contamination risk; document in narrative.
- AWDZ projects may have additional MEP requirements under the Anacostia Waterfront Framework Plan.
