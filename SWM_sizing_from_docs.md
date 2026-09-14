# DC Stormwater Management Sizing Requirements
## Sourced from DOEE Guidebook (January 2020) and DDOT Green Infrastructure Standards (2014)

---

## 1. Regulatory Triggers — What Projects Are Regulated?

**Source: DOEE Stormwater Management Guidebook, Section 2.2, p. 9**

A project must comply with stormwater management (SWM) regulations if it qualifies as:

| Activity Type | Threshold |
|---|---|
| **Major Land-Disturbing Activity** | Any land disturbance ≥ 5,000 sq ft of soil disturbance |
| **Major Substantial Improvement Activity** | Any addition, alteration, or repair to an existing structure where cost ≥ 50% of market value, AND the footprint change or impervious area addition meets thresholds |
| **Public Right-of-Way (PROW) Reconstruction** | Reconstruction of existing PROW — uses MEP process (Appendix B) |

> "A regulated project site is a site for which a major land-disturbing activity or a major substantial improvement activity occurs." *(p. 9)*

---

## 2. Core Sizing Metric — Stormwater Retention Volume (SWRv)

**Source: DOEE Guidebook, Section 2.3 and Table 2-1 (p. 8), Equation 2.1 (p. 10)**

### Formula (Equation 2.1, p. 10)

```
SWRv = P × [(RvI × I) + (RvC × C) + (RvN × N)] × 7.48 / 12
```

**Where:**
- `P` = Rainfall depth (inches) — determined by activity type and AWDZ status (see Table 2-2)
- `RvI` = 0.95 — runoff coefficient for impervious surfaces and BMP surfaces
- `RvC` = 0.25 — runoff coefficient for compacted/semi-pervious surfaces
- `RvN` = 0.00 — runoff coefficient for natural/uncompacted pervious surfaces
- `I` = Area (sq ft) of impervious and BMP surfaces on the Stormwater Drainage Area (SDA)
- `C` = Area (sq ft) of compacted surfaces on the SDA
- `N` = Area (sq ft) of natural surfaces on the SDA
- `7.48 / 12` = conversion factor to gallons

**Result:** SWRv expressed in **gallons**.

---

## 3. Rainfall Design Depths (P Values)

**Source: DOEE Guidebook, Table 2-2, p. 10; Table 2-1, p. 8**

| Activity Type | Location | Rainfall Depth (P) | Storm Percentile |
|---|---|---|---|
| Major Land-Disturbing Activity | Non-AWDZ | **1.2 inches** | 90th percentile |
| Major Land-Disturbing Activity | AWDZ | **1.2 inches** | 90th percentile |
| Major Substantial Improvement Activity | Non-AWDZ | **0.8 inches** | 80th percentile |
| Major Substantial Improvement Activity | AWDZ | **1.0 inches** | 85th percentile |
| PROW Reconstruction (MEP) | Any | **1.2 inches** (to MEP) | 90th percentile target |

**AWDZ = Anacostia Waterfront Development Zone** — stricter requirements apply within this zone.

---

## 4. On-Site Retention Minimum

**Source: DOEE Guidebook, Section 2.3, pp. 10–12**

- **MS4 (Municipal Separate Storm Sewer System) drainage areas**: Minimum **50% of the SWRv** must be retained on-site.
- **CSS (Combined Sewer System) drainage areas**: No mandatory on-site percentage minimum; full SWRv may be met off-site via SRCs (Stormwater Retention Credits).
- Remaining SWRv beyond on-site minimum can be met through off-site SRC purchase.

> "For sites draining to the MS4, at least 50 percent of the SWRv must be achieved on the project site." *(p. 11)*

---

## 5. Additional Volume — Water Quality Treatment Volume (WQTv)

**Source: DOEE Guidebook, Section 2.4, p. 14; Equation 2.2, p. 14**

**Applies only to:** AWDZ sites that are publicly owned or publicly financed.

### Formula (Equation 2.2, p. 14)

```
WQTv = [P × ((RvI×I) + (RvC×C) + (RvN×N)) × 7.48 / 12] − SWRv
```

Where `P = 1.7 inches` (95th percentile storm).

**Interpretation:** WQTv is the additional volume needed to treat runoff from the 95th percentile (1.7-inch) storm above and beyond the already-retained SWRv. The combined SWRv + WQTv must treat the full 1.7-inch storm for qualifying AWDZ public sites.

---

## 6. Decision Flow Charts

**Source: DOEE Guidebook, pp. 16–19**

