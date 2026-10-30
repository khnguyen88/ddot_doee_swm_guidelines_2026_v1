import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// SheetJS loaded via dynamic import of the vendored CJS bundle.
const __dirname = dirname(fileURLToPath(import.meta.url));
const sheetjsPath = join(__dirname, '..', 'lib', 'sheetjs-bundle.js');
const sheetjsSrc = await readFile(sheetjsPath, 'utf8');
// Evaluate SheetJS in this scope so `XLSX` becomes available.
const XLSX = new Function(sheetjsSrc + '; return XLSX;')();

import { parseWorkbook } from '../src/parse.mjs';

const fixtureBytes = await readFile(
  join(__dirname, 'fixtures', 'minnesota-ave.xlsx'),
);
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });

test('parse: project info', () => {
  const result = parseWorkbook(wb);
  assert.equal(result.project.name, 'Minnesota Ave Great Street Test Case');
  assert.equal(result.project.number, 'DTA-ZZZ');
  assert.equal(result.project.rainfallIn, 1.7);
  assert.equal(result.project.trigger, 'MLD');
  assert.equal(result.project.totalLod, 222300);
});

test('parse: SDA rows', () => {
  const { sdas } = parseWorkbook(wb);
  assert.ok(sdas.length >= 10, `expected at least 10 SDA rows, got ${sdas.length}`);
  const first = sdas[0];
  assert.equal(first.sdaId, 'SDA-1');
  assert.equal(first.landUse, 'Impervious Vehicular');
  // Minnesota Ave fixture: pre impervious < post impervious (greenfield → paved).
  assert.ok(first.preIn > 0 && first.preIn < first.postIn,
    `expected 0 < preIn < postIn, got pre=${first.preIn} post=${first.postIn}`);
  assert.equal(first.postIn, 6910);
});

test('parse: CDA rows have pre/post land-cover fields', () => {
  const { cdas } = parseWorkbook(wb);
  assert.ok(cdas.length >= 1);
  const first = cdas[0];
  assert.ok(first.cdaId, 'cdaId required');
  assert.ok(first.sdaId, 'sdaId required');
  assert.equal(typeof first.hsg, 'string');
  assert.equal(typeof first.preIn,  'number');
  assert.equal(typeof first.preOut, 'number');
  assert.equal(typeof first.postIn, 'number');
  assert.equal(typeof first.postOut,'number');
  // Sample populates only Post Within — Pre columns are 0.
  assert.equal(first.preIn,  0);
  assert.equal(first.preOut, 0);
  assert.ok(first.postIn > 0, 'sample CDA Post Within LOD must be populated');
});

test('parse: BMP rows (bio + pp + trees)', () => {
  const { bmps } = parseWorkbook(wb);
  const byName = Object.fromEntries(bmps.map(b => [b.name, b]));

  // Bioretention
  const bio = byName['BMP-02-A'];
  assert.equal(bio.type, 'Bioretention');
  assert.equal(bio.subType, 'Enhanced');
  assert.equal(bio.bio.saBot, 210);
  assert.equal(bio.bio.dMedia, 2.0);

  // Permeable Pavement
  const pp = byName['BMP-02-B'];
  assert.equal(pp.type, 'Permeable Pavement');
  assert.equal(pp.pp.sa, 150);
  assert.equal(pp.pp.dReservoir, 1.0);

  // Trees
  const trees = byName['BMP-05-T'];
  assert.equal(trees.type, 'Planted Trees');
  assert.equal(trees.trees.plantedLarge, 8);
  assert.equal(trees.trees.preservedLarge, 2);
});

test('parse: PARAMS lookup tables', () => {
  const { params } = parseWorkbook(wb);
  assert.equal(params.rv['Impervious Vehicular'], 0.95);
  assert.equal(params.rv['Natural (Woods)'], 0.00);
  assert.equal(params.cn['Compacted (Open Space)'].D, 80);
  assert.equal(params.detention.p2In, 3.14);
  assert.equal(params.detention.p15In, 5.23);
  assert.equal(params.detentionCn.Impervious, 98);
  assert.equal(params.bmpDesign['Bioretention / Enhanced'].retMultiplier, 1.0);
  assert.equal(params.treeCredits['T-1 Large'], 10);
});

test('parse: SDA loop does not read SUMIFS summary rows', () => {
  // The workbook SDA sheet has a summary block starting at row 56 whose
  // first value column also contains strings like "SDA-1". Verify the parser
  // stops at DATA_LAST_ROW=53 so these can never be mistaken for data rows.
  const { sdas } = parseWorkbook(wb);
  for (const r of sdas) {
    // Every parsed SDA row must have come from an input row — assert that
    // none has a landUse of null/undefined/empty, which would be the case
    // if the parser had read a summary header row.
    assert.ok(r.landUse, `parsed SDA row has no landUse: ${JSON.stringify(r)}`);
  }
});

test('parse: throws on missing sheet', () => {
  const bogus = { SheetNames: ['PROJECT'], Sheets: { PROJECT: {} } };
  assert.throws(() => parseWorkbook(bogus), /Missing sheet: SDA/);
});
