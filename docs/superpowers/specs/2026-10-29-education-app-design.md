# SWM Education App — Design Spec

**Date:** 2026-10-29
**Project:** `ddot_doee_swm_guidelines_2026_v1`
**Status:** Design approved, ready for implementation plan
**Related specs:**
- `2026-10-28-swm-summary-calculator-design.md` (Webpage A — summary calculator)
- `2026-10-29-swm-populator-design.md` (Webpage B — populator)
- `2026-10-29-summary-and-populator-fixes-design.md` (second-pass fixes to A + B)

A third standalone offline webpage: an **education-focused walkthrough** of the full DOEE / EISA 438 stormwater compliance process, with pedagogical narration at every step. For EISA §438 specifically, it shows all three computation methods side-by-side: Direct Determination, TR-55 formula, and TR-16 Exhibit 2-7A as HTML lookup tables.

---

## 1. Goal

A standalone, offline single-file HTML webpage that:

1. Reads the filled `SW_Required_Provided_DOEE_EISA438.xlsx` template (same input as Webpages A and B) OR loads a bundled Minnesota Ave demo fixture with one click.
2. Builds a print-ready, letter-portrait deck of pages that mirrors the summary calculator's logical flow but adds a four-block educational pattern on every page: **Overview**, **Why it matters**, **Formula + derivation**, **Worked application**.
3. For EISA §438, dedicates four consecutive pages: Direct Determination (depression + Horton), TR-55 formula (S/Ia/Q derivation), TR-16 Exhibit 2-7A (HTML lookup table of only the project's CNs with the P=1.7″ cell highlighted), and a three-method comparison with BMP storage credit.
4. Includes an Appendix A with the full TR-16 Exhibit 2-7A — all 12 CN tables (60, 61, 68, 69, 70, 74, 75, 76, 80, 81, 82, 98) from the sample PDF — in landscape print orientation.
5. Includes an Appendix B glossary of regulatory and hydrology terms.
6. Opens offline from `file://` with no network calls; everything inlined by `build.js`.

**Non-goals (v1):** live-editing calculator (user types values and sees updates), interactive quiz / assessment mode, bundling non-DC regional 95th-percentile data, teaching detention design (just explaining why it's required and how its calc works), BMP sub-type variations beyond what the summary app models (no Green Roof / RWH / Impervious Disconnection pages).

## 2. Why a third app vs. extending the summary calculator

The summary calculator is a **production report** — numbers only, dense layout, meant for a reviewer who already knows the regulations. Adding narrative text would double its page count and dilute its utility.

The education app serves a different audience: engineers learning the DC regulatory landscape, junior reviewers, students, stakeholders needing a readable explainer. Different information density, different page cadence, different print expectations.

A fork is cheaper than a mode toggle: it keeps the summary calc's print layout untouched, and sync pressure on the engine files is covered by a parity test.

## 3. Architecture

Vanilla ES modules in `src/*.mjs`, concatenated by `build.js` into a single-file dist that opens offline from `file://`. Mirrors `summary_calculator/` and `populator/`.

**Key architectural decision — byte-identical engine copies, not shared package.** The two apps already in production ship as independent single-file dists. Introducing a shared package (`shared/`) is a real refactor on the production summary app, risks regressions, and buys little for a 3-app monorepo. Instead: `calc.mjs`, `aggregate.mjs`, and `parse.mjs` are **byte-identical copies** in each app's `src/`, synced via a script. A parity test (`engine-parity.test.mjs`) asserts byte equality at CI time and fails if someone updates one copy without the others.

## 4. File layout

```
ddot_doee_swm_guidelines_2026_v1/
├── education/
│   ├── education-dev.html                       # dev entry (loads src/ as modules)
│   ├── education.html                           # single-file dist, ~500 KB
│   ├── lib/
│   │   └── sheetjs-bundle.js                    # vendored, same as summary app
│   ├── src/
│   │   ├── calc.mjs                             # BYTE-IDENTICAL copy of summary_calculator/src/calc.mjs
│   │   ├── aggregate.mjs                        # BYTE-IDENTICAL copy
│   │   ├── parse.mjs                            # BYTE-IDENTICAL copy
│   │   ├── tr16-exhibit.mjs                     # NEW — Exhibit 2-7A data (12 CN curves × P rows)
│   │   ├── narrative.mjs                        # NEW — page body templates (Overview / Why / Formula / Worked)
│   │   ├── render-edu.mjs                       # NEW — education-flavored render functions
│   │   ├── styles.css                           # includes summary styles + edu additions
│   │   └── ui.mjs                               # shell: dropzone, sidebar, deck builder, print
│   ├── tests/
│   │   ├── fixtures/
│   │   │   ├── minnesota-ave.xlsx               # bundled demo (copied from summary tests)
│   │   │   └── federal-office-dc.xlsx           # NEW — the eisa-438.md worked example as a workbook
│   │   ├── calc.test.mjs                        # mirrors summary tests (parity check)
│   │   ├── tr16-exhibit.test.mjs                # NEW — sampled (CN, P) → Q cells vs TR-55 formula
│   │   ├── engine-parity.test.mjs               # NEW — byte-equality vs summary_calculator engines
│   │   ├── render-edu.test.mjs                  # NEW — narrative pages render with expected strings
│   │   └── browser-smoke.mjs                    # Playwright: load fixture, iterate pages, print count
│   ├── build.js                                 # mirrors summary_calculator/build.js
│   ├── package.json                             # scripts: dev, build, test, sync-engines
│   └── README.md
└── scripts/
    └── sync-education-engines.sh                # NEW — copies summary engines → education/src
```

## 5. Deck structure

Approximately 18–22 pages for Minnesota Ave. Per-page pattern:

**Four-block educational layout** (every page except Cover and Appendices):

```
┌─ Page Title ─────────────────────────────────┐
│ [Overview callout]  what this page teaches   │
│                                              │
│ WHY IT MATTERS                               │
│ regulatory origin (DCMR / Guidebook / EISA)  │
│ + physical reasoning                         │
│                                              │
│ FORMULA + DERIVATION                         │
│ equation with every variable defined;        │
│ where constants come from                    │
│                                              │
│ WORKED APPLICATION                           │
│ project's actual numbers, step-by-step       │
│ final result highlighted                     │
│                                              │
│ [Reviewer check / Common pitfall sidebar]    │
└──────────────────────────────────────────────┘
```

### Deck order (parallels summary calc deck + new education-only pages)

Pages marked **NEW** are education-only. Pages marked **PARALLEL** mirror a summary-app page but add the four-block pattern.

| # | Page | Type | Notes |
|---|---|---|---|
| 1 | Cover | NEW | Project info + "What this document teaches" |
| 2 | Compliance Landscape | NEW | 21 DCMR vs EISA 438 vs DDOT MEP vs Detention; who applies when |
| 3 | Project Triggers | NEW | MLD / MSI / PROW / Federal matrix with project's flags lit |
| 4 | Site DA | PARALLEL | Pre vs post land cover + impervious % |
| 5 | SDA & CDA Explained | NEW | Compliance unit vs contributing area; max credit cap intuition |
| 6 | Rv Values | NEW | Where 0.95 / 0.25 / 0.00 coefficients come from |
| 7 | SWRv per SDA | PARALLEL | P × ΣA·Rv / 12 walked for every SDA |
| 8 | BMP Catalog | NEW | One-line summary of each BMP type in project + §-ref |
| 9 | Permeable Pavement sizing | PARALLEL | Per-BMP trace |
| 10 | Bioretention sizing | PARALLEL | Per-BMP trace |
| 11 | Tree credit | PARALLEL | Per-BMP counts × credit table |
| 12 | Rv Provided per SDA | PARALLEL | Roll-up with aggregator trace |
| 13 | MEP 4-Step (PROW only) | PARALLEL | Process diagram + per-PROW-SDA metrics |
| 14 | EISA §438 Intro | NEW | 95th percentile concept, METF, federal applicability |
| 15 | EISA Direct Determination | PARALLEL | Depression + Horton per land use, trace, Δ |
| 16 | EISA TR-55 Formula | PARALLEL | S/Ia/Q derivation, composite CN per SDA |
| 17 | EISA TR-16 Lookup | NEW | Project-CN tables with P=1.7″ cell highlighted |
| 18 | EISA Three-Method Comparison | PARALLEL (expanded) | Side-by-side totals + BMP credit + net |
| 19 | Detention 2-yr/15-yr | PARALLEL | SCS CN composite, Pre-Q vs Post-Q |
| 20 | Site Compliance Roll-up | PARALLEL | Per-SDA SWRv required vs Rv provided |
| 21 | Appendix A — TR-16 Exhibit 2-7A | NEW | Full 12 CN tables, landscape, ~4 pages |
| 22 | Appendix B — Glossary | NEW | SWRv, SDA, CDA, HSG, LOD, MEP, METF, PROW, Ia, S, Q, Rv, Sv, CN |

Narrative source material: port directly from existing summaries in `summary/eisa-438.md`, `summary/SWM_sizing_from_docs.md`, `summary/SWM_design_example.md`, `summary/chapters/doee_guidebook/*`, `summary/MEP_PROW_existing_vs_proposed.md`. Do NOT rewrite from scratch — these are the DOEE guidance digests this project has already produced.

## 6. EISA §438 three-method pages (headline feature)

All four pages use `project.rainfallIn = 1.7″` (DC's 95th percentile).

### 6A. Direct Determination (page 15)

**Formula block:**
```
Impervious depth = P − 0.1″ (depression)
Pervious HSG A   = 0                                 (free-draining)
Pervious HSG B   = max(0, P − 0.2″ − Horton_B)       Horton_B = fMin·T + (fMax−fMin)/k · (1 − e^−kT), T=24
Pervious HSG C   = max(0, P − 0.2″ − Horton_C)
Pervious HSG D   = max(0, P − 0.2″)                  (no Horton loss)
```

Horton parameter table (fMax, fMin, k by HSG) + the 24-hr integral evaluated to a numeric constant (shows Horton_B ≈ 7.52″, Horton_C ≈ 2.42″ — both exceed 1.5″ so pervious B/C runoff is zero).

**Worked block:** per-SDA data table with columns `[Land Use, HSG, Area, Depth, Volume]` and totals.

### 6B. TR-55 Formula (page 16)

**Derivation block:**
- `S = 1000 / CN − 10` — potential maximum retention after runoff begins; CN is the empirical surrogate for soil wetness + cover
- `Ia = 0.2 · S` — initial abstraction (SCS calibration from gauged watersheds, roughly 20% of max retention)
- `Q = (P − Ia)² / (P − Ia + S)` for `P > Ia`, else 0

**Composite CN block:** per-SDA area-weighted CN with the project's PARAMS CN table on display.

**Worked block:** per-land-use table with `CN` column added, pre/post totals.

### 6C. TR-16 Lookup (page 17)

**Setup narrative:** TR-16 Exhibit 2-7A is the same math as TR-55, rendered as a lookup table that pre-dates calculators. The sample PDF shows 12 CN curves; the project only uses a subset. We render just the project's CNs here, with the full exhibit in Appendix A.

**Project-CN tables:** For each distinct CN in the project (derived from `parsed.sdas` × PARAMS CN lookup), render one HTML lookup table from `tr16-exhibit.mjs`. Each table:
- Header: `CN = <value>`
- Rows: `0, 1, 2, …, 12` (inches, whole)
- Columns: `0.0, 0.1, …, 0.9` (tenths)
- Highlight the `P = 1.7″` cell (row 1, col 0.7) with yellow background and a border callout: `"At CN=XX, P=1.7″ → Q = X.XX″"`.

**Formula at the top of each table** (reproducing the PDF's layout):
```
Q = (P − 0.2S)² / (P + 0.8S)
S = 1000 / CN − 10
```

### 6D. Three-Method Comparison (page 18)

**Side-by-side totals table:**

| Method | Pre (cf) | Post (cf) | Δ (cf) | Rounding note |
|---|---|---|---|---|
| Direct Determination | … | … | … | depression + 24-hr Horton |
| TR-55 Formula | … | … | … | continuous CN math |
| TR-16 Exhibit (lookup) | … | … | … | nearest 0.1″ P |

**Narrative — "Why they differ":**
- TR-55 and TR-16 are mathematically identical; TR-16 just rounds P to the nearest 0.1″.
- Direct Determination uses a different physical model (Horton infiltration over 24 hr), which diverges most from the SCS methods on HSG B/C soils because Horton losses dominate.

**BMP storage credit block** (reuses `aggregate.rvProvidedPerBmp`):

| BMP | Type | SDA | Rv Provided (cf) |
|---|---|---|---|
| B-1 | Bioretention | SDA-1 | … |
| … | … | … | … |
| | | TOTAL | … |

**Net-after-BMP outcome:** `Net Δ = Post − Pre − Σ Rv_BMP` for each method. Pass/Fail per method.

## 7. TR-16 Appendix A

Full Exhibit 2-7A — all 12 CN tables (60, 61, 68, 69, 70, 74, 75, 76, 80, 81, 82, 98) from the sample PDF (`docs/manual_guidance/EISA 438 sample comps.pdf`, pages 9–13).

**Data entry:** one nested array in `tr16-exhibit.mjs`:

```javascript
export const TR16_EXHIBIT = {
  60: [
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.01, 0.02, 0.04],  // P row 1
    [0.06, 0.08, 0.10, 0.12, 0.14, 0.17, 0.20, 0.24, 0.27, 0.30],  // P row 2
    // … up to P row 12
  ],
  61: [ /* … */ ],
  // … 68, 69, 70, 74, 75, 76, 80, 81, 82, 98
};

export function tr16LookupQ(cn, pInches) {
  const table = TR16_EXHIBIT[cn];
  if (!table) return null;
  const row = Math.floor(pInches);          // whole inches 0..12
  const col = Math.round((pInches - row) * 10);  // tenths 0..9
  if (row < 1 || row > 12) return null;
  return table[row - 1][col];
}
```

**Rendering:** a small helper paginates 3 tables per landscape sheet → 4 appendix pages. Each page reproduces the SCS TR-16 header `"RAINFALL-RUNOFF DEPTHS FOR SELECTED RUNOFF CURVE NUMBERS"` and the footer `"U.S. DEPARTMENT OF AGRICULTURE · SOIL CONSERVATION SERVICE · Exhibit 2-7A"` for authentic reference feel.

**Data validation:** `tr16-exhibit.test.mjs` picks ~20 sampled `(CN, P) → Q` cells, asserts each equals both the hand-copied value AND `tr55RunoffDepth(P, CN).toFixed(2)`. If the data entry diverges from the formula engine, the test fails.

## 8. Print layout

Reuse the summary app's print model:
- `@page letter portrait` default (margin 0.5″)
- `@page landscape-page { size: letter landscape }` for TR-16 appendix + Detention + (if needed) Three-Method Comparison
- `.calc-sheet { min-height: 9.5in; max-height: 10in; page-break-after: always; }`
- Educational narrative sized at 12.5px matching summary app, with callout boxes at 11.5px to keep page density manageable

**Page-overflow guard:** at build time, if a narrative page's rendered text exceeds the sheet (e.g., very wordy Compliance Landscape intro), the renderer splits into two sheets with the same title and `(cont.)` suffix. Prefer to tighten narrative before relying on this, but having the fallback prevents browser clipping.

**Printer / PDF guidance in UI:** small "How to print" tooltip near the Print button explaining: use Chrome/Edge, enable background graphics, letter paper, scale 100%.

## 9. Engine sync + testing

### Sync mechanism

`scripts/sync-education-engines.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cp "$ROOT/summary_calculator/src/calc.mjs"      "$ROOT/education/src/calc.mjs"
cp "$ROOT/summary_calculator/src/aggregate.mjs" "$ROOT/education/src/aggregate.mjs"
cp "$ROOT/summary_calculator/src/parse.mjs"     "$ROOT/education/src/parse.mjs"
echo "✓ Education engine files synced from summary_calculator"
```

Expose as `npm run sync-engines` in `education/package.json`.

### Parity test

`education/tests/engine-parity.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

for (const name of ['calc', 'aggregate', 'parse']) {
  test(`engine-parity: ${name}.mjs byte-identical with summary_calculator`, async () => {
    const summary = await readFile(join(ROOT, 'summary_calculator', 'src', `${name}.mjs`), 'utf8');
    const edu     = await readFile(join(ROOT, 'education',          'src', `${name}.mjs`), 'utf8');
    assert.equal(edu, summary,
      `${name}.mjs diverges — run \`npm run sync-engines\` in education/`);
  });
}
```

### TR-16 data test

`education/tests/tr16-exhibit.test.mjs`:

```javascript
import { tr16LookupQ } from '../src/tr16-exhibit.mjs';
import { tr55RunoffDepth } from '../src/calc.mjs';

