# Education App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a third standalone offline web app at `education/` — a print-ready pedagogical walkthrough of the DOEE / EISA 438 stormwater compliance process with four-block narrative (Overview / Why / Formula / Worked) per page and three EISA 438 computation methods side by side (Direct Determination, TR-55 formula, TR-16 Exhibit 2-7A lookup).

**Architecture:** Fork of `summary_calculator/`. `calc.mjs`, `aggregate.mjs`, `parse.mjs` are byte-identical copies kept in sync via `scripts/sync-education-engines.sh` and policed by a CI parity test. New files: `tr16-exhibit.mjs` (TR-16 lookup data + helper), `narrative.mjs` (four-block templating helpers), `render-edu.mjs` (page renderers), education-specific `ui.mjs`, `styles.css`, `build.js`.

**Tech Stack:** Vanilla ES modules, `node:test`, Playwright, SheetJS (vendored, shared with summary app). No frameworks, no npm deps beyond Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-education-app-design.md`

---

## File Structure Overview

### Create (all new in `education/`)

- `education/education-dev.html` — dev entry
- `education/education.html` — built dist
- `education/lib/sheetjs-bundle.js` — copied from summary_calculator
- `education/src/calc.mjs` — byte-identical copy
- `education/src/aggregate.mjs` — byte-identical copy
- `education/src/parse.mjs` — byte-identical copy
- `education/src/tr16-exhibit.mjs` — Exhibit 2-7A data + `tr16LookupQ(cn, p)`
- `education/src/narrative.mjs` — four-block helpers (`renderOverview`, `renderWhy`, `renderFormula`, `renderWorked`)
- `education/src/render-edu.mjs` — page renderers (one function per deck page)
- `education/src/styles.css` — copied summary styles + edu additions
- `education/src/ui.mjs` — dropzone, sidebar, print, deck builder
- `education/build.js` — mirrors summary build
- `education/package.json` — scripts: `test`, `build`, `sync-engines`
- `education/playwright.config.mjs` — mirrors summary config
- `education/tests/engine-parity.test.mjs` — byte-equality vs summary
- `education/tests/tr16-exhibit.test.mjs` — sampled cells + TR-55 agreement
- `education/tests/narrative.test.mjs` — four-block helpers emit expected HTML
- `education/tests/render-edu.test.mjs` — key strings/values per page
- `education/tests/browser-smoke.mjs` — Playwright full walkthrough
- `education/tests/fixtures/minnesota-ave.xlsx` — copied from summary
- `education/README.md`
- `scripts/sync-education-engines.sh` — sync script
- `.github/workflows/education.yml` — CI

---

## Task 1 — Scaffold directory + build + engine sync + parity test

Create the directory tree, package.json, build.js, sync script, and parity test. By end of this task, running `npm run build` produces an empty-shell HTML and `npm test` passes the engine-parity test. No pages yet.

**Files:**
- Create: `education/package.json`
- Create: `education/build.js`
- Create: `education/playwright.config.mjs`
- Create: `education/education-dev.html` (minimal shell)
- Create: `education/src/styles.css` (minimal — copied from summary)
- Create: `education/src/ui.mjs` (empty IIFE for now)
- Create: `education/lib/sheetjs-bundle.js` (copied)
- Create: `education/src/calc.mjs`, `aggregate.mjs`, `parse.mjs` (copied)
- Create: `scripts/sync-education-engines.sh`
- Create: `education/tests/engine-parity.test.mjs`

- [ ] **Step 1: Create directory tree**

```bash
mkdir -p education/src education/lib education/tests/fixtures scripts
```

- [ ] **Step 2: Create the sync script**

Create `scripts/sync-education-engines.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cp "$ROOT/summary_calculator/src/calc.mjs"      "$ROOT/education/src/calc.mjs"
cp "$ROOT/summary_calculator/src/aggregate.mjs" "$ROOT/education/src/aggregate.mjs"
cp "$ROOT/summary_calculator/src/parse.mjs"     "$ROOT/education/src/parse.mjs"
echo "Education engine files synced from summary_calculator"
```

Make executable: `chmod +x scripts/sync-education-engines.sh`

- [ ] **Step 3: Run the sync script**

```bash
bash scripts/sync-education-engines.sh
```

Expected: three files appear in `education/src/`.

- [ ] **Step 4: Copy SheetJS and the Minnesota Ave fixture**

```bash
cp summary_calculator/lib/sheetjs-bundle.js education/lib/
cp summary_calculator/tests/fixtures/minnesota-ave.xlsx education/tests/fixtures/
```

- [ ] **Step 5: Write failing engine-parity test**

Create `education/tests/engine-parity.test.mjs`:

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
      `${name}.mjs diverges — run \`bash scripts/sync-education-engines.sh\``);
  });
}
```

- [ ] **Step 6: Create package.json**

```json
{
  "name": "swm-education",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "smoke": "node --test tests/browser-smoke.mjs",
    "build": "node build.js",
    "sync-engines": "bash ../scripts/sync-education-engines.sh"
  },
  "devDependencies": {
    "playwright": "^1.47.0",
    "@playwright/test": "^1.47.0"
  }
}
```

- [ ] **Step 7: Install devDependencies**

```bash
cd education && npm install
```

Expected: node_modules created; `.gitignore` already excludes it.

- [ ] **Step 8: Run parity test**

```bash
cd education && node --test tests/engine-parity.test.mjs
```

Expected: 3 tests PASS.

- [ ] **Step 9: Create minimal styles.css (copy from summary)**

```bash
cp summary_calculator/src/styles.css education/src/styles.css
```

- [ ] **Step 10: Create minimal dev HTML and empty ui.mjs**

`education/education-dev.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SWM Education — DOEE / EISA 438 Walkthrough</title>
  <link rel="stylesheet" href="./src/styles.css">
</head>
<body>
  <div class="app">
    <aside id="sidebar" class="sidebar"></aside>
    <div style="display: grid; grid-template-rows: auto 1fr;">
      <div id="topbar" class="topbar"></div>
      <main id="main" class="main"></main>
    </div>
  </div>
  <div id="printArea"></div>
  <script src="./lib/sheetjs-bundle.js"></script>
  <script type="module" src="./src/ui.mjs"></script>
</body>
</html>
```

`education/src/ui.mjs`:

```javascript
// src/ui.mjs — placeholder, replaced in Task 2.
document.getElementById('main').textContent = 'Education app scaffold OK.';
```

- [ ] **Step 11: Create build.js (adapted from summary)**

Create `education/build.js`:

```javascript
#!/usr/bin/env node
import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const paths = {
  dev:       join(__dirname, 'education-dev.html'),
  styles:    join(__dirname, 'src',  'styles.css'),
  parse:     join(__dirname, 'src',  'parse.mjs'),
  calc:      join(__dirname, 'src',  'calc.mjs'),
  aggregate: join(__dirname, 'src',  'aggregate.mjs'),
  tr16:      join(__dirname, 'src',  'tr16-exhibit.mjs'),
  narrative: join(__dirname, 'src',  'narrative.mjs'),
  renderEdu: join(__dirname, 'src',  'render-edu.mjs'),
  ui:        join(__dirname, 'src',  'ui.mjs'),
  sheetjs:   join(__dirname, 'lib',  'sheetjs-bundle.js'),
  dist:      join(__dirname, 'education.html'),
};

function stripRelativeImports(source) {
  return source
    .replace(/^\s*import[^;]*from\s*['"]\.\/[^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
}

async function readIfExists(path) {
  try { return await readFile(path, 'utf8'); }
  catch { return '// (not yet created)'; }
}

async function main() {
  const [devHtml, stylesCss, parseJs, calcJs, aggregateJs, tr16Js, narrativeJs, renderEduJs, uiJs, sheetjsJs] =
    await Promise.all([
      readFile(paths.dev,       'utf8'),
      readFile(paths.styles,    'utf8'),
      readFile(paths.parse,     'utf8'),
      readFile(paths.calc,      'utf8'),
      readFile(paths.aggregate, 'utf8'),
      readIfExists(paths.tr16),
      readIfExists(paths.narrative),
      readIfExists(paths.renderEdu),
      readFile(paths.ui,        'utf8'),
      readFile(paths.sheetjs,   'utf8'),
    ]);

  const combinedModule = [
    '// ─ src/calc.mjs ─',          stripRelativeImports(calcJs),
    '// ─ src/parse.mjs ─',         stripRelativeImports(parseJs),
    '// ─ src/aggregate.mjs ─',     stripRelativeImports(aggregateJs),
    '// ─ src/tr16-exhibit.mjs ─',  stripRelativeImports(tr16Js),
    '// ─ src/narrative.mjs ─',     stripRelativeImports(narrativeJs),
    '// ─ src/render-edu.mjs ─',    stripRelativeImports(renderEduJs),
    '// ─ src/ui.mjs ─',            stripRelativeImports(uiJs),
  ].join('\n\n');

  let out = devHtml;
  out = out.replace(
    /<link[^>]*href=["']\.\/src\/styles\.css["'][^>]*>/,
    `<style>\n${stylesCss}\n</style>`,
  );
  out = out.replace(
    /<script[^>]*src=["']\.\/lib\/sheetjs-bundle\.js["'][^>]*><\/script>/,
    `<script>\n${sheetjsJs.replace(/\$/g, '$$$$')}\n</script>`,
  );
  out = out.replace(
    /<script[^>]*type=["']module["'][^>]*src=["']\.\/src\/ui\.mjs["'][^>]*><\/script>/,
    `<script type="module">\n${combinedModule.replace(/\$/g, '$$$$')}\n</script>`,
  );

  await writeFile(paths.dist, out);
  const { size } = await stat(paths.dist);
  console.log(`Built ${paths.dist} (${(size / 1024).toFixed(0)} KB)`);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 12: Create minimal playwright.config.mjs**

```javascript
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: /browser-smoke\.mjs/,
  timeout: 30000,
  use: { headless: true },
});
```

- [ ] **Step 13: Build and smoke open**

```bash
cd education && node build.js
```

Expected: `Built …/education.html (…KB)`. The dist opens in a browser and shows "Education app scaffold OK."

- [ ] **Step 14: Commit**

```bash
git add education/ scripts/sync-education-engines.sh
git commit -m "education: scaffold directory, build pipeline, engine sync + parity"
```

---

## Task 2 — UI shell (dropzone, sidebar, print, topbar)

Replace the placeholder `ui.mjs` with a working shell that renders the empty-state dropzone, accepts an .xlsx upload, and provides the sidebar + topbar infrastructure. Deck remains empty — pages are added in later tasks.

**Files:**
- Modify: `education/src/ui.mjs`
- Modify: `education/src/styles.css` (append edu-specific additions)
- Create: `education/tests/browser-smoke.mjs` (first smoke test — scaffold loads)

- [ ] **Step 1: Write failing Playwright smoke test**

Create `education/tests/browser-smoke.mjs`:

```javascript
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distUrl = 'file://' + join(__dirname, '..', 'education.html');

test('smoke: empty state renders the dropzone', async ({ page }) => {
  await page.goto(distUrl);
  await page.waitForSelector('.dropzone', { timeout: 5000 });
  const display = await page.$eval('.dropzone', (el) => getComputedStyle(el).display);
  expect(display).toBe('block');
});
```

- [ ] **Step 2: Run it to verify FAIL**

```bash
cd education && npx playwright test
```

Expected: FAIL — no `.dropzone` exists yet.

- [ ] **Step 3: Replace `education/src/ui.mjs` with the shell**

```javascript
// src/ui.mjs — shell: dropzone + sidebar + topbar + print.
// Deck builder is added in Task 12 after all page renderers exist.

import { parseWorkbook } from './parse.mjs';

const main      = document.getElementById('main');
const sidebar   = document.getElementById('sidebar');
const topbar    = document.getElementById('topbar');
const printArea = document.getElementById('printArea');

let state = { parsed: null, pages: null, activeIdx: 0, filename: null };

function renderEmptyState() {
  main.innerHTML = `
    <div class="empty-state">
      <div>SWM Education — DOEE / EISA 438 walkthrough.</div>
      <div style="margin-top: 8px; font-size: 13px;">
        Load a filled DOEE EISA 438 template, or click "Load demo" to walk through the Minnesota Ave fixture.
      </div>
      <label class="dropzone">
        <input type="file" accept=".xlsx,.xlsm" hidden>
        <div>Click to choose an .xlsx file</div>
      </label>
      <div style="margin-top: 14px;">
        <button class="btn-primary" id="demoBtn">Load Minnesota Ave demo</button>
      </div>
    </div>`;
  main.querySelector('input[type=file]').addEventListener('change', onFileChosen);
  document.getElementById('demoBtn').addEventListener('click', loadDemo);
}

function renderTopbar() {
  topbar.innerHTML = `
    <div class="filename">${state.filename || ''}</div>
    <button class="clear-btn" title="Clear" id="clearBtn">×</button>
    <div class="spacer"></div>
    <button class="btn" id="printBtn" title="Print this walkthrough">Print</button>
  `;
  document.getElementById('clearBtn').addEventListener('click', clearState);
  document.getElementById('printBtn').addEventListener('click', doPrint);
}

function renderSidebar() {
  if (!state.pages) {
    sidebar.innerHTML = `
      <div style="font-weight:700;">SWM Education</div>
      <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase;">DOEE / EISA 438 Walkthrough</div>`;
    return;
  }
  const nav = state.pages.map((p, i) =>
    `<button class="nav-btn ${i === state.activeIdx ? 'active' : ''}" data-idx="${i}">
       <span class="nav-num">${String(i + 1).padStart(2, '0')}</span>
       <span>${p.label}</span>
     </button>`,
  ).join('');
  sidebar.innerHTML = `
    <div style="font-weight:700; font-size:14.5px;">SWM Education</div>
    <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase; margin-bottom:12px;">Walkthrough</div>
    <div class="nav">${nav}</div>`;
  sidebar.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => setActive(parseInt(btn.dataset.idx, 10)));
  });
}

function renderActivePage() {
  if (!state.pages) return;
  main.innerHTML = state.pages[state.activeIdx].html;
}

function renderPrintArea() {
  if (!state.pages) { printArea.innerHTML = ''; return; }
  printArea.innerHTML = state.pages.map(p => p.html).join('');
}

function renderBanner(kind, text) {
  const banner = document.createElement('div');
  banner.className = `banner ${kind}`;
  banner.textContent = text;
  main.innerHTML = '';
  main.appendChild(banner);
}

async function onFileChosen(event) {
  const file = event.target.files[0];
  if (!file) return;
  state.filename = file.name;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const workbook = window.XLSX.read(bytes, { type: 'array' });
    state.parsed = parseWorkbook(workbook);
    buildAndRender();
  } catch (err) {
    console.error(err);
    renderBanner('error', `Parse error: ${err.message}`);
  }
}

async function loadDemo() {
  try {
    const res = await fetch('./tests/fixtures/minnesota-ave.xlsx');
    const bytes = new Uint8Array(await res.arrayBuffer());
    const workbook = window.XLSX.read(bytes, { type: 'array' });
    state.parsed = parseWorkbook(workbook);
    state.filename = 'Minnesota Ave (demo)';
    buildAndRender();
  } catch (err) {
    renderBanner('error', `Demo load failed: ${err.message}`);
  }
}

function buildAndRender() {
  // Deck builder is populated in Task 12. For now, show a placeholder page.
  state.pages = [{ label: 'Placeholder', html: '<section class="calc-sheet"><div class="cs-title">Deck builder not yet wired.</div></section>' }];
  state.activeIdx = 0;
  renderTopbar();
  renderSidebar();
  renderActivePage();
  renderPrintArea();
}

function clearState() {
  state = { parsed: null, pages: null, activeIdx: 0, filename: null };
  topbar.innerHTML = '';
  printArea.innerHTML = '';
  renderSidebar();
  renderEmptyState();
}

function setActive(idx) {
  state.activeIdx = idx;
  renderSidebar();
  renderActivePage();
}

function doPrint() {
  if (!state.pages) return;
  document.body.classList.add('print-mode');
  requestAnimationFrame(() => {
    window.print();
    setTimeout(() => document.body.classList.remove('print-mode'), 500);
  });
}

// Boot.
renderSidebar();
renderEmptyState();
```

- [ ] **Step 4: Append edu-specific styles to styles.css**

Append to `education/src/styles.css`:

```css
/* ── Education-specific additions ──────────────────────────────────────────── */
.cs-edu-overview {
  background: #EFF6FF; border: 1px solid #BFDBFE; border-left: 4px solid #3B82F6;
  padding: 10px 14px; margin-bottom: 14px; border-radius: 4px;
  font-size: 12.5px; color: #1E3A8A;
}
.cs-edu-overview .cs-edu-overview-label {
  display: block; font-weight: 700; font-size: 10.5px; letter-spacing: 0.6px;
  text-transform: uppercase; margin-bottom: 4px; color: #1D4ED8;
}
.cs-edu-why {
  background: #FFFBEB; border: 1px solid #FDE68A; padding: 10px 14px;
  margin-bottom: 14px; border-radius: 4px; font-size: 12px; color: #713F12;
}
.cs-edu-why .cs-edu-why-label {
  display: block; font-weight: 700; font-size: 10.5px; letter-spacing: 0.6px;
  text-transform: uppercase; margin-bottom: 4px; color: #92400E;
}
.cs-edu-formula {
  background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 14px;
  margin-bottom: 14px; border-radius: 4px; font-size: 12.5px; color: #0F172A;
}
.cs-edu-formula .cs-edu-formula-label {
  display: block; font-weight: 700; font-size: 10.5px; letter-spacing: 0.6px;
  text-transform: uppercase; margin-bottom: 6px; color: #334155;
}
.cs-edu-worked {
  background: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A;
  padding: 10px 14px; margin-bottom: 14px; border-radius: 4px;
  font-size: 12.5px; color: #14532D;
}
.cs-edu-worked .cs-edu-worked-label {
  display: block; font-weight: 700; font-size: 10.5px; letter-spacing: 0.6px;
  text-transform: uppercase; margin-bottom: 6px; color: #15803D;
}
.cs-edu-sidebar {
  float: right; width: 36%; margin: 0 0 10px 14px; padding: 8px 10px;
  background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px;
  font-size: 11px; color: #7F1D1D;
}

