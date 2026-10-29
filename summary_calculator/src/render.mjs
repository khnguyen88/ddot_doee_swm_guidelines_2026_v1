// src/render.mjs — pure HTML-string renderers. No DOM, no SheetJS.
// Each render function returns a string of HTML the UI can inject into #printArea.

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export const fmtN = (n, places = 0) => {
  if (n == null || Number.isNaN(n)) return '—';
  let rounded = Number(n).toFixed(places);
  if (rounded === '-0' || /^-0\.0+$/.test(rounded)) rounded = rounded.slice(1); // strip "-" from signed zero
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

import {
  ppSizingSv, bioSizingSv, rvFromSv, maxBmpCredit, treeRetentionCredit,
} from './calc.mjs';
import { rvProvidedPerSda } from './aggregate.mjs';

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

function _chunkPages(rows, title, sub, headers, mapRow, pageTitle, footer) {
  if (!rows.length) return [];
  const pages = [];
  const total = Math.ceil(rows.length / SDA_ROWS_PER_PAGE);
  for (let i = 0; i < rows.length; i += SDA_ROWS_PER_PAGE) {
    const chunk = rows.slice(i, i + SDA_ROWS_PER_PAGE);
    const partIdx = Math.floor(i / SDA_ROWS_PER_PAGE) + 1;
    const label = total > 1 ? `${title} (part ${partIdx}/${total})` : title;
    const body = renderBlock(label, renderDataTable(headers, chunk.map(mapRow)));
    pages.push(renderSheetShell({ title: pageTitle, sub, body, footer }));
  }
  return pages;
}

export function renderSdaPreSheet(project, sdas) {
  return _chunkPages(
    sdas,
    'SDA LAND COVER — PRE-DEVELOPMENT',
    project.name || '',
    ['SDA', 'In PROW', 'Land Use', 'HSG', 'Inside LOD (sf)', 'Outside LOD (sf)'],
    (r) => [r.sdaId, r.inProw ?? '', r.landUse, r.hsg, fmtN(r.preIn), fmtN(r.preOut)],
    'SDA — Pre-development',
    '21 DCMR §599 · SWRv is calculated per SDA.',
  );
}

export function renderSdaPostSheet(project, sdas) {
  return _chunkPages(
    sdas,
    'SDA LAND COVER — POST-DEVELOPMENT',
    project.name || '',
    ['SDA', 'In PROW', 'Land Use', 'HSG', 'Inside LOD (sf)', 'Outside LOD (sf)'],
    (r) => [r.sdaId, r.inProw ?? '', r.landUse, r.hsg, fmtN(r.postIn), fmtN(r.postOut)],
    'SDA — Post-development',
    '21 DCMR §599 · SWRv is calculated per SDA.',
  );
}

export function renderCdaPreSheet(project, cdas) {
  return _chunkPages(
    cdas,
    'CDA — CONTRIBUTING DRAINAGE AREAS — PRE-DEVELOPMENT',
    project.name || '',
    ['CDA', 'SDA', 'Land Use', 'Inside LOD (sf)', 'Outside LOD (sf)'],
    (c) => [c.cdaId, c.sdaId, c.landUse, fmtN(c.preIn), fmtN(c.preOut)],
    'CDA — Pre-development',
    'Max BMP credit = CDA area × 1.7″ / 12',
  );
}

export function renderCdaPostSheet(project, cdas) {
  return _chunkPages(
    cdas,
    'CDA — CONTRIBUTING DRAINAGE AREAS — POST-DEVELOPMENT',
    project.name || '',
    ['CDA', 'SDA', 'Land Use', 'Inside LOD (sf)', 'Outside LOD (sf)'],
    (c) => [c.cdaId, c.sdaId, c.landUse, fmtN(c.postIn), fmtN(c.postOut)],
    'CDA — Post-development',
    'Max BMP credit = CDA area × 1.7″ / 12',
  );
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
  const cdaArea = cda ? cda.postIn : 0;
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
  const cdaArea = cda ? cda.postIn : 0;
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

// Named MEP_IMPERVIOUS_USES (not IMPERVIOUS_LAND_USES) to avoid a top-level
// const collision in the single-file build. build.js strips import/export
// and concatenates all .mjs sources into one script scope; calc.mjs already
// declares a module-local `IMPERVIOUS_LAND_USES` with the same members.
const MEP_IMPERVIOUS_USES = new Set([
  'Impervious Vehicular', 'Impervious Non-Vehicular', 'BMP',
]);
const MEP_TARGET_RAIN_IN = 1.2;

function _imperviousInLodByProwSda(sdas) {
  const out = {};
  // Seed every PROW SDA with 0 so all-pervious PROW SDAs still appear in the table.
  for (const r of sdas) {
    if (r.inProw === 'Yes') {
      out[r.sdaId] = out[r.sdaId] || 0;
    }
  }
  // Accumulate impervious area.
  for (const r of sdas) {
    if (r.inProw !== 'Yes') continue;
    if (!MEP_IMPERVIOUS_USES.has(r.landUse)) continue;
    out[r.sdaId] = (out[r.sdaId] || 0) + (r.postIn || 0);
  }
  return out;
}

export function renderMepSheet(project, sdas, bmps, cdas, params) {
  const stepsHtml = MEP_STEPS.map(([n, desc]) =>
    `<div class="cs-formula-line"><b>${esc(n)}</b> — ${esc(desc)}</div>`
  ).join('');

  const hasProwSdas = sdas.some(r => r.inProw === 'Yes');
  if (!hasProwSdas) {
    return renderSheetShell({
      title: 'MEP Summary (PROW)',
      sub:   `${project.name || ''} · DDOT Maximum Extent Practicable`,
      body:
        renderBlock('DDOT MEP 4-STEP PROCESS', stepsHtml) +
        renderNote('No PROW SDAs in this project — MEP does not apply.'),
      footer: 'DOEE Guidebook Appendix B · DDOT GI Standards 2014',
    });
  }

  const impByProwSda = _imperviousInLodByProwSda(sdas);
  const prowSdaIds = Object.keys(impByProwSda);
  const rvBySda = rvProvidedPerSda(bmps, cdas, params);
  const headers = ['SDA', 'Impervious In LOD (sf)', 'MEP Target @ 1.2″ (cf)',
                   'Rv Provided (cf)', 'Deficit (cf)', 'Status'];
  const rows = prowSdaIds.map(sdaId => {
    const imp = impByProwSda[sdaId];
    const target = imp * MEP_TARGET_RAIN_IN / 12;
    const provided = rvBySda[sdaId] || 0;
    const deficit = Math.max(0, target - provided);
    const status = deficit <= 0 ? '✓ MET' : 'DEFICIT — document in SWMP narrative';
    return [sdaId, fmtN(imp), fmtN(target, 0), fmtN(provided, 0), fmtN(deficit, 0), status];
  });

  const body =
    renderBlock('DDOT MEP 4-STEP PROCESS', stepsHtml) +
    renderBlock('PER-PROW-SDA METRICS', renderDataTable(headers, rows)) +
    renderNote('Narrative evidence for Steps 2–4 (infiltration suitability, infrastructure constraints, BMP placement rationale) lives in the DDOT MEP Worksheet file produced by the populator. This page summarizes derivable numerical metrics only.');

  return renderSheetShell({
    title: 'MEP Summary (PROW)',
    sub:   `${project.name || ''} · DDOT Maximum Extent Practicable`,
    body,
    footer: 'DOEE Guidebook Appendix B · DDOT GI Standards 2014',
  });
}

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

function _eisaDirectTableRows(trace) {
  return trace.perRow.map(r => [
    r.landUse, r.hsg, fmtN(r.area), r.depthIn.toFixed(3), fmtN(r.volumeCf, 0),
  ]);
}

function _eisaTr55TableRows(trace) {
  return trace.perRow.map(r => [
    r.landUse, r.hsg, fmtN(r.area), r.cn, r.depthIn.toFixed(3), fmtN(r.volumeCf, 0),
  ]);
}

export function renderEisaDirectSheet(project, pre, post) {
  const headers = ['Land Use', 'HSG', 'Area (sf)', 'Depth @ 1.7″ (in)', 'Volume (cf)'];
  const delta = post.value - pre.value;
  const pass  = delta <= 0;
  const body =
    renderBlock('PRE-DEVELOPMENT', renderDataTable(headers, _eisaDirectTableRows(pre))) +
    renderResult('Pre total', pre.value, 'cf', true) +
    renderBlock('POST-DEVELOPMENT', renderDataTable(headers, _eisaDirectTableRows(post))) +
    renderResult('Post total', post.value, 'cf', true) +
    renderResult(pass ? 'Δ ≤ 0 — Direct method passes (pre-BMP)' : 'Δ > 0 — relies on BMP storage',
                 delta, 'cf', pass) +
    renderNote('Depth deductions: impervious loses 0.1″ to depression; pervious loses 0.2″ depression + Horton infiltration (24 hr). See EISA §438 TG (EPA, Dec 2009).');
  return renderSheetShell({
    title: 'EISA §438 — Direct Determination',
    sub:   `${project.name || ''} · 95th percentile storm = 1.7″`,
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009)',
  });
}

export function renderEisaTr55Sheet(project, pre, post) {
  const headers = ['Land Use', 'HSG', 'Area (sf)', 'CN', 'Depth @ 1.7″ (in)', 'Volume (cf)'];
  const delta = post.value - pre.value;
  const pass  = delta <= 0;
  const formula =
    '<div class="cs-formula-line">S  = 1000 / CN − 10</div>' +
    '<div class="cs-formula-line">Ia = 0.2 · S</div>' +
    '<div class="cs-formula-line">Q  = (P − Ia)² / (P − Ia + S)   if P > Ia, else 0</div>';
  const body =
    renderBlock('TR-55 FORMULAS', formula) +
    renderBlock('PRE-DEVELOPMENT', renderDataTable(headers, _eisaTr55TableRows(pre))) +
    renderResult('Pre total', pre.value, 'cf', true) +
    renderBlock('POST-DEVELOPMENT', renderDataTable(headers, _eisaTr55TableRows(post))) +
    renderResult('Post total', post.value, 'cf', true) +
    renderResult(pass ? 'Δ ≤ 0 — TR-55 method passes (pre-BMP)' : 'Δ > 0 — relies on BMP storage',
                 delta, 'cf', pass) +
    renderNote('CN values from PARAMS table (SCS method). Impervious CN = 98 for all HSGs.');
  return renderSheetShell({
    title: 'EISA §438 — TR-55 (SCS CN method)',
    sub:   `${project.name || ''} · 95th percentile storm = 1.7″`,
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009) · TR-55 1986',
  });
}

