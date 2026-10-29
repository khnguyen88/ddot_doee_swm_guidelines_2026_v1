// tests/mappings/ddot-mep.test.mjs
//
// Golden-cell assertions for the DDOT MEP Worksheet mapping. The cell refs
// below were recorded directly from populator/blanks/ddot-mep.xlsx with
// openpyxl, cross-checked against the "30% Phase Sample" / "65% Phase Sample"
// tabs that ship inside the blank workbook.
//
// Layout summary (DDOT MEP 2019-01 blank):
//   "30% Phase":
//     Project header row 1 — Name=D1, Project No=J1, Review No=U1.
//     E5 = user-entered No. of Drainage Areas.
//     Per-DA table rows 12..44; row 45 is DATOTAL (formulas, left untouched).
//     DA row cols: A=DA ID, B=Imp SF, C=Compact SF, D=Natural SF,
//                  F=Imp outside, G=Compact outside, H=Natural outside,
//                  L=HSG, N/P/R=preserved tree counts (small/large/special-heritage).
//   "65% Phase" / "90% Phase":
//     Same core layout but the project header shifts one column left:
//     Project No=I1, Review No=T1. Trees move to Q/S/U to make room for
//     the water-table / bedrock / infiltration-rate columns at M/N/O.
//
// The default `phases` option is `['30% Phase']` — the other two tabs stay
// as the blank left them, which is what we assert on 65% Phase below.

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
const { target: mapping } = await import('../../src/mappings/ddot-mep.mjs');

const fixtureBytes = await readFile(join(__dirname, '..', 'fixtures', 'minnesota-ave.xlsx'));
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const blankBytes = await readFile(join(__dirname, '..', '..', 'blanks', 'ddot-mep.xlsx'));

// ------- Default run: 30% Phase only -------

const defaultResult = await applyMapping(mapping, wb, blankBytes);
const defaultBytes = Buffer.from(await defaultResult.blob.arrayBuffer());
const defaultOut = await openXlsx(defaultBytes);

// Project header on 30% Phase.

test('ddot-mep: 30% Phase project name in D1', () => {
  assert.equal(readCell(defaultOut, '30% Phase', 'D1'), 'Minnesota Ave Great Street Test Case');
});

test('ddot-mep: 30% Phase project number in J1', () => {
  assert.equal(readCell(defaultOut, '30% Phase', 'J1'), 'DTA-ZZZ');
});

test('ddot-mep: 30% Phase No. of Drainage Areas in E5', () => {
  // Minnesota Ave fixture has 10 unique SDAs (SDA-1 .. SDA-10).
  assert.equal(readCell(defaultOut, '30% Phase', 'E5'), 10);
});

// SDA-1 land cover ends up on row 12 (sorted by numeric sdaId).

test('ddot-mep: 30% Phase DA-1 id in A12', () => {
  assert.equal(readCell(defaultOut, '30% Phase', 'A12'), 1);
});

test('ddot-mep: 30% Phase DA-1 Impervious within LOD in B12', () => {
  // SDA-1 Impervious Vehicular postIn = 6910 SF (no Impervious Non-Vehicular row).
  assert.equal(readCell(defaultOut, '30% Phase', 'B12'), 6910);
});

test('ddot-mep: 30% Phase DA-1 Compacted within LOD in C12', () => {
  // SDA-1 Compacted (Open Space) postIn = 170 SF.
  assert.equal(readCell(defaultOut, '30% Phase', 'C12'), 170);
});

test('ddot-mep: 30% Phase DA-1 Impervious outside LOD in F12', () => {
  // SDA-1 Impervious Vehicular postOut = 1097 SF.
  assert.equal(readCell(defaultOut, '30% Phase', 'F12'), 1097);
});

test('ddot-mep: 30% Phase DA-1 Hydrologic Soil Group in L12', () => {
  // SDA-1 hsg = "D" (fixture default — all 10 SDAs are HSG D).
  assert.equal(readCell(defaultOut, '30% Phase', 'L12'), 'D');
});

// ------- Phase-gating: 65% Phase is left blank when not selected -------

test('ddot-mep: 65% Phase stays untouched when only 30% is requested', () => {
  // Blank starts with D1 completely empty on all phases; the project name
  // must NOT have been written to 65% Phase in the default run.
  const d1 = readCell(defaultOut, '65% Phase', 'D1');
  assert.notEqual(d1, 'Minnesota Ave Great Street Test Case');
  // E5 is a user-input cell on 65% Phase as well — the blank leaves it empty.
  const e5 = readCell(defaultOut, '65% Phase', 'E5');
  assert.notEqual(e5, 10);
});

// ------- Explicit phases: writing to 65% Phase works -------

const twoPhaseResult = await applyMapping(mapping, wb, blankBytes, {
  phases: ['30% Phase', '65% Phase'],
});
const twoPhaseBytes = Buffer.from(await twoPhaseResult.blob.arrayBuffer());
const twoPhaseOut = await openXlsx(twoPhaseBytes);

test('ddot-mep: 65% Phase gets project name when selected (D1)', () => {
  assert.equal(readCell(twoPhaseOut, '65% Phase', 'D1'), 'Minnesota Ave Great Street Test Case');
});

test('ddot-mep: 65% Phase project number shifts to I1 when selected', () => {
  assert.equal(readCell(twoPhaseOut, '65% Phase', 'I1'), 'DTA-ZZZ');
});

test('ddot-mep: 65% Phase DA-1 Impervious within LOD in B12', () => {
  assert.equal(readCell(twoPhaseOut, '65% Phase', 'B12'), 6910);
});

test('ddot-mep: 90% Phase stays untouched when only 30% + 65% selected', () => {
  // 90% Phase was not in the phases list — must remain empty for name.
  const d1 = readCell(twoPhaseOut, '90% Phase', 'D1');
  assert.notEqual(d1, 'Minnesota Ave Great Street Test Case');
});
