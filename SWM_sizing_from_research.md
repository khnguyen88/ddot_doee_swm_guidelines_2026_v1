# DC Stormwater Management Sizing Requirements
## General Knowledge and Research Summary

---

## Overview

Washington, DC operates one of the most stringent urban stormwater management programs in the United States. The Department of Energy and Environment (DOEE) administers the program under the authority of DC's Stormwater Management Regulations (21 DCMR Chapter 5) and the federal Clean Water Act (CWA) Section 402 NPDES permit program. DC has two separate drainage systems — the Municipal Separate Storm Sewer System (MS4) in newer, lower-density areas and the Combined Sewer System (CSS) in the older urban core — and its SWM standards are calibrated to address the needs of each.

The program philosophy has shifted from traditional peak flow detention (the "gray infrastructure" approach of managing stormwater quantity) to **volume-based retention** emphasizing low impact development (LID) and green infrastructure (GI). This reflects national trends in stormwater management post-2000 and DC's specific obligations under its MS4 NPDES permit.

---

## 1. Regulatory Framework

### Federal Basis
- **Clean Water Act Section 402**: Authorizes the National Pollutant Discharge Elimination System (NPDES) permit program. MS4 operators (like DOEE and DDOT) must obtain Phase I or Phase II MS4 permits.
- **EPA MS4 Permit Requirements**: Require permittees to control pollutants in stormwater to the "maximum extent practicable" (MEP) — this federal MEP standard is the origin of the MEP concept applied in DC's PROW regulations.
- **Total Maximum Daily Load (TMDL)**: The Chesapeake Bay and local water bodies (Anacostia River, Rock Creek, Potomac River) have EPA-approved TMDLs for nutrients, sediment, and bacteria. DC's stormwater program is partly driven by obligations to meet these TMDLs.

### DC Regulatory Framework
- **DC Code §8-153.01 et seq.**: Stormwater management statutory authority.
- **21 DCMR Chapter 5**: Stormwater management regulations promulgated by DOEE.
- **DOEE SWM Guidebook (January 2020)**: Technical design guidance that operationalizes 21 DCMR Chapter 5.
- **DOEE SWM Plan 2022 and Final SWMP 2016**: Strategic plans for the MS4 permit; include retrofit targets and SRC program details.
- **DDOT Green Infrastructure Standards (2014)**: Supplemental design guidance for GI/LID in public ROW under DDOT jurisdiction.

---

## 2. The Retention-Based Approach

Unlike traditional detention-based SWM (which only slows stormwater before releasing it), DC requires **retention** — stormwater must be absorbed, infiltrated, evapotranspired, or harvested so that it never reaches the storm sewer. This distinction is critical:

| Approach | Mechanism | Water Quality Benefit |
|---|---|---|
| **Detention** | Holds water temporarily; releases slowly | Modest (only reduces peak flows) |
| **Retention** | Permanently removes volume from storm sewer | High (reduces volume, TSS, nutrients) |

DC's shift to retention is primarily driven by the need to reduce combined sewer overflows (CSOs) in the CSS areas and to reduce pollutant loads to the Chesapeake Bay through MS4 discharges.

---

## 3. Volume-Based Sizing: The SWRv Concept

The **Stormwater Retention Volume (SWRv)** is the amount of stormwater a project must permanently remove from the drainage system.

### Design Storm Selection
DC uses **volumetric sizing** based on a percentile rainfall event:
- **90th percentile (1.2 inches)**: The dominant standard; represents roughly 90% of all rainfall events. This is consistent with EPA's WQ design storm guidance encouraging treatment of the "water quality storm."
- **85th percentile (1.0 inch)** and **80th percentile (0.8 inch)**: Reduced thresholds for substantial improvement projects, recognizing the limitations of retrofitting existing structures.
- **95th percentile (1.7 inches)**: The water quality treatment design storm for AWDZ sites requiring WQTv.

The 1.2-inch, 24-hour storm is a national benchmark often referenced by EPA in its LID and GI technical literature (EPA 832-R-00-006, "Stormwater Phase II Final Rule") as the appropriate design event for water quality volume capture.

### Rational/Volumetric Method
The SWRv formula uses a **runoff coefficient approach** derived from the Rational Method modified for volume calculation:

```
Volume = P × Rv × A
```

Where `Rv` is a composite runoff coefficient reflecting the mix of impervious, compacted, and natural surfaces. DC's specific coefficients (RvI=0.95, RvC=0.25, RvN=0.00) are calibrated to local conditions and are broadly consistent with coefficients used in other urban jurisdictions.

---

## 4. AWDZ — Anacostia Waterfront Development Zone

The AWDZ reflects DC's specific commitment to restoring the Anacostia River, one of the most degraded urban waterways on the East Coast. Higher retention standards within the AWDZ (1.0 instead of 0.8 for substantial improvement; additional WQTv to the 95th percentile) align with the Anacostia Clean Up and Protection Act and Chesapeake Bay commitments.

