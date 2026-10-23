# BMP Design Guidance Index

**Generated:** 2026-10-13  
**Sources:** DDOT Green Infrastructure Standards (2014), DOEE Stormwater Management Guidebook (January 2020)

Each file captures design parameters relevant to DC public right-of-way projects:
minimum offsets, allowable freeboard, maximum side slopes, materials/dimensions,
utility clearances (horizontal and vertical), and safety/barrier requirements.

---

## Files

| BMP Type | File | Key Sections Covered |
|----------|------|---------------------|
| Bioswale | [bioswale.md](bioswale.md) | Geometry, soil profile, check dams, utility clearances, safety slopes |
| Bioretention — Streetscape/Structured | [bioretention_streetscape.md](bioretention_streetscape.md) | Curb extension, planter, engineered tree box, vertical wall requirements |
| Bioretention — Open Space/Traditional | [bioretention_open_space.md](bioretention_open_space.md) | Sloped sides, basins, sizing equations, CDA limits |
| Engineered Tree Planter Box (B-3) | [tree_planter_box.md](tree_planter_box.md) | Soil volume requirements, covered soil, ponding credit, grates |
| Tree Planting / Tree Space | [tree_planting_tree_space.md](tree_planting_tree_space.md) | Min volumes, structural soil systems, conveyance, planting guidance |
| Permeable Pavement (all types) | [permeable_pavement.md](permeable_pavement.md) | PA/PC/PP, reservoir design, underdrain, check dams, utility clearances |
| Open Channel Systems (Linear) | [linear_channels.md](linear_channels.md) | O-1 Grass Channel, O-2 Dry Swale, O-3 Wet Swale; geometry, check dams, sizing equations, filter media |

---

## Design Storm Reference

**Sources:**
- *DOEE Stormwater Management Guidebook*, January 2020 — `docs/DOEE Stormwater Management Guidebook January 2020.pdf`
  - §2.3 Stormwater Retention Volume (SWRv) — retention storm percentile definitions
  - §3.6.2 Bioretention Conveyance Criteria — overflow structure sizing requirement
  - Appendix I, Tables I.2–I.3 — worked example using DC-specific rainfall depths from NOAA Atlas 14
- *NOAA Atlas 14, Volume 2* — primary source for DC area IDF rainfall depths (referenced by DOEE Appendix I; values subject to change if Atlas is updated)
- *DDOT Green Infrastructure Standards* (2014) — §33.14.5.5 — drawdown and overflow sizing for PROW bioretention

### Retention Storm (SWRv) — what the BMP must capture and hold

| Regulated Activity | Rainfall Depth | Duration | Percentile |
|-------------------|---------------|----------|-----------|
| Major Land-Disturbing (MLD) | **1.2 in** | 24-hour | 90th percentile |
| Major Substantial Improvement (MSI) | **0.8 in** | 24-hour | 80th percentile |
| PROW / MEP projects | **1.2 in** | 24-hour | 90th percentile |

- Maximum drawdown time: **72 hours** (bioretention, bioswale, open channels) — DDOT §33.14.5.5 / DOEE §3.6
- Maximum drawdown time: **48 hours** (permeable pavement) — DOEE §3.5.4 / DDOT §33.14.4.4
- Retention credit capped at **1.7 in** — runoff from storms beyond 1.7 in cannot count toward SWRv — DOEE §2.3

### Detention / Overflow Design Storms — what the BMP must pass safely

Storm depths are NRCS Type II, 24-hour events for Washington DC per NOAA Atlas 14, Volume 2.

| Storm Event | Rainfall Depth | Used For |
|-------------|---------------|---------|
| **2-year, 24-hr** | **3.14 in** | Channel protection detention; predevelopment baseline for TR-55 |
| **15-year, 24-hr** | **5.23 in** | Flood control detention; BMP overflow structure sizing |
| **100-year, 24-hr** | Per NOAA Atlas 14 | Extreme flood requirement (sites expanding SFHA or discharging to surface) |

- Overflow structures for online bioretention/bioswale must convey the **15-year storm (5.23 in)** — DOEE §3.6.2 / DDOT §33.14.5.5
- Minimum freeboard from overflow structure top to BMP overtopping elevation: **3 in** — DDOT §33.14.5.5
- Outlet velocities at 2-year and 15-year events must be non-erosive: generally **< 6 ft/s** — DOEE §3.6.2
- 15-year detention is **not required** for MSI projects or existing PROW project areas — DOEE §2.7

---

## Utility Clearance Comprehensive Reference

For the full cross-agency utility clearance guide (DC Water GIUPG + DDOT §33.14.6, all utilities and all BMP types), see:
- [`../utility_clearances.md`](../utility_clearances.md) — Storm sewer, water, gas, communications, manholes, hydrants, trees, alleys, underdrain connections

---

## Common Utility Clearance Quick Reference

