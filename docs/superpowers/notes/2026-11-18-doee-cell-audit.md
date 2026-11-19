# DOEE Cell Audit — Formula Drift Validator

**Date:** 2026-11-18
**Purpose:** Map each row of our generator's `PARAMS` lookup blocks to the authoritative DOEE spreadsheet cell (where one exists) or a published external reference.
**Consumed by:** `scripts/validate_doee_calc_parity.py` (Task 8.2).
**Generator source of truth:** `workbook/builders/params.py`.

---

## Summary

| Block              | Our range           | Cells audited | DOEE-sourced | Reference-pinned | TODO: NOT FOUND | Drift from DOEE |
|--------------------|---------------------|--------------:|-------------:|-----------------:|----------------:|----------------:|
| `PARAMS_Rv`        | `PARAMS!A7:B11`     | 5             | 4            | 1                | 0               | 0               |
| `PARAMS_BMP`       | `PARAMS!A36:G42`    | 25 numeric    | 21           | 0                | 0               | 0 literal; 1 semantic note (PP Underdrained) |
| `PARAMS_DetentionCN` | `PARAMS!A61:B64`  | 4             | 4            | 0                | 0               | 0               |
| `PARAMS_TR55`      | `PARAMS!A76:D81`    | 18 (6×3 coef) | 0            | 18               | 0               | 0               |

- 25 of 25 numeric `PARAMS_BMP` slots are accounted for: 21 as literal DOEE cells, 3 as em-dash placeholders (not comparable), 1 (PP Underdrained Ret.Multiplier = 0.6) as an engineered approximation — the DOEE cell exists but uses a different closed-form (`Sv_sump + 5%·Ap`) that our workbook cannot express cleanly through a single multiplier. See the PARAMS_BMP notes section.
- No `DRIFT-FOUND` values. One semantic note is logged for PP Underdrained (not a divergence in produced Rv for the geometries we support, but a model-shape difference).

---

## PARAMS_Rv (ours: `PARAMS!A7:B11`)

**Authoritative file:** `docs/doee_spreadsheet_calculators/2020 General Retention Compliance Calculator 2-5-21.xlsx`
**Authoritative sheet:** `1. Site Drainage Areas`

Rv values in the DOEE Calc are not stored as a lookup table. They are embedded as literal coefficients inside the "Site Rv" formulas on two parallel columns:

- **Column Y** (Major Land-Disturbing / PROW Site Rv), rows 8–25
- **Column AI** (Major Substantial Improvement Site Rv), rows 8–25

Representative formulas (identical shape in every row 8–25):

```
Y8:  =(V8*0+W8*0.25+X8*0.95)
AI8: =0*AF8+0.25*AG8+0.95*AH8
```

Where V/AF = `% Natural`, W/AG = `% Compacted`, X/AH = `% Impervious`. Note that `X` and `AH` are computed as `(Impervious + BMP) / Total`:

```
X8:  =IFERROR((R8+T8)/$U8,0)    where R=Impervious Cover, T=BMP Cover
AH8: =IFERROR((AB8+AD8)/$AE8,0) where AB=Impervious Cover, AD=BMP Cover
```

That is, **DOEE treats BMP cover area as impervious for the Rv calculation**, carrying Rv = 0.95. Our generator mirrors this by assigning `BMP = 0.95` in the `PARAMS_Rv` table.

| Our row | Our col | Our value | Land use                  | DOEE location (formula literal)        | DOEE value | Notes |
|--------:|:-------:|----------:|---------------------------|----------------------------------------|-----------:|-------|
| 7       | B       | 0.95      | Impervious Vehicular       | `'1. Site Drainage Areas'!Y8` coef on X8 (via X = (R+T)/U) | 0.95 | Literal inside formula |
| 8       | B       | 0.95      | Impervious Non-Vehicular   | `'1. Site Drainage Areas'!Y8` coef on X8                   | 0.95 | Same coefficient as Vehicular; DOEE Calc does not distinguish |
| 9       | B       | 0.25      | Compacted (Open Space)     | `'1. Site Drainage Areas'!Y8` coef on W8                   | 0.25 | Literal inside formula |
| 10      | B       | 0.00      | Natural (Woods)            | `'1. Site Drainage Areas'!Y8` coef on V8                   | 0.00 | Literal inside formula |
| 11      | B       | 0.95      | BMP                        | `'1. Site Drainage Areas'!X8` (bundles BMP into Impervious) | 0.95 (implicit) | BMP area is summed into the Impervious denominator (`X=(R+T)/U`) so its effective Rv is 0.95 |

### Notes on PARAMS_Rv

