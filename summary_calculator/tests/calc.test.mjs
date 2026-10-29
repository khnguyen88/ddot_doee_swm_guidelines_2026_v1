import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RV, CN,
  swrvVolume,
  tr55RunoffDepth,
  tr55RunoffVolumeCf,
  tr55TotalVolumeCf,
  hortonInfilLoss,
  HORTON_INFIL_LOSS_B,
  HORTON_INFIL_LOSS_C,
  eisaDirectRunoffDepth,
  eisaDirectTotalVolumeCf,
} from '../src/calc.mjs';

const approx = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) < tol, `${a} !≈ ${b} (tol ${tol})`);

test('RV constants mirror calculations.py', () => {
  assert.equal(RV['Impervious Vehicular'], 0.95);
  assert.equal(RV['Natural (Woods)'], 0.00);
  assert.equal(RV['BMP'], 0.00);
});

test('CN table mirrors calculations.py', () => {
  assert.equal(CN['Natural (Woods)'].D, 77);
  assert.equal(CN['Compacted (Open Space)'].B, 61);
  assert.equal(CN['Impervious Vehicular'].A, 98);
});

test('swrvVolume returns value and trace', () => {
  const r = swrvVolume({ impVeh: 1000, impNonVeh: 0, comp: 0, natural: 0, bmp: 0 }, 1.2);
  // 1000 × 0.95 × 1.2 / 12 = 95 CF
  approx(r.value, 95);
  assert.equal(r.units, 'cf');
  assert.ok(r.steps.length >= 1);
});

test('tr55RunoffDepth: Q=0 when P ≤ 0.2S', () => {
  // CN=98 → S≈0.204 → 0.2S≈0.041. P=0.03 → Q=0.
  const q = tr55RunoffDepth(0.03, 98);
  approx(q, 0);
});

test('tr55RunoffDepth: known value for P=1.7, CN=98', () => {
  const q = tr55RunoffDepth(1.7, 98);
  // S = 1000/98 - 10 = 0.2041
  // Q = (1.7 - 0.0408)² / (1.7 + 0.1633) = 2.7514 / 1.8633 ≈ 1.4766
  approx(q, 1.4766, 1e-3);
});

test('tr55TotalVolumeCf: throws on unknown land use/HSG', () => {
  assert.throws(
    () => tr55TotalVolumeCf([[100, 'Nonexistent', 'B']], 1.7),
    /No CN entry/,
  );
});

test('hortonInfilLoss closed-form matches HORTON_INFIL_LOSS_B', () => {
  // From calculations.py: HORTON_INFIL_LOSS_B uses f_max=5.0, f_min=0.3, k=2.0, T=24
  const loss = hortonInfilLoss(5.0, 0.3, 2.0, 24);
  approx(loss, HORTON_INFIL_LOSS_B);
  // Known value: 0.3*24 + (5.0-0.3)/2.0 * (1 - exp(-2*24)) ≈ 7.2 + 2.35 = 9.55 in
  approx(loss, 9.55, 0.01);
});

test('eisaDirectRunoffDepth: impervious loses only depression', () => {
  // Impervious: P - 0.1 depression
  approx(eisaDirectRunoffDepth('Impervious Vehicular', 'C', 1.7), 1.6);
});

test('eisaDirectRunoffDepth: HSG A pervious → 0', () => {
  approx(eisaDirectRunoffDepth('Natural (Woods)', 'A', 1.7), 0);
});

test('eisaDirectTotalVolumeCf aggregates rows', () => {
  const rows = [
    [1000, 'Impervious Vehicular', 'C'],  // 1000 × 1.6 / 12 = 133.33 CF
    [500, 'Natural (Woods)', 'A'],         // 500 × 0 = 0 CF
  ];
  const v = eisaDirectTotalVolumeCf(rows, 1.7);
  approx(v, 133.333, 1e-2);
});

import {
  ppSizingSv,
  bioSizingSv,
  rvFromSv,
  maxBmpCredit,
  treeRetentionCredit,
} from '../src/calc.mjs';

test('ppSizingSv: SA × d_reservoir × n_reservoir', () => {
  const r = ppSizingSv(150, 1.0, 0.40);
  // 150 × 1.0 × 0.40 = 60 CF
  approx(r.value, 60);
  assert.ok(r.steps.length >= 1);
  assert.equal(r.units, 'cf');
});

test('bioSizingSv: SA_bot (d_media·n_media + d_gravel·n_gravel + d_pond)', () => {
  const r = bioSizingSv(210, 2.0, 0.40, 0.5, 0.40, 0.5);
  // 210 × (2.0·0.40 + 0.5·0.40 + 0.5) = 210 × 1.5 = 315 CF
  approx(r.value, 315);
});

test('rvFromSv: applies retention multiplier', () => {
  const r = rvFromSv(252, 1.0);  // Enhanced bio multiplier = 1.0
  approx(r.value, 252);
  const r2 = rvFromSv(252, 0.6);  // Standard bio multiplier = 0.6
  approx(r2.value, 151.2, 1e-3);
});

test('maxBmpCredit: 1.7 inches × CDA area / 12', () => {
  const r = maxBmpCredit(10000);
  // 10000 × 1.7 / 12 = 1416.67 CF
  approx(r.value, 1416.667, 1e-2);
});

test('treeRetentionCredit sums per PARAMS_Trees table', () => {
  const credits = {
    'T-1 Small': 5, 'T-1 Large': 10,
    'T-2 Small': 10, 'T-2 Large': 20, 'T-2 Special': 30, 'T-2 Heritage': 40,
  };
  const counts = { plantedSmall: 1, plantedLarge: 2, preservedLarge: 3 };
  const r = treeRetentionCredit(counts, credits);
  // 1×5 + 2×10 + 3×20 = 85 CF
  approx(r.value, 85);
});

