# SWDB Template for PROW Information (SGS Import)

**Source:** `docs/doee_spreadsheet_calculators/SWDB Template for PROW Information_SWMP July 2025 - final locked.xlsx`
**Version:** July 2025 (final, sheet-protected)
**Reference:** DOEE Stormwater Management Guidebook (January 2020), Chapter 3; 21 DCMR §508.9 (PROW MEP); DOEE Surface and Groundwater System (SGS) at doee.dc.gov/sgs

---

## Overview

This is the data import template for entering Public Right-of-Way (PROW) stormwater drainage area and BMP information into DOEE's **Surface and Groundwater System (SGS)** — the online permitting and tracking database. It collects the same land cover and BMP data as the General Retention Compliance Calculator but in a format structured for bulk import into DOEE's system. The file is sheet-protected; only designated input cells are unlocked. Submitted alongside the SWMP package for PROW reconstruction projects.

---

## Tabs

| Sheet | Contents |
|---|---|
| **Instructions** | 3-step import process, field definitions for all columns |
| **Drainage Areas** | Per-SDA land cover input (post-project + pre-project) — human-entry format |
| **Drainage Areas (Import)** | Same data in flat import format for SGS upload |
| **BMPs** | Per-BMP data entry — CDA, storage volume, coordinates — human-entry format |
| **BMPs (Import)** | Same data in flat import format for SGS upload |
| **Watersheds** | Dropdown lookup: Anacostia / Potomac / Rock Creek sub-watersheds |
| **BMP Types** | Full BMP group and sub-type list (more granular than the Compliance Calculator) |
| **Saved Values** | Internal dropdown sources |
| **Proprietary Practice** | List of ~60 DOEE-approved proprietary stormwater devices |

---

## 3-Step Import Process

### Step 1 — Complete the Drainage Areas Tab

One row per drainage area. Fields:

| Field | Units | Notes |
|---|---|---|
| Drainage Area Number | Integer | |
| **Post-Project Land Cover** | | |
| — Natural | SF | Undisturbed forest, meadow, pasture |
| — Compacted | SF | Lawn, managed turf, planting beds |
| — Impervious | SF | Roof, pavement, sidewalk, deck — excludes BMP surface |
| — BMP | SF | Green infrastructure surface area |
| — Vehicular Access Area | SF | Subset of impervious (triggers WQTv requirement) |
| **Pre-Project Land Cover** | SF | Same four cover types for existing conditions |
| Is Drainage Area in AWDZ? | Yes/No | Only fill if project is partially AWDZ |
| Is Drainage Area in CSS? | Yes/No | Leave blank if entire project drains to CSS; fill if split MS4/CSS |
| Major Drainage Area | Select | Only if project drains to more than one major watershed |
| Minor Drainage Area | Select | Only if project drains to more than one sub-watershed |

### Step 2 — Complete the BMPs Tab

One row per BMP. Fields:

| Field | Units | Notes |
|---|---|---|
| BMP ID Number | Auto | |
| Drainage Area Number | Integer | Must match a row in Drainage Areas tab |
| BMP Number | Integer | Sequential within each drainage area, starting at 1 |
| X Coordinate (State Plane) | meters | Maryland State Plane — provide OR lat/long, not both |
| Y Coordinate (State Plane) | meters | |
| Latitude | decimal degrees | Alternative to State Plane |
| Longitude | decimal degrees | |
| BMP Name | Text | Optional identifier — stored in SGS for reference |
| BMP Group | Select | See BMP Types table below |
| BMP Type | Select | Sub-type within group |
| **Post-Project CDA Land Cover** | SF | Natural / Compacted / Impervious / BMP / Vehicular |
| **Pre-Project CDA Land Cover** | SF | Same fields for existing conditions |
| BMP Storage Volume (Sv) | CF | Calculated per Guidebook Chapter 3 / SWMP-BMP Calc spreadsheet |
| Disconnection Receiving Area | SF | For Impervious Surface Disconnection BMPs only |
| Enhanced practice with underdrain? | Yes/No | Per Chapter 3 design type |
| Infiltration Sump Storage Volume | CF | Only if underdrain = Yes |
| Name of Proprietary Practice | Text | Proprietary practices only — select from approved list |
| Describe Proprietary Practice | Text | Proprietary practices only |
| Number of Trees | Integer | Tree planting/preservation BMPs only |

### Step 3 — Import Data to the SGS

1. Go to doee.dc.gov/sgs and log in
2. Click **SWM, ESC, GAR & FPM**
3. Click **Sites and Plans**
4. Find the SWMP on the list and click the eye icon
5. Click **Import PROW table data**

After import, data can be edited directly in the SGS without re-importing.

---

## BMP Types (Full SGS Sub-type List)

More granular than the General Retention Compliance Calculator's BMP list:

| Group | Sub-types in SGS |
|---|---|
| Green Roof | Extensive green roof; Intensive green roof |
| Rainwater Harvesting | Rainwater harvesting |
| Impervious Surface Disconnection | Simple disconnection A/B soils; C/D soils; conservation area; amended soils |
| Permeable Pavement | Porous asphalt / Pervious concrete / Permeable pavers — each in Standard or Enhanced |
| Bioretention | Traditional (Standard/Enhanced); Streetscape Enhanced; Engineered tree pits Enhanced; Residential rain gardens Enhanced |
| Filtering System | Non-structural sand filter; Three-chamber underground; Surface sand filter; Perimeter sand filter |
| Infiltration | Infiltration trench; Infiltration basin |
| Open Channel | Grass channel; Grass channel — amended soils; Dry swale; Wet swale |
| Ponds | Micropool ED pond; Wet pond; Wet ED pond |
| Wetlands | Shallow wetland; ED shallow wetland |
| Storage | Underground vault; Dry pond; Rooftop storage; Stone storage under permeable pavement |
| Proprietary Practice | See approved list (~60 devices) |
| Tree Planting and Preservation | Planting > 40 ft spread; Planting < 40 ft spread; Preservation > 40 ft; Preservation < 40 ft |

---

## Approved Proprietary Practices (selected)

DOEE maintains a list of ~60 approved proprietary devices including: StormFilter, Stormceptor, Silva Cells, Filterra Tree Box, Jellyfish Stormfilter, Contech CDS, Vortechs, Downstream Defender, Oil/Grit Separator, Infiltration Cistern, OldCastle PerkFilter, Modular Wetland System, and others. Full list is in the **Proprietary Practice** tab.

---

## Key Notes

- This template is PROW-specific. Private/parcel projects use the General Retention Compliance Calculator which has its own SGS import pathway (the SWDB tab workflow).
- The SGS coordinates should be in Maryland State Plane (meters) — not NAD83 lat/long degrees-minutes-seconds. Decimal degrees lat/long is an acceptable alternative.
- The "Is Drainage Area in CSS?" field is only needed for projects that span both MS4 and CSS drainage areas (split projects). If the entire project drains to CSS or entirely to MS4, leave blank — the site-level designation from the SWMP controls.
- The import tab format (Drainage Areas (Import) and BMPs (Import)) matches the SGS's expected column order exactly. Do not rearrange columns.
- The Proprietary Practice list in the SGS may differ slightly from the tab — confirm with DOEE if a device is not on the list before design is finalized.
