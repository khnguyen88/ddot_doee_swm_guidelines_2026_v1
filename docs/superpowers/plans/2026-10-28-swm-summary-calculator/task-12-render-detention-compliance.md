# Task 12 — Detention and Compliance roll-up renderers

**Goal:** Detention summary (landscape, filtered to triggered SDAs only) and the final site compliance roll-up page.

**Files:**
- Modify: `summary_calculator/src/render.mjs`
- Modify: `summary_calculator/tests/render.test.mjs`

---

- [ ] **Step 1: Append failing tests**

```js
import { renderDetentionSheet, renderCompliancePage } from '../src/render.mjs';

test('renderDetentionSheet: empty state when no SDA triggers', () => {
  const html = renderDetentionSheet(sampleProject, { perSda: [], anyRequired: false }, 3.14, 5.23);
  assert.ok(html.includes('No detention required'));
  assert.ok(html.includes('3.14'));
  assert.ok(html.includes('5.23'));
});

test('renderDetentionSheet: shows only triggered SDAs, applies landscape', () => {
  const summary = {
    anyRequired: true,
    perSda: [
      { sdaId: 'SDA-1', preCn: 70, postCn: 95, p2PreQ: 0.5, p2PostQ: 2.5, p2Required: true,
        p15PreQ: 1.5, p15PostQ: 4.1, p15Required: true },
      { sdaId: 'SDA-2', preCn: 70, postCn: 70, p2PreQ: 0.5, p2PostQ: 0.5, p2Required: false,
        p15PreQ: 1.5, p15PostQ: 1.5, p15Required: false },
    ],
  };
  const html = renderDetentionSheet(sampleProject, summary, 3.14, 5.23);
  assert.ok(html.includes('landscape'));
  assert.ok(html.includes('SDA-1'));
  assert.ok(!html.includes('SDA-2'));   // filtered out
});

test('renderCompliancePage: PASS when Rv_provided ≥ SWRv_req per SDA', () => {
  const rows = [
    { sdaId: 'SDA-1', swrvReqCf: 500, rvProvidedCf: 600 },
    { sdaId: 'SDA-2', swrvReqCf: 300, rvProvidedCf: 250 },
  ];
  const html = renderCompliancePage(sampleProject, rows);
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('SDA-2'));
  assert.ok(html.includes('PASS'));
  assert.ok(html.includes('FAIL'));
});
```

- [ ] **Step 2: Run tests, expect failure**

- [ ] **Step 3: Append to `src/render.mjs`**

```js
export function renderDetentionSheet(project, summary, p2In, p15In) {
  if (!summary.anyRequired) {
    const body = renderNote(
      `No detention required — Post ≤ Pre for all SDAs at both the 2-yr (${p2In}″) and 15-yr (${p15In}″) storms.`
    );
    return renderSheetShell({
      title: 'Detention Summary (2-yr / 15-yr)',
      sub:   project.name || '',
      body,
      footer: 'DOEE Guidebook §2.4 · DOEE Compliance Calculator Sheet 3',
    });
  }
  const triggered = summary.perSda.filter(s => s.p2Required || s.p15Required);
  const headers = [
    'SDA', 'Pre CN', 'Post CN',
    `2-yr Pre Q (${p2In}″)`, `2-yr Post Q`, '2-yr Req?',
    `15-yr Pre Q (${p15In}″)`, `15-yr Post Q`, '15-yr Req?',
  ];
  const rows = triggered.map(s => [
    s.sdaId,
    fmtN(s.preCn, 1),
    fmtN(s.postCn, 1),
    fmtN(s.p2PreQ, 3) + '″',
    fmtN(s.p2PostQ, 3) + '″',
    s.p2Required ? 'YES' : 'no',
    fmtN(s.p15PreQ, 3) + '″',
    fmtN(s.p15PostQ, 3) + '″',
    s.p15Required ? 'YES' : 'no',
  ]);
  const body =
    renderBlock('SDAs REQUIRING DETENTION (Post Q > Pre Q)', renderDataTable(headers, rows)) +
    renderNote(`Storm depths from PARAMS_Detention: 2-yr = ${p2In}″, 15-yr = ${p15In}″. CNs are area-weighted using DOEE detention defaults (Nat 70, Comp 74, Imp 98, BMP 98).`);
  return renderSheetShell({
    title: 'Detention Summary (2-yr / 15-yr)',
    sub:   project.name || '',
    body,
    footer: 'DOEE Guidebook §2.4 · SCS CN runoff method',
    landscape: true,
  });
}

export function renderCompliancePage(project, rows) {
  const dataRows = rows.map(r => {
    const pct = r.swrvReqCf > 0 ? (r.rvProvidedCf / r.swrvReqCf * 100) : 0;
    const pass = r.rvProvidedCf >= r.swrvReqCf || r.swrvReqCf === 0;
    return [
      r.sdaId,
      fmtN(r.swrvReqCf, 0),
      fmtN(r.rvProvidedCf, 0),
      fmtN(pct, 0) + '%',
      pass ? '✓ PASS' : '✗ FAIL',
    ];
  });
  const totalReq      = rows.reduce((s, r) => s + r.swrvReqCf, 0);
  const totalProvided = rows.reduce((s, r) => s + r.rvProvidedCf, 0);
  const sitePass = totalProvided >= totalReq;
  const totalRow = [
    'SITE TOTAL',
    fmtN(totalReq, 0),
    fmtN(totalProvided, 0),
    fmtN(totalReq > 0 ? totalProvided / totalReq * 100 : 0, 0) + '%',
    sitePass ? '✓ PASS' : '✗ FAIL',
  ];
  const headers = ['SDA', 'SWRv Required (cf)', 'Rv Provided (cf)', '% Met', 'Status'];
  const body =
    renderBlock('SITE COMPLIANCE ROLL-UP', renderDataTable(headers, [...dataRows, totalRow])) +
    renderNote('Compliance is evaluated per SDA (21 DCMR §599). The site-total row shows aggregate retention but does not alone demonstrate compliance.');
  return renderSheetShell({
    title: 'Site Compliance Roll-up',
    sub:   project.name || '',
    body,
    footer: '21 DCMR §599 · DOEE Compliance Calculator Sheet 4',
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
git commit -m "summary-calculator: render Detention (landscape, filtered) and Compliance roll-up"
```
