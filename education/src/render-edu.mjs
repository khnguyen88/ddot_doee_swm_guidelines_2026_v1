// src/render-edu.mjs — education-flavored page renderers.
// Reuses summary-app rendering primitives (sheet shell, data tables, kv tables)
// defined inline below so render-edu.mjs is self-contained and does not need
// a separate render.mjs copy.

import { renderOverview, renderWhy, renderFormula } from './narrative.mjs';

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
