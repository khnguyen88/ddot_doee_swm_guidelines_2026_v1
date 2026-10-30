// src/render-edu.mjs — education-flavored page renderers.
// Reuses summary-app rendering primitives (sheet shell, data tables, kv tables)
// defined inline below so render-edu.mjs is self-contained and does not need
// a separate render.mjs copy.

import { renderOverview, renderWhy } from './narrative.mjs';

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
