# DC Stormwater Management — Design Example and Standards Comparison
## Using DC Standards (DOEE Guidebook January 2020 / DDOT GI Standards 2014)

---

## How the Two Summaries Differ — and Why DC Standards Are the Authority

Before the calculations: the two summary files serve different purposes and produce meaningfully different outcomes when applied to a real project.

| Dimension | `SWM_sizing_from_docs.md` | `SWM_sizing_from_research.md` |
|---|---|---|
| **Purpose** | Permit-ready regulatory requirements | Background context and national framing |
| **Authority** | DOEE Guidebook + DDOT GI Standards — binding on DC projects | EPA guidance, academic literature — informative, not binding |
| **Formula specificity** | Exact equation, exact coefficients (RvI=0.95, RvC=0.25, RvN=0.00) | General volumetric method described conceptually |
| **Rainfall depths** | Specific P values: 0.8", 1.0", 1.2", 1.7" keyed to activity type and AWDZ status | Explains why those percentile thresholds exist nationally |
| **On-site minimums** | 50% MS4 / no minimum CSS — regulatory floor | Explains why distinction exists (MS4 permit vs. CSO LTCP) |
| **MEP** | Specific submission milestones (30/65/90/100%), BMP sizing ratios, drawdown times | Origin in CWA §402(p), conceptual MEP evaluation framework |
| **WQTv** | Equation 2.2, p.14 — additional volume to 1.7" for AWDZ public sites | Explains AWDZ/Anacostia River policy motivation |
| **For permit use** | Yes — use these numbers directly | No — supporting rationale only |

**Bottom line:** The research file explains why DC's standards are what they are. The docs file tells you what those standards actually are. For a permit submission or a design calculation, use the docs file. The research file helps you defend design choices, explain trade-offs to stakeholders, or understand when an exemption might apply.

---

## Design Example

### Project Description

**Project:** Proposed mixed-use building (new construction) at a 0.5-acre infill site in Washington, DC.  
The same site area and surface composition is run through four regulatory scenarios to show how the required retention volume changes based on (1) activity type and (2) AWDZ location.

A fifth scenario applies the MEP framework to a hypothetical PROW reconstruction along the project's street frontage.

---

### Site Data

| Surface Type | Symbol | Area (sq ft) | Runoff Coefficient |
|---|---|---|---|
| Impervious (rooftop, pavement, walkways, green roof membrane counted as impervious per DOEE) | I | 18,500 | RvI = 0.95 |
| Compacted (gravel staging/maintenance) | C | 1,000 | RvC = 0.25 |
| Natural/landscaped (uncompacted soil, lawn) | N | 2,280 | RvN = 0.00 |
| **Total site area (SDA)** | | **21,780 sq ft (0.5 ac)** | |

**Source for coefficients:** DOEE Guidebook, Equation 2.1, p. 10

---

### Step 1 — Compute Weighted Runoff Area

This value is common to all scenarios:

```
(RvI × I) + (RvC × C) + (RvN × N)
= (0.95 × 18,500) + (0.25 × 1,000) + (0.00 × 2,280)
= 17,575 + 250 + 0
= 17,825 sq ft (effective runoff-weighted area)
```

**Conversion factor:** 7.48 gal/cu ft ÷ 12 in/ft = **0.6233 gal per sq ft per inch of rainfall**

Therefore the per-inch volume factor = 17,825 × 0.6233 = **11,111 gal/inch**

---

### Step 2 — Apply SWRv by Scenario

**Equation 2.1 (DOEE Guidebook, p. 10):**
```
SWRv = P × [(RvI × I) + (RvC × C) + (RvN × N)] × 7.48/12
```

---

#### Scenario A — Major Land-Disturbing Activity, Non-AWDZ, MS4 Drainage
*(New construction, full site disturbance; drains to MS4)*

**Source: Table 2-2, p. 10 → P = 1.2 inches (90th percentile)**

```
SWRv = 1.2 × 17,825 × 0.6233
     = 1.2 × 11,111
     = 13,333 gallons
```

**On-site minimum (50% for MS4, Section 2.3, p. 11):**
```
On-site required  = 0.50 × 13,333 = 6,667 gallons
Off-site via SRCs = 13,333 − 6,667 = 6,667 gallons (6,667 SRCs to purchase)
```

**Storm control:** 2-year and 15-year peak flow detention also required (Section 2.6–2.7, pp. 20–21).

---

#### Scenario B — Major Land-Disturbing Activity, AWDZ, Publicly Financed
*(Same site but within the Anacostia Waterfront Development Zone)*

**SWRv: P = 1.2 inches** — same as Scenario A.

