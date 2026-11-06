# SWM DOEE Populator — Design Spec

**Date:** 2026-10-29
**Project:** `ddot_doee_swm_guidelines_2026_v1`
**Status:** Design approved, ready for implementation plan
**Related work:** Webpage A (SWM Summary Calculator) at `summary_calculator/`
**Scope note:** This is **Webpage B** — the template → DOEE calculator populator. It is a sibling standalone webpage to Webpage A, not an extension.

---

## 1. Goal

A standalone, offline single-file HTML webpage that:

1. Reads the filled `SW_Required_Provided_DOEE_EISA438.xlsx` template (same input as Webpage A).
2. Reads blank DOEE/DDOT submission workbooks — either bundled defaults or user-uploaded overrides.
3. Writes template-derived values into the correct cells of each DOEE workbook using surgical XML-level edits so charts, macros, protection, data validation, named ranges, and formatting are preserved byte-for-byte.
4. Returns five populated files via per-file downloads and a single-ZIP download.

Non-goals (v1): running DOEE's own formulas, duplicating sheets for multi-BMP cases (v1 fills first BMP of each type), writing lat/long coordinates into SWDB (template doesn't carry them).

## 2. Why surgical XML edit (vs. SheetJS round-trip)

- A DOEE reviewer expects submissions to look like the official template. SheetJS can lose charts (Rainwater Harvesting cistern-size trade-off plot), images, and VBA macros (`.xlsm` SWMP-BMP Calc) when it rewrites a file.
- Surgical edit via JSZip + DOM XML modification only touches the `<c>` cells we need to populate. Everything else — including `xl/charts/`, `xl/drawings/`, `xl/media/`, `xl/vbaProject.bin` — rides through unchanged.
- Both libraries are small (SheetJS ~440 KB vendored, JSZip ~90 KB) and run entirely in the browser with no network.

## 3. Architecture

Vanilla ES modules in `src/*.mjs`, concatenated by `build.js` into a single-file dist that opens offline from `file://`. Mirrors `summary_calculator/`.

**Key architectural decision — independent of Webpage A.** The two webpages ship as separate dist files. The parse module (`src/parse.mjs`) is copied from `summary_calculator/`, not shared. A regression test runs both parsers against the same fixture to catch divergence.

## 4. File layout

```
ddot_doee_swm_guidelines_2026_v1/
├── populator/
│   ├── summary-populator-dev.html             # dev entry
│   ├── summary-populator.html                 # single-file dist (~2 MB with bundled DOEE blanks inlined)
│   ├── build.js                               # inlines CSS + modules + SheetJS + JSZip + 5 blank XLSX files (base64)
│   ├── lib/
│   │   ├── sheetjs-bundle.js                  # reused from summary_calculator (XLSX reading only)
│   │   └── jszip.min.js                       # new vendored library (~90 KB)
│   ├── src/
│   │   ├── parse.mjs                          # copy of summary_calculator/src/parse.mjs
│   │   ├── xlsx-surgical.mjs                  # JSZip + XML DOM primitives
│   │   ├── mappings/
│   │   │   ├── general-retention.mjs
│   │   │   ├── ddot-mep.mjs
│   │   │   ├── swdb-prow.mjs
│   │   │   ├── swmp-bmp-calc.mjs
│   │   │   └── rainwater-harvesting.mjs
│   │   ├── populate.mjs                       # orchestrator
│   │   ├── ui.mjs                             # browser wiring
│   │   └── styles.css
│   ├── blanks/                                # untouched copies of the 5 DOEE files; build.js inlines
│   │   ├── general-retention.xlsx
│   │   ├── ddot-mep.xlsx
│   │   ├── swdb-prow.xlsx
│   │   ├── swmp-bmp-calc.xlsm
│   │   └── rainwater-harvesting.xlsx
│   ├── package.json
│   ├── README.md
│   └── tests/
│       ├── fixtures/
│       │   └── minnesota-ave.xlsx
│       ├── xlsx-surgical.test.mjs
│       ├── mappings/                          # one test per mapping file
│       ├── populate.test.mjs
│       └── browser-smoke.mjs                  # Playwright, dev-time only
└── .github/workflows/
    └── populator.yml                          # path-triggered Node tests
```

