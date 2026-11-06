# Summary & Populator — Second-Pass Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship six user-reported fixes — dropzone CSS, Executive Summary page, SDA/CDA 4-sheet split, MEP real-metrics rework, EISA split into Direct+TR-55+Compliance, and populator one-file-per-BMP for SWMP-BMP Calc.

**Architecture:** All summary-app changes stay inside `summary_calculator/src/` — add one new helper module (`aggregate.mjs`), two new calc functions in `calc.mjs`, and new render functions in `render.mjs`. All populator changes stay inside `populator/src/` — orchestrator picks up an optional `fanOut` return from a mapping's `build()` and emits N outputs from one blank. No cross-app dependencies; no new npm deps.

**Tech Stack:** Vanilla ES modules, `node:test`, Playwright. SheetJS + JSZip for populator. No frameworks.

**Spec:** `docs/superpowers/specs/2026-10-29-summary-and-populator-fixes-design.md`

---

## File Structure Overview

### Summary calculator (`summary_calculator/`)

**Create:**
- `src/aggregate.mjs` — pure `rvProvidedPerSda(bmps, cdas, params) → {sdaId: cf}`. Reused by MEP, Compliance, Executive Summary.
- `tests/aggregate.test.mjs` — unit tests for the helper.

**Modify:**
- `src/styles.css` — add `display: block` to `.dropzone`.
- `src/calc.mjs` — add `eisaDirectVolumeTraceCf` and `tr55VolumeTraceCf`.
- `src/render.mjs` — replace 1 EISA renderer with 3; replace 1 SDA/CDA renderer with 4; rewrite MEP renderer; add Executive Summary renderer. Refactor per-BMP renderers to call `aggregate.mjs`.
- `src/ui.mjs` — update `buildDeck()`: new page order, pass additional args to renderers, use the aggregate helper.
- `tests/render.test.mjs` — new tests for new renderers.
- `tests/calc.test.mjs` — new tests for the two new calc traces.
- `tests/browser-smoke.mjs` — expected sidebar count rises (SDA 1→4, EISA 1→3, +1 Executive Summary).

### Populator (`populator/`)

**Modify:**
- `src/populate.mjs` — recognize `fanOut: [{filename, cells}]` from `build()`; emit N outputs from one blank.
- `src/mappings/swmp-bmp-calc.mjs` — return `fanOut` with one entry per BMP of supported type; drop "first-BMP" warnings.
- `src/ui.mjs` — download button key becomes array index rather than `targetId` (to avoid duplicate keys).
- `tests/mappings/swmp-bmp-calc.test.mjs` — rewrite: expect N outputs for Minnesota Ave (4 PP + 4 Bio + 7 Trees = 15 files), each with only its BMP's cells populated.
- `tests/populate.test.mjs` — the "4 outputs" end-to-end assertion becomes 3 single + N fan-out = `3 + 15 = 18`.
- `tests/browser-smoke.mjs` (populator) — expected result-row count rises.

---

## Task 1 — Dropzone CSS fix

**Files:**
- Modify: `summary_calculator/src/styles.css:30`
- Test: `summary_calculator/tests/browser-smoke.mjs` (append new assertion)

- [ ] **Step 1: Write the failing Playwright assertion**

Append this test to `summary_calculator/tests/browser-smoke.mjs`:

```javascript
test('smoke: dropzone renders as a single block (not inline-fragmented)', async ({ page }) => {
  await page.goto(distUrl);
  await page.waitForSelector('.dropzone');
  const display = await page.$eval('.dropzone', (el) => getComputedStyle(el).display);
  expect(display).toBe('block');
});
```

- [ ] **Step 2: Run it to verify it fails**

```
cd summary_calculator
npx playwright test tests/browser-smoke.mjs -g "dropzone renders as a single block"
```

Expected: FAIL. Computed display is `inline` (the default for `<label>`).

- [ ] **Step 3: Fix the CSS**

In `summary_calculator/src/styles.css`, replace line 30:

```css
.dropzone { margin-top: 20px; padding: 40px; border: 2px dashed var(--border); border-radius: 8px; cursor: pointer; }
```

with:

```css
.dropzone { display: block; margin-top: 20px; padding: 40px; border: 2px dashed var(--border); border-radius: 8px; cursor: pointer; }
```

- [ ] **Step 4: Rebuild the dist and re-run the test**

```
cd summary_calculator
node build.js
npx playwright test tests/browser-smoke.mjs -g "dropzone renders as a single block"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```
git add summary_calculator/src/styles.css summary_calculator/tests/browser-smoke.mjs summary_calculator/summary-calculator.html
git commit -m "summary: fix split dropzone border (display: block)"
```

---

## Task 2 — Extract `rvProvidedPerSda` helper into `aggregate.mjs`

Reusable aggregator shared by MEP, Compliance Roll-up, and Executive Summary. Pure function — no DOM, no SheetJS. Replaces the inline logic currently in `summary_calculator/src/ui.mjs:38–71`.

**Files:**
- Create: `summary_calculator/src/aggregate.mjs`
- Create: `summary_calculator/tests/aggregate.test.mjs`
- Modify: `summary_calculator/src/ui.mjs:38–71` (delete inline logic; call helper instead)

- [ ] **Step 1: Write failing tests**

Create `summary_calculator/tests/aggregate.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rvProvidedPerSda } from '../src/aggregate.mjs';

const params = {
  bmpDesign: {
    'Permeable Pavement / Enhanced': { nReservoir: 0.4, retMultiplier: 1.0 },
    'Bioretention / Enhanced':       { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 },
  },
  treeCredits: { 'T-1 Large': 10, 'T-2 Large': 20 },
};

test('rvProvidedPerSda: PP uses sa*d*n * retMultiplier capped by maxBmpCredit', () => {
  const bmps = [
    { name: 'PP-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Permeable Pavement',
      subType: 'Enhanced', pp: { sa: 100, dReservoir: 1 } },
  ];
  const cdas = [{ cdaId: 'CDA-1', postIn: 10000 }]; // cap = 10000*1.7/12 ≈ 1417
  const result = rvProvidedPerSda(bmps, cdas, params);
  // Sv = 100 * 1 * 0.4 = 40; Rv = 40 * 1 = 40; cap = 1416.67 → not capped
  assert.equal(result['SDA-1'], 40);
});

test('rvProvidedPerSda: PP Rv capped by CDA max credit when oversized', () => {
  const bmps = [
    { name: 'PP-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Permeable Pavement',
      subType: 'Enhanced', pp: { sa: 10000, dReservoir: 5 } }, // Sv = 20000 cf
  ];
  const cdas = [{ cdaId: 'CDA-1', postIn: 100 }]; // cap = 100*1.7/12 ≈ 14.17
  const result = rvProvidedPerSda(bmps, cdas, params);
  assert.ok(result['SDA-1'] < 15, `expected capped Rv ~14.17, got ${result['SDA-1']}`);
});

test('rvProvidedPerSda: sums multiple BMPs within one SDA', () => {
  const bmps = [
    { name: 'T-1', sdaId: 'SDA-1', type: 'Planted Trees', trees: { plantedLarge: 2 } },
    { name: 'T-2', sdaId: 'SDA-1', type: 'Preserve Trees', trees: { preservedLarge: 3 } },
  ];
  const result = rvProvidedPerSda(bmps, [], params);
  // 2*10 + 3*20 = 80
  assert.equal(result['SDA-1'], 80);
});

test('rvProvidedPerSda: BMP without a CDA entry is NOT capped', () => {
  const bmps = [
    { name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-X', type: 'Bioretention', subType: 'Enhanced',
      bio: { saTop: 100, saBot: 100, dMedia: 2, dGravel: 0.5, dPond: 0.5 } },
  ];
  const result = rvProvidedPerSda(bmps, [], params);
  // Sv = 100 * (2*0.4 + 0.5*0.4 + 0.5) = 100*1.5 = 150
  assert.equal(result['SDA-1'], 150);
});

