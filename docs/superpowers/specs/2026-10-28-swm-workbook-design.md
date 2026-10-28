# SWM Workbook Redesign — Design Spec
**Date:** 2026-10-28
**Phase:** 1 — Workbook (webpage blocked until validation passes)
**Build approach:** Hybrid — Python (openpyxl) generates structure, formulas, dropdowns, parameter tables; user fills in project data

---

## Guiding Principle

Data enters once. Everything else derives from it. No re-entering the same number in two places. All constants (void ratios, Horton parameters, CNs, retention multipliers, tree credits, depression storage) live exclusively in the PARAMS sheet — never hardcoded elsewhere.

---

## Sheet Inventory

| Sheet | Role | User inputs |
|---|---|---|
| `PROJECT` | Project header | Yes — once at setup |
| `PARAMS` | All parameter lookups | Never — locked, set by Python |
| `SDA` | SDA land use table (tall/relational) | Yes — land cover areas, pre + post |
| `CDA` | CDA land use table (tall/relational) | Yes — land cover areas |
| `BMP` | BMP sizing with full SWMP-BMP Calc parameters | Yes — BMP dimensions only |
| `MEP_SUMMARY` | DDOT MEP Worksheet 90% Phase — exact layout | Steps 2/3 only (HSG, water table, hotspot) |
| `EISA_DIRECT` | Direct Determination (project-level, HSG B + C) | None |
| `EISA_TR55` | TR-55 comparison (project-level, HSG B + C) | None |
| `DOEE_SDA` | Mirrors DOEE Compliance Calc Sheet 1 | None |
| `DOEE_BMP_DATA` | Mirrors DOEE Compliance Calc Sheet 2 | None |
| `DOEE_DETENTION` | Mirrors DOEE Compliance Calc Sheet 3 | None |
| `DOEE_COMPLIANCE` | Mirrors DOEE Compliance Check Summary | None |

---

## Data Flow

```
PROJECT
  └─→ EISA_DIRECT / EISA_TR55 (storm depth, project name)

SDA (pre + post construction) ────────────────────────────────┐
  └─→ CDA (SDA_ID dropdown)                                    │
        └─→ BMP (CDA_ID + SDA_ID dropdowns)                   │
              └─→ Sv, Rv auto-calc from PARAMS                 │
                    ├─→ MEP_SUMMARY ←──────────────────────────┘
                    ├─→ EISA_DIRECT / EISA_TR55
                    ├─→ DOEE_SDA
                    ├─→ DOEE_BMP_DATA
                    ├─→ DOEE_DETENTION
                    └─→ DOEE_COMPLIANCE
```

---

## Sheet: PROJECT

User-entered project header fields. All other sheets reference this via named ranges.

| Field | Notes |
|---|---|
| Project Name | |
| Project Number | DDOT project number |
| MS4 / CSS | Dropdown |
| In AWDZ? | Yes/No |
| DOEE Plan Review No. | |
| Total LOD Area (SF) | Used as cross-check against SDA totals |
| 95th Percentile Storm Depth (in) | Default 1.7" for DC |
| Trigger Type | MLD (1.2") / MSI (0.8") / PROW (MEP) — affects SWRv rainfall depth |
| EISA Section 438 Applies? | Yes/No — federal project flag |

---

## Sheet: PARAMS

Python-locked lookup table. No user editing. Organized in named tables for VLOOKUP/INDEX-MATCH.

### Runoff Coefficients (for SWRv)
| Land Use | Rv |
|---|---|
| Impervious Vehicular | 0.95 |
| Impervious Non-Vehicular | 0.95 |
| Compacted (Open Space) | 0.25 |
| Natural (Woods) | 0.00 |
| BMP | 0.00 |

### TR-55 Curve Numbers
| Land Use | HSG A | HSG B | HSG C | HSG D |
|---|---|---|---|---|
| Impervious | 98 | 98 | 98 | 98 |
| BMP | 98 | 98 | 98 | 98 |
| Natural (Woods) | 25 | 55 | 70 | 77 |
| Compacted (Grass >75%) | 39 | 61 | 74 | 80 |

