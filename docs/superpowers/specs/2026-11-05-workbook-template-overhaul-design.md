# Workbook Template Overhaul — Design Spec

**Date:** 2026-11-05
**Scope:** Phase A only — Python workbook generator (`workbook/`), Python tests, and the three bundled fixtures. Phase B (browser apps) and Phase C (education narrative) are deferred and captured as follow-up notes at the end.

## Goal

Overhaul the DOEE EISA 438 workbook template to address 8 user-prioritized items while preserving DOEE/DDOT compliance formulas on the sanctioned sheets.

1. EISA 438: underdrain-equipped BMPs credit only the gravel reservoir below the underdrain.
2. Correct MEP: Hydrologic Soil Group column lists all HSGs present; Infiltration Rate stays on conservative-dominant lookup.
3. BMP tab: toggle between DOEE and Actual swale pond sizing method; both volumes shown.
4. BMP tab: carry the WIP template layout verbatim and fix formulas that don't make sense.
5. BMP tab: SA:CDA % ratio column + Sizing Check column (validates min SA:CDA, min depths, freeboard ≥ 3″, dam height = pond depth, cleanouts present).
6. New TR-55 peak discharge sheets for SDA and CDA: 2-yr and 15-yr peak flow (cfs), via graphical TR-55 with SCS Type II rainfall. Tc from a lookup sheet with either user-direct override or 4-segment Tc path.
7. Design doc in `docs/temp/` (this file).
8. DOEE Detention rewrite: full replica of the 2020 General Retention Compliance Calculator 2-5-21 methodology (Pre CN, Post CN, Post Q, Adjusted Post Q after BMP Sv, back-computed Adjusted CN, 2-yr/15-yr/100-yr with trigger logic).

## Non-goals

- Browser apps (`summary_calculator/`, `populator/`, `education/`) are NOT updated here.
- The `parse.mjs` / `aggregate.mjs` byte-identical copies are NOT touched.
- Playwright smoke tests are NOT updated.
- Education pages are NOT updated.

## Architecture overview

New sheets added to the template workbook:

- `TC_PATH` — one row per SDA/CDA with optional 3-to-4 segment Tc computation. Direct Tc override supported.
- `PEAK_DISCHARGE_SDA` — TR-55 graphical peak discharge, 2-yr and 15-yr, Pre and Post, pulls Tc from `TC_PATH`.
- `PEAK_DISCHARGE_CDA` — same methodology at CDA/BMP level.

Sheets modified:

- `BMP` — 74→81 col layout. New underdrain inputs. New Rv Reservoir output. New Swale Method toggle with DOEE / Actual Sv columns. New SA:CDA % and Sizing Check columns. Added row-5 INPUT/AUTO/DROPDOWN header tags. Added row-2 legend bar. Supplemental Bioretention and Supplemental Swale zones expanded to include cleanouts/obs wells, freeboard (auto), and 15-yr head (user). Swale zone adds top-of-grade / curb-cut / sidewalk elevations at both US and DS ends.
- `EISA_DIRECT` — "Volume Infiltrated in BMPs" swap: per-BMP, use `Rv Reservoir` (AT) when `V="Y"`, else `Rv Applied` (AS).
- `EISA_TR55` — same swap.
- `CORRECT_MEP_SUMMARY` — col L concatenates all present HSGs via nested IF + SUBSTITUTE + LEFT. Col O (Infiltration Rate) unchanged, still conservative-dominant (D>C>B>A).
- `DOEE_DETENTION` and `DOEE_DETENTION_BMP` — full rewrite to 2020 Compliance Calc methodology.
- `PARAMS` — add `PARAMS_TR55` (6 bins × 3 coefficients), `PARAMS_BMPSizingRules` (per sub-type min/max rules), extend `PARAMS_Detention` with 100-yr storm row (8.34 in).

Downstream column-letter cascade: BMP schema change shifts ~15 column letters. Every SUMIFS / INDEX / VLOOKUP in `correct_mep_summary.py`, `doee.py`, `eisa_direct.py`, `eisa_tr55.py` that references BMP columns must be updated to the new letters.

## Section 1 — BMP sheet (items 1, 3, 4, 5)

### Zone layout (81 cols, A through CC)

