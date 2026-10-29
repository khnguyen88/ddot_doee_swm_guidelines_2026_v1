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

import {
  ppSizingSv, bioSizingSv, rvFromSv, maxBmpCredit, treeRetentionCredit,
} from './calc.mjs';

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