### Horton Infiltration Parameters (Direct Determination)
| Parameter | HSG B | HSG C |
|---|---|---|
| f_max (in/hr) | 5.0 | 3.0 |
| f_min (in/hr) | 0.3 | 0.1 |
| k (1/hr) | 2.0 | 3.5 |
| Δt (hr) | 0.5 | 0.5 |

### Depression Storage
| Surface | Depth (in) |
|---|---|
| Impervious (roof/pavement) | 0.1 |
| Pervious | 0.2 |
| BMP surface | 0.1 |

### BMP Design Parameters
| BMP Type | Sub-Type | Media Porosity n_media | Gravel Porosity n_gravel | Void Ratio n_reservoir | Retention Multiplier | Max Drawdown (days) |
|---|---|---|---|---|---|---|
| Permeable Pavement | Enhanced | — | — | 0.40 | 1.0 | 2 |
| Permeable Pavement | Underdrained Enhanced | — | — | 0.40 | 0.6 | 2 |
| Bioretention | Standard | 0.40 | 0.40 | — | 0.6 | 3 |
| Bioretention | Enhanced | 0.40 | 0.40 | — | 1.0 | 3 |
| Bioretention | Enhanced w/ Underdrain | 0.40 | 0.40 | — | 0.6 | 3 |
| Dry Swale | — | 0.40 | 0.40 | — | 0.6 | 3 |
| Wet Swale | — | — | — | — | 0.1 | — |

### Tree Credits (fixed Rv, no Sv)
| Code | Description | Rv per unit (CF) |
|---|---|---|
| T-1 Small | Planted small tree | 5 |
| T-1 Large | Planted large tree | 10 |
| T-2 Small | Preserved small tree | 10 |
| T-2 Large | Preserved large tree | 20 |
| T-2 Special | Preserved special tree | 30 |
| T-2 Heritage | Preserved heritage tree | 40 |

### Detention Storm Depths (DC, from NRCS TR-55)
| Storm | Depth (in) |
|---|---|
| 2-year | 3.14 |
| 15-year | 5.23 |
| 100-year | 8.34 |

### DOEE Detention CN Defaults
| Land Cover | CN |
|---|---|
| Natural | 70 |
| Compacted | 74 |
| Impervious | 98 |
| BMP | 98 |

---

## Sheet: SDA (Site Drainage Areas)

**Structure:** Tall/relational — one row per `SDA_ID × Land Use × HSG` combination, for both pre-construction and post-construction conditions.

### Columns

| Column | Type | Notes |
|---|---|---|
| SDA_ID | User entry | e.g. "SDA-1" |
| In PROW? | Yes/No dropdown | Drives rainfall depth: PROW → 0.0", otherwise from PROJECT trigger type |
| Land Use | Dropdown | Natural (Woods), Impervious Vehicular, Impervious Non-Vehicular, Compacted (Open Space), BMP |
| HSG | Dropdown | A, B, C, D — auto-locked to N/A for Impervious and BMP rows |
| Pre-Construction Within LOD (SF) | User entry | Existing condition |
| Pre-Construction Outside LOD (SF) | User entry | |
| Post-Construction Within LOD (SF) | User entry | Proposed condition |
| Post-Construction Outside LOD (SF) | User entry | |
| Rv Coefficient | Auto — VLOOKUP(Land Use, PARAMS) | |
| Rainfall Depth (in) | Auto | `IF(PROW="Yes", 0, PROJECT_Rainfall)` — per-SDA |
| Pre SWRv Within LOD (CF) | Auto | `Pre_Within × Rv × Rainfall / 12` |
| Pre SWRv Outside LOD (CF) | Auto | |
| Post SWRv Within LOD (CF) | Auto | `Post_Within × Rv × Rainfall / 12` |
| Post SWRv Outside LOD (CF) | Auto | |

Rainfall depth is per-SDA: PROW SDAs always use 0.0" (MEP applies, no numerical SWRv); non-PROW SDAs use the trigger type from PROJECT (1.2" MLD or 0.8" MSI).

### SDA Summary Block (below table, locked)

SUMIFS aggregation per SDA_ID:

| SDA_ID | Pre Imp Total | Pre Comp Total | Pre Nat Total | Pre BMP Total | Post Imp Total | Post Comp Total | Post Nat Total | Post BMP Total | Post SWRv Required (CF) |
|---|---|---|---|---|---|---|---|---|---|

Impervious total = Imp_Veh + Imp_NonVeh (within LOD). Used by MEP Summary and DOEE sheets.

### Error Prevention
- HSG locked to N/A when Land Use = Impervious or BMP (data validation)
- Duplicate SDA_ID × Land Use × HSG → red highlight
- Sum of all post-construction within LOD areas per SDA flagged if > PROJECT total LOD area

---

## Sheet: CDA (Contributing Drainage Areas)

Same tall/relational structure as SDA, plus `CDA_ID` and `SDA_ID`.

### Columns

| Column | Type | Notes |
|---|---|---|
| CDA_ID | User entry | e.g. "CDA-1A" |
| SDA_ID | Dropdown → SDA named range | Only accepts existing SDA_IDs |
| Land Use | Dropdown | Same 5 categories |
| HSG | Dropdown | Same A/B/C/D, N/A for Impervious/BMP |
| Within LOD (SF) | User entry | |
| Outside LOD (SF) | User entry | |
| Rv Coefficient | Auto — VLOOKUP(Land Use, PARAMS) | |
| CDA SWRv Within (CF) | Auto | |
| CDA SWRv Outside (CF) | Auto | |

### CDA Summary Block (below table, locked)

| CDA_ID | SDA_ID | Total CDA Area (SF) | Max BMP Credit (CF) |
|---|---|---|---|
| | | SUMIFS → | `Total × 1.7 / 12` |