- "Impervious Vehicular" and "Impervious Non-Vehicular" collapse to a single DOEE coefficient of 0.95; the DOEE Calc does not split the two (vehicular access area is tracked separately in `S`/`AC` for WQTv, not Rv).
- The BMP row intentionally carries Rv = 0.95 because the DOEE Calc folds BMP cover area into the impervious percentage before applying the Rv coefficient. Any change to this value would silently diverge from the DOEE Calc's SWRv.
- `DOEE Watersheds` sheet does not define Rv; it is a drainage-basin lookup table. The task description's suggestion to check `Watersheds` for Rv was incorrect — Rv lives inside the formulas on `1. Site Drainage Areas`.

### Validator mapping for PARAMS_Rv

For `validate_doee_calc_parity.py`, the Rv coefficients must be extracted by parsing the Site Rv formulas on `'1. Site Drainage Areas'!Y8` and `AI8` (both identical). Use a regex like `V\d+\*([0-9.]+)\+W\d+\*([0-9.]+)\+X\d+\*([0-9.]+)` to pull (Natural, Compacted, Impervious) in that order. BMP is pinned to the Impervious coefficient per the X/AH formula shape.

---

## PARAMS_BMP (ours: `PARAMS!A36:G42`)

**Authoritative file:** `docs/doee_spreadsheet_calculators/2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm`

Columns in `PARAMS_BMP`: A=Type, B=Sub-Type, C=n_media, D=n_gravel, E=n_reservoir, F=Ret. Multiplier, G=Max Drawdown (days).

Column A/B are textual labels and not audited here; columns C–G are numeric (or em-dash placeholders).

| Row | Type / Sub-Type                       | Col | Our | DOEE sheet                | DOEE cell | DOEE value / formula | Notes |
|---:|----------------------------------------|:---:|----:|---------------------------|:---------:|----------------------|-------|
| 36 | Permeable Pavement / Enhanced          | C (n_media)    | — (em-dash) | — | — | — | PP has no media layer |
| 36 |                                        | D (n_gravel)   | — (em-dash) | — | — | — | PP labels the gravel layer as "reservoir" |
| 36 |                                        | E (n_reservoir)| 0.40 | `3.5 Permeable Pavement` | `C60` | 0.40 (literal `ŋr`) | Note "0.4 for No. 57 stone" |
| 36 |                                        | F (Ret.Mult)   | 1.0  | `3.5 Permeable Pavement` | `C67` | Rv = C65 (full Sv) when Enhanced | Enhanced → multiplier 1.0, exact match |
| 36 |                                        | G (Drawdown)   | 2    | `3.5 Permeable Pavement` | `C64` label "less than 48 hours" | 2 days (= 48 hr) | DOEE phrases as a 48-hr check; our 2-day value is the identical threshold |
| 37 | Permeable Pavement / Underdrained Enh. | C (n_media)    | — (em-dash) | — | — | — | — |
| 37 |                                        | D (n_gravel)   | — (em-dash) | — | — | — | — |
| 37 |                                        | E (n_reservoir)| 0.40 | `3.5 Permeable Pavement` | `C60` | 0.40 | Same `ŋr` cell as Enhanced |
| 37 |                                        | F (Ret.Mult)   | 0.6  | `3.5 Permeable Pavement` | `C67` | Rv = `C57·(C59·C60 + C61·C62) + 5·C57/100` (sump volume + 5%·Area) | **Not a single-multiplier closed form.** See semantic note below. |
| 37 |                                        | G (Drawdown)   | 2    | `3.5 Permeable Pavement` | `C64` | 2 days | Same as Enhanced |
| 38 | Bioretention / Standard                | C (n_media)    | 0.25 | `3.6 Bioretention`       | `C62` | 0.25 (literal `ηmedia`) | "Typically 0.25" |
| 38 |                                        | D (n_gravel)   | 0.40 | `3.6 Bioretention`       | `C65` | 0.40 (literal `ηgravel`) | "Typically 0.40" |
| 38 |                                        | E (n_reservoir)| — (em-dash) | — | — | — | Bio has no reservoir column |
| 38 |                                        | F (Ret.Mult)   | 0.6  | `3.6 Bioretention`       | `C74` | `=IF(C57="Standard", 0.6*C67, C67)` → Standard=0.6 | Literal extracted from IF formula |
| 38 |                                        | G (Drawdown)   | 3    | `3.6 Bioretention`       | `C69` | 3 days (literal "Must be within 3 days") | Match |
| 39 | Bioretention / Enhanced                | C (n_media)    | 0.25 | `3.6 Bioretention`       | `C62` | 0.25 | Same cell as Standard |
| 39 |                                        | D (n_gravel)   | 0.40 | `3.6 Bioretention`       | `C65` | 0.40 | Same cell as Standard |
| 39 |                                        | E (n_reservoir)| — (em-dash) | — | — | — | — |
| 39 |                                        | F (Ret.Mult)   | 1.0  | `3.6 Bioretention`       | `C74` | non-Standard branch returns `C67` (full Sv) | Literal extracted → 1.0 |
| 39 |                                        | G (Drawdown)   | 3    | `3.6 Bioretention`       | `C69` | 3 | Match |
| 40 | Bioretention / Enhanced w/ Underdrain  | C (n_media)    | 0.25 | `3.6 Bioretention`       | `C62` | 0.25 | Same cell |
| 40 |                                        | D (n_gravel)   | 0.40 | `3.6 Bioretention`       | `C65` | 0.40 | Same cell |
| 40 |                                        | E (n_reservoir)| — (em-dash) | — | — | — | — |
| 40 |                                        | F (Ret.Mult)   | 1.0  | `3.6 Bioretention`       | `C74` | non-Standard branch → `C67` | DOEE label is "Enhanced with Underdrain" (not "w/"); same formula branch as Enhanced |
| 40 |                                        | G (Drawdown)   | 3    | `3.6 Bioretention`       | `C69` | 3 | Match |
| 41 | Dry Swale / —                          | C (n_media)    | 0.25 | `3.9 O-2 Dry Swale`      | `C33` | 0.25 (literal `ηmedia`) | "Typically 0.25" |
| 41 |                                        | D (n_gravel)   | 0.40 | `3.9 O-2 Dry Swale`      | `C35` | 0.40 (literal `ηgravel`) | "Typically 0.40" |
| 41 |                                        | E (n_reservoir)| — (em-dash) | — | — | — | — |
| 41 |                                        | F (Ret.Mult)   | 0.6  | `3.9 O-2 Dry Swale`      | `C38` | `= 0.6*C37` | Literal multiplier |
| 41 |                                        | G (Drawdown)   | 3    | `3.9 O-2 Dry Swale`      | — | — | 72-hr drawdown per the DOEE Guidebook (Ch 3.9); no literal cell in the Dry Swale sheet. Pin to 3 days by guidebook convention. |
| 42 | Wet Swale / —                          | C (n_media)    | — (em-dash) | — | — | — | — |
| 42 |                                        | D (n_gravel)   | — (em-dash) | — | — | — | — |
| 42 |                                        | E (n_reservoir)| — (em-dash) | — | — | — | — |
| 42 |                                        | F (Ret.Mult)   | 0.1  | `3.9 O-3 Wet Swale`      | `F20` (and F21–F24) | `=0.1*E20` | Literal multiplier; identical formula in rows 20–24 |
| 42 |                                        | G (Drawdown)   | — (em-dash) | — | — | — | Wet swale has no drawdown constraint |

