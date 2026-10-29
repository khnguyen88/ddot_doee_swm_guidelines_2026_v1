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
