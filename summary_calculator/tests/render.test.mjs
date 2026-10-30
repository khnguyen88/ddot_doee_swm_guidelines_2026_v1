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

import { renderBmpSheets } from '../src/render.mjs';

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
  // STEP 1 renamed to STORAGE VOLUME BREAKDOWN with media/gravel/pond lines (geometry schema update)
  assert.ok(pages[0].includes('STORAGE VOLUME BREAKDOWN') || pages[0].includes('STEP 1'));
  assert.ok(pages[0].includes('STEP 2'));
  assert.ok(pages[0].includes('STEP 3'));
});

test('renderBmpSheets: Bio page shows [trapezoid] tag + freeboard when geometry provided', () => {
  const bmps = [{
    name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
    bio: { saBot: 210, saTop: 210, saPondTop: 294,
           dMedia: 2.0, dGravel: 0.5, dPond: 0.5,
           topElev: 100.0, overflowElev: 100.75,
           sidewalkElev: 100.80, curbCutElev: 100.3 },
  }];
  const cdas = [{ cdaId: 'CDA-1', postIn: 2000 }];
  const params = { bmpDesign: { 'Bioretention / Enhanced': { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 } }, treeCredits: {} };
  const html = renderBmpSheets(sampleProject, bmps, cdas, params)[0];
  assert.ok(html.includes('trapezoid'), 'should show trapezoid tag');
  assert.ok(html.includes('FREEBOARD'), 'should show freeboard block');
  assert.ok(html.includes('126'), 'should show pond_Sv = 126 cf');
});

test('renderBmpSheets: Dry Swale page shows channel geometry + wedge + freeboard', () => {
  const bmps = [{
    name: 'S-1', sdaId: 'SDA-1', cdaId: null, type: 'Dry Swale', subType: '—',
    swale: {
      saBot: 400, saTop: 4,
      dMedia: 2.0, dGravel: 0.5, dPond: 1.0,
      length: 100, bottomWidth: 4,
      invUs: 100.0, invDs: 98.0, topUs: 102.0, topDs: 100.0,
      checkDamHeight: 1.0, checkDamSpacing: 50,
    },
  }];
  const params = { bmpDesign: { 'Dry Swale / —': { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 } }, treeCredits: {} };
  const html = renderBmpSheets(sampleProject, bmps, [], params)[0];
  assert.ok(html.includes('CHANNEL GEOMETRY'));
  assert.ok(html.includes('wedge'));
  assert.ok(html.includes('FREEBOARD'));
  assert.ok(html.includes('N_cd'));
  assert.ok(html.includes('200'));
});

test('renderBmpSheets: Dry Swale page falls back to flat-pond when geometry absent', () => {
  const bmps = [{
    name: 'S-1', sdaId: 'SDA-1', cdaId: null, type: 'Dry Swale', subType: '—',
    swale: {
      saBot: 400, saTop: 4,
      dMedia: 2.0, dGravel: 0.5, dPond: 1.0,
      length: null, bottomWidth: null,
      invUs: null, invDs: null, topUs: null, topDs: null,
      checkDamHeight: null, checkDamSpacing: null,
    },
  }];
  const params = { bmpDesign: { 'Dry Swale / —': { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 } }, treeCredits: {} };
  const html = renderBmpSheets(sampleProject, bmps, [], params)[0];
  assert.ok(!html.includes('CHANNEL GEOMETRY'));
  assert.ok(!html.includes('FREEBOARD'));
});

test('renderBmpSheets: Bio page shows [vertical] tag + omits freeboard when geometry absent', () => {
  const bmps = [{
    name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
    bio: { saBot: 210, saTop: 210, saPondTop: null,
           dMedia: 2.0, dGravel: 0.5, dPond: 0.5,
           topElev: null, overflowElev: null, sidewalkElev: null, curbCutElev: null },
  }];
  const cdas = [{ cdaId: 'CDA-1', postIn: 2000 }];
  const params = { bmpDesign: { 'Bioretention / Enhanced': { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 } }, treeCredits: {} };
  const html = renderBmpSheets(sampleProject, bmps, cdas, params)[0];
  assert.ok(!html.includes('FREEBOARD'), 'no freeboard block without elevations');
  assert.ok(html.includes('vertical'), 'should show vertical tag');
});

import { renderMepSheet } from '../src/render.mjs';

const paramsForMep = {
  bmpDesign: { 'Bioretention / Enhanced': { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 } },
  treeCredits: {},
};