The **Water Quality Treatment Volume (WQTv)** requirement for publicly-financed AWDZ sites is unusual nationally — most jurisdictions stop at a single design storm. DC's two-tiered approach (SWRv + WQTv) reflects a more aggressive water quality strategy for the most sensitive watershed.

---

## 5. MS4 vs. CSS Distinction

### MS4 Areas
- Newer, outer areas of DC (above the fall line and in newer development corridors).
- 50% on-site minimum retention: Projects in MS4 areas must retain at least half of the SWRv on-site because the MS4 permit's water quality obligations require demonstrable on-site green infrastructure.
- Off-site compliance via SRCs allowed for the remaining 50%.

### CSS Areas
- The older urban core (Capitol Hill, Georgetown, downtown, etc.) — approximately the area below Florida Avenue historically.
- No mandatory on-site percentage: The CSS collects both stormwater and sewage; volume reduction anywhere in the watershed reduces CSO frequency, so off-site SRCs are fully creditable.
- DC Water's Long-Term Control Plan (LTCP) manages CSO compliance; DOEE's on-site SWM requirements complement but do not duplicate LTCP obligations.

---

## 6. Stormwater Retention Credits (SRCs)

DC's SRC program is one of the most sophisticated stormwater trading programs in the US, modeled partly after nutrient credit trading in the Chesapeake Bay watershed.

- **1 SRC = 1 gallon/year retained** at a certified off-site facility.
- Regulated sites can purchase SRCs to satisfy the off-site-eligible portion of their SWRv.
- SRC generators include: green roofs, permeable pavement, bioretention cells, cisterns, and other approved BMPs installed at voluntarily-participating properties.
- DOEE maintains a registry of certified SRCs and an active secondary market.
- SRC prices are market-determined; DOEE publishes benchmarks. As of recent years, SRC prices have ranged from approximately $2–$5 per gallon/year, though market prices fluctuate.

This trading mechanism creates economic incentives for voluntary GI installation beyond regulated sites and allows projects with severe physical constraints to achieve compliance without mandating technically infeasible on-site solutions.

---

## 7. MEP — Maximum Extent Practicable: Origins and Application

### Federal Origin of MEP
The **Maximum Extent Practicable (MEP)** standard originates in **Clean Water Act Section 402(p)**, which established the NPDES MS4 permit program. Congress did not require MS4 operators to achieve zero discharge or even a fixed numeric standard — instead, it required control of pollutants "to the maximum extent practicable." The EPA has defined MEP in MS4 context as a technology-based standard that requires iterative evaluation: implement a practice unless it is technically infeasible, financially prohibitive, or conflicts with other legal requirements.

> "MEP establishes the upper boundary of what MS4 permittees must do, balancing water quality goals against technical and economic feasibility." — EPA MS4 Permit Improvement Guide, 2010

### MEP in DC PROW Context

DC's application of MEP to PROW reconstruction is a direct extension of this federal principle to a capital project context. Key reasons why PROW requires MEP rather than the full SWRv standard:

1. **Physical constraints**: Existing underground utilities, narrow rights-of-way, and established grades limit where and how much GI can be installed.
2. **Transportation function**: PROW must maintain vehicle clearances, pedestrian safety, ADA compliance, sight lines, and utility access — GI cannot compromise primary transportation function.
3. **Cost proportionality**: Requiring 100% SWRv compliance for a sidewalk repair would be financially disproportionate to project scope.
4. **Retrofit vs. new construction**: PROW reconstruction is a retrofit condition; the MEP standard acknowledges the technical difference between retrofit and greenfield projects.

### MEP Process in Practice

For PROW projects, the MEP process is typically:
1. **Site analysis**: Identify available space for GI/LID within the ROW (sidewalk width, curb space, utility locations, drainage patterns).
2. **Candidate BMP identification**: Evaluate permeable pavement, bioretention, tree boxes, and swales at each feasible location.
3. **Feasibility screening**: Screen each candidate for physical feasibility (soil infiltration rates, depth to water table, utility conflicts, slope) and functional compatibility (pedestrian volume, vehicle loads).
4. **Volume calculation**: Calculate achievable retention from feasible BMPs; compare to 1.2-inch target.
5. **Documentation**: If full 1.2-inch target is not achievable, document why specific BMPs are infeasible at each location.

This iterative, location-by-location analysis is the heart of MEP — the designer must demonstrate they have genuinely exhausted feasible options, not simply asserted infeasibility.

---

## 8. Green Infrastructure Practices in PROW

### Permeable Pavement
Nationally recognized as the most practical LID practice for ROW because it replaces impermeable surface with a functionally equivalent permeable alternative. The primary performance consideration is the **reservoir (base) layer** — a crushed stone layer beneath the permeable surface that provides storage volume until water infiltrates into the subgrade or drains via an underdrain.

Key national references:
- EPA 832-R-99-023: *Stormwater Technology Fact Sheet — Porous Pavement*
- ASCE/EPA studies confirming permeable pavement effectiveness for volume reduction in urban settings.

