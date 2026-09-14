# SWMP-BMP Calc Spreadsheet

**Source:** `docs/doee_spreadsheet_calculators/2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm`
**Version:** 8 (November 25, 2020)
**Reference:** DOEE Stormwater Management Guidebook (January 2020), Chapter 3 (BMP Specifications)

---

## Overview

Calculates the Storage Volume (Sv) and Retention Volume (Rv) for individual Best Management Practices (BMPs). Each tab corresponds to a BMP type from Guidebook Chapter 3. The Sv output from each tab is entered into the **General Retention Compliance Calculator** (Sheet 2 — BMP Data). Each sheet is protected against accidental formula edits; only white user-entry cells are unlocked.

---

## Tabs and Corresponding Guidebook Sections

| Sheet | Guidebook Section | BMP Type |
|---|---|---|
| 3.2 Green Roof | §3.2 | Extensive/intensive vegetated roof |
| 3.3 Rainwater Harvesting | §3.3 | Refers to RWH Calculator (separate file) |
| 3.4 Impervious Surface Discon. | §3.4 | Disconnection to pervious/conservation/amended soils |
| 3.5 Permeable Pavement | §3.5 | Standard, Enhanced, and Underdrained Enhanced |
| 3.6 Bioretention | §3.6 | Standard, Enhanced, Enhanced w/ Underdrain |
| 3.8 Infiltration | §3.8 | Trench and Basin types |
| 3.9 O-1 Grass Channel | §3.9 | Regular and amended-soil variants |
| 3.9 O-2 Dry Swale | §3.9 | Same structure as bioretention |
| 3.9 O-3 Wet Swale | §3.9 | Uses pool volume and 24-hr ED volume |
| 3.10, 3.11 SW Ponds + Wetlands | §§3.10–3.11 | C-1/C-2/C-3 ponds; W-1/W-2 wetlands |
| 3.14 Tree Planting Preservation | §3.14 | Fixed credits per tree size/type |

---

## Sheet-by-Sheet Inputs and Formulas

### 3.2 — Green Roof

| Variable | Units | Description |
|---|---|---|
| SA | ft² | Total green roof area |
| d | in | Media/growing layer depth — minimum 3 in |
| DL | in | Drainage layer depth (enter 0 if combined with media) |
| n (media) | — | Porosity of growing media (typically 0.35–0.45) |
| Irrigation | — | Select: Irrigated or Non-irrigated (from dropdown) |

**Formulas:**
```
Sv = SA × (d × n_media + DL × n_drainage) / 12      [ft³]
Rv (non-irrigated) = Sv
Rv (irrigated) = Sv × 0.5       [50% credit for irrigation demand offset]
```

---

### 3.3 — Rainwater Harvesting

No calculation on this tab. References the separate Rainwater Harvesting Storage Volume Calculator. The Sv from that file is manually entered into the Compliance Calculator.

---

### 3.4 — Impervious Surface Disconnection

Up to 5 disconnection areas per sheet; totals summed at bottom.

| Column | Description |
|---|---|
| Type | D-1 (A/B soils), D-1 (C/D soils), D-2 (conservation area), D-3 (amended soils) |
| SAp | ft² — pervious receiving area |
| Rv | ft³ — auto-calculated based on disconnection type |

**Rv credits by type (from Guidebook Table 3.4-1):**
- D-1 A/B soils: Full credit for impervious area draining to A/B pervious area
- D-1 C/D soils: Partial credit; limited by soil infiltration rate
- D-2 Conservation: Full credit for impervious draining to undisturbed forest/meadow
- D-3 Amended soils: Credit for impervious draining to amended compacted area

---

### 3.5 — Permeable Pavement

| Variable | Units | Description |
|---|---|---|
| Design Type | — | Standard, Enhanced, or Underdrained Enhanced (dropdown) |
| Ap | ft² | Total permeable pavement surface area |
| dp | ft | Reservoir layer depth (includes sump depth for underdrained) |
| dsump | ft | Sump depth below underdrain — for Underdrained Enhanced only |
| n (reservoir) | — | Porosity of stone reservoir (typically 0.40) |
| Ksat | ft/day | Field-verified saturated hydraulic conductivity; enter 0 with liner |
| tf | days | Time to fill — default 0.083 days (2 hours) |

**Formulas:**
```
Sv = Ap × dp × n_reservoir                           [ft³]
Sump Storage Volume = Ap × dsump × n_reservoir        [ft³, Underdrained Enhanced only]
td (drawdown) = dp / Ksat                             [days — must be ≤ 48 hr for Enhanced]
```

**Drawdown check:** Enhanced and Underdrained Enhanced volumes must drain within 48 hours. Standard has no drawdown requirement (relies on surface runoff).

