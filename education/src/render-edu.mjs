// src/render-edu.mjs — education-flavored page renderers.
// Reuses summary-app rendering primitives (sheet shell, data tables, kv tables)
// defined inline below so render-edu.mjs is self-contained and does not need
// a separate render.mjs copy.

import { renderOverview, renderWhy, renderFormula, renderWorked } from './narrative.mjs';
import {
  ppSizingSv, bioSizingSv, rvFromSv, maxBmpCredit, treeRetentionCredit,
} from './calc.mjs';
import { rvProvidedPerSda, rvProvidedPerBmp } from './aggregate.mjs';

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