- **Figure 2.3 (p. 16):** Flowchart to determine which regulatory event type and SWRv depth applies to a project.
- **Figure 2.5 (p. 18):** Flowchart for determining the minimum Stormwater Drainage Area (SDA) requirements.
- **Figure 2.6 (p. 19):** Flowchart for retention and WQTv compliance sequencing.

---

## 7. Storm Control Requirements

**Source: DOEE Guidebook, Sections 2.6, 2.7, 2.8, pp. 20–22**

### 2-Year Storm Detention (Section 2.6, p. 20)
- Required for **major land-disturbing activity** projects.
- **Exempt:** Major substantial improvement activity and PROW reconstruction projects.
- Goal: Limit peak discharge to pre-development rates for the 2-year storm event.

### 15-Year Storm Detention (Section 2.7, p. 21)
- Required for **major land-disturbing activity** projects in certain downstream conditions.
- **Exempt:** Major substantial improvement activity and PROW reconstruction projects.

### Extreme Flood / 100-Year Storm (Section 2.8, p. 22)
Two triggering conditions:
1. Project site is within a Special Flood Hazard Area (SFHA).
2. Project would cause flooding to existing buildings.

---

## 8. Exemptions

**Source: DOEE Guidebook, Section 2.12, pp. 25–27**

| Exemption | Conditions |
|---|---|
| Major substantial improvement — 2-yr/15-yr detention | Fully exempt from peak flow detention controls |
| BMP installation or repair | Installing or repairing a BMP does not itself trigger regulation |
| Athletic fields | Grading of athletic fields exempt under certain conditions |
| Utility work | Underground utility installation/repair exempt |
| Affordable housing | May use Practicable Process (see Section 2.13) |

---

## 9. Practicable Process (Alternative Compliance Pathway)

**Source: DOEE Guidebook, Section 2.13, p. 29**

A modified compliance approach for:
- Affordable housing projects
- Trails and recreational paths
- Small structures within park settings

Projects may demonstrate retention to the "maximum extent practicable" rather than the full SWRv, with documentation showing infeasibility of full compliance.

---

## 10. Additional Requirements

**Source: DOEE Guidebook, Section 2.11, p. 25**

- **Hotspot areas** (facilities generating oil, grease, or other pollutants): additional treatment for TSS/pollutants required; 80% TSS removal standard for vehicular-access MS4 areas.
- **25-foot buffer**: Projects within 25 feet of regulated waterbodies have additional design constraints.

---

## 11. Stormwater Retention Credits (SRCs)

**Source: DOEE Guidebook, Chapter 7, pp. 370+ (and throughout Chapter 2)**

- Projects that cannot meet on-site retention may purchase **SRCs** from certified off-site retention facilities.
- 1 SRC = retention of 1 gallon of stormwater.
- SRC market is administered by DOEE.
- MS4 projects: off-site SRCs can satisfy the portion of SWRv beyond the 50% on-site minimum.

---

## 12. MEP — Maximum Extent Practicable Process for PROW

**Sources:**
- DOEE Guidebook, Chapter 2 references (pp. 7, 12) and **Appendix B (pp. B-1 to B-17)**
- DDOT Green Infrastructure Standards (2014), Sections 33.14.4.3, 33.14.4.4, 33.14.5, 33.14.5.5

### What Is MEP?

MEP is the compliance framework applied to **reconstruction of existing Public Right-of-Way (PROW)**. Because full on-site retention is often physically impossible in constrained ROW conditions, the MEP process requires designers to retain as much stormwater as physically and financially feasible.

> "The MEP process requires the designer to evaluate the physical constraints of the ROW and propose GI/LID practices to the maximum extent that site conditions allow." *(DDOT GI Standards, Section 33.14.4.4, p. D-13)*

### Target Volume Under MEP

The target is the **1.2-inch (90th percentile) retention volume** — the same as major land-disturbing activity — but achieved only **to the maximum extent practicable** given ROW constraints.

### MEP Design Submission Requirements

**Source: DDOT GI Standards, Section 2.3.11.3, p. D-8; Section 2.4.3.37, p. D-9**

| Milestone | Required Deliverables |
|---|---|
| **30% Design** | Preliminary site analysis; identification of candidate GI/LID locations |
| **65% Design** | SWM Plan; BMP design submittals; MEP justification documentation |
| **90% Design** | Updated construction plans; updated MEP calculations |
| **100% Design (Final)** | Final SWM Plan; final BMP designs with as-built readiness |

