# summary_calculator — Template Gap Fill (Area_Summary · TC · Peak · 2020 Detention · EISA Timestep)

**Date:** 2026-11-06
**Scope:** `summary_calculator` only. Parallel `education` and `populator` specs will follow.
**Status:** design, pre-plan.

## 1. Overview & Scope

Five template features exist as sheets in `SW_Required_Provided_DOEE_EISA438.xlsx` but are not surfaced by the `summary_calculator` print-ready deck:

1. **Area_Summary** — site-level SDA + CDA rollups with Area Match status
2. **TC_PATH** — per-flow-path Time of Concentration (NRCS lag/velocity, sheet/shallow/channel segments)
3. **PEAK_DISCHARGE_SDA** — TR-55 graphical peak discharge per SDA, 2-yr + 15-yr, Pre + Post
4. **PEAK_DISCHARGE_CDA** — same methodology at CDA scale
5. **DOEE_DETENTION_BMP** — 2020 CDA-level detention methodology (post-development peak adjusted by BMP Sv, closed-form CN inverse)

Plus one derived view explicitly requested during brainstorming:

6. **EISA §438 Direct Determination Timestep** — distribute the 1.7″ design storm over 24 hours (SCS Type II hyetograph) and render per-timestep rain / infiltration / excess / BMP-storage-used / net runoff.

**Out of scope here** (separate per-app specs to follow): `education` pedagogy for these features, `populator` mappings into DOEE/DDOT output workbooks.

**Non-goals**: no UI changes to the file picker, no changes to existing deck pages beyond page-order insertion. Existing render functions remain untouched.

## 2. Architecture

Reuse the existing 5-module layered style exactly as it is.

```
parse.mjs       → reads raw cell values (no formulas evaluated)
calc.mjs        → pure-JS formulas, one export per concept
aggregate.mjs   → per-SDA / per-CDA / site rollups (no DOM)
render.mjs      → pure HTML builders, one export per deck page
ui.mjs          → wiring: parse → aggregate → calc → render → push to deck
```

New code lives **inside** these files. No new modules.

**Engine-parity contract**: `calc.mjs`, `aggregate.mjs`, `parse.mjs` must stay byte-identical with `education/src/` copies (CLAUDE.md hard rule, enforced by `education/tests/engine-parity.test.mjs`). Every sub-task that touches these files runs `scripts/sync-education-engines.sh` and a byte-diff check.

## 3. Per-feature components

### 3.1 Area_Summary (no new parse or calc)

- **Aggregate:** `areaSummaryRollup(sdasExisting, sdasProposed, cdasExisting, cdasProposed) → { sdaRows, cdaRows }`
  - `sdaRows[*]`: `{ sdaId, preImp, preComp, preNat, preTotal, postImp, postComp, postNat, postBmp, postTotal, swrvReq, areaMatch }`
  - `cdaRows[*]`: `{ cdaId, sdaId, preTotal, postTotal, maxBmpCredit, areaMatch }`
  - `areaMatch`: `'OK' | 'MISMATCH' | '—'` (tolerance ±1 SF; `'—'` when either side missing).
- **Render:** `renderAreaSummarySheet(project, areaSummary)` — two tables (SDA 12-col + CDA 6-col) with Area Match badges.

### 3.2 TC_PATH

- **Parse:** `parseTcPath(sheet) → [{ pathId, sdaId, cdaId, method, segments: [{ type, length, slope, n_or_k, velocity? }], tcMin }]`. 20-row capacity, scan-until-empty.
- **Calc:**
  - `tcSheetFlow({ length, slope, n, P2 })` — NRCS kinematic equation: `Tc_sheet = 0.007·(n·L)^0.8 / (P2^0.5 · s^0.4)` (min).
  - `tcShallowFlow({ length, slope, surface })` — `V = k·√s`, `Tc = L / (V·60)` (min). `k` from NRCS table by surface.
  - `tcChannelFlow({ length, velocity })` — `Tc = L / (V·60)` (min).
  - `timeOfConcentration(segments)` — sum of per-segment minutes.
- **Render:** `renderTcPathSheet(project, tcPaths)` — one row per flow path, columns `pathId · SDA/CDA · method · segments · Tc (min)`. Small arithmetic trace per row via existing `renderTrace`.

