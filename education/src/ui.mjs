// src/ui.mjs — dropzone + sidebar + topbar + print + deck builder.

import { parseWorkbook } from './parse.mjs';
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
    if (row.landUse === 'Impervious Vehicular')          b.impVeh    += a;
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

  // EISA all 3 methods (pre/post). Aggregate by (land use, HSG) first so the
  // per-row tables on each EISA page stay compact (~5 rows instead of ~28).
  // Totals are identical because Σ (area × depth / 12) is linear in area.
  const _aggregateByCover = (areaKey) => {
    const by = {};
    for (const r of sdas) {
      const key = `${r.landUse}|${r.hsg || ''}`;
      (by[key] ??= { area: 0, landUse: r.landUse, hsg: r.hsg || 'D' }).area += r[areaKey] || 0;
    }
    return Object.values(by).filter(r => r.area > 0);
  };
  const preRows  = _aggregateByCover('preIn');
  const postRows = _aggregateByCover('postIn');
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
    // Site Compliance (portrait) before Detention (landscape) so the deck
    // ends on a landscape sheet — Chromium inserts a blank transition page
    // when portrait follows landscape in print output.
    'Site Compliance', 'Detention 2-yr/15-yr',
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
  push('Site Compliance',                renderSiteComplianceEduPage(project, complianceRows));
  push('Detention 2-yr/15-yr',           renderDetentionEduPage(project, detention, params.detention.p2In, params.detention.p15In));
  renderTr16AppendixPages().forEach((html, i) => push(`Appendix A — TR-16 (${i+1})`, html));
  push('Appendix B — Glossary',          renderGlossaryPage());

  state.pages = deck;
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
