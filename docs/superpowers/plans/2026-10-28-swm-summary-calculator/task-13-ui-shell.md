# Task 13 — UI shell (sidebar, states, keyboard, print flow)

**Goal:** Wire the browser side: parse the uploaded XLSX, build the full deck, show a sidebar listing every sheet, let the user click to preview any one, and trigger letter-format printing. All functions from `src/parse.mjs`, `src/calc.mjs`, and `src/render.mjs` are already imported from `src/ui.mjs`.

**Files:**
- Modify: `summary_calculator/src/ui.mjs`
- Modify: `summary_calculator/summary-calculator-dev.html` (add `#printArea`)
- Modify: `summary_calculator/src/styles.css` (sidebar nav styling)

---

- [ ] **Step 1: Append sidebar + topbar + banners CSS to `src/styles.css`**

```css
/* ── Sidebar nav ─────────────────────────────────────────────────────────── */
.nav { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; }
.nav-btn {
  all: unset; cursor: pointer; display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 6px; color: var(--muted);
  font-size: 13px; border: 1px solid transparent;
}
.nav-btn:hover { background: var(--panel-alt); color: var(--text); }
.nav-btn.active { background: var(--accent-soft); color: var(--accent); border-color: rgba(56, 198, 180, 0.35); }
.nav-num { font-family: var(--font-mono); font-size: 10.5px; color: var(--muted); width: 18px; }

/* ── Topbar ─────────────────────────────────────────────────────────────── */
.topbar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 20px; background: var(--panel); border-bottom: 1px solid var(--border);
}
.topbar .filename { color: var(--muted); font-size: 13px; }
.topbar .clear-btn {
  all: unset; cursor: pointer; color: var(--muted); font-size: 16px; padding: 0 4px;
}
.topbar .clear-btn:hover { color: var(--text); }
.topbar .spacer { flex: 1; }
.topbar .btn {
  all: unset; cursor: pointer; padding: 6px 12px; border-radius: 6px;
  background: var(--accent-soft); color: var(--accent); font-size: 13px;
  border: 1px solid rgba(56, 198, 180, 0.35);
}
.topbar .btn:hover { background: rgba(56, 198, 180, 0.2); }

/* ── Banners ────────────────────────────────────────────────────────────── */
.banner { padding: 10px 14px; margin: 10px 20px; border-radius: 6px; font-size: 13px; }
.banner.error { background: rgba(229, 72, 77, 0.1); border: 1px solid var(--fail); color: #FCA5A5; }
.banner.warn  { background: rgba(229, 185, 77, 0.1); border: 1px solid var(--warn); color: #FDE68A; }
```

- [ ] **Step 2: Rewrite `src/ui.mjs`**

