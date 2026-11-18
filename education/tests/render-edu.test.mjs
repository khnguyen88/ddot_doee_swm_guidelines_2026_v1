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

import { renderMepEduPage, renderEisaIntroPage } from '../src/render-edu.mjs';

test('renderMepEduPage: shows 4-step process + per-PROW-SDA table', () => {
  const html = renderMepEduPage(sampleProject, sampleSdas, sampleBmps, sampleCdas, bmpParams);
  assert.ok(html.includes('4-Step') || html.includes('4-STEP') || html.includes('Step 1'));
  assert.ok(html.includes('Step 1'));
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('MEP'));
});

test('renderMepEduPage: "No PROW SDAs" when none in PROW', () => {
  const noProw = [{ sdaId: 'SDA-X', inProw: 'No', landUse: 'Impervious Vehicular', hsg: 'D',
    preIn: 0, preOut: 0, postIn: 1000, postOut: 0 }];
  const html = renderMepEduPage(sampleProject, noProw, [], [], bmpParams);
  assert.ok(html.includes('No PROW SDAs'));
});

test('renderEisaIntroPage: explains 95th percentile + 1.7"', () => {
  const html = renderEisaIntroPage(sampleProject);
  assert.ok(html.includes('95th'));
  assert.ok(html.includes('1.7'));
  assert.ok(html.includes('METF'));
});

import {
  renderEisaDirectEduPage, renderEisaTr55EduPage,
  renderEisaTr16EduPage, renderEisaComparisonEduPage,
} from '../src/render-edu.mjs';
import {
  eisaDirectVolumeTraceCf, tr55VolumeTraceCf, HORTON_INFIL_LOSS_B, HORTON_INFIL_LOSS_C,
} from '../src/calc.mjs';
import { renderDetentionEduPage, renderSiteComplianceEduPage } from '../src/render-edu.mjs';
import { detentionSummary, swrvVolume } from '../src/calc.mjs';

const eisaRows = [
  { area: 10000, landUse: 'Impervious Vehicular', hsg: 'D' },
  { area:  5000, landUse: 'Natural (Woods)',      hsg: 'C' },
];

test('renderEisaDirectEduPage: shows depression + Horton with numerical constants', () => {
  const pre  = eisaDirectVolumeTraceCf(eisaRows, 1.7);
  const post = eisaDirectVolumeTraceCf(eisaRows, 1.7);
  const html = renderEisaDirectEduPage(sampleProject, pre, post);
  assert.ok(html.includes('Direct Determination'));
  assert.ok(html.includes('0.1'));                 // depression (impervious)
  assert.ok(html.includes('0.2'));                 // depression (pervious)
  assert.ok(html.includes('Horton'));
  assert.ok(html.includes(HORTON_INFIL_LOSS_B.toFixed(2)));
  assert.ok(html.includes(HORTON_INFIL_LOSS_C.toFixed(2)));
});

test('renderEisaTr55EduPage: derives S / Ia / Q with CN column', () => {
  const pre  = tr55VolumeTraceCf(eisaRows, 1.7);
  const post = tr55VolumeTraceCf(eisaRows, 1.7);
  const html = renderEisaTr55EduPage(sampleProject, pre, post);
  assert.ok(html.includes('S  = 1000'));
  assert.ok(html.includes('Ia'));
  assert.ok(html.includes('CN'));
  assert.ok(html.includes('98'));                  // impervious CN
});

test('renderEisaTr16EduPage: renders lookup table for distinct project CNs with P=1.7 highlighted', () => {
  const parsed = { sdas: eisaRows.map(r => ({ ...r, sdaId: 'SDA-1' })) };
  const paramsForTr16 = {
    cn: {
      'Impervious Vehicular': { A: 98, B: 98, C: 98, D: 98 },
      'Natural (Woods)':      { A: 25, B: 55, C: 70, D: 77 },
    },
  };
  const html = renderEisaTr16EduPage(sampleProject, parsed, paramsForTr16);
  assert.ok(html.includes('CN = 98'));
  assert.ok(html.includes('CN = 70'));
  assert.ok(html.includes('tr16-highlight'));
  assert.ok(html.includes('1.48'));                 // CN 98 at P=1.7
});