Max BMP Credit (1.7" × CDA total area / 12) is the DOEE retention cap. BMP sheet references this directly.

### Error Prevention
- SDA_ID dropdown only accepts values present in SDA sheet — orphan CDAs flagged red
- Duplicate CDA_ID → red highlight
- CDA total within LOD > parent SDA total within LOD → yellow warning

---

## Sheet: BMP (DOEE BMP Sizing)

One row per BMP. Full SWMP-BMP Calc Spreadsheet parameters for all relevant BMP types. Columns gray/locked when not applicable to selected BMP type. All porosity and void ratio values auto-populate from PARAMS.

### Identification Columns

| Column | Type | Notes |
|---|---|---|
| BMP Name | User entry | |
| SDA_ID | Dropdown → SDA sheet | |
| CDA_ID | Dropdown → CDA sheet | Filtered to CDAs matching selected SDA_ID |
| BMP Type | Dropdown | Permeable Pavement, Bioretention, Dry Swale, Wet Swale, Planted Trees, Preserve Trees |
| BMP Sub-Type | Dropdown (conditional) | PP: Enhanced / Underdrained Enhanced; Bio: Standard / Enhanced / Enhanced w/ Underdrain; others: N/A |

### Permeable Pavement Inputs (gray if BMP Type ≠ Permeable Pavement)

| Column | Units | Notes |
|---|---|---|
| Surface Area Aₚ | SF | |
| Reservoir Depth dₚ | ft | |
| Sump Depth d_sump | ft | Underdrained Enhanced only; locked 0 otherwise |
| Ksat | ft/day | Enter 0 if lined |
| Time to Fill tᶠ | days | Auto default 0.083 (2 hr); user-overrideable |
| Void Ratio n_reservoir | — | **Auto from PARAMS: 0.40** |
| Sv | CF | Auto: `Aₚ × dₚ × n_reservoir` |
| Sump Sv | CF | Auto: `Aₚ × d_sump × n_reservoir` (Underdrained Enhanced only) |
| Drawdown tᵈ | days | Auto: `dₚ / Ksat` |
| Drawdown Check | — | Pass if ≤ 2 days; red cell if fail |

### Bioretention & Dry Swale Inputs (gray if BMP Type ∉ {Bioretention, Dry Swale})

Identical parameter set for both types — only retention multiplier differs.

| Column | Units | Notes |
|---|---|---|
| Top Area SA_top | SF | |
| Bottom Area SA_bot | SF | |
| Average Area SA_avg | SF | Auto: `(SA_top + SA_bot) / 2` |
| Media Depth d_media | ft | |
| Media Porosity n_media | — | **Auto from PARAMS: 0.40** |
| Gravel Depth d_gravel | ft | |
| Gravel Porosity n_gravel | — | **Auto from PARAMS: 0.40** |
| Sump Depth d_sump | ft | Enhanced w/ Underdrain only; locked 0 otherwise |
| Ponding Depth d_pond | ft | Range check: min 0.25 ft, max 1.5 ft — yellow if out of range |
| Ksat | ft/day | Flag orange if < 0.1 ft/day |
| Sv | CF | Auto: `SA_avg × (d_media×n_media + d_gravel×n_gravel + d_pond)` |
| Drawdown tᵈ | days | Auto: `(d_media + d_gravel) / Ksat` |
| Drawdown Check | — | Pass if ≤ 3 days; red if fail |
| Infiltration Capacity Sv_infil | CF | Auto: `SA_avg × Ksat × tᵈ` |
| Sv_infil ≥ Sv Check | — | Pass/Fail — red if Sv_infil < Sv |

### Wet Swale Inputs (gray if BMP Type ≠ Wet Swale)

| Column | Units | Notes |
|---|---|---|
| Permanent Pool Volume S_pool | CF | User enters from channel geometry |
| Extended Detention Volume ED_24hr | CF | User enters |
| Sv | CF | Auto: `S_pool + ED_24hr` |

### Tree Count Columns (gray unless BMP Type = Planted Trees or Preserve Trees)

| Column | Credit (CF) | Code |
|---|---|---|
| Planted Small (#) | 5 | T-1 Small |
| Planted Large (#) | 10 | T-1 Large |
| Preserve Small (#) | 10 | T-2 Small |
| Preserve Large (#) | 20 | T-2 Large |
| Preserve Special (#) | 30 | T-2 Special |
| Preserve Heritage (#) | 40 | T-2 Heritage |
| Tree Rv Total (CF) | Auto | Sum of count × credit from PARAMS |

### Auto-Calculated Output Columns (all locked)

| Column | Formula |
|---|---|
| Retention Multiplier | VLOOKUP(BMP_Type + Sub-Type, PARAMS) |
| Rv Uncapped (CF) | `(Sv × Retention_Multiplier) + Tree_Rv` |
| Max BMP Credit (CF) | VLOOKUP(CDA_ID, CDA Summary) → `CDA_Total × 1.7/12` |
| **Rv Applied (CF)** | `MIN(Rv_Uncapped, Max_BMP_Credit)` — red if capped |
| Capped? | Yes/No flag |

### SDA Compliance Summary (below BMP table, locked)

| SDA_ID | SWRv Required (CF) | Rv Provided (CF) | Surplus / Deficit (CF) | Status |
|---|---|---|---|---|
| | From SDA summary | SUMIFS(Rv_Applied, SDA_ID) | Auto | ✓ / ✗ |

---

## Sheet: MEP_SUMMARY

Visual carbon copy of DDOT MEP Worksheet 90% Phase tab — exact column layout, exact step labels, exact header format. Auto-populated from SDA and BMP sheets. User fills only Steps 2 and 3 manual fields (water table, bedrock, hotspot).

### Project Header (auto from PROJECT)
Project Name, Project No., MS4/CSS, AWDZ flag, DOEE Plan Review No., Disturbance Area, No. of Drainage Areas, Regulated Retention Volume, Volume Retained, Difference.

### Per-SDA Block (Python pre-generates one block per SDA)

**Step 1 — Drainage Area & Regulated Volumes** (all auto):

| Field | Formula |
|---|---|
| Drainage Area ID | = SDA_ID |
| Impervious within LOD (SF) | `SUMIFS(SDA, SDA_ID, LandUse∈{Imp_Veh, Imp_NonVeh, BMP}, Post_Within)` |
| Compacted within LOD (SF) | `SUMIFS(SDA, SDA_ID, LandUse=Compacted, Post_Within)` |
| Natural within LOD (SF) | `SUMIFS(SDA, SDA_ID, LandUse=Natural, Post_Within)` |
| Total within LOD (SF) | Auto-sum |
| Impervious / Compacted / Natural outside LOD (SF) | Same SUMIFS for Outside LOD |
| Total outside LOD (SF) | Auto-sum |
| SWRv — Within LOD (CF) | From SDA summary block |
| SWRv — Outside LOD (CF) | From SDA summary block |

Note: BMP area folds into Impervious in MEP format (no BMP land use column in DDOT MEP).

**Step 2 — Infiltration** (partial auto, partial manual):

| Field | Source |
|---|---|
| Hydrologic Soil Group | Auto: dominant HSG by area (SUMIFS → MAX) |
| Water Table OK? | **User entry** — Yes/No dropdown |
| Bedrock Elevation OK? | **User entry** — Yes/No dropdown |
| Infiltration Rate (in/hr) | **User entry** |

**Step 3 — Constraints** (manual):
- Hotspot Concern Found? — Yes/No dropdown

**Step 4 — Tree Credits** (auto from BMP sheet, SUMIFS by SDA_ID):

Note: DDOT MEP Worksheet uses combined preserved/planted credits (5/20/30–40 CF). The BMP sheet tracks planted and preserved separately per DOEE credits (5/10 planted, 10/20/30/40 preserved). MEP_SUMMARY displays DDOT credit values in the DDOT-format tree block; DOEE_COMPLIANCE uses DOEE credit values. Both pull counts from the same BMP sheet rows.

| Tree Type | DDOT MEP Credit | Count Source | Rv (CF) |
|---|---|---|---|
| Small Trees (preserved + planted) | 5 CF each | SUMIFS T-1 Small + T-2 Small by SDA_ID | Auto |
| Large Trees (preserved + planted) | 20 CF each | SUMIFS T-1 Large + T-2 Large by SDA_ID | Auto |
| Special Trees preserved | 30 CF each | SUMIFS T-2 Special by SDA_ID | Auto |
| Heritage Trees preserved | 40 CF each | SUMIFS T-2 Heritage by SDA_ID | Auto |

**Step 4 — BMP Placement** (auto from BMP + CDA sheets, pre-allocated rows per SDA block, hidden when blank):

| BMP Surface Area (SF) | BMP Type | CDA_ID | CDA Area Within LOD (SF) | CDA Area Outside LOD (SF) | BMP Rv (CF) |
|---|---|---|---|---|---|
| INDEX/MATCH nth BMP for this SDA | ← same | ← same | From CDA sheet | From CDA sheet | = Rv Applied |

**Cumulative deficit/surplus** row after each block:
`Σ Rv Provided − Σ SWRv Required` — green if ≥ 0, red if < 0.

---

## Sheet: EISA_DIRECT (Direct Determination)

Project-level EISA 438 calculation. HSG B and HSG C results shown side by side.

### Header (auto from PROJECT + SDA)
Project Name, 95th Percentile Storm Depth (default 1.7"), Total LOD Area (SF).

### Horton Parameters Block (auto from PARAMS, locked)

| Parameter | HSG B | HSG C |
|---|---|---|
| f_max (in/hr) | 5.0 | 3.0 |
| f_min (in/hr) | 0.3 | 0.1 |
| k (1/hr) | 2.0 | 3.5 |
| Integrated infiltration loss over 24 hr (in) | Auto (Σ f_t × Δt) | Auto |
| Depression storage — impervious (in) | 0.1 | 0.1 |
| Depression storage — pervious (in) | 0.2 | 0.2 |
| Impervious runoff depth (in) | `P − 0.1` | same |
| Pervious runoff depth (in) | `MAX(0, P − 0.2 − Infil_Loss)` | same |

### Pre-Construction Runoff Table (auto from SDA pre-construction totals)

Every land use × HSG combination present in the SDA sheet gets its own row. Runoff depth is computed per combination using the Direct Determination rules below.

**Runoff depth rules by land use and HSG:**

| Land Use | HSG | Runoff Depth | Rationale |
|---|---|---|---|
| Impervious Vehicular | any | `P − 0.1"` | No infiltration; depression storage only |
| Impervious Non-Vehicular | any | `P − 0.1"` | Same |
| BMP surface | any | `P − 0.1"` | Treated as impervious for runoff generation; BMP infiltration credited separately |
| Natural (Woods) | A | 0 | HSG A infiltration far exceeds any storm depth |
| Natural (Woods) | B | `MAX(0, P − 0.2 − Infil_Loss_B)` | Horton integral from PARAMS; typically 0 at 1.7" |
| Natural (Woods) | C | `MAX(0, P − 0.2 − Infil_Loss_C)` | Horton integral from PARAMS; typically 0 at 1.7" |
| Natural (Woods) | D | `MAX(0, P − 0.2 − Infil_Loss_D)` | ⚠ HSG D Horton params not in EPA guidance — flagged yellow; conservative default = `P − 0.2"` until user confirms |
| Compacted (Open Space) | A | 0 | |
| Compacted (Open Space) | B | `MAX(0, P − 0.2 − Infil_Loss_B)` | Same as Natural — compacted but still pervious |
| Compacted (Open Space) | C | `MAX(0, P − 0.2 − Infil_Loss_C)` | |
| Compacted (Open Space) | D | `MAX(0, P − 0.2 − Infil_Loss_D)` | ⚠ yellow flag, conservative default |

The Horton infiltration loss integrals (Infil_Loss_B, Infil_Loss_C) are pre-computed in the PARAMS block using Δt = 0.5 hr over 24 hr. HSG D uses a conservative default of P − 0.2" (full surface runoff after depression storage) until site-specific Horton parameters are confirmed.

| Surface | Area (SF) | Runoff — HSG B (in) | Runoff — HSG C (in) | Vol — HSG B (CF) | Vol — HSG C (CF) |
|---|---|---|---|---|---|
| Impervious Vehicular | SUMIFS pre | P−0.1 | P−0.1 | area×depth/12 | same |
| Impervious Non-Vehicular | SUMIFS pre | P−0.1 | P−0.1 | same | same |
| BMP | SUMIFS pre | P−0.1 | P−0.1 | same | same |
| Natural — HSG A | SUMIFS pre | 0 | 0 | 0 | 0 |
| Natural — HSG B | SUMIFS pre | per rules above | per rules above | auto | auto |
| Natural — HSG C | SUMIFS pre | per rules above | per rules above | auto | auto |
| Natural — HSG D | SUMIFS pre | ⚠ P−0.2 default | ⚠ P−0.2 default | auto | auto |
| Compacted — HSG A | SUMIFS pre | 0 | 0 | 0 | 0 |
| Compacted — HSG B | SUMIFS pre | per rules above | per rules above | auto | auto |
| Compacted — HSG C | SUMIFS pre | per rules above | per rules above | auto | auto |
| Compacted — HSG D | SUMIFS pre | ⚠ P−0.2 default | ⚠ P−0.2 default | auto | auto |
| **Pre-Development Runoff Volume (CF)** | | | | **Auto sum** | **Auto sum** |

### Post-Construction Runoff Table
Identical structure using SDA post-construction totals. All same runoff depth rules apply.

### Compliance Check Block

| | HSG B | HSG C |
|---|---|---|
| Pre-Development Runoff Volume (CF) | Auto | Auto |
| Proposed Condition Runoff Volume (CF) | Auto | Auto |
| Volume Infiltrated in BMPs (CF) | `SUMIFS(BMP Rv_Applied, all SDAs)` | same |
| **Net Runoff Volume (CF)** | `Proposed − BMP_Infil` | same |
| Net ≤ Pre-Development? | ✓ / ✗ — green/red | ✓ / ✗ |

---

## Sheet: EISA_TR55 (TR-55 Comparison)

Same structure as EISA_DIRECT, CN-based instead of Horton.

### CN Lookup Block (from PARAMS)

| Land Use | HSG A | HSG B | HSG C | HSG D |
|---|---|---|---|---|
| Impervious | 98 | 98 | 98 | 98 |
| BMP | 98 | 98 | 98 | 98 |
| Natural (Woods) | 25 | 55 | 70 | 77 |
| Compacted (Grass) | 39 | 61 | 74 | 80 |

### Composite CN Calculation

Every land use × HSG combination gets its own row, with individual Q computed from its CN. Two methods shown side by side per Rock Creek approach:

**Method A — Individual CN per row (check without composite CN):**

Each row computes its own Q using its specific CN from PARAMS:
```
S_i = 1000 / CN_i − 10
Ia_i = 0.2 × S_i
Q_i = IF(P > Ia_i, (P − Ia_i)² / (P − Ia_i + S_i), 0)    [inches]
Vol_i = Area_i × Q_i / 12    [CF]
```

| Land Use | HSG | CN | Area (SF) | Q (in) | Volume (CF) |
|---|---|---|---|---|---|
| Impervious Vehicular | A/B/C/D | 98 | SUMIFS | auto | auto |
| Impervious Non-Vehicular | A/B/C/D | 98 | SUMIFS | auto | auto |
| BMP | A/B/C/D | 98 | SUMIFS | auto | auto |
| Natural (Woods) | A | 25 | SUMIFS | auto | auto |
| Natural (Woods) | B | 55 | SUMIFS | auto | auto |
| Natural (Woods) | C | 70 | SUMIFS | auto | auto |
| Natural (Woods) | D | 77 | SUMIFS | auto | auto |
| Compacted (Open Space) | A | 39 | SUMIFS | auto | auto |
| Compacted (Open Space) | B | 61 | SUMIFS | auto | auto |
| Compacted (Open Space) | C | 74 | SUMIFS | auto | auto |
| Compacted (Open Space) | D | 80 | SUMIFS | auto | auto |
| **Total Runoff Volume (CF)** | | | | | **Auto sum** |

**Method B — Composite CN (optional cross-check, mirrors Rock Creek sheet 2):**

Excludes HSG A natural and HSG B natural from composite (produce negligible runoff) per EISA guidance note. Composite CN applied to remaining active area:
```
Active Area = Total LOD − HSG_A_Natural − HSG_B_Natural
Composite CN = Σ(Area_i × CN_i) / Active_Area
S = 1000 / CN − 10
Ia = 0.2 × S
Q = IF(P > Ia, (P − Ia)² / (P − Ia + S), 0)    [inches]
Runoff Volume = Q × Active_Area / 12    [CF]
```

Both methods shown; Method A (individual CN) is the primary result used in the compliance check. Method B shown for comparison and audit trail.

Same Pre/Post runoff volume tables and compliance check block as EISA_DIRECT.

### Side-by-Side Comparison Summary (bottom of EISA_TR55)

| Method | Pre-Dev Runoff (CF) | Proposed Runoff (CF) | BMP Volume (CF) | Net Runoff (CF) | Pass? |
|---|---|---|---|---|---|
| Direct Det — HSG B | links to EISA_DIRECT | | | | |
| Direct Det — HSG C | links to EISA_DIRECT | | | | |
| TR-55 — HSG B | | | | | |
| TR-55 — HSG C | | | | | |

---

## Sheet: DOEE_SDA (mirrors DOEE Compliance Calc Sheet 1)

One row per SDA, aggregated from SDA tall table via SUMIFS. Auto-populated, locked.

| Field | Source |
|---|---|
| SDA Number | SDA_ID |
| In PROW? | From PROJECT sheet |
| Pre-Construction: Natural / Compacted / Impervious / BMP (SF) | SUMIFS pre rows, within LOD |
| Post-Construction: Natural / Compacted / Impervious / BMP / Vehicular (SF) | SUMIFS post rows |
| SWRv Required (CF) | Post Imp×0.95 + Comp×0.25 combined × rainfall/12 |
| WQTv Required? | Flag if vehicular area > 0 |

---

## Sheet: DOEE_BMP_DATA (mirrors DOEE Compliance Calc Sheet 2)

One row per BMP, reformatted to DOEE column order. Auto-populated, locked.

| Field | Source |
|---|---|
| BMP ID | Auto-generated |
| SDA Number | From BMP sheet |
| BMP Number | Auto sequential per SDA |
| BMP Name | From BMP sheet |
| BMP Group / Sub-Type | From BMP sheet |
| CDA Land Cover (Natural/Compacted/Impervious/BMP/Vehicular SF) | SUMIFS from CDA sheet |
| Storage Volume Sv (CF) | From BMP sheet |
| Rv Applied (CF) | From BMP sheet |

---

## Sheet: DOEE_DETENTION (mirrors DOEE Compliance Calc Sheet 3)

CN-based detention check for 2-yr and 15-yr storms. CNs from PARAMS. Pre/post composite CN per SDA from SDA land cover totals.

| Field | Source |
|---|---|
| Pre CN (composite) | Weighted avg: SDA pre-construction areas × PARAMS CN |
| Post CN (composite) | Weighted avg: SDA post-construction areas × PARAMS CN |
| BMP area in post CN | Folded into Impervious (CN=98) |
| 2-yr / 15-yr rainfall depth | From PARAMS (3.14" / 5.23") |
| Pre/Post runoff depths | TR-55 formula |
| Detention Required? | Flag if post runoff > pre runoff |

---

## Sheet: DOEE_COMPLIANCE (mirrors DOEE Compliance Check Summary)

Auto-populated summary, locked.

| Field | Source |
|---|---|
| SWRv Required per SDA | From DOEE_SDA |
| Rv Provided per SDA | SUMIFS(BMP Rv_Applied, SDA_ID) |
| % Met | Auto |
| Pass/Fail per SDA | Green ✓ / Red ✗ |
| Detention Required per SDA | From DOEE_DETENTION |
| Site totals | Auto-sum |

---

## Validation Plan

Phase 1 validation gates — must pass before any webpage work:

1. **Rock Creek Park** — enter data from `SW_Required_Provided_DOEE_EISA438_RockCreekPark.xlsx` into the new workbook. EISA_DIRECT and EISA_TR55 must reproduce the hand-calc values on the Rock Creek sheets (predevelopment 16,901 CF, proposed 27,159 CF, net 8,988 CF under TR-55).

2. **Penn Ave** — enter data from `SW_Required_Provided_DOEE_EISA438_PennAve.xlsx`. Verify SDA SWRv, BMP Rv, and MEP Summary totals match.

3. **DOEE sample comps** — verify BMP Sv and Rv outputs against the worked examples in the DOEE Stormwater Management Guidebook (bioretention, permeable pavement, dry swale) and the SWMP-BMP Calc Spreadsheet.

4. **EISA Atlanta scenario** — enter Scenario #7 Atlanta data manually. EISA_DIRECT must produce ~1.17" runoff (HSG B and C). EISA_TR55 must produce ~0.73" (HSG B) and ~0.97" (HSG C).

Validation is considered passed when all four checks produce outputs within rounding tolerance of the reference values.

---

## Python Script Structure

Single script `generate_workbook.py` at project root:

```
generate_workbook.py
  ├── build_params_sheet()       # writes all lookup tables, locks sheet
  ├── build_project_sheet()      # header fields, named ranges
  ├── build_sda_sheet()          # table structure, data validation, SUMIFS summary block
  ├── build_cda_sheet()          # same, plus SDA_ID dropdown from SDA named range
  ├── build_bmp_sheet()          # full parameter columns, conditional gray-out, all Sv/Rv formulas
  ├── build_mep_summary()        # pre-generates N SDA blocks, INDEX/MATCH BMP rows
  ├── build_eisa_direct()        # Horton calc, pre/post tables, compliance check
  ├── build_eisa_tr55()          # CN calc, composite CN, comparison summary
  ├── build_doee_sda()           # aggregation from SDA table
  ├── build_doee_bmp_data()      # reformat from BMP table
  ├── build_doee_detention()     # CN-based detention
  └── build_doee_compliance()    # summary pass/fail
```

Output: `SW_Required_Provided_DOEE_EISA438.xlsx` (overwrites existing file after validation).

---

## Units

All area inputs and outputs in **square feet (SF)**. No acres used in any user-facing cell. Internal conversions (e.g., SF to CF via divide by 12) are in locked formula cells only.