**Sources:**
- *DC Water Green Infrastructure Utility Protection Guidelines*, July 2013, Version 1.0 — `DC_Water_Green_Infrastructure_Utility_Protection_Guidelines_2013.pdf` (PDF pp. 1–9)
- *DDOT Green Infrastructure Standards* (2014) — `2014-0421-DDOT Green Infrastructure Standards.pdf`, §33.14.6 (pp. D-21–D-23)

**Note on sewer proximity:** The "3 ft" for sewer mains is not a minimum clearance — it is a liner trigger threshold (DC Water GIUPG Dwg 2 of 8, PDF p. 3) and liner extent (DDOT §33.14.6.3, p. D-22). A BMP may be sited closer than 3 ft to a sewer if the required impermeable membrane and underdrain system is installed.

| Utility | BMP Type | Liner Trigger / Proximity Rule | Min Vertical | Membrane Extent / Scope | Source |
|---------|----------|-------------------------------|-------------|------------------------|--------|
| Comm./power — in concrete conduit | Any LID | — | None | — | DDOT §33.14.6.1 (p. D-21) |
| Comm./power — not in conduit | Any LID | — | 6 in | 2 ft horizontal min clearance | DDOT §33.14.6.1 (p. D-21) |
| Gas | Any LID | Shield/sleeve if < 6 in from facility | 4 ft to road; 3 ft in ditches | 12 in min from underdrains | DDOT §33.14.6.2 (p. D-22) |
| Sewer main | Bioretention/Bioswale | Liner if: vertical < 5 ft OR sewer within 3 ft horizontal of facility | 12 in | Full perimeter impermeable membrane + underdrain | DC Water GIUPG Dwg 2 of 8 (PDF p. 3) |
| Sewer lateral (parallel) | Bioretention/Bioswale | Same as sewer main | 12 in | Full perimeter membrane + underdrain; or line sewer manhole-to-manhole | DC Water GIUPG Dwg 2 of 8 (PDF p. 3) |
| Sewer lateral (crossing facility) | Bioretention/Bioswale | Always required when crossing | — | Membrane 3 ft each side of pipe for full facility width | DC Water GIUPG Dwg 2 of 8 (PDF p. 3) |
| Water main | Bioretention/Bioswale | No liner trigger | 12 in | No membrane required | DC Water GIUPG Dwg 3 of 8 (PDF p. 4) |
| Water lateral | Bioretention/Bioswale | No liner trigger | No minimum (18 in soil cover req'd) | Shall not be exposed; may run through LID facility | DC Water GIUPG Dwg 3 of 8 (PDF p. 4); DDOT §33.14.6.3 (p. D-22) |
| Sewer main or lateral | Permeable Pavement | Liner if vertical < 5 ft | 12 in | Extend membrane 3 ft beyond utility on each side | DC Water GIUPG Dwg 5 of 8 (PDF p. 6) |
| Water main | Permeable Pavement | No liner trigger | 12 in | No membrane required | DC Water GIUPG Dwg 6 of 8 (PDF p. 7) |
| Water service lateral | Permeable Pavement | No liner trigger | 4 ft min vertical from water main | Treated as water main if > 2 in diameter | DC Water GIUPG Dwg 6 of 8 (PDF p. 7) |
| Tree box (precast concrete) | Water/Sewer utility | 5 ft min (face of box to outer utility edge) | — | Exception if utility > 15 ft deep or DC Water approval | DC Water GIUPG Dwg 1 of 8 (PDF p. 2) |
| Tree (trunk, breast height) | Water/Sewer main or lateral | 3 ft min | — | Measured from outer edge of tree at breast height to outer edge of utility | DC Water GIUPG Dwg 1 of 8 (PDF p. 2) |
| Street light pole/conduit | Any LID | — | None | None | DDOT §33.14.6.4 (p. D-22) |
| Utility pole | Bioretention | Not allowed unless additional stabilization provided | — | | DDOT §33.14.6.1 (p. D-21) |
| Utility pole | Permeable Pavement | Allowed | — | — | DDOT §33.14.6.1 (p. D-21) |
| Manholes | Bioretention | Not allowed inside | — | | DDOT §33.14.6.1 (p. D-21) |
| Manholes | Permeable Pavement | Allowed — concrete collar req'd | — | Top of collar above ponding depth | DDOT §33.14.6.1 (p. D-21) |
| Fire hydrant (sidewalk side) | Any LID | 3 ft clear around hydrant | — | | DDOT §33.14.6.5 (p. D-23) |
| Fire hydrant (street side) | Any LID | 4 ft × 20 ft access area | — | May be permeable pavement | DDOT §33.14.6.5 (p. D-23) |
| Any DC Water utility | Structural/proprietary device | 5 ft min horizontal | — | Includes precast boxes, cast-in-place walls, soil framing systems | DC Water GIUPG General Rule (PDF p. 1) |

---

## Source Chapter Files

Extracted chapter markdown files are in:
- `summary/chapters/doee_guidebook/` — DOEE Guidebook chapters
- `summary/chapters/ddot_gi/` — DDOT GI Standards supplements