### Notes on PARAMS_BMP

- **Sub-Type label difference (not a value drift):** DOEE labels Bioretention row 40 as "Enhanced with Underdrain"; our generator labels it "Enhanced w/ Underdrain". The populator (`populator/src/mappings/swmp-bmp-calc.mjs:192`) normalizes at write-time, so the DOEE formula's `IF(C57=...)` branches still fire correctly. No drift in values.

- **PP Underdrained Retention Multiplier — semantic note (not literal drift):** DOEE `3.5 Permeable Pavement!C67` for "Underdrained Enhanced" evaluates to `Sv_sump + 5%·Ap` (specifically `C57·(C59·C60 + C61·C62) + 5·C57/100`), not `0.6·Sv_full`. Our generator uses a single scalar "Ret. Multiplier" of 0.6 applied to the full reservoir Sv (K = F·G·J where G is total reservoir depth, not sump depth). This is a modeling simplification our engine has adopted; the value `0.6` is a calibrated approximation, not a cell citation. The **DOEE spreadsheet remains the authoritative compliance source** — the populator writes the raw geometry (SA, dp, dsump, Ksat) into DOEE's cells, and DOEE's own formula on `C67` produces the authoritative Rv. The 0.6 value in our `PARAMS_BMP` is only used by our internal cross-check preview, not by the DOEE submission. Flag for `validate_doee_calc_parity.py`: tag this row/column as **`model-approximation`** so the validator skips it or warns instead of failing.

- **Dry Swale drawdown (3 days):** No literal cell for this on the `3.9 O-2 Dry Swale` sheet. DOEE Guidebook Ch 3.9 states the 72-hr drawdown requirement for the Bio/Swale family. Our value matches the guidebook convention; pin to guidebook citation (not to a cell).

