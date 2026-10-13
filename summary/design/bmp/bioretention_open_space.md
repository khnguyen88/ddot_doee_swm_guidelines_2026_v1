# Bioretention — Open Space / Traditional (B-1)

**Sources:**
- `docs/2014-0421-DDOT Green Infrastructure Standards.pdf` — Section 33.14.5
- `docs/DOEE Stormwater Management Guidebook January 2020.pdf` — Section 3.6 (B-1)

---

## Overview

Traditional bioretention (DOEE B-1) and DDOT's "Bioretention Basin in Open Area" are moderate- to large-scale bioretention cells with sloped sides, typically planted with shrubs, groundcovers, and sometimes trees. They can be online or offline and are sited in open areas of the public ROW (medians, parkways, open space).

---

## Geometry and Dimensions

| Parameter | Requirement | Source |
|-----------|-------------|--------|
| Ponding depth — high-volume pedestrian/residential | Max 6 in | DDOT 33.14.5.4 |
| Ponding depth — absolute maximum | 18 in | DDOT 33.14.5.4 / DOEE 3.6.4 |
| Ponding depth — recommended | 6–12 in | DOEE 3.6.4 |
| Minimum ponding depth | 3 in (averaged over BMP surface) | DOEE 3.6.4 |
| Freeboard (online, from overflow structure to overtop) | Min 3 in | DDOT 33.14.5.5 |
| Side slopes — standard | 3H:1V or flatter | DOEE 3.6.4 |
| Side slopes — vertical wall option | Drop curb or precast wall; max 12 in vertical drop without barrier | DOEE 3.6.4 |
| Filter media depth — standard design | Min 18 in (not including mulch) | DOEE 3.6.4 |
| Filter media depth — enhanced design | Min 24 in | DOEE 3.6.4 |
| Filter media depth — maximum | 6.5 ft | DOEE 3.6.4 |
| Filter media depth — with trees | Min 24 in, 30 in preferred | DDOT 33.14.5.2 |
| Max ponding area : filter media area | Ponding area top may not exceed 2× filter media area (SA_bottom) | DOEE 3.6.4 |
| Max depth to seasonal high water table | 2 ft min below BMP bottom | DDOT 33.14.5.7 / DOEE 3.6.1 |
| Drawdown time | Max 72 hr for 1.2-in retention volume | DDOT 33.14.5.5 / DOEE 3.6 |
| Max CDA — Traditional bioretention (B-1) | 2.5 acres (up to 100% impervious) | DOEE 3.6.1 |

---

## Soil Profile

| Layer | Specification |
|-------|--------------|
| Mulch (top) | 3 in triple-shredded hardwood mulch (max 3 in) |
| Filter media | 18–36 in bioretention soil: 80–90% sand, 10–20% fines (max 10% clay), 3–5% organic; 2–6 in/hr hydraulic conductivity |
| Choker layer | 2–4 in of No. 8 or No. 89 washed stone above underdrain stone |
| Underdrain stone | ASTM D448 No. 57 or smaller; 2 in above and 2 in below underdrain; max total depth 12 in |
| Optional infiltration sump | No. 57 stone; must drain within 72 hr; Ksat of native soil must exceed 0.1 ft/day |

**Filter media grain size:** per DOEE Table 3-18 (see `summary/chapters/doee_guidebook/ch03_bmp_specifications.md` lines 2818–2827).

---

## CDA Limits

| Configuration | Max CDA : BMP Surface Area |
|---------------|---------------------------|
| Without subsurface drainage | 20:1 |
| With subsurface drainage (underdrain) | 33:1 |

---

## Liner Requirements

| Condition | Liner Location |
|-----------|---------------|
| Within 10 ft of structure/building | Liner on structure side |
| Within 5 ft of roadway face of curb | Liner on road side |
| Hot spots (DOEE-defined) | All sides; underdrain required |
| Fill soil locations | Geotechnical investigation required; liner if directed |

---

## Safety and Edge Conditions

| Condition | Requirement |
|-----------|-------------|
| Vertical drop at sidewalk, high-volume ped | 18-in railing above sidewalk; ADA-compliant spacing |
| Vertical drop at sidewalk, low-volume ped | Min 4-in high × 6-in wide curb |
| Vertical drop — parking step-out side | Min 4-in curb or railing |
| Sloped side adjacent sidewalk | Flat (≤ 8%) buffer, min 6-in wide, contrasting material |
| Sloped side, depth > 3 ft | Flat (≤ 8%) buffer, min 24-in wide |
| Adjacent to shared-use path (bike) | Flat (≤ 6:1) 24-in buffer; or max 3:1 slope with max 5-ft depth/12-in drop; else 42-in guard |
| Sloped sides, total depth > 5 ft | 36-in fence enclosing entire facility |
| Vertical drop > 30 in | 42-in railing per IBC 1013 |
| Road side (no curb) | 24-in graded shoulder; max 3:1 side slope; max 5-ft drop |
| Parking step-out zone | 12–36 in from face of curb (optimal 24 in); min 18 in in high-traffic areas |
| Pedestrian crossings | 1 paved 6-ft crossing per tree spacing (max 35 ft) in high-traffic; every other tree (max 70 ft) in low-traffic |

---

## Underdrain and Drainage

| Parameter | Requirement |
|-----------|-------------|
| Pipe type | 4- or 6-in perforated Sched. 40 PVC (HDPE ok for small BMPs) |
| Perforations | 3–4 rows of 3/8-in at 6-in o.c. |
| Underdrain spacing | Max 20 ft between pipes or edge of BMP |
| Clean-outs | Min 1 per basin; shown on plans |
| Observation wells | Min 1; 4–6-in PVC; perforated in gravel layer only; extend to top of ponding |
| Connection | To catch basin, manhole, or direct storm sewer; backflow preventer if to CSS |
| Drawdown time | Max 72 hr for 1.2-in volume over CDA |

---

## Pretreatment

| Type | Pretreatment Required |
|------|-----------------------|
| Open area basin (B-1) | Stone-filled forebay, stone diaphragm, or grass filter strip |
| Online | Overflow structure sized for 15-yr storm; min 3-in freeboard |

---

## Storage Volume Equation

```
Sv = SA_bottom × [(d_media × η_media) + (d_gravel × η_gravel)] + (SA_average × d_ponding)

where:
  η_media = 0.25 (effective porosity of filter media)
  η_gravel = 0.40 (effective porosity of gravel layer)
  SA_average = (SA_bottom + SA_top) / 2
  d_ponding = max ponding depth (ft); cannot exceed 18 in (1.5 ft)
```

---

## Utility Clearances (DDOT 33.14.6) — same as all LID facilities

| Utility Type | Horizontal | Vertical |
|-------------|-----------|----------|
| Communications/power (conduit) | None | None |
| Communications/power (no conduit) | 2 ft min | 6 in min |
| Gas | 12 in min from underdrains | 4 ft top-of-gas to road surface; 3 ft in ditches |
| Water/sewer main | 3 ft beyond sewer (liner) | 12 in min; liner if < 5 ft vertical |
| Street light | None | None |
| Manholes | Not in bioretention | — |
| Fire hydrant (sidewalk) | 3 ft min | — |
| Fire hydrant (street side) | 4 ft × 20 ft | — |

---

## Key Cross-References

- DOEE Guidebook 3.6 — Full bioretention specifications, Tables 3-18 to 3-21
- DDOT GI Standards 33.14.5 — DDOT-specific overlay requirements
- DDOT Standard Drawings 621.20–621.25 — Bioretention layout, basin cross sections
- DDOT Standard Drawings 621.50–621.52 — Overflow riser, underdrain pipe details
