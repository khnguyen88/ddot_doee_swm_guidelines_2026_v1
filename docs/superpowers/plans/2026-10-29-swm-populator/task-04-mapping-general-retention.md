# Task 04 — Mapping: General Retention Compliance Calculator

**Goal:** Build `src/mappings/general-retention.mjs` — the declarative cell mapping for the General Retention Compliance Calculator. Covers project header + per-SDA land cover + per-BMP data + per-SDA detention CN. Verified with ~15 golden-cell assertions.

**Files:**
- Create: `populator/src/mappings/general-retention.mjs`
- Create: `populator/tests/mappings/general-retention.test.mjs`

---

- [ ] **Step 1: Investigate the blank**

Open `populator/blanks/general-retention.xlsx` in Excel. On each target sheet, note the exact A1 refs of the **input cells** (white cells per the Calculator's color legend):

- `1. Site Drainage Areas`:
  - Project header block (top): SWMP Number, Site Name, AWDZ, MS4/CSS cells
  - Per-SDA table: find the row where SDA #1 starts (likely row 15 or 17). Columns for: SDA Number, In PROW?, Pre-Nat/Comp/Imp/BMP SF, Post-Nat/Comp/Imp/BMP SF, Vehicular Access SF
- `2. BMP Data`:
  - Per-BMP table start row. Columns for: BMP ID, SDA#, CDA#, BMP Group, Sub-Type, Sv (CF)
- `3. Detention`:
  - Per-SDA CN table start row. Columns for: Pre CN, Post CN, 2-yr Pre Q, 2-yr Post Q, 15-yr Pre Q, 15-yr Post Q

Record every input cell ref. These will populate the `staticCells` and `tables` arrays.

- [ ] **Step 2: Write failing test `populator/tests/mappings/general-retention.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jszipSrc = await readFile(join(__dirname, '..', '..', 'lib', 'jszip.min.js'), 'utf8');
globalThis.JSZip = new Function(jszipSrc + '; return JSZip;')();
const sheetjsSrc = await readFile(join(__dirname, '..', '..', 'lib', 'sheetjs-bundle.js'), 'utf8');
const XLSX = new Function(sheetjsSrc + '; return XLSX;')();

const { applyMapping } = await import('../../src/populate.mjs');
const { openXlsx, readCell } = await import('../../src/xlsx-surgical.mjs');
const { target: mapping } = await import('../../src/mappings/general-retention.mjs');

const fixtureBytes = await readFile(join(__dirname, '..', 'fixtures', 'minnesota-ave.xlsx'));
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const blankBytes = await readFile(join(__dirname, '..', '..', 'blanks', 'general-retention.xlsx'));

const result = await applyMapping(mapping, wb, blankBytes);
const populatedBytes = Buffer.from(await result.blob.arrayBuffer());
const populated = await openXlsx(populatedBytes);

// Load the sheets we'll query so readCell works.
await populated.zip.file(populated.sheetMap['1. Site Drainage Areas']).async('string').then(x => populated.sheetXml['1. Site Drainage Areas'] = x);
await populated.zip.file(populated.sheetMap['2. BMP Data']).async('string').then(x => populated.sheetXml['2. BMP Data'] = x);
await populated.zip.file(populated.sheetMap['3. Detention']).async('string').then(x => populated.sheetXml['3. Detention'] = x);

// Golden-cell assertions. Replace the ref literals below with the actual refs you
// recorded in Step 1 after opening the blank. Values are from the Minnesota Ave sample.
test('project name is in the Site Name cell', () => {
  // Replace B6 with the actual Site Name cell ref from the blank.
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'B6'), 'Minnesota Ave Great Street Test Case');
});

test('SWMP Number is in the correct cell', () => {
  // Replace B5 with actual ref.
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'B5'), 'DTA-ZZZ');
});

test('AWDZ flag is populated', () => {
  // Replace with actual AWDZ cell ref.
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'B7'), 'No');
});

test('SDA #1 row has correct SDA Number', () => {
  // Replace A15 with actual first-data-row ref for the SDA table.
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'A15'), 1);
});

test('SDA #1 In PROW is Yes', () => {
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'B15'), 'Yes');
});

test('SDA #1 Post Impervious SF matches template', () => {
  // Minnesota Ave SDA-1 post impervious = 6910 SF.
  // Replace with the actual Post Impervious column ref.
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'J15'), 6910);
});

test('BMP-02-A Sv is populated', () => {
  // Replace with the actual Sv cell for the first BMP row.
  // Expected Sv for Minnesota Ave BMP-02-A (Bioretention Enhanced, SA=210, dmed=2.0, dgvl=0.5, dpond=0.5):
  //   Sv = 210 × (2.0·0.40 + 0.5·0.40 + 0.5) = 315 CF
  const sv = readCell(populated, '2. BMP Data', 'F10');  // adjust ref
  assert.ok(Math.abs(sv - 315) < 1, `expected ~315, got ${sv}`);
});

test('Detention Pre CN for SDA-1 is populated', () => {
  // SDA-1 is 100% impervious (post), so composite CN should equal 98.
  // Replace with the actual Post CN cell for SDA-1 row.
  const postCn = readCell(populated, '3. Detention', 'C5');  // adjust ref
  assert.ok(Math.abs(postCn - 98) < 0.5, `expected ~98, got ${postCn}`);
});
```

- [ ] **Step 3: Run tests, expect failure** (module not found; all tests fail).

- [ ] **Step 4: Write `populator/src/mappings/general-retention.mjs`**

Based on the cell refs you recorded in Step 1, fill in the mapping. Use the shape documented in the design spec §6.1 and demonstrated in Task 03. Example skeleton:

```js
// src/mappings/general-retention.mjs
export const target = {
  id: 'general-retention',
  filename: 'General Retention Compliance Calculator.xlsx',
  blankVersion: '2021-02-05',
  signatureSheets: ['Compliance Check Summary', '1. Site Drainage Areas', '2. BMP Data', '3. Detention'],

  staticCells: [
    // Replace cell refs below with values from Step 1.
    { sheet: '1. Site Drainage Areas', ref: 'B5', from: 'project.number' },
    { sheet: '1. Site Drainage Areas', ref: 'B6', from: 'project.name' },
    { sheet: '1. Site Drainage Areas', ref: 'B7', from: 'project.awdz' },
    { sheet: '1. Site Drainage Areas', ref: 'B8', from: 'project.ms4' },
  ],

  tables: [
    {
      sheet: '1. Site Drainage Areas',
      firstDataRow: 15,     // replace with actual
      source: 'sdasGroupedBySda',
      columns: [
        { col: 'A', from: 'sdaId' },
        { col: 'B', from: 'inProw' },
        { col: 'C', from: '*derive:preNaturalSf' },
        { col: 'D', from: '*derive:preCompactedSf' },
        { col: 'E', from: '*derive:preImperviousSf' },
        { col: 'F', from: '*derive:preBmpSf' },
        { col: 'G', from: '*derive:postNaturalSf' },
        { col: 'H', from: '*derive:postCompactedSf' },
        { col: 'J', from: '*derive:postImperviousSf' },  // adjust column letter
        { col: 'K', from: '*derive:postBmpSf' },
      ],
    },
    {
      sheet: '2. BMP Data',
      firstDataRow: 10,     // replace with actual
      source: 'bmps',
      columns: [
        { col: 'A', from: 'name' },
        { col: 'B', from: 'sdaId' },
        { col: 'C', from: 'cdaId' },
        { col: 'D', from: 'type' },
        { col: 'E', from: 'subType' },
        { col: 'F', from: '*derive:sv' },
      ],
    },
    {
      sheet: '3. Detention',
      firstDataRow: 5,      // replace with actual
      source: 'sdasGroupedBySda',
      columns: [
        { col: 'A', from: 'sdaId' },
        { col: 'B', from: '*derive:preCn' },
        { col: 'C', from: '*derive:postCn' },
        { col: 'D', from: '*derive:p2PreQ' },
        { col: 'E', from: '*derive:p2PostQ' },
        { col: 'F', from: '*derive:p15PreQ' },
        { col: 'G', from: '*derive:p15PostQ' },
      ],
    },
  ],

  derivations: {
    preNaturalSf:    (row, p) => _sumBy(p.sdas, row.sdaId, 'Natural (Woods)',          'preIn'),
    preCompactedSf:  (row, p) => _sumBy(p.sdas, row.sdaId, 'Compacted (Open Space)',   'preIn'),
    preImperviousSf: (row, p) => _sumByImp(p.sdas, row.sdaId, 'preIn'),
    preBmpSf:        (row, p) => _sumBy(p.sdas, row.sdaId, 'BMP', 'preIn'),
    postNaturalSf:   (row, p) => _sumBy(p.sdas, row.sdaId, 'Natural (Woods)',          'postIn'),
    postCompactedSf: (row, p) => _sumBy(p.sdas, row.sdaId, 'Compacted (Open Space)',   'postIn'),
    postImperviousSf:(row, p) => _sumByImp(p.sdas, row.sdaId, 'postIn'),
    postBmpSf:       (row, p) => _sumBy(p.sdas, row.sdaId, 'BMP', 'postIn'),

    sv: (bmp, p) => _computeSv(bmp, p),

    preCn:    (row, p) => _detentionCn(p, row.sdaId, 'pre'),
    postCn:   (row, p) => _detentionCn(p, row.sdaId, 'post'),
    p2PreQ:   (row, p) => _scsQ(p.params.detention.p2In,  _detentionCn(p, row.sdaId, 'pre')),
    p2PostQ:  (row, p) => _scsQ(p.params.detention.p2In,  _detentionCn(p, row.sdaId, 'post')),
    p15PreQ:  (row, p) => _scsQ(p.params.detention.p15In, _detentionCn(p, row.sdaId, 'pre')),
    p15PostQ: (row, p) => _scsQ(p.params.detention.p15In, _detentionCn(p, row.sdaId, 'post')),
  },
};

// Helpers — kept module-local so the mapping is self-contained.
function _sumBy(sdas, sdaId, landUse, key) {
  return sdas.filter(s => s.sdaId === sdaId && s.landUse === landUse)
             .reduce((n, s) => n + (s[key] || 0), 0);
}
function _sumByImp(sdas, sdaId, key) {
  return sdas.filter(s => s.sdaId === sdaId && (s.landUse === 'Impervious Vehicular' || s.landUse === 'Impervious Non-Vehicular'))
             .reduce((n, s) => n + (s[key] || 0), 0);
}
function _computeSv(bmp, p) {
  if (bmp.type === 'Permeable Pavement' && bmp.pp) {
    const design = p.params.bmpDesign[`Permeable Pavement / ${bmp.subType}`] || { nReservoir: 0.40 };
    return bmp.pp.sa * bmp.pp.dReservoir * design.nReservoir;
  }
  if ((bmp.type === 'Bioretention' || bmp.type === 'Dry Swale') && bmp.bio) {
    const design = p.params.bmpDesign[`${bmp.type} / ${bmp.subType}`] || { nMedia: 0.40, nGravel: 0.40 };
    return bmp.bio.saBot * (bmp.bio.dMedia * design.nMedia + bmp.bio.dGravel * design.nGravel + bmp.bio.dPond);
  }
  return 0;
}
function _detentionCn(p, sdaId, condition) {
  const key = condition + 'In';
  const buckets = { Natural: 0, Compacted: 0, Impervious: 0, BMP: 0 };
  for (const s of p.sdas) {
    if (s.sdaId !== sdaId) continue;
    if (s.landUse === 'Natural (Woods)')          buckets.Natural    += s[key] || 0;
    else if (s.landUse === 'Compacted (Open Space)') buckets.Compacted  += s[key] || 0;
    else if (s.landUse === 'Impervious Vehicular' || s.landUse === 'Impervious Non-Vehicular') buckets.Impervious += s[key] || 0;
    else if (s.landUse === 'BMP')                 buckets.BMP        += s[key] || 0;
  }
  const total = buckets.Natural + buckets.Compacted + buckets.Impervious + buckets.BMP;
  if (total === 0) return 0;
  const cn = p.params.detentionCn;
  return (buckets.Natural*cn.Natural + buckets.Compacted*cn.Compacted + buckets.Impervious*cn.Impervious + buckets.BMP*cn.BMP) / total;
}
function _scsQ(P, cn) {
  if (cn <= 0) return 0;
  const S = 1000/cn - 10;
  if (P <= 0.2 * S) return 0;
  return Math.pow(P - 0.2 * S, 2) / (P + 0.8 * S);
}
```

**Note on `sdasGroupedBySda`:** this `source` doesn't exist on the parsed object. Add it to `populate.mjs` as a derived source (or add handling in the orchestrator), OR change `source: 'sdasGroupedBySda'` to `source: 'uniqueSdaIds'` where `uniqueSdaIds` is a precomputed array. Simpler: add a helper in the mapping file itself:

```js
// Add at top of file:
function _uniqueSdaRows(parsed) {
  const seen = new Set();
  return parsed.sdas.filter(s => seen.has(s.sdaId) ? false : seen.add(s.sdaId));
}
```

Then adapt the orchestrator to allow `source: (parsed) => array`:

- Edit `populate.mjs` `rowsForTable` to also accept a function:
  ```js
  function rowsForTable(table, parsed) {
    if (typeof table.source === 'function') return table.source(parsed);
    const arr = parsed[table.source];
    // ... existing path
  }
  ```
- In mapping, use `source: _uniqueSdaRows`.

- [ ] **Step 5: Run tests, expect pass**

```powershell
Set-Location C:\_AAA\WS_HH\ddot_doee_swm_guidelines_2026_v1\populator
node --test tests/mappings/general-retention.test.mjs
```

Expected: all 8 tests pass. If a test fails because a cell ref was wrong, update the mapping file; if a test fails because the Minnesota Ave fixture doesn't have the expected value, re-check the fixture.

- [ ] **Step 6: Commit**

```bash
git add populator/src/mappings/general-retention.mjs populator/src/populate.mjs populator/tests/mappings/general-retention.test.mjs
git commit -m "populator: General Retention Calculator mapping with per-SDA grouping and Sv derivation"
```