test('rvProvidedPerSda: empty BMP list returns empty object', () => {
  assert.deepEqual(rvProvidedPerSda([], [], params), {});
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd summary_calculator
node --test tests/aggregate.test.mjs
```

Expected: FAIL with "Cannot find module './src/aggregate.mjs'".

- [ ] **Step 3: Write the helper**

Create `summary_calculator/src/aggregate.mjs`:

```javascript
// src/aggregate.mjs — reusable per-SDA retention aggregator.
// Pure function; no DOM, no SheetJS. Shared by MEP, Compliance, Executive Summary pages
// so Rv-applied is computed in exactly one place.

import {
  ppSizingSv, bioSizingSv, maxBmpCredit, treeRetentionCredit,
} from './calc.mjs';

const DEFAULT_PP_DESIGN  = { nReservoir: 0.40, retMultiplier: 1.0 };
const DEFAULT_BIO_DESIGN = { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 };

function _rvForBmp(bmp, cdas, params) {
  if (bmp.type === 'Permeable Pavement' && bmp.pp) {
    const design = params.bmpDesign[`Permeable Pavement / ${bmp.subType}`] || DEFAULT_PP_DESIGN;
    const sv = ppSizingSv(bmp.pp.sa, bmp.pp.dReservoir, design.nReservoir).value;
    const rv = sv * design.retMultiplier;
    const cda = cdas.find(c => c.cdaId === bmp.cdaId);
    return cda ? Math.min(rv, maxBmpCredit(cda.postIn).value) : rv;
  }
  if ((bmp.type === 'Bioretention' || bmp.type === 'Dry Swale') && bmp.bio) {
    const design = params.bmpDesign[`${bmp.type} / ${bmp.subType}`] || DEFAULT_BIO_DESIGN;
    const sv = bioSizingSv(
      bmp.bio.saBot, bmp.bio.dMedia, design.nMedia,
      bmp.bio.dGravel, design.nGravel, bmp.bio.dPond,
    ).value;
    const rv = sv * design.retMultiplier;
    const cda = cdas.find(c => c.cdaId === bmp.cdaId);
    return cda ? Math.min(rv, maxBmpCredit(cda.postIn).value) : rv;
  }
  if ((bmp.type === 'Planted Trees' || bmp.type === 'Preserve Trees') && bmp.trees) {
    return treeRetentionCredit(bmp.trees, params.treeCredits).value;
  }
  return 0;
}

export function rvProvidedPerSda(bmps, cdas, params) {
  const out = {};
  for (const bmp of bmps) {
    const rv = _rvForBmp(bmp, cdas, params);
    if (!rv) continue;
    out[bmp.sdaId] = (out[bmp.sdaId] || 0) + rv;
  }
  return out;
}

export function rvProvidedPerBmp(bmps, cdas, params) {
  return bmps.map(bmp => ({
    name: bmp.name,
    type: bmp.type,
    subType: bmp.subType,
    sdaId: bmp.sdaId,
    cdaId: bmp.cdaId,
    rvCf: _rvForBmp(bmp, cdas, params),
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
cd summary_calculator
node --test tests/aggregate.test.mjs
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Refactor `buildDeck()` in `ui.mjs` to use the helper**

In `summary_calculator/src/ui.mjs`:

Add to the import block near the top:
```javascript
import { rvProvidedPerSda } from './aggregate.mjs';
```

Remove this unused import list — keep only what's still used after refactor:
```javascript
import {
  siteAggregateLandCover, siteSwrv, eisaDirectTotalVolumeCf, detentionSummary,
  swrvVolume,
} from './calc.mjs';
```
(Drop `ppSizingSv, bioSizingSv, maxBmpCredit, treeRetentionCredit` — now encapsulated in `aggregate.mjs`.)

Replace lines 38–71 (the whole `rvBySda` + per-BMP loop block) with:

```javascript
  const rvBySda = rvProvidedPerSda(bmps, cdas, params);
  const complianceRows = Object.keys(bySda).map(sdaId => ({
    sdaId,
    swrvReqCf:    swrvVolume(bySda[sdaId], project.rainfallIn).value,
    rvProvidedCf: rvBySda[sdaId] || 0,
  }));
```

- [ ] **Step 6: Run the smoke test to confirm no regression**

```
cd summary_calculator
node build.js
node --test tests/
npx playwright test
```

Expected: existing tests all PASS; the dropzone test from Task 1 still PASSES.

- [ ] **Step 7: Commit**

```
git add summary_calculator/src/aggregate.mjs summary_calculator/tests/aggregate.test.mjs summary_calculator/src/ui.mjs summary_calculator/summary-calculator.html
git commit -m "summary: extract rvProvidedPerSda helper into aggregate.mjs"
```

---

## Task 3 — SDA/CDA 4-sheet split with LOD columns

Replace `renderSdaCdaSummary(project, sdas, cdas)` (returns 1–2 pages) with four separate render functions, each returning 1+ pages (chunked by `SDA_ROWS_PER_PAGE`).

**Files:**
- Modify: `summary_calculator/src/render.mjs` (replace `renderSdaCdaSummary`)
- Modify: `summary_calculator/src/ui.mjs:74,84,94` (deck assembly)
- Modify: `summary_calculator/tests/render.test.mjs` (new tests)
- Modify: `summary_calculator/tests/browser-smoke.mjs` (if it hardcodes expected sheet count — currently it only checks `> 5`, so fine)

- [ ] **Step 1: Write failing render tests**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
import {
  renderSdaPreSheet, renderSdaPostSheet,
  renderCdaPreSheet, renderCdaPostSheet,
} from '../src/render.mjs';

const sampleSdas = [
  { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D',
    preIn: 3200, preOut: 450, postIn: 2800, postOut: 500 },
  { sdaId: 'SDA-2', inProw: 'No', landUse: 'Natural (Woods)', hsg: 'C',
    preIn: 800, preOut: 1100, postIn: 0, postOut: 1100 },
];
const sampleCdas = [
  { cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular',
    preIn: 2000, preOut: 300, postIn: 1600, postOut: 400 },
];

test('renderSdaPreSheet: title says Pre, columns show Inside/Outside LOD', () => {
  const [html] = renderSdaPreSheet(sampleProject, sampleSdas);
  assert.ok(html.includes('Pre-development'));
  assert.ok(html.includes('Inside LOD'));
  assert.ok(html.includes('Outside LOD'));
  assert.ok(html.includes('3,200')); // preIn SDA-1
  assert.ok(html.includes('450'));   // preOut SDA-1
  assert.ok(!html.includes('Pre In')); // old header must be gone
});

test('renderSdaPostSheet: title says Post, shows post values not pre', () => {
  const [html] = renderSdaPostSheet(sampleProject, sampleSdas);
  assert.ok(html.includes('Post-development'));
  assert.ok(html.includes('2,800')); // postIn SDA-1
  assert.ok(html.includes('500'));   // postOut SDA-1
});

test('renderCdaPreSheet: has CDA, SDA, Land Use columns and pre values', () => {
  const [html] = renderCdaPreSheet(sampleProject, sampleCdas);
  assert.ok(html.includes('CDA'));
  assert.ok(html.includes('Pre-development'));
  assert.ok(html.includes('2,000')); // preIn CDA-1
  assert.ok(html.includes('300'));   // preOut CDA-1
});

test('renderCdaPostSheet: shows post values', () => {
  const [html] = renderCdaPostSheet(sampleProject, sampleCdas);
  assert.ok(html.includes('Post-development'));
  assert.ok(html.includes('1,600')); // postIn CDA-1
  assert.ok(html.includes('400'));   // postOut CDA-1
});

test('renderSdaPreSheet: chunks when more than SDA_ROWS_PER_PAGE rows', () => {
  const many = Array.from({ length: 35 }, (_, i) => ({
    sdaId: `SDA-${i+1}`, inProw: 'No', landUse: 'Natural (Woods)', hsg: 'C',
    preIn: 100, preOut: 50, postIn: 100, postOut: 50,
  }));
  const pages = renderSdaPreSheet(sampleProject, many);
  assert.equal(pages.length, 2);
  assert.ok(pages[0].includes('part 1/2'));
  assert.ok(pages[1].includes('part 2/2'));
});

test('renderCdaPreSheet: returns [] when no CDAs', () => {
  assert.deepEqual(renderCdaPreSheet(sampleProject, []), []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd summary_calculator
node --test tests/render.test.mjs
```

Expected: FAIL — `renderSdaPreSheet`, `renderSdaPostSheet`, `renderCdaPreSheet`, `renderCdaPostSheet` not exported.

- [ ] **Step 3: Add the four render functions**

In `summary_calculator/src/render.mjs`, delete the existing `renderSdaCdaSummary` (lines 136–174) and replace with:

```javascript
const SDA_ROWS_PER_PAGE = 30;

function _chunkPages(rows, title, sub, headers, mapRow, pageTitle, footer) {
  if (!rows.length) return [];
  const pages = [];
  const total = Math.ceil(rows.length / SDA_ROWS_PER_PAGE);
  for (let i = 0; i < rows.length; i += SDA_ROWS_PER_PAGE) {
    const chunk = rows.slice(i, i + SDA_ROWS_PER_PAGE);
    const partIdx = Math.floor(i / SDA_ROWS_PER_PAGE) + 1;
    const label = total > 1 ? `${title}  (part ${partIdx}/${total})` : title;
    const body = renderBlock(label, renderDataTable(headers, chunk.map(mapRow)));
    pages.push(renderSheetShell({ title: pageTitle, sub, body, footer }));
  }
  return pages;
}

export function renderSdaPreSheet(project, sdas) {
  return _chunkPages(
    sdas,
    'SDA LAND COVER — PRE-DEVELOPMENT',
    project.name || '',
    ['SDA', 'In PROW', 'Land Use', 'HSG', 'Inside LOD (sf)', 'Outside LOD (sf)'],
    (r) => [r.sdaId, r.inProw ?? '', r.landUse, r.hsg, fmtN(r.preIn), fmtN(r.preOut)],
    'SDA — Pre-development',
    '21 DCMR §599 · SWRv is calculated per SDA.',
  );
}

export function renderSdaPostSheet(project, sdas) {
  return _chunkPages(
    sdas,
    'SDA LAND COVER — POST-DEVELOPMENT',
    project.name || '',
    ['SDA', 'In PROW', 'Land Use', 'HSG', 'Inside LOD (sf)', 'Outside LOD (sf)'],
    (r) => [r.sdaId, r.inProw ?? '', r.landUse, r.hsg, fmtN(r.postIn), fmtN(r.postOut)],
    'SDA — Post-development',
    '21 DCMR §599 · SWRv is calculated per SDA.',
  );
}

export function renderCdaPreSheet(project, cdas) {
  return _chunkPages(
    cdas,
    'CDA — CONTRIBUTING DRAINAGE AREAS — PRE-DEVELOPMENT',
    project.name || '',
    ['CDA', 'SDA', 'Land Use', 'Inside LOD (sf)', 'Outside LOD (sf)'],
    (c) => [c.cdaId, c.sdaId, c.landUse, fmtN(c.preIn), fmtN(c.preOut)],
    'CDA — Pre-development',
    'Max BMP credit = CDA area × 1.7″ / 12',
  );
}

export function renderCdaPostSheet(project, cdas) {
  return _chunkPages(
    cdas,
    'CDA — CONTRIBUTING DRAINAGE AREAS — POST-DEVELOPMENT',
    project.name || '',
    ['CDA', 'SDA', 'Land Use', 'Inside LOD (sf)', 'Outside LOD (sf)'],
    (c) => [c.cdaId, c.sdaId, c.landUse, fmtN(c.postIn), fmtN(c.postOut)],
    'CDA — Post-development',
    'Max BMP credit = CDA area × 1.7″ / 12',
  );
}
```

- [ ] **Step 4: Rewire the deck builder in `ui.mjs`**

Update the import in `ui.mjs:8–13`:

```javascript
import {
  renderCoverSheet, renderSiteDaSheet, renderSiteSwrvSheet,
  renderSdaPreSheet, renderSdaPostSheet, renderCdaPreSheet, renderCdaPostSheet,
  renderBmpSheets,
  renderMepSheet, renderEisa438Sheet,
  renderDetentionSheet, renderCompliancePage,
} from './render.mjs';
```

Replace `ui.mjs:74` (the `sdaCdaPages` assignment and later references at lines 84 and 94):

```javascript
  // Four separate SDA/CDA pages.
  const sdaPrePages  = renderSdaPreSheet(project, sdas);
  const sdaPostPages = renderSdaPostSheet(project, sdas);
  const cdaPrePages  = renderCdaPreSheet(project, cdas);
  const cdaPostPages = renderCdaPostSheet(project, cdas);
```

Replace the `laterLabels` block (around `ui.mjs:84`) section that adds `SDA/CDA Summary` labels — replace with:

```javascript
  const _labelsFor = (pages, base) =>
    pages.map((_, i) => pages.length > 1 ? `${base} (${i+1})` : base);
  laterLabels.push(..._labelsFor(sdaPrePages,  'SDA — Pre-development'));
  laterLabels.push(..._labelsFor(sdaPostPages, 'SDA — Post-development'));
  laterLabels.push(..._labelsFor(cdaPrePages,  'CDA — Pre-development'));
  laterLabels.push(..._labelsFor(cdaPostPages, 'CDA — Post-development'));
```

Replace the push loop (around `ui.mjs:94` that currently does `sdaCdaPages.forEach(...)`) with:

```javascript
  sdaPrePages.forEach((html, i)  => push(_labelsFor(sdaPrePages,  'SDA — Pre-development')[i],  html));
  sdaPostPages.forEach((html, i) => push(_labelsFor(sdaPostPages, 'SDA — Post-development')[i], html));
  cdaPrePages.forEach((html, i)  => push(_labelsFor(cdaPrePages,  'CDA — Pre-development')[i],  html));
  cdaPostPages.forEach((html, i) => push(_labelsFor(cdaPostPages, 'CDA — Post-development')[i], html));
```

- [ ] **Step 5: Run tests + rebuild + smoke test**

```
cd summary_calculator
node --test tests/render.test.mjs
node build.js
npx playwright test
```

Expected: new render tests PASS; smoke test still passes with higher nav count.

- [ ] **Step 6: Commit**

```
git add summary_calculator/src/render.mjs summary_calculator/src/ui.mjs summary_calculator/tests/render.test.mjs summary_calculator/summary-calculator.html
git commit -m "summary: split SDA/CDA into 4 pages with Inside/Outside LOD columns"
```

---

## Task 4 — MEP rework with real per-SDA metrics

Replace the "Documented × 4" placeholder table with a derived per-PROW-SDA metrics table using `rvProvidedPerSda` from Task 2.

**Files:**
- Modify: `summary_calculator/src/render.mjs` (replace `renderMepSheet`)
- Modify: `summary_calculator/src/ui.mjs:96` (pass new args)
- Modify: `summary_calculator/tests/render.test.mjs` (new tests)

- [ ] **Step 1: Write failing MEP render tests**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
import { renderMepSheet } from '../src/render.mjs';

const paramsForMep = {
  bmpDesign: { 'Bioretention / Enhanced': { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 } },
  treeCredits: {},
};

test('renderMepSheet: shows derived table when PROW SDAs exist', () => {
  const sdas = [
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 10000, postOut: 0 },
  ];
  const bmps = [
    { name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
      bio: { saTop: 500, saBot: 500, dMedia: 2, dGravel: 0.5, dPond: 0.5 } },
  ];
  const cdas = [{ cdaId: 'CDA-1', postIn: 10000 }];
  const html = renderMepSheet(sampleProject, sdas, bmps, cdas, paramsForMep);
  // MEP target: 10000 * 1.2 / 12 = 1000 cf
  assert.ok(html.includes('1,000'), `target 1000 not found; got: ${html.slice(0, 400)}`);
  // Rv provided: 500 * (2*0.4 + 0.5*0.4 + 0.5) = 500*1.5 = 750 cf
  assert.ok(html.includes('750'));
  // Deficit: 1000-750 = 250
  assert.ok(html.includes('250'));
  assert.ok(html.includes('DEFICIT') || html.includes('✓'));
  // The old placeholder text must be absent.
  assert.ok(!html.includes('Documented'));
});

test('renderMepSheet: shows "No PROW SDAs" note when none are in PROW', () => {
  const sdas = [
    { sdaId: 'SDA-1', inProw: 'No', landUse: 'Impervious Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 1000, postOut: 0 },
  ];
  const html = renderMepSheet(sampleProject, sdas, [], [], paramsForMep);
  assert.ok(html.includes('No PROW SDAs'));
});

test('renderMepSheet: aggregates impervious across land-use rows in same PROW SDA', () => {
  const sdas = [
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 6000, postOut: 0 },
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Non-Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 4000, postOut: 0 },
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Natural (Woods)', hsg: 'C',
      preIn: 0, preOut: 0, postIn: 2000, postOut: 0 }, // not counted toward MEP target
  ];
  const html = renderMepSheet(sampleProject, sdas, [], [], paramsForMep);
  // Impervious inside LOD = 6000 + 4000 = 10000; target = 10000*1.2/12 = 1000
  assert.ok(html.includes('10,000'));
  assert.ok(html.includes('1,000'));
});
```

- [ ] **Step 2: Run to verify failure**

```
cd summary_calculator
node --test tests/render.test.mjs
```

Expected: FAIL — current MEP renderer still shows "Documented".

- [ ] **Step 3: Rewrite `renderMepSheet`**

In `summary_calculator/src/render.mjs`, add the import at the top (next to the existing `./calc.mjs` import):

```javascript
import { rvProvidedPerSda } from './aggregate.mjs';
```

Then replace the whole `MEP_STEPS` constant and `renderMepSheet` function with:

```javascript
const MEP_STEPS = [
  ['Step 1', 'Treat impervious area to the Maximum Extent Practicable (SWRv-equivalent)'],
  ['Step 2', 'Evaluate alternative BMP locations where Step 1 is infeasible'],
  ['Step 3', 'Manage remaining runoff via conveyance and detention'],
  ['Step 4', 'Discharge to MS4 only if Steps 1-3 are infeasible'],
];

const IMPERVIOUS_LAND_USES = new Set([
  'Impervious Vehicular', 'Impervious Non-Vehicular', 'BMP',
]);
const MEP_TARGET_RAIN_IN = 1.2;

function _imperviousInLodByProwSda(sdas) {
  const out = {};
  for (const r of sdas) {
    if (r.inProw !== 'Yes') continue;
    if (!IMPERVIOUS_LAND_USES.has(r.landUse)) continue;
    out[r.sdaId] = (out[r.sdaId] || 0) + (r.postIn || 0);
  }
  return out;
}

export function renderMepSheet(project, sdas, bmps, cdas, params) {
  const stepsHtml = MEP_STEPS.map(([n, desc]) =>
    `<div class="cs-formula-line"><b>${esc(n)}</b> — ${esc(desc)}</div>`
  ).join('');

  const impByProwSda = _imperviousInLodByProwSda(sdas);
  const prowSdaIds = Object.keys(impByProwSda);
  if (prowSdaIds.length === 0) {
    return renderSheetShell({
      title: 'MEP Summary (PROW)',
      sub:   `${project.name || ''} · DDOT Maximum Extent Practicable`,
      body:
        renderBlock('DDOT MEP 4-STEP PROCESS', stepsHtml) +
        renderNote('No PROW SDAs in this project — MEP does not apply.'),
      footer: 'DOEE Guidebook Appendix B · DDOT GI Standards 2014',
    });
  }

  const rvBySda = rvProvidedPerSda(bmps, cdas, params);
  const headers = ['SDA', 'Impervious In LOD (sf)', 'MEP Target @ 1.2″ (cf)',
                   'Rv Provided (cf)', 'Deficit (cf)', 'Status'];
  const rows = prowSdaIds.map(sdaId => {
    const imp = impByProwSda[sdaId];
    const target = imp * MEP_TARGET_RAIN_IN / 12;
    const provided = rvBySda[sdaId] || 0;
    const deficit = Math.max(0, target - provided);
    const status = deficit <= 0 ? '✓ MET' : 'DEFICIT — document in SWMP narrative';
    return [sdaId, fmtN(imp), fmtN(target, 0), fmtN(provided, 0), fmtN(deficit, 0), status];
  });

  const body =
    renderBlock('DDOT MEP 4-STEP PROCESS', stepsHtml) +
    renderBlock('PER-PROW-SDA METRICS', renderDataTable(headers, rows)) +
    renderNote('Narrative evidence for Steps 2–4 (infiltration suitability, infrastructure constraints, BMP placement rationale) lives in the DDOT MEP Worksheet file produced by the populator. This page summarizes derivable numerical metrics only.');

  return renderSheetShell({
    title: 'MEP Summary (PROW)',
    sub:   `${project.name || ''} · DDOT Maximum Extent Practicable`,
    body,
    footer: 'DOEE Guidebook Appendix B · DDOT GI Standards 2014',
  });
}
```

- [ ] **Step 4: Update the caller in `ui.mjs`**

Replace line 96 of `ui.mjs`:
```javascript
  push('MEP Summary', renderMepSheet(project, sdas));
```
with:
```javascript
  push('MEP Summary', renderMepSheet(project, sdas, bmps, cdas, params));
```

- [ ] **Step 5: Run tests + smoke test**

```
cd summary_calculator
node --test tests/render.test.mjs
node build.js
npx playwright test
```

Expected: new MEP tests PASS; smoke still passes.

- [ ] **Step 6: Commit**

```
git add summary_calculator/src/render.mjs summary_calculator/src/ui.mjs summary_calculator/tests/render.test.mjs summary_calculator/summary-calculator.html
git commit -m "summary: MEP page shows per-PROW-SDA target vs provided vs deficit"
```

---

## Task 5 — EISA calc traces (Direct + TR-55)

Add two new calc functions returning the `{value, units, steps, perRow}` shape so renderers can display step-by-step math.

**Files:**
- Modify: `summary_calculator/src/calc.mjs` (add functions)
- Modify: `summary_calculator/tests/calc.test.mjs` (new tests)

- [ ] **Step 1: Write failing calc tests**

Append to `summary_calculator/tests/calc.test.mjs`:

```javascript
import { eisaDirectVolumeTraceCf, tr55VolumeTraceCf } from '../src/calc.mjs';

test('eisaDirectVolumeTraceCf: perRow entries + totals match scalar engine', () => {
  const rows = [
    { area: 1000, landUse: 'Impervious Vehicular', hsg: 'D' },
    { area: 2000, landUse: 'Natural (Woods)',      hsg: 'B' },
  ];
  const result = eisaDirectVolumeTraceCf(rows, 1.7);
  assert.equal(result.perRow.length, 2);
  // Impervious: depth = 1.7 - 0.1 = 1.6 in; volume = 1000 * 1.6 / 12 ≈ 133.33 cf
  assert.ok(Math.abs(result.perRow[0].volumeCf - 1000 * 1.6 / 12) < 0.01);
  // Natural HSG B: depth = max(0, 1.7 - 0.2 - Horton_B); Horton_B dominates so depth = 0.
  assert.equal(result.perRow[1].volumeCf, 0);
  const expectedTotal = result.perRow.reduce((s, r) => s + r.volumeCf, 0);
  assert.ok(Math.abs(result.value - expectedTotal) < 0.001);
  assert.equal(result.units, 'cf');
});

test('tr55VolumeTraceCf: perRow entries carry CN and total volume matches scalar', () => {
  const rows = [
    { area: 1000, landUse: 'Impervious Vehicular', hsg: 'D' },
    { area: 2000, landUse: 'Natural (Woods)',      hsg: 'C' },
  ];
  const result = tr55VolumeTraceCf(rows, 1.7);
  assert.equal(result.perRow.length, 2);
  assert.equal(result.perRow[0].cn, 98);
  assert.equal(result.perRow[1].cn, 70);
  const expectedTotal = result.perRow.reduce((s, r) => s + r.volumeCf, 0);
  assert.ok(Math.abs(result.value - expectedTotal) < 0.001);
  assert.equal(result.units, 'cf');
});

test('eisaDirectVolumeTraceCf: emits a formatted top-level steps[0] for renderTrace', () => {
  const result = eisaDirectVolumeTraceCf([
    { area: 1000, landUse: 'Impervious Vehicular', hsg: 'D' },
  ], 1.7);
  assert.ok(Array.isArray(result.steps));
  assert.ok(result.steps[0].expr.includes('depth'));
});
```

- [ ] **Step 2: Run to verify failure**

```
cd summary_calculator
node --test tests/calc.test.mjs
```

Expected: FAIL — the two functions aren't exported.

- [ ] **Step 3: Add the two functions**

Append to `summary_calculator/src/calc.mjs`:

```javascript
// ─── Trace variants used by EISA render pages ───────────────────────────────

export function eisaDirectVolumeTraceCf(rows, P) {
  const perRow = rows.map(r => {
    const depth = eisaDirectRunoffDepth(r.landUse, r.hsg, P);
    return {
      landUse: r.landUse,
      hsg: r.hsg,
      area: r.area,
      depthIn: depth,
      volumeCf: r.area * depth / 12,
    };
  });
  const value = perRow.reduce((s, r) => s + r.volumeCf, 0);
  return {
    value,
    units: 'cf',
    perRow,
    steps: [
      { expr: 'EISA Direct — total runoff = Σ (A_i × depth_i / 12)',
        sub:  `Σ over ${perRow.length} rows`,
        eval: `${perRow.map(r => `${r.area}·${r.depthIn.toFixed(3)}/12`).join(' + ')}`,
        result: value },
    ],
  };
}

export function tr55VolumeTraceCf(rows, P) {
  const perRow = rows.map(r => {
    const cnRow = CN[r.landUse];
    if (!cnRow || cnRow[r.hsg] == null) {
      throw new Error(`No CN entry for ('${r.landUse}', '${r.hsg}')`);
    }
    const cn = cnRow[r.hsg];
    const depth = tr55RunoffDepth(P, cn);
    return {
      landUse: r.landUse,
      hsg: r.hsg,
      area: r.area,
      cn,
      depthIn: depth,
      volumeCf: r.area * depth / 12,
    };
  });
  const value = perRow.reduce((s, r) => s + r.volumeCf, 0);
  return {
    value,
    units: 'cf',
    perRow,
    steps: [
      { expr: 'TR-55 — Q = (P − 0.2S)² / (P + 0.8S)   where S = 1000/CN − 10',
        sub:  `Σ over ${perRow.length} rows (A × Q / 12)`,
        eval: `${perRow.map(r => `${r.area}·${r.depthIn.toFixed(3)}/12`).join(' + ')}`,
        result: value },
    ],
  };
}
```

- [ ] **Step 4: Run tests + verify pass**

```
cd summary_calculator
node --test tests/calc.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```
git add summary_calculator/src/calc.mjs summary_calculator/tests/calc.test.mjs
git commit -m "summary: add EISA Direct + TR-55 volume trace functions"
```

---

## Task 6 — EISA render split (3 pages) + rewire deck

Replace `renderEisa438Sheet` with three new render functions. The deck builder in `ui.mjs` computes direct + tr55 totals for pre and post, plus BMP storage, then calls the three renderers.

**Files:**
- Modify: `summary_calculator/src/render.mjs` (3 new render functions, delete `renderEisa438Sheet`)
- Modify: `summary_calculator/src/ui.mjs` (deck builder)
- Modify: `summary_calculator/tests/render.test.mjs` (new tests)

- [ ] **Step 1: Write failing EISA render tests**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
import {
  renderEisaDirectSheet, renderEisaTr55Sheet, renderEisaComplianceSheet,
} from '../src/render.mjs';
import { eisaDirectVolumeTraceCf, tr55VolumeTraceCf } from '../src/calc.mjs';

const eisaRows = [
  { area: 10000, landUse: 'Impervious Vehicular', hsg: 'D' },
  { area:  5000, landUse: 'Natural (Woods)',      hsg: 'C' },
];
const preDirect  = eisaDirectVolumeTraceCf(eisaRows, 1.7);
const postDirect = eisaDirectVolumeTraceCf(eisaRows, 1.7);
const preTr55    = tr55VolumeTraceCf(eisaRows, 1.7);
const postTr55   = tr55VolumeTraceCf(eisaRows, 1.7);

test('renderEisaDirectSheet: shows pre and post per-row tables', () => {
  const html = renderEisaDirectSheet(sampleProject, preDirect, postDirect);
  assert.ok(html.includes('EISA §438'));
  assert.ok(html.includes('Direct Determination'));
  assert.ok(html.includes('Impervious Vehicular'));
  assert.ok(html.includes('Natural (Woods)'));
  // Δ should be 0 (same pre/post inputs)
  assert.ok(html.includes('Δ'));
});

test('renderEisaTr55Sheet: shows CN column and TR-55 formulas', () => {
  const html = renderEisaTr55Sheet(sampleProject, preTr55, postTr55);
  assert.ok(html.includes('TR-55'));
  assert.ok(html.includes('CN'));
  // Impervious CN = 98
  assert.ok(html.includes('98'));
});

test('renderEisaComplianceSheet: lists BMP storage, both methods, elected method', () => {
  const bmpStorage = [
    { name: 'B-1', type: 'Bioretention', sdaId: 'SDA-1', rvCf: 500 },
    { name: 'T-1', type: 'Planted Trees', sdaId: 'SDA-1', rvCf: 40 },
  ];
  const html = renderEisaComplianceSheet(
    sampleProject,
    { preCf: 100, postCf: 150, deltaCf: 50 },  // direct
    { preCf: 120, postCf: 180, deltaCf: 60 },  // tr55
    bmpStorage,
    'Direct Determination',
  );
  assert.ok(html.includes('B-1'));
  assert.ok(html.includes('T-1'));
  assert.ok(html.includes('540'));           // total BMP storage
  assert.ok(html.includes('Direct Determination'));
  assert.ok(html.includes('TR-55'));
  assert.ok(html.includes('Elected method'));
});
```

- [ ] **Step 2: Run tests to verify failure**

```
cd summary_calculator
node --test tests/render.test.mjs
```

Expected: FAIL — the three new renderers don't exist.

- [ ] **Step 3: Replace `renderEisa438Sheet` with three new functions**

In `summary_calculator/src/render.mjs`, delete the existing `renderEisa438Sheet` (lines 409–431) and add:

```javascript
function _eisaDirectTableRows(trace) {
  return trace.perRow.map(r => [
    r.landUse, r.hsg, fmtN(r.area), r.depthIn.toFixed(3), fmtN(r.volumeCf, 0),
  ]);
}

function _eisaTr55TableRows(trace) {
  return trace.perRow.map(r => [
    r.landUse, r.hsg, fmtN(r.area), r.cn, r.depthIn.toFixed(3), fmtN(r.volumeCf, 0),
  ]);
}

export function renderEisaDirectSheet(project, pre, post) {
  const headers = ['Land Use', 'HSG', 'Area (sf)', 'Depth @ 1.7″ (in)', 'Volume (cf)'];
  const delta = post.value - pre.value;
  const pass  = delta <= 0;
  const body =
    renderBlock('PRE-DEVELOPMENT', renderDataTable(headers, _eisaDirectTableRows(pre))) +
    renderResult('Pre total', pre.value, 'cf', true) +
    renderBlock('POST-DEVELOPMENT', renderDataTable(headers, _eisaDirectTableRows(post))) +
    renderResult('Post total', post.value, 'cf', true) +
    renderResult(pass ? 'Δ ≤ 0 — Direct method passes (pre-BMP)' : 'Δ > 0 — relies on BMP storage',
                 delta, 'cf', pass) +
    renderNote('Depth deductions: impervious loses 0.1″ to depression; pervious loses 0.2″ depression + Horton infiltration (24 hr). See EISA §438 TG (EPA, Dec 2009).');
  return renderSheetShell({
    title: 'EISA §438 — Direct Determination',
    sub:   `${project.name || ''} · 95th percentile storm = 1.7″`,
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009)',
  });
}

export function renderEisaTr55Sheet(project, pre, post) {
  const headers = ['Land Use', 'HSG', 'Area (sf)', 'CN', 'Depth @ 1.7″ (in)', 'Volume (cf)'];
  const delta = post.value - pre.value;
  const pass  = delta <= 0;
  const formula =
    '<div class="cs-formula-line">S  = 1000 / CN − 10</div>' +
    '<div class="cs-formula-line">Ia = 0.2 · S</div>' +
    '<div class="cs-formula-line">Q  = (P − Ia)² / (P − Ia + S)   if P > Ia, else 0</div>';
  const body =
    renderBlock('TR-55 FORMULAS', formula) +
    renderBlock('PRE-DEVELOPMENT', renderDataTable(headers, _eisaTr55TableRows(pre))) +
    renderResult('Pre total', pre.value, 'cf', true) +
    renderBlock('POST-DEVELOPMENT', renderDataTable(headers, _eisaTr55TableRows(post))) +
    renderResult('Post total', post.value, 'cf', true) +
    renderResult(pass ? 'Δ ≤ 0 — TR-55 method passes (pre-BMP)' : 'Δ > 0 — relies on BMP storage',
                 delta, 'cf', pass) +
    renderNote('CN values from PARAMS table (SCS method). Impervious CN = 98 for all HSGs.');
  return renderSheetShell({
    title: 'EISA §438 — TR-55 (SCS CN method)',
    sub:   `${project.name || ''} · 95th percentile storm = 1.7″`,
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009) · TR-55 1986',
  });
}

export function renderEisaComplianceSheet(project, direct, tr55, bmpStorage, electedMethod) {
  const bmpHeaders = ['BMP', 'Type', 'SDA', 'Rv Provided (cf)'];
  const bmpRows = bmpStorage.map(b => [b.name, b.type, b.sdaId, fmtN(b.rvCf, 0)]);
  const bmpTotal = bmpStorage.reduce((s, b) => s + (b.rvCf || 0), 0);
  bmpRows.push(['', '', 'TOTAL', fmtN(bmpTotal, 0)]);

  const directNet = direct.deltaCf - bmpTotal;
  const tr55Net   = tr55.deltaCf   - bmpTotal;
  const comparison = [
    ['Direct Determination', fmtN(direct.preCf, 0), fmtN(direct.postCf, 0), fmtN(direct.deltaCf, 0),
      fmtN(directNet, 0), directNet <= 0 ? '✓ PASS' : '✗ FAIL'],
    ['TR-55 (SCS CN)',       fmtN(tr55.preCf, 0),   fmtN(tr55.postCf, 0),   fmtN(tr55.deltaCf, 0),
      fmtN(tr55Net, 0),   tr55Net   <= 0 ? '✓ PASS' : '✗ FAIL'],
  ];
  const cmpHeaders = ['Method', 'Pre (cf)', 'Post (cf)', 'Δ (cf)', 'Net after BMP (cf)', 'Status'];

  const electedResult =
    electedMethod && electedMethod.toLowerCase().includes('tr-55')
      ? (tr55Net <= 0 ? 'PASS' : 'FAIL')
      : (directNet <= 0 ? 'PASS' : 'FAIL');

  const body =
    renderBlock('BMP STORAGE (RETENTION CREDIT)', renderDataTable(bmpHeaders, bmpRows)) +
    renderBlock('METHOD COMPARISON', renderDataTable(cmpHeaders, comparison)) +
    renderNote(`Elected method: ${electedMethod || '(not specified in PROJECT!B11)'} — ${electedResult}`);
  return renderSheetShell({
    title: 'EISA §438 — Compliance with BMP Storage',
    sub:   project.name || '',
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009)',
  });
}
```

- [ ] **Step 4: Rewire the deck builder in `ui.mjs`**

Update `summary_calculator/src/ui.mjs` imports:

```javascript
import {
  siteAggregateLandCover, siteSwrv, detentionSummary, swrvVolume,
  eisaDirectVolumeTraceCf, tr55VolumeTraceCf,
} from './calc.mjs';
import { rvProvidedPerSda, rvProvidedPerBmp } from './aggregate.mjs';
import {
  renderCoverSheet, renderSiteDaSheet, renderSiteSwrvSheet,
  renderSdaPreSheet, renderSdaPostSheet, renderCdaPreSheet, renderCdaPostSheet,
  renderBmpSheets,
  renderMepSheet,
  renderEisaDirectSheet, renderEisaTr55Sheet, renderEisaComplianceSheet,
  renderDetentionSheet, renderCompliancePage,
} from './render.mjs';
```

Remove the old `preCf`/`postCf`/`eisa` lines (previously at `ui.mjs:31–33`). Replace with:

```javascript
  const preRows  = sdas.map(r => ({ area: r.preIn,  landUse: r.landUse, hsg: r.hsg }));
  const postRows = sdas.map(r => ({ area: r.postIn, landUse: r.landUse, hsg: r.hsg }));
  const eisaDirectPre  = eisaDirectVolumeTraceCf(preRows,  1.7);
  const eisaDirectPost = eisaDirectVolumeTraceCf(postRows, 1.7);
  const eisaTr55Pre    = tr55VolumeTraceCf(preRows,  1.7);
  const eisaTr55Post   = tr55VolumeTraceCf(postRows, 1.7);
  const bmpStorage = rvProvidedPerBmp(bmps, cdas, params).filter(b => b.rvCf > 0);
  const direct = { preCf: eisaDirectPre.value, postCf: eisaDirectPost.value,
                   deltaCf: eisaDirectPost.value - eisaDirectPre.value };
  const tr55   = { preCf: eisaTr55Pre.value,   postCf: eisaTr55Post.value,
                   deltaCf: eisaTr55Post.value   - eisaTr55Pre.value };
```

Replace the EISA label + push line (around `ui.mjs:97`):

```javascript
  laterLabels.push('EISA §438 — Direct');
  laterLabels.push('EISA §438 — TR-55');
  laterLabels.push('EISA §438 — Compliance');
```

and:

```javascript
  push('EISA §438 — Direct',     renderEisaDirectSheet(project, eisaDirectPre, eisaDirectPost));
  push('EISA §438 — TR-55',      renderEisaTr55Sheet(project, eisaTr55Pre, eisaTr55Post));
  push('EISA §438 — Compliance', renderEisaComplianceSheet(project, direct, tr55, bmpStorage, project.eisa));
```

Delete the previous single `push('EISA §438', renderEisa438Sheet(...));` line.

- [ ] **Step 5: Run tests + smoke test**

```
cd summary_calculator
node --test tests/
node build.js
npx playwright test
```

Expected: all PASS; sidebar nav count grew by 2.

- [ ] **Step 6: Commit**

```
git add summary_calculator/src/render.mjs summary_calculator/src/ui.mjs summary_calculator/tests/render.test.mjs summary_calculator/summary-calculator.html
git commit -m "summary: split EISA into Direct, TR-55, and Compliance pages"
```

---

## Task 7 — Executive Summary page

New page at index 1 (right after cover) showing site DA roll-up, per-SDA SWRv compliance, EISA Direct + TR-55 results.

**Files:**
- Modify: `summary_calculator/src/render.mjs` (new `renderExecutiveSummarySheet`)
- Modify: `summary_calculator/src/ui.mjs` (insert into deck at position 1)
- Modify: `summary_calculator/tests/render.test.mjs` (new tests)

- [ ] **Step 1: Write failing test**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
import { renderExecutiveSummarySheet } from '../src/render.mjs';

test('renderExecutiveSummarySheet: shows DA block, SWRv per-SDA, EISA both methods', () => {
  const agg = {
    pre:  { natural: 500, compacted: 0, impervious: 1000, bmp: 0 },
    post: { natural: 0,   compacted: 0, impervious: 1500, bmp: 0 },
    preTotal: 1500, postTotal: 1500, impPctPre: 66.7, impPctPost: 100,
  };
  const complianceRows = [
    { sdaId: 'SDA-1', swrvReqCf: 100, rvProvidedCf: 150 },
    { sdaId: 'SDA-2', swrvReqCf: 200, rvProvidedCf: 100 },
  ];
  const direct = { preCf: 50, postCf: 80, deltaCf: 30, netCf: -20, pass: true };
  const tr55   = { preCf: 60, postCf: 90, deltaCf: 30, netCf: -20, pass: true };
  const html = renderExecutiveSummarySheet(sampleProject, agg, complianceRows,
                                            direct, tr55, 'Direct Determination');
  assert.ok(html.includes('Executive Summary'));
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('SDA-2'));
  assert.ok(html.includes('66.7%') || html.includes('67%'));
  assert.ok(html.includes('Direct Determination'));
  assert.ok(html.includes('TR-55'));
  assert.ok(html.includes('Elected'));
});
```

- [ ] **Step 2: Run to verify failure**

```
cd summary_calculator
node --test tests/render.test.mjs
```

Expected: FAIL — function not exported.

- [ ] **Step 3: Add the renderer**

Append to `summary_calculator/src/render.mjs`:

```javascript
export function renderExecutiveSummarySheet(project, agg, complianceRows, direct, tr55, electedMethod) {
  // Block A — Site DA roll-up.
  const daHeaders = ['Land Cover', 'Pre (sf)', 'Post (sf)', 'Δ (sf)'];
  const daRows = [
    ['Natural (Woods)',   fmtN(agg.pre.natural),    fmtN(agg.post.natural),    fmtN(agg.post.natural    - agg.pre.natural)],
    ['Compacted (Open)',  fmtN(agg.pre.compacted),  fmtN(agg.post.compacted),  fmtN(agg.post.compacted  - agg.pre.compacted)],
    ['Impervious',        fmtN(agg.pre.impervious), fmtN(agg.post.impervious), fmtN(agg.post.impervious - agg.pre.impervious)],
    ['BMP',               fmtN(agg.pre.bmp),        fmtN(agg.post.bmp),        fmtN(agg.post.bmp        - agg.pre.bmp)],
    ['TOTAL LOD',         fmtN(agg.preTotal),       fmtN(agg.postTotal),       fmtN(agg.postTotal       - agg.preTotal)],
  ];
  const daKv = renderKvTable([
    ['Pre impervious %',  fmtN(agg.impPctPre, 1) + '%'],
    ['Post impervious %', fmtN(agg.impPctPost, 1) + '%'],
  ]);

  // Block B — Per-SDA SWRv.
  const swrvHeaders = ['SDA', 'SWRv Required (cf)', 'Rv Provided (cf)', '% Met', 'Status'];
  const swrvRows = complianceRows.map(r => {
    const pct = r.swrvReqCf > 0 ? (r.rvProvidedCf / r.swrvReqCf * 100) : 0;
    const pass = r.rvProvidedCf >= r.swrvReqCf || r.swrvReqCf === 0;
    return [r.sdaId, fmtN(r.swrvReqCf, 0), fmtN(r.rvProvidedCf, 0),
            fmtN(pct, 0) + '%', pass ? '✓' : '✗'];
  });
  const totalReq      = complianceRows.reduce((s, r) => s + r.swrvReqCf, 0);
  const totalProvided = complianceRows.reduce((s, r) => s + r.rvProvidedCf, 0);
  swrvRows.push([
    'SITE TOTAL',
    fmtN(totalReq, 0),
    fmtN(totalProvided, 0),
    fmtN(totalReq > 0 ? totalProvided / totalReq * 100 : 0, 0) + '%',
    totalProvided >= totalReq ? '✓ PASS' : '✗ FAIL',
  ]);

  // Block C — EISA.
  const eisaKv = renderKvTable([
    ['Direct — Pre',  fmtN(direct.preCf, 0) + ' cf'],
    ['Direct — Post', fmtN(direct.postCf, 0) + ' cf'],
    ['Direct — Δ (post − pre)',        fmtN(direct.deltaCf, 0) + ' cf'],
    ['Direct — Net after BMP storage', fmtN(direct.netCf, 0) + ' cf · ' + (direct.pass ? '✓' : '✗')],
    ['TR-55 — Pre',  fmtN(tr55.preCf, 0) + ' cf'],
    ['TR-55 — Post', fmtN(tr55.postCf, 0) + ' cf'],
    ['TR-55 — Δ (post − pre)',        fmtN(tr55.deltaCf, 0) + ' cf'],
    ['TR-55 — Net after BMP storage', fmtN(tr55.netCf, 0) + ' cf · ' + (tr55.pass ? '✓' : '✗')],
    ['Elected method', electedMethod || '(not specified)'],
  ]);

  const body =
    renderBlock('SITE DA — LAND COVER ROLL-UP', renderDataTable(daHeaders, daRows) + daKv) +
    renderBlock('PER-SDA SWRv COMPLIANCE',       renderDataTable(swrvHeaders, swrvRows)) +
    renderBlock('EISA §438 RESULT',              eisaKv);

  return renderSheetShell({
    title: 'Executive Summary',
    sub:   `${project.name || ''} · ${project.number || ''}`,
    body,
    footer: '21 DCMR §599 · EISA §438 · DOEE Guidebook Jan 2020',
  });
}
```

- [ ] **Step 4: Wire into the deck in `ui.mjs`**

In `summary_calculator/src/ui.mjs`:

Update the import list to add `renderExecutiveSummarySheet` to the `./render.mjs` import.

In `buildDeck()`, after the existing `const direct = …` / `const tr55 = …` lines added in Task 6, add:

```javascript
  const bmpTotalCf = bmpStorage.reduce((s, b) => s + b.rvCf, 0);
  const directWithNet = { ...direct, netCf: direct.deltaCf - bmpTotalCf,
                          pass: (direct.deltaCf - bmpTotalCf) <= 0 };
  const tr55WithNet   = { ...tr55,   netCf: tr55.deltaCf   - bmpTotalCf,
                          pass: (tr55.deltaCf   - bmpTotalCf) <= 0 };
```

Insert the Executive Summary page right after Cover and before Site DA. Update `laterLabels` to add it first:

```javascript
  const laterLabels = [];
  laterLabels.push('Executive Summary');
  laterLabels.push('Site DA — Land Cover');
  // … rest unchanged
```

And update the push order:

```javascript
  push('Cover', renderCoverSheet(project, laterLabels));
  push('Executive Summary', renderExecutiveSummarySheet(
    project, agg, complianceRows, directWithNet, tr55WithNet, project.eisa,
  ));
  push('Site DA — Land Cover', renderSiteDaSheet(project, agg));
  // … rest unchanged
```

- [ ] **Step 5: Run tests + smoke test**

```
cd summary_calculator
node --test tests/
node build.js
npx playwright test
```

Expected: all PASS; sidebar nav grew by 1.

- [ ] **Step 6: Commit**

```
git add summary_calculator/src/render.mjs summary_calculator/src/ui.mjs summary_calculator/tests/render.test.mjs summary_calculator/summary-calculator.html
git commit -m "summary: add Executive Summary page (DA roll-up + SWRv + EISA)"
```

---

## Task 8 — Populator fan-out of SWMP-BMP Calc

Mapping's `build()` returns `fanOut: [{filename, cells}]`; orchestrator detects this and emits N outputs from one blank.

**Files:**
- Modify: `populator/src/populate.mjs` (recognize `fanOut`)
- Modify: `populator/src/mappings/swmp-bmp-calc.mjs` (return `fanOut`)
- Modify: `populator/src/ui.mjs` (download button needs unique key)
- Modify: `populator/tests/mappings/swmp-bmp-calc.test.mjs` (new assertions)
- Modify: `populator/tests/populate.test.mjs` (update expected count)
- Modify: `populator/tests/browser-smoke.mjs` (update expected row count)

- [ ] **Step 1: Write failing mapping test (expect N outputs, one per BMP)**

Replace `populator/tests/mappings/swmp-bmp-calc.test.mjs` entirely with:

```javascript
// tests/mappings/swmp-bmp-calc.test.mjs
//
// Fan-out behavior: Minnesota Ave fixture has 4 PP + 4 Bio + 7 Trees = 15 BMPs
// of supported types → applyMapping must produce 15 output files, each with
// only its one BMP's cells populated on its one type-specific sheet.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const jszipSrc = await readFile(join(__dirname, '..', '..', 'lib', 'jszip.min.js'), 'utf8');
globalThis.JSZip = new Function(jszipSrc + '; return JSZip;')();
const sheetjsSrc = await readFile(join(__dirname, '..', '..', 'lib', 'sheetjs-bundle.js'), 'utf8');
const XLSX = new Function(sheetjsSrc + '; return XLSX;')();

const { applyMapping } = await import('../../src/populate.mjs');
const { openXlsx, readCell } = await import('../../src/xlsx-surgical.mjs');
const { target: mapping } = await import('../../src/mappings/swmp-bmp-calc.mjs');

const fixtureBytes = await readFile(join(__dirname, '..', 'fixtures', 'minnesota-ave.xlsx'));
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const blankBytes = await readFile(join(__dirname, '..', '..', 'blanks', 'swmp-bmp-calc.xlsm'));

const result = await applyMapping(mapping, wb, blankBytes);

test('swmp-bmp-calc: result exposes outputs[] for fan-out mappings', () => {
  assert.ok(Array.isArray(result.outputs), 'expected outputs[] array');
});

test('swmp-bmp-calc: 15 outputs for Minnesota Ave (4 PP + 4 Bio + 7 Trees)', () => {
  assert.equal(result.outputs.length, 15, `expected 15 outputs, got ${result.outputs.length}`);
});

test('swmp-bmp-calc: each filename includes the BMP name', () => {
  for (const o of result.outputs) {
    assert.ok(o.filename.includes('SWMP-BMP Calc Spreadsheet'));
    assert.ok(o.filename.endsWith('.xlsm'));
  }
});

test('swmp-bmp-calc: BMP-02-A (first Bioretention) file writes to C57–C66', async () => {
  const file = result.outputs.find(o => o.filename.includes('BMP-02-A'));
  assert.ok(file, 'BMP-02-A output not found');
  const bytes = Buffer.from(await file.blob.arrayBuffer());
  const populated = await openXlsx(bytes);
  assert.equal(readCell(populated, '3.6 Bioretention', 'C57'), 'Enhanced');
  assert.equal(readCell(populated, '3.6 Bioretention', 'C58'), 210);
  assert.equal(readCell(populated, '3.6 Bioretention', 'C59'), 210);
  assert.equal(readCell(populated, '3.6 Bioretention', 'C61'), 2);
  assert.equal(readCell(populated, '3.6 Bioretention', 'C63'), 0.5);
  assert.equal(readCell(populated, '3.6 Bioretention', 'C66'), 0.5);
});

test('swmp-bmp-calc: BMP-02-A file does NOT populate the PP sheet', async () => {
  const file = result.outputs.find(o => o.filename.includes('BMP-02-A'));
  const bytes = Buffer.from(await file.blob.arrayBuffer());
  const populated = await openXlsx(bytes);
  const v = readCell(populated, '3.5 Permeable Pavement', 'C57');
  assert.ok(v == null || v === '', `PP sheet should be blank in Bioretention file; got ${v}`);
});

test('swmp-bmp-calc: BMP-02-B (first Permeable Pavement) file writes to C56–C58', async () => {
  const file = result.outputs.find(o => o.filename.includes('BMP-02-B'));
  const bytes = Buffer.from(await file.blob.arrayBuffer());
  const populated = await openXlsx(bytes);
  assert.equal(readCell(populated, '3.5 Permeable Pavement', 'C56'), 'Enhanced');
  assert.equal(readCell(populated, '3.5 Permeable Pavement', 'C57'), 150);
  assert.equal(readCell(populated, '3.5 Permeable Pavement', 'C58'), 1);
});

test('swmp-bmp-calc: no "filled only first" warnings', () => {
  const bad = result.warnings.find(w => typeof w === 'string' && /filled only/i.test(w));
  assert.ok(!bad, `unexpected first-BMP warning: ${JSON.stringify(result.warnings)}`);
});

test('swmp-bmp-calc: vbaProject.bin is preserved in each output', async () => {
  for (const o of result.outputs) {
    const bytes = Buffer.from(await o.blob.arrayBuffer());
    const zip = await globalThis.JSZip.loadAsync(bytes);
    assert.ok(zip.file('xl/vbaProject.bin'),
      `${o.filename}: missing xl/vbaProject.bin`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
cd populator
node --test tests/mappings/swmp-bmp-calc.test.mjs
```

Expected: FAIL — current mapping returns `{targetId, filename, blob, warnings}`, no `outputs[]` array.

- [ ] **Step 3: Rewrite the mapping to return `fanOut`**

Replace `populator/src/mappings/swmp-bmp-calc.mjs` `build(parsed, _options)` function with:

```javascript
  build(parsed, _options) {
    const warnings = [];
    const fanOut = [];

    const typeToSheet = {
      'Permeable Pavement': '3.5 Permeable Pavement',
      'Bioretention':       '3.6 Bioretention',
      'Dry Swale':          '3.9 O-2 Dry Swale',
      'Planted Trees':      '3.14 Tree Planting Preservation',
      'Preserve Trees':     '3.14 Tree Planting Preservation',
    };

    const sanitize = (name) =>
      String(name || 'unnamed').replace(/[\/\\:*?"<>|]/g, '_');

    const usedFilenames = new Set();
    const uniqueFilename = (base) => {
      let name = base;
      let i = 2;
      while (usedFilenames.has(name)) name = base.replace(/\.xlsm$/, `-${i++}.xlsm`);
      usedFilenames.add(name);
      return name;
    };

    for (const bmp of (parsed.bmps ?? [])) {
      const sheet = typeToSheet[bmp.type];
      if (!sheet) continue;

      const cells = [];
      if (bmp.type === 'Permeable Pavement') {
        if (!bmp.pp) { warnings.push(`${bmp.name}: missing pp sub-object; skipped.`); continue; }
        cells.push(
          { sheet, ref: 'C56', value: _ppSubType(bmp.subType) },
          { sheet, ref: 'C57', value: bmp.pp.sa },
          { sheet, ref: 'C58', value: bmp.pp.dReservoir },
        );
      } else if (bmp.type === 'Bioretention') {
        if (!bmp.bio) { warnings.push(`${bmp.name}: missing bio sub-object; skipped.`); continue; }
        cells.push(
          { sheet, ref: 'C57', value: _bioSubType(bmp.subType) },
          { sheet, ref: 'C58', value: bmp.bio.saTop },
          { sheet, ref: 'C59', value: bmp.bio.saBot },
          { sheet, ref: 'C61', value: bmp.bio.dMedia },
          { sheet, ref: 'C63', value: bmp.bio.dGravel },
          { sheet, ref: 'C66', value: bmp.bio.dPond },
        );
      } else if (bmp.type === 'Dry Swale') {
        if (!bmp.bio) { warnings.push(`${bmp.name}: missing bio sub-object; skipped.`); continue; }
        cells.push(
          { sheet, ref: 'C29', value: bmp.bio.saTop },
          { sheet, ref: 'C30', value: bmp.bio.saBot },
          { sheet, ref: 'C32', value: bmp.bio.dMedia },
          { sheet, ref: 'C34', value: bmp.bio.dGravel },
          { sheet, ref: 'C36', value: bmp.bio.dPond },
        );
      } else if (bmp.type === 'Planted Trees' || bmp.type === 'Preserve Trees') {
        if (!bmp.trees) { warnings.push(`${bmp.name}: missing trees sub-object; skipped.`); continue; }
        const t = bmp.trees;
        if (t.plantedSmall)      cells.push({ sheet, ref: 'C37', value: t.plantedSmall });
        if (t.plantedLarge)      cells.push({ sheet, ref: 'C38', value: t.plantedLarge });
        if (t.preservedSmall)    cells.push({ sheet, ref: 'C39', value: t.preservedSmall });
        if (t.preservedLarge)    cells.push({ sheet, ref: 'C40', value: t.preservedLarge });
        if (t.preservedSpecial)  cells.push({ sheet, ref: 'C41', value: t.preservedSpecial });
        if (t.preservedHeritage) cells.push({ sheet, ref: 'C42', value: t.preservedHeritage });
      }

      if (cells.length === 0) continue;

      const base = `SWMP-BMP Calc Spreadsheet - ${sanitize(bmp.name)}.xlsm`;
      fanOut.push({ filename: uniqueFilename(base), cells });
    }

    return { staticCells: [], tables: [], warnings, fanOut };
  },
```

- [ ] **Step 4: Teach the orchestrator about `fanOut`**

Modify `populator/src/populate.mjs` `applyMapping()`. After the signature-check block (around line 85), **replace** the current single-output code path (from `const warnings = ...` through `return { targetId, filename, blob, warnings };`) with:

```javascript
  const warnings = [...buildWarnings];

  // Fan-out path: effective.fanOut is an array of {filename, cells}.
  // Produce one output per entry by cloning the blank bytes.
  if (Array.isArray(effective.fanOut) && effective.fanOut.length > 0) {
    const outputs = [];
    for (const entry of effective.fanOut) {
      const clonedBlank = new Uint8Array(blankBytes); // defensive copy
      const xlsx = await openXlsx(clonedBlank);
      const bySheet = {};
      for (const c of entry.cells) {
        if (c.value == null) continue;
        (bySheet[c.sheet] ??= []).push({ ref: c.ref, value: c.value });
      }
      for (const [sheet, entries] of Object.entries(bySheet)) {
        await setCells(xlsx, sheet, entries);
      }
      const blob = await saveXlsx(xlsx);
      outputs.push({ filename: entry.filename, blob });
    }
    return { targetId: mapping.id, outputs, warnings };
  }

  // Single-output path (unchanged).
  const bySheet = {};
  for (const cell of (effective.staticCells ?? [])) {
    let value;
    if ('value' in cell) {
      value = cell.value;
    } else {
      value = resolveFrom(cell.from, parsed, null, effective);
    }
    if (value == null) {
      const src = 'value' in cell ? `literal ${JSON.stringify(cell.value)}` : `source "${cell.from}"`;
      warnings.push({ ref: `${cell.sheet}!${cell.ref}`, reason: `${src} is null` });
      continue;
    }
    (bySheet[cell.sheet] ??= []).push({ ref: cell.ref, value });
  }

  for (const table of (effective.tables ?? [])) {
    const rows = rowsForTable(table, parsed);
    rows.forEach((row, i) => {
      const rowNum = table.firstDataRow + i;
      for (const col of table.columns) {
        const value = resolveFrom(col.from, parsed, row, effective);
        if (value == null) continue;
        (bySheet[table.sheet] ??= []).push({ ref: `${col.col}${rowNum}`, value });
      }
    });
  }

  for (const [sheet, entries] of Object.entries(bySheet)) {
    await setCells(xlsx, sheet, entries);
  }

  const blob = await saveXlsx(xlsx);
  return { targetId: mapping.id, filename: mapping.filename, blob, warnings };
```

Then update `populateAll()` in the same file to flatten fan-out results. Replace the `outputs.push(result);` line with:

```javascript
      if (Array.isArray(result.outputs)) {
        for (const o of result.outputs) {
          outputs.push({ targetId: result.targetId, filename: o.filename, blob: o.blob, warnings: result.warnings });
        }
      } else {
        outputs.push(result);
      }
```

- [ ] **Step 5: Fix the UI download-key collision**

In `populator/src/ui.mjs` `renderDone()`, change the per-file download button to use the array index as a unique key. Replace:

```javascript
        ${outputs.map(o => `
          <div class="result-row ${o.warnings?.length ? 'warn' : 'ok'}">
            <div class="mark">${o.warnings?.length ? '⚠' : '✓'}</div>
            <div class="label">
              ${o.filename}
              ${(o.warnings ?? []).map(w => `<div class="reason">${w}</div>`).join('')}
            </div>
            <div class="size">${(o.blob.size / 1024).toFixed(0)} KB</div>
            <button class="dl-btn" data-id="${o.targetId}">Download</button>
          </div>
        `).join('')}
```

with:

```javascript
        ${outputs.map((o, idx) => `
          <div class="result-row ${o.warnings?.length ? 'warn' : 'ok'}">
            <div class="mark">${o.warnings?.length ? '⚠' : '✓'}</div>
            <div class="label">
              ${o.filename}
              ${(o.warnings ?? []).map(w => `<div class="reason">${w}</div>`).join('')}
            </div>
            <div class="size">${(o.blob.size / 1024).toFixed(0)} KB</div>
            <button class="dl-btn" data-idx="${idx}">Download</button>
          </div>
        `).join('')}
```

And the click handler:

```javascript
  for (const btn of main.querySelectorAll('.dl-btn')) {
    btn.addEventListener('click', () => {
      const output = outputs[parseInt(btn.dataset.idx, 10)];
      downloadBlob(output.blob, output.filename);
    });
  }
```

- [ ] **Step 6: Update the end-to-end test count**

Modify `populator/tests/populate.test.mjs:71–96`. Change the expected count from 4 to 18 (3 single-output mappings + 15 fan-out BMPs). Replace:

```javascript
  assert.equal(results.outputs.length, 4, `expected 4 outputs, got ${results.outputs.length}`);
```

with:

```javascript
  // 3 single mappings (general-retention, ddot-mep, swdb-prow) + 15 fan-out BMPs
  // (4 PP + 4 Bio + 7 Trees from the Minnesota Ave fixture).
  assert.equal(results.outputs.length, 18, `expected 18 outputs, got ${results.outputs.length}`);
```

The `rainwater-harvesting` is still skipped — leave that assertion alone.

- [ ] **Step 7: Update the populator Playwright smoke test**

Check `populator/tests/browser-smoke.mjs` for any hardcoded output count. If a numeric assertion exists, bump to `18`. If it only asserts "exists", no change needed.

```
grep -nE "outputs?\.length|result-row" populator/tests/browser-smoke.mjs
```

If an assertion like `expect(resultRows).toHaveLength(4)` or `expect(results.length).toBe(4)` exists, update to 18. If not, add this smoke assertion:

```javascript
test('populator smoke: produces 18 outputs for Minnesota Ave', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('#templateInput', fixturePath);
  await page.click('#populateBtn');
  await page.waitForSelector('.result-row');
  const rows = await page.$$('.result-row.ok, .result-row.warn');
  expect(rows.length).toBe(18);
});
```

- [ ] **Step 8: Run tests**

```
cd populator
node --test tests/
```

Expected: all PASS.

```
cd populator
node build.js
npx playwright test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```
git add populator/src/mappings/swmp-bmp-calc.mjs populator/src/populate.mjs populator/src/ui.mjs populator/tests/mappings/swmp-bmp-calc.test.mjs populator/tests/populate.test.mjs populator/tests/browser-smoke.mjs populator/summary-populator.html
git commit -m "populator: fan out SWMP-BMP Calc to one xlsm per BMP"
```

---

## Final verification

- [ ] **Step 1: Run every test in both apps**

```
cd summary_calculator && node --test tests/ && npx playwright test
cd ../populator       && node --test tests/ && npx playwright test
```

Expected: all PASS.

- [ ] **Step 2: Visual walkthrough**

Open `summary_calculator/summary-calculator.html` in a browser, load `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`, and confirm:

1. Dropzone shows as a single dashed rectangle on empty state (reset first with the × button).
2. Sidebar has: Cover, Executive Summary, Site DA, Site SWRv, SDA Pre, SDA Post, CDA Pre, CDA Post, (each BMP sheet…), MEP Summary, EISA Direct, EISA TR-55, EISA Compliance, Detention Summary, Site Compliance.
3. Executive Summary shows all three blocks with values.
4. SDA/CDA pages show "Inside LOD" and "Outside LOD" columns, no "Pre In / Post In".
5. MEP page shows per-PROW-SDA Impervious / Target / Provided / Deficit rows — not "Documented".
6. EISA Direct and TR-55 pages show per-row tables; Compliance page shows BMP storage total and method comparison.

Open `populator/summary-populator.html`, load the same template, click Populate, and confirm:

1. 18 result rows (3 single-output + 15 SWMP-BMP Calc per-BMP).
2. Each SWMP-BMP Calc filename includes a BMP name.
3. ZIP download produces 18 files.
4. Opening a Bioretention output in Excel shows only its one BMP's data populated; PP and Trees sheets are blank.

---

## Self-review results

- **Spec coverage:** Six fixes in the spec; eight tasks implement them (Task 2 adds the shared helper that unblocks Tasks 4 and 7). Verified every spec section has a task.
- **Placeholder scan:** No TBD/TODO/vague items; every step has code or exact commands.
- **Type consistency:** `rvProvidedPerSda` always returns `{sdaId: cf}`; `rvProvidedPerBmp` always returns `[{name, type, subType, sdaId, cdaId, rvCf}]`; EISA trace functions always return `{value, units, perRow, steps}`; mapping fan-out always returns `{targetId, outputs: [{filename, blob}], warnings}`. Consistent across all tasks.
