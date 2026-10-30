// src/render-edu.mjs — education-flavored page renderers.
// Reuses summary-app rendering primitives (sheet shell, data tables, kv tables)
// defined inline below so render-edu.mjs is self-contained and does not need
// a separate render.mjs copy.

import { renderOverview, renderWhy, renderFormula, renderWorked } from './narrative.mjs';

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
    renderBlock('Walkthrough contents', toc);
  return renderSheetShell({
    title:  'SWM Education — DOEE / EISA 438 Walkthrough',
    sub:    `${project.name || ''}${project.number ? '  ·  ' + project.number : ''}`,
    body,
    footer: '21 DCMR §599 · DOEE Guidebook Jan 2020 · DDOT GI Standards 2014 · EISA §438',
  });
}

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
    <div class="cs-formula-line">SWRv = (P/12) × Σ(A_i · Rv_i)   <i>per SDA, inside the LOD</i></div>
    <div class="cs-formula-line">P = ${fmtN(project.rainfallIn, 2)}″   (project rainfall)</div>
    <div class="cs-formula-line">A_i = post-development area of land-cover row i (sf, inside LOD)</div>
    <div class="cs-formula-line">Rv_i = runoff coefficient (see "Rv Values" page)</div>
  `);
  const by = {};
  for (const r of sdas) {
    (by[r.sdaId] ??= []).push(r);
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
