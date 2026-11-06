# Task 08 — Render primitives and print CSS

**Goal:** Build the shared rendering primitives — a sheet-shell factory, trace-to-HTML walker, key-value table helper — and append the full `.cs-*` CSS vocabulary + print rules to `src/styles.css`.

**Files:**
- Create: `summary_calculator/src/render.mjs`
- Create: `summary_calculator/tests/render.test.mjs`
- Modify: `summary_calculator/src/styles.css`

---

- [ ] **Step 1: Write failing test `summary_calculator/tests/render.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSheetShell, renderTrace, renderKvTable } from '../src/render.mjs';

test('renderSheetShell returns HTML with title and sub', () => {
  const html = renderSheetShell({
    title: 'BMP-02-A — Bioretention',
    sub:   'Minnesota Ave · DTA-ZZZ',
    body:  '<p>body</p>',
    footer: 'DOEE Guidebook §3.6',
  });
  assert.ok(html.includes('BMP-02-A'));
  assert.ok(html.includes('Minnesota Ave'));
  assert.ok(html.includes('<p>body</p>'));
  assert.ok(html.includes('DOEE Guidebook'));
  assert.ok(html.includes('class="calc-sheet"'));
});

test('renderSheetShell applies landscape class when flagged', () => {
  const html = renderSheetShell({ title: 'x', sub: '', body: '', landscape: true });
  assert.ok(html.includes('class="calc-sheet landscape"'));
});

test('renderTrace walks steps[] into formula lines', () => {
  const trace = {
    value: 252, units: 'cf',
    steps: [
      { expr: 'Sv = SA (dm·nm + dg·ng + dp)',
        sub:  '210 (2.0·0.40 + 0.5·0.40 + 0.5)',
        eval: '210 (0.80 + 0.20 + 0.50)',
        result: 252 },
    ],
  };
  const html = renderTrace(trace);
  assert.ok(html.includes('Sv ='));
  assert.ok(html.includes('210 (0.80 + 0.20 + 0.50)'));
  assert.ok(html.includes('252 cf'));
});

test('renderKvTable produces label/value rows', () => {
  const html = renderKvTable([
    ['SA_bot', '210 sf'],
    ['d_media', '2.0 ft'],
  ]);
  assert.ok(html.includes('SA_bot'));
  assert.ok(html.includes('210 sf'));
  assert.ok(html.includes('d_media'));
});
```

- [ ] **Step 2: Run tests, expect failure**

```bash
cd summary_calculator
node --test tests/render.test.mjs
```

- [ ] **Step 3: Write `src/render.mjs`**

```js
// src/render.mjs — pure HTML-string renderers. No DOM, no SheetJS.
// Each render function returns a string of HTML the UI can inject into #printArea.

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export const fmtN = (n, places = 0) => {
  if (n == null || Number.isNaN(n)) return '—';
  const rounded = Number(n).toFixed(places);
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export function renderSheetShell({ title, sub, body, footer, landscape = false }) {
  const cls = landscape ? 'calc-sheet landscape' : 'calc-sheet';
  return `
    <section class="${cls}">
      <div class="cs-header">
        <div class="cs-title">${esc(title)}</div>
        ${sub ? `<div class="cs-sub">${esc(sub)}</div>` : ''}
      </div>
      ${body}
      ${footer ? `<div class="cs-footer">${esc(footer)}</div>` : ''}
    </section>`;
}

export function renderBlock(title, inner) {
  return `
    <div class="cs-block">
      <div class="cs-block-title">${esc(title)}</div>
      ${inner}
    </div>`;
}

export function renderKvTable(rows) {
  const trs = rows.map(([k, v]) =>
    `<tr><td class="cs-k">${esc(k)}</td><td class="cs-v">${esc(v)}</td></tr>`,
  ).join('');
  return `<table class="cs-kv">${trs}</table>`;
}

export function renderTrace(trace) {
  const steps = trace.steps.map(s => {
    const lines = [];
    lines.push(`<div class="cs-formula-line">${esc(s.expr)}</div>`);
    if (s.sub)  lines.push(`<div class="cs-formula-line">= ${esc(s.sub)}</div>`);
    if (s.eval && s.eval !== s.sub) lines.push(`<div class="cs-formula-line">= ${esc(s.eval)}</div>`);
    lines.push(`<div class="cs-formula-line"><b>= ${fmtN(s.result, 0)} ${trace.units}</b></div>`);
    return lines.join('');
  }).join('');
  return `<div class="cs-formula-block">${steps}</div>`;
}

export function renderResult(label, value, units, pass) {
  const cls = pass === false ? 'cs-result cs-result-fail' : 'cs-result';
  return `<div class="${cls}">${esc(label)}: <b>${fmtN(value, 0)} ${units}</b></div>`;
}

export function renderNote(text)  { return `<div class="cs-note">${esc(text)}</div>`; }
export function renderWarn(text)  { return `<div class="cs-warn">${esc(text)}</div>`; }

export function renderDataTable(headers, rows) {
  const ths = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const trs = rows.map(r =>
    `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`,
  ).join('');
  return `<table class="data"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}
