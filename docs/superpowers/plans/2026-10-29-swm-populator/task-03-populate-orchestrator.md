# Task 03 — Populate orchestrator

**Goal:** Build `src/populate.mjs` — the orchestrator that applies one or many mapping definitions to the parsed template, producing populated XLSX Blobs. Supports signature-check validation of user-uploaded blanks, skip semantics, and warnings.

**Files:**
- Create: `populator/src/populate.mjs`
- Create: `populator/tests/populate.test.mjs` (minimal happy-path test; end-to-end comes in Task 09)

---

- [ ] **Step 1: Write failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jszipSrc = await readFile(join(__dirname, '..', 'lib', 'jszip.min.js'), 'utf8');
globalThis.JSZip = new Function(jszipSrc + '; return JSZip;')();
const sheetjsSrc = await readFile(join(__dirname, '..', 'lib', 'sheetjs-bundle.js'), 'utf8');
const XLSX = new Function(sheetjsSrc + '; return XLSX;')();

const { populateAll, applyMapping } = await import('../src/populate.mjs');

// Minimal fake mapping for the orchestrator test.
const fakeMapping = {
  id: 'fake',
  filename: 'fake.xlsx',
  blankVersion: '2024-01-01',
  signatureSheets: ['1. Site Drainage Areas'],
  staticCells: [
    { sheet: '1. Site Drainage Areas', ref: 'B6', from: 'project.name' },
  ],
  tables: [],
  derivations: {},
};

const fixtureBytes = await readFile(join(__dirname, 'fixtures', 'minnesota-ave.xlsx'));
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });

test('applyMapping writes staticCells into blank', async () => {
  const blankBytes = await readFile(join(__dirname, '..', 'blanks', 'general-retention.xlsx'));
  const result = await applyMapping(fakeMapping, wb, blankBytes);
  assert.ok(result.blob, 'should return a Blob');
  assert.equal(result.warnings.length, 0);
});

test('signature check: throws on blank missing required sheet', async () => {
  const badMapping = { ...fakeMapping, signatureSheets: ['Nonexistent Sheet'] };
  const blankBytes = await readFile(join(__dirname, '..', 'blanks', 'general-retention.xlsx'));
  await assert.rejects(
    () => applyMapping(badMapping, wb, blankBytes),
    /signature.*mismatch/i,
  );
});

test('populateAll returns one result per mapping', async () => {
  const results = await populateAll(wb, {
    mappings: [fakeMapping],
    blanks: {
      fake: await readFile(join(__dirname, '..', 'blanks', 'general-retention.xlsx')),
    },
  });
  assert.equal(results.outputs.length, 1);
  assert.equal(results.outputs[0].targetId, 'fake');
  assert.equal(results.skipped.length, 0);
});
```

- [ ] **Step 2: Run tests, expect failure**

```powershell
Set-Location C:\_AAA\WS_HH\ddot_doee_swm_guidelines_2026_v1\populator
node --test tests/populate.test.mjs
```

- [ ] **Step 3: Write `populator/src/populate.mjs`**

```js
// src/populate.mjs — orchestrator over mapping definitions.
// Input: parsed template (from parse.mjs) + per-target blank bytes.
// Output: { outputs: [{targetId, filename, blob}], warnings: [], skipped: [{targetId, reason}] }.

import { parseWorkbook } from './parse.mjs';
import { openXlsx, setCells, saveXlsx } from './xlsx-surgical.mjs';

// Resolve a mapping `from` string against the parsed template + current row context.
// Supports:
//   'project.name'              → parsed.project.name
//   'sdaId'                     → row.sdaId  (within a table context)
//   '*derive:preNaturalSf'      → mapping.derivations.preNaturalSf(row, parsed)
function resolveFrom(from, parsed, row, mapping) {
  if (from.startsWith('*derive:')) {
    const name = from.slice('*derive:'.length);
    const fn = mapping.derivations?.[name];
    if (!fn) throw new Error(`Mapping ${mapping.id}: unknown derivation "${name}"`);
    return fn(row, parsed);
  }
  const path = from.split('.');
  let v = row ?? parsed;
  for (const key of path) {
    if (v == null) return null;
    v = v[key];
  }
  // Fallback: if not found on row, try parsed (support both `from: 'sdaId'` and `from: 'project.name'`).
  if (v === undefined && row != null) {
    v = parsed;
    for (const key of path) {
      if (v == null) return null;
      v = v[key];
    }
  }
  return v ?? null;
}

