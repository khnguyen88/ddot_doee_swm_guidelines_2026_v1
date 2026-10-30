import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderCoverPage, renderComplianceLandscapePage, renderProjectTriggersPage,
  renderSiteDaPage, renderSdaCdaExplainedPage, renderRvValuesPage, renderSwrvPerSdaPage,
} from '../src/render-edu.mjs';
import { siteAggregateLandCover } from '../src/calc.mjs';

export const sampleProject = {
  name: 'Minnesota Ave', number: 'DTA-ABC', trigger: 'MLD',
  totalLod: 150000, rainfallIn: 1.2, eisa: 'Yes', ms4: 'MS4',
};

export const sampleSdas = [
  { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D',
    preIn: 5000, preOut: 0, postIn: 4000, postOut: 0 },
  { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Natural (Woods)', hsg: 'C',
    preIn: 2000, preOut: 0, postIn: 1000, postOut: 0 },
  { sdaId: 'SDA-2', inProw: 'No', landUse: 'Impervious Non-Vehicular', hsg: 'D',
    preIn: 0, preOut: 0, postIn: 3000, postOut: 500 },
];

export const sampleCdas = [
  { cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular',
    preIn: 3000, preOut: 0, postIn: 2500, postOut: 0 },
];

export const sampleParams = {
  rv: { 'Impervious Vehicular': 0.95, 'Natural (Woods)': 0.0,
        'Compacted (Open Space)': 0.25, 'Impervious Non-Vehicular': 0.95, 'BMP': 0 },
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

test('renderSiteDaPage: shows aggregate pre vs post and impervious %', () => {
  const agg = siteAggregateLandCover(sampleSdas);
  const html = renderSiteDaPage({ ...sampleProject }, agg);
  assert.ok(html.includes('Site Drainage Area'));
  assert.ok(html.includes('Overview'));
  assert.ok(html.includes('Impervious'));
  assert.ok(html.includes('%'));
});

test('renderSdaCdaExplainedPage: explains compliance unit vs contributing area', () => {
  const html = renderSdaCdaExplainedPage(sampleProject);
  assert.ok(html.includes('SDA'));
  assert.ok(html.includes('CDA'));
  assert.ok(html.includes('1.7'));
  assert.ok(html.includes('compliance unit') || html.includes('per SDA'));
});

test('renderRvValuesPage: shows Rv table with 0.95 / 0.25 / 0.00', () => {
  const html = renderRvValuesPage(sampleParams);
  assert.ok(html.includes('0.95'));
  assert.ok(html.includes('0.25'));
  assert.ok(html.includes('0.00') || html.includes('0'));
});

test('renderSwrvPerSdaPage: walks through SWRv formula per SDA', () => {
  const html = renderSwrvPerSdaPage(sampleProject, sampleSdas, sampleParams);
  assert.ok(html.includes('SWRv'));
  assert.ok(html.includes('P × ΣA·Rv') || html.includes('P/12'));
  assert.ok(html.includes('SDA-1'));
});
