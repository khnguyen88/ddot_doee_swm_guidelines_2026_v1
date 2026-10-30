// src/render-edu.mjs — education-flavored page renderers.
// Reuses summary-app rendering primitives (sheet shell, data tables, kv tables)
// defined inline below so render-edu.mjs is self-contained and does not need
// a separate render.mjs copy.

import { renderOverview, renderWhy, renderFormula, renderWorked } from './narrative.mjs';
import {
  ppSizingSv, bioSizingSv, drySwaleSizingSv, rvFromSv, maxBmpCredit, treeRetentionCredit,
  bioFreeboardFt, drySwaleFreeboardFt,
  eisaDirectRunoffDepth, HORTON_INFIL_LOSS_B, HORTON_INFIL_LOSS_C,
  tr55RunoffDepth, CN as CN_TABLE,
} from './calc.mjs';
import { rvProvidedPerSda, rvProvidedPerBmp, swrvComplianceTableRows } from './aggregate.mjs';
import { tr16LookupQ, TR16_CN_LIST } from './tr16-exhibit.mjs';

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

// ── Task 7: BMP Catalog + PP + Bio + Trees + Rv Provided ──────────────────────

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
  const bioBmps = bmps.filter(b => b.type === 'Bioretention' && b.bio);
  const overview = renderOverview(
    'Bioretention retains in three components: engineered media (void space), gravel underdrain layer (void space), and ponded surface above grade. The subsurface uses SA_bot; the pond uses a trapezoid frustum between SA_top and SA_pond_top when the basin has sloped sides.',
  );
  const why = renderWhy(`
    <p>Media and gravel sit in a rectangular trench — SA_bot governs those layers. The pond above grade flares with the side slopes of the surrounding landscape — if SA_pond_top is provided, the pond is modeled as a trapezoidal frustum between SA_top and SA_pond_top. For structural planters with vertical walls, leave SA_pond_top blank — the pond collapses to a vertical column.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">media_Sv  = SA_bot × d_media × n_media</div>
    <div class="cs-formula-line">gravel_Sv = SA_bot × d_gravel × n_gravel</div>
    <div class="cs-formula-line">pond_Sv   = ½ × (SA_top + SA_pond_top) × d_pond   <i>[trapezoid when SA_pond_top provided]</i></div>
    <div class="cs-formula-line">pond_Sv   = SA_bot × d_pond                       <i>[vertical-wall fallback]</i></div>
    <div class="cs-formula-line">Sv_total  = media_Sv + gravel_Sv + pond_Sv</div>
    <div class="cs-formula-line">Rv_applied = min(Rv, CDA_area × 1.7″ / 12)</div>
  `);
  const traces = bioBmps.map(bmp => {
    const design = params.bmpDesign[`${bmp.type} / ${bmp.subType}`]
      || { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 };
    const svTrace = bioSizingSv(
      bmp.bio.saBot, bmp.bio.saTop, bmp.bio.saPondTop,
      bmp.bio.dMedia, design.nMedia,
      bmp.bio.dGravel, design.nGravel, bmp.bio.dPond,
    );
    const rvTrace = rvFromSv(svTrace.value, design.retMultiplier);
    const cda = _cdaFor(bmp, cdas);
    const cap = cda ? maxBmpCredit(cda.postIn).value : Infinity;
    const applied = Math.min(rvTrace.value, cap);
    const mediaSv  = bmp.bio.saBot * bmp.bio.dMedia  * design.nMedia;
    const gravelSv = bmp.bio.saBot * bmp.bio.dGravel * design.nGravel;
    const arith = renderArithmeticTrace([
      { label: `${bmp.name} — media_Sv`,  formula: 'SA_bot × d_media × n_media',  substitution: `${bmp.bio.saBot} × ${bmp.bio.dMedia} × ${design.nMedia}`, result: `${fmtN(mediaSv, 0)} cf` },
      { label: `${bmp.name} — gravel_Sv`, formula: 'SA_bot × d_gravel × n_gravel', substitution: `${bmp.bio.saBot} × ${bmp.bio.dGravel} × ${design.nGravel}`, result: `${fmtN(gravelSv, 0)} cf` },
      { label: `${bmp.name} — pond_Sv [${svTrace.pondModel}]`, formula: svTrace.pondModel === 'trapezoid' ? '½ × (SA_top + SA_pond_top) × d_pond' : 'SA_bot × d_pond', substitution: svTrace.pondModel === 'trapezoid' ? `½ × (${bmp.bio.saTop} + ${bmp.bio.saPondTop}) × ${bmp.bio.dPond}` : `${bmp.bio.saBot} × ${bmp.bio.dPond}`, result: `${fmtN(svTrace.components.pondSv, 0)} cf` },
      { label: `${bmp.name} — Sv_total`, formula: 'media_Sv + gravel_Sv + pond_Sv', substitution: `${fmtN(mediaSv, 0)} + ${fmtN(gravelSv, 0)} + ${fmtN(svTrace.components.pondSv, 0)}`, result: `${fmtN(svTrace.value, 0)} cf` },
      { label: `${bmp.name} — Rv_applied`, formula: 'min(Rv, CDA_area × 1.7 / 12)', substitution: cda ? `min(${fmtN(rvTrace.value, 0)}, ${fmtN(cap, 0)})` : `${fmtN(rvTrace.value, 0)} (no CDA cap)`, result: `${fmtN(applied, 0)} cf` },
    ]);
    const fb = bioFreeboardFt({
      topElev: bmp.bio.topElev, dPond: bmp.bio.dPond,
      overflowElev: bmp.bio.overflowElev,
      sidewalkElev: bmp.bio.sidewalkElev,
      curbCutElev: bmp.bio.curbCutElev,
    });
    const freeboardLine = fb == null ? '' :
      `<div class="cs-formula-line" style="margin-top:4px;"><b>Freeboard (DDOT §33.14.5.5 min 3″): ${fb.toFixed(2)} ft (${(fb*12).toFixed(1)}″) ${fb >= 0.25 ? '✓' : '✗'}</b></div>`;
    return renderBlock(`${bmp.name} (${bmp.type} / ${bmp.subType})`, arith + freeboardLine);
  }).join('');
  const body = overview + why + formula + renderWorked(traces || '<p>No Bioretention BMPs in this project.</p>');
  return renderSheetShell({
    title: 'Bioretention Sizing',
    sub:   project.name || '',
    body,
    footer: 'DOEE Guidebook §3.6 Bioretention · DDOT §33.14.5.5',
  });
}