### Bioretention
Bioretention (also called rain gardens in residential contexts) is a proven water quality and quantity BMP. It relies on:
- **Filtration** through engineered soil media (typically a sandy loam mix with 5–10% organic matter).
- **Biological uptake** by plants.
- **Infiltration** into native subgrade (where soils permit) or overflow via underdrain.

The 72-hour maximum drawdown standard for DC bioretention cells is consistent with EPA and state guidance ensuring vector control (mosquito breeding prevention) and preventing soil saturation that would reduce future event performance.

### Tree Boxes and Tree Trenches
Urban trees provide stormwater benefits through canopy interception, transpiration, and root zone infiltration. Silva Cell and similar suspended pavement systems allow large soil volumes for trees in confined sidewalk areas while counting stormwater storage toward SWRv credit. DC was an early adopter of tree-based SWM credit systems.

---

## 9. Storm Control vs. Volume Retention: National Context

Traditional SWM (pre-2000s) focused on **peak flow control** — ensuring post-development peak discharges do not exceed pre-development rates for the 2-year and 10-year/25-year storms. This was implemented through detention ponds.

The limitation of peak flow detention: it controls the flood pulse but does little for water quality, groundwater recharge, or base flow in streams. Studies of urban streams in the 1990s–2000s (summarized in EPA's 2007 *Reducing Stormwater Costs through Low Impact Development Strategies and Practices*) showed that peak flow detention alone could not prevent stream channel erosion or water quality degradation in urban watersheds.

DC's approach — requiring retention (volume reduction) rather than detention (peak delay) — is consistent with the national evolution toward LID-first stormwater management. The **exclusion of peak flow detention requirements for major substantial improvement and PROW projects** is intentional: these retrofits are too constrained to build detention infrastructure, and the volume-retention approach provides equivalent or better environmental benefit at these scales.

---

## 10. TSS Removal Standards

The **80% Total Suspended Solids (TSS) removal** standard for vehicular-access MS4 areas reflects EPA guidance from *Preliminary Data Summary of Urban Storm Water Best Management Practices* (EPA-821-R-99-012), which established 80% TSS removal as an achievable benchmark for well-designed bioretention, sand filters, and other structural BMPs.

TSS removal is a proxy for overall pollutant removal — most dissolved and particulate pollutants in urban stormwater (heavy metals, hydrocarbons, nutrients) are particle-associated and are reduced when TSS is controlled.

---

## 11. Chesapeake Bay and TMDL Context

All DC stormwater management ultimately serves the Chesapeake Bay Program goals:
- DC is one of six Bay watershed jurisdictions with a **Watershed Implementation Plan (WIP)** under the Bay TMDL.
- DC's stormwater program must demonstrate annual pollutant load reductions (nitrogen, phosphorus, sediment) to satisfy WIP obligations.
- DOEE reports GI installation and SRC program performance to the Bay Program's tracking system.
- The SRC program generates measurable, verifiable retention data used in WIP reporting.

The 1.2-inch retention standard is calibrated to achieve meaningful pollutant load reduction per installed BMP — enough volume to intercept the majority of annual runoff from impervious urban surfaces (studies suggest the 1.0–1.2 inch design event captures 85–90% of annual runoff volume from highly impervious sites).

---

## 12. Comparison to Other Jurisdictions

| Jurisdiction | Primary Design Storm | Retention vs. Detention | Off-Site Compliance |
|---|---|---|---|
| Washington, DC | 1.2" (90th pctile) | Retention required | Yes, via SRCs |
| Maryland (MDE) | 1.0" or 0.9" (varies) | Retention (ESD first) | Limited |
| Virginia | 1.0" water quality | Retention (primarily) | Limited STC trading |
| Philadelphia | 1.5" (85th pctile) | Retention required | Yes, greened acres trading |
| Portland, OR | Varies by tributary | Retention (LID first) | No |
| New York City | 1.0" (NYC DEP) | Retention for LID areas | Green infrastructure credits |

DC's program is among the most stringent in the US for urban infill and reconstruction, particularly in requiring retention (not just detention) and in providing a functioning credit market for off-site compliance.

---

## 13. Key References for Further Research

- EPA: *Stormwater Phase II Final Rule* (65 Fed. Reg. 64543, Oct. 29, 2000)
- EPA: *MS4 Permit Improvement Guide* (EPA 833-R-10-001, 2010)
- EPA: *Green Infrastructure for MS4 Stormwater Programs* (2010)
- DC DOEE: *21 DCMR Chapter 5* — Stormwater Management Regulations
- DC DOEE: *Stormwater Retention Credit Trading Program* guidance documents
- Chesapeake Bay Program: *Phase III Watershed Implementation Plan for DC*
- National Research Council: *Urban Stormwater Management in the United States* (2009)
- Low Impact Development Center (Beltsville, MD): LID technical publications

---

*This summary reflects general knowledge and research about DC stormwater management requirements, national regulatory context, and best management practice principles as understood through published EPA guidance, Chesapeake Bay Program materials, and national LID literature. For binding regulatory requirements, always consult 21 DCMR Chapter 5 and the current DOEE SWM Guidebook.*