```
SWRv = 13,333 gallons  (identical to Scenario A)
```

**WQTv is additional — required here because AWDZ + publicly financed (Section 2.4, p. 14):**

**Equation 2.2 (DOEE Guidebook, p. 14), P = 1.7 inches (95th percentile):**
```
WQTv = [1.7 × 17,825 × 0.6233] − SWRv
     = [1.7 × 11,111] − 13,333
     = 18,888 − 13,333
     = 5,555 gallons additional
```

**Total volume to manage:**
```
SWRv + WQTv = 13,333 + 5,555 = 18,888 gallons
```

This represents the full 95th percentile (1.7-inch) storm retention for the site.

---

#### Scenario C — Major Substantial Improvement, Non-AWDZ, MS4
*(Renovation/addition to existing structure; cost ≥ 50% of market value)*

**Source: Table 2-2, p. 10 → P = 0.8 inches (80th percentile)**

```
SWRv = 0.8 × 17,825 × 0.6233
     = 0.8 × 11,111
     = 8,889 gallons
```

**On-site minimum (50% for MS4):**
```
On-site required  = 0.50 × 8,889 = 4,445 gallons
Off-site via SRCs = 4,445 gallons
```

**Storm control: NOT required** — substantial improvement projects are exempt from 2-yr and 15-yr detention (Section 2.12, pp. 25–27).

---

#### Scenario D — Major Substantial Improvement, AWDZ
*(Same renovation/addition but within AWDZ)*

**Source: Table 2-2, p. 10 → P = 1.0 inch (85th percentile)**

```
SWRv = 1.0 × 17,825 × 0.6233
     = 1.0 × 11,111
     = 11,111 gallons
```

**Note:** WQTv would apply only if the project is publicly financed. A privately financed substantial improvement in AWDZ requires only the 11,111-gallon SWRv.

---

### Step 3 — Scenarios Side-by-Side

| Scenario | Activity Type | Location | P (in) | SWRv (gal) | WQTv (gal) | Total Volume (gal) | On-Site Min (gal) | Off-Site SRC (gal) | Storm Detention? |
|---|---|---|---|---|---|---|---|---|---|
| **A** | Major Land-Disturbing | Non-AWDZ, MS4 | 1.2 | 13,333 | — | **13,333** | 6,667 | 6,667 | Yes (2-yr, 15-yr) |
| **B** | Major Land-Disturbing | AWDZ, public | 1.2 + 1.7 | 13,333 | 5,555 | **18,888** | 9,444 | 9,444 | Yes (2-yr, 15-yr) |
| **C** | Major Substantial Improvement | Non-AWDZ, MS4 | 0.8 | 8,889 | — | **8,889** | 4,445 | 4,445 | **No** |
| **D** | Major Substantial Improvement | AWDZ | 1.0 | 11,111 | — | **11,111** | 5,556 | 5,556 | **No** |

---

### Step 4 — Numerical Differences Between Scenarios

The same 0.5-acre site produces very different retention obligations depending on how the project is classified:

| Comparison | Volume Difference | Percent Difference |
|---|---|---|
| A vs. C (land-disturbing vs. substantial improvement, non-AWDZ) | 13,333 − 8,889 = **4,444 gal more** for A | **+50%** |
| D vs. C (substantial improvement: AWDZ vs. non-AWDZ) | 11,111 − 8,889 = **2,222 gal more** for AWDZ | **+25%** |
| B vs. A (AWDZ WQTv surcharge for publicly-financed land-disturbing) | 18,888 − 13,333 = **5,555 gal more** for AWDZ public | **+42%** |
| B vs. C (most stringent vs. least stringent) | 18,888 − 8,889 = **9,999 gal more** | **+112%** |

**Key takeaway:** A substantial improvement renovation in a non-AWDZ area requires less than half the total retention volume of a publicly-financed land-disturbing project in the AWDZ. Project classification and location are the two most consequential determinations in DC stormwater design.

---

## Scenario E — MEP Example: PROW Reconstruction

### Site Description

**Project:** Reconstruction of a 200-linear-foot street segment adjacent to the project site.  
DDOT jurisdiction. Existing conditions: 2 travel lanes, 2 parking lanes, 8-foot sidewalks each side.

| Surface Type | Symbol | Area (sq ft) |
|---|---|---|
| Existing impervious (pavement, concrete sidewalks) | I | 10,500 |
| Compacted base (unpaved utility access strip) | C | 800 |
| Tree box areas (existing, natural soil) | N | 700 |
| **Total SDA** | | **12,000 sq ft** |

---

