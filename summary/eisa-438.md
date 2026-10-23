# EISA Section 438 – Technical Guidance on Stormwater Runoff Requirements for Federal Projects

**Source:** `docs/eisa-438.pdf`
**Published:** December 2009 | EPA 841-B-09-001

## Overview

Section 438 of the Energy Independence and Security Act of 2007 (EISA) requires that any federal development or redevelopment project with a footprint exceeding 5,000 SF maintain or restore, to the maximum extent technically feasible (METF), the predevelopment hydrology of the property with regard to temperature, rate, volume, and duration of flow. This EPA technical guidance, issued under EO 13514, explains how to comply using green infrastructure / low impact development (GI/LID) practices. It is guidance only — not a regulation — but compliance with Section 438 is a binding obligation on federal agencies.

---

## Part I: Implementation Framework

### Applicability (Section C)

| Term | Definition |
|---|---|
| **Sponsor** | The federal department or agency that owns, operates, occupies, or initiates the project |
| **Federal facility** | Any building constructed, renovated, leased, or purchased for federal use (EISA §401(8)) |
| **Footprint** | All land areas disturbed as part of the project; threshold is **>5,000 SF** |
| **Property** | The entire federal property surrounding the project site may be used for GI/LID practices |
| **Development** | Any action altering landscape during construction that affects runoff rates, volumes, temperature, or duration |
| **Re-development** | Structures or infrastructure reconstructed/replaced with landscape alteration; routine patching/resurfacing excluded |

The requirement applies only to the project **footprint**, but the flexibility exists to implement controls across the entire federal property.

---

### Design Objective: Two Options (Section D)

#### Option 1 — Retain the 95th Percentile Rainfall Event (Simplified)

Design, construct, and maintain stormwater practices that prevent off-site discharge from all rainfall events ≤ the 95th percentile event, to the METF. Control must be achieved through **infiltration, evapotranspiration, and/or harvest and reuse** — not detention.

The 95th percentile event is the 24-hour precipitation depth that is greater than or equal to 95% of all storm events from a long-term record (≥30 years recommended; minimum 10 years). Events ≤0.1 inch are excluded from the analysis.

**Table 1 — 95th Percentile Storm Events for Select U.S. Cities (from EPA guidance)**

| City | 95th %ile (in) | City | 95th %ile (in) |
|---|---|---|---|
| Atlanta, GA | 1.8 | Kansas City, MO | 1.7 |
| Baltimore, MD | 1.6 | New York, NY | 1.7 |
| Boston, MA | 1.5 | Portland, OR | 1.0 |
| Denver, CO | 1.1 | Seattle, WA | 1.6 |
| Cincinnati, OH | 1.5 | **Washington, DC** | **1.7** |
| Phoenix, AZ | 1.0 | Charleston, WV | 1.2 |

**Calculation procedure (Excel):**
1. Obtain 24-hr precipitation data from NOAA/NCDC for the project location
2. Remove events ≤0.1 inch and flagged/erroneous data points
3. Apply `=PERCENTILE(data_range, 95%)` to determine the 95th percentile depth

#### Option 2 — Site-Specific Hydrologic Analysis

Conduct a continuous simulation or equivalent hydrologic analysis to determine pre-development runoff conditions, then demonstrate that post-construction runoff rate, volume, duration, and temperature do not exceed pre-development levels. Use calibrated tools (TR-55, SWMM, HSPF, etc.). Option 2 is more rigorous but more complex; Option 1 is the practical default for most projects.

---

### Maximum Extent Technically Feasible (METF)

METF documentation must include engineering calculations, geologic reports, hydrologic analyses, and site maps demonstrating that infiltration, evapotranspiration, and harvest-and-use have been fully employed. Technical infeasibility may be claimed if a combination of the following conditions applies:

- Shallow bedrock, contaminated soils, high groundwater, underground utilities
- Site too small to accommodate adequately sized infiltration practices
- Soils with insufficient infiltration rates
- Structural/plumbing constraints that prevent modifications
- Non-potable water demand too small to warrant harvesting systems
- State or local requirements restrict water collection or GI/LID practices

A single constraint is unlikely to be sufficient; a **combination** of factors is typically required to claim infeasibility.

---

### Common GI/LID Practices

