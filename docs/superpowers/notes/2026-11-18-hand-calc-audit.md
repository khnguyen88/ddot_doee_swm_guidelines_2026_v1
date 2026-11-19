# Hand-Calc Audit — JS calc.mjs vs. DOEE Published Values

**Date:** 2026-11-18
**Purpose:** Pin (input, expected output) pairs drawn from DOEE, EISA 438 TG, TR-55 / TR-16, and vetted Guidebook design examples so the JS `calc.mjs` engine can be regression-tested against reference publications instead of only against itself.
**Consumed by:** `tests/test_calc_mjs_against_doee_hand_calcs.py` (Task 8.4).
**Scope note:** Tolerances listed below are the *maximum* drift the Task 8.4 test may permit; most cases pass to within a fraction of a cubic foot.

---

## Summary

| #  | Name                                                | JS function(s)              | Source (doc + section)                                                                 |
|---:|-----------------------------------------------------|-----------------------------|----------------------------------------------------------------------------------------|
| 1  | Anacostia Offices — SWRv                            | `swrvVolume`                | Guidebook Appendix A §A.3 Design Example 1, p. A-7/A-8                                 |
| 2  | 1150 50th Pl NE — MSI SWRv                          | `swrvVolume`                | DOEE Training Pres. 02 "SWRv Calculations" Example 1                                   |
| 3  | 1207 H St NE — mixed MSI + MLD SWRv                 | `swrvVolume` (two P calls)  | DOEE Training Pres. 02 "SWRv Calculations" Example 2                                   |
| 4  | TR-55 / TR-16 runoff depth at CN 98, 74, 70, 61     | `tr55RunoffDepth`           | TR-16 Exhibit 2-7A (reproduced in `docs/manual_guidance/EISA 438 sample comps.pdf` p.9–13) |
| 5  | Rock Creek Trail — predevelopment EISA TR-55 volume | `tr55TotalVolumeCf` (+ CN)  | Stantec hand-calc, `docs/manual_guidance/EISA 438 sample comps.pdf` pp.1–3             |
| 6  | Rock Creek Trail — proposed-condition EISA TR-55    | `tr55TotalVolumeCf`         | Stantec hand-calc, `docs/manual_guidance/EISA 438 sample comps.pdf` p.4                |
| 7  | Anacostia Offices — Bioretention Sv (Equation 3.5)  | `bioSizingSv`               | Guidebook Appendix A §A.3 Step 5.2, p. A-10                                            |

**Gaps (no authoritative hand-worked example found in our docs):**

- `eisaDirectTotalVolumeCf` / `eisaDirectRunoffDepth` — EISA 438 TG (Dec 2009) Appendix C of our `docs/manual_guidance/EISA 438 sample comps.pdf` references the integrated 24-hr Horton infiltration losses (B=9.743″, C=3.430″, D=0.769″) as sanctioned reference numbers, but the TG and our docs do not provide a combined site-level numerical runoff example that uses the DOEE depression-storage model (0.1″ impervious, 0.2″ pervious) alongside those Horton losses. The Rock Creek PDF is an *Option-2* TR-55 compliance path, not a Direct-Determination example. Direct-Determination parity is left to `calc.test.mjs` (which pins its own known values from the same model equations) until a DOEE-published Direct example surfaces.
- `tr55UnitPeakDischarge` — no TR-55 Chapter 4 Exhibit 4-II numerical example appears in our docs. The in-repo `calc.test.mjs` tests pin values derived from the Exhibit 4-II coefficients themselves (`[0.10, 2.55323, -0.61512, -0.16403]` etc.), which are already the authoritative constants but not a published worked answer. If a Guidebook Appendix I example surfaces that quotes a specific qu value, add it here.
- `detentionBmpAdjustedCn` — the Guidebook Appendix A §A.2 formula block defines the closed-form S_adj inversion, and Design Example 1 cites an original CN 92 reducing to 79/82/83 for 2-/15-/100-yr storms, but does not publish the intermediate Q_BMP values that would let us pin the inversion with a single clean scalar. A full worked drift test would need to be reconstructed from Example 1's SvDA = 2,501 + 1,003 = 3,504 cf and SA = 40,000 sf. Flagged as a candidate reconstruction, not an audit entry.
- `bioSizingSv` trapezoid-with-explicit-saPondTop branch — Appendix A Example 1 reports SA_top=1,000, SA_bot=814, SA_avg=907, Sv=1,003 cf. Our JS uses `saPondTop` (top-of-pond area) rather than SA_avg. The algebraic identity `SA_pond_top = 2·SA_avg − SA_top = 814` lets us encode this case, but the source does not state SA_pond_top directly, so the mapping is noted explicitly in Example 7 below.