import {
  compositeCn,
  scsRunoffDepth,
  detentionSummary,
  siteAggregateLandCover,
  siteSwrv,
} from '../src/calc.mjs';

test('compositeCn: area-weighted', () => {
  // 1000 sf Impervious (CN 98) + 1000 sf Natural (CN 70) → (98+70)/2 = 84
  const r = compositeCn(
    { Natural: 1000, Compacted: 0, Impervious: 1000, BMP: 0 },
    { Natural: 70, Compacted: 74, Impervious: 98, BMP: 98 },
  );
  approx(r.value, 84);
});

test('compositeCn: zero area returns 0', () => {
  const r = compositeCn(
    { Natural: 0, Compacted: 0, Impervious: 0, BMP: 0 },
    { Natural: 70, Compacted: 74, Impervious: 98, BMP: 98 },
  );
  approx(r.value, 0);
});

test('scsRunoffDepth alias == tr55RunoffDepth', () => {
  approx(scsRunoffDepth(3.14, 98), tr55RunoffDepth(3.14, 98), 1e-9);
});

test('detentionSummary: flags SDAs where post Q > pre Q', () => {
  const sdas = [
    { sdaId: 'SDA-1',
      pre:  { Natural: 1000, Compacted: 0, Impervious: 0,    BMP: 0 },
      post: { Natural: 0,    Compacted: 0, Impervious: 1000, BMP: 0 } },
    { sdaId: 'SDA-2',
      pre:  { Natural: 1000, Compacted: 0, Impervious: 0, BMP: 0 },
      post: { Natural: 1000, Compacted: 0, Impervious: 0, BMP: 0 } },
  ];
  const detentionCn = { Natural: 70, Compacted: 74, Impervious: 98, BMP: 98 };
  const r = detentionSummary(sdas, 3.14, 5.23, detentionCn);
  assert.equal(r.anyRequired, true);
  const sda1 = r.perSda[0];
  assert.equal(sda1.sdaId, 'SDA-1');
  assert.equal(sda1.p2Required, true);
  assert.equal(sda1.p15Required, true);
  const sda2 = r.perSda[1];
  assert.equal(sda2.p2Required, false);
  assert.equal(sda2.p15Required, false);
});

test('siteAggregateLandCover: sums across SDAs', () => {
  const sdas = [
    { landUse: 'Impervious Vehicular', preIn: 1000, postIn: 1200 },
    { landUse: 'Natural (Woods)',      preIn: 500,  postIn: 300 },
    { landUse: 'Impervious Vehicular', preIn: 200,  postIn: 400 },
  ];
  const r = siteAggregateLandCover(sdas);
  assert.equal(r.pre.impervious, 1200);
  assert.equal(r.pre.natural, 500);
  assert.equal(r.post.impervious, 1600);
  assert.equal(r.post.natural, 300);
});

test('siteSwrv: sum of per-SDA SWRv_req (informational)', () => {
  const sdas = [
    { sdaId: 'SDA-1', landUse: 'Impervious Vehicular', postIn: 1000 },
    { sdaId: 'SDA-2', landUse: 'Impervious Vehicular', postIn: 2000 },
  ];
  const r = siteSwrv(sdas, 1.2, { rv: { 'Impervious Vehicular': 0.95 } });
  // (1000+2000) × 0.95 × 1.2 / 12 = 285 CF
  approx(r.value, 285);
});

import { eisaDirectVolumeTraceCf, tr55VolumeTraceCf } from '../src/calc.mjs';

test('eisaDirectVolumeTraceCf: perRow entries + totals match scalar engine', () => {
  const rows = [
    { area: 1000, landUse: 'Impervious Vehicular', hsg: 'D' },
    { area: 2000, landUse: 'Natural (Woods)',      hsg: 'B' },
  ];
  const result = eisaDirectVolumeTraceCf(rows, 1.7);
  assert.equal(result.perRow.length, 2);
  // Impervious: depth = 1.7 - 0.1 = 1.6 in; volume = 1000 * 1.6 / 12 ≈ 133.33 cf
  assert.ok(Math.abs(result.perRow[0].volumeCf - 1000 * 1.6 / 12) < 0.01);
  // Natural HSG B: depth = max(0, 1.7 - 0.2 - Horton_B); Horton_B dominates so depth = 0.
  assert.equal(result.perRow[1].volumeCf, 0);
  const expectedTotal = result.perRow.reduce((s, r) => s + r.volumeCf, 0);
  assert.ok(Math.abs(result.value - expectedTotal) < 0.001);
  assert.equal(result.units, 'cf');
});

test('tr55VolumeTraceCf: perRow entries carry CN and total volume matches scalar', () => {
  const rows = [
    { area: 1000, landUse: 'Impervious Vehicular', hsg: 'D' },
    { area: 2000, landUse: 'Natural (Woods)',      hsg: 'C' },
  ];
  const result = tr55VolumeTraceCf(rows, 1.7);
  assert.equal(result.perRow.length, 2);
  assert.equal(result.perRow[0].cn, 98);
  assert.equal(result.perRow[1].cn, 70);
  const expectedTotal = result.perRow.reduce((s, r) => s + r.volumeCf, 0);
  assert.ok(Math.abs(result.value - expectedTotal) < 0.001);
  assert.equal(result.units, 'cf');
});

test('eisaDirectVolumeTraceCf: emits a formatted top-level steps[0] for renderTrace', () => {
  const result = eisaDirectVolumeTraceCf([
    { area: 1000, landUse: 'Impervious Vehicular', hsg: 'D' },
  ], 1.7);
  assert.ok(Array.isArray(result.steps));
  assert.ok(result.steps[0].expr.includes('depth'));
});