```

- [ ] **Step 4: Append print CSS to `src/styles.css`**

```css
/* ── Calc sheet (shared by preview and print) ────────────────────────────── */
.calc-sheet {
  background: #fff; color: #111820;
  border-radius: 8px; padding: 22px 24px;
  font-size: 12.5px; max-width: 7.5in; margin: 0 auto 20px;
}
.cs-header { border-bottom: 2px solid #111820; padding-bottom: 10px; margin-bottom: 16px; }
.cs-title { font-size: 17px; font-weight: 800; color: #0B1220; }
.cs-sub { font-size: 12px; color: #4B5A6E; margin-top: 2px; }
.cs-block { margin-bottom: 16px; }
.cs-block-title {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
  color: #2A9D8F; margin-bottom: 7px; padding-bottom: 4px; border-bottom: 1px solid #DCE4EC;
}
table.cs-kv { border-collapse: collapse; width: 100%; }
table.cs-kv td { padding: 4px 8px 4px 0; font-size: 12.5px; vertical-align: top; }
table.cs-kv td.cs-k { color: #4B5A6E; width: 56%; }
table.cs-kv td.cs-v { font-family: var(--font-mono); font-weight: 600; color: #0B1220; }
.cs-formula-block { margin: 6px 0; }
.cs-formula-line { font-family: var(--font-mono); font-size: 12.5px; color: #1B2740; padding: 2px 0; }
.cs-result {
  margin-top: 8px; padding: 8px 12px; background: #EFFAF7; border: 1px solid #BEE9E0;
  border-radius: 6px; font-size: 13px; color: #0B1220;
}
.cs-result b { font-family: var(--font-mono); color: #0F766E; font-size: 14px; }
.cs-result-fail { background: #FFF1F2; border-color: #FECACA; }
.cs-result-fail b { color: #B91C1C; }
.cs-note { font-size: 11.5px; color: #5D7291; font-style: italic; margin: 4px 0; }
.cs-warn {
  font-size: 12px; color: #8A4B00; background: #FFF4E0; border: 1px solid #F3D28C;
  border-radius: 6px; padding: 7px 10px; margin: 6px 0;
}
.cs-footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #DCE4EC; font-size: 10.5px; color: #8A97A8; }

table.data { border-collapse: collapse; width: 100%; font-size: 10.5px; }
table.data th, table.data td { padding: 4px 6px; border-bottom: 1px solid #DCE4EC; text-align: left; }
table.data th { background: #F3F6F9; color: #0B1220; font-weight: 700; }

/* ── Print rules ─────────────────────────────────────────────────────────── */
#printArea { display: none; background: #fff; }
body.print-mode .app { display: none; }
body.print-mode #printArea { display: block; }
body.print-mode #printArea .calc-sheet {
  border-radius: 0; padding: 0.4in;
  min-height: 9.5in; max-height: 10in; overflow: hidden;
  page-break-after: always; break-after: page;
  margin: 0 auto;
}
body.print-mode #printArea .calc-sheet:last-child { page-break-after: auto; }

@page { size: letter portrait; margin: 0.5in; }
@page landscape-page { size: letter landscape; margin: 0.5in; }
.calc-sheet.landscape { page: landscape-page; }

@media print {
  .app { display: none !important; }
  #printArea { display: block !important; }
  #printArea .calc-sheet { page-break-after: always; break-after: page; min-height: 9.5in; }
  #printArea .calc-sheet:last-child { page-break-after: auto; }
}
```

- [ ] **Step 5: Run tests, expect pass**

```bash
cd summary_calculator
node --test tests/render.test.mjs
```

Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add summary_calculator/src/render.mjs summary_calculator/src/styles.css summary_calculator/tests/render.test.mjs
git commit -m "summary-calculator: add render primitives and letter-format print CSS"
```