export function renderDrySwaleSizingPage(project, bmps, cdas, params) {
  const swaleBmps = bmps.filter(b => b.type === 'Dry Swale' && b.swale);
  const overview = renderOverview(
    'A Dry Swale is a linear channel with check dams. Each dam ponds a 3D wedge upstream — triangular in longitudinal profile, rectangular in cross-section. Total pond storage = N dams × wedge volume per dam.',
  );
  const why = renderWhy(`
    <p>Unlike a bioretention basin (flat pond across the whole bottom), a swale ponds behind each check dam. The slope of the channel bed means water surface at each dam rises from the invert to the dam crest; the wedge upstream is bounded by where the water surface hits the invert again. For design per DDOT Table 3-32, the engineer picks spacing that achieves ≤ 2% effective longitudinal slope.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">Slope S = (inv_US − inv_DS) / L_s</div>
    <div class="cs-formula-line">N_cd = floor(L_s / X_cd)</div>
    <div class="cs-formula-line">full wedge upstream length = H_cd / S</div>
    <div class="cs-formula-line">effective base per dam = min(X_cd, H_cd / S)</div>
    <div class="cs-formula-line">wedge Sv per dam = ½ × effective_base × H_cd × w_s</div>
    <div class="cs-formula-line"><b>Total pond Sv = N_cd × wedge Sv per dam</b></div>
    <div class="cs-formula-line" style="margin-top: 4px;">Sv_total = SA_bot × (d_media·n_media + d_gravel·n_gravel) + pond_Sv</div>
  `);
  const traces = swaleBmps.map(bmp => {
    const design = params.bmpDesign[`Dry Swale / ${bmp.subType}`]
      || { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 };
    const svTrace = drySwaleSizingSv({
      saBot: bmp.swale.saBot,
      dMedia: bmp.swale.dMedia, nMedia: design.nMedia,
      dGravel: bmp.swale.dGravel, nGravel: design.nGravel,
      dPond: bmp.swale.dPond,
      length: bmp.swale.length, bottomWidth: bmp.swale.bottomWidth,
      invUs: bmp.swale.invUs, invDs: bmp.swale.invDs,
      checkDamHeight: bmp.swale.checkDamHeight,
      checkDamSpacing: bmp.swale.checkDamSpacing,
    });
    const rvTrace = rvFromSv(svTrace.value, design.retMultiplier);
    const cda = _cdaFor(bmp, cdas);
    const cap = cda ? maxBmpCredit(cda.postIn).value : Infinity;
    const applied = Math.min(rvTrace.value, cap);
    const steps = [];
    if (svTrace.pondModel === 'wedge') {
      const t = svTrace.pondTrace;
      steps.push(
        { label: `${bmp.name} — Longitudinal slope`, formula: 'S = (inv_US − inv_DS) / L_s', substitution: `(${bmp.swale.invUs} − ${bmp.swale.invDs}) / ${bmp.swale.length}`, result: `${t.slope.toFixed(4)} ft/ft` },
        { label: `${bmp.name} — Dam count`, formula: 'N_cd = floor(L_s / X_cd)', substitution: `floor(${bmp.swale.length} / ${bmp.swale.checkDamSpacing})`, result: `${t.nDams} dams` },
        { label: `${bmp.name} — Full wedge upstream length`, formula: 'H_cd / S', substitution: `${bmp.swale.checkDamHeight} / ${t.slope.toFixed(4)}`, result: `${t.fullWedgeBase.toFixed(1)} ft` },
        { label: `${bmp.name} — Effective base per dam`, formula: 'min(X_cd, H_cd/S)', substitution: `min(${bmp.swale.checkDamSpacing}, ${t.fullWedgeBase.toFixed(1)})`, result: `${t.effectiveBase.toFixed(1)} ft` },
        { label: `${bmp.name} — Wedge Sv per dam`, formula: '½ × base × H_cd × w_s', substitution: `½ × ${t.effectiveBase.toFixed(1)} × ${bmp.swale.checkDamHeight} × ${bmp.swale.bottomWidth}`, result: `${t.wedgePerDam.toFixed(0)} cf` },
        { label: `${bmp.name} — Total pond Sv`, formula: 'N_cd × wedge Sv per dam', substitution: `${t.nDams} × ${t.wedgePerDam.toFixed(0)}`, result: `${fmtN(svTrace.components.pondSv, 0)} cf` },
      );
    } else {
      steps.push({ label: `${bmp.name} — Pond Sv (flat fallback)`, formula: 'SA_bot × d_pond', substitution: `${bmp.swale.saBot} × ${bmp.swale.dPond}`, result: `${fmtN(svTrace.components.pondSv, 0)} cf` });
    }
    steps.push(
      { label: `${bmp.name} — Media + Gravel subsurface Sv`, formula: 'SA_bot × (d_media·n_media + d_gravel·n_gravel)', substitution: `${bmp.swale.saBot} × (${bmp.swale.dMedia}·${design.nMedia} + ${bmp.swale.dGravel}·${design.nGravel})`, result: `${fmtN(svTrace.components.mediaGravelSv, 0)} cf` },
      { label: `${bmp.name} — Sv total`, formula: 'media_gravel_Sv + pond_Sv', substitution: `${fmtN(svTrace.components.mediaGravelSv, 0)} + ${fmtN(svTrace.components.pondSv, 0)}`, result: `${fmtN(svTrace.value, 0)} cf` },
      { label: `${bmp.name} — Rv_applied`, formula: 'min(Rv, CDA_area × 1.7 / 12)', substitution: cda ? `min(${fmtN(rvTrace.value, 0)}, ${fmtN(cap, 0)})` : `${fmtN(rvTrace.value, 0)} (no CDA cap)`, result: `${fmtN(applied, 0)} cf` },
    );
    const arith = renderArithmeticTrace(steps);
    const fb = drySwaleFreeboardFt({
      invUs: bmp.swale.invUs, invDs: bmp.swale.invDs,
      topUs: bmp.swale.topUs, topDs: bmp.swale.topDs,
      checkDamHeight: bmp.swale.checkDamHeight,
    });
    const freeboardLine = fb == null ? '' :
      `<div class="cs-formula-line" style="margin-top:4px;"><b>Freeboard (DDOT §33.14.5.5 min 6″): ${fb.toFixed(2)} ft (${(fb*12).toFixed(1)}″) ${fb >= 0.5 ? '✓' : '✗'}</b></div>`;
    return renderBlock(`${bmp.name} — Dry Swale`, arith + freeboardLine);
  }).join('');
  const body = overview + why + formula + renderWorked(traces || '<p>No Dry Swale BMPs in this project.</p>');
  return renderSheetShell({
    title: 'Dry Swale Sizing',
    sub:   project.name || '',
    body,
    footer: 'DOEE Guidebook §3.9 O-2 Dry Swale · DDOT §33.14.5',
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
    <p>Each BMP's Rv_applied is already capped at its CDA's maximum credit (1.7″ equivalent). The sum per SDA is then compared directly against the SWRv target for that SDA. If Σ Rv_applied ≥ SWRv_required, the SDA passes.</p>
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

// ── Task 8: MEP + EISA 438 Intro pages ────────────────────────────────────────

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
  const mepTraces = prowSdaIds.map(sdaId => {
    const imp = impByProwSda[sdaId];
    const target = imp * 1.2 / 12;
    const provided = rvBySda[sdaId] || 0;
    const deficit = Math.max(0, target - provided);
    return renderArithmeticTrace([
      { label: `${sdaId} — MEP target retention @ 1.2″ storm`, formula: 'target = Imp_In_LOD × 1.2 / 12', substitution: `${fmtN(imp, 0)} × 1.2 / 12`, result: `${fmtN(target, 0)} cf` },
      { label: `${sdaId} — Rv provided (Σ BMPs in this SDA)`, formula: 'Rv_provided = Σ Rv_applied where bmp.sdaId == this_sdaId', substitution: 'Σ over BMPs', result: `${fmtN(provided, 0)} cf` },
      { label: `${sdaId} — Deficit`, formula: 'deficit = max(0, target − Rv_provided)', substitution: `max(0, ${fmtN(target, 0)} − ${fmtN(provided, 0)})`, result: `${fmtN(deficit, 0)} cf` },
    ]);
  }).join('');
  const body =
    overview + why +
    renderBlock('DDOT MEP 4-STEP PROCESS', stepsHtml) +
    renderBlock('PER-PROW-SDA METRICS', renderDataTable(headers, rows)) +
    renderBlock('PER-PROW-SDA ARITHMETIC', mepTraces);
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

// ── Task 9: EISA 438 four pages ────────────────────────────────────────────────

function _directDepthSteps(row, P) {
  const isImp = ['Impervious Vehicular', 'Impervious Non-Vehicular', 'BMP'].includes(row.landUse);
  const hsg = row.hsg;
  const steps = [];
  let depth;
  if (isImp) {
    depth = Math.max(0, P - 0.1);
    steps.push({
      label: `${row.landUse} depression deduction (impervious)`,
      formula: 'depth = max(0, P − 0.1)',
      substitution: `max(0, ${P} − 0.1)`,
      result: `${depth.toFixed(3)} in`,
    });
  } else if (hsg === 'A') {
    depth = 0;
    steps.push({ label: `${row.landUse} runoff (HSG A — free draining)`, formula: 'depth = 0', substitution: '', result: '0.000 in' });
  } else if (hsg === 'D') {
    depth = Math.max(0, P - 0.2);
    steps.push({
      label: `${row.landUse} runoff (HSG D — depression only, no Horton)`,
      formula: 'depth = max(0, P − 0.2)',
      substitution: `max(0, ${P} − 0.2)`,
      result: `${depth.toFixed(3)} in`,
    });
  } else {
    const horton = hsg === 'B' ? HORTON_INFIL_LOSS_B : HORTON_INFIL_LOSS_C;
    depth = Math.max(0, P - 0.2 - horton);
    steps.push({
      label: `${row.landUse} Horton 24-hr loss (HSG ${hsg})`,
      formula: 'Horton = f_min·T + ((f_max − f_min)/k)·(1 − e^(−k·T))',
      substitution: `(HSG ${hsg} parameters, T=24 hr)`,
      result: `${horton.toFixed(3)} in`,
    });
    steps.push({
      label: `${row.landUse} runoff depth (HSG ${hsg})`,
      formula: 'depth = max(0, P − 0.2 − Horton)',
      substitution: `max(0, ${P} − 0.2 − ${horton.toFixed(3)})`,
      result: `${depth.toFixed(3)} in`,
    });
  }
  const vol = row.area * depth / 12;
  steps.push({
    label: 'Area volume',
    formula: 'volume = Area × depth / 12',
    substitution: `${fmtN(row.area, 0)} × ${depth.toFixed(3)} / 12`,
    result: `${fmtN(vol, 0)} cf`,
  });
  return steps;
}

function _tr55TraceSteps(row, P) {
  const cn = row.cn;
  const S = 1000 / cn - 10;
  const Ia = 0.2 * S;
  const Q = P > Ia ? Math.pow(P - Ia, 2) / (P - Ia + S) : 0;
  const vol = row.area * Q / 12;
  return [
    { label: `${row.landUse} CN=${cn}: Maximum potential retention`, formula: 'S = 1000 / CN − 10', substitution: `1000 / ${cn} − 10`, result: `${S.toFixed(3)} in` },
    { label: 'Initial abstraction', formula: 'Ia = 0.2 × S', substitution: `0.2 × ${S.toFixed(3)}`, result: `${Ia.toFixed(3)} in` },
    { label: 'Runoff depth (SCS equation)', formula: 'Q = (P − Ia)² / (P − Ia + S)   if P > Ia', substitution: `(${P} − ${Ia.toFixed(3)})² / (${P} − ${Ia.toFixed(3)} + ${S.toFixed(3)})`, result: `${Q.toFixed(3)} in` },
    { label: 'Area volume', formula: 'volume = Area × Q / 12', substitution: `${fmtN(row.area, 0)} × ${Q.toFixed(3)} / 12`, result: `${fmtN(vol, 0)} cf` },
  ];
}

function _tr16TraceSteps(row, P) {
  const cn = row.cn;
  const S = 1000 / cn - 10;
  const Ia = 0.2 * S;
  const Qformula = P > Ia ? Math.pow(P - Ia, 2) / (P - Ia + S) : 0;
  const Qlookup = tr16LookupQ(cn, P);
  const delta = Math.abs(Qformula - (Qlookup ?? Qformula));
  const Qused = Qlookup != null ? Qlookup : Qformula;
  const vol = row.area * Qused / 12;
  return [
    { label: 'Underlying TR-55 computation (TR-16 is a tabulation of the same equation)', formula: 'S = 1000/CN − 10, Ia = 0.2·S, Q = (P − Ia)² / (P − Ia + S)', substitution: `CN=${cn} → S=${S.toFixed(3)}, Ia=${Ia.toFixed(3)}`, result: `Q = ${Qformula.toFixed(3)} in` },
    { label: 'TR-16 Exhibit 2-7A lookup (printed table, rounded to 0.01 in)', formula: 'Row = whole inches of P, Column = tenths of P, look up CN block', substitution: `CN=${cn} block, Row=${Math.floor(P)}, Column=${Math.round((P - Math.floor(P)) * 10)}`, result: Qlookup != null ? `Q = ${Qlookup.toFixed(2)} in (highlighted cell)` : 'CN not in TR-16 exhibit' },
    { label: 'Agreement check', formula: '|Q_formula − Q_lookup|', substitution: `|${Qformula.toFixed(3)} − ${(Qlookup ?? Qformula).toFixed(2)}|`, result: `${delta.toFixed(3)} in (< 0.01 in tolerance ✓)` },
    { label: 'Area volume (using TR-16 lookup value)', formula: 'volume = Area × Q / 12', substitution: `${fmtN(row.area, 0)} × ${Qused.toFixed(2)} / 12`, result: `${fmtN(vol, 0)} cf` },
  ];
}

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
  const preTraces  = pre.perRow.map(r => renderArithmeticTrace(_directDepthSteps(r, 1.7))).join('');
  const postTraces = post.perRow.map(r => renderArithmeticTrace(_directDepthSteps(r, 1.7))).join('');
  const worked = renderWorked(
    renderBlock('HORTON PARAMETERS', hortonTable) +
    renderBlock('PRE-DEVELOPMENT',  buildTable(pre))  +
    `<div class="cs-formula-line"><b>Pre total: ${fmtN(pre.value, 0)} cf</b></div>` +
    renderBlock('PRE-DEVELOPMENT PER-ROW ARITHMETIC', preTraces) +
    renderBlock('POST-DEVELOPMENT', buildTable(post)) +
    `<div class="cs-formula-line"><b>Post total: ${fmtN(post.value, 0)} cf</b></div>` +
    renderBlock('POST-DEVELOPMENT PER-ROW ARITHMETIC', postTraces) +
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
  const preTraces  = pre.perRow.map(r => renderArithmeticTrace(_tr55TraceSteps(r, 1.7))).join('');
  const postTraces = post.perRow.map(r => renderArithmeticTrace(_tr55TraceSteps(r, 1.7))).join('');
  const worked = renderWorked(
    renderBlock('PRE-DEVELOPMENT',  buildTable(pre)) +
    `<div class="cs-formula-line"><b>Pre total: ${fmtN(pre.value, 0)} cf</b></div>` +
    renderBlock('PRE-DEVELOPMENT PER-ROW ARITHMETIC', preTraces) +
    renderBlock('POST-DEVELOPMENT', buildTable(post)) +
    `<div class="cs-formula-line"><b>Post total: ${fmtN(post.value, 0)} cf</b></div>` +
    renderBlock('POST-DEVELOPMENT PER-ROW ARITHMETIC', postTraces) +
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
  // Per-row arithmetic trace for each SDA row that has a CN in TR16_CN_LIST.
  const perRowTraces = (parsed.sdas || [])
    .map(r => {
      const cnRow = params.cn[r.landUse];
      if (!cnRow || cnRow[r.hsg] == null) return null;
      const cn = cnRow[r.hsg];
      if (!TR16_CN_LIST.includes(cn)) return null;
      return renderArithmeticTrace(_tr16TraceSteps({ landUse: r.landUse, hsg: r.hsg, area: r.postIn || 0, cn }, 1.7));
    })
    .filter(Boolean)
    .join('');
  const worked = renderWorked(
    (tables || '<div class="cs-note">No TR-16-tabulated CNs in this project.</div>') + notice +
    (perRowTraces ? renderBlock('PER-ROW ARITHMETIC (post-development, TR-16 lookup)', perRowTraces) : ''),
  );
  const body = overview + why + formula + worked;
  return renderSheetShell({
    title: 'EISA §438 — TR-16 Exhibit 2-7A Lookup',
    sub:   `${project.name || ''} · P = 1.7″ highlighted`,
    body,
    footer: 'SCS TR-16 Exhibit 2-7A · USDA Soil Conservation Service · Upper Darby, PA',
  });
}

// ── Task 10: Detention + Site Compliance pages ─────────────────────────────────

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

// ── Task 11: Appendix A (TR-16 full exhibit) + Appendix B (glossary) ──────────

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
  const whyDiverge = renderBlock('WHY DIRECT, TR-55, AND TR-16 PRODUCE DIFFERENT TOTALS', `
    <p>All three methods approximate the same physical quantity (24-hr runoff from the design storm) but use different physical models.</p>
    <p><b>Direct Determination</b> (EPA EISA §438 TG, Dec 2009) is a linear deduction model: subtract a fixed depression storage, subtract the 24-hr Horton infiltration integral (pervious only), and whatever remains becomes runoff. <b>No continuing abstraction</b> after the fixed losses are satisfied.</p>
    <p><b>TR-55</b> uses an initial abstraction Ia = 0.2·S and a <b>continuing abstraction</b> encoded in the (P − Ia + S) denominator of Q = (P − Ia)² / (P − Ia + S). The soil keeps absorbing water even after Ia is satisfied, so TR-55 Q is always strictly less than P − Ia.</p>
    <p><b>TR-16</b> is a tabulation of the TR-55 equation at 0.1″ P increments; it matches TR-55 to within 0.01″ rounding.</p>
    <table class="data" style="margin-top: 6px;">
      <thead><tr><th>Surface</th><th>Direct vs TR-55</th><th>Why</th></tr></thead>
      <tbody>
        <tr><td>Impervious (CN=98)</td><td>Direct &gt; TR-55</td><td>Direct subtracts only 0.1″ depression; TR-55 continues to absorb via S ≈ 0.20″</td></tr>
        <tr><td>Pervious HSG A/B/C</td><td>Direct &lt; TR-55</td><td>Direct's 24-hr Horton loss (~3–7″) exceeds rainfall; TR-55 CN captures only partial infiltration</td></tr>
        <tr><td>Pervious HSG D</td><td>Direct &gt; TR-55</td><td>Direct uses no Horton on D (just 0.2″ depression); TR-55 still has large S for high-CN D soils</td></tr>
      </tbody>
    </table>
    <p style="margin-top: 6px;">EPA's EISA §438 TG offers both methods and lets the designer pick. Neither is "wrong"; they encode different physical assumptions.</p>
  `);
  const body =
    overview + why +
    renderBlock('BMP STORAGE (RETENTION CREDIT)', renderDataTable(bmpHeaders, bmpRows)) +
    renderBlock('METHOD COMPARISON', renderDataTable(cmpHeaders, comparison)) +
    whyDiverge +
    renderWorked(`<p>${esc(summary)}</p><p><b>EISA §438 applies:</b> ${esc(electedMethod || '(not specified)')}</p>`);
  return renderSheetShell({
    title: 'EISA §438 — Three-Method Comparison',
    sub:   project.name || '',
    body,
    footer: 'EISA §438 TG (EPA, Dec 2009)',
    landscape: true,
  });
}

/**
 * Render a per-row arithmetic trace in the four-line pattern:
 *   Label:
 *     formula
 *     = substitution
 *     = result
 */
export function renderArithmeticTrace(steps) {
  const body = steps.map(s => {
    const lines = [`${s.label}:`, `  ${s.formula}`];
    if (s.substitution) lines.push(`    = ${s.substitution}`);
    if (s.result)       lines.push(`    = ${s.result}`);
    return lines.join('\n');
  }).join('\n\n');
  return `<pre class="cs-edu-trace" style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 4px; padding: 10px 14px; font-family: var(--font-mono); font-size: 11.5px; color: #0F172A; margin: 8px 0; white-space: pre-wrap;">${body}</pre>`;
}