test('renderEisaComparisonEduPage: shows all three method totals + BMP storage', () => {
  const bmpStorage = [{ name: 'B-1', type: 'Bioretention', sdaId: 'SDA-1', rvCf: 100 }];
  const html = renderEisaComparisonEduPage(sampleProject,
    { preCf: 100, postCf: 150, deltaCf: 50 },
    { preCf: 110, postCf: 160, deltaCf: 50 },
    { preCf: 108, postCf: 158, deltaCf: 50 },     // TR-16 totals (rounded)
    bmpStorage,
    'Yes',
  );
  assert.ok(html.includes('Direct Determination'));
  assert.ok(html.includes('TR-55'));
  assert.ok(html.includes('TR-16'));
  assert.ok(html.includes('BMP'));
  assert.ok(html.includes('B-1'));
});

test('renderDetentionEduPage: shows SCS CN formula + per-SDA table', () => {
  const params = {
    detention: { p2In: 3.14, p15In: 5.23 },
    detentionCn: { Natural: 70, Compacted: 74, Impervious: 98, BMP: 98 },
  };
  const summary = detentionSummary(sampleSdas, params.detention.p2In, params.detention.p15In, params.detentionCn);
  const html = renderDetentionEduPage(sampleProject, summary, params.detention.p2In, params.detention.p15In);
  assert.ok(html.includes('Detention'));
  assert.ok(html.includes('CN'));
  assert.ok(html.includes('2-yr'));
  assert.ok(html.includes('15-yr'));
});

test('renderSiteComplianceEduPage: per-SDA SWRv required vs provided with status', () => {
  const complianceRows = [
    { sdaId: 'SDA-1', swrvReqCf: 500, rvProvidedCf: 600 },
    { sdaId: 'SDA-2', swrvReqCf: 300, rvProvidedCf: 100 },
  ];
  const html = renderSiteComplianceEduPage(sampleProject, complianceRows);
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('SDA-2'));
  assert.ok(html.includes('SITE TOTAL'));
  assert.ok(html.includes('✓') || html.includes('PASS'));
  assert.ok(html.includes('✗') || html.includes('FAIL'));
});

import { renderTr16AppendixPages, renderGlossaryPage } from '../src/render-edu.mjs';

test('renderTr16AppendixPages: returns array; every CN present somewhere', () => {
  const pages = renderTr16AppendixPages();
  assert.ok(Array.isArray(pages));
  assert.ok(pages.length >= 4);
  const joined = pages.join('');
  for (const cn of [60, 61, 68, 69, 70, 74, 75, 76, 80, 81, 82, 98]) {
    assert.ok(joined.includes(`CN = ${cn}`), `missing CN=${cn} in appendix`);
  }
  // Should be landscape
  for (const p of pages) assert.ok(p.includes('class="calc-sheet landscape"'));
});

test('renderGlossaryPage: contains core terms', () => {
  const html = renderGlossaryPage();
  for (const term of ['SWRv', 'SDA', 'CDA', 'HSG', 'LOD', 'MEP', 'METF', 'PROW',
                      'Ia', 'CN', 'Rv', 'Sv', '95th percentile']) {
    assert.ok(html.includes(term), `glossary missing ${term}`);
  }
});

import { renderArithmeticTrace } from '../src/render-edu.mjs';

test('renderArithmeticTrace: emits <pre> with four-line pattern per step', () => {
  const html = renderArithmeticTrace([
    { label: 'Maximum potential retention', formula: 'S = 1000 / CN − 10', substitution: '1000 / 98 − 10', result: '0.204 in' },
    { label: 'Initial abstraction',         formula: 'Ia = 0.2 × S',         substitution: '0.2 × 0.204',    result: '0.041 in' },
  ]);
  assert.ok(html.includes('<pre'));
  assert.ok(html.includes('Maximum potential retention'));
  assert.ok(html.includes('S = 1000 / CN − 10'));
  assert.ok(html.includes('1000 / 98 − 10'));
  assert.ok(html.includes('0.204 in'));
  assert.ok(html.includes('Initial abstraction'));
});

