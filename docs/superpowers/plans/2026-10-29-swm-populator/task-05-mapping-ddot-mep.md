# Task 05 — Mapping: DDOT MEP Worksheet

**Goal:** Build `src/mappings/ddot-mep.mjs` + mapping test. Fills `30% Phase`, `65% Phase`, `90% Phase` sheets based on a user-supplied `phases` option.

**Files:**
- Create: `populator/src/mappings/ddot-mep.mjs`
- Create: `populator/tests/mappings/ddot-mep.test.mjs`

---

- [ ] **Step 1: Investigate the blank**

Open `populator/blanks/ddot-mep.xlsx` in Excel. On the `30% Phase` sheet:

- Project header block (rows ~1-6): Project Name, Project No., MS4/CSS, AWDZ, DOEE Plan Review No., Disturbance Area (ac), No. of Drainage Areas
- Per-drainage-area table: find the row where DA #1 starts (likely row 11 based on the 464-row sheet size). Columns for: DA ID, Impervious within LOD, Compacted within LOD, Natural within LOD, Total within LOD, Impervious outside LOD, Compacted outside LOD, Natural outside LOD, Regulated Vol, Target Vol
- Bio opportunity (SF), PP opportunity (SF), Max Bio Sv, Max PP Sv
- Tree counts: planted small/large, preserved small/large/special/heritage

The `65% Phase` and `90% Phase` sheets have the same layout plus additional columns (BMP sizing details). Record all input refs.

- [ ] **Step 2: Follow the Task 04 pattern — write mapping + test**

Same structure as `general-retention.mjs`. Mapping options support a `phases` array:

```js
export const target = {
  id: 'ddot-mep',
  filename: 'DDOT MEP Worksheet.xlsx',
  blankVersion: '2019-01',
  signatureSheets: ['30% Phase'],

  // Static cells + tables generated dynamically from `options.phases`.
  build(options) {
    const phases = options?.phases ?? ['30% Phase'];
    const staticCells = [];
    const tables = [];
    for (const phase of phases) {
      staticCells.push(
        { sheet: phase, ref: 'B2', from: 'project.name' },   // adjust refs
        { sheet: phase, ref: 'B3', from: 'project.number' },
        // ...
      );
      tables.push({
        sheet: phase,
        firstDataRow: 11,       // adjust
        source: 'sdas',
        columns: [ /* adjust from Step 1 inspection */ ],
      });
    }
    return { staticCells, tables };
  },

  derivations: { /* ... */ },
};
```

**Important**: the orchestrator's `applyMapping` currently uses `mapping.staticCells` / `mapping.tables` directly. Update `populate.mjs` to also support `mapping.build(options)` — if present, merge the result into the mapping before applying. Add this at the top of `applyMapping`:

```js
let effective = mapping;
if (typeof mapping.build === 'function') {
  const built = mapping.build(options);
  effective = { ...mapping, ...built };
}
// then use `effective.staticCells` and `effective.tables` below
```

Also plumb `options` through `populateAll` → `applyMapping`.

- [ ] **Step 3: Test — golden cells on 30% Phase only (default)**

```js
test('ddot-mep: 30% Phase gets Project Name', async () => {
  const result = await applyMapping(mapping, wb, blankBytes);
  // readCell on populated bytes
  assert.equal(valueOf(result, '30% Phase', 'B2'), 'Minnesota Ave Great Street Test Case');
});

test('ddot-mep: 65% Phase stays blank when not requested', async () => {
  const result = await applyMapping(mapping, wb, blankBytes, { phases: ['30% Phase'] });
  // Project Name on 65% Phase should still be empty (or whatever the blank had).
  assert.notEqual(valueOf(result, '65% Phase', 'B2'), 'Minnesota Ave Great Street Test Case');
});
```

- [ ] **Step 4: Commit**

```bash
git add populator/src/mappings/ddot-mep.mjs populator/src/populate.mjs populator/tests/mappings/ddot-mep.test.mjs
git commit -m "populator: DDOT MEP Worksheet mapping with user-selected phases"
```
