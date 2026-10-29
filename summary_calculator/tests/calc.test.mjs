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