test('renderMepSheet: shows MEP steps in all cases', () => {
  const sdas = [
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 1000, postOut: 0 },
    { sdaId: 'SDA-2', inProw: 'No', landUse: 'Impervious Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 500, postOut: 0 },
  ];
  const html = renderMepSheet(sampleProject, sdas, [], [], paramsForMep);
  assert.ok(html.includes('MEP'));
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('Step 1'));
  assert.ok(html.includes('Step 4'));
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

import {
  renderSdaPreSheet, renderSdaPostSheet,
  renderCdaPreSheet, renderCdaPostSheet,
} from '../src/render.mjs';

const sampleSdas = [
  { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D',
    preIn: 3200, preOut: 450, postIn: 2800, postOut: 500 },
  { sdaId: 'SDA-2', inProw: 'No', landUse: 'Natural (Woods)', hsg: 'C',
    preIn: 800, preOut: 1100, postIn: 0, postOut: 1100 },
];
const sampleCdas = [
  { cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular',
    preIn: 2000, preOut: 300, postIn: 1600, postOut: 400 },
];

test('renderSdaPreSheet: title says Pre, columns show Inside/Outside LOD', () => {
  const [html] = renderSdaPreSheet(sampleProject, sampleSdas);
  assert.ok(html.includes('Pre-development'));
  assert.ok(html.includes('Inside LOD'));
  assert.ok(html.includes('Outside LOD'));
  assert.ok(html.includes('3,200')); // preIn SDA-1
  assert.ok(html.includes('450'));   // preOut SDA-1
  assert.ok(!html.includes('Pre In')); // old header must be gone
});

test('renderSdaPostSheet: title says Post, shows post values not pre', () => {
  const [html] = renderSdaPostSheet(sampleProject, sampleSdas);
  assert.ok(html.includes('Post-development'));
  assert.ok(html.includes('2,800')); // postIn SDA-1
  assert.ok(html.includes('500'));   // postOut SDA-1
  // Pre-development values must NOT appear in the post sheet.
  assert.ok(!html.includes('3,200')); // SDA-1 preIn
  assert.ok(!html.includes('450'));   // SDA-1 preOut
});

test('renderCdaPreSheet: has CDA, SDA, Land Use columns and pre values', () => {
  const [html] = renderCdaPreSheet(sampleProject, sampleCdas);
  assert.ok(html.includes('CDA'));
  assert.ok(html.includes('Pre-development'));
  assert.ok(html.includes('2,000')); // preIn CDA-1
  assert.ok(html.includes('300'));   // preOut CDA-1
  assert.ok(html.includes('Inside LOD'));
  assert.ok(html.includes('Outside LOD'));
});

test('renderCdaPostSheet: shows post values', () => {
  const [html] = renderCdaPostSheet(sampleProject, sampleCdas);
  assert.ok(html.includes('Post-development'));
  assert.ok(html.includes('1,600')); // postIn CDA-1
  assert.ok(html.includes('400'));   // postOut CDA-1
});

test('renderSdaPreSheet: chunks when more than SDA_ROWS_PER_PAGE rows', () => {
  const many = Array.from({ length: 35 }, (_, i) => ({
    sdaId: `SDA-${i+1}`, inProw: 'No', landUse: 'Natural (Woods)', hsg: 'C',
    preIn: 100, preOut: 50, postIn: 100, postOut: 50,
  }));
  const pages = renderSdaPreSheet(sampleProject, many);
  assert.equal(pages.length, 2);
  assert.ok(pages[0].includes('part 1/2'));
  assert.ok(pages[1].includes('part 2/2'));
});

test('renderCdaPreSheet: chunks when more than SDA_ROWS_PER_PAGE rows', () => {
  const many = Array.from({ length: 35 }, (_, i) => ({
    cdaId: `CDA-${i+1}`, sdaId: 'SDA-1', landUse: 'Impervious Vehicular',
    preIn: 100, preOut: 50, postIn: 100, postOut: 50,
  }));
  const pages = renderCdaPreSheet(sampleProject, many);
  assert.equal(pages.length, 2);
  assert.ok(pages[0].includes('part 1/2'));
  assert.ok(pages[1].includes('part 2/2'));
});

test('renderCdaPreSheet: returns [] when no CDAs', () => {
  assert.deepEqual(renderCdaPreSheet(sampleProject, []), []);
});

test('renderMepSheet: shows derived table when PROW SDAs exist', () => {
  const sdas = [
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 10000, postOut: 0 },
  ];
  const bmps = [
    { name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
      bio: { saTop: 500, saBot: 500, dMedia: 2, dGravel: 0.5, dPond: 0.5 } },
  ];
  const cdas = [{ cdaId: 'CDA-1', postIn: 10000 }];
  const html = renderMepSheet(sampleProject, sdas, bmps, cdas, paramsForMep);
  // MEP target: 10000 * 1.2 / 12 = 1000 cf
  assert.ok(html.includes('1,000'), `target 1000 not found; got: ${html.slice(0, 400)}`);
  // Rv provided: 500 * (2*0.4 + 0.5*0.4 + 0.5) = 500*1.5 = 750 cf
  assert.ok(html.includes('750'));
  // Deficit: 1000-750 = 250
  assert.ok(html.includes('250'));
  assert.ok(html.includes('DEFICIT') || html.includes('✓'));
  // The old placeholder text must be absent.
  assert.ok(!html.includes('Documented'));
});

