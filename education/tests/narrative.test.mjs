import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderOverview, renderWhy, renderFormula, renderWorked, renderEduSidebar,
} from '../src/narrative.mjs';

test('renderOverview wraps text in overview block with label', () => {
  const html = renderOverview('What this page teaches you.');
  assert.ok(html.includes('class="cs-edu-overview"'));
  assert.ok(html.includes('Overview'));
  assert.ok(html.includes('What this page teaches you.'));
});

test('renderWhy includes WHY IT MATTERS label', () => {
  const html = renderWhy('<p>Regulatory origin.</p>');
  assert.ok(html.includes('class="cs-edu-why"'));
  assert.ok(html.includes('Why it matters'));
  assert.ok(html.includes('<p>Regulatory origin.</p>'));
});

test('renderFormula includes FORMULA label and preserves inner HTML', () => {
  const html = renderFormula('<div class="cs-formula-line">Q = (P - Ia)^2 / (P - Ia + S)</div>');
  assert.ok(html.includes('class="cs-edu-formula"'));
  assert.ok(html.includes('Formula'));
  assert.ok(html.includes('Q ='));
});

test('renderWorked includes WORKED APPLICATION label', () => {
  const html = renderWorked('<table>values</table>');
  assert.ok(html.includes('class="cs-edu-worked"'));
  assert.ok(html.includes('Worked'));
  assert.ok(html.includes('<table>values</table>'));
});

test('renderEduSidebar floats a reviewer-check callout', () => {
  const html = renderEduSidebar('Reviewer check: ensure impervious includes BMP as cover.');
  assert.ok(html.includes('class="cs-edu-sidebar"'));
  assert.ok(html.includes('Reviewer check'));
});