### Full Compliance Target (if unconstrained)

```
Weighted area = (0.95 × 10,500) + (0.25 × 800) + (0.00 × 700)
             = 9,975 + 200 + 0
             = 10,175 sq ft

SWRv_target = 1.2 × 10,175 × 0.6233
            = 1.2 × 6,342
            = 7,611 gallons
```

PROW reconstruction cannot require full SWRv compliance because ROW constraints make it physically infeasible. **The MEP process applies.** *(DOEE Guidebook, Appendix B; DDOT GI Standards, Section 33.14, p. D-10)*

---

### MEP Evaluation — Identifying Feasible GI Locations

**Source: DDOT GI Standards, Sections 33.14.4 and 33.14.5, pp. D-11 to D-18**

#### Candidate 1 — Permeable Pavement in East Parking Lane
- Available: 200 LF × 8 ft wide = **1,600 sq ft**
- Utility conflicts: None identified below 36 inches in this lane
- Vehicle loading: Qualifies for porous asphalt or PICP (Section 33.14.4.1, p. D-11)
- Contributing area: 1,600 sq ft (1:1 — pavement drains to its own base)
- Meets 4:1 max contributing area ratio (Section 33.14.4.2, p. D-11) ✓
- **Feasibility: YES**

SWRv credit from permeable pavement:
```
= 1.2 × (0.95 × 1,600) × 0.6233
= 1.2 × 1,520 × 0.6233
= 1.2 × 947
= 1,137 gallons
```

Reservoir sizing check *(Section 33.14.4.3, p. D-12)*:
```
Required storage = 1,137 gal ÷ 7.48 = 152 cu ft
Stone reservoir at 40% void: depth = 152 / (1,600 × 0.40) = 0.24 ft ≈ 3 inches minimum
Design reservoir depth = 12 inches (structural minimum for PICP)
Drawdown = 24–48 hours (Section 33.14.4.4, p. D-13) ✓
```

---

#### Candidate 2 — Bioretention Curb Extensions (East Sidewalk)
- 4 extensions proposed; each: 8 ft deep × 20 ft long = **160 sq ft** each, total 640 sq ft
- Available ponding depth: 12 inches (sidewalk area, below 18-inch max per Section 33.14.5.4, p. D-17)
- Soil profile: 24 inches bioretention media (within 18–36 inch range, Section 33.14.5.2, p. D-16)
- Contributing area per cell target: ~1,000 sq ft of adjacent travel lane runoff
- Ratio check: 1,000 / 160 = 6.25:1 < 20:1 max *(Section 33.14.5.3, p. D-16)* ✓
- Total contributing area managed: 4 × 1,000 = **4,000 sq ft** of travel lane
- **Feasibility: YES** (utility clearances confirmed > 10 ft from nearest water main)

SWRv credit from bioretention:
```
= 1.2 × (0.95 × 4,000) × 0.6233
= 1.2 × 3,800 × 0.6233
= 1.2 × 2,369
= 2,842 gallons
```

Drawdown check: 72-hour max for 1.2-inch storm *(Section 33.14.5.5, p. D-18)*
```
Ponding volume = 1,600 sq ft × (12/12 ft) = 1,600 cu ft / 4 cells = 400 cu ft each
Required infiltration rate = 400 cu ft / 72 hrs = 5.6 cu ft/hr = 0.56 in/hr — achievable with loamy sand media ✓
```

---

#### Infeasible Areas — MEP Justification Required

| Location | Area (sq ft) | Reason Infeasible |
|---|---|---|
| West parking lane | 1,600 | 18-inch water main at 30-inch depth — insufficient clearance for reservoir base |
| West sidewalk (bioretention) | — | Gas main at 24 inches, ADA ramp locations preclude grading |
| Intersection approaches (N + S) | 2,700 | Bus stop infrastructure, sight-line requirements, and turning radii |
| Centerline travel lanes | 4,600 | Structural pavement requirements for bus route; no utility access conflicts resolved within budget |
| **Infeasible total** | **4,900 sq ft** | Documented in MEP justification per Appendix B |

---

### MEP Volume Summary

| GI Practice | Contributing Area (sq ft) | SWRv Credit (gal) |
|---|---|---|
| Permeable pavement — east parking | 1,600 | 1,137 |
| Bioretention curb extensions (×4) — east side | 4,000 | 2,842 |
| **Total achievable** | **5,600** | **3,979** |
| Full target SWRv | 10,175 (wtd) | 7,611 |
| **MEP achievement** | **55% of SDA managed** | **52% of target volume** |

