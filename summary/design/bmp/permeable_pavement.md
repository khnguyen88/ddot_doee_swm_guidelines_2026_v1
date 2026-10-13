# Permeable Pavement — Design Guidance Summary (All Types)

**Sources:**
- `docs/2014-0421-DDOT Green Infrastructure Standards.pdf` — Section 33.14.4
- `docs/DOEE Stormwater Management Guidebook January 2020.pdf` — Section 3.5

---

## Overview and Allowable Uses

| Type | Alley | Low-Vol. Road | Sidewalk | Covered Soil (Trees) | Trail |
|------|-------|---------------|----------|----------------------|-------|
| Porous Asphalt (PA) | ● | ● | | | ● |
| Pervious Concrete (PC) | ● | ● | ● | ● | ● |
| Permeable Interlocking Unit Pavers (PP) | ● | ● | ● | | ● |
| Other unit pavers (spaced) | | | | ● | |
| Porous Rubber | | | ● | ● | ● |
| Porous Bound Aggregate | | | ● | | ● |
| Plastic Grid Pavers | ● | | | | ● |

- **NOT permitted** on collectors, arterials, or freeways without DDOT approval.
- DDOT IPMA approval required for all roadway/alley permeable pavement installations.
- **No permeable pavement at hot spots** (DOEE Appendix Q).

---

## Design Configurations

| Configuration | Underdrain | Infiltration Sump | Retention Credit |
|---------------|-----------|-------------------|-----------------|
| Standard Design | Yes | No | 5.0 cu ft per 100 SF of practice |
| Enhanced w/ Underdrain | Yes | Yes | 5.0 cu ft/100 SF + full Svsump |
| Enhanced without Underdrain | No | Yes (full reservoir) | 100% of Sv |

---

## Key Feasibility Limits

| Parameter | Limit | Source |
|-----------|-------|--------|
| Surface slope (pavement) | Max 5% | DOEE 3.5.1 |
| Bottom/reservoir slope | Max 2% (prefer flat) | DOEE 3.5.4 / DDOT 33.14.4 |
| Min depth to seasonal high water table | 2 ft below bottom of reservoir | DDOT 33.14.4.6 / DOEE 3.5.1 |
| Setback from structures/property lines | Min 10 ft; impermeable liner if < 10 ft on adjacent side | DOEE 3.5.1 |
| Liner adjacent to structure < 10 ft away | Required on that side | DDOT 33.14.4.3 / DOEE 3.5.1 |
| Liner at interface with traditional pavement | Required | DDOT 33.14.4.3 |
| Liner for hot spots / utility protection | Required | DDOT 33.14.4.3 |
| Max contributing drainage area : pavement area | 4:1 (DDOT); 5:1 (DOEE, 2:1 recommended) | DDOT 33.14.4.2 / DOEE 3.5.1 |
| CDA imperviousness | ≥ 90% impervious recommended | DDOT 33.14.4.2 |
| Drawdown time | 36–48 hr (max 48 hr) | DOEE 3.5.4 / DDOT 33.14.4.4 |

---

## Layer Specifications

### Wearing Surface (Pavement)

| Material | Void Content | Typical Thickness |
|----------|-------------|-------------------|
| Pervious Concrete (PC) | 15–20% | 4–8 in |
| Porous Asphalt (PA) | 15–20% | 3–7 in (traffic-dependent) |
| Permeable Pavers (PP) | Varies by product | Per manufacturer |

### Reservoir / Base Layer

| Layer | Material | Minimum Depth | Notes |
|-------|----------|---------------|-------|
| Bedding layer (PA, PC) | No. 57 washed stone (ASTM D448) | 3–4 in | Free of fines (< 2% passing No. 200) |
| Bedding layer (PP) | Per manufacturer | Per manufacturer | |
| Reservoir layer (PA) | No. 2 stone | Per hydraulic/structural design | Preferred for structural stability |
| Reservoir layer (PC) | No. 57 or No. 2 stone | Per design | May omit for pedestrian-only |
| Reservoir layer (PP) | Per manufacturer | Per design | |
| Reservoir — pedestrian/trail/CSV | Open-graded stone | Min 4 in; min 6 in above tree soil | Less if above structural soil |
| Filter/choker layer (optional) | No. 8 stone | 2–4 in | Separates reservoir from subgrade |

**Reservoir stone:** ASTM D448 No. 57 (1/2–1-1/2 in) or No. 2 (3/4–3 in). Washed clean, free of fines (< 2% passing No. 200 sieve). Effective porosity η = 0.40.

### Underdrain

| Parameter | Specification |
|-----------|--------------|
| Pipe | 4–6 in perforated Sched. 40 PVC (corrugated HDPE for small load-bearing only) |
| Perforations | 3–4 rows of 3/8-in holes at 6-in o.c. |
| Encasement | No. 57 stone; min 2-in cover above pipe; max 2-in stone below pipe |
| Spacing | Max 20 ft between pipes; max 20 ft from edge |
| Longitudinal runs | Single underdrain along full length for narrow applications |
| Outlet / flow control | Flow-reduction orifice (min 1-in diameter) in downstream MH |
| Clean-outs | Max 100-ft spacing; storm drain structures within 100 ft count as clean-outs |
| Pipe slope — lined bottom | Min 2% |
| Pipe slope — unlined, above frost line | Min 0.5% |
| Pipe slope — unlined, below frost line | < 0.5% allowed |