// ── Task 7.1 — Area_Summary pedagogy page ──────────────────────────────────

import { renderAreaSummaryEduPage } from '../src/render-edu.mjs';
import { buildEduFixture } from './fixtures/edu-fixture.mjs';

test('renderAreaSummaryEduPage: emits all four narrative blocks', () => {
  const { project, areaSummary } = buildEduFixture();
  const html = renderAreaSummaryEduPage(project, areaSummary);
  assert.match(html, /Overview/);
  assert.match(html, /Why it matters/);
  assert.match(html, /Formula/);
  assert.match(html, /Worked/);
});

test('renderAreaSummaryEduPage: renders a per-SDA table with pre+post+SWRv columns', () => {
  const { project, areaSummary } = buildEduFixture();
  const html = renderAreaSummaryEduPage(project, areaSummary);
  assert.ok(html.includes('<table'));
  assert.ok(html.includes('SDA'));
  assert.ok(html.includes('Pre Imp'));
  assert.ok(html.includes('Post Imp'));
  assert.ok(html.includes('Post BMP'));
  assert.ok(html.includes('SWRv'));
});

test('renderAreaSummaryEduPage: includes a Match? column for area reconciliation', () => {
  const { project, areaSummary } = buildEduFixture();
  const html = renderAreaSummaryEduPage(project, areaSummary);
  assert.match(html, /Match\?/);
});

test('renderAreaSummaryEduPage: shows the SDA-1 row from the fixture', () => {
  const { project, areaSummary } = buildEduFixture();
  const html = renderAreaSummaryEduPage(project, areaSummary);
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('21 DCMR'));           // regulatory anchor
});

test('renderAreaSummaryEduPage: empty rollup renders without crashing', () => {
  const html = renderAreaSummaryEduPage(
    { name: 'Empty' },
    { sdaRows: [], cdaRows: [] },
  );
  assert.ok(html.includes('Area Summary'));
});

// ── Task 7.2 — TC_PATH pedagogy page ───────────────────────────────────────

import { renderTcPathEduPage } from '../src/render-edu.mjs';

test('renderTcPathEduPage: emits all four narrative blocks', () => {
  const { project, tcPaths } = buildEduFixture();
  const html = renderTcPathEduPage(project, tcPaths);
  assert.match(html, /Overview/);
  assert.match(html, /Why it matters/);
  assert.match(html, /Formula/);
  assert.match(html, /Worked/);
});

test('renderTcPathEduPage: lists each segment type + Tc total row', () => {
  const { project, tcPaths } = buildEduFixture();
  const html = renderTcPathEduPage(project, tcPaths);
  // fixture contains sheet + shallow + channel on at least one path
  assert.ok(html.includes('sheet'));
  assert.ok(html.includes('shallow'));
  assert.ok(html.includes('channel'));
  // Tc final row (header or label)
  assert.ok(html.toLowerCase().includes('tc'));
  assert.ok(html.includes('Tt'));
});

test('renderTcPathEduPage: cites TR-55 and the 0.1 hr Tc floor', () => {
  const { project, tcPaths } = buildEduFixture();
  const html = renderTcPathEduPage(project, tcPaths);
  assert.ok(html.includes('TR-55'));
  assert.ok(html.includes('0.1'));            // Tc floor language
});

test('renderTcPathEduPage: renders each path by name + pathId', () => {
  const { project, tcPaths } = buildEduFixture();
  const html = renderTcPathEduPage(project, tcPaths);
  assert.ok(html.includes('Primary flow path'));
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('CDA-1'));
});

test('renderTcPathEduPage: handles empty paths list gracefully', () => {
  const html = renderTcPathEduPage({ name: 'Empty' }, []);
  assert.ok(html.includes('Time of Concentration'));
  assert.ok(html.toLowerCase().includes('no'));   // empty-state message
});

// ── Task 7.3 — Peak Discharge pedagogy pages (SDA + CDA) ───────────────────

import {
  renderPeakDischargeSdaEduPage, renderPeakDischargeCdaEduPage,
} from '../src/render-edu.mjs';