| Practice | Notes |
|---|---|
| Bioretention / rain gardens | Preferred; lowest cost per unit volume treated |
| Permeable pavement / paver blocks | 2nd priority; 60% max of total paved area in models |
| Cisterns | 3rd priority; sized by site-specific demand |
| Green roofs | 4th priority; modeled at max 30% of roof area |
| Vegetated swales / bioswales | Conveyance and infiltration |
| Trees and tree boxes | ET benefit |
| Pocket wetlands | Retention |
| Rainwater harvesting | Reuse for irrigation, toilet flushing, HVAC |

---

## Part II: Case Studies and Calculation Methodology

### Runoff Calculation — Direct Determination Method

```
Runoff = Rainfall – Depression Storage – Infiltration Loss
```

**Depression storage (initial abstraction):**

| Surface | Depression Storage |
|---|---|
| Rooftop | 0.1 inches |
| Pavement | 0.1 inches |
| Pervious area | 0.2 inches |

**Horton infiltration equation (pervious areas only):**

```
F_t = f_min + (f_max – f_min) × e^(–k × t)
```

- `F_t` = infiltration rate at time t (in/hr)
- `f_min` = minimum/saturated infiltration rate (in/hr)
- `f_max` = maximum/initial infiltration rate (in/hr)
- `k` = decay factor (1/hr)
- `t` = time from start of runoff (hr)

**Horton parameters by Hydrologic Soil Group:**

| Parameter | HSG B | HSG C |
|---|---|---|
| f_max (in/hr) | 5.0 | 3.0 |
| f_min (in/hr) | 0.3 | 0.1 |
| k (1/hr) | 2.0 | 3.5 |

**Infiltration loss over 24 hours** (integrated using Δt = 0.5 hr):
```
Infiltration Loss = Σ(F_t × Δt)
```
For both HSG B and C soils, infiltration loss over 24 hours far exceeds the 95th percentile storm depth, so pervious areas typically generate **zero net runoff**.

**Area-weighted site runoff:**

```
Runoff_site = {(Runoff_roof × A_roof) + (Runoff_pave × A_pave) + (Runoff_pervious × A_pervious)} / A_site
```

**Design storage assumptions for sizing controls:**

| Practice | Design Storage Depth |
|---|---|
| Bioretention | Up to 10 inches (storage within media and ponded depth ≤12 in) |
| Green roof | 1 inch effective (2.5-inch media at 40% void space) |
| Porous pavement | 2 inches (10-inch media at 20% void, or 6-inch at 33% void) |

---

### Case Study Summary Table (Scenarios 1–7)

| # | Location | Site (ac) | Imperv. | 95th %ile (in) | Runoff (in) | Primary BMP | BMP Area (ac) HSG B |
|---|---|---|---|---|---|---|---|
| 1 | Charleston, WV | 0.7 | 73% | 1.23 | 0.82 | Bioretention | 0.03 |
| 2 | Denver, CO | 4.5 | 55% | 1.07 | 0.53 | Bioretention | 0.16 |
| 3 | Cincinnati, OH | 19 | 51% | 1.45 | 0.68 | Bioretention | 0.8 |
| 4 | Portland, OR | 27 | 95% | 1.00 | 0.86 | Green roof + porous pave + cistern | Mixed |
| 5 | Phoenix, AZ | 2 | 47% | 1.00 | 0.42 | Bioretention | 0.06 |
| 6 | Boston, MA | 3.5 | 69% | 1.52 | 0.98 | Porous pavement | 0.4 |
| 7 | Atlanta, GA | 21 | 70% | 1.77 | 1.17 | Bioretention + porous pave | 0.9 + 0.86 |

Note: GI/LID approach was 15–80% less expensive than conventional stormwater controls in EPA's 17-project review study (EPA 841-F-07-006).

---

## Project Calculation Example — Federal Office Renovation, Washington, DC

This example demonstrates Option 1 compliance for a hypothetical federal office redevelopment project in Washington, DC.

### Project Parameters

| Parameter | Value |
|---|---|
| Project type | Federal building redevelopment (triggers Section 438) |
| Site area | 2.5 acres (108,900 SF) |
| Rooftop | 0.8 acres |
| Pavement (parking + walks) | 1.2 acres |
| Pervious / landscaped | 0.5 acres |
| Site imperviousness | 80% |
| Soil type | HSG C (typical DC urban clay soils) |
| 95th percentile storm (Washington, DC) | **1.7 inches** (Table 1, EISA guidance) |

---