---

## Geotextile and Liners

| Application | Requirement |
|-------------|------------|
| Sides of reservoir (all designs) | Geotextile — AASHTO M-288 Class 2; permeability ≥ 10× subgrade soil |
| Bottom of reservoir (optional) | Geotextile may be used but can become a clogging plane; discouraged by some practitioners |
| Liner — adjacent to structure within 10 ft | Impermeable PVC geomembrane on that side |
| Liner — interface with traditional pavement | Impermeable membrane required |
| Liner — hot spot or utility protection | Impermeable membrane on affected side(s) |
| Liner — contaminated soils | Full liner (sides and bottom); enhanced design not allowed |
| Liner seam overlap | Min 6 in |

---

## Check Dams (Sloped Installations — DDOT 33.14.4.4)

| Option | Bottom Slope | Notes |
|--------|-------------|-------|
| Continuous bottom slope | ≤ 2% | Preferred on gentle grades |
| Terraced invert | ≤ 2% between steps; step height 6–12 in typical | Check dams can be PVC, acrylic, concrete, or waterproof membrane |
| Check dam spacing | Per 2-yr, 24-hr storm sucharge limit | Transverse underdrain may be needed at each dam |

---

## Hydraulic Sizing

```
Reservoir Layer Minimum Depth (Equation 3.2):
  dp = [(P × Rv × CDA / Ap) – (Ksat × tf)] / η_r

  dp    = minimum reservoir depth (ft)
  P     = design rainfall (ft) for SWRv or target storm
  Rv    = 0.95 (CDA runoff coefficient)
  CDA   = total contributing drainage area (ft²)
  Ap    = permeable pavement surface area (ft²)
  Ksat  = saturated hydraulic conductivity of subgrade (ft/day)
  tf    = time to fill reservoir (assume 0.083 day = 2 hr)
  η_r   = 0.40 (effective porosity, No. 57 stone)

Total Storage Volume (Equation 3.4):
  Sv = Ap × [(dp × η_r) + (Ksat × tf)]

Drawdown Time (Equation 3.3):
  td = (dp × η_r) / Ksat   [for no-underdrain or sump designs]
  td must not exceed 48 hr (max drawdown for permeable pavement)
```

---

## Observation Wells

- Required for all permeable pavement installations
- 4–6-in diameter perforated PVC pipe (AASHTO M-252); lockable cap flush with surface
- Perforations in reservoir layer only
- Tie into T/Y connections in underdrain if present

---

## DDOT-Specific Requirements (Section 33.14.4)

| Item | Requirement |
|------|-------------|
| Pavement design method — pervious concrete | AASHTO rigid pavement design |
| Pavement design method — porous asphalt | AASHTO flexible pavement design |
| Pavement design method — permeable unit pavers | AASHTO flexible; ICPI layer coefficients |
| Subgrade bearing capacity test | ASTM D4429-09a (CBR) |
| Edge restraints | Required for all permeable unit pavers; optional for PA/PC as needed |
| Soft soils (low CBR, infiltration planned) | Geo-grid preferred over excavate/recompact |
| Alley reconstruction | Use DDOT-approved standard drawings |
| DDOT IPMA approval | Required for all PROW permeable pavement |

---

## Utility Clearances at Permeable Pavement (DDOT 33.14.6)

| Utility | Horizontal Clearance | Vertical Clearance | Notes |
|---------|---------------------|--------------------|-------|
| Communications/power (conduit) | None | None | May run through permeable pavement |
| Communications/power (no conduit) | 2 ft min | 6 in min | |
| Gas | 12 in from underdrains | 4 ft top-of-gas to road surface; 3 ft in ditches | Shield required if < 6 in |
| Water/sewer main | 3 ft horizontal (liner) | 12 in min; liner if < 5 ft vertical | Per DC Water GI Utility Protection Guidelines |
| Utility poles | Allowed in permeable pavement | — | Not in bioretention |
| Manholes | Allowed in permeable pavement with concrete collar | — | Top of collar above ponding depth |
| Street light conduit/pole | Allowed | — | |
| Fire hydrant (sidewalk side) | 3 ft min around hydrant | — | |
| Fire hydrant (street side) | 4 ft × 20 ft access zone | — | May be permeable pavement |

---

## Prohibited Operations on Permeable Pavement

- Sanding / cinders for winter traction
- Resealing or resurfacing
- Power washing
- Storage of snow piles containing sand
- Storage of mulch or soil materials
- Construction staging without protection

---

## Key Cross-References

- DOEE Guidebook Section 3.5.4 — Full design criteria and equations
- DOEE Guidebook Table 3-11 — Surface material specifications
- DOEE Guidebook Table 3-12 — Sub-layer material specs
- DDOT GI Standards 33.14.4 — DDOT-specific requirements and limitations
- DDOT Standard Drawings 621.01–621.06 — Permeable pavement plan views
- DDOT Standard Drawings 621.10–621.12 — Elevations and edge restraints
- DDOT Standard Drawings 621.60–621.64 — Check dam details (for sloped installations)
- DOEE Appendix Q — Stormwater hotspot land uses (prohibited locations)
