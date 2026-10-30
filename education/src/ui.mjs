// src/ui.mjs — shell: dropzone + sidebar + topbar + print.
// Deck builder is added in Task 12 after all page renderers exist.

import { parseWorkbook } from './parse.mjs';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

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
    <div class="filename">${esc(state.filename)}</div>
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
       <span>${esc(p.label)}</span>
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
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const workbook = window.XLSX.read(bytes, { type: 'array' });
    state.parsed = parseWorkbook(workbook);
    state.filename = file.name;
    buildAndRender();
  } catch (err) {
    console.error(err);
    renderBanner('error', `Parse error: ${err.message}`);
  }
}

async function loadDemo() {
  try {
    // DEMO_XLSX_B64 is injected by build.js (see paths.demoFixture).
    // For dev-mode (education-dev.html), fall back to fetch.
    let bytes;
    if (typeof DEMO_XLSX_B64 !== 'undefined') {
      const binary = atob(DEMO_XLSX_B64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } else {
      const res = await fetch('./tests/fixtures/minnesota-ave.xlsx');
      bytes = new Uint8Array(await res.arrayBuffer());
    }
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
  const cleanup = () => {
    document.body.classList.remove('print-mode');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  requestAnimationFrame(() => window.print());
}

// Boot.
renderSidebar();
renderEmptyState();