| Zone | Cols | # | Notes |
|---|---|---|---|
| ID | A-E | 5 | Name, SDA_ID, CDA_ID, Type, Sub-Type |
| Permeable Pavement | F-M | 8 | unchanged from current builder |
| Bio/Dry Swale stack | N-AD | 17 | WIP verbatim: SA_top, SA_bot (auto-pulled from CDA_Proposed), SA_avg, d_topsoil, d_media, n_media, d_choker, d_gravel, V (underdrain Y/N), UD size, UD headspace, Y (reservoir gravel depth, auto), n_gravel, d_pond, Ksat, Bio Sv, Drawdown |
| Wet Swale | AE-AG | 3 | pool, ED, total |
| Trees | AH-AN | 7 | 6 counts + Tree Rv Total |
| Outputs | AO-AT | 6 | Sv Total, Ret Mult, Rv Uncap, Max BMP Credit, Rv Applied, Rv Reservoir (NEW) |
| Checks | AU-AV | 2 | SA:CDA %, Sizing Check |
| Supplemental Bioretention | AW-BE | 9 | +1 col for cleanouts |
| Supplemental Swale (reworked) | BF-BZ | 21 | elevs at both US/DS ends, side slope, underdrain inv, 15-yr head, freeboard (auto), cleanouts |
| Swale Method + Sv | CA-CC | 3 | Method dropdown + Sv DOEE + Sv Actual |

### Row structure

- Row 1 — title banner.
- Row 2 — legend bar: `[■ yellow] USER  [■ blue] AUTO  [■ orange] AUTO ← CDA  [■ green] AUTO ← PARAMS  [▼] DROPDOWN`.
- Row 3 — zone banners (merged across each zone).
- Row 4 — column headers (terse, with units).
- Row 5 — INPUT / AUTO sub-header tag per column.
- Rows 6..55 — 50 BMP data rows.
- Row 58 — SDA Compliance Summary header.
- Rows 59.. — 10 summary data rows.

Data range: `data_start = 6`, `data_end = 55`. All downstream references shift from `BMP_FIRST=4 / BMP_LAST=53` to `BMP_FIRST=6 / BMP_LAST=55`.

### Key formulas

- **SA_bot (O)** — auto-pulled from CDA_Proposed:
  `=SUMIFS('CDA_Proposed'!$E$4:$E$53, 'CDA_Proposed'!$C$4:$C$53, "BMP", 'CDA_Proposed'!$B$4:$B$53, B{r}, 'CDA_Proposed'!$A$4:$A$53, C{r})`

- **Reservoir Portion of Gravel (Y)** — gravel depth that counts toward true infiltration under an underdrain:
  `=IF(V{r}="Y", MAX(0, U{r} − X{r} − W{r}/12), U{r})`

- **Bio Sv (AC)** — WIP formula (uses SA_bot for soil+gravel layers, SA_avg for ponding):
  `=IFERROR(O{r}*(R{r}*S{r} + U{r}*Z{r}) + P{r}*AA{r}, 0)`
  Choker (T) and topsoil (Q) are display-only; not storage layers.

- **Rv Reservoir (AT)** — EISA-only credit:
  `=IFERROR(Y{r}*Z{r}*O{r}, 0)`
  When V=N, Y = full d_gravel → AT equals the gravel-only contribution to Bio Sv. When V=Y, Y = gravel below underdrain pipe only.

- **Sv Total (AO)** — adds selected swale wedge for Dry Swale only:
  `=K{r} + AC{r} + AG{r} + IF(D{r}="Dry Swale", IF(CA{r}="Actual", CC{r}, CB{r}), 0)`