// Sampled values hand-copied from docs/manual_guidance/EISA 438 sample comps.pdf
const SAMPLES = [
  { cn: 98, p: 1.7, expected: 1.48 },
  { cn: 70, p: 2.0, expected: 0.06 },
  { cn: 80, p: 1.0, expected: 0.08 },
  { cn: 60, p: 5.0, expected: 1.30 },
  // ~20 more spread across all 12 CN tables
];

for (const s of SAMPLES) {
  test(`tr16-exhibit: CN=${s.cn} at P=${s.p}" matches PDF`, () => {
    assert.equal(tr16LookupQ(s.cn, s.p).toFixed(2), s.expected.toFixed(2));
  });
  test(`tr16-exhibit: CN=${s.cn} at P=${s.p}" matches TR-55 formula within 0.01"`, () => {
    const formula = tr55RunoffDepth(s.p, s.cn);
    assert.ok(Math.abs(tr16LookupQ(s.cn, s.p) - formula) < 0.01,
      `table=${tr16LookupQ(s.cn,s.p)} vs formula=${formula.toFixed(3)}`);
  });
}
```

### Cross-app smoke parity

`education/tests/browser-smoke.mjs` (Playwright) loads the education app with the Minnesota Ave fixture, iterates every sidebar page, asserts no error banners, and specifically asserts that the EISA Three-Method Comparison page's Direct and TR-55 totals match (within tolerance 0.5 cf) the values computed by the summary app engine on the same fixture.

## 10. Out of scope (v1)

- Live-editing calculator mode (user types values, sees updates).
- Interactive quiz / self-assessment ("What CN does Impervious HSG C have?") — would be nice; defer.
- Non-DC regional 95th-percentile data (the EPA TG table has 50+ cities).
- Detention design pages (bioretention sizing for a given target volume, orifice sizing).
- Reading populator-generated DDOT MEP Worksheet files to pull narrative evidence into the MEP page.
- Multi-language support.

## 11. Verification checklist

- [ ] `education/education.html` opens offline from `file://` with no network calls (verify in DevTools Network tab).
- [ ] Loading the Minnesota Ave fixture produces the full deck without error banners.
- [ ] Every narrative page shows all four blocks (Overview / Why / Formula / Worked).
- [ ] EISA Direct Determination page shows per-land-use runoff math with depression + Horton explicit.
- [ ] EISA TR-55 page shows S/Ia/Q derivation and composite CN per SDA.
- [ ] EISA TR-16 page renders one HTML lookup table per distinct project CN, with P=1.7″ cell highlighted and callout showing Q.
- [ ] EISA Three-Method Comparison page shows three Δ values (Direct, TR-55, TR-16) that agree with the summary app within 0.5 cf.
- [ ] Appendix A renders all 12 CN tables from the sample PDF in landscape, paginated at 3 tables per page.
- [ ] Appendix B glossary present with all terms from §5.
- [ ] Print to PDF produces a readable, properly-paginated document with no clipping.
- [ ] `npm test` in `education/`: engine-parity test passes; tr16-exhibit sampled-cells test passes; render-edu test passes.
- [ ] If `calc.mjs` is modified in `summary_calculator/` without running `npm run sync-engines`, the parity test fails in CI.