### Preferred GI/LID Practices in PROW (MEP Context)

**Source: DDOT GI Standards, Section 33.14, pp. D-10 to D-22**

#### Permeable Pavement (Section 33.14.4, pp. D-11 to D-14)

| Type | Notes |
|---|---|
| Porous asphalt | Preferred for travel lanes and parking |
| Pervious concrete | Sidewalks and plazas |
| Permeable unit pavers | Pedestrian areas |
| Permeable interlocking concrete pavers (PICP) | Flexible applications |

- Max contributing drainage area ratio: **4:1** (drainage area to permeable pavement area). *(Section 33.14.4.2, p. D-11)*
- Base/reservoir layer sized for **1.2-inch retention volume** to the maximum extent practicable. *(Section 33.14.4.3, p. D-12)*
- Drawdown time: **24–48 hours**. *(Section 33.14.4.4, p. D-13)*

#### Bioretention (Section 33.14.5, pp. D-15 to D-19)

Four facility types:
1. Bioretention basins
2. Curb extensions / bump-outs
3. Streetscape planters
4. Bioswales

Key sizing criteria:
- Soil profile depth: **18–36 inches** of bioretention media. *(Section 33.14.5.2, p. D-16)*
- Max contributing drainage area ratios:
  - **20:1** without underdrain
  - **33:1** with underdrain *(Section 33.14.5.3, p. D-16)*
- Max ponding depth: **18 inches** standard; **6 inches** for high-volume pedestrian areas. *(Section 33.14.5.4, p. D-17)*
- Drawdown time: **72 hours maximum** for the 1.2-inch storm. *(Section 33.14.5.5, p. D-18)*
- Sized to meet retention requirements **to the maximum extent practicable**. *(Section 33.14.5.5, p. D-18)*

### MEP Documentation in Appendix B

**Source: DOEE Guidebook, Appendix B (pp. B-1 to B-17), referenced in Chapter 2, pp. 7 and 12**

Appendix B of the DOEE Guidebook contains the full MEP process description including:
- Step-by-step evaluation framework for demonstrating MEP
- Required documentation for MEP justification
- Methodology for calculating maximum achievable retention in PROW

---

## 13. BMP Types Recognized for Compliance

**Source: DOEE Guidebook, throughout Chapter 2 and referenced chapters**

| BMP Category | Examples |
|---|---|
| Green Roofs | Extensive and intensive green roofs |
| Permeable Pavement | Porous asphalt, pervious concrete, PICP |
| Bioretention | Bioretention cells, rain gardens, curb extensions |
| Filtering Systems | Sand filters, media filters |
| Infiltration | Infiltration trenches, dry wells |
| Ponds | Wet ponds, dry extended detention |
| Wetlands | Constructed stormwater wetlands |
| Swales | Grass swales, bioswales |
| Storage/Cisterns | Rainwater harvesting, underground cisterns |
| Trees | Tree boxes, tree trenches (Silva Cells) |

---

## 14. Compliance Calculations

**Source: DOEE Guidebook, Appendix A, pp. A-1 to A-9**

Appendix A provides:
- Worked compliance calculation examples
- SDA tabulation methodology (how to define and bound the drainage area)
- BMP compliance data sheets
- Detention sizing calculation procedures

The SDA must be defined as the total area draining to each proposed BMP, including any off-site contributing area.

---

## Summary Table — SWM Requirements by Project Type

| Project Type | P (inches) | SWRv Required | WQTv | 2-yr Detention | 15-yr Detention | 100-yr Flood |
|---|---|---|---|---|---|---|
| Major Land-Disturbing (non-AWDZ) | 1.2 | Yes | No | Yes | Yes (if triggered) | If SFHA / building flood |
| Major Land-Disturbing (AWDZ, publicly financed) | 1.2 | Yes | Yes (add'l to 1.7") | Yes | Yes (if triggered) | If SFHA / building flood |
| Major Substantial Improvement (non-AWDZ) | 0.8 | Yes | No | **No** | **No** | If SFHA / building flood |
| Major Substantial Improvement (AWDZ) | 1.0 | Yes | Yes (add'l to 1.7") | **No** | **No** | If SFHA / building flood |
| PROW Reconstruction (MEP) | 1.2 (to MEP) | To MEP | No | **No** | **No** | If SFHA / building flood |

---

*Document sources:*
- *DOEE Stormwater Management Guidebook, January 2020*
- *DDOT Green Infrastructure Standards, Final 2014 (Supplement to DDOT Design and Engineering Manual)*