// Collect source rows for a table.
function rowsForTable(table, parsed) {
  const arr = parsed[table.source];
  if (!Array.isArray(arr)) throw new Error(`Mapping table source "${table.source}" is not an array`);
  // Allow a filter function.
  if (typeof table.filter === 'function') return arr.filter(table.filter);
  return arr;
}

export async function applyMapping(mapping, parsedOrWb, blankBytes) {
  // Accept either a SheetJS workbook or an already-parsed object.
  const parsed = parsedOrWb?.SheetNames ? parseWorkbook(parsedOrWb) : parsedOrWb;

  const xlsx = await openXlsx(blankBytes);

  // Signature check — all signatureSheets must exist in the blank.
  for (const req of (mapping.signatureSheets ?? [])) {
    if (!(req in xlsx.sheetMap)) {
      throw new Error(`Mapping ${mapping.id}: signature mismatch — missing sheet "${req}"`);
    }
  }

  const warnings = [];

  // Static cells.
  const bySheet = {};
  for (const cell of (mapping.staticCells ?? [])) {
    const value = resolveFrom(cell.from, parsed, null, mapping);
    if (value == null) {
      warnings.push({ ref: `${cell.sheet}!${cell.ref}`, reason: `source "${cell.from}" is null` });
      continue;
    }
    (bySheet[cell.sheet] ??= []).push({ ref: cell.ref, value });
  }

  // Tables.
  for (const table of (mapping.tables ?? [])) {
    const rows = rowsForTable(table, parsed);
    rows.forEach((row, i) => {
      const rowNum = table.firstDataRow + i;
      for (const col of table.columns) {
        const value = resolveFrom(col.from, parsed, row, mapping);
        if (value == null) continue;
        (bySheet[table.sheet] ??= []).push({ ref: `${col.col}${rowNum}`, value });
      }
    });
  }

  // Apply all cells grouped by sheet (one DOM pass per sheet).
  for (const [sheet, entries] of Object.entries(bySheet)) {
    await setCells(xlsx, sheet, entries);
  }

  const blob = await saveXlsx(xlsx);
  return { targetId: mapping.id, filename: mapping.filename, blob, warnings };
}

export async function populateAll(wbOrParsed, { mappings, blanks, options = {} }) {
  const parsed = wbOrParsed?.SheetNames ? parseWorkbook(wbOrParsed) : wbOrParsed;

  const outputs = [];
  const skipped = [];

  for (const mapping of mappings) {
    // Per-mapping skip predicate (e.g., Rainwater Harvesting skips if no RWH BMPs).
    if (typeof mapping.skipIf === 'function') {
      const reason = mapping.skipIf(parsed, options);
      if (reason) {
        skipped.push({ targetId: mapping.id, reason });
        continue;
      }
    }
    const blankBytes = blanks[mapping.id];
    if (!blankBytes) {
      skipped.push({ targetId: mapping.id, reason: 'no blank provided' });
      continue;
    }
    try {
      const result = await applyMapping(mapping, parsed, blankBytes);
      outputs.push(result);
    } catch (err) {
      skipped.push({ targetId: mapping.id, reason: err.message });
    }
  }

  return { outputs, skipped };
}
```

- [ ] **Step 4: Run tests, expect pass**

```powershell
Set-Location C:\_AAA\WS_HH\ddot_doee_swm_guidelines_2026_v1\populator
node --test tests/populate.test.mjs
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add populator/src/populate.mjs populator/tests/populate.test.mjs
git commit -m "populator: orchestrator with signature check, derivations, and skip semantics"
```