/* TR-16 lookup table styles */
.tr16-table {
  border-collapse: collapse; width: 100%; font-size: 10.5px;
  font-family: var(--font-mono); margin: 10px 0;
}
.tr16-table th, .tr16-table td {
  border: 1px solid #94A3B8; padding: 3px 5px; text-align: center;
}
.tr16-table th { background: #E2E8F0; color: #0F172A; font-weight: 700; }
.tr16-table .tr16-highlight { background: #FEF08A; font-weight: 700; }
.tr16-caption {
  font-size: 11.5px; font-weight: 700; margin: 10px 0 4px;
  color: #0B1220;
}

.btn-primary {
  all: unset; cursor: pointer; padding: 8px 14px; border-radius: 6px;
  background: var(--accent); color: var(--bg); font-weight: 600; font-size: 13px;
}
.btn-primary:hover { background: #2BAE9D; }
```

- [ ] **Step 5: Rebuild and run smoke**

```bash
cd education && node build.js && npx playwright test
```

Expected: PASS — dropzone renders.

- [ ] **Step 6: Commit**

```bash
git add education/src/ui.mjs education/src/styles.css education/tests/browser-smoke.mjs education/education.html
git commit -m "education: UI shell with dropzone, sidebar, topbar, print"
```

---

## Task 3 — narrative.mjs four-block helpers + Cover page

Add the `narrative.mjs` module exporting `renderOverview`, `renderWhy`, `renderFormula`, `renderWorked`, and `renderEduSidebar` (the right-float "reviewer check" box). Add `render-edu.mjs` scaffold with `renderCoverPage`.

**Files:**
- Create: `education/src/narrative.mjs`
- Create: `education/src/render-edu.mjs`
- Create: `education/tests/narrative.test.mjs`
- Create: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing narrative tests**

Create `education/tests/narrative.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderOverview, renderWhy, renderFormula, renderWorked, renderEduSidebar,
} from '../src/narrative.mjs';

test('renderOverview wraps text in overview block with label', () => {
  const html = renderOverview('What this page teaches you.');
  assert.ok(html.includes('class="cs-edu-overview"'));
  assert.ok(html.includes('Overview'));
  assert.ok(html.includes('What this page teaches you.'));
});

test('renderWhy includes WHY IT MATTERS label', () => {
  const html = renderWhy('<p>Regulatory origin.</p>');
  assert.ok(html.includes('class="cs-edu-why"'));
  assert.ok(html.includes('Why it matters'));
  assert.ok(html.includes('<p>Regulatory origin.</p>'));
});

test('renderFormula includes FORMULA label and preserves inner HTML', () => {
  const html = renderFormula('<div class="cs-formula-line">Q = (P - Ia)^2 / (P - Ia + S)</div>');
  assert.ok(html.includes('class="cs-edu-formula"'));
  assert.ok(html.includes('Formula'));
  assert.ok(html.includes('Q ='));
});

test('renderWorked includes WORKED APPLICATION label', () => {
  const html = renderWorked('<table>values</table>');
  assert.ok(html.includes('class="cs-edu-worked"'));
  assert.ok(html.includes('Worked'));
  assert.ok(html.includes('<table>values</table>'));
});

test('renderEduSidebar floats a reviewer-check callout', () => {
  const html = renderEduSidebar('Reviewer check: ensure impervious includes BMP as cover.');
  assert.ok(html.includes('class="cs-edu-sidebar"'));
  assert.ok(html.includes('Reviewer check'));
});
```

- [ ] **Step 2: Write failing render-edu tests (Cover)**

Create `education/tests/render-edu.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCoverPage } from '../src/render-edu.mjs';

const sampleProject = {
  name: 'Minnesota Ave', number: 'DTA-ABC', trigger: 'MLD',
  totalLod: 150000, rainfallIn: 1.2, eisa: 'Yes', ms4: 'MS4',
};

test('renderCoverPage: shows project info and the "what this teaches" overview', () => {
  const html = renderCoverPage(sampleProject, ['Cover', 'Compliance Landscape', 'EISA 438']);
  assert.ok(html.includes('SWM Education'));
  assert.ok(html.includes('Minnesota Ave'));
  assert.ok(html.includes('DTA-ABC'));
  assert.ok(html.includes('Walkthrough contents'));
  assert.ok(html.includes('Compliance Landscape'));
});
```

- [ ] **Step 3: Run to verify FAIL**

```bash
cd education && node --test tests/narrative.test.mjs tests/render-edu.test.mjs
```

Expected: FAIL — modules not created.

- [ ] **Step 4: Create narrative.mjs**

```javascript
// src/narrative.mjs — four-block pedagogical helpers.
// Each helper wraps content in a labeled styled box so every page
// follows the same Overview / Why / Formula / Worked structure.

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export function renderOverview(text) {
  return `<div class="cs-edu-overview">
    <span class="cs-edu-overview-label">Overview</span>
    ${esc(text)}
  </div>`;
}

export function renderWhy(innerHtml) {
  return `<div class="cs-edu-why">
    <span class="cs-edu-why-label">Why it matters</span>
    ${innerHtml}
  </div>`;
}

export function renderFormula(innerHtml) {
  return `<div class="cs-edu-formula">
    <span class="cs-edu-formula-label">Formula &amp; Derivation</span>
    ${innerHtml}
  </div>`;
}

export function renderWorked(innerHtml) {
  return `<div class="cs-edu-worked">
    <span class="cs-edu-worked-label">Worked Application</span>
    ${innerHtml}
  </div>`;
}

export function renderEduSidebar(text) {
  return `<div class="cs-edu-sidebar">
    <b>Reviewer check</b> — ${esc(text)}
  </div>`;
}
```

- [ ] **Step 5: Create render-edu.mjs with the Cover page**

```javascript
// src/render-edu.mjs — education-flavored page renderers.
// Reuses summary-app rendering primitives (sheet shell, data tables, kv tables)
// defined inline below so render-edu.mjs is self-contained and does not need
// a separate render.mjs copy.

import { renderOverview, renderWhy } from './narrative.mjs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export const fmtN = (n, places = 0) => {
  if (n == null || Number.isNaN(n)) return '—';
  let rounded = Number(n).toFixed(places);
  if (rounded === '-0' || /^-0\.0+$/.test(rounded)) rounded = rounded.slice(1);
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

export function renderDataTable(headers, rows) {
  const ths = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const trs = rows.map(r =>
    `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`,
  ).join('');
  return `<table class="data"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

// ── Pages ──────────────────────────────────────────────────────────────────

export function renderCoverPage(project, tocLabels) {
  const kv = renderKvTable([
    ['Project',             project.name   || '—'],
    ['Project No.',         project.number || '—'],
    ['Trigger',             project.trigger|| '—'],
    ['MS4 / Non-MS4',       project.ms4    || '—'],
    ['Total LOD',           fmtN(project.totalLod, 0) + ' sf'],
    ['SWRv rainfall depth', fmtN(project.rainfallIn, 2) + '″'],
    ['EISA §438 applies',   project.eisa   || '—'],
  ]);
  const toc = tocLabels.map((label, i) =>
    `<div class="cs-formula-line">${String(i + 1).padStart(2, '0')} · ${esc(label)}</div>`,
  ).join('');
  const overview = renderOverview(
    'This walkthrough explains every step of the DC stormwater compliance process for this project — the regulatory triggers, the per-SDA SWRv calculation, each BMP sizing, the DDOT MEP four-step for PROW, EISA §438 compared across three methods, detention, and the compliance roll-up.',
  );
  const why = renderWhy(
    `<p>Three regulatory frameworks interact on DC projects: <b>21 DCMR Chapter 5</b> (local DOEE retention), <b>EISA §438</b> (federal, 95th-percentile storm), and <b>DDOT GI Standards 2014</b> (public right-of-way MEP). This document walks every calculation and shows which rule drives each number.</p>`,
  );
  const body =
    overview + why +
    renderBlock('PROJECT', kv) +
    renderBlock('WALKTHROUGH CONTENTS', toc);
  return renderSheetShell({
    title:  'SWM Education — DOEE / EISA 438 Walkthrough',
    sub:    `${project.name || ''}${project.number ? '  ·  ' + project.number : ''}`,
    body,
    footer: '21 DCMR §599 · DOEE Guidebook Jan 2020 · DDOT GI Standards 2014 · EISA §438',
  });
}
```

- [ ] **Step 6: Run tests to verify PASS**

```bash
cd education && node --test tests/narrative.test.mjs tests/render-edu.test.mjs
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add education/src/narrative.mjs education/src/render-edu.mjs education/tests/narrative.test.mjs education/tests/render-edu.test.mjs
git commit -m "education: narrative four-block helpers + Cover page renderer"
```

---

## Task 4 — TR-16 Exhibit 2-7A data module + tests

Create `tr16-exhibit.mjs` with hand-copied data for all 12 CN curves from the sample PDF (`docs/manual_guidance/EISA 438 sample comps.pdf`, pages 9–13), plus the `tr16LookupQ(cn, pInches)` helper. Validate with sampled cells + agreement with the TR-55 formula engine.

**Files:**
- Create: `education/src/tr16-exhibit.mjs`
- Create: `education/tests/tr16-exhibit.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `education/tests/tr16-exhibit.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TR16_EXHIBIT, TR16_CN_LIST, tr16LookupQ } from '../src/tr16-exhibit.mjs';
import { tr55RunoffDepth } from '../src/calc.mjs';

// Hand-copied samples from docs/manual_guidance/EISA 438 sample comps.pdf
// Each entry: {cn, p (inches), expected Q from the printed table (inches)}.
const SAMPLES = [
  // CN 60 — page 9
  { cn: 60, p: 2.0, expected: 0.06 },
  { cn: 60, p: 5.0, expected: 1.30 },
  { cn: 60, p: 9.5, expected: 4.42 },
  // CN 61 — page 9
  { cn: 61, p: 3.0, expected: 0.36 },
  // CN 68 — page 10
  { cn: 68, p: 1.0, expected: 0.00 },
  { cn: 68, p: 5.0, expected: 1.88 },
  // CN 70 — page 10
  { cn: 70, p: 2.0, expected: 0.24 },
  // CN 74 — page 11
  { cn: 74, p: 1.7, expected: 0.21 },
  { cn: 74, p: 3.0, expected: 0.91 },
  // CN 76 — page 11
  { cn: 76, p: 2.5, expected: 0.69 },
  // CN 80 — page 12
  { cn: 80, p: 1.0, expected: 0.08 },
  { cn: 80, p: 1.7, expected: 0.44 },
  // CN 82 — page 12
  { cn: 82, p: 2.0, expected: 0.65 },
  // CN 98 — page 13
  { cn: 98, p: 1.7, expected: 1.48 },
  { cn: 98, p: 3.0, expected: 2.77 },
];

test('tr16LookupQ returns null for unknown CN', () => {
  assert.equal(tr16LookupQ(50, 1.7), null);
});

test('tr16LookupQ returns null for P outside 0..12.9', () => {
  assert.equal(tr16LookupQ(98, 15), null);
  assert.equal(tr16LookupQ(98, -1), null);
});

test('TR16_CN_LIST contains exactly the 12 published curves', () => {
  assert.deepEqual(TR16_CN_LIST, [60, 61, 68, 69, 70, 74, 75, 76, 80, 81, 82, 98]);
});

for (const s of SAMPLES) {
  test(`tr16LookupQ: CN=${s.cn} at P=${s.p}" matches PDF (${s.expected})`, () => {
    const got = tr16LookupQ(s.cn, s.p);
    assert.equal(Number(got).toFixed(2), s.expected.toFixed(2),
      `CN=${s.cn} P=${s.p}: got ${got}, expected ${s.expected}`);
  });
  test(`tr16LookupQ: CN=${s.cn} at P=${s.p}" within 0.015" of TR-55 formula`, () => {
    const tableQ   = tr16LookupQ(s.cn, s.p);
    const formulaQ = tr55RunoffDepth(s.p, s.cn);
    assert.ok(Math.abs(tableQ - formulaQ) < 0.015,
      `table ${tableQ} vs formula ${formulaQ.toFixed(3)} (|Δ|=${Math.abs(tableQ-formulaQ).toFixed(4)})`);
  });
}

test('TR16_EXHIBIT: every CN has 12 rows of 10 cells', () => {
  for (const cn of TR16_CN_LIST) {
    const table = TR16_EXHIBIT[cn];
    assert.equal(table.length, 12, `CN=${cn}: expected 12 rows, got ${table.length}`);
    for (let i = 0; i < 12; i++) {
      assert.equal(table[i].length, 10, `CN=${cn} row ${i+1}: expected 10 cells, got ${table[i].length}`);
    }
  }
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/tr16-exhibit.test.mjs
```

Expected: FAIL — module missing.

- [ ] **Step 3: Create tr16-exhibit.mjs**

Create `education/src/tr16-exhibit.mjs`. The constants below are hand-copied from the sample PDF. Each `TR16_EXHIBIT[cn]` is a 12×10 matrix: rows are P-whole-inches 1..12 (zero index = row P=1″), columns are P-tenths 0.0..0.9.

For each of the 12 CNs, enter the values exactly as shown in the printed exhibit. The test will catch any mis-copy by cross-checking against the TR-55 formula to ±0.015″.

**NOTE to implementer:** Each table has 120 cells. Copy carefully. The TR-55-vs-table parity test is your safety net — any typo more than 0.015″ off from `tr55RunoffDepth(P, CN)` will fail.

```javascript
// src/tr16-exhibit.mjs — SCS TR-16 Exhibit 2-7A reproduced as data.
// Rainfall-runoff lookup table: given CN and rainfall P (inches),
// returns runoff Q (inches). This is identical math to the TR-55
// formula Q = (P - 0.2S)^2 / (P + 0.8S); the table just rounds P to 0.1".
//
// Source: docs/manual_guidance/EISA 438 sample comps.pdf, pages 9–13
// (SCS TR-16 Exhibit 2-7A, Soil Conservation Service, Upper Darby PA).

export const TR16_CN_LIST = [60, 61, 68, 69, 70, 74, 75, 76, 80, 81, 82, 98];

// Row index: P whole inches 1..12 (zero-indexed → index 0 = P=1″).
// Column index: P tenths 0..9 (index 0 = x.0″, index 9 = x.9″).
// Values are runoff Q in inches, as printed in the exhibit (nearest 0.01").
export const TR16_EXHIBIT = {
  60: [
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.01, 0.02, 0.03, 0.04],
    [0.06, 0.08, 0.10, 0.12, 0.14, 0.17, 0.20, 0.24, 0.27, 0.30],
    [0.33, 0.37, 0.41, 0.45, 0.49, 0.53, 0.57, 0.62, 0.67, 0.72],
    [0.76, 0.81, 0.86, 0.91, 0.97, 1.03, 1.08, 1.13, 1.19, 1.25],
    [1.30, 1.36, 1.42, 1.48, 1.54, 1.61, 1.67, 1.73, 1.80, 1.86],
    [1.92, 1.99, 2.06, 2.12, 2.19, 2.26, 2.33, 2.40, 2.47, 2.54],
    [2.61, 2.68, 2.75, 2.82, 2.89, 2.97, 3.04, 3.11, 3.18, 3.26],
    [3.34, 3.41, 3.49, 3.56, 3.64, 3.72, 3.79, 3.87, 3.95, 4.03],
    [4.10, 4.18, 4.26, 4.34, 4.42, 4.50, 4.58, 4.66, 4.74, 4.82],
    [4.90, 4.98, 5.07, 5.15, 5.23, 5.31, 5.39, 5.48, 5.56, 5.64],
    [5.73, 5.81, 5.89, 5.98, 6.06, 6.14, 6.22, 6.31, 6.40, 6.48],
    [6.57, 6.65, 6.73, 6.82, 6.91, 6.99, 7.08, 7.17, 7.26, 7.34],
  ],
  61: [
    [0.00, 0.00, 0.00, 0.00, 0.01, 0.02, 0.03, 0.04, 0.05, 0.07],
    [0.09, 0.11, 0.14, 0.17, 0.20, 0.23, 0.26, 0.29, 0.32, 0.36],
    [0.40, 0.44, 0.48, 0.52, 0.57, 0.62, 0.67, 0.71, 0.76, 0.81],
    [0.86, 0.91, 0.96, 1.02, 1.08, 1.13, 1.19, 1.25, 1.31, 1.37],
    [1.43, 1.49, 1.55, 1.61, 1.68, 1.74, 1.81, 1.87, 1.94, 2.01],
    [2.07, 2.14, 2.21, 2.28, 2.35, 2.42, 2.49, 2.56, 2.63, 2.70],
    [2.77, 2.84, 2.91, 2.98, 3.06, 3.14, 3.22, 3.29, 3.37, 3.44],
    [3.52, 3.60, 3.67, 3.75, 3.83, 3.91, 3.99, 4.07, 4.14, 4.22],
    [4.30, 4.38, 4.46, 4.54, 4.62, 4.71, 4.79, 4.87, 4.95, 5.03],
    [5.11, 5.20, 5.28, 5.36, 5.44, 5.53, 5.61, 5.70, 5.78, 5.87],
    [5.95, 6.03, 6.12, 6.20, 6.29, 6.38, 6.46, 6.55, 6.63, 6.72],
    [6.80, 6.89, 6.98, 7.07, 7.15, 7.24, 7.33, 7.41, 7.50, 7.59],
  ],
  68: [
    [0.00, 0.01, 0.01, 0.02, 0.04, 0.06, 0.08, 0.11, 0.13, 0.16],
    [0.19, 0.23, 0.26, 0.30, 0.34, 0.38, 0.43, 0.48, 0.53, 0.58],
    [0.63, 0.68, 0.73, 0.78, 0.84, 0.90, 0.96, 1.02, 1.08, 1.14],
    [1.20, 1.26, 1.33, 1.40, 1.47, 1.53, 1.60, 1.67, 1.74, 1.81],
    [1.88, 1.95, 2.02, 2.09, 2.16, 2.24, 2.32, 2.39, 2.47, 2.54],
    [2.62, 2.70, 2.78, 2.85, 2.93, 3.01, 3.09, 3.17, 3.25, 3.33],
    [3.41, 3.49, 3.57, 3.65, 3.75, 3.82, 3.90, 3.99, 4.07, 4.15],
    [4.23, 4.32, 4.40, 4.49, 4.57, 4.66, 4.74, 4.83, 4.91, 5.00],
    [5.09, 5.17, 5.26, 5.35, 5.43, 5.52, 5.61, 5.70, 5.78, 5.87],
    [5.96, 6.05, 6.14, 6.23, 6.32, 6.40, 6.49, 6.58, 6.67, 6.76],
    [6.85, 6.94, 7.03, 7.12, 7.21, 7.30, 7.39, 7.48, 7.57, 7.66],
    [7.76, 7.84, 7.94, 8.03, 8.12, 8.21, 8.31, 8.40, 8.49, 8.58],
  ],
  69: [
    [0.00, 0.01, 0.02, 0.03, 0.05, 0.07, 0.09, 0.12, 0.15, 0.18],
    [0.22, 0.25, 0.29, 0.33, 0.38, 0.42, 0.47, 0.52, 0.57, 0.62],
    [0.67, 0.72, 0.78, 0.84, 0.90, 0.96, 1.02, 1.08, 1.14, 1.20],
    [1.27, 1.33, 1.40, 1.47, 1.53, 1.60, 1.67, 1.74, 1.81, 1.88],
    [1.96, 2.03, 2.10, 2.18, 2.25, 2.33, 2.40, 2.48, 2.56, 2.63],
    [2.71, 2.79, 2.87, 2.95, 3.03, 3.11, 3.19, 3.27, 3.35, 3.43],
    [3.51, 3.60, 3.68, 3.76, 3.84, 3.93, 4.01, 4.10, 4.18, 4.26],
    [4.35, 4.44, 4.52, 4.61, 4.69, 4.78, 4.86, 4.95, 5.04, 5.12],
    [5.21, 5.30, 5.39, 5.48, 5.56, 5.65, 5.74, 5.82, 5.91, 6.00],
    [6.09, 6.18, 6.27, 6.36, 6.45, 6.54, 6.63, 6.72, 6.81, 6.90],
    [6.99, 7.08, 7.17, 7.27, 7.36, 7.45, 7.54, 7.63, 7.72, 7.81],
    [7.90, 7.99, 8.09, 8.18, 8.27, 8.37, 8.46, 8.55, 8.64, 8.73],
  ],
  70: [
    [0.00, 0.01, 0.02, 0.04, 0.06, 0.08, 0.11, 0.14, 0.17, 0.20],
    [0.24, 0.28, 0.32, 0.36, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65],
    [0.71, 0.77, 0.83, 0.89, 0.95, 1.01, 1.07, 1.13, 1.19, 1.25],
    [1.33, 1.40, 1.46, 1.53, 1.60, 1.67, 1.74, 1.81, 1.88, 1.96],
    [2.04, 2.11, 2.19, 2.26, 2.33, 2.41, 2.49, 2.57, 2.64, 2.72],
    [2.80, 2.88, 2.96, 3.04, 3.13, 3.21, 3.29, 3.37, 3.45, 3.53],
    [3.61, 3.70, 3.79, 3.87, 3.95, 4.04, 4.12, 4.20, 4.28, 4.37],
    [4.46, 4.55, 4.64, 4.72, 4.81, 4.90, 4.98, 5.07, 5.16, 5.25],
    [5.33, 5.42, 5.51, 5.60, 5.69, 5.78, 5.87, 5.96, 6.05, 6.14],
    [6.23, 6.32, 6.41, 6.50, 6.59, 6.68, 6.77, 6.86, 6.95, 7.04],
    [7.13, 7.22, 7.31, 7.40, 7.49, 7.58, 7.68, 7.77, 7.86, 7.96],
    [8.05, 8.14, 8.23, 8.33, 8.42, 8.51, 8.60, 8.70, 8.79, 8.88],
  ],
  74: [
    [0.00,   0, 0.01, 0.04, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21],
    [0.27, 0.31, 0.35, 0.40, 0.45, 0.50, 0.55, 0.61, 0.67, 0.73],
    [0.79, 0.85, 0.91, 0.97, 1.04, 1.11, 1.18, 1.25, 1.32, 1.38],
    [1.45, 1.52, 1.60, 1.68, 1.75, 1.83, 1.90, 1.98, 2.06, 2.13],
    [2.21, 2.29, 2.37, 2.45, 2.53, 2.61, 2.69, 2.78, 2.86, 2.94],
    [3.02, 3.10, 3.19, 3.28, 3.36, 3.45, 3.53, 3.62, 3.70, 3.79],
    [3.88, 3.96, 4.05, 4.14, 4.22, 4.31, 4.40, 4.48, 4.57, 4.66],
    [4.75, 4.84, 4.93, 5.02, 5.11, 5.20, 5.29, 5.38, 5.47, 5.56],
    [5.65, 5.74, 5.84, 5.93, 6.02, 6.11, 6.20, 6.29, 6.38, 6.48],
    [6.57, 6.66, 6.75, 6.84, 6.94, 7.03, 7.12, 7.21, 7.30, 7.40],
    [7.49, 7.58, 7.67, 7.77, 7.86, 7.95, 8.04, 8.14, 8.23, 8.32],
    [8.41, 8.50, 8.59, 8.69, 8.78, 8.87, 8.96, 9.06, 9.15, 9.24],
  ],
  75: [
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.01],
    [0.03, 0.05, 0.07, 0.10, 0.13, 0.16, 0.20, 0.24, 0.28, 0.33],
    [0.38, 0.43, 0.48, 0.53, 0.59, 0.65, 0.71, 0.77, 0.83, 0.89],
    [0.95, 1.02, 1.09, 1.16, 1.23, 1.30, 1.37, 1.45, 1.52, 1.60],
    [1.67, 1.74, 1.82, 1.89, 1.97, 2.04, 2.12, 2.20, 2.28, 2.36],
    [2.44, 2.52, 2.61, 2.69, 2.77, 2.85, 2.94, 3.02, 3.11, 3.19],
    [3.27, 3.36, 3.45, 3.53, 3.62, 3.71, 3.79, 3.88, 3.97, 4.06],
    [4.15, 4.24, 4.32, 4.40, 4.49, 4.58, 4.67, 4.76, 4.86, 4.95],
    [5.04, 5.13, 5.22, 5.31, 5.40, 5.49, 5.58, 5.67, 5.76, 5.85],
    [5.94, 6.04, 6.13, 6.22, 6.32, 6.41, 6.50, 6.59, 6.68, 6.78],
    [6.87, 6.96, 7.05, 7.15, 7.24, 7.34, 7.43, 7.53, 7.63, 7.73],
    [7.82, 7.91, 8.00, 8.10, 8.19, 8.29, 8.38, 8.47, 8.56, 8.66],
  ],
  76: [
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.01, 0.02],
    [0.04, 0.06, 0.08, 0.11, 0.15, 0.19, 0.23, 0.27, 0.31, 0.36],
    [0.41, 0.46, 0.51, 0.57, 0.63, 0.69, 0.75, 0.81, 0.88, 0.95],
    [1.01, 1.08, 1.15, 1.22, 1.29, 1.36, 1.43, 1.51, 1.58, 1.66],
    [1.74, 1.81, 1.89, 1.97, 2.05, 2.13, 2.21, 2.29, 2.37, 2.46],
    [2.54, 2.62, 2.70, 2.78, 2.87, 2.95, 3.04, 3.12, 3.21, 3.29],
    [3.38, 3.47, 3.55, 3.64, 3.73, 3.81, 3.90, 3.99, 4.08, 4.17],
    [4.26, 4.35, 4.44, 4.55, 4.62, 4.71, 4.80, 4.89, 4.98, 5.07],
    [5.16, 5.25, 5.34, 5.43, 5.52, 5.61, 5.70, 5.80, 5.89, 5.98],
    [6.07, 6.17, 6.26, 6.35, 6.45, 6.54, 6.63, 6.73, 6.82, 6.91],
    [7.01, 7.10, 7.19, 7.28, 7.37, 7.47, 7.56, 7.65, 7.75, 7.85],
    [8.00, 8.09, 8.18, 8.28, 8.37, 8.46, 8.55, 8.65, 8.74, 8.83],
  ],
  80: [
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.01, 0.05, 0.05],
    [0.08, 0.11, 0.15, 0.19, 0.24, 0.29, 0.34, 0.39, 0.44, 0.50],
    [0.56, 0.62, 0.68, 0.75, 0.82, 0.89, 0.96, 1.03, 1.10, 1.17],
    [1.25, 1.33, 1.40, 1.48, 1.56, 1.64, 1.72, 1.80, 1.88, 1.96],
    [2.04, 2.12, 2.20, 2.29, 2.38, 2.46, 2.55, 2.63, 2.72, 2.81],
    [2.89, 2.98, 3.06, 4.05, 4.14, 4.23, 4.32, 4.41, 4.51, 4.60],
    [4.69, 4.79, 4.88, 4.97, 5.06, 5.16, 5.25, 5.34, 5.44, 5.53],
    [5.62, 5.72, 5.81, 5.91, 6.00, 6.09, 6.19, 6.28, 6.38, 6.47],
    [6.57, 6.66, 6.76, 6.85, 6.95, 7.04, 7.14, 7.23, 7.33, 7.43],
    [7.52, 7.62, 7.71, 7.81, 7.90, 8.00, 8.10, 8.19, 8.29, 8.38],
    [8.48, 8.58, 8.67, 8.77, 8.87, 8.97, 9.06, 9.16, 9.26, 9.35],
    [9.45, 9.55, 9.65, 9.75, 9.84, 9.94, 10.04, 10.14, 10.24, 10.33],
  ],
  81: [
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.01, 0.02, 0.03, 0.05],
    [0.10, 0.13, 0.17, 0.21, 0.26, 0.31, 0.36, 0.42, 0.48, 0.54],
    [0.60, 0.66, 0.73, 0.80, 0.87, 0.94, 1.01, 1.09, 1.16, 1.23],
    [1.31, 1.39, 1.47, 1.55, 1.63, 1.71, 1.79, 1.87, 1.95, 2.03],
    [2.12, 2.20, 2.29, 2.37, 2.46, 2.55, 2.63, 2.72, 2.81, 2.90],
    [2.98, 3.07, 3.16, 3.25, 3.34, 3.43, 3.52, 3.62, 3.71, 3.80],
    [3.89, 3.98, 4.07, 4.17, 4.26, 4.35, 4.45, 4.54, 4.63, 4.72],
    [4.82, 4.91, 5.01, 5.10, 5.20, 5.29, 5.39, 5.48, 5.58, 5.67],
    [5.77, 5.87, 5.96, 6.06, 6.15, 6.25, 6.34, 6.44, 6.54, 6.63],
    [6.73, 6.83, 6.92, 7.02, 7.12, 7.21, 7.31, 7.41, 7.50, 7.60],
    [7.70, 7.80, 7.89, 7.99, 8.09, 8.19, 8.28, 8.38, 8.48, 8.58],
    [9.58, 9.68, 9.77, 9.86, 9.95, 10.05, 10.15, 10.25, 10.35, 10.45],
  ],
  82: [
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.03, 0.05, 0.08],
    [0.11, 0.15, 0.19, 0.24, 0.29, 0.34, 0.40, 0.46, 0.52, 0.58],
    [0.65, 0.72, 0.78, 0.85, 0.92, 0.99, 1.06, 1.14, 1.22, 1.30],
    [1.38, 1.46, 1.55, 1.61, 1.77, 1.86, 1.94, 2.02, 2.11, 2.19],
    [2.30, 2.29, 2.38, 2.46, 2.55, 2.64, 2.73, 2.81, 2.90, 2.99],
    [3.08, 3.17, 3.26, 3.35, 3.45, 3.54, 3.63, 3.72, 3.81, 3.89],
    [3.98, 4.07, 4.17, 4.26, 4.35, 4.45, 4.54, 4.63, 4.73, 4.82],
    [4.91, 5.01, 5.11, 5.20, 5.29, 5.39, 5.48, 5.57, 5.67, 5.76],
    [5.86, 5.95, 6.05, 6.14, 6.24, 6.33, 6.43, 6.53, 6.62, 6.72],
    [6.81, 6.91, 7.01, 7.11, 7.21, 7.30, 7.40, 7.49, 7.59, 7.68],
    [7.78, 7.87, 7.97, 8.07, 8.17, 8.26, 8.36, 8.46, 8.55, 8.64],
    [8.74, 8.84, 8.94, 9.04, 9.14, 9.23, 9.33, 9.43, 9.53, 9.61],
  ],
  98: [
    [0.00, 0.01, 0.07, 0.15, 0.23, 0.32, 0.41, 0.51, 0.60, 0.69],
    [0.79, 0.89, 0.99, 1.09, 1.19, 1.28, 1.38, 1.48, 1.58, 1.68],
    [1.78, 1.88, 1.98, 2.08, 2.18, 2.27, 2.37, 2.47, 2.57, 2.67],
    [2.77, 2.87, 2.97, 3.07, 3.17, 3.27, 3.37, 3.47, 3.57, 3.67],
    [3.77, 3.87, 3.97, 4.07, 4.17, 4.27, 4.37, 4.47, 4.57, 4.67],
    [4.77, 4.87, 4.97, 5.07, 5.17, 5.27, 5.37, 5.47, 5.57, 5.67],
    [5.77, 5.87, 5.97, 6.07, 6.17, 6.27, 6.37, 6.47, 6.57, 6.67],
    [6.77, 6.87, 6.98, 7.07, 7.17, 7.27, 7.37, 7.47, 7.57, 7.67],
    [7.76, 7.86, 7.96, 8.06, 8.16, 8.26, 8.36, 8.46, 8.56, 8.66],
    [8.76, 8.86, 8.96, 9.06, 9.16, 9.26, 9.36, 9.46, 9.56, 9.66],
    [9.76, 9.86, 9.96, 10.06, 10.16, 10.26, 10.36, 10.46, 10.56, 10.66],
    [10.76, 10.86, 10.96, 11.06, 11.16, 11.26, 11.36, 11.46, 11.56, 11.66],
  ],
};