Repo README gets a second row under "Tools":

```
| SWM DOEE Populator | Fills the five DOEE/DDOT submission XLSX files from a filled template | populator/summary-populator.html |
```

## 5. Target coverage

All five DOEE/DDOT files are in scope. Per-target coverage detail is in §8.

| File | Format | Protection | Notable |
|---|---|---|---|
| General Retention Compliance Calculator | `.xlsx` | sheet-protected | 30 named ranges, 10 sheets |
| DDOT MEP Worksheet | `.xlsx` | — | 464 rows per phase sheet |
| SWDB PROW Import Template | `.xlsx` | "final locked" | Separate human + import tabs |
| SWMP-BMP Calc | `.xlsm` | sheet-protected | **VBA macros present** |
| Rainwater Harvesting | `.xlsx` | — | Trade-off chart + 20 yrs rainfall data |

## 6. Mapping specification

Each target gets one declarative mapping file in `src/mappings/<id>.mjs`. Reviewer-friendly tables, not code.

### 6.1 Mapping shape

```js
export const target = {
  id: 'general-retention',
  filename: 'General Retention Compliance Calculator.xlsx',
  blankVersion: '2021-02-05',
  signatureSheets: ['Compliance Check Summary', '1. Site Drainage Areas', '2. BMP Data'],

  // Project-level cells → dotted paths into the parsed template.
  staticCells: [
    { sheet: '1. Site Drainage Areas', ref: 'B5', from: 'project.number' },
    { sheet: '1. Site Drainage Areas', ref: 'B6', from: 'project.name'   },
    // ...
  ],

  // Repeating per-SDA / per-BMP tables.
  tables: [
    {
      sheet: '1. Site Drainage Areas',
      firstDataRow: 15,
      source: 'sdas',
      columns: [
        { col: 'A', from: 'sdaId' },
        { col: 'B', from: 'inProw' },
        { col: 'C', from: '*derive:preNaturalSf' },
        // ...
      ],
    },
  ],

  // Named pure functions over `parsed`.
  derivations: {
    preNaturalSf: (row, parsed) => /* ... */,
  },
};
```

### 6.2 Signature check for user-uploaded blanks

On blank override upload, the orchestrator checks:
- `wb.SheetNames` ⊇ `mapping.signatureSheets` (set inclusion).
- Optionally `blankVersion` string (if stored in a known header cell).

Mismatch → red inline banner on the row: *"Uploaded blank doesn't look like the 2021-02-05 General Retention Calculator — missing sheets X, Y."*

### 6.3 Orchestrator (`src/populate.mjs`)

Small: walks `staticCells`, then `tables`, resolves each `from`, calls `setCell`. All intelligence lives in the mapping files. Returns `{ outputs: [{targetId, filename, blob}], warnings: [], skipped: [{targetId, reason}] }`.

### 6.4 DOEE-template-update workflow

1. Download the new DOEE file into `populator/blanks/<id>.xlsx`.
2. Open the new file in Excel, note any shifted cell refs.
3. Edit the corresponding `src/mappings/<id>.mjs` cells.
4. Run `node tests/mappings/<id>.test.mjs` — fails loudly if the sheet shape changed.
5. Rebuild dist (`node build.js`), commit.

## 7. XLSX surgical edit module (`src/xlsx-surgical.mjs`)

Four public functions:

```js
async function openXlsx(bytes)                         // → opaque handle
function setCell(xlsx, sheetName, ref, value)          // dispatches on JS type
function setCells(xlsx, sheetName, entries)            // batch; one DOM pass per sheet
async function saveXlsx(xlsx)                          // → Blob (download-ready)
```

**What the module does not touch:** `xl/charts/`, `xl/drawings/`, `xl/media/`, `xl/vbaProject.bin`, `xl/workbook.xml` named ranges, `<sheetProtection>` XML.

