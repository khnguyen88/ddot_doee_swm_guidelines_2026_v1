# SWM Summary Calculator — Design Spec

**Date:** 2026-10-28
**Project:** `ddot_doee_swm_guidelines_2026_v1`
**Status:** Design approved, ready for implementation plan
**Related work:** builds on `workbook/` package (SW_Required_Provided_DOEE_EISA438.xlsx)
**Scope note:** This spec covers **Webpage A — Printable Calculation Summaries** only. Webpage B (template → DOEE calculator populator) is a separate, future spec.

---

## 1. Goal

A standalone, single-file HTML webpage that:

1. Accepts the filled `SW_Required_Provided_DOEE_EISA438.xlsx` template as input (file picker).
2. Parses the raw inputs (project info, SDA land cover, CDAs, BMP dimensions).
3. Recomputes every downstream value in JavaScript (does not trust Excel's cached formula results).
4. Renders a printable deck of letter-size sheets, one page per BMP plus site-level, MEP, EISA 438, detention, and compliance pages.
5. Prints via the browser's native print dialog with pages pre-sized for US Letter at 0.5″ margins.

Non-goals (v1): editable fields, what-if scenarios, writing back to XLSX, visual fidelity to the Excel sheets. Those live elsewhere (Webpage B, or a future revision).

## 2. Why a webpage (vs. extending the Excel template or the Python builder)

- Excel's rendering of multi-step calculations is cell-bound and visually weak for step-by-step derivations. A reviewer wants to see `Sv = SA_bot (d_media·0.25 + d_gravel·0.40 + d_pond) = 210 (0.50 + 0.20 + 0.50) = 252 cf` on one line, not three cells.
- The Python builder emits the Excel workbook; a Python-side HTML renderer would still require Python at run time, defeating "open an .html file and go."
- The project already has a working reference for this pattern at `C:\_AAA\WS_HH\SD-HH-calculator-vc-v1\drainage-calculator` (single-file HTML + inlined SheetJS). Reusing the pattern keeps muscle memory, build tooling, and visual language consistent.

## 3. Architecture

**Approach:** Match `drainage-calculator` exactly — dev HTML + `build.js` concatenator → single-file dist HTML with SheetJS inlined. No bundler, no npm install for consumers, no server. Opens from `file://`.

**Why this over Vite/React:** zero toolchain for consumers; the dist `.html` is portable to GitHub Pages, SharePoint, a USB stick, etc. The downside — one long dev file — is familiar from the reference project and is mitigated by splitting the JS into clearly-labelled regions (parse / calc / render / ui).

## 4. File layout

```
ddot_doee_swm_guidelines_2026_v1/
├── summary_calculator/
│   ├── summary-calculator-dev.html         # source (markup + CSS + JS, has /* SHEETJS_BUNDLE */ placeholder)
│   ├── summary-calculator.html             # dist (single file, SheetJS inlined, ~1 MB)
│   ├── build.js                            # same concatenator pattern as drainage-calculator/build.js
│   ├── lib/
│   │   └── sheetjs-bundle.js               # vendored, same version as drainage-calculator
│   ├── README.md                           # usage + how to rebuild
│   └── tests/
│       ├── fixtures/
│       │   ├── minnesota-ave.xlsx          # copy of SW_Required_...SAMPLE_MinnesotaAve.xlsx
│       │   └── minnesota-ave.reference.json # Python-generated ground truth (step results per BMP, per SDA)
│       ├── parity.test.mjs                 # Node test: JS calcs vs Python reference values
│       ├── browser-smoke.mjs               # Playwright, dev-time only
│       └── print-dimensions.mjs            # Playwright, dev-time only — asserts page count per sheet
├── scripts/
│   └── dump_reference.py                   # NEW — regenerates minnesota-ave.reference.json via workbook.calculations
└── .github/workflows/
    └── summary-calculator.yml              # NEW — runs parity test on paths under summary_calculator/
```

Build command: `node build.js` from inside `summary_calculator/`. Dist is the shipped artifact. Project README gets a new "Tools" row linking to `summary_calculator/summary-calculator.html`.

## 5. Template parsing

The webpage reads one XLSX (user picks via `<input type=file>`). SheetJS reads cached cell values; the webpage does not depend on Excel having been opened/saved first.

**Fields read, by sheet:**

| Sheet | Range | Fields |
|---|---|---|
| `PROJECT` | B3–B11 | Name, Number, MS4/non-MS4, AWDZ, DOEE Review stage, Total LOD (sf), Rainfall (in), Trigger (MLD/MSI), EISA flag |
| `SDA` | row 4+, until first blank SDA_ID | SDA_ID, In PROW?, Land Use, HSG, Pre-Within-LOD sf, Pre-Outside sf, Post-Within sf, Post-Outside sf |
| `CDA` | row 4+ | CDA_ID, SDA_ID, Land Use, Within-LOD sf |
| `BMP` | row 4+ | A: BMP Name, B: SDA_ID, C: CDA_ID, D: BMP Type, E: Sub-Type;<br>PP cols F–G: SA, d_reservoir;<br>Bio/DrySwale cols N–U: SA_top, SA_bot, d_media, d_gravel, d_pond;<br>Trees cols AB–AG: Planted Small/Large, Preserved Small/Large/Special/Heritage |
| `PARAMS` | named ranges | CN by (LU, HSG), Rv factors, media porosity, retention credit depths, HSG → Ksat default, `PARAMS_Detention` (2-yr 3.14″, 15-yr 5.23″), `PARAMS_DetentionCN` (Nat 70, Comp 74, Imp 98, BMP 98) |

**Sheets deliberately not read** (recomputed in JS instead): `EISA_DIRECT`, `EISA_TR55`, `CORRECT_MEP_SUMMARY`, `DOEE_SDA`, `DOEE_BMP_DATA`, `DOEE_DETENTION`, `DOEE_COMPLIANCE`.

**Boundary error handling:**

| Condition | Behavior |
|---|---|
| No file selected | Empty state with dropzone + "Load a filled DOEE EISA 438 template to begin." |
| Missing required sheet (PROJECT, SDA, CDA, BMP, PARAMS) | Red parse-error banner naming the missing sheet; no render |
| Missing `PROJECT!B9` (Rainfall) | Red parse-error banner |
| `(land_use, hsg)` combo not in PARAMS CN table | Yellow calc-error banner at top of affected sheet(s); other sheets still render |
| Blank optional cells (e.g., no trees) | Treated as zero |

## 6. Calculation engine

A single module `calc.js` inside the dev HTML, mirroring `workbook/calculations.py` one-for-one. Constants loaded from the PARAMS sheet at run time, never hard-coded in JS.

### 6.1 Ported from `workbook/calculations.py`

| Python | JS equivalent | Purpose |
|---|---|---|
| `swrv_volume(...)` | `swrvVolume(areas, rainfallIn)` | 21 DCMR §599 SWRv (CF) |
| `tr55_runoff_depth(P, cn)` | `tr55RunoffDepth(P, cn)` | SCS/TR-55 depth (in) |
| `tr55_runoff_volume_cf(area, P, cn)` | `tr55RunoffVolumeCf(area, P, cn)` | Volume (CF) for one row |
| `tr55_total_volume_cf(rows, P)` | `tr55TotalVolumeCf(rows, P)` | Sum across (area, LU, HSG) rows |
| `horton_infil_loss(f_max, f_min, k, T)` | `hortonInfilLoss(fmax, fmin, k, T)` | Closed-form integrated infiltration |
| `eisa_direct_runoff_depth(LU, HSG, P)` | `eisaDirectRunoffDepth(lu, hsg, P)` | Depression + Horton per cell |
| `eisa_direct_total_volume_cf(rows, P)` | `eisaDirectTotalVolumeCf(rows, P)` | Project runoff volume (direct) |

### 6.2 New JS helpers (not currently in `calculations.py`)

| Function | Purpose |
|---|---|
| `ppSizingSv(SA, dReservoir, nReservoir)` | Permeable Pavement storage volume |
| `bioSizingSv(SA_bot, dMedia, nMedia, dGravel, nGravel, dPond)` | Bioretention / Dry Swale storage volume |
| `rvFromSv(sv, bmpType, subType)` | Retention volume using PARAMS credit ratios |
| `maxBmpCredit(cdaAreaSf, maxCreditInches=1.7)` | 1.7″ CDA cap on BMP credit |
| `treeRetentionCredit(counts)` | Per-tree credit values from PARAMS (planted sm/lg, preserved sm/lg/sp/hr) |
| `compositeCn(areas, cnByLandUse)` | Area-weighted CN across Natural/Compacted/Impervious/BMP for one SDA |
| `scsRunoffDepth(P, cn)` | Alias of `tr55RunoffDepth` for detention context |
| `detentionRequired(preQ, postQ)` | `postQ > preQ` boolean |
| `detentionSummary(sdas, p2, p15)` | Returns `[{sda, preCn, postCn, p2PreQ, p2PostQ, p2Req, p15PreQ, p15PostQ, p15Req}]` + site-level `anyRequired` flag |
| `siteAggregateLandCover(sdas)` | Sum Pre/Post Natural/Compacted/Impervious/BMP across all SDAs |
| `siteSwrv(sdas, P, params)` | Site-level SWRv derivation (informational — compliance is per-SDA) |

### 6.3 Trace shape

Every calc function returns a plain-object trace alongside the numeric result:

```js
{
  value: 252,              // final numeric result
  steps: [
    { expr: "SA_bot (d_media·n_media + d_gravel·n_gravel + d_pond)",
      sub:  "210 (2.0·0.25 + 0.5·0.40 + 0.5)",
      eval: "210 (0.50 + 0.20 + 0.50)",
      result: 252 }
  ],
  units: "cf"
}
```

The renderer walks `steps[]` to emit the formula lines. Calc produces facts; renderer formats them.

## 7. Printable sheets

### 7.1 Deck order (TOC)

```
Cover ....................................... p.1
Site DA — Land Cover (Pre vs Post) .......... p.2
Site SWRv Required .......................... p.3
SDA / CDA land cover summary ................ p.4
BMP-02-A (Bio) .............................. p.5
BMP-02-B (PP) ............................... p.6
BMP-03-A (PP) ............................... p.7
...                                            .
MEP summary ................................. p.N-3
EISA 438 Direct Determination ............... p.N-2
Detention summary (only triggered SDAs) ..... p.N-1   ← landscape
Site compliance roll-up ..................... p.N
```

Only SDAs where `Post Q > Pre Q` for the 2-yr or 15-yr storm appear in the Detention Summary. If none trigger, the page shows "No detention required — Post ≤ Pre for all SDAs at both the 2-yr (3.14″) and 15-yr (5.23″) storms."

### 7.2 Sheet anatomy (shared vocabulary with drainage-calculator)

```
┌─────────────────────────────────────────────────────────┐
│  cs-header                                              │
│    cs-title     "BMP-02-A — Bioretention (Enhanced)"    │
│    cs-sub       "Minnesota Ave Great Street · DTA-ZZZ"  │
├─────────────────────────────────────────────────────────┤
│  cs-block  "INPUTS"                                     │
│    cs-kv table (label / value) …                        │
├─────────────────────────────────────────────────────────┤
│  cs-block  "STEP 1 — Storage volume (Sv)"               │
│    cs-formula-line  "Sv = SA_bot (d_media·0.25 + …)"    │
│    cs-formula-line  "   = 210 (2.0·0.25 + 0.5·0.40 …)"  │
│    cs-formula-line  "   = 252 cf"                       │
├─────────────────────────────────────────────────────────┤
│  cs-block  "STEP 2 — Retention volume (Rv)" …           │
├─────────────────────────────────────────────────────────┤
│  cs-result   "Rv provided = 210 cf  ≤  1,422 cf  OK"    │
├─────────────────────────────────────────────────────────┤
│  cs-footer   "DOEE Guidebook §3.6 · 21 DCMR §599"       │
└─────────────────────────────────────────────────────────┘
```

Classes reused literally from `drainage-calculator-dev.html` (lines 426–458): `calc-sheet`, `cs-header`, `cs-title`, `cs-sub`, `cs-block`, `cs-block-title`, `cs-kv`, `cs-formula-line`, `cs-result`, `cs-note`, `cs-warn`, `cs-footer`. White background, dark text, mono for numbers.

### 7.3 Render functions

| Function | Produces |
|---|---|
| `renderCoverSheet(project)` | Project name, number, trigger, LOD, rainfall, EISA flag, TOC |
| `renderSiteDaSheet(sdas)` | Aggregated Pre/Post land cover table + imp% bar strip |
| `renderSiteSwrvSheet(sdas, rainfallIn, params)` | Site-level SWRv step-by-step; labelled "informational — compliance is per-SDA" |
| `renderSdaCdaSummary(sdas, cdas)` | SDA table (land cover + SWRv_req) + CDA table below |
| `renderBmpSheet(bmp, cda, project)` | Inputs → Sv → Rv → compliance (per 7.2) |
| `renderMepSheet(sdas, mep)` | DDOT MEP 4-step summary per SDA — compact table |
| `renderEisa438Sheet(project, sdas)` | EISA Direct Determination: pre vs post runoff volume at 95th %ile (1.7″), PASS if post ≤ pre |
| `renderDetentionSheet(filteredSdas)` | Landscape; only SDAs with Post Q > Pre Q |
| `renderCompliancePage(sdas, bmps)` | Site roll-up: SWRv_req vs Rv_provided per SDA + site total PASS/FAIL |

### 7.4 Letter-size print rules

```css
@page { size: letter portrait; margin: 0.5in; }
@media print {
  .app, #toast { display: none !important; }
  #printArea { display: block !important; }
  .calc-sheet { page-break-after: always; break-after: page; min-height: 9.5in; }
  .calc-sheet:last-child { page-break-after: auto; }
}
@page landscape-page { size: letter landscape; margin: 0.5in; }
.calc-sheet.landscape { page: landscape-page; }
```

Only the Detention Summary carries `.landscape`.

### 7.5 Fit-to-letter guarantee

- Each `calc-sheet` has `min-height: 9.5in` and `max-height: 10in` with `overflow: hidden`.
- A dev-mode outline (toggleable by `?debug=1`) renders the clipped region visibly so overflow is caught in preview.
- SDA/CDA summary and Site Compliance tables paginate by slicing rows into multiple `calc-sheet`s when > ~30 rows.
- The `print-dimensions.mjs` test asserts the expected page count per sheet, catching regressions.

## 8. UI shell

Dark-theme single-page app styled to match `drainage-calculator-dev.html`. On-screen only — print output stays white regardless of UI theme.

### 8.1 Layout

Two columns: sidebar (236 px) + main pane. Sidebar is scrollable, one `.nav-btn` per sheet in the deck, with the page number inline so it doubles as a TOC. Active sheet uses the `.nav-btn.active` highlight. Main pane renders exactly one `.calc-sheet` at a time (the active selection). Same DOM is reused for both screen preview and print; print mode reveals `#printArea`, which contains all sheets in order.

### 8.2 Topbar

- Filename (muted) + `×` to clear
- **Print** button → sets `document.body.classList.add('print-mode')`, calls `window.print()`, removes the class on `afterprint`
- **About** modal: build date, SheetJS version, link to `workbook/calculations.py`, link to DOEE Guidebook

### 8.3 States

| State | What's shown |
|---|---|
| Empty | Dropzone + "Load a filled DOEE EISA 438 template to begin" + "Try the Minnesota Ave sample" link (fetches `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx` from the same folder if present) |
| Parsing | Spinner + "Reading sheet…" |
| Parse error | Red banner naming the specific missing/invalid field + "Load different file" button |
| Loaded | Sidebar + Cover auto-selected |
| Calc error | Yellow banner on affected sheet; other sheets still render |

### 8.4 Keyboard

- `Ctrl/Cmd + P` → Print
- `↑ / ↓` → previous / next sheet in sidebar
- `Esc` → close About modal

### 8.5 Mobile

Sidebar collapses behind a hamburger. Not a design focus — this is a desktop reviewer tool — but the drainage-calculator responsive scaffolding is lifted directly.

## 9. Testing

### 9.1 Node-run calc parity — `tests/parity.test.mjs` (required in CI)

- `scripts/dump_reference.py` imports `workbook.calculations` and the Minnesota Ave sample; writes `tests/fixtures/minnesota-ave.reference.json` with expected numbers for every BMP (Sv, Rv), every SDA (SWRv_req), site totals, EISA direct volume, 2-yr / 15-yr runoff depths, and detention flags.
- `parity.test.mjs` runs the full JS pipeline on the same sample XLSX and asserts each value within tolerance (0.5 CF for volumes, 0.001 in for depths).
- Rock Creek Park (TR-55) and Penn Ave (SWRv) reference values from the existing Python validation tests are rolled into the same JSON so EISA and SWRv branches both have known-good anchors.
- Runs via `node --test tests/parity.test.mjs`. SheetJS loaded from `../lib/sheetjs-bundle.js` through a tiny Node-friendly shim.

### 9.2 Browser smoke — `tests/browser-smoke.mjs` (dev-time, Playwright)

- Opens `summary-calculator-dev.html` from `file://`, uploads the Minnesota Ave fixture, waits for Cover to render.
- Clicks each sidebar entry, asserts the sheet renders without a parse-error or calc-error banner.
- Triggers `beforeprint`, asserts `#printArea` contains the expected number of `.calc-sheet`s in order.

### 9.3 Print-dimensions — `tests/print-dimensions.mjs` (dev-time, Playwright)

- For each sheet type, emits a PDF via `page.pdf({ format: 'Letter' })` and asserts the result is exactly N pages (one per `.calc-sheet` for portrait, one landscape page for Detention Summary).
- Flags any sheet that spilled onto two pages.

### 9.4 Not tested

- Visual pixel-diff (overkill for v1; the page-count check is the practical substitute).
- Formula round-trip through Excel (we deliberately recompute in JS; nothing to round-trip).

### 9.5 CI

A new workflow `.github/workflows/summary-calculator.yml` runs `python scripts/dump_reference.py` then `node --test summary_calculator/tests/parity.test.mjs`. Path-triggered on changes to `summary_calculator/**`, `scripts/dump_reference.py`, or `workbook/**` (the reference JSON is generated from `workbook.calculations`, so a change there must re-trigger parity). Browser/print-dim tests run on demand (`npm run smoke`, documented in `summary_calculator/README.md`).

## 10. Open questions deferred to the implementation plan

- Exact PARAMS named-range keys to extract (confirm against `workbook/builders/params.py` while implementing).
- Whether to carry the drainage-calculator's `--font-mono` and color variables verbatim or trim to only the ones used (trim recommended at code-review time).
- The precise bar-strip visualization for Site DA impervious % (will be settled during Section-7 render-function implementation; the spec commits to "a bar strip" but not its SVG shape).

## 11. Out of scope (for later specs)

- **Webpage B** — Template → DOEE Calculator Populator (writes values into the five official DOEE/DDOT workbooks in `docs/doee_spreadsheet_calculators/`).
- Editable fields / what-if mode on Webpage A.
- Visual fidelity to the Excel sheets.
- Round-trip back to XLSX (write-side).
- Non-Letter paper sizes (A4, Tabloid).