**Rv by type:**
- Enhanced w/o Underdrain: Rv = Sv (retention multiplier 1.0)
- Underdrained Enhanced: Rv = Sv × 0.6 (partial retention credit; 40% bypasses to underdrain)
- Standard: Rv = Sv × 0 (no retention credit; only WQTv treatment)

---

### 3.6 — Bioretention

| Variable | Units | Description |
|---|---|---|
| Type | — | Standard, Enhanced, Enhanced w/ Underdrain (dropdown) |
| SAtop | ft² | Top surface area of bioretention cell |
| SAbottom | ft² | Bottom surface area |
| SAaverage | ft² | Auto-calculated: (SAtop + SAbottom) / 2 |
| dmedia | ft | Depth of engineered growing media |
| n_media | — | Media porosity — assumed 0.40 |
| dgravel | ft | Depth of gravel/stone layer |
| dsump | ft | Depth of stone below underdrain — Enhanced w/ Underdrain only |
| dponding | ft | Ponding depth — min 0.25 ft, max 1.5 ft |
| Ksat | ft/day | Must exceed 0.1 ft/day |

**Formulas:**
```
Sv = SAaverage × (dmedia × n_media + dgravel × n_gravel + dponding)    [ft³]
td = (dmedia + dgravel) / Ksat                                           [days — must be ≤ 3 days]
Svinfiltrate = SAaverage × Ksat × td                                     [ft³ — must be ≥ Sv]
```

**Rv by type:**
- Enhanced (no underdrain): Rv = Sv (multiplier 1.0)
- Enhanced w/ Underdrain: Rv = Sv × 0.6
- Standard: Rv = Sv × 0.6

---

### 3.8 — Infiltration

| Variable | Units | Description |
|---|---|---|
| SA | ft² | Surface area of infiltration basin or trench footprint |
| n (fill) | — | Porosity of stone fill |
| d | ft | Depth of infiltration trench or basin |
| Ksat | ft/day | Must exceed 0.1 ft/day |
| tf | days | Fill time — default 0.083 days (2 hours) |
| td | days | Drawdown time — typically 3 days |
| Type | — | Trench or Basin (dropdown) |

**Formulas:**
```
dmax = Ksat × (td - tf)                                [ft — max allowable depth]
Sv = SA × d × n                                        [ft³]
Rv = Sv                                                [full retention; multiplier 1.0]
```

Depth must be ≤ dmax. Calculator flags "Within range" or flags an error if depth exceeds limit.

---

### 3.9 O-1 — Grass Channel

Up to 5 grass channels per sheet. Input is the Sv (calculated externally from channel geometry). Amended soils flag changes the Rv multiplier:

- Not amended: Rv = Sv × 0.1
- Amended soils: Rv = Sv × 0.3

---

### 3.9 O-2 — Dry Swale

Same variables as Bioretention (SAtop, SAbottom, SAaverage, dmedia, dgravel, dponding). Same formula for Sv. Rv = Sv × 0.6.

---

### 3.9 O-3 — Wet Swale

Up to 5 wet swales; per unit inputs:

| Variable | Description |
|---|---|
| Spool | ft³ — permanent pool storage volume |
| ED24hr | ft³ — extended detention volume for 24-hr draw-down |

```
Sv = Spool + ED24hr
Rv = Sv × 0.1      [low retention credit; primarily WQTv function]
```

---

### 3.10, 3.11 — Stormwater Ponds and Wetlands

User enters Sv for each pond or wetland type directly (C-1, C-2, C-3 ponds; W-1, W-2 wetlands). Rv = Sv × 0.1 for all types. Primarily WQTv devices with minimal retention credit.

---

### 3.14 — Tree Planting and Preservation

Fixed Rv credits per tree; no Sv field.

| Type Code | Description | Rv per unit (ft³) |
|---|---|---|
| T-1 Small | New small tree planting | 5 |
| T-1 Large | New large tree planting | 10 |
| T-2 Small | Small tree preservation | 10 |
| T-2 Large | Large tree preservation | 20 |
| T-2 Special | Special tree preservation | 30 |
| T-2 Heritage | Heritage tree preservation | 40 |

Enter count (n) for each type; Rv = n × Rvtype.

---

## Key Notes

- Sv from this spreadsheet feeds directly into the **Storage Volume Provided by BMP** field in the General Retention Compliance Calculator (Sheet 2 — BMP Data).
- The Rv output here is informational only — the Compliance Calculator re-derives Rv from Sv × the BMP retention multiplier from its internal BMP Types table.
- Rainwater Harvesting Sv must come from the separate Rainwater Harvesting Calculator — Sheet 3.3 is a placeholder only.
- Drawdown constraints (48-hr for permeable pavement, 72-hr for bioretention/infiltration) are DOEE-enforceable design requirements (Guidebook §§3.5, 3.6, 3.8).