### 3.3 PEAK_DISCHARGE_SDA

- **Parse:** `parsePeakDischarge(sheet, idKey) → [{ areaId, areaAc, cnPre, cnPost, tcHr, p2In, p15In, iaOverP_2yr, iaOverP_15yr }]`. Parameterized on `idKey` for reuse by CDA.
- **Calc:**
  - `tr55UnitPeakDischarge(cn, tcHr, iaOverP, paramsTr55)` — unit peak lookup `qu` (csm/in) from `PARAMS_TR55` (6 IaP rows × 4 coefficient columns per DOEE spreadsheet layout). Uses the NRCS TR-55 polynomial form `log10(qu) = C0 + C1·log10(Tc) + C2·(log10(Tc))^2`, then linear interpolation between adjacent IaP rows when `iaOverP` falls between tabulated values. Clamps to table endpoints when outside the 0.10–0.50 range.
  - `tr55PeakDischargeCfs(qu, areaMi2, runoffIn)` — `Qpeak = qu · A · Q` (cfs).
- **Render:** `renderPeakDischargeSdaSheet(project, peakSda)` — one row per SDA, separate 2-yr and 15-yr blocks with columns `sdaId · area · Tc · CN Pre · qu Pre · Q Pre · Qpeak Pre · CN Post · qu Post · Q Post · Qpeak Post`.

### 3.4 PEAK_DISCHARGE_CDA

Reuses 3.3's parse and calc; only the render differs.

- **Render:** `renderPeakDischargeCdaSheet(project, peakCda)` — same column shape as SDA plus a leading `sdaId` join column (looked up from CDA_Proposed inputs).

### 3.5 DOEE_DETENTION_BMP

- **Parse:** `parseDoeeDetentionBmp(sheet) → [{ cdaId, bmpName, sdaId, cnPre, cnPost, daSf, bmpSvCf, storms: [{ label, rainIn, qPreIn, qPostIn, adjQIn, adjCn, detRequired }] }]`.
- **Calc:**
  - `detentionBmpAdjustedQ(qPostIn, bmpSvCf, daSf)` — `max(0, qPost − bmpSv · 12 / daSf)` (in).
  - `detentionBmpAdjustedCn(adjQIn, pIn)` — closed-form inverse SCS: `S_adj = 5·(P + 2Q − √(Q·(4Q + 5P)))`, `CN = 1000/(S_adj + 10)`.
  - `detentionBmpRequired(adjCn, cnPre, stormLabel)` — `'Yes'` when 2-yr `adjCn > 70`, 15-yr `adjCn > cnPre`, else `'No'`; 100-yr returns `'—'`.
- **Render:** `renderDoeeDetentionBmpSheet(project, detentionBmp)` — one row per CDA, three storm blocks (2-yr / 15-yr / 100-yr) with Rain · Pre Q · Post Q · Adj Q · Adj CN · Trigger badge.

### 3.6 EISA Direct Determination Timestep

Decomposes the DD single-storm total into a 24-hour timestep trace. Purely informational in this spec; pedagogical treatment deferred to the education spec.

- **Calc (shared engine, built explainably so education inherits cleanly):**
  - `SCS_TYPE_II_CURVE` — 240 × 6-min dimensionless cumulative values transcribed from NRCS TR-55 Table 5-1 (24-hour Type II distribution for the mid-Atlantic). Values pinned verbatim to the published table; a unit test checks sum = 1.0 and the known midpoint ≈ 0.5.
  - `scsType2Hyetograph(totalDepthIn, timestepMin = 6)` — multiplies the dimensionless curve by `totalDepthIn`; returns `[{ tMin, pInRate, pCumIn }]` of length 240.
  - `hortonInfilRate(fMax, fMin, k, tHours)` — single-point Horton infiltration rate: `f(t) = fMin + (fMax − fMin)·e^(−k·t)`.
  - `scsCnLoss(cnByHsg, pCumIn)` — SCS curve-number cumulative loss; derived from standard `Q = (P − 0.2S)² / (P + 0.8S)` with `S = 1000/CN − 10`. Used as fallback when Horton params missing.
  - `hortonTimestepLoss(hsg, pCurveStep, params)` — per-step rain rate minus Horton infil rate (excess rate); clamped at zero.
  - `eisaTimestepTrace({ sdas, bmps, params, P = 1.7, lossModel = 'horton' })` — returns `{ timeSteps: [{ tMin, rainIn, infilIn, excessPreIn, excessPostIn, bmpStorageUsedCf, netPostIn }], peaks: { pre, post, postWithBmp }, totals: { preCf, postCf, netPostCf } }`. `lossModel` is `'horton' | 'scs-cn'`.
