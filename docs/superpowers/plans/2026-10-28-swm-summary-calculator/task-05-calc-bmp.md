# Task 05 — Calc engine (BMP sizing)

**Goal:** Add BMP-sizing functions to `src/calc.mjs`: Permeable Pavement Sv, Bioretention/Dry Swale Sv, `rvFromSv` (applies retention multiplier), `maxBmpCredit` (1.7″ cap on CDA), and `treeRetentionCredit`. Each returns the `{ value, steps, units }` trace shape.

**Files:**
- Modify: `summary_calculator/src/calc.mjs`
- Modify: `summary_calculator/tests/calc.test.mjs`

---

- [ ] **Step 1: Append failing tests to `summary_calculator/tests/calc.test.mjs`**

```js
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
```

- [ ] **Step 2: Run tests, expect failure**

```bash
cd summary_calculator
node --test tests/calc.test.mjs
```

Expected: 5 new tests fail (`ppSizingSv is not a function`, etc.).

- [ ] **Step 3: Append to `src/calc.mjs`**

```js
// ─── BMP sizing ──────────────────────────────────────────────────────────────

export function ppSizingSv(sa, dReservoir, nReservoir) {
  const value = sa * dReservoir * nReservoir;
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'Sv = SA × d_reservoir × n_reservoir',
        sub:    `${sa} × ${dReservoir} × ${nReservoir}`,
        eval:   `${sa * dReservoir} × ${nReservoir}`,
        result: value },
    ],
  };
}

export function bioSizingSv(saBot, dMedia, nMedia, dGravel, nGravel, dPond) {
  const inner = dMedia * nMedia + dGravel * nGravel + dPond;
  const value = saBot * inner;
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'Sv = SA_bot (d_media·n_media + d_gravel·n_gravel + d_pond)',
        sub:    `${saBot} (${dMedia}·${nMedia} + ${dGravel}·${nGravel} + ${dPond})`,
        eval:   `${saBot} (${(dMedia*nMedia).toFixed(2)} + ${(dGravel*nGravel).toFixed(2)} + ${dPond})`,
        result: value },
    ],
  };
}

export function rvFromSv(sv, retMultiplier) {
  const value = sv * retMultiplier;
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'Rv = Sv × retention_multiplier',
        sub:    `${sv} × ${retMultiplier}`,
        eval:   `${sv} × ${retMultiplier}`,
        result: value },
    ],
  };
}

export function maxBmpCredit(cdaAreaSf, maxCreditInches = 1.7) {
  const value = cdaAreaSf * maxCreditInches / 12;
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'Max BMP Credit = CDA area × 1.7 / 12',
        sub:    `${cdaAreaSf} × ${maxCreditInches} / 12`,
        eval:   `${(cdaAreaSf * maxCreditInches).toFixed(2)} / 12`,
        result: value },
    ],
  };
}

const TREE_COUNT_KEY = {
  plantedSmall:     'T-1 Small',
  plantedLarge:     'T-1 Large',
  preservedSmall:   'T-2 Small',
  preservedLarge:   'T-2 Large',
  preservedSpecial: 'T-2 Special',
  preservedHeritage:'T-2 Heritage',
};

export function treeRetentionCredit(counts, treeCredits) {
  const lines = [];
  let value = 0;
  for (const [countKey, creditKey] of Object.entries(TREE_COUNT_KEY)) {
    const n = counts[countKey] || 0;
    if (!n) continue;
    const credit = treeCredits[creditKey] || 0;
    value += n * credit;
    lines.push(`${n}×${credit}`);
  }
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'Rv_trees = Σ (count × credit)',
        sub:    lines.join(' + ') || '0',
        eval:   `${value}`,
        result: value },
    ],
  };
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
cd summary_calculator
node --test tests/calc.test.mjs
```

Expected: 15 tests pass (10 ports + 5 new BMP sizing).

- [ ] **Step 5: Commit**

```bash
git add summary_calculator/src/calc.mjs summary_calculator/tests/calc.test.mjs
git commit -m "summary-calculator: add BMP sizing (PP, Bio, Rv, Max Credit, trees)"
```
