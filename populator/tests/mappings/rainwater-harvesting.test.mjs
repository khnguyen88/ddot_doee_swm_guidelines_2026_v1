// tests/mappings/rainwater-harvesting.test.mjs
//
// Tests for the Rainwater Harvesting Storage Volume Calculator mapping.
//
// Blank layout (populator/blanks/rainwater-harvesting.xlsx, v3.1 May 7 2026):
//   Sheet "Input":
//     A1 = static title (not a user field)
//     L4 = Storm Event (pre-filled 1.7")
//     L7 = Impervious cover in CDA (SF) — green user-entry cell
//     L9 = Compacted cover in CDA (SF) — green user-entry cell
//     No project name / number fields exist in this blank.
//
// Two scenarios:
//   1. Minnesota Ave fixture has NO RWH BMPs → mapping must be skipped.
//   2. Synthesized parsed object with one RWH BMP → blob is returned (blank
//      passed through as-is; no cells are written since staticCells is empty).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lazy-load browser-shaped globals the surgical module expects.
const jszipSrc = await readFile(join(__dirname, '..', '..', 'lib', 'jszip.min.js'), 'utf8');
globalThis.JSZip = new Function(jszipSrc + '; return JSZip;')();
const sheetjsSrc = await readFile(join(__dirname, '..', '..', 'lib', 'sheetjs-bundle.js'), 'utf8');
const XLSX = new Function(sheetjsSrc + '; return XLSX;')();

const { populateAll, applyMapping } = await import('../../src/populate.mjs');
const { openXlsx, readCell } = await import('../../src/xlsx-surgical.mjs');
const { target: rwhMapping } = await import('../../src/mappings/rainwater-harvesting.mjs');

const fixtureBytes = await readFile(join(__dirname, '..', 'fixtures', 'minnesota-ave.xlsx'));
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const blankBytes = await readFile(join(__dirname, '..', '..', 'blanks', 'rainwater-harvesting.xlsx'));

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 1: Minnesota Ave fixture → no RWH BMPs → mapping must be skipped.
// ──────────────────────────────────────────────────────────────────────────────

test('rainwater-harvesting: skipped on Minnesota Ave fixture (no RWH BMPs)', async () => {
  const results = await populateAll(wb, {
    mappings: [rwhMapping],
    blanks: { 'rainwater-harvesting': blankBytes },
  });
  assert.equal(results.outputs.length, 0, 'no output files when RWH absent');
  assert.equal(results.skipped.length, 1, 'one skipped entry');
  assert.equal(results.skipped[0].targetId, 'rainwater-harvesting');
  assert.match(results.skipped[0].reason, /no rainwater harvesting/i);
});

// ──────────────────────────────────────────────────────────────────────────────
// Scenario 2: Synthesized parsed object WITH one RWH BMP → blob returned.
// The mapping writes no cells (staticCells is empty), so we verify the output
// is a valid XLSX blob with the "Input" sheet intact and A1 still holds the
// original static title (the blank passes through unchanged).
// ──────────────────────────────────────────────────────────────────────────────

test('rainwater-harvesting: blob returned when an RWH BMP is present', async () => {
  const synthParsed = {
    project: { name: 'Test Project', number: 'DTA-TEST', rainfallIn: 1.7, trigger: 'MLD' },
    sdas: [],
    cdas: [],
    bmps: [{ name: 'BMP-01-RWH', sdaId: 'SDA-1', type: 'Rainwater Harvesting' }],
    params: {},
  };

  const result = await applyMapping(rwhMapping, synthParsed, blankBytes);
  assert.ok(result.blob, 'populated blob should be returned');
  assert.equal(result.targetId, 'rainwater-harvesting');
  assert.equal(result.filename, 'Rainwater Harvesting Storage Volume Calculator.xlsx');
  assert.equal(result.warnings.length, 0, 'no warnings expected (no cells to write)');
});

test('rainwater-harvesting: Input sheet A1 title preserved in output', async () => {
  const synthParsed = {
    project: { name: 'Test Project', number: 'DTA-TEST', rainfallIn: 1.7, trigger: 'MLD' },
    sdas: [],
    cdas: [],
    bmps: [{ name: 'BMP-01-RWH', sdaId: 'SDA-1', type: 'Rainwater Harvesting' }],
    params: {},
  };

  const result = await applyMapping(rwhMapping, synthParsed, blankBytes);
  const populatedBytes = Buffer.from(await result.blob.arrayBuffer());
  const populated = await openXlsx(populatedBytes);

  // A1 is the baked-in title; it must survive the round-trip unchanged.
  const title = readCell(populated, 'Input', 'A1');
  assert.ok(
    typeof title === 'string' && title.includes('RAINWATER HARVESTING'),
    `expected blank title in A1, got: ${JSON.stringify(title)}`,
  );
});

test('rainwater-harvesting: skipIf returns null when RWH BMP present', () => {
  const synthParsed = {
    project: { name: 'Test', number: 'DTA-X' },
    sdas: [], cdas: [],
    bmps: [{ name: 'BMP-01-RWH', sdaId: 'SDA-1', type: 'Rainwater Harvesting' }],
    params: {},
  };
  assert.equal(rwhMapping.skipIf(synthParsed), null, 'skipIf must return null when RWH BMP present');
});

test('rainwater-harvesting: skipIf returns reason string when no RWH BMP', () => {
  const synthParsed = {
    project: { name: 'Test', number: 'DTA-X' },
    sdas: [], cdas: [],
    bmps: [{ name: 'BMP-01-BIO', sdaId: 'SDA-1', type: 'Bioretention' }],
    params: {},
  };
  const reason = rwhMapping.skipIf(synthParsed);
  assert.ok(typeof reason === 'string' && reason.length > 0, 'skipIf must return a non-empty reason string');
  assert.match(reason, /no rainwater harvesting/i);
});

test('rainwater-harvesting: skipIf handles empty bmps array', () => {
  const synthParsed = {
    project: { name: 'Test', number: 'DTA-X' },
    sdas: [], cdas: [], bmps: [], params: {},
  };
  const reason = rwhMapping.skipIf(synthParsed);
  assert.ok(typeof reason === 'string' && reason.length > 0, 'skipIf must return reason for empty bmps');
});