- **Render:** `renderEisaTimestepSheet(project, trace, params)` — three blocks (inputs summary / 240-row table with hourly bolding / peaks + totals callout).

Each timestep row retains every intermediate value; the education spec will wrap this same trace in Four-Block framing (Overview / Why / Formula / Worked) without re-computing anything.

## 4. Data flow

```
user picks .xlsx
      ↓
XLSX.read(bytes)                                  ui.mjs
      ↓
parseWorkbook(wb) → {                             parse.mjs
   project, sdasExisting, sdasProposed,
   cdasExisting, cdasProposed, bmps, params,
   tcPaths,              // NEW
   peakSda, peakCda,     // NEW
   detentionBmp          // NEW
}
      ↓
aggregate(parsed) → {                             aggregate.mjs
   sdas: merged pre/post, cdas: merged pre/post,
   areaSummary,          // NEW
   siteDa, siteSwrv, detention(2007), bmpStorage, ...
}
      ↓
per-page calc (pure functions)                    calc.mjs
      ↓
render each page → HTML string                    render.mjs
      ↓
ui.push(label, html) × N                          ui.mjs
      ↓
print-ready deck in iframe
```

**Insertion points** in current `ui.mjs` push sequence:

| After existing | New page |
|---|---|
| `cdaPostPages` | `push('Area_Summary', renderAreaSummarySheet(project, areaSummary))` |
| `renderEisaDirectSheet` | `push('EISA §438 — DD Timestep', renderEisaTimestepSheet(project, trace, params))` |
| `renderEisaComplianceSheet` | `push('TC_PATH — Time of Concentration', renderTcPathSheet(...))` → `push('Peak Discharge — SDA', ...)` → `push('Peak Discharge — CDA', ...)` |
| `Detention Summary` | `push('Detention Summary — 2020 CDA (BMP-Adjusted)', renderDoeeDetentionBmpSheet(...))` |

TOC labels inserted at matching indices in the `laterLabels` array so the Cover page's forward-reference is correct.

All downstream code is synchronous and pure after the file read. No DOM reads inside calc/aggregate/render.

## 5. Error handling

Degrade gracefully on older or malformed workbooks. Throw only when a required legacy sheet is absent.

| Condition | Behavior |
|---|---|
| Workbook missing `Area_Summary` sheet | Skip the Area_Summary deck page silently. |
| Workbook missing any of `TC_PATH` / `PEAK_DISCHARGE_SDA` / `PEAK_DISCHARGE_CDA` / `DOEE_DETENTION_BMP` | Same — skip that page silently. |
| `Area_Summary` exists but all rows blank | Render with `renderNote("No SDA/CDA summary data entered yet")`; no table. |
| TC_PATH row has incomplete segment list | Row renders what's present; empty segments show `—`; `tcMin` shows `—` if no segments. |
| PEAK_DISCHARGE row has `tcHr` / `cn` / `area` blank | Pre/Post columns show `—`; row still listed. |
| DOEE_DETENTION_BMP row has `bmpSvCf` blank | `adjQ = qPost` (zero adjustment); `detRequired` evaluated normally. Matches template `IFERROR`. |
| Timestep trace: Horton params missing from PARAMS | Fall back to SCS-CN loss; render `renderWarn(...)` on the page. |
| Timestep trace: no BMPs with Sv | `bmpStorageUsedCf = 0` every step; `netPostIn = excessPostIn`. Trace still renders. |
| Any `calc.mjs` function receives NaN/null | Return `null`; render layer prints `—`. Existing convention. |
| Required legacy sheet missing (e.g., `BMP`) | Throw `Error("Missing sheet: BMP")`. Existing behavior, unchanged. |

**New helpers**:

- `optionalSheet(wb, name) → sheet | null` in `parse.mjs` — parallels `requireSheet`.
- `pushIfNonEmpty(label, html)` in `ui.mjs` — only pushes if render returned non-null.

## 6. Decomposition for subagent-driven execution

Every task starts from a passing test suite, lands as its own PR-ready commit, and ends with the test suite still passing. Engine-parity tasks (anything touching `parse.mjs` / `calc.mjs` / `aggregate.mjs`) include a mandatory `scripts/sync-education-engines.sh` step and a byte-diff check.

### 6.0 — Shared helpers (do first)

- Add `optionalSheet(wb, name)` to `parse.mjs` (both copies).
- Add `pushIfNonEmpty(label, html)` to `ui.mjs`.
- Tests: one assertion each.
- Sync `parse.mjs` to education; byte-diff passes.

### 6.1 — Area_Summary feature

- **6.1.a** `aggregate.mjs`: `areaSummaryRollup(...)` + unit test.
- **6.1.b** `render.mjs`: `renderAreaSummarySheet(...)` + render test.
- **6.1.c** `ui.mjs`: wire page between CDA Post pages and BMP sheets. Verify TOC label order.
- **6.1.d** Sync + byte-diff.

### 6.2 — TC_PATH feature

- **6.2.a** `parse.mjs`: `parseTcPath(sheet)` using `optionalSheet`. Parse test on a synthetic 3-row fixture.
- **6.2.b** `calc.mjs`: `tcSheetFlow` / `tcShallowFlow` / `tcChannelFlow` / `timeOfConcentration` + unit tests pinning NRCS reference values.
- **6.2.c** `render.mjs`: `renderTcPathSheet(...)` + render test.
- **6.2.d** `ui.mjs`: wire page after EISA Compliance.
- **6.2.e** Sync + byte-diff.

### 6.3 — PEAK_DISCHARGE_SDA feature

- **6.3.a** `parse.mjs`: `parsePeakDischarge(sheet, idKey)` + parse test.
- **6.3.b** `calc.mjs`: `tr55UnitPeakDischarge` + `tr55PeakDischargeCfs` + unit tests pinning DOEE TR-55 tabulated values.
- **6.3.c** `render.mjs`: `renderPeakDischargeSdaSheet(...)` + render test.
- **6.3.d** `ui.mjs`: wire.
- **6.3.e** Sync + byte-diff.

### 6.4 — PEAK_DISCHARGE_CDA feature *(reuses 6.3's parse + calc)*

- **6.4.a** `parse.mjs`: call `parsePeakDischarge(sheet, 'CDA_ID')` — no new function needed.
- **6.4.b** `render.mjs`: `renderPeakDischargeCdaSheet(...)` (adds SDA_ID join column).
- **6.4.c** `ui.mjs`: wire after 6.3.
- **6.4.d** Sync + byte-diff.

### 6.5 — DOEE_DETENTION_BMP feature

- **6.5.a** `parse.mjs`: `parseDoeeDetentionBmp(sheet)` + parse test.
- **6.5.b** `calc.mjs`: `detentionBmpAdjustedQ` / `detentionBmpAdjustedCn` / `detentionBmpRequired` + unit tests on hand-worked reference values.
- **6.5.c** `render.mjs`: `renderDoeeDetentionBmpSheet(...)` + render test.
- **6.5.d** `ui.mjs`: wire after existing Detention Summary page.
- **6.5.e** Sync + byte-diff.

### 6.6 — EISA Direct Timestep feature

Split so a single subagent context stays small.

**6.6.A — Timestep engine** *(calc-only)*

- **6.6.A.a** `calc.mjs`: `SCS_TYPE_II_CURVE` constant + `scsType2Hyetograph` + unit test (cumulative at t=12h ≈ 0.5·depth).
- **6.6.A.b** `calc.mjs`: `hortonInfilRate` + unit test.
- **6.6.A.c** `calc.mjs`: `eisaTimestepTrace({ ... })` + unit test pinning a 2-SDA / 1-BMP fixture to hand-computed values.
- **6.6.A.d** Sync + byte-diff.

**6.6.B — Timestep deck page**

- **6.6.B.a** `render.mjs`: `renderEisaTimestepSheet(...)` — three blocks (inputs / 240-row table with hourly bolding / peaks + totals callout) + render test.
- **6.6.B.b** `ui.mjs`: wire page directly after existing EISA Direct page.