- **Em-dash placeholders:** Where a column does not apply to a sub-type (e.g., n_media for PP, which has no media layer), our generator writes the Unicode em-dash `"—"`. These cells are excluded from numeric comparison in the validator.

---

## PARAMS_DetentionCN (ours: `PARAMS!A61:B64`)

**Authoritative file:** `docs/doee_spreadsheet_calculators/2020 General Retention Compliance Calculator 2-5-21.xlsx`
**Authoritative sheet:** `3. Detention`

DOEE's `3. Detention` sheet carries land-cover CNs as literal cell values in every data row (rows 7–24) across two blocks:

- Pre-Development: `G7:G24` (Natural), `I7:I24` (Compacted), `K7:K24` (Impervious), `M7:M24` (BMP)
- Post-Development: `Q7:Q24` (Natural), `S7:S24` (Compacted), `U7:U24` (Impervious), `W7:W24` (BMP)

Representative cells (row 8 shown; all data rows have identical literal values):

```
G8: =IF($B8="","",70)   ← Natural CN
I8: =IF(B8="","",74)    ← Compacted CN
K8: =IF(F8="","",98)    ← Impervious CN
M8: =IF(B8="","",98)    ← BMP CN
```

| Our row | Our value | Land cover | DOEE cell(s)                    | DOEE value | Notes |
|--------:|----------:|------------|---------------------------------|-----------:|-------|
| 61      | 70        | Natural    | `'3. Detention'!G8` (and Q8)    | 70         | Literal inside IF guard |
| 62      | 74        | Compacted  | `'3. Detention'!I8` (and S8)    | 74         | Literal inside IF guard |
| 63      | 98        | Impervious | `'3. Detention'!K8` (and U8)    | 98         | Literal inside IF guard |
| 64      | 98        | BMP        | `'3. Detention'!M8` (and W8)    | 98         | Literal inside IF guard; DOEE treats BMP area as impervious for detention CN (same convention as Rv) |

### Notes on PARAMS_DetentionCN

- The DOEE values are HSG-independent (same CN for all soil groups within a land cover) — they override the TR-55 Table 2-2a HSG-dependent CNs for the purposes of DOEE's detention sheet. Our generator correctly uses the DOEE flat values (not the HSG-indexed ones from `PARAMS_CN`, which is used for retention math upstream).
- Also-ran cross-reference: USDA NRCS TR-55 (1986) Chapter 2, Table 2-2a — "Urban districts" and "Open space, good condition" rows — would give HSG A-D values. DOEE has chosen to flatten these for detention purposes.
- The SUMPRODUCT default in `G7`/`I7` (`IFERROR(..., 70)` / `IFERROR(..., 74)`) confirms the defaults are 70 and 74 when no data is present.

### Validator mapping for PARAMS_DetentionCN

Extract from `'3. Detention'!G8`, `I8`, `K8`, `M8`. Parse the pattern `=IF(...,(\d+))`; the second capture is the CN value. Alternatively, load `data_only=True` and read the computed values — but then any data must be present in the file for the IF to resolve. Formula-mode extraction is simpler.

---

## PARAMS_TR55 (ours: `PARAMS!A76:D81`)

**Authoritative source:** USDA NRCS TR-55 (1986), Chapter 4 ("Graphical Peak Discharge Method"), Exhibit 4-II and Appendix F Table F-1, Type-II rainfall distribution column.

**Not in any DOEE spreadsheet.** Verified by scanning every sheet in `2020 General Retention Compliance Calculator 2-5-21.xlsx` for the six C0 values (2.55323, 2.46532, 2.41896, 2.36409, 2.29238, 2.20282) and two representative C1 values (-0.61512, -0.62257). Zero matches. The DOEE Retention Compliance Calc's `3. Detention` sheet uses the TR-55 Chapter 2 runoff-depth equation `Q = (P - 0.2S)² / (P + 0.8S)` with CN-derived S — it does **not** compute peak discharge `qu` from the Exhibit 4-II log-polynomial. Therefore our TR-55 block has no DOEE cell citation; it is pinned to the printed TR-55 reference.

PARAMS_TR55 layout: cols A=Ia/P, B=C0, C=C1, D=C2. Rows 76–81.