// electedMethod is the value of PROJECT!B11 — a Yes/No field indicating whether
// EISA §438 applies to this project, NOT a method selector.
export function renderEisaComplianceSheet(project, direct, tr55, bmpStorage, electedMethod) {
  const bmpHeaders = ['BMP', 'Type', 'SDA', 'Rv Provided (cf)'];
  const bmpRows = bmpStorage.map(b => [b.name, b.type, b.sdaId, fmtN(b.rvCf, 0)]);
  const bmpTotal = bmpStorage.reduce((s, b) => s + (b.rvCf || 0), 0);
  bmpRows.push(['', '', 'TOTAL', fmtN(bmpTotal, 0)]);

  const directNet = direct.deltaCf - bmpTotal;
  const tr55Net   = tr55.deltaCf   - bmpTotal;
  const comparison = [
    ['Direct Determination', fmtN(direct.preCf, 0), fmtN(direct.postCf, 0), fmtN(direct.deltaCf, 0),
      fmtN(directNet, 0), directNet <= 0 ? '✓ PASS' : '✗ FAIL'],
    ['TR-55 (SCS CN)',       fmtN(tr55.preCf, 0),   fmtN(tr55.postCf, 0),   fmtN(tr55.deltaCf, 0),
      fmtN(tr55Net, 0),   tr55Net   <= 0 ? '✓ PASS' : '✗ FAIL'],
  ];
  const cmpHeaders = ['Method', 'Pre (cf)', 'Post (cf)', 'Δ (cf)', 'Net after BMP (cf)', 'Status'];

  const applies = electedMethod === 'Yes';
  const bothPass = directNet <= 0 && tr55Net <= 0;
  const eitherPass = directNet <= 0 || tr55Net <= 0;
  const summary =
    !applies ? 'EISA §438 does not apply (PROJECT!B11 = "No").'
    : bothPass ? 'Both methods pass with BMP storage credited — compliant.'
    : eitherPass ? 'One method passes with BMP storage credited — compliant under the passing method; engineer selects which to submit.'
    : 'Neither method passes with BMP storage credited — additional retention required to meet EISA §438.';

  const body =
    renderBlock('BMP STORAGE (RETENTION CREDIT)', renderDataTable(bmpHeaders, bmpRows)) +
    renderBlock('METHOD COMPARISON', renderDataTable(cmpHeaders, comparison)) +
    renderNote(`EISA §438 applies: ${electedMethod || '(PROJECT!B11 not specified)'}. ${summary}`);
  return renderSheetShell({
    title: 'EISA §438 — Compliance with BMP Storage',
    sub:   project.name || '',
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009)',
  });
}