- **Swale Sv DOEE (CB)** — capped wedge (current builder's formula):
  `=BY{r} * 0.5 * MIN(BV{r}, BU{r}/BX{r}) * BU{r} * BG{r}`

- **Swale Sv Actual (CC)** — uncapped wedge (sample calculator's formula):
  `=BY{r} * 0.5 * (BU{r}/BX{r}) * BU{r} * BG{r}`

- **Sizing Check (AV)** — nested IF cascade returning first failing rule. See validation rules below.

### Supplemental Bioretention — AW-BE

| Col | Header | Type | Description |
|---|---|---|---|
| AW | surface elev (ft) | USER | Top-of-gravel surface elev |
| AX | ponding elev (ft) | AUTO | = AW + d_pond |
| AY | 15-yr head assumed (ft) | USER | Additional head above WQV pond |
| AZ | min sidewalk elev (ft) | USER | |
| BA | min curb-cut elev (ft) | USER | |
| BB | underdrain invert (ft) | AUTO | = AW − Q − R − T − X − W/12 |
| BC | bottom invert (ft) | AUTO | = AW − Q − R − T − U |
| BD | freeboard (ft) | AUTO | = MIN(sidewalk, curb-cut) − (pond_elev + 15-yr head) |
| BE | # obs wells / cleanouts | USER (NEW) | DOEE spec min 1 |

### Supplemental Swale — BF-BZ

| Col | Header | Type | Description |
|---|---|---|---|
| BF | length L_s (ft) | USER | Overall swale length |
| BG | bottom width w_s (ft) | USER | Bottom-of-swale width |
| BH | side slope (H:V) | USER (NEW) | Trapezoidal side slope ratio. Captured for cross-section documentation; not used in Sv computation in Phase A (future enhancement). |
| BI | top-of-bank elev US (ft) | USER | |
| BJ | top-of-bank elev DS (ft) | USER | |
| BK | top-of-grade elev US (ft) | USER (NEW) | Adjacent ground elev, upstream |
| BL | top-of-grade elev DS (ft) | USER (NEW) | Adjacent ground elev, downstream |
| BM | curb-cut elev US (ft) | USER (NEW) | |
| BN | curb-cut elev DS (ft) | USER (NEW) | |
| BO | sidewalk elev US (ft) | USER (NEW) | |
| BP | sidewalk elev DS (ft) | USER (NEW) | |
| BQ | invert US (ft) | USER | |
| BR | invert DS (ft) | USER | |
| BS | underdrain inv (ft) | USER (NEW) | Blank if no UD |
| BT | 15-yr head assumed (ft) | USER (NEW) | |
| BU | check dam height H_cd (ft) | USER | |
| BV | check dam spacing X_cd (ft) | USER | |
| BW | # obs wells / cleanouts | USER (NEW) | |
| BX | slope S (ft/ft) | AUTO | = (BQ − BR) / BF |
| BY | # check dams N_cd | AUTO | = FLOOR(BF / BV) |
| BZ | freeboard (ft) | AUTO | = MIN(all 8 top elevs) − (BQ + BU + BT) |

### Swale Method + Sv — CA-CC

| Col | Header | Type |
|---|---|---|
| CA | Swale Method | DROPDOWN (DOEE / Actual), default DOEE |
| CB | Swale Sv DOEE (CF) | AUTO |
| CC | Swale Sv Actual (CF) | AUTO |

### Sizing Check (AV) — validation rules

Output: `✓` on all pass, or first failing rule as `✗ <reason>` or `⚠ <reason>`.

**All BMPs:**
1. SA:CDA % in [min, max] range (from `PARAMS_BMPSizingRules`)
2. Drawdown ≤ 2 days (where applicable)

**Bioretention:**
3. d_pond ≥ 0.5 ft (6 in min)
4. d_media ≥ sub-type min (Standard 1.5 ft; Enhanced + Enhanced w/ UD 2.0 ft)
5. d_gravel ≥ 1.0 ft
6. Freeboard (BD) ≥ 0.25 ft (3 in min)
7. # obs wells / cleanouts (BE) ≥ 1

**Dry Swale:**
3. `ABS(BU − AA) ≤ 0.01` ft — H_cd ≈ d_pond (check dam defines pond)
4. d_media ≥ 1.5 ft
5. d_gravel ≥ 1.0 ft
6. Freeboard (BZ) ≥ 0.25 ft (3 in min)
7. # obs wells / cleanouts (BW) ≥ 1
8. Longitudinal slope S ≤ 0.04 (4%)

**Permeable Pavement:**
3. Drawdown ≤ 2 days
4. d_gravel ≥ 1.0 ft

**Wet Swale and Trees:** show `—` (no sizing rules).

### PARAMS_BMPSizingRules

| Sub-type | SA:CDA min | SA:CDA max | Min ponding (ft) | Min media (ft) | Min gravel (ft) | Min freeboard (ft) | Max slope | Min cleanouts |
|---|---|---|---|---|---|---|---|---|
| Bio Standard | 3% | 10% | 0.5 | 1.5 | 1.0 | 0.25 | — | 1 |
| Bio Enhanced | 3% | 10% | 0.5 | 2.0 | 1.0 | 0.25 | — | 1 |
| Bio Enhanced w/ Underdrain | 3% | 10% | 0.5 | 2.0 | 1.0 | 0.25 | — | 1 |
| Dry Swale | 3% | 10% | 0.167 | 1.5 | 1.0 | 0.25 | 0.04 | 1 |
| PP Enhanced | — | — | — | — | 1.0 | — | — | — |
| PP Underdrained | — | — | — | — | 1.0 | — | — | — |
| Wet Swale | — | — | — | — | — | — | — | — |

Values traced to the sample calculator (`PB9-BIO7`, `PB9-SWALE10`) and DOEE SWMP Chapter 3 BMP specs. Final values to be confirmed against current spec in `summary/` before coding.

### Header clarity improvements

- Row 5 INPUT/AUTO tag row (fills: USER = yellow; AUTO = blue; AUTO←CDA = orange; AUTO←PARAMS = green; AUTO+USER OK = half-yellow/half-blue; DROPDOWN = yellow with ▼).
- Excel cell comments on each row-4 header with full description, units, and formula in English.
- Row-4 names trimmed where the row-3 zone banner already conveys context (e.g., "SA top" instead of "Bio SA_top").

## Section 2 — EISA sheets (item 1)

Both `eisa_direct.py` and `eisa_tr55.py`: replace `=SUM('BMP'!$AM$4:$AM$53)` with the SUMPRODUCT form that swaps per-row based on underdrain:

```
=SUMPRODUCT(
  ('BMP'!$V$6:$V$55="Y") * 'BMP'!$AT$6:$AT$55
  + ('BMP'!$V$6:$V$55<>"Y") * 'BMP'!$AS$6:$AS$55
)
```

Column letters shift from AM (Rv Applied) to AS, and new column AT (Rv Reservoir). Data range shifts from 4-53 to 6-55.

Row 2 note bar added to both EISA sheets:

> "Underdrain-equipped BMPs (V=Y on BMP sheet) credit only the gravel reservoir BELOW the underdrain pipe for EISA 438 (infiltration-only). DOEE SWRv path credits the full Rv Applied."

EISA area aggregations (`RUNOFF_ROWS` SUMIFS on SDA_Existing / SDA_Proposed by land use + HSG) unchanged.

## Section 3 — Correct MEP (item 2)

Col L — Hydrologic Soil Group: replace single-letter conservative-dominant with concatenation of all HSGs present:

```
LEFT(
  IF(sum_A>0,"A, ","") & IF(sum_B>0,"B, ","") &
  IF(sum_C>0,"C, ","") & IF(sum_D>0,"D, ",""),
  LEN(<the concat>) - 2
)
```

where each `sum_X` is the existing SUMIFS fragment, and the outer `LEFT(..., LEN(...)-2)` strips the trailing `", "`. Wrap in `IFERROR(..., "")` for blank SDA rows.

Col O — Infiltration Rate: unchanged (still conservative-dominant via D>C>B>A nested IF cascade).

Note added to row 2 (or appended to existing note bar):

> "Col L lists every HSG present in the SDA. Col O's Infiltration Rate uses the most conservative HSG present (D > C > B > A) for sizing safety."

## Section 4 — DOEE Detention rewrite (item 8)

Full replica of 2020 General Retention Compliance Calculator 2-5-21 methodology.

### Methodology per SDA row

1. Pre CN = area-weighted composite of SDA_Existing areas: `(Nat×70 + Comp×74 + Imp×98 + BMP×98) / Total`.
2. Post CN = same from SDA_Proposed.
3. S_pre = 1000/Pre_CN − 10. S_post = 1000/Post_CN − 10.
4. Pre Q and Post Q (no BMP) via SCS runoff equation: `Q = (P − 0.2·S)² / (P + 0.8·S)` when `P > 0.2·S`, else 0.
5. Adjusted Post Q (after BMP storage): `Q_adj = MAX(0, Q_post − BMP_Sv_CF × 12 / DA_SF)`. BMP Sv pulled via `SUMIFS('BMP'!$AO, $B, SDA_ID)`.
6. Adjusted Post CN — closed-form solve of SCS equation for S given Q_adj:
   `S_adj = 5·(P + 2·Q_adj − √(Q_adj·(4·Q_adj + 5·P)))`
   `CN_adj = 1000 / (S_adj + 10)`
   When `Q_adj = 0`, set `CN_adj = 0` (sufficient storage).
7. Detention Required logic:
   - 2-yr: `IF(CN_adj > 70, "Yes", "No")` — triggers if Adj CN exceeds Natural CN
   - 15-yr: `IF(CN_adj > Pre_CN, "Yes", "No")` — triggers if Adj CN exceeds Pre CN
   - 100-yr: reported only, no pass/fail

### DOEE_DETENTION column layout (SDA level, A-V)

| Col | Header |
|---|---|
| A | SDA Number |
| B | Pre CN |
| C | Post CN (no BMP) |
| D | DA total (SF) |
| E | BMP Sv total (CF) |
| F | 2-yr rain (in) |
| G | 2-yr Pre Q (in) |
| H | 2-yr Post Q no BMP (in) |
| I | 2-yr Adj Q (in) |
| J | 2-yr Adj CN |
| K | 2-yr Det Req'd? |
| L | 15-yr rain (in) |
| M | 15-yr Pre Q (in) |
| N | 15-yr Post Q no BMP (in) |
| O | 15-yr Adj Q (in) |
| P | 15-yr Adj CN |
| Q | 15-yr Det Req'd? |
| R | 100-yr rain (in) |
| S | 100-yr Pre Q (in) |
| T | 100-yr Post Q no BMP (in) |
| U | 100-yr Adj Q (in) |
| V | 100-yr Adj CN |

### DOEE_DETENTION_BMP column layout (CDA level)

Same structure as DOEE_DETENTION, one row per CDA, SUMIFS by CDA_ID into CDA_Existing / CDA_Proposed. Col B = BMP Name (lookup by CDA_ID into BMP!A). BMP Sv pulled via `SUMIFS('BMP'!$AO, $C, CDA_ID)`.

### PARAMS changes

Extend `PARAMS_Detention` from 2 rows to 3:
- Row 1: 2-yr, 3.14 in
- Row 2: 15-yr, 5.23 in
- Row 3: 100-yr, 8.34 in (NEW)

### DOEE_COMPLIANCE col F update

`=IF(OR('DOEE_DETENTION'!K{r}="Yes", 'DOEE_DETENTION'!Q{r}="Yes"), "Yes", "No")` — 100-yr informational only.

## Section 5 — TR-55 Peak Discharge + TC_PATH (item 6)

### TC_PATH sheet (21 cols, 20 rows)

| Col | Header | Type | Notes |
|---|---|---|---|
| A | ID | USER | SDA_ID or CDA_ID |
| B | Name/Description | USER | Optional label |
| C | Tc direct (min) | USER | Overrides path when non-blank |
| D | Sheet n | USER | Manning's roughness for sheet flow |
| E | Sheet L (ft, ≤100) | USER | |
| F | Sheet P₂ (in) | USER | Default = PARAMS 2-yr |
| G | Sheet S (ft/ft) | USER | |
| H | Tt_sheet (hr) | AUTO | = 0.007 × (n·L)^0.8 / (P₂^0.5 · S^0.4) |
| I | Shallow surface | DROPDOWN | paved / unpaved |
| J | Shallow L (ft) | USER | |
| K | Shallow S (ft/ft) | USER | |
| L | Tt_shallow (hr) | AUTO | V = 20.3282·√S (paved) or 16.1345·√S (unpaved); Tt = L / (V·3600) |
| M | Channel 1 L (ft) | USER | |
| N | Channel 1 V (ft/s) | USER | |
| O | Tt_ch1 (hr) | AUTO | = L / (V·3600) |
| P | Channel 2 L (ft) | USER | Optional 4th segment |
| Q | Channel 2 V (ft/s) | USER | |
| R | Tt_ch2 (hr) | AUTO | = L / (V·3600) |
| S | Tc computed (hr) | AUTO | = H + L + O + R (blanks treated as 0) |
| T | Tc final (hr) | AUTO | = IF(C blank, MAX(S, 0.1), MAX(C/60, 0.1)) |
| U | Tc final (min) | AUTO | = T × 60 |

### PARAMS_TR55 — SCS Type II unit peak discharge coefficients

| Ia/P | C0 | C1 | C2 |
|---|---|---|---|
| 0.10 | 2.55323 | −0.61512 | −0.16403 |
| 0.30 | 2.46532 | −0.62257 | −0.11657 |
| 0.35 | 2.41896 | −0.61594 | −0.08820 |
| 0.40 | 2.36409 | −0.59857 | −0.05621 |
| 0.45 | 2.29238 | −0.57005 | −0.02281 |
| 0.50 | 2.20282 | −0.51599 | −0.01259 |

`qu(Tc, Ia/P) = 10^(C0 + C1·log₁₀(Tc) + C2·log₁₀(Tc)²)` (csm/in = cfs per mi² per inch of runoff).

Ia/P linearly interpolated between adjacent bins via MATCH(..., 1) + INDEX; clamped to [0.10, 0.50].

### PEAK_DISCHARGE_SDA (26 cols, 10 rows)

| Col | Header | Notes |
|---|---|---|
| A | SDA_ID | from SDA_Proposed summary |
| B | DA total (SF) | SUMIFS |
| C | DA (mi²) | = B / 27,878,400 |
| D | Pre CN | area-weighted, SDA_Existing |
| E | Post CN | area-weighted, SDA_Proposed |
| F | S_pre (in) | = 1000/D − 10 |
| G | S_post (in) | = 1000/E − 10 |
| H | Tc (hr) | `IFERROR(VLOOKUP(A{r}, TC_PATH!$A:$T, 20, FALSE), 0.1)` — falls back to 0.1 hr if ID not in TC_PATH |
| I | 2-yr rain (in) | PARAMS_Detention row 1 |
| J | Ia/P 2-yr Pre | = 0.2·F/I |
| K | Ia/P 2-yr Post | = 0.2·G/I |
| L | qu 2-yr Pre (csm/in) | Ia/P-interpolated TR-55 eq |
| M | qu 2-yr Post (csm/in) | same |
| N | Q 2-yr Pre (in) | SCS runoff |
| O | Q 2-yr Post (in) | SCS runoff |
| P | Qp 2-yr Pre (cfs) | = L × C × N × 1.0 |
| Q | Qp 2-yr Post (cfs) | = M × C × O × 1.0 |
| R | 15-yr rain (in) | PARAMS_Detention row 2 |
| S | Ia/P 15-yr Pre | |
| T | Ia/P 15-yr Post | |
| U | qu 15-yr Pre | |
| V | qu 15-yr Post | |
| W | Q 15-yr Pre | |
| X | Q 15-yr Post | |
| Y | Qp 15-yr Pre (cfs) | |
| Z | Qp 15-yr Post (cfs) | |

### PEAK_DISCHARGE_CDA

Same 26-col structure, one row per CDA (10 rows), SUMIFS by CDA_ID into CDA_Existing / CDA_Proposed. Col A pulls from CDA_Proposed summary; Tc looked up by CDA_ID.

### Row 2 note on both PEAK sheets

> "TR-55 Graphical Peak Discharge Method (SCS Type II, NOAA Atlas 14 DC rainfall). Tc looked up from TC_PATH by ID (min 0.1 hr). Fp = 1.0 (no on-stream pond adjustment). Qp = qu × Am(mi²) × Q(in) × Fp (TR-55 Eq 4-1)."

## Section 6 — Tests, fixtures, migration

### New Python tests

- `test_bmp_schema.py` — asserts 81-col BMP layout, row 3 banners, row 5 tags, headers.
- `test_bmp_underdrain.py` — Rv Reservoir uses Y×Z×O; Rv Applied uses full Bio Sv.
- `test_bmp_sizing_check.py` — exercises each failing-rule branch.
- `test_bmp_swale_methods.py` — Sv DOEE vs Actual; Sv Total picks right one via CA toggle.
- `test_eisa_underdrain_swap.py` — EISA sheets use SUMPRODUCT form.
- `test_correct_mep_hsg.py` — col L concatenates present HSGs; col O unchanged.
- `test_doee_detention_2020.py` — Pre/Post/Adj CN and Det Req'd match hand-calcs within 0.01 tolerance; 100-yr row populated.
- `test_tc_path.py` — Tt_sheet, Tt_shallow (paved/unpaved), Tt_channel, direct override.
- `test_peak_discharge.py` — Qp matches hand-calc within 1% at Ia/P bin boundaries and midpoints.

### Existing tests to update

- Any test asserting BMP column letters — mechanical update to new letters.
- Any existing DOEE detention test — rewrite for new schema.

### Fixtures to regenerate

- `fixtures/SW_Required_Provided_DOEE_EISA438.xlsx` (blank)
- `fixtures/SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`
- `fixtures/SW_Required_Provided_DOEE_EISA438_SAMPLE_Trail.xlsx`

Both samples get realistic values for new user-input fields (underdrain params, 15-yr head, elevs at both ends, cleanouts, side slopes, Tc segments).

`summary_calculator/tests/fixtures/minnesota-ave-pre-geometry.xlsx` stays untouched. Phase B will introduce a second frozen fixture for the new schema.

### Migration order

1. `params.py` — new ranges (`PARAMS_TR55`, `PARAMS_BMPSizingRules`), extend `PARAMS_Detention`.
2. `bmp.py` — 81-col schema, zone banners, legend bar, row-5 tags, new cols, Sizing Check formula.
3. `eisa_direct.py` + `eisa_tr55.py` — SUMPRODUCT swap.
4. `correct_mep_summary.py` — col L concat, col O unchanged, note.
5. `doee.py` — full detention rewrite.
6. New `tc_path.py` and `peak_discharge.py` builders.
7. Wire into `workbook/__main__.py`.
8. Update `sample.py` and `sample_trail.py` for new fields.
9. Add Python tests (fail first, pass as builders land).
10. Regenerate the three fixtures.

## Section 7 — Phase B / C deferred (next-session notes)

### Phase B — Browser apps

- `parse.mjs` (byte-identical copies in summary_calculator / education / populator) needs new BMP column mapping, new TC_PATH / PEAK_DISCHARGE sheets, rewritten DOEE_DETENTION cols.
- Legacy-schema fallback: use absence of row-5 tag row to detect pre-overhaul workbooks and use legacy column indices.
- `aggregate.mjs` — new roll-ups for peak discharge, underdrain-adjusted EISA retention.
- Populator cell maps — SWMP-BMP Calc output xlsm gets new target cells (underdrain, side slope, cleanouts). Verify cell addresses against official xlsm.
- DDOT MEP Worksheet populator — col L concat replaces single letter; verify string fits cell width.
- Engine parity sync via `bash scripts/sync-education-engines.sh`.
- Playwright smoke tests updated for new UI pieces.
- Freeze `minnesota-ave-pre-eisa-schema.xlsx` as second backward-compat fixture.

### Phase C — Education narrative

- Underdrain conservative storage for EISA 438.
- SA:CDA ratio and sizing checks.
- Swale pond sizing: DOEE vs Actual (side-by-side geometry diagram).
- Cleanouts and observation wells.
- TR-55 Graphical Peak Discharge (Tc path, qu equation + interpolation, Qp worked example).
- DOEE 2020 Compliance Calc methodology (Pre vs Post vs Adjusted CN).
- Re-inline regenerated Minnesota Ave + Trail samples into `education/build.js`.

## Open items / risks

- **DOEE SWMP-BMP Calc.xlsm swale formula verification** — the "DOEE method" column should match what the official xlsm computes. Needs unpacking and verification before coding. Fallback: our current capped-wedge formula if identical.
- **Adjusted CN closed-form derivation** — `S_adj = 5·(P + 2·Q − √(Q·(4·Q + 5·P)))` must be hand-verified once before coding. Unit test will catch errors.
- **PARAMS_BMPSizingRules tolerances** — SA:CDA 3-10%, min depths, max slope come from the sample calculator and SWMP Chapter 3. Confirm against current spec in `summary/` before coding.
- **Cleanouts "min 1" simplification** — DOEE spec scales cleanout count by BMP size. Phase A treats "≥ 1" as a minimum sanity check; a size-based rule can replace this later without schema change.
- **Dry swale slope 4%** — current guidance is 2% nominal; 4% is a soft upper warning threshold here. Final value to confirm against DOEE SWMP Chapter 3 before coding.
- Column widths for the 81-col BMP sheet may make the workbook unwieldy for screen viewing; frozen panes on cols A-E recommended.

## Deliverables

- Updated: `workbook/builders/{bmp,eisa_direct,eisa_tr55,correct_mep_summary,doee,params}.py`
- Updated: `workbook/sample.py`, `workbook/sample_trail.py`
- Updated: `workbook/__main__.py`
- New: `workbook/builders/{tc_path,peak_discharge}.py`
- New: `tests/test_bmp_{schema,underdrain,sizing_check,swale_methods}.py`, `tests/test_eisa_underdrain_swap.py`, `tests/test_correct_mep_hsg.py`, `tests/test_doee_detention_2020.py`, `tests/test_tc_path.py`, `tests/test_peak_discharge.py`
- Regenerated: `fixtures/SW_Required_Provided_DOEE_EISA438{,_SAMPLE_MinnesotaAve,_SAMPLE_Trail}.xlsx`
- All Python tests pass.
