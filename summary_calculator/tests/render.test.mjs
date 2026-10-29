import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSheetShell, renderTrace, renderKvTable } from '../src/render.mjs';

test('renderSheetShell returns HTML with title and sub', () => {
  const html = renderSheetShell({
    title: 'BMP-02-A — Bioretention',
    sub:   'Minnesota Ave · DTA-ZZZ',
    body:  '<p>body</p>',
    footer: 'DOEE Guidebook §3.6',
  });
  assert.ok(html.includes('BMP-02-A'));
  assert.ok(html.includes('Minnesota Ave'));
  assert.ok(html.includes('<p>body</p>'));
  assert.ok(html.includes('DOEE Guidebook'));
  assert.ok(html.includes('class="calc-sheet"'));
});

test('renderSheetShell applies landscape class when flagged', () => {
  const html = renderSheetShell({ title: 'x', sub: '', body: '', landscape: true });
  assert.ok(html.includes('class="calc-sheet landscape"'));
});

test('renderTrace walks steps[] into formula lines', () => {
  const trace = {
    value: 252, units: 'cf',
    steps: [
      { expr: 'Sv = SA (dm·nm + dg·ng + dp)',
        sub:  '210 (2.0·0.40 + 0.5·0.40 + 0.5)',
        eval: '210 (0.80 + 0.20 + 0.50)',
        result: 252 },
    ],
  };
  const html = renderTrace(trace);
  assert.ok(html.includes('Sv ='));
  assert.ok(html.includes('210 (0.80 + 0.20 + 0.50)'));
  assert.ok(html.includes('252 cf'));
});

test('renderKvTable produces label/value rows', () => {
  const html = renderKvTable([
    ['SA_bot', '210 sf'],
    ['d_media', '2.0 ft'],
  ]);
  assert.ok(html.includes('SA_bot'));
  assert.ok(html.includes('210 sf'));
  assert.ok(html.includes('d_media'));
});