### Step 1 — Calculate Runoff from Each Surface

**Rooftop:**
```
Runoff_roof = 1.7 – 0.1 (depression storage) = 1.6 inches
```

**Pavement:**
```
Runoff_pave = 1.7 – 0.1 (depression storage) = 1.6 inches
```

**Pervious area (HSG C, Horton infiltration):**

Over a 24-hour event, the Horton infiltration loss for HSG C soils far exceeds the available rainfall after depression storage (1.7 – 0.2 = 1.5 inches available), so:
```
Runoff_pervious = 1.7 – 0.2 – [infiltration loss > 1.5"] = 0 inches
```

---

### Step 2 — Area-Weighted Site Runoff

```
Runoff_site = {(1.6 × 0.8) + (1.6 × 1.2) + (0 × 0.5)} / 2.5
            = {1.28 + 1.92 + 0.00} / 2.5
            = 3.20 / 2.5
            = 1.28 inches
```

---

### Step 3 — Total Volume to Retain

```
Volume = 1.28 in ÷ 12 × 2.5 acres × 43,560 SF/acre
       = 0.107 ft × 108,900 SF
       = 11,620 CF   (0.267 acre-feet)
```

---

### Step 4 — Size Bioretention Cell

Bioretention design storage depth = 10 inches = 0.833 ft

```
Bioretention area needed = 11,620 CF ÷ 0.833 ft
                         = 13,950 SF   (0.32 acres)
```

Available pervious / landscaped area = 0.5 acres = 21,780 SF

```
Bioretention footprint = 13,950 SF ÷ 21,780 SF = 64% of available pervious area
```

**Result:** A single bioretention system occupying approximately **0.32 acres (13,950 SF)** within the landscaped area can retain 100% of the 95th percentile storm runoff. This is feasible — the required area is less than the available pervious area.

---

### Step 5 — BMP Design Summary

| Parameter | Value |
|---|---|
| 95th percentile design storm | 1.7 inches |
| Site runoff to manage | 1.28 inches (area-weighted) |
| Total volume to retain | 11,620 CF (0.267 ac-ft) |
| BMP type selected | Bioretention |
| Bioretention area required | 0.32 acres (13,950 SF) |
| Bioretention design depth | 10 inches storage |
| Available pervious area | 0.50 acres (21,780 SF) |
| % of pervious area used | 64% |
| Residual runoff discharged off-site | 0 inches (full retention) |

---

### Relationship to DC DOEE Requirements

For federal projects in Washington, DC, **both** sets of requirements apply simultaneously:

| Requirement | Trigger | Design Storm | Standard |
|---|---|---|---|
| **DC DOEE** (21 DCMR Ch. 5) | MLD ≥5,000 SF land disturbance | 1.2 inches | Retain SWRv on-site |
| **DC DOEE** (21 DCMR Ch. 5) | MSI on existing impervious | 0.8 inches | Retain SWRv on-site |
| **EISA Section 438** | Federal facility footprint >5,000 SF | 1.7 inches (DC 95th %ile) | Retain to METF via infiltration/ET/harvest |

The EISA Section 438 standard (1.7 inches for DC) is more stringent than DOEE's MLD standard (1.2 inches). A design that satisfies Section 438 will typically also satisfy DOEE SWRv requirements. The key difference is that Section 438 **prohibits detention** as a primary mechanism — it requires infiltration, ET, or reuse, which aligns with the DOEE retention-based approach.

---

## Key Points / Notes

- Section 438 applies to **federal projects only**; it is not binding on non-federal project sponsors. However, where a federal agency funds or leases space in a private development, the applicability should be confirmed.
- The 95th percentile storm approach was chosen as an **analog for pre-development hydrology**: under natural conditions, storms of this size are typically fully absorbed. Managing them on-site replicates pre-development conditions for roughly 95% of all storm events by frequency.
- Scenario 9 (not detailed above) shows a site where only 75% of the 95th percentile event could be retained due to site constraints — this illustrates the METF principle in practice.
- Washington, DC's 95th percentile storm of 1.7 inches is one of the highest in the table, reflecting the humid climate and frequent convective storms.
- Cost data from Denver (Scenario #2) showed GI/LID was **17.3% less expensive** than traditional controls. Atlanta (Scenario #7) showed a slight premium of 9.9% for a more complex site. Cost parity improves as agency expertise and material availability increase.
