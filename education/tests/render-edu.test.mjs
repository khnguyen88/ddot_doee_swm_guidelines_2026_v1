import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderCoverPage, renderComplianceLandscapePage, renderProjectTriggersPage } from '../src/render-edu.mjs';

export const sampleProject = {
  name: 'Minnesota Ave', number: 'DTA-ABC', trigger: 'MLD',
  totalLod: 150000, rainfallIn: 1.2, eisa: 'Yes', ms4: 'MS4',
};

test('renderCoverPage: shows project info and the "what this teaches" overview', () => {
  const html = renderCoverPage(sampleProject, ['Cover', 'Compliance Landscape', 'EISA 438']);
  assert.ok(html.includes('SWM Education'));
  assert.ok(html.includes('Minnesota Ave'));
  assert.ok(html.includes('DTA-ABC'));
  assert.ok(html.includes('Walkthrough contents'));
  assert.ok(html.includes('Compliance Landscape'));
});

test('renderComplianceLandscapePage: lists 21 DCMR, EISA 438, DDOT MEP', () => {
  const html = renderComplianceLandscapePage(sampleProject);
  assert.ok(html.includes('21 DCMR'));
  assert.ok(html.includes('EISA'));
  assert.ok(html.includes('DDOT'));
  assert.ok(html.includes('MEP'));
  assert.ok(html.includes('Overview'));
  assert.ok(html.includes('Why it matters'));
});

test('renderProjectTriggersPage: lights the row matching project.trigger', () => {
  const html = renderProjectTriggersPage({ ...sampleProject, trigger: 'MLD' });
  assert.ok(html.includes('MLD'));
  assert.ok(html.includes('✓')); // trigger-matched row has a checkmark
});
