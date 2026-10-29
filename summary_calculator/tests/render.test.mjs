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

import { renderCoverSheet, renderSiteDaSheet, renderSiteSwrvSheet } from '../src/render.mjs';
import { siteAggregateLandCover, siteSwrv } from '../src/calc.mjs';

const sampleProject = {
  name: 'Test Project', number: 'DTA-X', trigger: 'MLD',
  totalLod: 50000, rainfallIn: 1.2, eisa: 'No', ms4: 'MS4',
};

test('renderCoverSheet: shows project fields and TOC', () => {
  const html = renderCoverSheet(sampleProject, ['Cover', 'Site DA', 'Site SWRv']);
  assert.ok(html.includes('Test Project'));
  assert.ok(html.includes('DTA-X'));
  assert.ok(html.includes('MLD'));
  assert.ok(html.includes('1.2'));
  assert.ok(html.includes('Site SWRv'));
});

test('renderSiteDaSheet: shows pre and post totals', () => {
  const sdas = [
    { landUse: 'Impervious Vehicular', preIn: 1000, postIn: 1500 },
    { landUse: 'Natural (Woods)',      preIn: 500,  postIn: 0 },
  ];
  const agg = siteAggregateLandCover(sdas);
  const html = renderSiteDaSheet(sampleProject, agg);
  assert.ok(html.includes('Site DA'));
  assert.ok(html.includes('1,500'));          // post impervious
  assert.ok(html.includes('500'));            // pre natural
});

test('renderSiteSwrvSheet: shows formula with substituted values', () => {
  const sdas = [{ landUse: 'Impervious Vehicular', postIn: 1000, sdaId: 'SDA-1' }];
  const params = { rv: { 'Impervious Vehicular': 0.95 } };
  const trace = siteSwrv(sdas, 1.2, params);
  const html = renderSiteSwrvSheet(sampleProject, trace);
  assert.ok(html.includes('Site SWRv'));
  assert.ok(html.includes('95'));             // final CF
  assert.ok(html.includes('informational'));  // the per-SDA compliance note
});

import { renderSdaCdaSummary, renderBmpSheets } from '../src/render.mjs';

