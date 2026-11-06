# Task 08 — Mapping: Rainwater Harvesting (skip-if-no-RWH)

**Goal:** Build `src/mappings/rainwater-harvesting.mjs` + mapping test. The template doesn't carry RWH BMP inputs, so this mapping defines a `skipIf` predicate that signals skip when no RWH BMP is present.

**Files:**
- Create: `populator/src/mappings/rainwater-harvesting.mjs`
- Create: `populator/tests/mappings/rainwater-harvesting.test.mjs`

---

- [ ] **Step 1: Write mapping**

```js
export const target = {
  id: 'rainwater-harvesting',
  filename: 'Rainwater Harvesting Storage Volume Calculator.xlsx',
  blankVersion: '2026-05-07',
  signatureSheets: ['Input'],

  // If the template has no Rainwater Harvesting BMPs, skip this target entirely.
  skipIf(parsed) {
    const hasRwh = parsed.bmps.some(b => b.type === 'Rainwater Harvesting');
    return hasRwh ? null : 'No Rainwater Harvesting BMPs in template.';
  },

  // Even if an RWH BMP exists, the template doesn't carry cistern inputs
  // (CDA, demand, filter efficiency). Fill project header only.
  staticCells: [
    { sheet: 'Input', ref: 'B2', from: 'project.name' },     // adjust ref
    { sheet: 'Input', ref: 'B3', from: 'project.number' },   // adjust ref
  ],
  tables: [],
  derivations: {},
};
```

- [ ] **Step 2: Test — Minnesota Ave fixture has no RWH, so skipping is expected**

```js
import { populateAll } from '../../src/populate.mjs';
import { target as rwhMapping } from '../../src/mappings/rainwater-harvesting.mjs';

test('rainwater-harvesting: skipped on Minnesota Ave fixture (no RWH BMPs)', async () => {
  const results = await populateAll(wb, {
    mappings: [rwhMapping],
    blanks: { 'rainwater-harvesting': await readFile(join(__dirname, '..', '..', 'blanks', 'rainwater-harvesting.xlsx')) },
  });
  assert.equal(results.outputs.length, 0);
  assert.equal(results.skipped.length, 1);
  assert.match(results.skipped[0].reason, /no rainwater harvesting/i);
});

test('rainwater-harvesting: fills project header when an RWH BMP is present', async () => {
  // Synthesize a parsed object with one RWH BMP.
  const parsed = {
    project: { name: 'Test', number: 'DTA-X' },
    sdas: [], cdas: [],
    bmps: [{ name: 'BMP-01-RWH', sdaId: 'SDA-1', type: 'Rainwater Harvesting' }],
    params: {},
  };
  const result = await applyMapping(rwhMapping, parsed, await readFile(/* ... */));
  // Assert project name landed in B2 (or wherever).
});
```

- [ ] **Step 3: Commit**

```bash
git add populator/src/mappings/rainwater-harvesting.mjs populator/tests/mappings/rainwater-harvesting.test.mjs
git commit -m "populator: Rainwater Harvesting mapping with skip-if-no-RWH predicate"
```