### 6.7 — Final integration pass

- Run `summary_calculator`, `education`, `populator` test suites. All green.
- Confirm `education/tests/engine-parity.test.mjs` passes (all three engine files byte-identical).
- Smoke-check: open regenerated `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx` in dev server; verify every new page renders without console errors and TOC order is correct.
- Snapshot final deck page count for the commit message.

**Dependency DAG**: 6.0 unblocks everything. 6.1–6.3 and 6.5 are parallelizable after 6.0. 6.4 depends on 6.3. 6.6.A unblocks 6.6.B. 6.7 depends on everything.

## 7. Testing strategy

Testing is embedded per 6.x sub-task; this section covers cross-cutting guarantees.

- **Unit** (`calc.mjs`): one test per pure function with pinned reference values (hand-worked or NRCS/DOEE tabulated).
- **Parse** (`parse.mjs`): per-feature fixture → expected array. New fixtures in `summary_calculator/tests/fixtures/`.
- **Aggregate** (`aggregate.mjs`): per-rollup synthetic inputs → expected shape.
- **Render** (`render.mjs`): assert HTML contains key labels / badges / column headers (same style as existing render tests).
- **Engine parity** (`education/tests/engine-parity.test.mjs`): must pass after every sync.

**New fixtures required**:

- `tests/fixtures/area-summary-sample.xlsx` — synthetic 2-SDA / 3-CDA workbook.
- `tests/fixtures/tc-path-sample.xlsx` — 3 flow paths covering sheet / shallow / channel.
- `tests/fixtures/peak-discharge-sample.xlsx` — SDA + CDA with known CN/Tc/IaP → tabulated qu.
- `tests/fixtures/detention-bmp-sample.xlsx` — 2 CDAs, one triggering 2-yr detention.
- Timestep: no new fixture — reuse `area-summary-sample.xlsx` + PARAMS Horton values.

**What stays untouched**: existing `parity.test.mjs`, `backward-compat.test.mjs`, pre-geometry fixture, Python `tests/` suite.

**Failure handling**: any 6.x sub-task that can't pass tests stays in-progress; subagent reports the exact failure rather than marking complete with a partial fix (CLAUDE.md verification-before-completion rule).

## 8. Related / future work

### 8.1 Follow-on specs

- `education` app spec — Four-Block pedagogy for Area_Summary, TC_PATH, PEAK_DISCHARGE, DOEE_DETENTION_BMP, and EISA Timestep. Reuses the `calc.mjs` functions this spec introduces.
- `populator` app spec — mappings into any DOEE/DDOT output workbook that has corresponding TC / peak / detention cells.

### 8.2 Formula-drift validator scripts

Prevent silent drift from DOEE/DDOT manual-specified equations and constants (the problem that produced two PARAMS regressions this session). Separate follow-on spec; outlined here so it isn't lost:

- **`scripts/validate_doee_calc_parity.py`** — opens `docs/doee_spreadsheet_calculators/2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm` and asserts every `PARAMS_BMP` / `PARAMS_TR55` / `PARAMS_DetentionCN` cell in our generator matches the authoritative file, with cell-level citations. Replaces the hand-rolled `test_params_bmp_matches_doee_calc_2020` and extends coverage to the other PARAMS tables.
- **`scripts/validate_formula_shapes.py`** — walks our generator's known formula strings (Bio Sv, SCS runoff, closed-form inverse CN, EISA Direct depth, TR-55 unit peak lookup) and asserts each matches a canonical reference, either parsed from the DOEE file where present or pinned to published equations.
- **`tests/test_calc_mjs_against_doee_hand_calcs.py`** — runs selected `calc.mjs` functions via a Node subprocess and compares outputs to Python-computed hand values derived from DOEE Guidebook worked examples.
- Wire into CI so any drift surfaces on PR.

### 8.3 Timestep rendering expansion *(deferred)*

- Add SCS-CN loss model toggle (currently Horton-first with SCS-CN fallback).
- Add continuous-simulation display driven by NOAA Atlas 14 rainfall records.
- Add peak-discharge chart (line plot of excess Pre vs. excess Post vs. net Post).