**Value-type dispatch:**
- `number` → `<c t="n"><v>N</v></c>`
- `string` → shared-strings pool lookup/append → `<c t="s"><v>idx</v></c>`
- `boolean` → `<c t="b"><v>0|1</v></c>`
- `null`/`undefined` → cell cleared

**Formula cell guard:** if `<c>` has an `<f>` child, `setCell` logs a warning and skips rather than overwriting. Prevents breaking DOEE's auto-calculation.

**Shared strings** are the one piece most newcomers get wrong. `setCell` encapsulates: look up string in pool; append if missing; emit `<c t="s"><v>idx</v></c>`.

## 8. Per-target mapping surface

### 8.1 General Retention Compliance Calculator (`general-retention.mjs`)

**Target sheets:** `1. Site Drainage Areas`, `2. BMP Data`, `3. Detention`

- **Static cells:** SWMP Number, Site Name, AWDZ flag, MS4/CSS, per-SDA In PROW flag.
- **Table — SDA block:** One row per unique `sdaId`. Grouped sums across our template SDA rows (template splits by land use; DOEE expects one row per SDA with four cover columns).
- **Table — BMP Data:** One row per BMP. Includes Sv (CF) computed via the same `ppSizingSv` / `bioSizingSv` / `treeRetentionCredit` as Webpage A (logic reused in `populate.mjs`).
- **Table — Detention CN:** Per-SDA Pre/Post CN, Q₂, Q₁₅. Uses `compositeCn` + `scsRunoffDepth`.

