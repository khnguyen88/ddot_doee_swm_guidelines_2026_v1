// tests/mappings/swmp-bmp-calc.test.mjs
//
// Fan-out behavior: Minnesota Ave fixture has 4 PP + 4 Bio + 1 Dry Swale + 7 Trees = 16 BMPs
// of supported types → applyMapping must produce 16 output files, each with
// only its one BMP's cells populated on its one type-specific sheet.

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
const { target: mapping } = await import('../../src/mappings/swmp-bmp-calc.mjs');

const fixtureBytes = await readFile(join(__dirname, '..', 'fixtures', 'minnesota-ave.xlsx'));
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const blankBytes = await readFile(join(__dirname, '..', '..', 'blanks', 'swmp-bmp-calc.xlsm'));

const result = await applyMapping(mapping, wb, blankBytes);

test('swmp-bmp-calc: result exposes outputs[] for fan-out mappings', () => {
  assert.ok(Array.isArray(result.outputs), 'expected outputs[] array');
});

test('swmp-bmp-calc: 16 outputs for Minnesota Ave (4 PP + 4 Bio + 1 Dry Swale + 7 Trees)', () => {
  assert.equal(result.outputs.length, 16, `expected 16 outputs, got ${result.outputs.length}`);
});

test('swmp-bmp-calc: each filename starts with the standard prefix and ends .xlsm', () => {
  for (const o of result.outputs) {
    assert.ok(o.filename.startsWith('SWMP-BMP Calc Spreadsheet - '));
    assert.ok(o.filename.endsWith('.xlsm'));
  }
});

test('swmp-bmp-calc: BMP-02-A, BMP-02-B, and BMP-04-T appear in some filename', () => {
  const names = result.outputs.map(o => o.filename);
  assert.ok(names.some(n => n.includes('BMP-02-A')), `BMP-02-A not in ${names.join(', ')}`);
  assert.ok(names.some(n => n.includes('BMP-02-B')), `BMP-02-B not in ${names.join(', ')}`);
  assert.ok(names.some(n => n.includes('BMP-04-T')), `BMP-04-T not in ${names.join(', ')}`);
});

test('swmp-bmp-calc: BMP-02-A (first Bioretention) file writes to C57–C66', async () => {
  const file = result.outputs.find(o => o.filename.includes('BMP-02-A'));
  assert.ok(file, 'BMP-02-A output not found');
  const bytes = Buffer.from(await file.blob.arrayBuffer());
  const populated = await openXlsx(bytes);
  assert.equal(readCell(populated, '3.6 Bioretention', 'C57'), 'Enhanced');
  assert.equal(readCell(populated, '3.6 Bioretention', 'C58'), 210);
  assert.equal(readCell(populated, '3.6 Bioretention', 'C59'), 210);
  assert.equal(readCell(populated, '3.6 Bioretention', 'C61'), 2);
  assert.equal(readCell(populated, '3.6 Bioretention', 'C63'), 0.5);
  assert.equal(readCell(populated, '3.6 Bioretention', 'C66'), 0.5);
});

test('swmp-bmp-calc: BMP-02-A file does NOT populate the PP sheet', async () => {
  const file = result.outputs.find(o => o.filename.includes('BMP-02-A'));
  const bytes = Buffer.from(await file.blob.arrayBuffer());
  const populated = await openXlsx(bytes);
  const v = readCell(populated, '3.5 Permeable Pavement', 'C57');
  assert.ok(v == null || v === '', `PP sheet should be blank in Bioretention file; got ${v}`);
});

test('swmp-bmp-calc: BMP-02-B (first Permeable Pavement) file writes to C56–C58', async () => {
  const file = result.outputs.find(o => o.filename.includes('BMP-02-B'));
  assert.ok(file, 'BMP-02-B output not found');
  const bytes = Buffer.from(await file.blob.arrayBuffer());
  const populated = await openXlsx(bytes);
  assert.equal(readCell(populated, '3.5 Permeable Pavement', 'C56'), 'Enhanced');
  assert.equal(readCell(populated, '3.5 Permeable Pavement', 'C57'), 150);
  assert.equal(readCell(populated, '3.5 Permeable Pavement', 'C58'), 1);
});

test('swmp-bmp-calc: no "filled only first" warnings', () => {
  const bad = result.warnings.find(w => typeof w === 'string' && /filled only/i.test(w));
  assert.ok(!bad, `unexpected first-BMP warning: ${JSON.stringify(result.warnings)}`);
});

test('swmp-bmp-calc: vbaProject.bin is preserved in each output', async () => {
  for (const o of result.outputs) {
    const bytes = Buffer.from(await o.blob.arrayBuffer());
    const zip = await globalThis.JSZip.loadAsync(bytes);
    assert.ok(zip.file('xl/vbaProject.bin'),
      `${o.filename}: missing xl/vbaProject.bin`);
  }
});
