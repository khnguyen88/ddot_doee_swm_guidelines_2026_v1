// tests/mappings/swmp-bmp-calc.test.mjs
//
// Golden-cell assertions for the SWMP-BMP Calc Spreadsheet mapping.
//
// Cell refs below are the real refs recorded from
// populator/blanks/swmp-bmp-calc.xlsm with openpyxl (keep_vba=True):
//
//   3.5 Permeable Pavement:
//     C56 = Design Type    C57 = Ap (SA, ft²)   C58 = dp (d_reservoir, ft)
//   3.6 Bioretention:
//     C57 = Type           C58 = SAtop (ft²)    C59 = SAbottom (ft²)
//     C61 = dmedia (ft)    C63 = dgravel (ft)   C66 = dponding (ft)
//   3.14 Tree Planting Preservation:
//     C37 = planted small  C38 = planted large
//     C39 = preserved small  C40 = preserved large
//
// Minnesota Ave fixture first-BMP values exercised here:
//   Permeable Pavement → BMP-02-B: sa=150, dReservoir=1, subType="Enhanced"
//   Bioretention       → BMP-02-A: saTop=210, saBot=210, dMedia=2, dGravel=0.5, dPond=0.5
//   Planted Trees      → BMP-04-T: plantedLarge=2  (first has no plantedSmall)
//
// Warning expectations:
//   Bioretention       → 4 BMPs (BMP-02-A, 06-A, 07-A, 08-A) → warning includes "4"
//   Permeable Pavement → 4 BMPs (BMP-02-B, 03-A, 04-A, 05-A) → warning includes "4"
//   Planted Trees      → 7 BMPs → warning includes "7"

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
const { target: mapping } = await import('../../src/mappings/swmp-bmp-calc.mjs');

const fixtureBytes = await readFile(join(__dirname, '..', 'fixtures', 'minnesota-ave.xlsx'));
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const blankBytes = await readFile(join(__dirname, '..', '..', 'blanks', 'swmp-bmp-calc.xlsm'));

const result = await applyMapping(mapping, wb, blankBytes);
const populatedBytes = Buffer.from(await result.blob.arrayBuffer());
const populated = await openXlsx(populatedBytes);

// ----- 3.5 Permeable Pavement — first PP BMP = BMP-02-B -----

test('swmp-bmp-calc: PP Design Type written to C56', () => {
  // BMP-02-B subType "Enhanced" → dropdown "Enhanced"
  assert.equal(readCell(populated, '3.5 Permeable Pavement', 'C56'), 'Enhanced');
});

test('swmp-bmp-calc: PP surface area (SA) written to C57', () => {
  // BMP-02-B pp.sa = 150 ft²
  assert.equal(readCell(populated, '3.5 Permeable Pavement', 'C57'), 150);
});

test('swmp-bmp-calc: PP reservoir depth (dp) written to C58', () => {
  // BMP-02-B pp.dReservoir = 1 ft
  assert.equal(readCell(populated, '3.5 Permeable Pavement', 'C58'), 1);
});

// ----- 3.6 Bioretention — first Bio BMP = BMP-02-A -----

test('swmp-bmp-calc: Bio Type written to C57', () => {
  // BMP-02-A subType "Enhanced" → dropdown "Enhanced"
  assert.equal(readCell(populated, '3.6 Bioretention', 'C57'), 'Enhanced');
});

test('swmp-bmp-calc: Bio SA_top written to C58', () => {
  // BMP-02-A bio.saTop = 210 ft²
  assert.equal(readCell(populated, '3.6 Bioretention', 'C58'), 210);
});

test('swmp-bmp-calc: Bio SA_bot written to C59', () => {
  // BMP-02-A bio.saBot = 210 ft²
  assert.equal(readCell(populated, '3.6 Bioretention', 'C59'), 210);
});

test('swmp-bmp-calc: Bio d_media written to C61', () => {
  // BMP-02-A bio.dMedia = 2 ft
  assert.equal(readCell(populated, '3.6 Bioretention', 'C61'), 2);
});

test('swmp-bmp-calc: Bio d_gravel written to C63', () => {
  // BMP-02-A bio.dGravel = 0.5 ft
  assert.equal(readCell(populated, '3.6 Bioretention', 'C63'), 0.5);
});

test('swmp-bmp-calc: Bio d_ponding written to C66', () => {
  // BMP-02-A bio.dPond = 0.5 ft
  assert.equal(readCell(populated, '3.6 Bioretention', 'C66'), 0.5);
});

// ----- 3.14 Tree Planting Preservation — first Trees BMP = BMP-04-T -----

test('swmp-bmp-calc: Trees planted large written to C38', () => {
  // BMP-04-T trees.plantedLarge = 2
  assert.equal(readCell(populated, '3.14 Tree Planting Preservation', 'C38'), 2);
});

test('swmp-bmp-calc: Trees planted small is blank (BMP-04-T has none)', () => {
  // BMP-04-T has no plantedSmall — C37 should remain blank/null
  const v = readCell(populated, '3.14 Tree Planting Preservation', 'C37');
  assert.ok(v == null || v === '', `expected null/empty, got ${v}`);
});

// ----- Warnings — additional BMPs of the same type -----

test('swmp-bmp-calc: warning for Bioretention has count 4', () => {
  // Minnesota Ave: BMP-02-A, 06-A, 07-A, 08-A = 4 Bioretention BMPs
  const w = result.warnings.find(
    s => typeof s === 'string' && s.includes('Bioretention') && s.includes('4'),
  );
  assert.ok(w, `expected Bioretention warning with "4", got: ${JSON.stringify(result.warnings)}`);
});

test('swmp-bmp-calc: warning for Permeable Pavement has count 4', () => {
  // Minnesota Ave: BMP-02-B, 03-A, 04-A, 05-A = 4 Permeable Pavement BMPs
  const w = result.warnings.find(
    s => typeof s === 'string' && s.includes('Permeable Pavement') && s.includes('4'),
  );
  assert.ok(w, `expected Permeable Pavement warning with "4", got: ${JSON.stringify(result.warnings)}`);
});

test('swmp-bmp-calc: warning for Planted Trees has count 7', () => {
  // Minnesota Ave: BMP-04-T, 05-T, 06-T, 07-T, 08-T, 09-T, 10-T = 7 Planted Trees BMPs
  const w = result.warnings.find(
    s => typeof s === 'string' && s.includes('Planted Trees') && s.includes('7'),
  );
  assert.ok(w, `expected Planted Trees warning with "7", got: ${JSON.stringify(result.warnings)}`);
});

// ----- VBA preservation check -----

test('swmp-bmp-calc: vbaProject.bin is preserved in output', async () => {
  // The output blob must still contain xl/vbaProject.bin (the VBA macro binary).
  // We inspect the ZIP directory of the populated bytes directly.
  const JSZipInst = new globalThis.JSZip();
  const zip = await JSZipInst.loadAsync(populatedBytes);
  const names = Object.keys(zip.files);
  assert.ok(
    names.includes('xl/vbaProject.bin'),
    `xl/vbaProject.bin missing from output; found: ${names.filter(n => n.startsWith('xl/')).join(', ')}`,
  );
});