```js
// src/ui.mjs — browser-only wiring. SheetJS is loaded as a classic script → window.XLSX.

import { parseWorkbook } from './parse.mjs';
import * as calc from './calc.mjs';
import * as render from './render.mjs';

const main = document.getElementById('main');
const sidebar = document.getElementById('sidebar');
const printArea = document.getElementById('printArea');
const topbar = document.getElementById('topbar');

let state = { parsed: null, pages: null, activeIdx: 0, filename: null };

// ── Deck assembly ───────────────────────────────────────────────────────────

function buildDeck(parsed) {
  const { project, sdas, cdas, bmps, params } = parsed;

  const agg       = calc.siteAggregateLandCover(sdas);
  const swrvTrace = calc.siteSwrv(sdas, project.rainfallIn, params);
  const preRows   = sdas.map(r => [r.preIn,  r.landUse, r.hsg]);
  const postRows  = sdas.map(r => [r.postIn, r.landUse, r.hsg]);
  const preCf     = calc.eisaDirectTotalVolumeCf(preRows,  1.7);
  const postCf    = calc.eisaDirectTotalVolumeCf(postRows, 1.7);
  const eisa      = { preCf, postCf, deltaCf: postCf - preCf, pass: postCf <= preCf };
  const detention = calc.detentionSummary(
    sdas, params.detention.p2In, params.detention.p15In, params.detentionCn,
  );

  // SWRv_req + Rv_provided per SDA for compliance roll-up.
  const bySda = {};
  for (const row of sdas) {
    if (!bySda[row.sdaId]) bySda[row.sdaId] = { impVeh:0, impNonVeh:0, comp:0, natural:0, bmp:0 };
    const b = bySda[row.sdaId];
    const a = row.postIn || 0;
    if (row.landUse === 'Impervious Vehicular')     b.impVeh    += a;
    else if (row.landUse === 'Impervious Non-Vehicular') b.impNonVeh += a;
    else if (row.landUse === 'Compacted (Open Space)')   b.comp      += a;
    else if (row.landUse === 'Natural (Woods)')          b.natural   += a;
    else if (row.landUse === 'BMP')                      b.bmp       += a;
  }
  const rvBySda = {};
  for (const bmp of bmps) {
    const cda = cdas.find(c => c.cdaId === bmp.cdaId);
    let rv = 0;
    if (bmp.type === 'Permeable Pavement' && bmp.pp) {
      const design = params.bmpDesign[`Permeable Pavement / ${bmp.subType}`] || { nReservoir: 0.40, retMultiplier: 1.0 };
      const sv = calc.ppSizingSv(bmp.pp.sa, bmp.pp.dReservoir, design.nReservoir).value;
      rv = Math.min(sv * design.retMultiplier, cda ? calc.maxBmpCredit(cda.withinLodSf).value : Infinity);
    } else if ((bmp.type === 'Bioretention' || bmp.type === 'Dry Swale') && bmp.bio) {
      const design = params.bmpDesign[`${bmp.type} / ${bmp.subType}`] || { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 };
      const sv = calc.bioSizingSv(bmp.bio.saBot, bmp.bio.dMedia, design.nMedia, bmp.bio.dGravel, design.nGravel, bmp.bio.dPond).value;
      rv = Math.min(sv * design.retMultiplier, cda ? calc.maxBmpCredit(cda.withinLodSf).value : Infinity);
    } else if ((bmp.type === 'Planted Trees' || bmp.type === 'Preserve Trees') && bmp.trees) {
      rv = calc.treeRetentionCredit(bmp.trees, params.treeCredits).value;
    }
    rvBySda[bmp.sdaId] = (rvBySda[bmp.sdaId] || 0) + rv;
  }
  const complianceRows = Object.keys(bySda).map(sdaId => ({
    sdaId,
    swrvReqCf:    calc.swrvVolume(bySda[sdaId], project.rainfallIn).value,
    rvProvidedCf: rvBySda[sdaId] || 0,
  }));

  // Assemble deck in TOC order.
  const sdaCdaPages = render.renderSdaCdaSummary(project, sdas, cdas);
  const bmpPages    = render.renderBmpSheets(project, bmps, cdas, params);

  const deck = [];
  const push = (label, html) => deck.push({ label, html });

  // Cover is built last because its TOC depends on the labels of everything after.
  const laterLabels = [];
  laterLabels.push('Site DA — Land Cover');
  laterLabels.push('Site SWRv Required');
  sdaCdaPages.forEach((_, i) => laterLabels.push(`SDA/CDA Summary${sdaCdaPages.length > 1 ? ' (' + (i+1) + ')' : ''}`));
  bmps.forEach(b => laterLabels.push(`${b.name} — ${b.type}`));
  laterLabels.push('MEP Summary');
  laterLabels.push('EISA §438');
  laterLabels.push('Detention Summary');
  laterLabels.push('Site Compliance');

  push('Cover', render.renderCoverSheet(project, laterLabels));
  push('Site DA — Land Cover', render.renderSiteDaSheet(project, agg));
  push('Site SWRv Required',    render.renderSiteSwrvSheet(project, swrvTrace));
  sdaCdaPages.forEach((html, i) => push(laterLabels[2 + i], html));
  bmpPages.forEach((html, i) => push(`${bmps[i].name} — ${bmps[i].type}`, html));
  push('MEP Summary', render.renderMepSheet(project, sdas));
  push('EISA §438',   render.renderEisa438Sheet(project, eisa));
  push('Detention Summary', render.renderDetentionSheet(project, detention, params.detention.p2In, params.detention.p15In));
  push('Site Compliance',   render.renderCompliancePage(project, complianceRows));

  return deck;
}

// ── Rendering ───────────────────────────────────────────────────────────────

function renderTopbar() {
  topbar.innerHTML = `
    <div class="filename">${state.filename || ''}</div>
    <button class="clear-btn" title="Clear" id="clearBtn">×</button>
    <div class="spacer"></div>
    <button class="btn" id="printBtn">Print</button>
  `;
  document.getElementById('clearBtn').addEventListener('click', clearState);
  document.getElementById('printBtn').addEventListener('click', doPrint);
}

function renderSidebar() {
  if (!state.pages) {
    sidebar.innerHTML = `<div style="font-weight:700;">SWM Summary</div><div style="font-size:10.5px; color:var(--muted); text-transform:uppercase;">Calculator</div>`;
    return;
  }
  const nav = state.pages.map((p, i) =>
    `<button class="nav-btn ${i === state.activeIdx ? 'active' : ''}" data-idx="${i}">
       <span class="nav-num">${String(i + 1).padStart(2, '0')}</span>
       <span>${p.label}</span>
     </button>`,
  ).join('');
  sidebar.innerHTML = `
    <div style="font-weight:700; font-size:14.5px;">SWM Summary</div>
    <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase; margin-bottom:12px;">Calculator</div>
    <div class="nav">${nav}</div>
  `;
  sidebar.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => setActive(parseInt(btn.dataset.idx, 10)));
  });
}

function renderActivePage() {
  if (!state.pages) return;
  main.innerHTML = state.pages[state.activeIdx].html;
}

function renderPrintArea() {
  if (!state.pages) {
    printArea.innerHTML = '';
    return;
  }
  printArea.innerHTML = state.pages.map(p => p.html).join('');
}

function renderBanner(kind, text) {
  const banner = document.createElement('div');
  banner.className = `banner ${kind}`;
  banner.textContent = text;
  main.innerHTML = '';
  main.appendChild(banner);
}

function renderEmptyState() {
  main.innerHTML = `
    <div class="empty-state">
      <div>Load a filled DOEE EISA 438 template to begin.</div>
      <label class="dropzone">
        <input type="file" accept=".xlsx,.xlsm" hidden>
        <div>Click to choose an .xlsx file</div>
      </label>
    </div>`;
  main.querySelector('input[type=file]').addEventListener('change', onFileChosen);
}

// ── Events ─────────────────────────────────────────────────────────────────

async function onFileChosen(event) {
  const file = event.target.files[0];
  if (!file) return;
  state.filename = file.name;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const workbook = window.XLSX.read(bytes, { type: 'array' });
    state.parsed = parseWorkbook(workbook);
    state.pages = buildDeck(state.parsed);
    state.activeIdx = 0;
    renderTopbar();
    renderSidebar();
    renderActivePage();
    renderPrintArea();
  } catch (err) {
    console.error(err);
    renderBanner('error', `Parse / calc error: ${err.message}`);
  }
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
  window.addEventListener('afterprint', () => document.body.classList.remove('print-mode'), { once: true });
  window.print();
}

function onKeydown(ev) {
  if (!state.pages) return;
  if ((ev.ctrlKey || ev.metaKey) && ev.key === 'p') { ev.preventDefault(); doPrint(); return; }
  if (ev.key === 'ArrowDown' && state.activeIdx < state.pages.length - 1) setActive(state.activeIdx + 1);
  if (ev.key === 'ArrowUp'   && state.activeIdx > 0)                        setActive(state.activeIdx - 1);
}
window.addEventListener('keydown', onKeydown);

// Init.
renderSidebar();
renderEmptyState();
```

- [ ] **Step 3: Update `summary-calculator-dev.html`**

Replace the body with:

```html
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
```

- [ ] **Step 4: Manual verification**

```bash
python -m http.server 8000
```

Open `http://localhost:8000/summary_calculator/summary-calculator-dev.html`:

1. Click the dropzone, select `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`.
2. Expected: topbar shows filename, sidebar lists ~20 sheets (Cover, Site DA, Site SWRv, SDA/CDA, 10+ BMPs, MEP, EISA, Detention, Compliance).
3. Click each sidebar entry — the matching sheet renders in the main pane.
4. Press ↓ a few times — sidebar highlight moves.
5. Click **Print** (or Ctrl+P). The browser's print preview should show the full deck as letter pages, with Detention Summary rotated landscape.
6. Click ×, confirm empty state returns.

- [ ] **Step 5: Commit**

```bash
git add summary_calculator/src/ui.mjs summary_calculator/summary-calculator-dev.html summary_calculator/src/styles.css
git commit -m "summary-calculator: wire UI shell, deck assembly, and print flow"
```
