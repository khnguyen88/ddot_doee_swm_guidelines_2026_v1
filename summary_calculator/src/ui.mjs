// src/ui.mjs — browser-only wiring. SheetJS is loaded as a classic script → window.XLSX.

import { parseWorkbook } from './parse.mjs';
import {
  siteAggregateLandCover, siteSwrv, eisaDirectTotalVolumeCf, detentionSummary,
  swrvVolume,
} from './calc.mjs';
import { rvProvidedPerSda } from './aggregate.mjs';
import {
  renderCoverSheet, renderSiteDaSheet, renderSiteSwrvSheet,
  renderSdaPreSheet, renderSdaPostSheet, renderCdaPreSheet, renderCdaPostSheet,
  renderBmpSheets,
  renderMepSheet, renderEisa438Sheet,
  renderDetentionSheet, renderCompliancePage,
} from './render.mjs';

const main = document.getElementById('main');
const sidebar = document.getElementById('sidebar');
const printArea = document.getElementById('printArea');
const topbar = document.getElementById('topbar');

let state = { parsed: null, pages: null, activeIdx: 0, filename: null };

// ── Deck assembly ───────────────────────────────────────────────────────────

function buildDeck(parsed) {
  const { project, sdas, cdas, bmps, params } = parsed;

  const agg       = siteAggregateLandCover(sdas);
  const swrvTrace = siteSwrv(sdas, project.rainfallIn, params);
  const preRows   = sdas.map(r => [r.preIn,  r.landUse, r.hsg]);
  const postRows  = sdas.map(r => [r.postIn, r.landUse, r.hsg]);
  const preCf     = eisaDirectTotalVolumeCf(preRows,  1.7);
  const postCf    = eisaDirectTotalVolumeCf(postRows, 1.7);
  const eisa      = { preCf, postCf, deltaCf: postCf - preCf, pass: postCf <= preCf };
  const detention = detentionSummary(
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
  const rvBySda = rvProvidedPerSda(bmps, cdas, params);
  const complianceRows = Object.keys(bySda).map(sdaId => ({
    sdaId,
    swrvReqCf:    swrvVolume(bySda[sdaId], project.rainfallIn).value,
    rvProvidedCf: rvBySda[sdaId] || 0,
  }));

  // Assemble deck in TOC order.
  const sdaPrePages  = renderSdaPreSheet(project, sdas);
  const sdaPostPages = renderSdaPostSheet(project, sdas);
  const cdaPrePages  = renderCdaPreSheet(project, cdas);
  const cdaPostPages = renderCdaPostSheet(project, cdas);
  const bmpPages    = renderBmpSheets(project, bmps, cdas, params);

  const deck = [];
  const push = (label, html) => deck.push({ label, html });

  // Cover is built last because its TOC depends on the labels of everything after.
  const _labelsFor = (pages, base) =>
    pages.map((_, i) => pages.length > 1 ? `${base} (${i+1})` : base);
  const sdaPreLabels  = _labelsFor(sdaPrePages,  'SDA — Pre-development');
  const sdaPostLabels = _labelsFor(sdaPostPages, 'SDA — Post-development');
  const cdaPreLabels  = _labelsFor(cdaPrePages,  'CDA — Pre-development');
  const cdaPostLabels = _labelsFor(cdaPostPages, 'CDA — Post-development');

  const laterLabels = [];
  laterLabels.push('Site DA — Land Cover');
  laterLabels.push('Site SWRv Required');
  laterLabels.push(...sdaPreLabels, ...sdaPostLabels, ...cdaPreLabels, ...cdaPostLabels);
  bmps.forEach(b => laterLabels.push(`${b.name} — ${b.type}`));
  laterLabels.push('MEP Summary');
  laterLabels.push('EISA §438');
  laterLabels.push('Detention Summary');
  laterLabels.push('Site Compliance');

  push('Cover', renderCoverSheet(project, laterLabels));
  push('Site DA — Land Cover', renderSiteDaSheet(project, agg));
  push('Site SWRv Required',    renderSiteSwrvSheet(project, swrvTrace));
  sdaPrePages.forEach((html, i)  => push(sdaPreLabels[i],  html));
  sdaPostPages.forEach((html, i) => push(sdaPostLabels[i], html));
  cdaPrePages.forEach((html, i)  => push(cdaPreLabels[i],  html));
  cdaPostPages.forEach((html, i) => push(cdaPostLabels[i], html));
  bmpPages.forEach((html, i) => push(`${bmps[i].name} — ${bmps[i].type}`, html));
  push('MEP Summary', renderMepSheet(project, sdas));
  push('EISA §438',   renderEisa438Sheet(project, eisa));
  push('Detention Summary', renderDetentionSheet(project, detention, params.detention.p2In, params.detention.p15In));
  push('Site Compliance',   renderCompliancePage(project, complianceRows));

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