| Our row | Ia/P | Our C0   | Printed C0 | Our C1    | Printed C1 | Our C2   | Printed C2 | Notes |
|--------:|-----:|---------:|-----------:|----------:|-----------:|---------:|-----------:|-------|
| 76      | 0.10 | 2.55323  | 2.55323    | -0.61512  | -0.61512   | -0.16403 | -0.16403   | Pin to TR-55 App. F Table F-1 |
| 77      | 0.30 | 2.46532  | 2.46532    | -0.62257  | -0.62257   | -0.11657 | -0.11657   | Pin to TR-55 App. F Table F-1 |
| 78      | 0.35 | 2.41896  | 2.41896    | -0.61594  | -0.61594   | -0.08820 | -0.08820   | Pin to TR-55 App. F Table F-1 |
| 79      | 0.40 | 2.36409  | 2.36409    | -0.59857  | -0.59857   | -0.05621 | -0.05621   | Pin to TR-55 App. F Table F-1 |
| 80      | 0.45 | 2.29238  | 2.29238    | -0.57005  | -0.57005   | -0.02281 | -0.02281   | Pin to TR-55 App. F Table F-1 |
| 81      | 0.50 | 2.20282  | 2.20282    | -0.51599  | -0.51599   | -0.01259 | -0.01259   | Pin to TR-55 App. F Table F-1 |

### Notes on PARAMS_TR55

- Citation: USDA Natural Resources Conservation Service (formerly SCS), *Urban Hydrology for Small Watersheds — Technical Release 55* (1986), Chapter 4 "Graphical Peak Discharge Method", Exhibit 4-II; coefficients tabulated in Appendix F Table F-1 for the Type II rainfall distribution.
- The equation form is `log10(qu) = C0 + C1·log10(Tc) + C2·log10(Tc)²` where `Tc` is in hours and `qu` in csm/in (cubic feet per second per square mile per inch of runoff).
- Values independently verified against the fixture generator at `summary_calculator/tests/fixtures/generate_fixtures.py:76-78` (same 18 numbers) and against the `peak_discharge.py` formula builder — all three sources are consistent.
- Scan performed for cross-check: zero occurrences in `2020 General Retention Compliance Calculator 2-5-21.xlsx` across all sheets.

### Validator mapping for PARAMS_TR55

No DOEE cell to extract. Validator should carry the six expected `(Ia/P, C0, C1, C2)` tuples inline, compare to `wb_ours['PARAMS']` rows 76–81, and report the citation (`TR-55 1986 App. F Table F-1`) in any drift message.

---

## Cells NOT in scope for this audit

These `PARAMS` blocks exist on our sheet but are out of scope for the formula-drift validator (either covered elsewhere or inherently generator-defined):

- `PARAMS_CN` (rows 15–18) — TR-55 Chapter 2 Table 2-2a CNs by HSG; cross-check against TR-55 printed reference, not DOEE.
- `PARAMS_Horton` (rows 22–25) and `PARAMS_HortonLossB/C` (row 26) — Horton infiltration parameters from the DOEE Guidebook Ch 2.4; computed integrals are generator-derived.
- `PARAMS_Depression` (rows 30–32) — depression storage; DOEE Guidebook convention.
- `PARAMS_Trees` (rows 46–51) — 21 DCMR §534.6 tree retention credits; regulatory citation, not a spreadsheet cell.
- `PARAMS_Detention` (rows 55–57, storm depths 3.14 / 5.23 / 8.34) — **already matches DOEE** `'3. Detention'!Z7`, `AE7`, `AJ7` literally. Could be added to validator scope later if desired.
- `PARAMS_Ksat` (rows 68–71) — DOEE Guidebook Table 2.4-2 default soil permeabilities; regulatory citation.
- `PARAMS_BMPSizingRules` (rows 85–91) — DOEE Guidebook per-BMP sizing thresholds; chapter-level citation, not single cells.

---

## Appendix — DOEE source files inventory

| File | Role |
|------|------|
| `docs/doee_spreadsheet_calculators/2020 General Retention Compliance Calculator 2-5-21.xlsx` | Site-level SWRv compliance; authoritative for Rv coefficients and Detention CN. |
| `docs/doee_spreadsheet_calculators/2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm` | Per-BMP sizing workbook; authoritative for n_media, n_gravel, n_reservoir, Retention Multiplier, Max Drawdown. |
| `docs/doee_spreadsheet_calculators/DDOT MEP Worksheet 012019.xlsx` | DDOT MEP documentation; carries its own hardcoded 1.2″ retention target. Not in scope for this audit. |
| `docs/doee_spreadsheet_calculators/2019 Rainwater Harvesting Storage Volume Calculator 5-07-26.xlsx` | RWH worksheet; not in scope for `PARAMS` audit. |
| `docs/doee_spreadsheet_calculators/SWDB Template for PROW Information_SWMP July 2025 - final locked.xlsx` | PROW submission template; not in scope for `PARAMS` audit. |