test('renderPeakDischargeSdaEduPage: emits all four narrative blocks', () => {
  const { project, peakSda } = buildEduFixture();
  const html = renderPeakDischargeSdaEduPage(project, peakSda);
  assert.match(html, /Overview/);
  assert.match(html, /Why it matters/);
  assert.match(html, /Formula/);
  assert.match(html, /Worked/);
});

test('renderPeakDischargeSdaEduPage: per-SDA table with Qp pre/post for 2-yr and 15-yr', () => {
  const { project, peakSda } = buildEduFixture();
  const html = renderPeakDischargeSdaEduPage(project, peakSda);
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('2-yr'));
  assert.ok(html.includes('15-yr'));
  assert.ok(html.includes('Tc'));
  assert.ok(html.includes('CN'));
  // qu and Qp column labels
  assert.ok(html.toLowerCase().includes('qu'));
  assert.ok(html.includes('Qp'));
});

test('renderPeakDischargeSdaEduPage: trigger column marks YES/NO on the 15-yr storm', () => {
  const { project, peakSda } = buildEduFixture();
  const html = renderPeakDischargeSdaEduPage(project, peakSda);
  // Fixture SDA-1: Qpost15 (1.22) > Qpre15 (1.08) → Trigger = YES.
  assert.ok(html.toLowerCase().includes('trigger'));
  assert.ok(html.includes('Yes') || html.includes('YES'));
});

test('renderPeakDischargeSdaEduPage: Why block cites the detention trigger', () => {
  const { project, peakSda } = buildEduFixture();
  const html = renderPeakDischargeSdaEduPage(project, peakSda);
  assert.ok(html.toLowerCase().includes('detention'));
  assert.ok(html.includes('21 DCMR') || html.includes('DOEE'));
});

test('renderPeakDischargeSdaEduPage: handles empty rows gracefully', () => {
  const html = renderPeakDischargeSdaEduPage({ name: 'Empty' }, []);
  assert.ok(html.includes('Peak Discharge'));
});

test('renderPeakDischargeCdaEduPage: emits all four narrative blocks + CDA rows', () => {
  const { project, peakCda } = buildEduFixture();
  const html = renderPeakDischargeCdaEduPage(project, peakCda);
  assert.match(html, /Overview/);
  assert.match(html, /Why it matters/);
  assert.match(html, /Formula/);
  assert.match(html, /Worked/);
  assert.ok(html.includes('CDA-1'));
  assert.ok(html.includes('SDA-1'));         // joined SDA id on CDA page
});

test('renderPeakDischargeCdaEduPage: Why block references the BMP accepting the post Q', () => {
  const { project, peakCda } = buildEduFixture();
  const html = renderPeakDischargeCdaEduPage(project, peakCda);
  assert.ok(html.toLowerCase().includes('bmp'));
});

test('renderPeakDischargeCdaEduPage: empty rows gracefully', () => {
  const html = renderPeakDischargeCdaEduPage({ name: 'Empty' }, []);
  assert.ok(html.includes('Peak Discharge'));
});

// ── Task 7.4 — DOEE Detention-BMP (2020 methodology) page ─────────────────

import { renderDoeeDetentionBmpEduPage } from '../src/render-edu.mjs';

test('renderDoeeDetentionBmpEduPage: emits all four narrative blocks', () => {
  const { project, detentionBmp } = buildEduFixture();
  const html = renderDoeeDetentionBmpEduPage(project, detentionBmp);
  assert.match(html, /Overview/);
  assert.match(html, /Why it matters/);
  assert.match(html, /Formula/);
  assert.match(html, /Worked/);
});

test('renderDoeeDetentionBmpEduPage: per-BMP block with CN pre/post, Sv, Q_adj, CN_adj', () => {
  const { project, detentionBmp } = buildEduFixture();
  const html = renderDoeeDetentionBmpEduPage(project, detentionBmp);
  assert.ok(html.includes('BMP-1'));
  assert.ok(html.includes('CDA-1'));
  // KV labels
  assert.ok(html.toLowerCase().includes('pre'));
  assert.ok(html.toLowerCase().includes('post'));
  assert.ok(html.toLowerCase().includes('sv'));
  assert.ok(html.includes('Adj'));
  // Specific stormwater values (fixture: 2-yr detention required)
  assert.ok(html.includes('2-yr'));
  assert.ok(html.includes('15-yr'));
});