test('renderMepSheet: shows "No PROW SDAs" note when none are in PROW', () => {
  const sdas = [
    { sdaId: 'SDA-1', inProw: 'No', landUse: 'Impervious Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 1000, postOut: 0 },
  ];
  const html = renderMepSheet(sampleProject, sdas, [], [], paramsForMep);
  assert.ok(html.includes('No PROW SDAs'));
});

test('renderMepSheet: aggregates impervious across land-use rows in same PROW SDA', () => {
  const sdas = [
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 6000, postOut: 0 },
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Non-Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 4000, postOut: 0 },
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Natural (Woods)', hsg: 'C',
      preIn: 0, preOut: 0, postIn: 2000, postOut: 0 }, // not counted toward MEP target
  ];
  const html = renderMepSheet(sampleProject, sdas, [], [], paramsForMep);
  // Impervious inside LOD = 6000 + 4000 = 10000; target = 10000*1.2/12 = 1000
  assert.ok(html.includes('10,000'));
  assert.ok(html.includes('1,000'));
});

test('renderMepSheet: all-pervious PROW SDA still appears with imp=0, target=0, status ✓ MET', () => {
  const sdas = [
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Natural (Woods)', hsg: 'C',
      preIn: 0, preOut: 0, postIn: 5000, postOut: 0 },
  ];
  const html = renderMepSheet(sampleProject, sdas, [], [], paramsForMep);
  // Should NOT trigger the "MEP does not apply" fallback.
  assert.ok(!html.includes('No PROW SDAs'));
  // SDA-1 row should be present with ✓ MET.
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('✓ MET'));
});

test('renderMepSheet: non-PROW SDAs do not appear in the per-PROW-SDA table', () => {
  const sdas = [
    { sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 1000, postOut: 0 },
    { sdaId: 'SDA-2', inProw: 'No', landUse: 'Impervious Vehicular', hsg: 'D',
      preIn: 0, preOut: 0, postIn: 9999, postOut: 0 },
  ];
  const html = renderMepSheet(sampleProject, sdas, [], [], paramsForMep);
  assert.ok(html.includes('SDA-1'));
  assert.ok(!html.includes('SDA-2'));
  assert.ok(!html.includes('9,999'));
});

import {
  renderEisaDirectSheet, renderEisaTr55Sheet, renderEisaComplianceSheet,
} from '../src/render.mjs';
import { eisaDirectVolumeTraceCf, tr55VolumeTraceCf } from '../src/calc.mjs';

const eisaRows = [
  { area: 10000, landUse: 'Impervious Vehicular', hsg: 'D' },
  { area:  5000, landUse: 'Natural (Woods)',      hsg: 'C' },
];
const preDirect  = eisaDirectVolumeTraceCf(eisaRows, 1.7);
const postDirect = eisaDirectVolumeTraceCf(eisaRows, 1.7);
const preTr55    = tr55VolumeTraceCf(eisaRows, 1.7);
const postTr55   = tr55VolumeTraceCf(eisaRows, 1.7);

test('renderEisaDirectSheet: shows pre and post tables and non-zero Δ', () => {
  const preRowsDirect  = [{ area:  5000, landUse: 'Impervious Vehicular', hsg: 'D' }];
  const postRowsDirect = [{ area: 10000, landUse: 'Impervious Vehicular', hsg: 'D' }];
  const pre  = eisaDirectVolumeTraceCf(preRowsDirect,  1.7);
  const post = eisaDirectVolumeTraceCf(postRowsDirect, 1.7);
  const html = renderEisaDirectSheet(sampleProject, pre, post);
  assert.ok(html.includes('EISA §438'));
  assert.ok(html.includes('Direct Determination'));
  assert.ok(html.includes('Impervious Vehicular'));
  // Pre volume ≈ 5000 * 1.6 / 12 ≈ 667 cf
  assert.ok(html.includes('667'));
  // Post volume ≈ 10000 * 1.6 / 12 ≈ 1,333 cf
  assert.ok(html.includes('1,333'));
  // Δ = 1333-667 = 667 cf (positive — fails pre-BMP) → should show relies on BMP storage
  assert.ok(html.includes('relies on BMP storage'));
});