test('renderSdaCdaSummary: one SDA page + one CDA page when both are small', () => {
  const sdas = Array.from({ length: 5 }, (_, i) => ({
    sdaId: `SDA-${i+1}`, landUse: 'Impervious Vehicular', hsg: 'D',
    preIn: 100, postIn: 100,
  }));
  const cdas = [{ cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular', postIn: 100 }];
  const pages = renderSdaCdaSummary(sampleProject, sdas, cdas);
  assert.equal(pages.length, 2);
  assert.ok(pages[0].includes('SDA-1'));
  assert.ok(pages[1].includes('CDA-1'));
});

test('renderSdaCdaSummary: paginates when > 30 rows', () => {
  const sdas = Array.from({ length: 65 }, (_, i) => ({
    sdaId: `SDA-${i+1}`, landUse: 'Impervious Vehicular', hsg: 'D',
    preIn: 100, postIn: 100,
  }));
  const pages = renderSdaCdaSummary(sampleProject, sdas, []);
  assert.ok(pages.length >= 3, `expected ≥3 pages, got ${pages.length}`);
});

test('renderBmpSheets: one page per BMP with 3-step math', () => {
  const bmps = [{
    name: 'BMP-02-A', sdaId: 'SDA-2', cdaId: 'CDA-2',
    type: 'Bioretention', subType: 'Enhanced',
    bio: { saTop: 210, saBot: 210, dMedia: 2.0, dGravel: 0.5, dPond: 0.5 },
  }];
  const cdas = [{ cdaId: 'CDA-2', sdaId: 'SDA-2', landUse: 'Impervious Vehicular', postIn: 1000 }];
  const params = {
    bmpDesign: { 'Bioretention / Enhanced': { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 } },
    treeCredits: {},
  };
  const pages = renderBmpSheets(sampleProject, bmps, cdas, params);
  assert.equal(pages.length, 1);
  assert.ok(pages[0].includes('BMP-02-A'));
  assert.ok(pages[0].includes('Bioretention'));
  assert.ok(pages[0].includes('STEP 1'));
  assert.ok(pages[0].includes('STEP 2'));
  assert.ok(pages[0].includes('STEP 3'));
});

import { renderMepSheet, renderEisa438Sheet } from '../src/render.mjs';

test('renderMepSheet: lists SDAs with 4-step status', () => {
  const sdas = [
    { sdaId: 'SDA-1' }, { sdaId: 'SDA-2' },
  ];
  const html = renderMepSheet(sampleProject, sdas);
  assert.ok(html.includes('MEP'));
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('Step 1'));
  assert.ok(html.includes('Step 4'));
});

test('renderEisa438Sheet: pre vs post comparison', () => {
  const html = renderEisa438Sheet(sampleProject, {
    preCf: 2000, postCf: 1500, deltaCf: -500, pass: true,
  });
  assert.ok(html.includes('EISA'));
  assert.ok(html.includes('2,000'));
  assert.ok(html.includes('1,500'));
  assert.ok(html.includes('95th percentile'));
});

import { renderDetentionSheet, renderCompliancePage } from '../src/render.mjs';

test('renderDetentionSheet: empty state when no SDA triggers', () => {
  const html = renderDetentionSheet(sampleProject, { perSda: [], anyRequired: false }, 3.14, 5.23);
  assert.ok(html.includes('No detention required'));
  assert.ok(html.includes('3.14'));
  assert.ok(html.includes('5.23'));
});

test('renderDetentionSheet: shows only triggered SDAs, applies landscape', () => {
  const summary = {
    anyRequired: true,
    perSda: [
      { sdaId: 'SDA-1', preCn: 70, postCn: 95, p2PreQ: 0.5, p2PostQ: 2.5, p2Required: true,
        p15PreQ: 1.5, p15PostQ: 4.1, p15Required: true },
      { sdaId: 'SDA-2', preCn: 70, postCn: 70, p2PreQ: 0.5, p2PostQ: 0.5, p2Required: false,
        p15PreQ: 1.5, p15PostQ: 1.5, p15Required: false },
    ],
  };
  const html = renderDetentionSheet(sampleProject, summary, 3.14, 5.23);
  assert.ok(html.includes('landscape'));
  assert.ok(html.includes('SDA-1'));
  assert.ok(!html.includes('SDA-2'));   // filtered out
});

test('renderCompliancePage: PASS when Rv_provided ≥ SWRv_req per SDA', () => {
  const rows = [
    { sdaId: 'SDA-1', swrvReqCf: 500, rvProvidedCf: 600 },
    { sdaId: 'SDA-2', swrvReqCf: 300, rvProvidedCf: 250 },
  ];
  const html = renderCompliancePage(sampleProject, rows);
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('SDA-2'));
  assert.ok(html.includes('PASS'));
  assert.ok(html.includes('FAIL'));
});

test('renderSdaCdaSummary: CDA block shows Pre and Post Within LOD columns', () => {
  const sampleProject = { name: 'Test', number: 'T-1', rainfallIn: 1.2, trigger: 'MLD' };
  const sdas = [{
    sdaId: 'SDA-1', landUse: 'Impervious Vehicular', hsg: 'B',
    preIn: 100, preOut: 0, postIn: 100, postOut: 0,
  }];
  const cdas = [{
    cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular', hsg: 'B',
    preIn: 50, preOut: 0, postIn: 150, postOut: 0,
  }];
  const pages = renderSdaCdaSummary(sampleProject, sdas, cdas);
  // Expect the CDA page to include both headers.
  const cdaPage = pages.find(p => p.includes('CDA-1'));
  assert.ok(cdaPage, 'CDA page present');
  assert.ok(cdaPage.includes('Pre Within LOD'),  'Pre column header present');
  assert.ok(cdaPage.includes('Post Within LOD'), 'Post column header present');
  // And the data cells for both.
  assert.ok(cdaPage.includes('>50<'),  'Pre value rendered');
  assert.ok(cdaPage.includes('>150<'), 'Post value rendered');
});
