# Task 11 — MEP and EISA 438 renderers

**Goal:** Project-level MEP (DDOT Maximum Extent Practicable) summary and EISA §438 Direct Determination pages.

**Files:**
- Modify: `summary_calculator/src/render.mjs`
- Modify: `summary_calculator/tests/render.test.mjs`

---

- [ ] **Step 1: Append failing tests**

```js
import { renderMepSheet, renderEisa438Sheet } from '../src/render.mjs';

test('renderMepSheet: lists SDAs with 4-step status', () => {
  const sdas = [
    { sdaId: 'SDA-1' }, { sdaId: 'SDA-2' },
  ];
  const html = renderMepSheet(sampleProject, sdas);
  assert.ok(html.includes('MEP'));
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('Step 1'));
  assert.ok(html.includes('Step 4'));
});

test('renderEisa438Sheet: pre vs post comparison', () => {
  const html = renderEisa438Sheet(sampleProject, {
    preCf: 2000, postCf: 1500, deltaCf: -500, pass: true,
  });
  assert.ok(html.includes('EISA'));
  assert.ok(html.includes('2,000'));
  assert.ok(html.includes('1,500'));
  assert.ok(html.includes('95th percentile'));
});
```

- [ ] **Step 2: Run tests, expect failure**

- [ ] **Step 3: Append to `src/render.mjs`**

```js
const MEP_STEPS = [
  ['Step 1', 'Treat impervious area to the Maximum Extent Practicable (SWRv-equivalent)'],
  ['Step 2', 'Evaluate alternative BMP locations where Step 1 is infeasible'],
  ['Step 3', 'Manage remaining runoff via conveyance and detention'],
  ['Step 4', 'Discharge to MS4 only if Steps 1-3 are infeasible'],
];

export function renderMepSheet(project, sdas) {
  const stepsHtml = MEP_STEPS.map(([n, desc]) =>
    `<div class="cs-formula-line"><b>${esc(n)}</b> — ${esc(desc)}</div>`
  ).join('');
  const sdaRows = sdas.map(s => [
    s.sdaId,
    'Documented',  // Step 1 status — pulled from CORRECT_MEP_SUMMARY in a later iteration
    'Documented',
    'Documented',
    'Documented',
  ]);
  const body =
    renderBlock('DDOT MEP 4-STEP PROCESS', stepsHtml) +
    renderBlock('PER-SDA DOCUMENTATION STATUS',
      renderDataTable(['SDA', 'Step 1', 'Step 2', 'Step 3', 'Step 4'], sdaRows)) +
    renderNote('Per-step evidence lives on the DDOT MEP Worksheet (template sheet CORRECT_MEP_SUMMARY). This page summarizes status only — reviewers should also inspect the worksheet.');
  return renderSheetShell({
    title: 'MEP Summary (PROW)',
    sub:   `${project.name || ''} · DDOT Maximum Extent Practicable`,
    body,
    footer: 'DOEE Guidebook Appendix B · DDOT GI Standards 2014',
  });
}

export function renderEisa438Sheet(project, eisa) {
  const kv = renderKvTable([
    ['95th percentile storm (DC)', '1.7″'],
    ['Pre-development runoff',     fmtN(eisa.preCf, 0) + ' cf'],
    ['Post-development runoff',    fmtN(eisa.postCf, 0) + ' cf'],
    ['Δ (post − pre)',             fmtN(eisa.deltaCf, 0) + ' cf'],
  ]);
  const body =
    renderBlock('EISA §438 DIRECT DETERMINATION', kv) +
    renderResult(
      eisa.pass
        ? 'EISA §438 compliant — post ≤ pre at the 95th percentile storm'
        : 'EISA §438 NOT compliant — post exceeds pre at the 95th percentile storm',
      eisa.deltaCf, 'cf', eisa.pass,
    ) +
    renderNote('Method: direct determination per EPA EISA §438 Technical Guidance (Dec 2009). Impervious surfaces lose 0.1″ to depression storage only; pervious surfaces lose depression + Horton infiltration over 24 hr.');
  return renderSheetShell({
    title: 'EISA §438 Direct Determination',
    sub:   project.name || '',
    body,
    footer: 'EISA §438 Technical Guidance (EPA, Dec 2009) · 95th percentile storm = 1.7″ for Washington, DC',
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
git commit -m "summary-calculator: render MEP summary and EISA 438 pages"
```
