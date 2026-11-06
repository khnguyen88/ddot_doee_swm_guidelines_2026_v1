# Task 07 — Mapping: SWMP-BMP Calc

**Goal:** Build `src/mappings/swmp-bmp-calc.mjs` + mapping test. Each per-BMP-type tab (`3.5 Permeable Pavement`, `3.6 Bioretention`, `3.9 O-2 Dry Swale`, `3.14 Tree Planting Preservation`) is filled with the **first BMP of that type** in the template. Additional BMPs of the same type surface a warning on the result.

**Files:**
- Create: `populator/src/mappings/swmp-bmp-calc.mjs`
- Create: `populator/tests/mappings/swmp-bmp-calc.test.mjs`

---

- [ ] **Step 1: Investigate the blank**

Open `populator/blanks/swmp-bmp-calc.xlsm`. For each BMP-type tab we'll support, find the input cells:

- `3.5 Permeable Pavement`: SA, d_reservoir, n_reservoir dropdown, Sub-Type dropdown
- `3.6 Bioretention`: SA_top, SA_bot, d_media, d_gravel, d_pond, Sub-Type dropdown
- `3.9 O-2 Dry Swale`: Same as Bioretention
- `3.14 Tree Planting Preservation`: counts for planted/preserved small/large/special/heritage

Record input refs.

**Not populated** (deferred): `3.2 Green Roof`, `3.3 Rainwater Harvesting`, `3.4 Impervious Surface Discon.`, `3.8 Infiltration`, `3.9 O-1 Grass Channel`, `3.9 O-3 Wet Swale`, `3.10, 3.11 SW Ponds + Wetlands`. These BMP types don't appear in the template's `bmps` array.

- [ ] **Step 2: Write mapping with per-type first-BMP selection**

```js
export const target = {
  id: 'swmp-bmp-calc',
  filename: 'SWMP-BMP Calc Spreadsheet.xlsm',
  blankVersion: '2020-11-25',
  signatureSheets: ['3.5 Permeable Pavement', '3.6 Bioretention', '3.14 Tree Planting Preservation'],

  build(parsed) {
    const staticCells = [];
    const warnings = [];
    const bmpsByType = {};
    for (const bmp of parsed.bmps) {
      (bmpsByType[bmp.type] ??= []).push(bmp);
    }

    const typeToSheet = {
      'Permeable Pavement': '3.5 Permeable Pavement',
      'Bioretention':       '3.6 Bioretention',
      'Dry Swale':          '3.9 O-2 Dry Swale',
      'Planted Trees':      '3.14 Tree Planting Preservation',
      'Preserve Trees':     '3.14 Tree Planting Preservation',
    };

    for (const [type, bmps] of Object.entries(bmpsByType)) {
      const sheet = typeToSheet[type];
      if (!sheet) continue;
      const first = bmps[0];
      if (bmps.length > 1) {
        warnings.push(`${type}: filled only ${first.name}; template has ${bmps.length} ${type} BMPs.`);
      }
      // Push cells for this BMP into staticCells. Refs vary per sheet.
      if (type === 'Permeable Pavement') {
        staticCells.push(
          { sheet, ref: 'C8',  value: first.pp.sa },           // adjust refs
          { sheet, ref: 'C9',  value: first.pp.dReservoir },
          { sheet, ref: 'C10', value: first.subType },
        );
      }
      // ... similar for Bioretention / Dry Swale / Trees
    }
    return { staticCells, tables: [], warnings };
  },
};
```

Note: `staticCells` here uses `value:` (literal) rather than `from:`. Extend `populate.mjs` `applyMapping` to accept both — if `value` is present, use it directly; otherwise fall back to `from` resolution.

- [ ] **Step 3: Tests — assert first-BMP values + warnings**

```js
test('Bioretention sheet gets BMP-02-A inputs', () => {
  assert.equal(valueOf(result, '3.6 Bioretention', 'C8'), 210);     // SA_bot
  assert.equal(valueOf(result, '3.6 Bioretention', 'C9'), 2.0);     // d_media
});

test('warnings surface additional BMPs not filled', () => {
  // Minnesota Ave has 5 Bioretention BMPs; expect a warning naming the count.
  assert.ok(result.warnings.some(w => w.includes('Bioretention') && w.includes('5')));
});
```

- [ ] **Step 4: Commit**

```bash
git add populator/src/mappings/swmp-bmp-calc.mjs populator/src/populate.mjs populator/tests/mappings/swmp-bmp-calc.test.mjs
git commit -m "populator: SWMP-BMP Calc mapping (first BMP per type, warns on additional)"
```
