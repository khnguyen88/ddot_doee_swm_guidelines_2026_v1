// tests/mappings/swdb-prow.test.mjs
//
// Golden-cell assertions for the SWDB PROW mapping.
// Cell refs were confirmed by inspecting populator/blanks/swdb-prow.xlsx
// with SheetJS (Node.js inspect_swdb_node2.mjs).
//
// Blank layout summary (SWDB PROW July 2025):
//   "Drainage Areas": column headers on row 3; data starts at row 4.
//     B = Drainage Area Number (AUTO-FORMULA: fills from C..L — do NOT write)
//         Formula: IF(SUM(C4:L4)>0, 1, "") — auto-increments when land cover is present.
//     C..G = Post land cover (Natural, Compacted, Impervious, BMP, Vehicular)
//     H..L = Pre land cover  (Natural, Compacted, Impervious, BMP, Vehicular)
//     M = AWDZ?, N = CSS?, O = Major DA, P = Minor DA
//   "BMPs": column headers on row 3; data starts at row 4.
//     B = BMP ID (AUTO-FORMULA: CONCATENATE(C,"-",D) — not written)
//     C = Drainage Area Number    D = BMP Number (suffix)
//     I = BMP Name                J = BMP Group     K = BMP type
//     L..P = Post CDA land cover  Q..U = Pre CDA land cover
//     V = BMP storage volume (CF) AB = Number of trees
//
// Minnesota Ave fixture (10 SDAs, all PROW):
//   SDA-1: post comp=170 impV=6910; pre comp=170 impV=6910. No BMP in SDA-1.
//   SDA-2: post comp=349 impV=6689. BMPs: BMP-02-A (Bioretention/Enhanced, Sv=315)
//                                          BMP-02-B (Permeable Pavement/Enhanced, Sv=60)
//   SDA-4: BMP-04-T (Planted Trees, tree count from fixture)

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
const { target: mapping } = await import('../../src/mappings/swdb-prow.mjs');

const fixtureBytes = await readFile(join(__dirname, '..', 'fixtures', 'minnesota-ave.xlsx'));
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const blankBytes = await readFile(join(__dirname, '..', '..', 'blanks', 'swdb-prow.xlsx'));

const result = await applyMapping(mapping, wb, blankBytes);
const populatedBytes = Buffer.from(await result.blob.arrayBuffer());
const populated = await openXlsx(populatedBytes);

// ----- Drainage Areas sheet: SDA rows start at row 4 -----
//
// NOTE: Column B (Drainage Area Number) is an auto-formula in the blank:
//   IF(SUM(C4:L4)>0, 1, "")
// The surgical writer skips formula cells to preserve them — so B4 reads
// as null via readCell (formula result is empty string until Excel recalcs).
// We assert on the land-cover columns (C, D, G, L) instead.

test('swdb-prow: SDA-1 Post Vehicular Access = 6910 SF in G4', () => {
  // SDA-1: Impervious Vehicular postIn = 6910. Maps to column G (Vehicular Access Area, post).
  assert.equal(readCell(populated, 'Drainage Areas', 'G4'), 6910);
});

test('swdb-prow: SDA-1 Post Compacted = 170 SF in D4', () => {
  // SDA-1: Compacted (Open Space) postIn = 170.
  assert.equal(readCell(populated, 'Drainage Areas', 'D4'), 170);
});

test('swdb-prow: SDA-1 Post Impervious (Non-Vehicular) is null / not written in E4', () => {
  // SDA-1 has no Impervious Non-Vehicular area — cell should remain empty (null).
  assert.equal(readCell(populated, 'Drainage Areas', 'E4'), null);
});

test('swdb-prow: SDA-1 Pre Vehicular Access = 2832 SF in L4', () => {
  // SDA-1: Impervious Vehicular preIn = 2832 (mixed-cover baseline — see
  // workbook/sample.py SDAS). Pre impervious < post impervious because the
  // fixture models a greenfield-to-paved transition on the same total area.
  assert.equal(readCell(populated, 'Drainage Areas', 'L4'), 2832);
});

test('swdb-prow: SDA-2 Post Compacted = 349 SF in D5', () => {
  assert.equal(readCell(populated, 'Drainage Areas', 'D5'), 349);
});

// ----- BMPs sheet: BMP rows start at row 4 -----
// Minnesota Ave has no BMP in SDA-1, so BMP-02-A is first (row 4).

test('swdb-prow: BMP-02-A DA Number = 2 in C4', () => {
  assert.equal(readCell(populated, 'BMPs', 'C4'), 2);
});

test('swdb-prow: BMP-02-A BMP Number = "A" in D4', () => {
  assert.equal(readCell(populated, 'BMPs', 'D4'), 'A');
});

test('swdb-prow: BMP-02-A name written to I4', () => {
  assert.equal(readCell(populated, 'BMPs', 'I4'), 'BMP-02-A');
});

test('swdb-prow: BMP-02-A BMP Group = "Bioretention" in J4', () => {
  assert.equal(readCell(populated, 'BMPs', 'J4'), 'Bioretention');
});

test('swdb-prow: BMP-02-A BMP type = "Traditional bioretention - Enhanced" in K4', () => {
  assert.equal(readCell(populated, 'BMPs', 'K4'), 'Traditional bioretention - Enhanced');
});

test('swdb-prow: BMP-02-A Sv ≈ 315 CF in V4', () => {
  // Sv = saBot × (dMedia·nMedia + dGravel·nGravel + dPond)
  //    = 210 × (2.0×0.40 + 0.5×0.40 + 0.5) = 315 CF
  const sv = readCell(populated, 'BMPs', 'V4');
  assert.ok(Math.abs(sv - 315) < 1, `expected ~315, got ${sv}`);
});

test('swdb-prow: BMP-02-B (Permeable Pavement) BMP Group = "Permeable Pavement" in J5', () => {
  assert.equal(readCell(populated, 'BMPs', 'J5'), 'Permeable Pavement');
});

test('swdb-prow: BMP-02-B type = "Porous asphalt - Enhanced" in K5', () => {
  assert.equal(readCell(populated, 'BMPs', 'K5'), 'Porous asphalt - Enhanced');
});

test('swdb-prow: BMP-02-B Sv ≈ 60 CF in V5', () => {
  // Sv = SA × dReservoir × nReservoir = 150 × 1 × 0.40 = 60 CF
  const sv = readCell(populated, 'BMPs', 'V5');
  assert.ok(Math.abs(sv - 60) < 1, `expected ~60, got ${sv}`);
});

test('swdb-prow: SDA-2 Pre Vehicular = 3519 SF in L5', () => {
  // SDA-2: Impervious Vehicular preIn = 3519 (mixed-cover baseline — see
  // workbook/sample.py SDAS).
  assert.equal(readCell(populated, 'Drainage Areas', 'L5'), 3519);
});

// BMP-04-T is a Planted Trees BMP; it lands at row 7 (BMP-02-A, BMP-02-B, BMP-03-A, BMP-04-A = rows 4..7, 04-T = row 8)
// Actually: BMP-02-A=row4, BMP-02-B=row5, BMP-03-A=row6, BMP-04-A=row7, BMP-04-T=row8
test('swdb-prow: BMP-04-T (Planted Trees) BMP Group = "Tree Planting and Preservation" in J8', () => {
  assert.equal(readCell(populated, 'BMPs', 'J8'), 'Tree Planting and Preservation');
});