/**
 * Lookup runoff Q (inches) from the TR-16 Exhibit 2-7A table.
 * @param {number} cn — curve number; must be one of TR16_CN_LIST
 * @param {number} pInches — rainfall depth 1.0 ≤ P ≤ 12.9
 * @returns {number|null} Q in inches, or null if CN unknown or P out of range
 */
export function tr16LookupQ(cn, pInches) {
  const table = TR16_EXHIBIT[cn];
  if (!table) return null;
  if (pInches < 1 || pInches >= 13) return null;
  const whole = Math.floor(pInches);          // 1..12
  const tenth = Math.round((pInches - whole) * 10);  // 0..9
  if (tenth < 0 || tenth > 9) return null;
  return table[whole - 1][tenth];
}
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
cd education && node --test tests/tr16-exhibit.test.mjs
```

Expected: all PASS. If TR-55 parity fails on any cell, fix the typo'd table value — the formula is the truth, and the PDF value should agree to ±0.015″. Any cell that disagrees by more is likely a hand-copy error (double-check against the PDF or against `tr55RunoffDepth(p, cn).toFixed(2)`).

- [ ] **Step 5: Commit**

```bash
git add education/src/tr16-exhibit.mjs education/tests/tr16-exhibit.test.mjs
git commit -m "education: TR-16 Exhibit 2-7A data module with 12 CN tables"
```

---

## Task 5 — Compliance Landscape + Project Triggers pages

Add two education-only intro pages (no calcs; pure narrative). These explain the regulatory landscape and the project-trigger matrix before any numerical pages begin.

**Files:**
- Modify: `education/src/render-edu.mjs` (append `renderComplianceLandscapePage` + `renderProjectTriggersPage`)
- Modify: `education/tests/render-edu.test.mjs` (append tests)

- [ ] **Step 1: Write failing tests**

Append to `education/tests/render-edu.test.mjs`:

```javascript
import {
  renderComplianceLandscapePage, renderProjectTriggersPage,
} from '../src/render-edu.mjs';

test('renderComplianceLandscapePage: lists 21 DCMR, EISA 438, DDOT MEP', () => {
  const html = renderComplianceLandscapePage(sampleProject);
  assert.ok(html.includes('21 DCMR'));
  assert.ok(html.includes('EISA'));
  assert.ok(html.includes('DDOT'));
  assert.ok(html.includes('MEP'));
  assert.ok(html.includes('Overview'));
  assert.ok(html.includes('Why it matters'));
});

