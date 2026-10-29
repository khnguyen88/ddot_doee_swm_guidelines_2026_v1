// tests/mappings/general-retention.test.mjs
//
// Golden-cell assertions for the General Retention Compliance Calculator
// mapping. Cell refs below are the real refs recorded by inspecting
// populator/blanks/general-retention.xlsx — not placeholders.
//
// Blank layout summary (May 4, 2020 blank):
//   "1. Site Drainage Areas": project header on row 4; SDA table from row 9.
//   "2. BMP Data":            BMP table from row 7 (B is auto-concat formula).
//   "3. Detention":           per-SDA CN inputs on G/I/K/M from row 8.

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

const { applyMapping } = await import('../../src/populate.mjs');
const { openXlsx, readCell } = await import('../../src/xlsx-surgical.mjs');
const { target: mapping } = await import('../../src/mappings/general-retention.mjs');

const fixtureBytes = await readFile(join(__dirname, '..', 'fixtures', 'minnesota-ave.xlsx'));
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const blankBytes = await readFile(join(__dirname, '..', '..', 'blanks', 'general-retention.xlsx'));

const result = await applyMapping(mapping, wb, blankBytes);
const populatedBytes = Buffer.from(await result.blob.arrayBuffer());
const populated = await openXlsx(populatedBytes);

// ----- Project header ("1. Site Drainage Areas", row 4) -----

test('project name is written to B4', () => {
  assert.equal(
    readCell(populated, '1. Site Drainage Areas', 'B4'),
    'Minnesota Ave Great Street Test Case',
  );
});

test('SWMP Number is written to A4', () => {
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'A4'), 'DTA-ZZZ');
});

test('AWDZ flag is written to C4', () => {
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'C4'), 'No');
});

test('MS4/CSS classification is written to D4', () => {
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'D4'), 'MS4');
});

// ----- SDA table ("1. Site Drainage Areas", first data row = 9) -----

test('SDA #1 row has SDA Number 1 in D9', () => {
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'D9'), 1);
});

test('SDA #1 In PROW is Yes in E9', () => {
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'E9'), 'Yes');
});

test('SDA #1 Post Vehicular Access = 6910 SF in S9', () => {
  // Minnesota Ave SDA-1 post cover: Impervious Vehicular=6910, Compacted=170.
  // Vehicular Access column is S on the blank.
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'S9'), 6910);
});

test('SDA #1 Post Compacted = 170 SF in Q9', () => {
  assert.equal(readCell(populated, '1. Site Drainage Areas', 'Q9'), 170);
});

// ----- BMP table ("2. BMP Data", first data row = 7) -----

test('BMP-02-A row has SDA Number 2 in C7', () => {
  // Minnesota Ave fixture has no BMP in SDA-1, so BMP-02-A is the first row.
  assert.equal(readCell(populated, '2. BMP Data', 'C7'), 2);
});

test('BMP-02-A name is written to E7', () => {
  assert.equal(readCell(populated, '2. BMP Data', 'E7'), 'BMP-02-A');
});

test('BMP-02-A BMP Group is "Bioretention - Enhanced" in F7', () => {
  assert.equal(readCell(populated, '2. BMP Data', 'F7'), 'Bioretention - Enhanced');
});

test('BMP-02-A Sv ≈ 315 CF in S7', () => {
  // Sv = SA_bot × (d_media·n_media + d_gravel·n_gravel + d_pond)
  //    = 210 × (2.0·0.40 + 0.5·0.40 + 0.5) = 315 CF
  const sv = readCell(populated, '2. BMP Data', 'S7');
  assert.ok(Math.abs(sv - 315) < 1, `expected ~315, got ${sv}`);
});

// ----- Detention table ("3. Detention", first data row = 8) -----

test('Detention Natural CN for SDA-1 is 70 in G8', () => {
  // Natural CN default (DOEE detention CN table) is 70.
  assert.equal(readCell(populated, '3. Detention', 'G8'), 70);
});

test('Detention Compacted CN for SDA-1 is 74 in I8', () => {
  // Compacted CN default (DOEE detention CN table) is 74.
  assert.equal(readCell(populated, '3. Detention', 'I8'), 74);
});