---

### Example 1: Anacostia Offices — SWRv

**Source:** `docs/DOEE Stormwater Management Guidebook January 2020.pdf`, Appendix A §A.3 Design Example 1 (p. A-7 / A-8).
Summary mirror: `summary/chapters/doee_guidebook/appendix_a_compliance_calcs.md` (lines 218–249).
**Covers:** `swrvVolume` in `summary_calculator/src/calc.mjs`.

**Inputs (verbatim from source):**
- Total Site Area: 40,000 sf
- Natural Cover: 8,000 sf
- Compacted Cover: 2,000 sf
- Impervious Cover: 30,000 sf
- Activity: Major Land-Disturbing → P = 1.2″

**Expected output:** `SWRv = 2,900 ft³` (printed verbatim in the Guidebook Step 2 box).
**Tolerance:** ±1 cf (reflects source's integer rounding).

**JS call:**
```js
swrvVolume({
  impVeh:    30000,
  impNonVeh: 0,
  comp:      2000,
  natural:   8000,
  bmp:       0,
}, 1.2)
```
Hand check: (30000·0.95 + 2000·0.25 + 8000·0.00) · 1.2 / 12 = (28500 + 500) · 0.1 = 2,900 cf.

**Why this case:** canonical Guidebook design example, exercises all three primary land covers and the MLD 1.2″ storm; the Guidebook publishes the integer answer directly.

---

### Example 2: 1150 50th Pl NE — MSI SWRv

**Source:** DOEE Training Presentation 02 "SWRv Calculations", Example 1.
Summary mirror: `summary/doee_presentation/02_SWRv_Calculations.md` (lines 16–27).
**Covers:** `swrvVolume`.

**Inputs (verbatim from source):**
- Impervious (building footprint): 37,250 sf
- Compacted / Natural / BMP: 0
- Activity: Major Substantial Improvement → P = 0.8″

**Expected output:** `SWRv = 2,359 ft³` (DOEE presentation prints both 2,359 cf and 17,646 gallons).
**Tolerance:** ±1 cf.

**JS call:**
```js
swrvVolume({
  impVeh:    37250,
  impNonVeh: 0,
  comp:      0,
  natural:   0,
  bmp:       0,
}, 0.8)
```
Hand check: 37250 · 0.95 · 0.8 / 12 = 2,358.33… → rounded 2,359 cf.

**Why this case:** exercises the 0.8″ MSI trigger with impervious-only cover — minimal degrees of freedom, so any drift from the Rv=0.95 constant or the P/12 factor shows up immediately.

---

### Example 3: 1207 H St NE — mixed MSI + MLD SWRv

**Source:** DOEE Training Presentation 02 "SWRv Calculations", Example 2.
Summary mirror: `summary/doee_presentation/02_SWRv_Calculations.md` (lines 29–45).
**Covers:** `swrvVolume` combined across two rainfall triggers.

**Inputs (verbatim from source):**
- MSI portion (P = 0.8″): renovated building 4,225 sf impervious.
- MLD portion (P = 1.2″): bioretention area 3,795 sf + new building 15,200 sf = 18,995 sf impervious.

**Expected output:** `SWRv_total = 2,072 ft³` (DOEE presentation combined total; also quotes 15,499 gal).
**Tolerance:** ±1 cf.

**JS call (two separate SWRv calls summed, matching the DOEE two-trigger workflow):**
```js
const vMsi = swrvVolume({ impVeh: 4225,  impNonVeh: 0, comp: 0, natural: 0, bmp: 0 }, 0.8);
const vMld = swrvVolume({ impVeh: 18995, impNonVeh: 0, comp: 0, natural: 0, bmp: 0 }, 1.2);
const total = vMsi.value + vMld.value;
// expected ≈ 2,072 cf
```
Hand check:
- MSI: 4225 · 0.95 · 0.8 / 12 = 267.58 cf
- MLD: 18995 · 0.95 · 1.2 / 12 = 1,804.53 cf
- Σ = 2,072.11 → 2,072 cf.

**Why this case:** validates the workbook's MLD/MSI dual-rainfall workflow (`PROJECT_Rainfall_Retention` vs. MSI 0.8″). A drift in either rainfall value or in the `impVeh`-row Rv would corrupt only one of the two sub-totals.

---

### Example 4: TR-55 / TR-16 runoff depth table lookup

**Source:** NRCS TR-16 Exhibit 2-7A, "Rainfall-Runoff Depths for Selected Runoff Curve Numbers", photo-copied into `docs/manual_guidance/EISA 438 sample comps.pdf` (pp. 9–13 in the PDF).
Also pinned numerically by the Stantec worksheet on p. 2 of the same PDF: "For P = 1.7″ … RCN=98 Qa=1.48″  RCN=61 Qa=.04″  RCN=74 Qa=.21″  RCN=70 Qa=.14″".
**Covers:** `tr55RunoffDepth(P, cn)` — the fundamental SCS runoff kernel that `tr55RunoffVolumeCf` and `tr55TotalVolumeCf` both wrap.

**Inputs & expected outputs:**

| P (in) | CN  | Expected Q (in) | Source location                               |
|-------:|----:|----------------:|-----------------------------------------------|
|  1.7   | 98  |  1.48           | Exhibit 2-7A CURVE 98 row "1", col ".7" = 1.48 (also Stantec p.2) |
|  1.7   | 74  |  0.21           | Exhibit 2-7A CURVE 74 row "1", col ".7" = 0.21 (also Stantec p.2) |
|  1.7   | 70  |  0.14           | Exhibit 2-7A CURVE 70 row "1", col ".7" = 0.14 (also Stantec p.2) |
|  1.7   | 61  |  0.04           | Exhibit 2-7A CURVE 61 row "1", col ".7" = 0.04 (also Stantec p.2) |
|  1.7   | 55  |  0              | Exhibit 2-7A Curve 55 (not shown; below Ia threshold → Q=0). Also "B Woods Produce No Runoff" per Stantec p.2 note. |

**Tolerance:** ±0.01″. Exhibit 2-7A is tabulated to two decimals; the closed-form SCS equation reproduces it to within table rounding (CN 98 closed-form = 1.4773″ → rounds to 1.48″).

**JS call:**
```js
tr55RunoffDepth(1.7, 98);  // 1.48
tr55RunoffDepth(1.7, 74);  // 0.21
tr55RunoffDepth(1.7, 70);  // 0.14
tr55RunoffDepth(1.7, 61);  // 0.04
tr55RunoffDepth(1.7, 55);  // 0
```

**Why this case:** TR-16 Exhibit 2-7A *is* the authoritative lookup used by TR-55-method compliance in DC. Drift between our closed-form SCS kernel and the table would propagate into every TR-55 EISA 438 compliance check. Testing multiple CNs covers both "above Ia" (CN 98, 74, 70, 61) and "below Ia" (CN 55 at 1.7″).

---

### Example 5: Rock Creek Trail — predevelopment EISA TR-55 volume

**Source:** Stantec hand-calc, `docs/manual_guidance/EISA 438 sample comps.pdf` pp. 1–3.
Project: "Rock Creek Park Multi-Use Trail  EISA Section 438" (signed RLP 5/8/2017).
**Covers:** `tr55RunoffVolumeCf` and `tr55TotalVolumeCf` with the DC 95th-percentile P = 1.7″.

**Inputs (verbatim from source p. 2):**

| Land cover                     | Area (sf) | RCN | Q at 1.7″ (in, from Exhibit 2-7A) |
|--------------------------------|----------:|----:|----------------------------------:|
| Impervious                     | 104,523   |  98 |  1.48                             |
| HSG B Grass (Compacted/Open)   |  56,686   |  61 |  0.04                             |
| HSG C Grass (Compacted/Open)   | 151,163   |  74 |  0.21                             |
| HSG C Woods (Natural)          | 100,728   |  70 |  0.14                             |
| HSG A Grass (excluded, no runoff) |  28,343 |  39 |  0                                |
| HSG A Woods (excluded, no runoff) |  18,895 |  25 |  0                                |
| HSG B Woods (excluded per source note "B Woods Produce No Runoff") | 37,791 |  55 |  0                                |

**Expected output:** `Predevelopment Runoff Volume = 16,901 ft³` (bottom line of p. 3).
**Tolerance:** ±5 cf (table rounding of Qa to 0.01″ introduces up to ~2 cf of swing per 100,000-sf row).

**JS call:**
```js
// Pass only the four runoff-contributing rows; A-soil rows and B-Woods
// contribute Q=0, so including or excluding them is immaterial.
// Note: Rv/CN tables do not have a "Grass" entry — Compacted (Open Space)
// is the matching land-use key; "Woods" maps to Natural (Woods). Both
// lookups are already in CN[].
const P = 1.7;
tr55TotalVolumeCf([
  [104523, 'Impervious Vehicular',     'C'],   // CN 98 regardless of HSG
  [ 56686, 'Compacted (Open Space)',   'B'],   // CN 61
  [151163, 'Compacted (Open Space)',   'C'],   // CN 74
  [100728, 'Natural (Woods)',          'C'],   // CN 70
], P);
// hand check: 104523*1.48 + 56686*0.04 + 151163*0.21 + 100728*0.14
//          = 154,694 + 2,267 + 31,744 + 14,102 = 202,807 → /12 = 16,901 cf ✓
```

**Why this case:** this is a real DOEE-adjacent (federal park) project worked by hand by a licensed engineer against our exact JS engine's inputs: four land-use rows × (area, land-use key, HSG) → one scalar volume. Drift of any coefficient, Rv/CN lookup, or the P/12 factor shows up as a >5 cf departure from the Stantec total.

---

### Example 6: Rock Creek Trail — proposed-condition EISA TR-55 volume

**Source:** Stantec hand-calc, `docs/manual_guidance/EISA 438 sample comps.pdf` p. 4.
**Covers:** `tr55TotalVolumeCf` — proposed phase of the same project.

**Inputs (verbatim from source p. 4):**

| Land cover                     | Area (sf) | RCN | Q at 1.7″ (in) |
|--------------------------------|----------:|----:|---------------:|
| Impervious                     | 190,243   |  98 |  1.48          |
| HSG B Grass (Compacted/Open)   |  73,905   |  61 |  0.04          |
| HSG C Grass (Compacted/Open)   | 197,029   |  74 |  0.21          |
| HSG A Grass (excluded, no runoff) | 36,952 |  39 |  0             |

**Expected output:** `Proposed Condition Runoff Volume = 27,159 ft³` (source quotes "= 27,159 ft³" explicitly).
**Tolerance:** ±5 cf.

**JS call:**
```js
tr55TotalVolumeCf([
  [190243, 'Impervious Vehicular',   'C'],   // CN 98
  [ 73905, 'Compacted (Open Space)', 'B'],   // CN 61
  [197029, 'Compacted (Open Space)', 'C'],   // CN 74
], 1.7);
// hand check: 190243*1.48 + 73905*0.04 + 197029*0.21
//          = 281,560 + 2,956 + 41,376 = 325,892 → /12 = 27,158 → 27,159 cf
```

**Why this case:** pair with Example 5 to catch asymmetric drifts — if only the impervious CN is wrong, the pre→post *delta* diverges even though each phase individually might still "round" close. Also exercises the `tr55TotalVolumeCf` aggregation path with three non-trivial rows and one runoff-free row.

---

### Example 7: Anacostia Offices — Bioretention Sv (Equation 3.5)

**Source:** `docs/DOEE Stormwater Management Guidebook January 2020.pdf`, Appendix A §A.3 Step 5.2, pp. A-10 / A-11.
Summary mirror: `summary/chapters/doee_guidebook/appendix_a_compliance_calcs.md` (lines 325–346).
**Covers:** `bioSizingSv` (trapezoidal ponding branch).

**Inputs (verbatim from source):**
- SA_bottom = 814 sf
- SA_top    = 1,000 sf
- SA_average = 907 sf  →  implied SA_pond_top = 2·SA_avg − SA_top = 814 sf  *(see mapping note below)*
- d_media  = 1.5 ft,  η_media  = 0.25
- d_gravel = 0.75 ft, η_gravel = 0.40
- d_pond   = 0.5 ft

**Expected output:** `Sv = 1,003 ft³` (Guidebook text: "achieve an Sv of 1,003 cubic feet").
**Tolerance:** ±2 cf (source cites integer; closed-form gives 1,002.95).

**JS call:**
```js
bioSizingSv(
  /* saBot     */ 814,
  /* saTop     */ 1000,
  /* saPondTop */ 814,   // = 2·SA_avg − SA_top = 2·907 − 1000
  /* dMedia    */ 1.5,
  /* nMedia    */ 0.25,
  /* dGravel   */ 0.75,
  /* nGravel   */ 0.40,
  /* dPond     */ 0.5,
);
// hand check:
//   media+gravel = 814 · (1.5·0.25 + 0.75·0.40) = 814 · 0.675 = 549.45
//   trapezoid pond = 0.5·(1000+814)·0.5          = 453.50
//   Σ = 1,002.95 → 1,003 cf ✓
```

**Mapping note.** The Guidebook writes the pond contribution as `SA_average · d_ponding` (Equation 3.5). Our JS implements it as a linear-interpolation trapezoid `½·(SA_top + SA_pond_top)·d_pond`. The two are algebraically identical once `SA_pond_top = 2·SA_average − SA_top` is substituted. The test pins SA_pond_top = 814 to drive the trapezoid branch into the exact Equation-3.5 identity. If the test target is instead the vertical-wall branch (`saPondTop = null`), the pond becomes `SA_bot · d_pond` = 407 cf and the total drops to 956 cf — which is *not* the Appendix A number, so the test must use the trapezoid call shown above.

**Why this case:** Equation 3.5 is the DOEE Bioretention sizing equation of record (SWMP-BMP Calc sheet 3.6 cell C73 references the same geometry). This test locks in η_media = 0.25 and η_gravel = 0.40, catches sign/order errors in the trapezoid formula, and verifies that the trapezoid branch degenerates to the Equation-3.5 arithmetic average correctly.

---

## Function-coverage snapshot

| JS function                      | Covered by                 | Status  |
|----------------------------------|----------------------------|---------|
| `swrvVolume`                     | Examples 1, 2, 3           | strong  |
| `tr55RunoffDepth`                | Example 4                  | strong  |
| `tr55RunoffVolumeCf`             | (via `tr55TotalVolumeCf`)  | strong  |
| `tr55TotalVolumeCf`              | Examples 5, 6              | strong  |
| `bioSizingSv` (trapezoid branch) | Example 7                  | strong  |
| `bioSizingSv` (vertical branch)  | (none)                     | GAP     |
| `eisaDirectRunoffDepth`          | (none)                     | GAP     |
| `eisaDirectTotalVolumeCf`        | (none)                     | GAP     |
| `tr55UnitPeakDischarge`          | (none)                     | GAP     |
| `tr55PeakDischargeCfs`           | (none)                     | GAP     |
| `detentionBmpAdjustedQ`          | (none directly)            | GAP     |
| `detentionBmpAdjustedCn`         | (reconstruction candidate) | GAP     |
| `maxBmpCredit`                   | (none directly — covered implicitly by Guidebook Vmax formula on p. A-3, but no scalar expected) | GAP |
| `treeRetentionCredit`            | (none directly)            | GAP     |
| `drySwaleSizingSv`               | (none)                     | GAP     |

4 of ~14 commonly-used calc functions have a DOEE/EISA/TR-55 hand-worked example; 10 remain uncovered by *published* reference values. The remaining coverage is adequately achieved by the self-consistent tests in `summary_calculator/tests/calc.test.mjs`, which pin values derived directly from the DOEE equations, but these are *engine-vs-equation* tests, not *engine-vs-published-worked-answer* tests.

---

## Productivity ranking of source files

1. **`docs/manual_guidance/EISA 438 sample comps.pdf`** — 3 of the 7 examples (Examples 4, 5, 6). Highest signal: it inlines TR-16 Exhibit 2-7A *and* a complete signed worked example.
2. **`docs/DOEE Stormwater Management Guidebook January 2020.pdf` Appendix A** — 2 examples (1 and 7), both with explicit integer answers.
3. **DOEE training presentations (summarized in `summary/doee_presentation/`)** — 2 examples (2 and 3). Presentation 02 is the only one that publishes numerical SWRv for mixed MLD/MSI.
4. **`docs/temp/*.xlsx`** — not mined; the brief was "DOEE/EISA/TR-55 publications", not derived workbook state. Could be used to construct cross-validated examples for the GAP functions by opening the DOEE Calc, populating it, and reading the DOEE formulas' own outputs — flagged as future work.