**Not populated:** `Compliance Check Summary` (auto-calculated by the Calculator's own formulas), `Saved Values`, `Watersheds`, `BMP Types`, `Retention Calculations`.

### 8.2 DDOT MEP Worksheet (`ddot-mep.mjs`)

**Target sheets:** `30% Phase`, `65% Phase`, `90% Phase` — user picks via checkboxes which phases to populate.

- **Static:** Project Name, Project No., MS4/CSS, AWDZ, Disturbance Area (ac), No. of Drainage Areas.
- **Per-drainage-area rows (up to 33):** DA ID, Impervious / Compacted / Natural within LOD (SF), outside LOD (SF), Regulated Vol (CF), Target Vol, BMP opportunities (Bio sf, PP sf, max Bio Sv, max PP Sv), tree counts (planted/preserved small/large/special/heritage).

### 8.3 SWDB PROW Import Template (`swdb-prow.mjs`)

**Target sheets:** `Drainage Areas`, `BMPs` (human-entry versions only).

The import tabs have formulas pulling from the human-entry tabs; we only write the human side.

- **Per-drainage-area:** Natural/Compacted/Impervious/BMP + Vehicular Access, pre-project cover.
- **Per-BMP:** BMP ID, DA Number, BMP Number, Type, Group, Sv (CF). Coordinates (lat/long) left blank; UI flags as "fill after populate."

### 8.4 SWMP-BMP Calc Spreadsheet (`swmp-bmp-calc.mjs`) — the `.xlsm`

**v1 decision:** fill the sheet for each BMP type with the **first** BMP of that type encountered in the template. Surface a count warning in the UI when more than one BMP of a type exists.

- **Static per BMP type sheet (e.g., `3.6 Bioretention`):** SA_top, SA_bot, d_media, d_gravel, d_pond, n_media, n_gravel, Sub-Type.
- Formulas on the sheet compute Sv/Rv — we don't overwrite them.

Deferred to future iteration: programmatic sheet duplication (one `3.6 Bioretention · BMP-02-A` tab per bio BMP). Requires updating `[Content_Types].xml` + relationships, which is non-trivial via surgical edit.

### 8.5 Rainwater Harvesting (`rainwater-harvesting.mjs`)

**Skip if no RWH BMP in template.** Our template doesn't currently model RWH inputs (CDA, demand, filter efficiency). UI shows: "No RWH data — skipping Rainwater Harvesting Calculator."

## 9. UI shell

Dark-theme single-page app matching `summary_calculator`. Two-stage flow.

### 9.1 Stage 1 — Load

- Section ① — Filled template upload dropzone.
- Section ② — DOEE blanks, one row per target, each labeled "bundled <date> · click to override." Row-level override via `<input type=file>`. Signature-check on upload; mismatch → inline red banner on that row.
- Section ③ — DDOT MEP phases checkboxes: 30% / 65% / 90%.
- **Populate** button (enabled once template is loaded).

### 9.2 Stage 2 — Populate

- Row per target with status (✓ populated, ⚠ with reason, ⊘ skipped with reason) and per-file **Download** button.
- **Download all as ZIP** button bundles everything into `swmp-package.zip` via JSZip.
- **Start over** returns to Stage 1 with state cleared.

### 9.3 States

| State | Behavior |
|---|---|
| Empty | Stage 1, Populate disabled |
| Template loaded | Populate enabled, override rows active |
| Parsing/populating | Spinner + "Populating…" |
| Parse error | Red banner, Populate disabled |
| Signature mismatch | Inline red banner on the offending row |
| Done | Stage 2 panel |

### 9.4 Keyboard

- `Enter` on Stage 1 → Populate (when enabled)
- `Esc` → Start over

## 10. Testing

### 10.1 XLSX fidelity unit tests — `tests/xlsx-surgical.test.mjs` (required in CI)

- `setCell` on 10 known refs in General Retention blank → save → re-open → values match.
- Rainwater Harvesting + `setCell` on one input → save → unzip → `xl/charts/chart1.xml` byte-identical.
- SWMP-BMP Calc `.xlsm` + `setCell` on one input → save → unzip → `xl/vbaProject.bin` byte-identical.
- Blank + `setCell` zero cells → save → entry count matches, size within 2%.
- Protected sheet + `setCell` on a protected cell → save → re-open → value present + protection intact (verified via LibreOffice headless round-trip on CI).

### 10.2 Mapping tests — one per target, `tests/mappings/<id>.test.mjs`

Golden-cell assertions. ~10-15 per target. Catches mapping drift when a DOEE cell shifts.

### 10.3 End-to-end populate test — `tests/populate.test.mjs` (required in CI)

Full orchestrator against the Minnesota Ave fixture + bundled blanks. Assert:
- All 5 outputs exist (or RWH explicitly skipped with reason).
- Each output is a valid XLSX.
- Golden spot-checks across all five.
- Runtime < 2 s.

### 10.4 Playwright smoke — `tests/browser-smoke.mjs` (dev-time only)

Opens dist from `file://`, uploads fixture, clicks Populate, waits for download buttons, clicks ZIP download, verifies Blob. Also tests override flow: upload a bad blank → signature-check banner fires on the right row.

### 10.5 CI

New workflow `.github/workflows/populator.yml` path-triggered on `populator/**`, `scripts/dump_reference.py`, `workbook/**`. Runs Node fidelity + mapping + populate tests. Playwright on demand.

### 10.6 Not tested

- Visual fidelity of the download panel (smoke test confirms it renders).
- Byte-perfect comparison of populated XLSX against hand-filled reference (DOEE file layout can legitimately shift; golden cells catch what matters without brittleness).

## 11. Open items deferred to implementation plan

- Exact cell refs for each `staticCells` entry across all five targets (opened in Excel + typed into the mapping file; one evening of work).
- Whether the shared string pool manipulation needs a batched write mode (performance TBD; `setCells` already offers it).
- Playwright `playwright.config.mjs` location — probably reuse the pattern from `summary_calculator/`.

## 12. Out of scope (for later specs or iterations)

- Programmatic sheet duplication for multi-BMP SWMP-BMP Calc fills.
- Writing lat/long coordinates to SWDB (template doesn't carry them).
- Rainwater Harvesting cistern input modeling (template doesn't support RWH).
- Visual pixel-diff testing of populated XLSX.
- Non-DOEE target workbooks (e.g., FEMA, EPA SWMM — not in current scope).
- Running the DOEE workbooks' own macros/formulas in-browser (Excel does that on open; the populator stops at filling inputs).