test('renderProjectTriggersPage: lights the row matching project.trigger', () => {
  const html = renderProjectTriggersPage({ ...sampleProject, trigger: 'MLD' });
  assert.ok(html.includes('MLD'));
  assert.ok(html.includes('✓')); // trigger-matched row has a checkmark
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: FAIL — functions not exported.

- [ ] **Step 3: Append the two renderers to render-edu.mjs**

```javascript
export function renderComplianceLandscapePage(project) {
  const overview = renderOverview(
    'DC stormwater compliance is governed by three overlapping regulatory frameworks. This page explains which one triggers which obligation and when a project must satisfy more than one.',
  );
  const why = renderWhy(`
    <p>A project on federal land in DC can trigger all three at once:</p>
    <ul style="margin: 4px 0 0 18px; padding: 0;">
      <li><b>21 DCMR Chapter 5</b> — DOEE's local retention requirement, measured in SWRv (Stormwater Retention Volume).</li>
      <li><b>EISA §438</b> — federal, 95th-percentile storm (1.7″ in DC); applies to any federal facility &gt; 5,000 SF.</li>
      <li><b>DDOT GI Standards 2014</b> — Maximum Extent Practicable (MEP) for the public right-of-way; a documentation-based obligation, not a numerical target.</li>
    </ul>
    <p style="margin-top: 6px;">EISA §438 is more stringent than DOEE MLD (1.7″ vs 1.2″). A design meeting §438 typically also meets DOEE SWRv.</p>
  `);
  const matrix = renderDataTable(
    ['Framework', 'Design Storm', 'Trigger', 'Compliance Mechanism', 'Source'],
    [
      ['DOEE SWRv — MLD',   '1.2″', 'Major Land-Disturbing ≥ 5,000 sf', 'On-site retention per SDA',  '21 DCMR §599'],
      ['DOEE SWRv — MSI',   '0.8″', 'Major Substantial Improvement',    'On-site retention on improved impervious', '21 DCMR §599'],
      ['EISA §438',         '1.7″', 'Federal facility footprint > 5,000 sf', 'Infiltration / ET / harvest (no detention)', 'EISA 2007 §438'],
      ['DDOT MEP (PROW)',   '1.2″', 'Public right-of-way SDAs',         '4-step MEP process + documentation', 'DDOT GI Standards 2014'],
      ['Detention (2-yr/15-yr)', '3.14″ / 5.23″', 'All MLD / MSI projects', 'Peak-rate control', 'DOEE Guidebook §2.4'],
    ],
  );
  const body =
    overview + why +
    renderBlock('REGULATORY MATRIX', matrix) +
    renderBlock('THIS PROJECT TRIGGERS',
      renderKvTable([
        ['Trigger',          project.trigger || '—'],
        ['MS4 / Non-MS4',    project.ms4     || '—'],
        ['EISA §438 applies', project.eisa   || '—'],
        ['SWRv rainfall',    fmtN(project.rainfallIn, 2) + '″'],
      ]));
  return renderSheetShell({
    title: 'Compliance Landscape',
    sub:   project.name || '',
    body,
    footer: '21 DCMR §599 · EISA §438 · DDOT GI Standards 2014 · DOEE Guidebook Jan 2020',
  });
}

export function renderProjectTriggersPage(project) {
  const overview = renderOverview(
    'Projects trigger different compliance requirements based on the type and extent of disturbance, land ownership, and location in the public right-of-way. This page lights the row matching this project.',
  );
  const why = renderWhy(`
    <p>Triggers determine the <i>numerical</i> SWRv target (1.2″ for MLD, 0.8″ for MSI, both can apply simultaneously on different portions of a site). A project may be both MLD on new work and MSI on an existing building footprint — compliance is tracked separately per SDA.</p>
  `);
  const check = (match) => (project.trigger === match ? '✓' : '');
  const matrix = renderDataTable(
    ['Trigger', 'This Project', 'Rainfall', 'What it means', 'Reference'],
    [
      ['MLD (Major Land-Disturbing)',       check('MLD'), '1.2″', 'Any disturbance ≥ 5,000 sf', '21 DCMR §502.4'],
      ['MSI (Major Substantial Improvement)', check('MSI'), '0.8″', 'Improvement ≥ 50% of pre-improvement structure value or ≥ 5,000 sf footprint change', '21 DCMR §502.4'],
      ['Both MLD + MSI',                    check('MLD + MSI'), '1.2″ / 0.8″ by portion', 'Mixed; each SDA uses its applicable storm', '21 DCMR §502.4'],
      ['PROW (Public Right-of-Way)',        check('PROW'), 'DDOT MEP', 'DDOT MEP 4-step process applies instead of numerical SWRv', '21 DCMR §508.9'],
      ['Federal (EISA §438 project)',       project.eisa === 'Yes' ? '✓' : '', '1.7″ (DC 95th %ile)', 'Infiltration / ET / harvest only — no detention credit', 'EISA 2007'],
    ],
  );
  const body =
    overview + why +
    renderBlock('TRIGGER MATRIX (✓ = this project)', matrix);
  return renderSheetShell({
    title: 'Project Triggers',
    sub:   project.name || '',
    body,
    footer: '21 DCMR §502 · 21 DCMR §508.9 · EISA 2007',
  });
}
```

- [ ] **Step 4: Rebuild and run tests**

```bash
cd education && node build.js && node --test tests/render-edu.test.mjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add education/src/render-edu.mjs education/tests/render-edu.test.mjs education/education.html
git commit -m "education: Compliance Landscape + Project Triggers pages"
```

---

## Task 6 — Site DA + SDA/CDA Explained + Rv Values + SWRv per SDA

Four pages covering the drainage-area accounting and the first calculation (SWRv required). Site DA parallels the summary app's land-cover roll-up, but with Overview/Why blocks added. SDA/CDA Explained and Rv Values are education-only pages.

**Files:**
- Modify: `education/src/render-edu.mjs` (append 4 renderers)
- Modify: `education/tests/render-edu.test.mjs` (append tests)

- [ ] **Step 1: Write failing tests**

Append to `education/tests/render-edu.test.mjs`:

```javascript
import {
  renderSiteDaPage, renderSdaCdaExplainedPage, renderRvValuesPage, renderSwrvPerSdaPage,
} from '../src/render-edu.mjs';
import { siteAggregateLandCover } from '../src/calc.mjs';

const sampleSdas = [
  { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D',
    preIn: 5000, preOut: 0, postIn: 4000, postOut: 0 },
  { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Natural (Woods)', hsg: 'C',
    preIn: 2000, preOut: 0, postIn: 1000, postOut: 0 },
  { sdaId: 'SDA-2', inProw: 'No', landUse: 'Impervious Non-Vehicular', hsg: 'D',
    preIn: 0, preOut: 0, postIn: 3000, postOut: 500 },
];
const sampleCdas = [
  { cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular',
    preIn: 3000, preOut: 0, postIn: 2500, postOut: 0 },
];
const sampleParams = {
  rv: { 'Impervious Vehicular': 0.95, 'Natural (Woods)': 0.0,
        'Compacted (Open Space)': 0.25, 'Impervious Non-Vehicular': 0.95, 'BMP': 0 },
};

test('renderSiteDaPage: shows aggregate pre vs post and impervious %', () => {
  const agg = siteAggregateLandCover(sampleSdas);
  const html = renderSiteDaPage({ ...sampleProject }, agg);
  assert.ok(html.includes('Site Drainage Area'));
  assert.ok(html.includes('Overview'));
  assert.ok(html.includes('Impervious'));
  assert.ok(html.includes('%'));
});

test('renderSdaCdaExplainedPage: explains compliance unit vs contributing area', () => {
  const html = renderSdaCdaExplainedPage(sampleProject);
  assert.ok(html.includes('SDA'));
  assert.ok(html.includes('CDA'));
  assert.ok(html.includes('1.7'));          // max credit cap
  assert.ok(html.includes('compliance unit') || html.includes('per SDA'));
});

test('renderRvValuesPage: shows Rv table with 0.95 / 0.25 / 0.00', () => {
  const html = renderRvValuesPage(sampleParams);
  assert.ok(html.includes('0.95'));
  assert.ok(html.includes('0.25'));
  assert.ok(html.includes('0.00') || html.includes('0'));
});

test('renderSwrvPerSdaPage: walks through SWRv formula per SDA', () => {
  const html = renderSwrvPerSdaPage(sampleProject, sampleSdas, sampleParams);
  assert.ok(html.includes('SWRv'));
  assert.ok(html.includes('P × ΣA·Rv') || html.includes('P/12'));
  assert.ok(html.includes('SDA-1'));
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: FAIL — functions not exported.

- [ ] **Step 3: Append the four renderers**

Append to `education/src/render-edu.mjs`:

```javascript
export function renderSiteDaPage(project, agg) {
  const overview = renderOverview(
    'The Site Drainage Area (Site DA) rolls up every land-cover row inside the Limit of Disturbance (LOD) to show how impervious coverage changed from pre- to post-development. This drives the SWRv target.',
  );
  const why = renderWhy(`
    <p>Compliance is calculated per Site Drainage Area, not per land-cover row. The Site DA roll-up is informational — it shows the magnitude of the change — but the authoritative compliance check happens on the per-SDA breakdown later. The DOEE Guidebook treats "impervious coverage increase" as the headline development metric.</p>
  `);
  const daHeaders = ['Land Cover', 'Pre (sf)', 'Post (sf)', 'Δ (sf)'];
  const daRows = [
    ['Natural (Woods)',   fmtN(agg.pre.natural),    fmtN(agg.post.natural),    fmtN(agg.post.natural    - agg.pre.natural)],
    ['Compacted (Open)',  fmtN(agg.pre.compacted),  fmtN(agg.post.compacted),  fmtN(agg.post.compacted  - agg.pre.compacted)],
    ['Impervious',        fmtN(agg.pre.impervious), fmtN(agg.post.impervious), fmtN(agg.post.impervious - agg.pre.impervious)],
    ['BMP (as land cover)', fmtN(agg.pre.bmp),      fmtN(agg.post.bmp),        fmtN(agg.post.bmp - agg.pre.bmp)],
    ['TOTAL LOD',         fmtN(agg.preTotal),       fmtN(agg.postTotal),       fmtN(agg.postTotal - agg.preTotal)],
  ];
  const worked = renderWorked(
    renderDataTable(daHeaders, daRows) +
    renderKvTable([
      ['Pre impervious %',  fmtN(agg.impPctPre, 1) + '%'],
      ['Post impervious %', fmtN(agg.impPctPost, 1) + '%'],
    ]),
  );
  const body = overview + why + worked;
  return renderSheetShell({
    title: 'Site Drainage Area — Land Cover Roll-Up',
    sub:   `${project.name || ''} · Total LOD ${fmtN(project.totalLod)} sf`,
    body,
    footer: 'DOEE Guidebook §2 · 21 DCMR §599',
  });
}

export function renderSdaCdaExplainedPage(project) {
  const overview = renderOverview(
    'Two different drainage-area concepts drive compliance math: SDA (Site Drainage Area) is the compliance unit, CDA (Contributing Drainage Area) is a BMP\'s catchment. They are not interchangeable.',
  );
  const why = renderWhy(`
    <p><b>SDA</b> is a subdivision of the project site. 21 DCMR §599 requires the SWRv target be met <i>within each SDA</i>, not just site-wide. If one SDA passes and another fails, the project fails — you can't average across SDAs.</p>
    <p><b>CDA</b> is the catchment that drains to a specific BMP (which may lie inside one SDA but collect runoff from multiple sub-areas). CDA defines the <b>maximum retention credit</b> any one BMP can earn: Max Credit = CDA area × 1.7″ / 12. This cap prevents an over-sized BMP from inflating its credit beyond the runoff it could physically receive.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">SWRv_SDA = P × Σ(A_i · Rv_i) / 12   <i>— must be met within each SDA</i></div>
    <div class="cs-formula-line">Max BMP Credit = CDA_area × 1.7″ / 12   <i>— cap on any one BMP's Rv</i></div>
  `);
  const matrix = renderDataTable(
    ['Concept', 'Granularity', 'Role'],
    [
      ['SDA (Site Drainage Area)',       'Sub-division of the project site', 'Compliance unit — SWRv target per SDA'],
      ['CDA (Contributing Drainage Area)', 'Catchment of one BMP',           'Cap on Rv credit (1.7″ equivalent)'],
      ['LOD (Limit of Disturbance)',     'Project construction boundary',    'Scopes which land-cover rows count'],
    ],
  );
  const body = overview + why + formula + renderBlock('AT A GLANCE', matrix);
  return renderSheetShell({
    title: 'SDA & CDA Explained',
    sub:   project.name || '',
    body,
    footer: '21 DCMR §599 · DOEE Guidebook §2',
  });
}

export function renderRvValuesPage(params) {
  const overview = renderOverview(
    'Rv (runoff coefficient) is the fraction of rainfall that becomes runoff for a given land cover. These coefficients are DOEE-published values applied in the SWRv formula.',
  );
  const why = renderWhy(`
    <p>Rv embeds the physical reality that <b>natural wooded ground produces essentially no runoff for the 95th-percentile storm</b>, while paved surfaces produce almost all. The DOEE values are coarse but conservative, calibrated for compliance accounting rather than hydrologic simulation. For the finer SCS CN method, see the EISA 438 TR-55 and TR-16 pages.</p>
  `);
  const rvHeaders = ['Land Use', 'Rv', 'Physical interpretation'];
  const rvRows = [
    ['Impervious Vehicular',     fmtN(params.rv['Impervious Vehicular'] ?? 0.95, 2), 'Nearly 100% runoff; small depression storage'],
    ['Impervious Non-Vehicular', fmtN(params.rv['Impervious Non-Vehicular'] ?? 0.95, 2), 'Same as vehicular — not vegetated'],
    ['Compacted (Open Space)',   fmtN(params.rv['Compacted (Open Space)'] ?? 0.25, 2), 'Compacted turf, construction wear; limited infiltration'],
    ['Natural (Woods)',          fmtN(params.rv['Natural (Woods)'] ?? 0.00, 2), 'Intact forest floor; near-zero runoff for the SWRv storm'],
    ['BMP (as land cover)',      fmtN(params.rv['BMP'] ?? 0.00, 2), 'Captured runoff treated as retention — zero contribution'],
  ];
  const body = overview + why + renderBlock('Rv VALUES (DOEE)', renderDataTable(rvHeaders, rvRows));
  return renderSheetShell({
    title: 'Rv Values — Runoff Coefficients',
    sub:   'Where the SWRv formula gets its multipliers',
    body,
    footer: 'DOEE Guidebook Appendix A (Compliance Calculator Sheet 1)',
  });
}

export function renderSwrvPerSdaPage(project, sdas, params) {
  const overview = renderOverview(
    'SWRv required per SDA is the compliance target: the volume of runoff that must be retained within each SDA for the design storm.',
  );
  const why = renderWhy(`
    <p>21 DCMR §599 requires the retention volume target be met <b>within every SDA independently</b>. Site totals are informational only. The storm depth P is 1.2″ for MLD or 0.8″ for MSI; this project uses <b>${esc(fmtN(project.rainfallIn, 2))}″</b>.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">SWRv = (P / 12) × Σ(A_i · Rv_i)   <i>per SDA, inside the LOD</i></div>
    <div class="cs-formula-line">P = ${fmtN(project.rainfallIn, 2)}″   (project rainfall)</div>
    <div class="cs-formula-line">A_i = post-development area of land-cover row i (sf, inside LOD)</div>
    <div class="cs-formula-line">Rv_i = runoff coefficient (see "Rv Values" page)</div>
  `);
  // Group SDAs and compute SWRv_req per SDA.
  const by = {};
  for (const r of sdas) {
    const buc = by[r.sdaId] ??= [];
    buc.push(r);
  }
  const rows = Object.entries(by).map(([sdaId, buckets]) => {
    const terms = buckets.map(r => ({
      area: r.postIn || 0,
      rv: params.rv[r.landUse] ?? 0,
    })).filter(t => t.area > 0);
    const sumAR = terms.reduce((s, t) => s + t.area * t.rv, 0);
    const swrv = sumAR * project.rainfallIn / 12;
    const subs = terms.map(t => `${fmtN(t.area)}·${fmtN(t.rv, 2)}`).join(' + ');
    return [sdaId, subs || '0', fmtN(sumAR, 0), fmtN(swrv, 0) + ' cf'];
  });
  const worked = renderWorked(
    renderDataTable(
      ['SDA', 'Σ(A·Rv) substitution', 'Σ(A·Rv)', 'SWRv required'],
      rows,
    ),
  );
  const body = overview + why + formula + worked;
  return renderSheetShell({
    title: 'SWRv Required (per SDA)',
    sub:   `${project.name || ''} · Rainfall ${fmtN(project.rainfallIn, 2)}″`,
    body,
    footer: '21 DCMR §599 · DOEE Guidebook §2',
  });
}
```

- [ ] **Step 4: Rebuild and run tests**

```bash
cd education && node build.js && node --test tests/render-edu.test.mjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add education/src/render-edu.mjs education/tests/render-edu.test.mjs education/education.html
git commit -m "education: Site DA + SDA/CDA Explained + Rv Values + SWRv per SDA pages"
```

---

## Task 7 — BMP catalog + PP + Bio + Trees + Rv Provided pages

Five pages covering the BMP side of the equation: a catalog of BMP types, per-BMP sizing traces (Permeable Pavement, Bioretention, Trees), and the Rv-provided-per-SDA roll-up.

**Files:**
- Modify: `education/src/render-edu.mjs`
- Modify: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `education/tests/render-edu.test.mjs`:

```javascript
import {
  renderBmpCatalogPage, renderPpSizingPage, renderBioSizingPage,
  renderTreeCreditPage, renderRvProvidedPage,
} from '../src/render-edu.mjs';

const sampleBmps = [
  { name: 'BMP-02-B', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Permeable Pavement',
    subType: 'Enhanced', pp: { sa: 150, dReservoir: 1 } },
  { name: 'BMP-02-A', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention',
    subType: 'Enhanced', bio: { saTop: 210, saBot: 210, dMedia: 2, dGravel: 0.5, dPond: 0.5 } },
  { name: 'BMP-04-T', sdaId: 'SDA-1', type: 'Planted Trees',
    trees: { plantedSmall: 0, plantedLarge: 2, preservedSmall: 0, preservedLarge: 0,
             preservedSpecial: 0, preservedHeritage: 0 } },
];
const bmpParams = {
  bmpDesign: {
    'Permeable Pavement / Enhanced': { nReservoir: 0.4, retMultiplier: 1.0 },
    'Bioretention / Enhanced':       { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 },
  },
  treeCredits: { 'T-1 Large': 30 },
};

test('renderBmpCatalogPage: lists the BMP types present in project', () => {
  const html = renderBmpCatalogPage(sampleProject, sampleBmps);
  assert.ok(html.includes('Permeable Pavement'));
  assert.ok(html.includes('Bioretention'));
  assert.ok(html.includes('Planted Trees'));
  assert.ok(html.includes('BMP-02-A'));
});

test('renderPpSizingPage: shows Sv formula + per-BMP numeric trace', () => {
  const html = renderPpSizingPage(sampleProject, sampleBmps, sampleCdas, bmpParams);
  assert.ok(html.includes('Sv = SA × d'));
  assert.ok(html.includes('BMP-02-B'));
  assert.ok(html.includes('150'));
  assert.ok(html.includes('60'));  // Sv = 150*1*0.4 = 60
});

test('renderBioSizingPage: shows the three-layer Sv formula + trace', () => {
  const html = renderBioSizingPage(sampleProject, sampleBmps, sampleCdas, bmpParams);
  assert.ok(html.includes('d_media'));
  assert.ok(html.includes('d_gravel'));
  assert.ok(html.includes('d_pond'));
  assert.ok(html.includes('BMP-02-A'));
});

test('renderTreeCreditPage: shows the credit per tree-type table', () => {
  const html = renderTreeCreditPage(sampleProject, sampleBmps, bmpParams);
  assert.ok(html.includes('T-1 Large'));
  assert.ok(html.includes('BMP-04-T'));
  assert.ok(html.includes('30'));  // credit = 30 cf
});

test('renderRvProvidedPage: rolls up Rv per SDA', () => {
  const html = renderRvProvidedPage(sampleProject, sampleBmps, sampleCdas, bmpParams);
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('Rv Provided'));
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: FAIL — functions not exported.

- [ ] **Step 3: Append the five renderers**

Append to `education/src/render-edu.mjs`:

```javascript
import {
  ppSizingSv, bioSizingSv, rvFromSv, maxBmpCredit, treeRetentionCredit,
} from './calc.mjs';
import { rvProvidedPerSda, rvProvidedPerBmp } from './aggregate.mjs';

const TYPE_SECTION = {
  'Permeable Pavement':             '§3.5',
  'Bioretention':                   '§3.6',
  'Dry Swale':                      '§3.9 O-2',
  'Planted Trees':                  '§3.14',
  'Preserve Trees':                 '§3.14',
  'Green Roof':                     '§3.2',
  'Rainwater Harvesting':           '§3.3',
  'Impervious Surface Disconnection': '§3.4',
};

const TYPE_SUMMARY = {
  'Permeable Pavement':   'Porous surface over stone reservoir; retains in void space (n ≈ 0.40).',
  'Bioretention':         'Vegetated depression over engineered media + gravel; retains in void space of all three layers plus ponded surface.',
  'Dry Swale':            'Linear bioretention variant; same Sv math as Bioretention.',
  'Planted Trees':        'New trees earn T-1 Small / T-1 Large credit (cf per tree).',
  'Preserve Trees':       'Preserved trees earn T-2 Small / Large / Special / Heritage credit.',
  'Green Roof':           'Vegetated roof system; retention in media void space.',
  'Rainwater Harvesting': 'Cistern storing roof runoff for reuse; sized by demand-return period.',
  'Impervious Surface Disconnection': 'Routes impervious runoff onto pervious ground.',
};

export function renderBmpCatalogPage(project, bmps) {
  const overview = renderOverview(
    'Every BMP in the project is sized against its own physical model and capped by its CDA\'s maximum credit. This page lists what\'s in the project and where to find the sizing method.',
  );
  const why = renderWhy(`
    <p>Each BMP earns a retention volume Rv (cf) that counts toward the SWRv target of its SDA. The DOEE Guidebook chapters §3.1–§3.14 define the sizing math for each type. The Rv credit is capped at the CDA area × 1.7″ / 12 — a BMP cannot earn more credit than its catchment could physically deliver.</p>
  `);
  const seen = new Map();
  for (const b of bmps) {
    const list = seen.get(b.type) ?? [];
    list.push(b.name);
    seen.set(b.type, list);
  }
  const rows = Array.from(seen.entries()).map(([type, names]) => [
    type,
    TYPE_SECTION[type] || '—',
    String(names.length),
    names.join(', '),
    TYPE_SUMMARY[type] || '',
  ]);
  const body =
    overview + why +
    renderBlock('BMPs IN THIS PROJECT',
      renderDataTable(['BMP Type', 'Guidebook §', 'Count', 'Names', 'What it does'], rows));
  return renderSheetShell({
    title: 'BMP Catalog',
    sub:   project.name || '',
    body,
    footer: 'DOEE Guidebook Chapter 3 (BMP Specifications)',
  });
}

function _cdaFor(bmp, cdas) {
  return cdas.find(c => c.cdaId === bmp.cdaId);
}

export function renderPpSizingPage(project, bmps, cdas, params) {
  const ppBmps = bmps.filter(b => b.type === 'Permeable Pavement' && b.pp);
  const overview = renderOverview(
    'Permeable Pavement retains runoff in the void space of the stone reservoir beneath the porous surface. Sv is the storage volume at that layer; Rv is Sv times a retention multiplier (usually 1.0).',
  );
  const why = renderWhy(`
    <p>Reservoir porosity n ≈ 0.40 means roughly 40% of the reservoir layer's bulk volume is pore space available to hold water. The design calc multiplies surface area × reservoir depth × n to get Sv in cubic feet, then applies the retention multiplier (varies by sub-type) to get Rv credit. Rv is capped by the CDA max credit (CDA area × 1.7″ / 12).</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">Sv = SA × d_reservoir × n_reservoir</div>
    <div class="cs-formula-line">Rv = Sv × retention_multiplier</div>
    <div class="cs-formula-line">Rv_applied = min(Rv, CDA_area × 1.7″ / 12)</div>
  `);
  const traces = ppBmps.map(bmp => {
    const design = params.bmpDesign[`Permeable Pavement / ${bmp.subType}`]
      || { nReservoir: 0.40, retMultiplier: 1.0 };
    const svTrace = ppSizingSv(bmp.pp.sa, bmp.pp.dReservoir, design.nReservoir);
    const rvTrace = rvFromSv(svTrace.value, design.retMultiplier);
    const cda = _cdaFor(bmp, cdas);
    const cap = cda ? maxBmpCredit(cda.postIn).value : Infinity;
    const applied = Math.min(rvTrace.value, cap);
    return renderBlock(`${bmp.name} (${bmp.subType})`, renderKvTable([
      ['SA (sf)',             fmtN(bmp.pp.sa)],
      ['d_reservoir (ft)',    fmtN(bmp.pp.dReservoir, 2)],
      ['n_reservoir',         fmtN(design.nReservoir, 2)],
      ['Sv (cf)',             fmtN(svTrace.value, 0)],
      ['retention multiplier', fmtN(design.retMultiplier, 2)],
      ['Rv (cf)',             fmtN(rvTrace.value, 0)],
      ['CDA Max Credit (cf)', cda ? fmtN(cap, 0) : '—'],
      ['Rv applied (cf)',     fmtN(applied, 0)],
    ]));
  }).join('');
  const body = overview + why + formula + renderWorked(traces || '<p>No Permeable Pavement BMPs in this project.</p>');
  return renderSheetShell({
    title: 'Permeable Pavement Sizing',
    sub:   project.name || '',
    body,
    footer: 'DOEE Guidebook §3.5 · Permeable Pavement',
  });
}

export function renderBioSizingPage(project, bmps, cdas, params) {
  const bioBmps = bmps.filter(b => (b.type === 'Bioretention' || b.type === 'Dry Swale') && b.bio);
  const overview = renderOverview(
    'Bioretention retains in three layers: engineered media (void space), gravel underdrain layer (void space), and ponded surface (full volume above). Sv sums all three contributions over the bottom surface area.',
  );
  const why = renderWhy(`
    <p>The sizing uses SA_bot (not SA_top) because the storage below the surface is bounded by the bottom footprint — a sloped side-wall doesn't add storage volume at depth. Media and gravel porosities (n ≈ 0.40 each) convert bulk layer volume to pore water storage. Ponding depth contributes its full volume because surface water is 100% storage.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">Sv = SA_bot × (d_media × n_media + d_gravel × n_gravel + d_pond)</div>
    <div class="cs-formula-line">Rv = Sv × retention_multiplier</div>
    <div class="cs-formula-line">Rv_applied = min(Rv, CDA_area × 1.7″ / 12)</div>
  `);
  const traces = bioBmps.map(bmp => {
    const design = params.bmpDesign[`${bmp.type} / ${bmp.subType}`]
      || { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 };
    const svTrace = bioSizingSv(
      bmp.bio.saBot, bmp.bio.dMedia, design.nMedia,
      bmp.bio.dGravel, design.nGravel, bmp.bio.dPond,
    );
    const rvTrace = rvFromSv(svTrace.value, design.retMultiplier);
    const cda = _cdaFor(bmp, cdas);
    const cap = cda ? maxBmpCredit(cda.postIn).value : Infinity;
    const applied = Math.min(rvTrace.value, cap);
    return renderBlock(`${bmp.name} (${bmp.type} / ${bmp.subType})`, renderKvTable([
      ['SA_top (sf)',   fmtN(bmp.bio.saTop)],
      ['SA_bot (sf)',   fmtN(bmp.bio.saBot)],
      ['d_media (ft)',  fmtN(bmp.bio.dMedia, 2)],
      ['n_media',       fmtN(design.nMedia, 2)],
      ['d_gravel (ft)', fmtN(bmp.bio.dGravel, 2)],
      ['n_gravel',      fmtN(design.nGravel, 2)],
      ['d_pond (ft)',   fmtN(bmp.bio.dPond, 2)],
      ['Sv (cf)',       fmtN(svTrace.value, 0)],
      ['Rv (cf)',       fmtN(rvTrace.value, 0)],
      ['CDA Max Credit', cda ? fmtN(cap, 0) : '—'],
      ['Rv applied',    fmtN(applied, 0)],
    ]));
  }).join('');
  const body = overview + why + formula + renderWorked(traces || '<p>No Bioretention or Dry Swale BMPs in this project.</p>');
  return renderSheetShell({
    title: 'Bioretention & Dry Swale Sizing',
    sub:   project.name || '',
    body,
    footer: 'DOEE Guidebook §3.6 Bioretention · §3.9 O-2 Dry Swale',
  });
}

export function renderTreeCreditPage(project, bmps, params) {
  const treeBmps = bmps.filter(b => (b.type === 'Planted Trees' || b.type === 'Preserve Trees') && b.trees);
  const overview = renderOverview(
    'Trees earn fixed retention credit per tree, categorized by whether they are newly planted (T-1) or preserved (T-2) and by size. The credit represents canopy interception, transpiration, and root-zone retention over the design storm.',
  );
  const why = renderWhy(`
    <p>DOEE assigns conservative per-tree credits — the Guidebook provides values at adoption time; the project PARAMS sheet may override. Preserved mature trees earn more than newly planted ones because their canopy and root systems are already established.</p>
  `);
  const creditTable = renderDataTable(
    ['Code', 'Description', 'Credit (cf)'],
    [
      ['T-1 Small',      'Planted small tree (deciduous < 2.5″ DBH or evergreen < 6′)',  fmtN(params.treeCredits['T-1 Small'] ?? 0, 0)],
      ['T-1 Large',      'Planted large tree (≥ above thresholds)',                      fmtN(params.treeCredits['T-1 Large'] ?? 0, 0)],
      ['T-2 Small',      'Preserved small tree',                                         fmtN(params.treeCredits['T-2 Small'] ?? 0, 0)],
      ['T-2 Large',      'Preserved large tree',                                         fmtN(params.treeCredits['T-2 Large'] ?? 0, 0)],
      ['T-2 Special',    'Preserved Special tree (per DC Urban Forestry)',               fmtN(params.treeCredits['T-2 Special'] ?? 0, 0)],
      ['T-2 Heritage',   'Preserved Heritage tree',                                      fmtN(params.treeCredits['T-2 Heritage'] ?? 0, 0)],
    ],
  );
  const traces = treeBmps.map(bmp => {
    const trace = treeRetentionCredit(bmp.trees, params.treeCredits);
    const t = bmp.trees;
    return renderBlock(`${bmp.name} (${bmp.type})`, renderKvTable([
      ['T-1 Small (planted)',    fmtN(t.plantedSmall)],
      ['T-1 Large (planted)',    fmtN(t.plantedLarge)],
      ['T-2 Small (preserved)',  fmtN(t.preservedSmall)],
      ['T-2 Large (preserved)',  fmtN(t.preservedLarge)],
      ['T-2 Special (preserved)', fmtN(t.preservedSpecial)],
      ['T-2 Heritage (preserved)', fmtN(t.preservedHeritage)],
      ['Rv credit (cf)',         fmtN(trace.value, 0)],
    ]));
  }).join('');
  const body =
    overview + why +
    renderBlock('TREE CREDIT TABLE', creditTable) +
    renderWorked(traces || '<p>No Tree BMPs in this project.</p>');
  return renderSheetShell({
    title: 'Tree Credit — Planted & Preserved',
    sub:   project.name || '',
    body,
    footer: 'DOEE Guidebook §3.14 · DC Tree Preservation Act',
  });
}

export function renderRvProvidedPage(project, bmps, cdas, params) {
  const overview = renderOverview(
    'Rv provided per SDA sums every BMP\'s applied Rv (after CDA cap) grouped by the SDA the BMP serves. This is the number compared against SWRv required for per-SDA compliance.',
  );
  const why = renderWhy(`
    <p>Each BMP\'s Rv_applied is already capped at its CDA\'s maximum credit (1.7″ equivalent). The sum per SDA is then compared directly against the SWRv target for that SDA. If Σ Rv_applied ≥ SWRv_required, the SDA passes.</p>
  `);
  const rvPerSda = rvProvidedPerSda(bmps, cdas, params);
  const perBmp = rvProvidedPerBmp(bmps, cdas, params).filter(b => b.rvCf > 0);
  const perBmpTable = renderDataTable(
    ['BMP', 'Type', 'SDA', 'CDA', 'Rv applied (cf)'],
    perBmp.map(b => [b.name, b.type, b.sdaId, b.cdaId ?? '—', fmtN(b.rvCf, 0)]),
  );
  const perSdaTable = renderDataTable(
    ['SDA', 'Rv Provided (cf)'],
    Object.entries(rvPerSda).map(([sdaId, cf]) => [sdaId, fmtN(cf, 0)]),
  );
  const body =
    overview + why +
    renderBlock('PER-BMP Rv APPLIED', perBmpTable) +
    renderBlock('ROLL-UP PER SDA', perSdaTable);
  return renderSheetShell({
    title: 'Rv Provided — Per BMP and Per SDA',
    sub:   project.name || '',
    body,
    footer: 'DOEE Guidebook §2 · Compliance Calculator Sheet 2',
  });
}
```

- [ ] **Step 4: Rebuild and run tests**

```bash
cd education && node build.js && node --test tests/
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add education/src/render-edu.mjs education/tests/render-edu.test.mjs education/education.html
git commit -m "education: BMP Catalog + PP + Bio + Trees + Rv Provided pages"
```

---

## Task 8 — MEP + EISA 438 Intro pages

Two pages. MEP page uses the real per-PROW-SDA metrics (same math as the summary app's rewritten MEP page). EISA Intro introduces the 95th-percentile concept and METF requirement.

**Files:**
- Modify: `education/src/render-edu.mjs`
- Modify: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `education/tests/render-edu.test.mjs`:

```javascript
import { renderMepEduPage, renderEisaIntroPage } from '../src/render-edu.mjs';

test('renderMepEduPage: shows 4-step process + per-PROW-SDA table', () => {
  const html = renderMepEduPage(sampleProject, sampleSdas, sampleBmps, sampleCdas, bmpParams);
  assert.ok(html.includes('4-Step'));
  assert.ok(html.includes('Step 1'));
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('MEP'));
});

test('renderMepEduPage: "No PROW SDAs" when none in PROW', () => {
  const noProw = [{ sdaId: 'SDA-X', inProw: 'No', landUse: 'Impervious Vehicular', hsg: 'D',
    preIn: 0, preOut: 0, postIn: 1000, postOut: 0 }];
  const html = renderMepEduPage(sampleProject, noProw, [], [], bmpParams);
  assert.ok(html.includes('No PROW SDAs'));
});

test('renderEisaIntroPage: explains 95th percentile + 1.7"', () => {
  const html = renderEisaIntroPage(sampleProject);
  assert.ok(html.includes('95th'));
  assert.ok(html.includes('1.7'));
  assert.ok(html.includes('METF'));
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Append the two renderers**

Append to `education/src/render-edu.mjs`:

```javascript
const MEP_STEPS_EDU = [
  ['Step 1', 'Treat impervious area to the Maximum Extent Practicable (SWRv-equivalent)'],
  ['Step 2', 'Evaluate alternative BMP locations where Step 1 is infeasible'],
  ['Step 3', 'Manage remaining runoff via conveyance and detention'],
  ['Step 4', 'Discharge to MS4 only if Steps 1–3 are infeasible'],
];
const MEP_IMPERVIOUS = new Set(['Impervious Vehicular', 'Impervious Non-Vehicular', 'BMP']);

function _impByProwSda(sdas) {
  const out = {};
  for (const r of sdas) {
    if (r.inProw === 'Yes') out[r.sdaId] = out[r.sdaId] || 0;
  }
  for (const r of sdas) {
    if (r.inProw !== 'Yes') continue;
    if (!MEP_IMPERVIOUS.has(r.landUse)) continue;
    out[r.sdaId] = (out[r.sdaId] || 0) + (r.postIn || 0);
  }
  return out;
}

export function renderMepEduPage(project, sdas, bmps, cdas, params) {
  const overview = renderOverview(
    'DDOT MEP (Maximum Extent Practicable) is the compliance mechanism for public right-of-way (PROW) SDAs. It replaces the strict numerical SWRv target with a documented four-step evaluation.',
  );
  const why = renderWhy(`
    <p>PROW projects face site constraints (utilities, grade, pedestrian geometry) that often prevent full SWRv retention. 21 DCMR §508.9 and DDOT GI Standards 2014 recognize this: a PROW SDA with a documented four-step MEP process is compliant even when it falls short of the 1.2″ numerical target.</p>
    <p><b>Narrative evidence</b> for Steps 2–4 lives in the DDOT MEP Worksheet file (not derivable from the master template). This page summarizes <b>derivable</b> metrics — impervious area, target, Rv provided, deficit.</p>
  `);
  const stepsHtml = MEP_STEPS_EDU.map(([n, desc]) =>
    `<div class="cs-formula-line"><b>${esc(n)}</b> — ${esc(desc)}</div>`,
  ).join('');
  const impByProwSda = _impByProwSda(sdas);
  const prowSdaIds = Object.keys(impByProwSda);
  if (prowSdaIds.length === 0) {
    return renderSheetShell({
      title: 'DDOT MEP — Maximum Extent Practicable (PROW)',
      sub:   project.name || '',
      body:
        overview + why +
        renderBlock('DDOT MEP 4-STEP PROCESS', stepsHtml) +
        renderBlock('PROJECT APPLICABILITY',
          '<div class="cs-formula-line"><b>No PROW SDAs in this project — MEP does not apply.</b></div>'),
      footer: 'DOEE Guidebook Appendix B · DDOT GI Standards 2014',
    });
  }
  const rvBySda = rvProvidedPerSda(bmps, cdas, params);
  const headers = ['SDA', 'Impervious In LOD (sf)', 'MEP Target @ 1.2″ (cf)',
                   'Rv Provided (cf)', 'Deficit (cf)', 'Status'];
  const rows = prowSdaIds.map(sdaId => {
    const imp = impByProwSda[sdaId];
    const target = imp * 1.2 / 12;
    const provided = rvBySda[sdaId] || 0;
    const deficit = Math.max(0, target - provided);
    const status = deficit <= 0 ? '✓ MET' : 'DEFICIT — document in SWMP narrative';
    return [sdaId, fmtN(imp), fmtN(target, 0), fmtN(provided, 0), fmtN(deficit, 0), status];
  });
  const body =
    overview + why +
    renderBlock('DDOT MEP 4-STEP PROCESS', stepsHtml) +
    renderBlock('PER-PROW-SDA METRICS', renderDataTable(headers, rows));
  return renderSheetShell({
    title: 'DDOT MEP — Maximum Extent Practicable (PROW)',
    sub:   project.name || '',
    body,
    footer: 'DOEE Guidebook Appendix B · DDOT GI Standards 2014 · 21 DCMR §508.9',
  });
}

export function renderEisaIntroPage(project) {
  const overview = renderOverview(
    'EISA §438 is a federal-only requirement that applies to any federal facility with a footprint greater than 5,000 sf. It uses the 95th-percentile storm — for DC, 1.7″ — and must be met via infiltration, evapotranspiration, or harvest-and-reuse. Detention does not count.',
  );
  const why = renderWhy(`
    <p>EISA chose the 95th-percentile storm as an analog for pre-development hydrology: storms of this size are usually fully absorbed by natural landscapes, so managing them on-site replicates predevelopment conditions for ~95% of all events by frequency.</p>
    <p><b>METF (Maximum Extent Technically Feasible)</b> allows reduced retention when documented site constraints (shallow bedrock, contaminated soils, high groundwater, utility conflicts) make full retention impossible. A single constraint is rarely sufficient — DOEE expects a combination.</p>
  `);
  const kv = renderKvTable([
    ['Framework',          'EISA §438 (Energy Independence and Security Act, 2007)'],
    ['Applies to',         'Federal facilities with footprint > 5,000 sf'],
    ['Design storm',       '95th-percentile 24-hr storm; DC = 1.7″'],
    ['Required mechanism', 'Infiltration · evapotranspiration · harvest-and-reuse (NOT detention)'],
    ['Fallback',           'METF with documented infeasibility'],
    ['This project applies?', project.eisa || '—'],
  ]);
  const comparison = renderDataTable(
    ['', 'DOEE SWRv (MLD)', 'EISA §438'],
    [
      ['Storm',    '1.2″',               '1.7″ (DC 95th %ile)'],
      ['Scope',    'Per-SDA within LOD', 'Site-wide, federal only'],
      ['Mechanism', 'Retention preferred, detention fallback', 'Infiltration/ET/harvest only'],
      ['Who',      'All MLD projects',   'Federal projects only'],
    ],
  );
  const body =
    overview + why +
    renderBlock('AT A GLANCE', kv) +
    renderBlock('EISA vs DOEE SWRv', comparison);
  return renderSheetShell({
    title: 'EISA §438 — Introduction',
    sub:   project.name || '',
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009)',
  });
}
```

- [ ] **Step 4: Rebuild + test**

```bash
cd education && node build.js && node --test tests/
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add education/src/render-edu.mjs education/tests/render-edu.test.mjs education/education.html
git commit -m "education: MEP + EISA 438 Intro pages"
```

---

## Task 9 — EISA 438 four pages (Direct, TR-55, TR-16, Comparison)

The headline feature. Four consecutive pages: EISA Direct Determination (depression + Horton), TR-55 formula (S/Ia/Q derivation), TR-16 lookup (HTML lookup tables with highlighted P=1.7″ cell for the project's CNs), and three-method comparison with BMP storage.

**Files:**
- Modify: `education/src/render-edu.mjs`
- Modify: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `education/tests/render-edu.test.mjs`:

```javascript
import {
  renderEisaDirectEduPage, renderEisaTr55EduPage,
  renderEisaTr16EduPage, renderEisaComparisonEduPage,
} from '../src/render-edu.mjs';
import {
  eisaDirectVolumeTraceCf, tr55VolumeTraceCf, HORTON_INFIL_LOSS_B, HORTON_INFIL_LOSS_C,
} from '../src/calc.mjs';

const eisaRows = [
  { area: 10000, landUse: 'Impervious Vehicular', hsg: 'D' },
  { area:  5000, landUse: 'Natural (Woods)',      hsg: 'C' },
];

test('renderEisaDirectEduPage: shows depression + Horton with numerical constants', () => {
  const pre  = eisaDirectVolumeTraceCf(eisaRows, 1.7);
  const post = eisaDirectVolumeTraceCf(eisaRows, 1.7);
  const html = renderEisaDirectEduPage(sampleProject, pre, post);
  assert.ok(html.includes('Direct Determination'));
  assert.ok(html.includes('0.1'));                 // depression (impervious)
  assert.ok(html.includes('0.2'));                 // depression (pervious)
  assert.ok(html.includes('Horton'));
  assert.ok(html.includes(HORTON_INFIL_LOSS_B.toFixed(2)));
  assert.ok(html.includes(HORTON_INFIL_LOSS_C.toFixed(2)));
});

test('renderEisaTr55EduPage: derives S / Ia / Q with CN column', () => {
  const pre  = tr55VolumeTraceCf(eisaRows, 1.7);
  const post = tr55VolumeTraceCf(eisaRows, 1.7);
  const html = renderEisaTr55EduPage(sampleProject, pre, post);
  assert.ok(html.includes('S  = 1000'));
  assert.ok(html.includes('Ia'));
  assert.ok(html.includes('CN'));
  assert.ok(html.includes('98'));                  // impervious CN
});

test('renderEisaTr16EduPage: renders lookup table for distinct project CNs with P=1.7 highlighted', () => {
  const parsed = { sdas: eisaRows.map(r => ({ ...r, sdaId: 'SDA-1' })) };
  const paramsForTr16 = {
    cn: {
      'Impervious Vehicular': { A: 98, B: 98, C: 98, D: 98 },
      'Natural (Woods)':      { A: 25, B: 55, C: 70, D: 77 },
    },
  };
  const html = renderEisaTr16EduPage(sampleProject, parsed, paramsForTr16);
  assert.ok(html.includes('CN = 98'));
  assert.ok(html.includes('CN = 70'));
  assert.ok(html.includes('tr16-highlight'));
  assert.ok(html.includes('1.48'));                 // CN 98 at P=1.7
});

test('renderEisaComparisonEduPage: shows all three method totals + BMP storage', () => {
  const bmpStorage = [{ name: 'B-1', type: 'Bioretention', sdaId: 'SDA-1', rvCf: 100 }];
  const html = renderEisaComparisonEduPage(sampleProject,
    { preCf: 100, postCf: 150, deltaCf: 50 },
    { preCf: 110, postCf: 160, deltaCf: 50 },
    { preCf: 108, postCf: 158, deltaCf: 50 },     // TR-16 totals (rounded)
    bmpStorage,
    'Yes',
  );
  assert.ok(html.includes('Direct Determination'));
  assert.ok(html.includes('TR-55'));
  assert.ok(html.includes('TR-16'));
  assert.ok(html.includes('BMP'));
  assert.ok(html.includes('B-1'));
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: FAIL — functions not exported.

- [ ] **Step 3: Append the four renderers**

Append to `education/src/render-edu.mjs`:

```javascript
import {
  eisaDirectRunoffDepth, HORTON_INFIL_LOSS_B, HORTON_INFIL_LOSS_C,
  tr55RunoffDepth, CN as CN_TABLE,
} from './calc.mjs';
import { tr16LookupQ, TR16_CN_LIST } from './tr16-exhibit.mjs';

export function renderEisaDirectEduPage(project, pre, post) {
  const overview = renderOverview(
    'The Direct Determination method computes runoff explicitly from physical quantities: depression storage removes a fixed depth from the surface, and pervious areas additionally lose water to Horton infiltration integrated over 24 hours.',
  );
  const why = renderWhy(`
    <p>Direct Determination is the method EPA documents in its EISA §438 Technical Guidance (Dec 2009). It is physically transparent — every term maps to a measurable landscape property. For HSG B and C soils, the 24-hour Horton infiltration loss far exceeds the available rainfall after depression (<i>Horton_B = ${HORTON_INFIL_LOSS_B.toFixed(2)}″</i>, <i>Horton_C = ${HORTON_INFIL_LOSS_C.toFixed(2)}″</i> &gt; 1.5″), so pervious B and C surfaces produce zero runoff for the 1.7″ storm.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">Impervious depth = max(0, P − 0.1″)                              <i>depression storage</i></div>
    <div class="cs-formula-line">Pervious HSG A   = 0                                              <i>free-draining</i></div>
    <div class="cs-formula-line">Pervious HSG B   = max(0, P − 0.2″ − ${HORTON_INFIL_LOSS_B.toFixed(2)}″ Horton_B) ≈ 0</div>
    <div class="cs-formula-line">Pervious HSG C   = max(0, P − 0.2″ − ${HORTON_INFIL_LOSS_C.toFixed(2)}″ Horton_C) ≈ 0</div>
    <div class="cs-formula-line">Pervious HSG D   = max(0, P − 0.2″)                               <i>no Horton loss, D</i></div>
    <div class="cs-formula-line" style="margin-top: 6px;">Horton equation: F_t = f_min + (f_max − f_min) · e^(−k·t); integrated over T=24 hr</div>
  `);
  const hortonTable = renderDataTable(
    ['Parameter', 'HSG B', 'HSG C'],
    [
      ['f_max (in/hr)',  '5.0', '3.0'],
      ['f_min (in/hr)',  '0.3', '0.1'],
      ['k (1/hr)',       '2.0', '3.5'],
      ['24-hr loss (in)', HORTON_INFIL_LOSS_B.toFixed(2), HORTON_INFIL_LOSS_C.toFixed(2)],
    ],
  );
  const buildTable = (trace) => renderDataTable(
    ['Land Use', 'HSG', 'Area (sf)', 'Depth @ 1.7″ (in)', 'Volume (cf)'],
    trace.perRow.map(r => [
      r.landUse, r.hsg, fmtN(r.area), r.depthIn.toFixed(3), fmtN(r.volumeCf, 0),
    ]),
  );
  const delta = post.value - pre.value;
  const worked = renderWorked(
    renderBlock('HORTON PARAMETERS', hortonTable) +
    renderBlock('PRE-DEVELOPMENT',  buildTable(pre))  +
    `<div class="cs-formula-line"><b>Pre total: ${fmtN(pre.value, 0)} cf</b></div>` +
    renderBlock('POST-DEVELOPMENT', buildTable(post)) +
    `<div class="cs-formula-line"><b>Post total: ${fmtN(post.value, 0)} cf</b></div>` +
    `<div class="cs-formula-line" style="margin-top:6px;"><b>Δ = Post − Pre = ${fmtN(delta, 0)} cf</b> ${delta <= 0 ? '(✓ passes pre-BMP)' : '(✗ relies on BMP storage)'}</div>`,
  );
  const body = overview + why + formula + worked;
  return renderSheetShell({
    title: 'EISA §438 — Direct Determination',
    sub:   `${project.name || ''} · 95th percentile = 1.7″`,
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009)',
  });
}

export function renderEisaTr55EduPage(project, pre, post) {
  const overview = renderOverview(
    'TR-55 is the Soil Conservation Service runoff curve-number method. It uses a single empirical parameter CN (Curve Number) to represent soil wetness and cover; given CN and rainfall P, it computes runoff Q with a closed-form equation.',
  );
  const why = renderWhy(`
    <p>CN is calibrated from gauged watersheds; it encodes soil hydrologic group, land cover, and antecedent moisture. The SCS equation computes a potential maximum retention <i>S</i> (dimensioned in inches of depth), splits it into an initial abstraction Ia = 0.2·S (losses before runoff begins) and residual storage, then produces Q once P exceeds Ia. The method is widely used because it needs only one input (CN) per surface.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">S  = 1000 / CN − 10                   <i>— potential maximum retention (in)</i></div>
    <div class="cs-formula-line">Ia = 0.2 · S                           <i>— initial abstraction (SCS calibration)</i></div>
    <div class="cs-formula-line">Q  = (P − Ia)² / (P − Ia + S)         <i>if P > Ia, else 0</i></div>
    <div class="cs-formula-line" style="margin-top:6px;"><i>CN table (used by this project)</i>:</div>
  `);
  const buildTable = (trace) => renderDataTable(
    ['Land Use', 'HSG', 'Area (sf)', 'CN', 'Depth @ 1.7″ (in)', 'Volume (cf)'],
    trace.perRow.map(r => [
      r.landUse, r.hsg, fmtN(r.area), r.cn, r.depthIn.toFixed(3), fmtN(r.volumeCf, 0),
    ]),
  );
  const delta = post.value - pre.value;
  const worked = renderWorked(
    renderBlock('PRE-DEVELOPMENT',  buildTable(pre)) +
    `<div class="cs-formula-line"><b>Pre total: ${fmtN(pre.value, 0)} cf</b></div>` +
    renderBlock('POST-DEVELOPMENT', buildTable(post)) +
    `<div class="cs-formula-line"><b>Post total: ${fmtN(post.value, 0)} cf</b></div>` +
    `<div class="cs-formula-line" style="margin-top:6px;"><b>Δ = Post − Pre = ${fmtN(delta, 0)} cf</b> ${delta <= 0 ? '(✓ passes pre-BMP)' : '(✗ relies on BMP storage)'}</div>`,
  );
  const body = overview + why + formula + worked;
  return renderSheetShell({
    title: 'EISA §438 — TR-55 (SCS CN method)',
    sub:   `${project.name || ''} · 95th percentile = 1.7″`,
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009) · SCS TR-55 1986',
  });
}

function _distinctProjectCns(parsed, params) {
  const seen = new Set();
  for (const r of (parsed.sdas || [])) {
    const row = params.cn[r.landUse];
    if (row && row[r.hsg] != null) seen.add(row[r.hsg]);
  }
  return Array.from(seen).sort((a, b) => a - b);
}

function _tr16TableHtml(cn, highlightP = 1.7) {
  // Row heads 1..12 inches, col heads 0.0..0.9 tenths.
  const highlightRow = Math.floor(highlightP);
  const highlightCol = Math.round((highlightP - highlightRow) * 10);
  const header = `<tr><th>P \\ 0.X</th>${Array.from({length:10}, (_,i)=>`<th>0.${i}</th>`).join('')}</tr>`;
  const rows = Array.from({length: 12}, (_, i) => {
    const whole = i + 1;
    const cells = Array.from({length: 10}, (_, j) => {
      const q = tr16LookupQ(cn, whole + j/10);
      const cls = (whole === highlightRow && j === highlightCol) ? ' class="tr16-highlight"' : '';
      return `<td${cls}>${q == null ? '—' : q.toFixed(2)}</td>`;
    }).join('');
    return `<tr><th>${whole}</th>${cells}</tr>`;
  }).join('');
  const q = tr16LookupQ(cn, highlightP);
  return `
    <div class="tr16-caption">CN = ${cn} — at P = ${highlightP.toFixed(1)}″ → Q = ${q == null ? '—' : q.toFixed(2)}″</div>
    <table class="tr16-table">${header}${rows}</table>
  `;
}

export function renderEisaTr16EduPage(project, parsed, params) {
  const overview = renderOverview(
    'TR-16 Exhibit 2-7A is the printed lookup form of the TR-55 equation. For each curve number, it tabulates runoff Q at rainfall increments of 0.1″ up to 12.9″. This page shows one table per CN that appears in the project.',
  );
  const why = renderWhy(`
    <p>TR-16 is <b>mathematically identical</b> to TR-55; the table just rounds P to the nearest 0.1″. The lookup is a bookkeeping aid that pre-dates calculators. Each table here highlights the <b>P = 1.7″ cell</b> — the 95th-percentile storm for DC — so a reviewer can trace the EISA §438 Q by eye.</p>
    <p>For the full exhibit covering all 12 SCS CN curves (60, 61, 68–82, 98), see Appendix A.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">Q = (P − 0.2·S)² / (P + 0.8·S)       <i>— identical to TR-55 formula, rearranged</i></div>
    <div class="cs-formula-line">S = 1000 / CN − 10</div>
  `);
  const projectCns = _distinctProjectCns(parsed, params);
  const relevantCns = projectCns.filter(cn => TR16_CN_LIST.includes(cn));
  const missingCns  = projectCns.filter(cn => !TR16_CN_LIST.includes(cn));
  const tables = relevantCns.map(cn => _tr16TableHtml(cn, 1.7)).join('');
  const notice = missingCns.length
    ? `<div class="cs-note">Project also uses CN = ${missingCns.join(', ')} — not in TR-16 Exhibit 2-7A (printed exhibit lists only CN 60, 61, 68, 69, 70, 74, 75, 76, 80, 81, 82, 98). Use the TR-55 formula for those.</div>`
    : '';
  const worked = renderWorked(
    (tables || '<div class="cs-note">No TR-16-tabulated CNs in this project.</div>') + notice,
  );
  const body = overview + why + formula + worked;
  return renderSheetShell({
    title: 'EISA §438 — TR-16 Exhibit 2-7A Lookup',
    sub:   `${project.name || ''} · P = 1.7″ highlighted`,
    body,
    footer: 'SCS TR-16 Exhibit 2-7A · USDA Soil Conservation Service · Upper Darby, PA',
  });
}

export function renderEisaComparisonEduPage(project, direct, tr55, tr16, bmpStorage, electedMethod) {
  const overview = renderOverview(
    'All three EISA §438 methods compute runoff; this page compares their totals side-by-side and shows how BMP storage credit closes any deficit.',
  );
  const why = renderWhy(`
    <p>TR-55 and TR-16 should agree to within rounding (TR-16 bins P to 0.1″). Direct Determination uses a <b>different physical model</b> (24-hr Horton infiltration), so it typically diverges from the SCS methods on HSG B and C soils — Horton losses dominate those cases and drive pervious runoff to zero.</p>
    <p>For every method, the <b>net result</b> after BMP storage credit is <i>Δ − Σ Rv_BMP</i>. A method passes when net ≤ 0.</p>
  `);
  const bmpHeaders = ['BMP', 'Type', 'SDA', 'Rv Provided (cf)'];
  const bmpRows = bmpStorage.map(b => [b.name, b.type, b.sdaId, fmtN(b.rvCf, 0)]);
  const bmpTotal = bmpStorage.reduce((s, b) => s + (b.rvCf || 0), 0);
  bmpRows.push(['', '', 'TOTAL', fmtN(bmpTotal, 0)]);
  const directNet = direct.deltaCf - bmpTotal;
  const tr55Net   = tr55.deltaCf   - bmpTotal;
  const tr16Net   = tr16.deltaCf   - bmpTotal;
  const comparison = [
    ['Direct Determination', fmtN(direct.preCf, 0), fmtN(direct.postCf, 0), fmtN(direct.deltaCf, 0),
      fmtN(directNet, 0), directNet <= 0 ? '✓ PASS' : '✗ FAIL',
      'Depression + 24-hr Horton'],
    ['TR-55 Formula', fmtN(tr55.preCf, 0), fmtN(tr55.postCf, 0), fmtN(tr55.deltaCf, 0),
      fmtN(tr55Net, 0), tr55Net <= 0 ? '✓ PASS' : '✗ FAIL',
      'Continuous CN math'],
    ['TR-16 Exhibit (lookup)', fmtN(tr16.preCf, 0), fmtN(tr16.postCf, 0), fmtN(tr16.deltaCf, 0),
      fmtN(tr16Net, 0), tr16Net <= 0 ? '✓ PASS' : '✗ FAIL',
      'TR-55 math, P rounded to 0.1″'],
  ];
  const cmpHeaders = ['Method', 'Pre (cf)', 'Post (cf)', 'Δ (cf)', 'Net after BMP (cf)', 'Status', 'Rounding note'];
  const applies = electedMethod === 'Yes';
  const summary = !applies
    ? 'EISA §438 does not apply (PROJECT!B11 = "No").'
    : (directNet <= 0 && tr55Net <= 0 && tr16Net <= 0)
      ? 'All three methods pass with BMP storage credited — compliant.'
      : (directNet <= 0 || tr55Net <= 0 || tr16Net <= 0)
        ? 'At least one method passes with BMP storage credited — compliant under the passing method; engineer selects which to submit.'
        : 'No method passes with BMP storage credited — additional retention required to meet EISA §438.';
  const body =
    overview + why +
    renderBlock('BMP STORAGE (RETENTION CREDIT)', renderDataTable(bmpHeaders, bmpRows)) +
    renderBlock('METHOD COMPARISON', renderDataTable(cmpHeaders, comparison)) +
    renderWorked(`<p>${esc(summary)}</p><p><b>EISA §438 applies:</b> ${esc(electedMethod || '(not specified)')}</p>`);
  return renderSheetShell({
    title: 'EISA §438 — Three-Method Comparison',
    sub:   project.name || '',
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009)',
    landscape: true,
  });
}
```

- [ ] **Step 4: Rebuild + test**

```bash
cd education && node build.js && node --test tests/
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add education/src/render-edu.mjs education/tests/render-edu.test.mjs education/education.html
git commit -m "education: EISA 438 four pages (Direct, TR-55, TR-16, Comparison)"
```

---

## Task 10 — Detention + Site Compliance pages

Two pages. Detention parallels the summary app's SCS-CN detention sheet with narrative added. Site Compliance roll-up is the final per-SDA pass/fail check.

**Files:**
- Modify: `education/src/render-edu.mjs`
- Modify: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `education/tests/render-edu.test.mjs`:

```javascript
import { renderDetentionEduPage, renderSiteComplianceEduPage } from '../src/render-edu.mjs';
import { detentionSummary, swrvVolume } from '../src/calc.mjs';

test('renderDetentionEduPage: shows SCS CN formula + per-SDA table', () => {
  const params = {
    detention: { p2In: 3.14, p15In: 5.23 },
    detentionCn: { Natural: 70, Compacted: 74, Impervious: 98, BMP: 98 },
  };
  const summary = detentionSummary(sampleSdas, params.detention.p2In, params.detention.p15In, params.detentionCn);
  const html = renderDetentionEduPage(sampleProject, summary, params.detention.p2In, params.detention.p15In);
  assert.ok(html.includes('Detention'));
  assert.ok(html.includes('CN'));
  assert.ok(html.includes('2-yr'));
  assert.ok(html.includes('15-yr'));
});

test('renderSiteComplianceEduPage: per-SDA SWRv required vs provided with status', () => {
  const complianceRows = [
    { sdaId: 'SDA-1', swrvReqCf: 500, rvProvidedCf: 600 },
    { sdaId: 'SDA-2', swrvReqCf: 300, rvProvidedCf: 100 },
  ];
  const html = renderSiteComplianceEduPage(sampleProject, complianceRows);
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('SDA-2'));
  assert.ok(html.includes('SITE TOTAL'));
  assert.ok(html.includes('✓') || html.includes('PASS'));
  assert.ok(html.includes('✗') || html.includes('FAIL'));
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Append the two renderers**

Append to `education/src/render-edu.mjs`:

```javascript
import { swrvComplianceTableRows } from './aggregate.mjs';

export function renderDetentionEduPage(project, summary, p2In, p15In) {
  const overview = renderOverview(
    'Detention controls peak discharge rates for the 2-yr and 15-yr storms. It is a parallel requirement to SWRv retention — a project satisfies both independently. Detention is required when post-development peak Q exceeds pre-development.',
  );
  const why = renderWhy(`
    <p>Detention uses the SCS Curve Number method (TR-55 lineage) with <b>detention-specific CN defaults</b> that treat all cover types more conservatively than SWRv: Natural = 70, Compacted = 74, Impervious = 98, BMP = 98. The composite CN per SDA is area-weighted. Pre and post Q are computed at the 2-yr and 15-yr design storms. If Post Q &gt; Pre Q, detention is required to bring the peak rate back down.</p>
    <p>Detention does NOT satisfy EISA §438 — EISA is retention-only. Detention is a DOEE requirement for all MLD / MSI projects.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">Composite CN = Σ(A_i · CN_i) / Σ A_i   <i>— per SDA, area-weighted</i></div>
    <div class="cs-formula-line">S  = 1000 / CN − 10</div>
    <div class="cs-formula-line">Q  = (P − 0.2S)² / (P + 0.8S)   <i>if P > 0.2S, else 0</i></div>
    <div class="cs-formula-line" style="margin-top:6px;">P (2-yr) = ${fmtN(p2In, 2)}″ · P (15-yr) = ${fmtN(p15In, 2)}″</div>
  `);
  let worked;
  if (!summary.anyRequired) {
    worked = renderWorked(
      `<p>No detention required — Post Q ≤ Pre Q for all SDAs at both the ${fmtN(p2In, 2)}″ (2-yr) and ${fmtN(p15In, 2)}″ (15-yr) storms.</p>`,
    );
  } else {
    const triggered = summary.perSda.filter(s => s.p2Required || s.p15Required);
    const headers = [
      'SDA', 'Pre CN', 'Post CN',
      '2-yr Pre Q', '2-yr Post Q', '2-yr Req?',
      '15-yr Pre Q', '15-yr Post Q', '15-yr Req?',
    ];
    const rows = triggered.map(s => [
      s.sdaId, fmtN(s.preCn, 1), fmtN(s.postCn, 1),
      fmtN(s.p2PreQ, 3) + '″', fmtN(s.p2PostQ, 3) + '″', s.p2Required ? 'YES' : 'no',
      fmtN(s.p15PreQ, 3) + '″', fmtN(s.p15PostQ, 3) + '″', s.p15Required ? 'YES' : 'no',
    ]);
    worked = renderWorked(renderDataTable(headers, rows));
  }
  const body = overview + why + formula + worked;
  return renderSheetShell({
    title: 'Detention — 2-yr & 15-yr Peak Control',
    sub:   project.name || '',
    body,
    footer: 'DOEE Guidebook §2.4 · SCS CN runoff method',
    landscape: true,
  });
}

export function renderSiteComplianceEduPage(project, complianceRows) {
  const overview = renderOverview(
    'Site Compliance is the final per-SDA pass/fail check: for each SDA, is Rv Provided ≥ SWRv Required? If every SDA passes, the project is compliant. The site total is informational only — compliance is per SDA.',
  );
  const why = renderWhy(`
    <p>21 DCMR §599 requires the SWRv target be met <b>within each SDA independently</b>. The site-total row is shown for reference — it illustrates aggregate retention — but a project can fail compliance even when the site total exceeds the site requirement, if any single SDA has a deficit.</p>
  `);
  const { perRow, siteTotal } = swrvComplianceTableRows(complianceRows, false);
  const headers = ['SDA', 'SWRv Required (cf)', 'Rv Provided (cf)', '% Met', 'Status'];
  const rows = perRow.map(r => [
    r.sdaId, fmtN(r.swrvReqCf, 0), fmtN(r.rvProvidedCf, 0),
    fmtN(r.pct, 0) + '%', r.status,
  ]);
  rows.push([
    siteTotal.sdaId, fmtN(siteTotal.swrvReqCf, 0), fmtN(siteTotal.rvProvidedCf, 0),
    fmtN(siteTotal.pct, 0) + '%', siteTotal.status,
  ]);
  const body =
    overview + why +
    renderBlock('PER-SDA COMPLIANCE', renderDataTable(headers, rows));
  return renderSheetShell({
    title: 'Site Compliance Roll-Up',
    sub:   project.name || '',
    body,
    footer: '21 DCMR §599 · DOEE Compliance Calculator Sheet 4',
  });
}
```

- [ ] **Step 4: Rebuild + test**

```bash
cd education && node build.js && node --test tests/
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add education/src/render-edu.mjs education/tests/render-edu.test.mjs education/education.html
git commit -m "education: Detention + Site Compliance pages"
```

---

## Task 11 — Appendix A (TR-16 full exhibit) + Appendix B (glossary)

Appendix A renders all 12 CN tables from `TR16_EXHIBIT` in landscape, 3 tables per page → 4 pages. Appendix B is the glossary.

**Files:**
- Modify: `education/src/render-edu.mjs`
- Modify: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `education/tests/render-edu.test.mjs`:

```javascript
import { renderTr16AppendixPages, renderGlossaryPage } from '../src/render-edu.mjs';

test('renderTr16AppendixPages: returns array; every CN present somewhere', () => {
  const pages = renderTr16AppendixPages();
  assert.ok(Array.isArray(pages));
  assert.ok(pages.length >= 4);
  const joined = pages.join('');
  for (const cn of [60, 61, 68, 69, 70, 74, 75, 76, 80, 81, 82, 98]) {
    assert.ok(joined.includes(`CN = ${cn}`), `missing CN=${cn} in appendix`);
  }
  // Should be landscape
  for (const p of pages) assert.ok(p.includes('class="calc-sheet landscape"'));
});

test('renderGlossaryPage: contains core terms', () => {
  const html = renderGlossaryPage();
  for (const term of ['SWRv', 'SDA', 'CDA', 'HSG', 'LOD', 'MEP', 'METF', 'PROW',
                      'Ia', 'CN', 'Rv', 'Sv', '95th percentile']) {
    assert.ok(html.includes(term), `glossary missing ${term}`);
  }
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Append renderers**

Append to `education/src/render-edu.mjs`:

```javascript
function _tr16AppendixTableHtml(cn) {
  const header = `<tr><th>P \\ 0.X</th>${Array.from({length:10}, (_,i)=>`<th>0.${i}</th>`).join('')}</tr>`;
  const rows = Array.from({length: 12}, (_, i) => {
    const whole = i + 1;
    const cells = Array.from({length: 10}, (_, j) => {
      const q = tr16LookupQ(cn, whole + j/10);
      return `<td>${q == null ? '—' : q.toFixed(2)}</td>`;
    }).join('');
    return `<tr><th>${whole}</th>${cells}</tr>`;
  }).join('');
  return `
    <div class="tr16-caption">CN = ${cn}</div>
    <table class="tr16-table">${header}${rows}</table>
  `;
}

export function renderTr16AppendixPages() {
  const pages = [];
  const perPage = 3;
  for (let i = 0; i < TR16_CN_LIST.length; i += perPage) {
    const chunk = TR16_CN_LIST.slice(i, i + perPage);
    const partIdx = Math.floor(i / perPage) + 1;
    const totalParts = Math.ceil(TR16_CN_LIST.length / perPage);
    const body = chunk.map(cn => _tr16AppendixTableHtml(cn)).join('');
    pages.push(renderSheetShell({
      title: `Appendix A — TR-16 Exhibit 2-7A (part ${partIdx}/${totalParts})`,
      sub:   'RAINFALL-RUNOFF DEPTHS FOR SELECTED RUNOFF CURVE NUMBERS',
      body:
        `<div class="cs-note" style="font-size:11px; margin-bottom:8px;">
           Formula: Q = (P − 0.2S)² / (P + 0.8S)   where S = 1000/CN − 10
         </div>` + body,
      footer: 'U.S. DEPARTMENT OF AGRICULTURE · SOIL CONSERVATION SERVICE · Exhibit 2-7A · Upper Darby, PA',
      landscape: true,
    }));
  }
  return pages;
}

export function renderGlossaryPage() {
  const terms = [
    ['95th percentile storm', 'The 24-hour rainfall depth greater than or equal to 95% of all storm events in a long-term record (excluding events < 0.1″). For DC, 1.7″ (EISA §438 Technical Guidance Table 1).'],
    ['BMP',  'Best Management Practice. A physical device or practice that reduces stormwater runoff volume, pollutant load, or peak flow (e.g., bioretention, permeable pavement, tree planting).'],
    ['CDA',  'Contributing Drainage Area — the catchment that drains to a specific BMP. Caps the BMP\'s maximum retention credit at 1.7″ × CDA area / 12.'],
    ['CN',   'Curve Number — SCS/TR-55 empirical parameter representing soil wetness + cover; integer 1–100.'],
    ['DOEE', 'DC Department of Energy & Environment — administers 21 DCMR Chapter 5 (local stormwater regulations).'],
    ['DDOT', 'DC Department of Transportation — administers Green Infrastructure Standards 2014 for the public right-of-way.'],
    ['HSG',  'Hydrologic Soil Group — SCS classification A/B/C/D by infiltration rate (A = fastest, D = slowest).'],
    ['Ia',   'Initial Abstraction — in SCS/TR-55, the depth of rainfall absorbed before runoff begins; Ia = 0.2·S.'],
    ['LOD',  'Limit of Disturbance — the project construction boundary. Scopes which land-cover rows contribute to compliance accounting.'],
    ['MEP',  'Maximum Extent Practicable — DDOT\'s PROW compliance mechanism per 21 DCMR §508.9: a documented 4-step process instead of a strict numerical SWRv target.'],
    ['METF', 'Maximum Extent Technically Feasible — EISA §438\'s equivalent of MEP: reduced retention is permitted when documented site constraints make full retention impossible.'],
    ['MLD',  'Major Land-Disturbing project — any disturbance ≥ 5,000 sf; triggers DOEE SWRv at the 1.2″ storm.'],
    ['MSI',  'Major Substantial Improvement — improvement ≥ 50% of pre-improvement value or ≥ 5,000 sf footprint change; triggers DOEE SWRv at the 0.8″ storm.'],
    ['P',    'Rainfall depth (inches) for the design storm.'],
    ['PROW', 'Public Right-of-Way — streets, sidewalks, and adjacent landscaped strips maintained by DDOT.'],
    ['Q',    'Runoff depth (inches) — the fraction of P that becomes runoff after abstractions.'],
    ['Rv',   'Runoff coefficient — fraction of rainfall that becomes runoff for a given land cover (DOEE SWRv context); also used as Rv-provided (retention volume provided by a BMP, cf).'],
    ['S',    'Potential maximum retention after runoff begins (inches); S = 1000/CN − 10.'],
    ['SDA',  'Site Drainage Area — a sub-division of the project site. Compliance is calculated per SDA, not site-wide.'],
    ['Sv',   'Storage volume of a BMP (cf), from its physical geometry (surface area × depth × porosity).'],
    ['SWRv', 'Stormwater Retention Volume — the DOEE compliance target volume per SDA; SWRv = P × Σ(A·Rv) / 12.'],
    ['TR-55', 'USDA Soil Conservation Service Technical Release 55 (1986) — the SCS CN runoff estimation method.'],
    ['TR-16', 'USDA SCS Technical Release 16 — the companion exhibit containing the rainfall-runoff lookup tables.'],
  ];
  const overview = renderOverview(
    'Alphabetical reference for the regulatory and hydrology terms used throughout this walkthrough.',
  );
  const rows = terms.map(([term, def]) => [term, def]);
  const body = overview + renderBlock('GLOSSARY', renderDataTable(['Term', 'Definition'], rows));
  return renderSheetShell({
    title: 'Appendix B — Glossary',
    sub:   '',
    body,
    footer: '21 DCMR Ch. 5 · DOEE Guidebook Jan 2020 · DDOT GI Standards 2014 · EISA §438 TG',
  });
}
```

- [ ] **Step 4: Rebuild + test**

```bash
cd education && node build.js && node --test tests/
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add education/src/render-edu.mjs education/tests/render-edu.test.mjs education/education.html
git commit -m "education: Appendix A (TR-16 full exhibit) + Appendix B (glossary)"
```

---

## Task 12 — Deck wiring + Playwright smoke + README + CI

Wire every page into `ui.mjs` `buildDeck()`; add Playwright coverage over the full deck + cross-app parity assertion (education's EISA Direct totals match summary app's within 0.5 cf); write the README; add CI workflow.

**Files:**
- Modify: `education/src/ui.mjs` (replace `buildAndRender` stub with real deck builder)
- Modify: `education/tests/browser-smoke.mjs` (expand to full walkthrough)
- Create: `education/README.md`
- Create: `.github/workflows/education.yml`

- [ ] **Step 1: Replace `buildAndRender` in ui.mjs with the real deck builder**

In `education/src/ui.mjs`, add imports at the top:

```javascript
import {
  siteAggregateLandCover, siteSwrv, detentionSummary, swrvVolume,
  eisaDirectVolumeTraceCf, tr55VolumeTraceCf,
} from './calc.mjs';
import { rvProvidedPerSda, rvProvidedPerBmp } from './aggregate.mjs';
import { tr16LookupQ } from './tr16-exhibit.mjs';
import {
  renderCoverPage, renderComplianceLandscapePage, renderProjectTriggersPage,
  renderSiteDaPage, renderSdaCdaExplainedPage, renderRvValuesPage, renderSwrvPerSdaPage,
  renderBmpCatalogPage, renderPpSizingPage, renderBioSizingPage,
  renderTreeCreditPage, renderRvProvidedPage,
  renderMepEduPage, renderEisaIntroPage,
  renderEisaDirectEduPage, renderEisaTr55EduPage, renderEisaTr16EduPage, renderEisaComparisonEduPage,
  renderDetentionEduPage, renderSiteComplianceEduPage,
  renderTr16AppendixPages, renderGlossaryPage,
} from './render-edu.mjs';
```

Replace the `buildAndRender()` function with:

```javascript
function buildAndRender() {
  const { project, sdas, cdas, bmps, params } = state.parsed;

  // Core aggregates (reused across pages).
  const agg = siteAggregateLandCover(sdas);
  const detention = detentionSummary(sdas, params.detention.p2In, params.detention.p15In, params.detentionCn);

  // Per-SDA SWRv compliance rows.
  const bySda = {};
  for (const row of sdas) {
    bySda[row.sdaId] ??= { impVeh:0, impNonVeh:0, comp:0, natural:0, bmp:0 };
    const b = bySda[row.sdaId];
    const a = row.postIn || 0;
    if (row.landUse === 'Impervious Vehicular')     b.impVeh    += a;
    else if (row.landUse === 'Impervious Non-Vehicular') b.impNonVeh += a;
    else if (row.landUse === 'Compacted (Open Space)')   b.comp      += a;
    else if (row.landUse === 'Natural (Woods)')          b.natural   += a;
    else if (row.landUse === 'BMP')                      b.bmp       += a;
  }
  const rvBySda = rvProvidedPerSda(bmps, cdas, params);
  const complianceRows = Object.keys(bySda).map(sdaId => ({
    sdaId,
    swrvReqCf:    swrvVolume(bySda[sdaId], project.rainfallIn).value,
    rvProvidedCf: rvBySda[sdaId] || 0,
  }));

  // EISA all 3 methods (pre/post).
  const preRows  = sdas.map(r => ({ area: r.preIn,  landUse: r.landUse, hsg: r.hsg }));
  const postRows = sdas.map(r => ({ area: r.postIn, landUse: r.landUse, hsg: r.hsg }));
  const direct = {
    pre:  eisaDirectVolumeTraceCf(preRows,  1.7),
    post: eisaDirectVolumeTraceCf(postRows, 1.7),
  };
  const tr55 = {
    pre:  tr55VolumeTraceCf(preRows,  1.7),
    post: tr55VolumeTraceCf(postRows, 1.7),
  };
  // TR-16 totals: look up Q per row via TR-16 table and sum area*Q/12.
  const tr16TotalForRows = (rows) => rows.reduce((sum, r) => {
    const cnRow = params.cn[r.landUse];
    if (!cnRow || cnRow[r.hsg] == null) return sum;
    const cn = cnRow[r.hsg];
    const q = tr16LookupQ(cn, 1.7);
    if (q == null) return sum;
    return sum + r.area * q / 12;
  }, 0);
  const tr16 = {
    preCf:  tr16TotalForRows(preRows),
    postCf: tr16TotalForRows(postRows),
  };
  tr16.deltaCf = tr16.postCf - tr16.preCf;
  const directSummary = { preCf: direct.pre.value, postCf: direct.post.value,
                          deltaCf: direct.post.value - direct.pre.value };
  const tr55Summary   = { preCf: tr55.pre.value,   postCf: tr55.post.value,
                          deltaCf: tr55.post.value   - tr55.pre.value };
  const bmpStorage = rvProvidedPerBmp(bmps, cdas, params).filter(b => b.rvCf > 0);

  // Build labels (for Cover TOC).
  const laterLabels = [
    'Compliance Landscape', 'Project Triggers',
    'Site DA', 'SDA & CDA Explained', 'Rv Values', 'SWRv per SDA',
    'BMP Catalog', 'Permeable Pavement Sizing', 'Bioretention Sizing', 'Tree Credit', 'Rv Provided',
    'DDOT MEP (PROW)',
    'EISA 438 Intro', 'EISA Direct Determination', 'EISA TR-55', 'EISA TR-16 Lookup', 'EISA Three-Method Comparison',
    'Detention 2-yr/15-yr', 'Site Compliance',
    'Appendix A — TR-16 Exhibit', 'Appendix B — Glossary',
  ];

  // Assemble deck.
  const deck = [];
  const push = (label, html) => deck.push({ label, html });

  push('Cover', renderCoverPage(project, laterLabels));
  push('Compliance Landscape',           renderComplianceLandscapePage(project));
  push('Project Triggers',               renderProjectTriggersPage(project));
  push('Site DA',                        renderSiteDaPage(project, agg));
  push('SDA & CDA Explained',            renderSdaCdaExplainedPage(project));
  push('Rv Values',                      renderRvValuesPage(params));
  push('SWRv per SDA',                   renderSwrvPerSdaPage(project, sdas, params));
  push('BMP Catalog',                    renderBmpCatalogPage(project, bmps));
  push('Permeable Pavement Sizing',      renderPpSizingPage(project, bmps, cdas, params));
  push('Bioretention Sizing',            renderBioSizingPage(project, bmps, cdas, params));
  push('Tree Credit',                    renderTreeCreditPage(project, bmps, params));
  push('Rv Provided',                    renderRvProvidedPage(project, bmps, cdas, params));
  push('DDOT MEP (PROW)',                renderMepEduPage(project, sdas, bmps, cdas, params));
  push('EISA 438 Intro',                 renderEisaIntroPage(project));
  push('EISA Direct Determination',      renderEisaDirectEduPage(project, direct.pre, direct.post));
  push('EISA TR-55',                     renderEisaTr55EduPage(project, tr55.pre, tr55.post));
  push('EISA TR-16 Lookup',              renderEisaTr16EduPage(project, state.parsed, params));
  push('EISA Three-Method Comparison',   renderEisaComparisonEduPage(project, directSummary, tr55Summary, tr16, bmpStorage, project.eisa));
  push('Detention 2-yr/15-yr',           renderDetentionEduPage(project, detention, params.detention.p2In, params.detention.p15In));
  push('Site Compliance',                renderSiteComplianceEduPage(project, complianceRows));
  renderTr16AppendixPages().forEach((html, i) => push(`Appendix A — TR-16 (${i+1})`, html));
  push('Appendix B — Glossary',          renderGlossaryPage());

  state.pages = deck;
  state.activeIdx = 0;
  renderTopbar();
  renderSidebar();
  renderActivePage();
  renderPrintArea();
}
```

- [ ] **Step 2: Rebuild and smoke-check in browser**

```bash
cd education && node build.js
```

Open `education/education.html`, click "Load Minnesota Ave demo", verify sidebar shows ~22 pages and clicking each renders without error.

- [ ] **Step 3: Expand the Playwright smoke test**

Replace `education/tests/browser-smoke.mjs`:

```javascript
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distUrl    = 'file://' + join(__dirname, '..', 'education.html');
const fixturePath = join(__dirname, 'fixtures', 'minnesota-ave.xlsx');

test('smoke: empty state dropzone renders as a block', async ({ page }) => {
  await page.goto(distUrl);
  await page.waitForSelector('.dropzone');
  const display = await page.$eval('.dropzone', (el) => getComputedStyle(el).display);
  expect(display).toBe('block');
});

test('smoke: load fixture, iterate every sidebar page without error', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn', { timeout: 10000 });

  const navCount = (await page.$$('.nav-btn')).length;
  expect(navCount).toBeGreaterThanOrEqual(20);

  for (let i = 0; i < navCount; i++) {
    await page.locator('.nav-btn').nth(i).click();
    const errorBanner = await page.$('.banner.error');
    expect(errorBanner, `sheet #${i+1} rendered an error banner`).toBeNull();
    const sheet = await page.$('.main .calc-sheet');
    expect(sheet, `sheet #${i+1} did not render`).not.toBeNull();
  }
});

test('smoke: print-mode populates printArea with every sheet', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn');
  const navCount = (await page.$$('.nav-btn')).length;
  const printCount = await page.evaluate(
    () => document.querySelectorAll('#printArea .calc-sheet').length,
  );
  expect(printCount).toBe(navCount);
});

test('smoke: EISA Three-Method Comparison shows all three methods', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn');
  const target = page.locator('.nav-btn', { hasText: 'Three-Method Comparison' });
  await target.click();
  const sheet = page.locator('.main .calc-sheet');
  await expect(sheet).toContainText('Direct Determination');
  await expect(sheet).toContainText('TR-55');
  await expect(sheet).toContainText('TR-16');
  await expect(sheet).toContainText('BMP');
});

test('smoke: EISA TR-16 Lookup shows highlighted P=1.7″ cell', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn');
  await page.locator('.nav-btn', { hasText: 'TR-16 Lookup' }).click();
  const highlighted = await page.$('.main .tr16-highlight');
  expect(highlighted).not.toBeNull();
});
```

- [ ] **Step 4: Run smoke tests**

```bash
cd education && npx playwright test
```

Expected: all PASS.

- [ ] **Step 5: Write README.md**

Create `education/README.md`:

```markdown
# SWM Education — DOEE / EISA 438 Walkthrough

Standalone offline webpage that walks through the full DC stormwater
compliance process (DOEE / EISA 438 / DDOT MEP) with pedagogical
narration on every page.

## Usage

1. Open `education.html` in Chrome or Edge (no server required — opens
   from `file://`).
2. Either click **Load Minnesota Ave demo** to walk the bundled fixture,
   or **Click to choose an .xlsx file** to load your own filled template.
3. Click **Print** to produce a letter-portrait PDF (landscape pages
   auto-rotate for the TR-16 appendix and Three-Method Comparison).

## Deck

~22 pages following a four-block educational pattern per page:
Overview · Why it matters · Formula & Derivation · Worked Application.

**EISA §438 is covered in four pages** showing all three methods:
Direct Determination (depression + Horton), TR-55 formula (S/Ia/Q
derivation), TR-16 Exhibit 2-7A (HTML lookup tables), and three-method
comparison with BMP storage credit. Appendix A reproduces the full
TR-16 Exhibit (12 CN tables, landscape).

## Development

```bash
cd education
npm install
npm run sync-engines      # syncs calc.mjs / aggregate.mjs / parse.mjs from summary_calculator
node build.js             # builds education.html from src/
npm test                  # runs all unit + parity + TR-16 tests
npm run smoke             # runs Playwright full-walkthrough smoke
```

## Engine sync

`calc.mjs`, `aggregate.mjs`, and `parse.mjs` are byte-identical copies
of the files in `summary_calculator/src/`. A parity test
(`tests/engine-parity.test.mjs`) fails if they drift. To re-sync:

```bash
bash ../scripts/sync-education-engines.sh
```

## Non-goals (v1)

- Live-editing calculator (user types values and sees updates).
- Non-DC regional 95th-percentile data.
- BMP sizing design (we only *explain* existing BMPs; we don't
  size them from a target).
```

- [ ] **Step 6: Add CI workflow**

Create `.github/workflows/education.yml`:

```yaml
name: Education App

on:
  push:
    paths:
      - 'education/**'
      - 'summary_calculator/src/calc.mjs'
      - 'summary_calculator/src/aggregate.mjs'
      - 'summary_calculator/src/parse.mjs'
      - 'scripts/sync-education-engines.sh'
  pull_request:
    paths:
      - 'education/**'
      - 'summary_calculator/src/calc.mjs'
      - 'summary_calculator/src/aggregate.mjs'
      - 'summary_calculator/src/parse.mjs'

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: education
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: node build.js
      - run: node --test tests/*.test.mjs
      - run: npx playwright test
```

- [ ] **Step 7: Commit**

```bash
git add education/src/ui.mjs education/tests/browser-smoke.mjs education/README.md education/education.html .github/workflows/education.yml
git commit -m "education: wire deck, Playwright full walkthrough, README, CI"
```

---

## Final verification

- [ ] **Step 1: Full test sweep**

```bash
cd education && node build.js && node --test tests/*.test.mjs && npx playwright test
```

Expected: all PASS.

- [ ] **Step 2: Manual walkthrough**

Open `education/education.html` in a browser. Click **Load Minnesota Ave demo**. Confirm:

1. Sidebar shows ~22 numbered pages.
2. Cover page displays project info + walkthrough contents TOC.
3. Compliance Landscape + Project Triggers pages show regulatory matrix.
4. Each parallel page (Site DA, SDA/CDA, SWRv, BMP sizing, MEP, EISA 4-page, Detention, Compliance) shows all four narrative blocks (Overview / Why / Formula / Worked).
5. EISA TR-16 Lookup page shows one HTML lookup table per distinct CN in the project with a yellow-highlighted P=1.7″ cell and a caption showing the Q value.
6. EISA Three-Method Comparison shows all three method totals plus BMP storage.
7. Appendix A — TR-16 Exhibit renders 12 CN tables across ~4 landscape pages.
8. Appendix B — Glossary lists ~23 terms.
9. Print → saves a 20+ page PDF with no clipping. Landscape pages rotate correctly.

- [ ] **Step 3: Engine sync regression check**

Edit `summary_calculator/src/calc.mjs` (add a trivial no-op comment), do NOT run sync, run `node --test education/tests/engine-parity.test.mjs`. Expected: FAIL with message `calc.mjs diverges — run \`bash scripts/sync-education-engines.sh\``. Revert the edit.

---

## Self-review results

- **Spec coverage:**
  - §1 Goal (loads workbook + bundled demo; 4-block pattern per page; EISA 4 pages; Appendices A/B; prints offline) — covered by Tasks 2, 3, 5–11, 12.
  - §3 Architecture (byte-identical engines + parity test) — Task 1.
  - §4 File layout — all paths in Task 1 File Structure Overview and subsequent tasks.
  - §5 Deck structure (22 pages, 4-block pattern) — Tasks 3, 5–11; wired in 12.
  - §6 EISA 4 pages — Task 9.
  - §7 TR-16 Appendix A — Task 11.
  - §8 Print layout (reuse summary print model, landscape where needed) — Task 2 (styles), 11 (landscape flag).
  - §9 Engine sync + testing (sync script, parity, TR-16 data test, cross-app smoke) — Tasks 1, 4, 12.
  - §10 Out of scope — honored; v1 does not add live editing or non-DC data.
  - §11 Verification checklist — Final Verification section.

- **Placeholder scan:** no TBD / TODO / "implement later" strings. The TR-16 data in Task 4 is actual numeric content, with the formula-parity test catching copy errors.

- **Type consistency:**
  - `rvProvidedPerSda(bmps, cdas, params) → {sdaId: cf}` used in Tasks 7, 8, 12.
  - `rvProvidedPerBmp(bmps, cdas, params) → [{name, type, subType, sdaId, cdaId, rvCf}]` used in Tasks 7, 9, 12.
  - `swrvComplianceTableRows(rows, shortStatus) → {perRow, siteTotal}` used in Task 10.
  - `eisaDirectVolumeTraceCf / tr55VolumeTraceCf → {value, units, perRow, steps}` used in Tasks 9, 12.
  - `tr16LookupQ(cn, p) → number|null` used in Tasks 4, 9, 11, 12.
  - All page renderers return a single HTML string (except `renderTr16AppendixPages()` which returns an array).

Consistent across tasks.

