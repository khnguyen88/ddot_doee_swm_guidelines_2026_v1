# Task 10 — SDA/CDA summary and BMP sheet renderers

**Goal:** The SDA/CDA land-cover summary (paginated when > 30 rows) and the per-BMP calculation sheet (inputs → Sv → Rv → compliance).

**Files:**
- Modify: `summary_calculator/src/render.mjs`
- Modify: `summary_calculator/tests/render.test.mjs`

---

- [ ] **Step 1: Append failing tests**

```js
import { renderSdaCdaSummary, renderBmpSheets } from '../src/render.mjs';

test('renderSdaCdaSummary: one SDA page + one CDA page when both are small', () => {
  const sdas = Array.from({ length: 5 }, (_, i) => ({
    sdaId: `SDA-${i+1}`, landUse: 'Impervious Vehicular', hsg: 'D',
    preIn: 100, postIn: 100,
  }));
  const cdas = [{ cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular', withinLodSf: 100 }];
  const pages = renderSdaCdaSummary(sampleProject, sdas, cdas);
  assert.equal(pages.length, 2);
  assert.ok(pages[0].includes('SDA-1'));
  assert.ok(pages[1].includes('CDA-1'));
});

test('renderSdaCdaSummary: paginates when > 30 rows', () => {
  const sdas = Array.from({ length: 65 }, (_, i) => ({
    sdaId: `SDA-${i+1}`, landUse: 'Impervious Vehicular', hsg: 'D',
    preIn: 100, postIn: 100,
  }));
  const pages = renderSdaCdaSummary(sampleProject, sdas, []);
  assert.ok(pages.length >= 3, `expected ≥3 pages, got ${pages.length}`);
});

test('renderBmpSheets: one page per BMP with 3-step math', () => {
  const bmps = [{
    name: 'BMP-02-A', sdaId: 'SDA-2', cdaId: 'CDA-2',
    type: 'Bioretention', subType: 'Enhanced',
    bio: { saTop: 210, saBot: 210, dMedia: 2.0, dGravel: 0.5, dPond: 0.5 },
  }];
  const cdas = [{ cdaId: 'CDA-2', sdaId: 'SDA-2', landUse: 'Impervious Vehicular', withinLodSf: 1000 }];
  const params = {
    bmpDesign: { 'Bioretention / Enhanced': { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 } },
    treeCredits: {},
  };
  const pages = renderBmpSheets(sampleProject, bmps, cdas, params);
  assert.equal(pages.length, 1);
  assert.ok(pages[0].includes('BMP-02-A'));
  assert.ok(pages[0].includes('Bioretention'));
  assert.ok(pages[0].includes('STEP 1'));
  assert.ok(pages[0].includes('STEP 2'));
  assert.ok(pages[0].includes('STEP 3'));
});
```

- [ ] **Step 2: Run tests, expect failure**

- [ ] **Step 3: Add the import at the top of `src/render.mjs`, then append the new renderers at the bottom**

First, add this import below the existing `esc`/`fmtN` lines near the top of `src/render.mjs`:

```js
import {
  ppSizingSv, bioSizingSv, rvFromSv, maxBmpCredit, treeRetentionCredit,
} from './calc.mjs';
```

Then append the following to the bottom of the file:

```js
const SDA_ROWS_PER_PAGE = 30;

export function renderSdaCdaSummary(project, sdas, cdas) {
  const pages = [];
  const sdaHeaders = ['SDA', 'In PROW', 'Land Use', 'HSG', 'Pre In (sf)', 'Post In (sf)'];
  const cdaHeaders = ['CDA', 'SDA', 'Land Use', 'Within LOD (sf)'];

  // Chunk SDA rows.
  for (let i = 0; i < sdas.length; i += SDA_ROWS_PER_PAGE) {
    const chunk = sdas.slice(i, i + SDA_ROWS_PER_PAGE);
    const rows = chunk.map(r => [
      r.sdaId, r.inProw ?? '', r.landUse, r.hsg,
      fmtN(r.preIn), fmtN(r.postIn),
    ]);
    const partIdx = Math.floor(i / SDA_ROWS_PER_PAGE) + 1;
    const totalParts = Math.ceil(sdas.length / SDA_ROWS_PER_PAGE);
    const body = renderBlock(
      `SDA LAND COVER${totalParts > 1 ? `  (part ${partIdx}/${totalParts})` : ''}`,
      renderDataTable(sdaHeaders, rows),
    );
    pages.push(renderSheetShell({
      title: 'SDA / CDA Summary',
      sub:   project.name || '',
      body,
      footer: '21 DCMR §599 · SWRv is calculated per SDA.',
    }));
  }

  // CDAs on their own trailing page(s).
  if (cdas.length) {
    const cdaRows = cdas.map(c => [c.cdaId, c.sdaId, c.landUse, fmtN(c.withinLodSf)]);
    const body = renderBlock('CDA — CONTRIBUTING DRAINAGE AREAS', renderDataTable(cdaHeaders, cdaRows));
    pages.push(renderSheetShell({
      title: 'CDA Summary',
      sub:   project.name || '',
      body,
      footer: 'Max BMP credit = CDA area × 1.7″ / 12',
    }));
  }
  return pages;
}

const PP_FOOTER  = 'DOEE Guidebook §3.5 · Permeable Pavement';
const BIO_FOOTER = 'DOEE Guidebook §3.6 · Bioretention / Dry Swale';
const TREE_FOOTER = 'DOEE Guidebook §3.14 · Tree Credits';

function _cdaFor(bmp, cdas) {
  return cdas.find(c => c.cdaId === bmp.cdaId);
}

function _renderPp(project, bmp, cda, params) {
  const designKey = `Permeable Pavement / ${bmp.subType}`;
  const design = params.bmpDesign[designKey] || { nReservoir: 0.40, retMultiplier: 1.0 };
  const inputsHtml = renderKvTable([
    ['BMP',           `${bmp.name} (${bmp.type} / ${bmp.subType})`],
    ['SDA',           bmp.sdaId],
    ['CDA',           bmp.cdaId || '—'],
    ['Surface Area',  `${fmtN(bmp.pp.sa)} sf`],
    ['Reservoir Depth', `${fmtN(bmp.pp.dReservoir, 2)} ft`],
    ['n_reservoir',   `${design.nReservoir}`],
    ['Ret. Multiplier', `${design.retMultiplier}`],
  ]);
  const svTrace = ppSizingSv(bmp.pp.sa, bmp.pp.dReservoir, design.nReservoir);
  const rvTrace = rvFromSv(svTrace.value, design.retMultiplier);
  const cdaArea = cda ? cda.withinLodSf : 0;
  const maxTrace = maxBmpCredit(cdaArea);
  const rvApplied = Math.min(rvTrace.value, maxTrace.value);
  const pass = rvApplied === rvTrace.value;
  return renderSheetShell({
    title: `${bmp.name} — Permeable Pavement (${bmp.subType})`,
    sub:   `${project.name || ''} · ${bmp.sdaId} · ${bmp.cdaId || ''}`,
    body:
      renderBlock('INPUTS', inputsHtml) +
      renderBlock('STEP 1 — Storage Volume (Sv)', renderTrace(svTrace)) +
      renderBlock('STEP 2 — Retention Volume (Rv)', renderTrace(rvTrace)) +
      renderBlock('STEP 3 — Compliance (Max BMP Credit cap)',
        renderTrace(maxTrace) +
        renderResult(
          pass ? 'Rv provided ≤ Max Credit — OK'
               : `Rv capped at ${fmtN(maxTrace.value, 0)} cf (Max Credit)`,
          rvApplied, 'cf', pass,
        )),
    footer: PP_FOOTER,
  });
}

function _renderBio(project, bmp, cda, params) {
  const designKey = `${bmp.type} / ${bmp.subType}`;
  const design = params.bmpDesign[designKey] || { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 };
  const inputsHtml = renderKvTable([
    ['BMP',       `${bmp.name} (${bmp.type} / ${bmp.subType})`],
    ['SDA',       bmp.sdaId],
    ['CDA',       bmp.cdaId || '—'],
    ['SA_top',    `${fmtN(bmp.bio.saTop)} sf`],
    ['SA_bot',    `${fmtN(bmp.bio.saBot)} sf`],
    ['d_media',   `${fmtN(bmp.bio.dMedia, 2)} ft`],
    ['d_gravel',  `${fmtN(bmp.bio.dGravel, 2)} ft`],
    ['d_pond',    `${fmtN(bmp.bio.dPond, 2)} ft`],
    ['n_media',   `${design.nMedia}`],
    ['n_gravel',  `${design.nGravel}`],
    ['Ret. Multiplier', `${design.retMultiplier}`],
  ]);
  const svTrace = bioSizingSv(
    bmp.bio.saBot, bmp.bio.dMedia, design.nMedia,
    bmp.bio.dGravel, design.nGravel, bmp.bio.dPond,
  );
  const rvTrace = rvFromSv(svTrace.value, design.retMultiplier);
  const cdaArea = cda ? cda.withinLodSf : 0;
  const maxTrace = maxBmpCredit(cdaArea);
  const rvApplied = Math.min(rvTrace.value, maxTrace.value);
  const pass = rvApplied === rvTrace.value;
  return renderSheetShell({
    title: `${bmp.name} — ${bmp.type} (${bmp.subType})`,
    sub:   `${project.name || ''} · ${bmp.sdaId} · ${bmp.cdaId || ''}`,
    body:
      renderBlock('INPUTS', inputsHtml) +
      renderBlock('STEP 1 — Storage Volume (Sv)', renderTrace(svTrace)) +
      renderBlock('STEP 2 — Retention Volume (Rv)', renderTrace(rvTrace)) +
      renderBlock('STEP 3 — Compliance (Max BMP Credit cap)',
        renderTrace(maxTrace) +
        renderResult(
          pass ? 'Rv provided ≤ Max Credit — OK'
               : `Rv capped at ${fmtN(maxTrace.value, 0)} cf (Max Credit)`,
          rvApplied, 'cf', pass,
        )),
    footer: BIO_FOOTER,
  });
}

function _renderTrees(project, bmp, params) {
  const trace = treeRetentionCredit(bmp.trees, params.treeCredits);
  const counts = renderKvTable([
    ['BMP',               `${bmp.name} (${bmp.type})`],
    ['SDA',               bmp.sdaId],
    ['Planted Small',     fmtN(bmp.trees.plantedSmall)],
    ['Planted Large',     fmtN(bmp.trees.plantedLarge)],
    ['Preserved Small',   fmtN(bmp.trees.preservedSmall)],
    ['Preserved Large',   fmtN(bmp.trees.preservedLarge)],
    ['Preserved Special', fmtN(bmp.trees.preservedSpecial)],
    ['Preserved Heritage',fmtN(bmp.trees.preservedHeritage)],
  ]);
  return renderSheetShell({
    title: `${bmp.name} — ${bmp.type}`,
    sub:   `${project.name || ''} · ${bmp.sdaId}`,
    body:
      renderBlock('INPUTS', counts) +
      renderBlock('RETENTION CREDIT', renderTrace(trace)) +
      renderResult('Rv Applied', trace.value, 'cf', true),
    footer: TREE_FOOTER,
  });
}

export function renderBmpSheets(project, bmps, cdas, params) {
  const pages = [];
  for (const bmp of bmps) {
    if (bmp.type === 'Permeable Pavement') {
      pages.push(_renderPp(project, bmp, _cdaFor(bmp, cdas), params));
    } else if (bmp.type === 'Bioretention' || bmp.type === 'Dry Swale') {
      pages.push(_renderBio(project, bmp, _cdaFor(bmp, cdas), params));
    } else if (bmp.type === 'Planted Trees' || bmp.type === 'Preserve Trees') {
      pages.push(_renderTrees(project, bmp, params));
    }
    // Green Roofs / Rainwater Harvesting / Impervious Disconnection are not yet
    // modelled in the workbook's BMP sheet schema (bmp.py only emits columns for
    // PP, Bio/Dry Swale, and Trees). When the schema adds those types, extend here.
  }
  return pages;
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
cd summary_calculator
node --test tests/render.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add summary_calculator/src/render.mjs summary_calculator/tests/render.test.mjs
git commit -m "summary-calculator: render SDA/CDA summary (paginated) and per-BMP sheets"
```