test('renderDoeeDetentionBmpEduPage: narrative cites 2020 methodology', () => {
  const { project, detentionBmp } = buildEduFixture();
  const html = renderDoeeDetentionBmpEduPage(project, detentionBmp);
  assert.ok(html.includes('2020'));
});

test('renderDoeeDetentionBmpEduPage: summary count table at bottom', () => {
  const { project, detentionBmp } = buildEduFixture();
  const html = renderDoeeDetentionBmpEduPage(project, detentionBmp);
  // There should be a count/summary of required vs not-required
  assert.ok(html.toLowerCase().includes('required'));
});

test('renderDoeeDetentionBmpEduPage: handles empty rows gracefully', () => {
  const html = renderDoeeDetentionBmpEduPage({ name: 'Empty' }, []);
  assert.ok(html.includes('Detention'));
});

// ── Task 7.5 — EISA Direct Timestep page ──────────────────────────────────

import { renderEisaTimestepEduPage } from '../src/render-edu.mjs';

test('renderEisaTimestepEduPage: emits all four narrative blocks', () => {
  const { project, eisaTimestep } = buildEduFixture();
  const html = renderEisaTimestepEduPage(project, eisaTimestep);
  assert.match(html, /Overview/);
  assert.match(html, /Why it matters/);
  assert.match(html, /Formula/);
  assert.match(html, /Worked/);
});

test('renderEisaTimestepEduPage: shows inputs (storm, timestep, areas, loss model)', () => {
  const { project, eisaTimestep } = buildEduFixture();
  const html = renderEisaTimestepEduPage(project, eisaTimestep);
  assert.ok(html.toLowerCase().includes('scs type ii') || html.includes('SCS Type II'));
  assert.ok(html.includes('horton'));            // loss model used
  assert.ok(html.toLowerCase().includes('timestep') || html.includes('minute'));
});

test('renderEisaTimestepEduPage: shows totals (pre/post/net) and peak intensities', () => {
  const { project, eisaTimestep } = buildEduFixture();
  const html = renderEisaTimestepEduPage(project, eisaTimestep);
  // Fixture peakPost = 0.0397 in/step; totals.postCf ≈ 114 cf
  assert.ok(html.includes('114'));
  assert.ok(html.toLowerCase().includes('peak'));
  assert.ok(html.toLowerCase().includes('total'));
});

test('renderEisaTimestepEduPage: hourly bin table with rain / infil / excess columns', () => {
  const { project, eisaTimestep } = buildEduFixture();
  const html = renderEisaTimestepEduPage(project, eisaTimestep);
  // Hourly aggregated table columns
  assert.ok(html.toLowerCase().includes('hour'));
  assert.ok(html.toLowerCase().includes('rain'));
  assert.ok(html.toLowerCase().includes('infil'));
  assert.ok(html.toLowerCase().includes('excess'));
});

test('renderEisaTimestepEduPage: narrative notes timestep is more conservative than Direct', () => {
  const { project, eisaTimestep } = buildEduFixture();
  const html = renderEisaTimestepEduPage(project, eisaTimestep);
  // "more conservative" is the pedagogy point
  assert.ok(html.toLowerCase().includes('conservative'));
});

test('renderEisaTimestepEduPage: empty trace renders without crashing', () => {
  const html = renderEisaTimestepEduPage(
    { name: 'Empty' },
    { timeSteps: [], areaSf: { pre: 0, post: 0 }, bmpSvCf: 0, bmpSvUsedCf: 0,
      stepMin: 6, peaks: { preIn: 0, postIn: 0, postWithBmpIn: 0 },
      totals: { preCf: 0, postCf: 0, netPostCf: 0 }, lossModelUsed: 'horton' },
  );
  assert.ok(html.includes('EISA'));
});
