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

import {
  renderBmpCatalogPage, renderPpSizingPage, renderBioSizingPage,
  renderTreeCreditPage, renderRvProvidedPage,
} from '../src/render-edu.mjs';

export const sampleBmps = [
  { name: 'BMP-02-B', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Permeable Pavement',
    subType: 'Enhanced', pp: { sa: 150, dReservoir: 1 } },
  { name: 'BMP-02-A', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention',
    subType: 'Enhanced', bio: { saTop: 210, saBot: 210, dMedia: 2, dGravel: 0.5, dPond: 0.5 } },
  { name: 'BMP-04-T', sdaId: 'SDA-1', type: 'Planted Trees',
    trees: { plantedSmall: 0, plantedLarge: 2, preservedSmall: 0, preservedLarge: 0,
             preservedSpecial: 0, preservedHeritage: 0 } },
];
export const bmpParams = {
  bmpDesign: {
    'Permeable Pavement / Enhanced': { nReservoir: 0.4, retMultiplier: 1.0 },
    'Bioretention / Enhanced':       { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 },
  },
  treeCredits: { 'T-1 Large': 30 },
};

test('renderBmpCatalogPage: lists the BMP types present in project', () => {
  const html = renderBmpCatalogPage(sampleProject, sampleBmps);
  assert.ok(html.includes('Permeable Pavement'));
  assert.ok(html.includes('Bioretention'));
  assert.ok(html.includes('Planted Trees'));
  assert.ok(html.includes('BMP-02-A'));
});

test('renderPpSizingPage: shows Sv formula + per-BMP numeric trace', () => {
  const html = renderPpSizingPage(sampleProject, sampleBmps, sampleCdas, bmpParams);
  assert.ok(html.includes('Sv = SA × d'));
  assert.ok(html.includes('BMP-02-B'));
  assert.ok(html.includes('150'));
  assert.ok(html.includes('60'));  // Sv = 150*1*0.4 = 60
});

test('renderBioSizingPage: shows the three-layer Sv formula + trace', () => {
  const html = renderBioSizingPage(sampleProject, sampleBmps, sampleCdas, bmpParams);
  assert.ok(html.includes('d_media'));
  assert.ok(html.includes('d_gravel'));
  assert.ok(html.includes('d_pond'));
  assert.ok(html.includes('BMP-02-A'));
});

test('renderTreeCreditPage: shows the credit per tree-type table', () => {
  const html = renderTreeCreditPage(sampleProject, sampleBmps, bmpParams);
  assert.ok(html.includes('T-1 Large'));
  assert.ok(html.includes('BMP-04-T'));
  assert.ok(html.includes('30'));  // credit = 30 cf
});

test('renderRvProvidedPage: rolls up Rv per SDA', () => {
  const html = renderRvProvidedPage(sampleProject, sampleBmps, sampleCdas, bmpParams);
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('Rv Provided'));
});
