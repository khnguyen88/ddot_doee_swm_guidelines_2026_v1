# Task 04 — Calc engine (ported from calculations.py)

**Goal:** Create `src/calc.mjs` with JS equivalents of `workbook/calculations.py`: SWRv, TR-55 runoff, Horton infiltration loss, and EISA direct runoff. Every function returns `{ value, steps, units }` so the renderer can walk `steps[]`.

**Files:**
- Create: `summary_calculator/src/calc.mjs`
- Create: `summary_calculator/tests/calc.test.mjs`

---

- [ ] **Step 1: Write failing test `summary_calculator/tests/calc.test.mjs`**

```js
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
```

- [ ] **Step 2: Run tests, expect failure**

```bash
cd summary_calculator
node --test tests/calc.test.mjs
```

Expected: all tests fail — module not found.

- [ ] **Step 3: Write `src/calc.mjs`**

```js
// src/calc.mjs — pure calculation engine. Mirrors workbook/calculations.py.
// All volumes in cubic feet (CF), depths in inches, areas in square feet.

export const RV = {
  'Impervious Vehicular':     0.95,
  'Impervious Non-Vehicular': 0.95,
  'Compacted (Open Space)':   0.25,
  'Natural (Woods)':          0.00,
  'BMP':                      0.00,
};

export const CN = {
  'Impervious Vehicular':     { A: 98, B: 98, C: 98, D: 98 },
  'Impervious Non-Vehicular': { A: 98, B: 98, C: 98, D: 98 },
  'BMP':                      { A: 98, B: 98, C: 98, D: 98 },
  'Natural (Woods)':          { A: 25, B: 55, C: 70, D: 77 },
  'Compacted (Open Space)':   { A: 39, B: 61, C: 74, D: 80 },
};

const HORTON = {
  B: { fMax: 5.0, fMin: 0.3, k: 2.0 },
  C: { fMax: 3.0, fMin: 0.1, k: 3.5 },
};

const DEPRESSION_IMPERVIOUS = 0.1;
const DEPRESSION_PERVIOUS   = 0.2;

const IMPERVIOUS_LAND_USES = new Set([
  'Impervious Vehicular', 'Impervious Non-Vehicular', 'BMP',
]);

// ─── Formatting helpers ──────────────────────────────────────────────────────
const fmt = (n, places = 2) => {
  if (n === 0) return '0';
  if (Math.abs(n) < 0.01 && n !== 0) return n.toExponential(2);
  return n.toFixed(places).replace(/\.?0+$/, '');
};

// ─── SWRv ────────────────────────────────────────────────────────────────────
export function swrvVolume(areas, rainfallIn) {
  const terms = [
    { name: 'Imp Veh',     area: areas.impVeh    || 0, rv: RV['Impervious Vehicular'] },
    { name: 'Imp Non-Veh', area: areas.impNonVeh || 0, rv: RV['Impervious Non-Vehicular'] },
    { name: 'Compacted',   area: areas.comp      || 0, rv: RV['Compacted (Open Space)'] },
    { name: 'Natural',     area: areas.natural   || 0, rv: RV['Natural (Woods)'] },
    { name: 'BMP',         area: areas.bmp       || 0, rv: RV['BMP'] },
  ];
  const sumAR = terms.reduce((s, t) => s + t.area * t.rv, 0);
  const value = sumAR * rainfallIn / 12.0;
  const subTerms = terms
    .filter(t => t.area > 0)
    .map(t => `${t.area}·${t.rv}`)
    .join(' + ') || '0';
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'SWRv = (P / 12) × Σ(A_i · Rv_i)',
        sub:    `(${rainfallIn} / 12) × (${subTerms})`,
        eval:   `${fmt(rainfallIn / 12, 4)} × ${fmt(sumAR)}`,
        result: value },
    ],
  };
}

// ─── TR-55 runoff ────────────────────────────────────────────────────────────
export function tr55RunoffDepth(P, cn) {
  if (cn <= 0) return 0;
  const S = 1000 / cn - 10;
  const Ia = 0.2 * S;
  if (P <= Ia) return 0;
  return (P - Ia) ** 2 / (P - Ia + S);
}

export function tr55RunoffVolumeCf(areaSf, P, cn) {
  return areaSf * tr55RunoffDepth(P, cn) / 12;
}

export function tr55TotalVolumeCf(rows, P) {
  let total = 0;
  for (const [area, landUse, hsg] of rows) {
    const row = CN[landUse];
    if (!row || row[hsg] == null) {
      throw new Error(`No CN entry for ('${landUse}', '${hsg}')`);
    }
    total += tr55RunoffVolumeCf(area, P, row[hsg]);
  }
  return total;
}

// ─── Horton infiltration (closed form) ───────────────────────────────────────
export function hortonInfilLoss(fMax, fMin, k, T = 24) {
  return fMin * T + (fMax - fMin) / k * (1 - Math.exp(-k * T));
}

export const HORTON_INFIL_LOSS_B = hortonInfilLoss(HORTON.B.fMax, HORTON.B.fMin, HORTON.B.k, 24);
export const HORTON_INFIL_LOSS_C = hortonInfilLoss(HORTON.C.fMax, HORTON.C.fMin, HORTON.C.k, 24);

// ─── EISA Direct Determination ───────────────────────────────────────────────
export function eisaDirectRunoffDepth(landUse, hsg, P) {
  if (IMPERVIOUS_LAND_USES.has(landUse)) {
    return Math.max(0, P - DEPRESSION_IMPERVIOUS);
  }
  if (hsg === 'A') return 0;
  if (hsg === 'B') return Math.max(0, P - DEPRESSION_PERVIOUS - HORTON_INFIL_LOSS_B);
  if (hsg === 'C') return Math.max(0, P - DEPRESSION_PERVIOUS - HORTON_INFIL_LOSS_C);
  if (hsg === 'D') return Math.max(0, P - DEPRESSION_PERVIOUS);
  throw new Error(`Unknown HSG: ${hsg}`);
}

export function eisaDirectTotalVolumeCf(rows, P) {
  let total = 0;
  for (const [area, landUse, hsg] of rows) {
    total += area * eisaDirectRunoffDepth(landUse, hsg, P) / 12;
  }
  return total;
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
cd summary_calculator
node --test tests/calc.test.mjs
```

Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add summary_calculator/src/calc.mjs summary_calculator/tests/calc.test.mjs
git commit -m "summary-calculator: port SWRv, TR-55, Horton, EISA Direct from calculations.py"
```
