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

test('bioSizingSv: vertical-wall (saPondTop=null) SA_bot × (d_media·n_media + d_gravel·n_gravel + d_pond)', () => {
  const r = bioSizingSv(210, 210, null, 2.0, 0.40, 0.5, 0.40, 0.5);
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

test('tr55VolumeTraceCf: emits a formatted top-level steps[0] with TR-55 formula', () => {
  const result = tr55VolumeTraceCf([
    { area: 1000, landUse: 'Impervious Vehicular', hsg: 'D' },
  ], 1.7);
  assert.ok(Array.isArray(result.steps));
  assert.ok(result.steps[0].expr.includes('TR-55'));
});

import {
  bioSizingSv as bioSizingSvNew, drySwaleSizingSv, bioFreeboardFt, drySwaleFreeboardFt,
} from '../src/calc.mjs';

// ─── bioSizingSv — new signature ─────────────────────────────────────────────

test('bioSizingSv: vertical-wall fallback when saPondTop is null', () => {
  const r = bioSizingSvNew(210, 210, null, 2.0, 0.40, 0.5, 0.40, 0.5);
  // media_gravel = 210 × (2.0 × 0.40 + 0.5 × 0.40) = 210 × 1.0 = 210
  // pond (fallback) = 210 × 0.5 = 105
  // total = 315
  assert.equal(r.value, 315);
  assert.equal(r.pondModel, 'vertical');
  assert.equal(r.components.mediaGravelSv, 210);
  assert.equal(r.components.pondSv, 105);
});

test('bioSizingSv: trapezoid pond when saPondTop provided', () => {
  const r = bioSizingSvNew(210, 210, 294, 2.0, 0.40, 0.5, 0.40, 0.5);
  // media_gravel = 210 (as above)
  // pond (trapezoid) = 0.5 × (210 + 294) × 0.5 = 126
  // total = 336
  assert.equal(r.value, 336);
  assert.equal(r.pondModel, 'trapezoid');
  assert.equal(r.components.pondSv, 126);
});

test('bioSizingSv: trapezoid collapses to vertical when saPondTop === saTop', () => {
  const r = bioSizingSvNew(210, 210, 210, 2.0, 0.40, 0.5, 0.40, 0.5);
  // pond (trapezoid) = 0.5 × (210 + 210) × 0.5 = 105 — same as vertical
  assert.equal(r.components.pondSv, 105);
});

// ─── drySwaleSizingSv — new ───────────────────────────────────────────────────

test('drySwaleSizingSv: full geometry → wedge pond', () => {
  const r = drySwaleSizingSv({
    saBot: 400, dMedia: 2.0, nMedia: 0.40, dGravel: 0.5, nGravel: 0.40, dPond: 1.0,
    length: 100, bottomWidth: 4, invUs: 100.0, invDs: 98.0,
    checkDamHeight: 1.0, checkDamSpacing: 50,
  });
  // slope = (100 - 98)/100 = 0.02
  // fullWedgeBase = 1.0 / 0.02 = 50
  // effectiveBase = min(50, 50) = 50
  // wedgePerDam = 0.5 × 50 × 1.0 × 4 = 100
  // nDams = floor(100 / 50) = 2
  // pond = 2 × 100 = 200
  // media_gravel = 400 × (2.0×0.40 + 0.5×0.40) = 400 × 1.0 = 400
  // total = 600
  assert.equal(r.value, 600);
  assert.equal(r.pondModel, 'wedge');
  assert.equal(r.components.pondSv, 200);
  assert.equal(r.pondTrace.nDams, 2);
  assert.equal(r.pondTrace.wedgePerDam, 100);
});

test('drySwaleSizingSv: wedge capped at H/S when spacing exceeds it', () => {
  const r = drySwaleSizingSv({
    saBot: 400, dMedia: 2.0, nMedia: 0.40, dGravel: 0.5, nGravel: 0.40, dPond: 1.0,
    length: 200, bottomWidth: 4, invUs: 100.0, invDs: 98.0,
    checkDamHeight: 0.5, checkDamSpacing: 100,  // H/S = 0.5/0.01 = 50 < 100 spacing
  });
  // slope = 0.01, fullWedgeBase = 50, effectiveBase = min(100, 50) = 50
  // wedgePerDam = 0.5 × 50 × 0.5 × 4 = 50
  // nDams = 2
  // pond = 100
  assert.equal(r.components.pondSv, 100);
  assert.equal(r.pondTrace.effectiveBase, 50);
});

test('drySwaleSizingSv: spacing < H/S truncates wedge', () => {
  const r = drySwaleSizingSv({
    saBot: 400, dMedia: 2.0, nMedia: 0.40, dGravel: 0.5, nGravel: 0.40, dPond: 1.0,
    length: 100, bottomWidth: 4, invUs: 100.0, invDs: 98.0,
    checkDamHeight: 2.0, checkDamSpacing: 25,  // H/S = 2/0.02 = 100 > 25 spacing
  });
  // slope = 0.02, fullWedgeBase = 100, effectiveBase = min(25, 100) = 25
  // wedgePerDam = 0.5 × 25 × 2.0 × 4 = 100
  // nDams = floor(100/25) = 4
  // pond = 400
  assert.equal(r.components.pondSv, 400);
  assert.equal(r.pondTrace.effectiveBase, 25);
});

test('drySwaleSizingSv: missing geometry → flat-pond fallback', () => {
  const r = drySwaleSizingSv({
    saBot: 400, dMedia: 2.0, nMedia: 0.40, dGravel: 0.5, nGravel: 0.40, dPond: 1.0,
    length: null, bottomWidth: null, invUs: null, invDs: null,
    checkDamHeight: null, checkDamSpacing: null,
  });
  // pond fallback = 400 × 1.0 = 400
  assert.equal(r.components.pondSv, 400);
  assert.equal(r.pondModel, 'flat-fallback');
});

test('drySwaleSizingSv: zero slope does not divide-by-zero', () => {
  const r = drySwaleSizingSv({
    saBot: 400, dMedia: 2.0, nMedia: 0.40, dGravel: 0.5, nGravel: 0.40, dPond: 1.0,
    length: 100, bottomWidth: 4, invUs: 100.0, invDs: 100.0,  // flat → slope 0
    checkDamHeight: 1.0, checkDamSpacing: 50,
  });
  // slope guarded at 1e-6, fullWedgeBase = 1e6 → effectiveBase = min(50, 1e6) = 50
  // wedge = 0.5 × 50 × 1.0 × 4 = 100, nDams = 2, pond = 200
  assert.equal(r.components.pondSv, 200);
});

// ─── Freeboard helpers ───────────────────────────────────────────────────────

test('bioFreeboardFt: computes min(containment) − design water surface', () => {
  const fb = bioFreeboardFt({
    topElev: 100.0, dPond: 0.5,
    overflowElev: 100.75, sidewalkElev: 100.80, curbCutElev: null,
  });
  // design WS = 100.5; min containment = min(100.75, 100.80) = 100.75; fb = 0.25
  assert.equal(fb, 0.25);
});

test('bioFreeboardFt: returns null when any critical input missing', () => {
  assert.equal(bioFreeboardFt({ topElev: null, dPond: 0.5,
    overflowElev: 100.75, sidewalkElev: null, curbCutElev: null }), null);
  assert.equal(bioFreeboardFt({ topElev: 100.0, dPond: null,
    overflowElev: 100.75, sidewalkElev: null, curbCutElev: null }), null);
  assert.equal(bioFreeboardFt({ topElev: 100.0, dPond: 0.5,
    overflowElev: null, sidewalkElev: null, curbCutElev: null }), null);
});

test('drySwaleFreeboardFt: min of US/DS freeboard', () => {
  const fb = drySwaleFreeboardFt({
    invUs: 100.0, invDs: 98.0, topUs: 102.0, topDs: 100.0, checkDamHeight: 1.0,
  });
  // US ws = 101.0, DS ws = 99.0; US fb = 1.0, DS fb = 1.0; min = 1.0
  assert.equal(fb, 1.0);
});

test('drySwaleFreeboardFt: returns null when any input missing', () => {
  assert.equal(drySwaleFreeboardFt({
    invUs: 100.0, invDs: null, topUs: 102.0, topDs: 100.0, checkDamHeight: 1.0,
  }), null);
});
