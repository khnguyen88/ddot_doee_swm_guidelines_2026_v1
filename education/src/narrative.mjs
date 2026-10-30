// src/narrative.mjs — four-block pedagogical helpers.
// Each helper wraps content in a labeled styled box so every page
// follows the same Overview / Why / Formula / Worked structure.

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export function renderOverview(text) {
  return `<div class="cs-edu-overview">
    <span class="cs-edu-overview-label">Overview</span>
    ${esc(text)}
  </div>`;
}

export function renderWhy(innerHtml) {
  return `<div class="cs-edu-why">
    <span class="cs-edu-why-label">Why it matters</span>
    ${innerHtml}
  </div>`;
}

export function renderFormula(innerHtml) {
  return `<div class="cs-edu-formula">
    <span class="cs-edu-formula-label">Formula &amp; Derivation</span>
    ${innerHtml}
  </div>`;
}

export function renderWorked(innerHtml) {
  return `<div class="cs-edu-worked">
    <span class="cs-edu-worked-label">Worked Application</span>
    ${innerHtml}
  </div>`;
}

export function renderEduSidebar(text) {
  return `<div class="cs-edu-sidebar">
    <b>Reviewer check</b> — ${esc(text)}
  </div>`;
}