test('renderEisaTr55Sheet: shows CN column and TR-55 formulas', () => {
  const html = renderEisaTr55Sheet(sampleProject, preTr55, postTr55);
  assert.ok(html.includes('TR-55'));
  assert.ok(html.includes('CN'));
  // Impervious CN = 98
  assert.ok(html.includes('98'));
});

test('renderEisaComplianceSheet: lists BMP storage, both methods, applies note', () => {
  const bmpStorage = [
    { name: 'B-1', type: 'Bioretention', sdaId: 'SDA-1', rvCf: 500 },
    { name: 'T-1', type: 'Planted Trees', sdaId: 'SDA-1', rvCf: 40 },
  ];
  const html = renderEisaComplianceSheet(
    sampleProject,
    { preCf: 100, postCf: 150, deltaCf: 50 },  // direct
    { preCf: 120, postCf: 180, deltaCf: 60 },  // tr55
    bmpStorage,
    'Yes',
  );
  assert.ok(html.includes('B-1'));
  assert.ok(html.includes('T-1'));
  assert.ok(html.includes('540'));           // total BMP storage
  assert.ok(html.includes('TR-55'));                   // still appears in method comparison
  assert.ok(html.includes('EISA §438 applies'));       // new note phrasing
});

test('renderEisaComplianceSheet: pass with BMP credits, correct messaging', () => {
  const bmpStorage = [{ name: 'B-1', type: 'Bioretention', sdaId: 'SDA-1', rvCf: 100 }];
  const html = renderEisaComplianceSheet(
    sampleProject,
    { preCf: 100, postCf: 150, deltaCf: 50 },   // direct: Δ=50, net=50-100=-50 → PASS
    { preCf: 100, postCf: 160, deltaCf: 60 },   // tr55:   Δ=60, net=60-100=-40 → PASS
    bmpStorage,
    'Yes',
  );
  assert.ok(html.includes('Both methods pass'));
  assert.ok(html.includes('EISA §438 applies: Yes'));
});

test('renderEisaComplianceSheet: EISA does not apply when PROJECT!B11 = No', () => {
  const html = renderEisaComplianceSheet(
    sampleProject,
    { preCf: 100, postCf: 150, deltaCf: 50 },
    { preCf: 100, postCf: 160, deltaCf: 60 },
    [],
    'No',
  );
  assert.ok(html.includes('does not apply'));
});

import { renderExecutiveSummarySheet } from '../src/render.mjs';

test('renderExecutiveSummarySheet: shows DA block, SWRv per-SDA, EISA block when Yes', () => {
  const agg = {
    pre:  { natural: 500, compacted: 0, impervious: 1000, bmp: 0 },
    post: { natural: 0,   compacted: 0, impervious: 1500, bmp: 0 },
    preTotal: 1500, postTotal: 1500, impPctPre: 66.7, impPctPost: 100,
  };
  const complianceRows = [
    { sdaId: 'SDA-1', swrvReqCf: 100, rvProvidedCf: 150 },
    { sdaId: 'SDA-2', swrvReqCf: 200, rvProvidedCf: 100 },
  ];
  const direct = { preCf: 50, postCf: 80, deltaCf: 30, netCf: -20, pass: true };
  const tr55   = { preCf: 60, postCf: 90, deltaCf: 30, netCf: -20, pass: true };
  const html = renderExecutiveSummarySheet(sampleProject, agg, complianceRows,
                                            direct, tr55, 'Yes');
  assert.ok(html.includes('Executive Summary'));
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('SDA-2'));
  assert.ok(html.includes('66.7%') || html.includes('67%'));
  assert.ok(html.includes('Direct —'));
  assert.ok(html.includes('TR-55 —'));
  assert.ok(html.includes('EISA §438 applies'));
});

test('renderExecutiveSummarySheet: EISA block shows "No" when PROJECT!B11 = No', () => {
  const agg = {
    pre: { natural:0, compacted:0, impervious:1000, bmp:0 },
    post:{ natural:0, compacted:0, impervious:1500, bmp:0 },
    preTotal: 1000, postTotal: 1500, impPctPre: 100, impPctPost: 100,
  };
  const direct = { preCf:0, postCf:0, deltaCf:0, netCf:0, pass:true };
  const tr55   = { preCf:0, postCf:0, deltaCf:0, netCf:0, pass:true };
  const html = renderExecutiveSummarySheet(sampleProject, agg, [], direct, tr55, 'No');
  assert.ok(html.includes('EISA §438 applies'));
  assert.ok(html.includes('No'));
  // Direct/TR-55 numbers should NOT appear when EISA does not apply
  assert.ok(!html.includes('Net after BMP storage'));
});