**MEP Outcome:** The project retains **3,979 gallons** — 52% of the 1.2-inch target. The remaining 3,632 gallons is documented as physically infeasible with utility conflict justification per Appendix B. No SRC purchase is required for PROW projects under the MEP pathway.

---

## BMP Summary — What Goes in the Ground

| BMP | Location | Area (sq ft) | Volume Retained (gal) | DC Standards Reference |
|---|---|---|---|---|
| Porous asphalt / PICP parking lane | E. Parking Lane | 1,600 | 1,137 | DDOT GI Stds §33.14.4, p. D-11 |
| Bioretention curb extension #1 | E. Sidewalk, STA 0+20 | 160 | 711 | DDOT GI Stds §33.14.5, p. D-15 |
| Bioretention curb extension #2 | E. Sidewalk, STA 0+60 | 160 | 711 | DDOT GI Stds §33.14.5, p. D-15 |
| Bioretention curb extension #3 | E. Sidewalk, STA 0+120 | 160 | 711 | DDOT GI Stds §33.14.5, p. D-15 |
| Bioretention curb extension #4 | E. Sidewalk, STA 0+180 | 160 | 709 | DDOT GI Stds §33.14.5, p. D-15 |
| **Total** | | **2,240** | **3,979** | |

---

## How the Two Files Lead to Different Answers

If a designer relied only on `SWM_sizing_from_research.md` (the general knowledge file), they would:

1. **Undersize the retention volume** — the research file references "1.0–1.2 inches" as a national benchmark but does not specify that DC uses 0.8" for non-AWDZ substantial improvement vs. 1.0" for AWDZ substantial improvement vs. 1.2" for land-disturbing. A designer defaulting to 1.0" would oversize Scenario C (should be 0.8") and undersize Scenario D (correct at 1.0" AWDZ, but for the wrong reason).

2. **Miss the WQTv** — the research file explains the concept but does not specify the 1.7-inch P value or the publicly-financed AWDZ trigger. A design team that assumed the SWRv was the only volume metric would submit an incomplete plan for a publicly-financed AWDZ project.

3. **Apply wrong on-site percentages** — the research file describes the 50% MS4 minimum but does not specify that CSS areas have no floor. A CSS project designed to the 50% minimum would be over-constrained, unnecessarily expensive, and potentially infeasible in dense urban lots where CSS is common.

4. **Miss the PROW MEP submission milestones** — the research file describes MEP conceptually (iterative evaluation, physical feasibility) but does not identify the 30/65/90/100% design submission requirements that DDOT enforces on capital projects. A team submitting MEP documentation only at 100% design would face plan rejection.

| Calculation | Using Research File Only | Using Docs File (Correct) | Error |
|---|---|---|---|
| Scenario C SWRv (non-AWDZ substantial improvement) | ~11,111 gal (1.0" assumed) | **8,889 gal** | **+25% oversized** (conservative, but costly) |
| Scenario B total volume (AWDZ public land-disturbing) | 13,333 gal (SWRv only, WQTv missed) | **18,888 gal** | **−30% undersized** (non-compliant) |
| PROW MEP — first MEP submission deadline | 100% design assumed | **65% design** (DDOT requirement) | **Schedule non-conformance** |

---

## Summary

DC's stormwater sizing requirements are more granular and more stringent than general national guidance suggests. The binding numbers come from the DOEE Guidebook and DDOT GI Standards, not from EPA LID literature or other jurisdictions' standards. For any permit submission or capital project design in DC:

1. Determine regulatory trigger: land-disturbing, substantial improvement, or PROW.
2. Determine AWDZ status and whether the project is publicly financed.
3. Apply the correct P value from Table 2-2 (p. 10) to Equation 2.1 (p. 10).
4. Check WQTv applicability (Section 2.4, p. 14).
5. Check MS4 vs. CSS for on-site minimum percentage.
6. For PROW: invoke MEP process per Appendix B and DDOT GI Standards Section 33.14.

The design examples above — especially the 112% volume spread between the most and least stringent scenario on the identical 0.5-acre site — illustrate why early project classification is the most consequential step in DC SWM design.

---

*Calculations based on:*
- *DOEE Stormwater Management Guidebook, January 2020 — Equation 2.1 (p. 10), Equation 2.2 (p. 14), Table 2-1 (p. 8), Table 2-2 (p. 10), Sections 2.3–2.4 (pp. 10–14), Section 2.12 (pp. 25–27), Appendix B (pp. B-1 to B-17)*
- *DDOT Green Infrastructure Standards, Final 2014 — Sections 33.14.4 (pp. D-11 to D-14), 33.14.5 (pp. D-15 to D-19)*
