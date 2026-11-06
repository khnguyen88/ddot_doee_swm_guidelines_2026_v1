# Task 09 — Cover, Site DA, Site SWRv renderers

**Goal:** Three renderers that produce the top of the deck: cover page (project info + TOC), Site DA land-cover page (Pre vs Post), and Site SWRv page (step-by-step site aggregate).

**Files:**
- Modify: `summary_calculator/src/render.mjs`
- Modify: `summary_calculator/tests/render.test.mjs`

---

- [ ] **Step 1: Append failing tests**

```js
import { renderCoverSheet, renderSiteDaSheet, renderSiteSwrvSheet } from '../src/render.mjs';
import { siteAggregateLandCover, siteSwrv } from '../src/calc.mjs';

const sampleProject = {
  name: 'Test Project', number: 'DTA-X', trigger: 'MLD',
  totalLod: 50000, rainfallIn: 1.2, eisa: 'No', ms4: 'MS4',
};

test('renderCoverSheet: shows project fields and TOC', () => {
  const html = renderCoverSheet(sampleProject, ['Cover', 'Site DA', 'Site SWRv']);
  assert.ok(html.includes('Test Project'));
  assert.ok(html.includes('DTA-X'));
  assert.ok(html.includes('MLD'));
  assert.ok(html.includes('1.2'));
  assert.ok(html.includes('Site SWRv'));
});

test('renderSiteDaSheet: shows pre and post totals', () => {
  const sdas = [
    { landUse: 'Impervious Vehicular', preIn: 1000, postIn: 1500 },
    { landUse: 'Natural (Woods)',      preIn: 500,  postIn: 0 },
  ];
  const agg = siteAggregateLandCover(sdas);
  const html = renderSiteDaSheet(sampleProject, agg);
  assert.ok(html.includes('Site DA'));
  assert.ok(html.includes('1,500'));          // post impervious
  assert.ok(html.includes('500'));            // pre natural
});

test('renderSiteSwrvSheet: shows formula with substituted values', () => {
  const sdas = [{ landUse: 'Impervious Vehicular', postIn: 1000, sdaId: 'SDA-1' }];
  const params = { rv: { 'Impervious Vehicular': 0.95 } };
  const trace = siteSwrv(sdas, 1.2, params);
  const html = renderSiteSwrvSheet(sampleProject, trace);
  assert.ok(html.includes('Site SWRv'));
  assert.ok(html.includes('95'));             // final CF
  assert.ok(html.includes('informational'));  // the per-SDA compliance note
});
```

- [ ] **Step 2: Run tests, expect failure**

```bash
cd summary_calculator
node --test tests/render.test.mjs
```

- [ ] **Step 3: Append to `src/render.mjs`**

```js
export function renderCoverSheet(project, tocLabels) {
  const kv = renderKvTable([
    ['Project',       project.name || '—'],
    ['Project No.',   project.number || '—'],
    ['Trigger',       project.trigger || '—'],
    ['MS4 / Non-MS4', project.ms4 || '—'],
    ['Total LOD',     fmtN(project.totalLod, 0) + ' sf'],
    ['Rainfall (SWRv storm)', fmtN(project.rainfallIn, 2) + '″'],
    ['EISA §438',     project.eisa || '—'],
  ]);
  const toc = tocLabels.map((label, i) =>
    `<div class="cs-formula-line">${String(i + 1).padStart(2, '0')} · ${label}</div>`
  ).join('');
  const body =
    renderBlock('PROJECT', kv) +
    renderBlock('CONTENTS', toc);
  return renderSheetShell({
    title:  'Stormwater Compliance Summary',
    sub:    `${project.name || ''}${project.number ? '  ·  ' + project.number : ''}`,
    body,
    footer: '21 DCMR §599 · DOEE Guidebook Jan 2020 · DDOT GI Standards 2014 · EISA §438',
  });
}

export function renderSiteDaSheet(project, agg) {
  const headers = ['Land Cover', 'Pre (sf)', 'Post (sf)', 'Δ (sf)'];
  const rows = [
    ['Natural (Woods)',    fmtN(agg.pre.natural),    fmtN(agg.post.natural),    fmtN(agg.post.natural    - agg.pre.natural)],
    ['Compacted (Open)',   fmtN(agg.pre.compacted),  fmtN(agg.post.compacted),  fmtN(agg.post.compacted  - agg.pre.compacted)],
    ['Impervious',         fmtN(agg.pre.impervious), fmtN(agg.post.impervious), fmtN(agg.post.impervious - agg.pre.impervious)],
    ['BMP (as land cover)',fmtN(agg.pre.bmp),        fmtN(agg.post.bmp),        fmtN(agg.post.bmp        - agg.pre.bmp)],
    ['Total',              fmtN(agg.preTotal),       fmtN(agg.postTotal),       fmtN(agg.postTotal       - agg.preTotal)],
  ];
  const body =
    renderBlock('SITE DRAINAGE AREA — LAND COVER', renderDataTable(headers, rows)) +
    renderBlock('IMPERVIOUS COVER', renderKvTable([
      ['Pre impervious %',  fmtN(agg.impPctPre, 1) + '%'],
      ['Post impervious %', fmtN(agg.impPctPost, 1) + '%'],
    ]));
  return renderSheetShell({
    title: 'Site DA — Land Cover (Pre vs Post)',
    sub:   `${project.name || ''} · Total LOD ${fmtN(project.totalLod)} sf`,
    body,
    footer: 'Aggregated across all SDAs. Compliance is calculated per SDA — see Site Compliance roll-up.',
  });
}

export function renderSiteSwrvSheet(project, trace) {
  const body =
    renderBlock('SITE SWRv (post-condition, within LOD)', renderTrace(trace)) +
    renderNote('Informational — 21 DCMR §599 requires SWRv be met per SDA, not site-wide. Per-SDA compliance is on the Site Compliance roll-up page.');
  return renderSheetShell({
    title: 'Site SWRv Required',
    sub:   `${project.name || ''} · Rainfall ${fmtN(project.rainfallIn, 2)}″`,
    body,
    footer: '21 DCMR §599 · DOEE Guidebook §2',
  });
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
git commit -m "summary-calculator: render cover, Site DA, and Site SWRv sheets"
```
