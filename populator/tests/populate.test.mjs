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

// ── End-to-end: all 5 real mappings against the Minnesota Ave fixture ──────────

const { target: generalRetention } = await import('../src/mappings/general-retention.mjs');
const { target: ddotMep }          = await import('../src/mappings/ddot-mep.mjs');
const { target: swdbProw }         = await import('../src/mappings/swdb-prow.mjs');
const { target: swmpBmpCalc }      = await import('../src/mappings/swmp-bmp-calc.mjs');
const { target: rwh }              = await import('../src/mappings/rainwater-harvesting.mjs');

const ALL_MAPPINGS = [generalRetention, ddotMep, swdbProw, swmpBmpCalc, rwh];

const blankPath = (name) => join(__dirname, '..', 'blanks', name);

test('populateAll: 19 outputs + 1 skipped on Minnesota Ave', async () => {
  const start = Date.now();
  const blanks = {
    'general-retention':    await readFile(blankPath('general-retention.xlsx')),
    'ddot-mep':             await readFile(blankPath('ddot-mep.xlsx')),
    'swdb-prow':            await readFile(blankPath('swdb-prow.xlsx')),
    'swmp-bmp-calc':        await readFile(blankPath('swmp-bmp-calc.xlsm')),
    'rainwater-harvesting': await readFile(blankPath('rainwater-harvesting.xlsx')),
  };
  const results = await populateAll(wb, { mappings: ALL_MAPPINGS, blanks });
  const elapsedMs = Date.now() - start;

  // 3 single mappings (general-retention, ddot-mep, swdb-prow) + 16 fan-out BMPs
  // (4 PP + 4 Bio + 1 Dry Swale + 7 Trees from the Minnesota Ave fixture).
  assert.equal(results.outputs.length, 19, `expected 19 outputs, got ${results.outputs.length}`);
  assert.equal(results.skipped.length, 1);
  assert.equal(results.skipped[0].targetId, 'rainwater-harvesting');

  // Every output must be a valid XLSX (JSZip can re-open it and find workbook.xml).
  for (const out of results.outputs) {
    const bytes = Buffer.from(await out.blob.arrayBuffer());
    const zip = await globalThis.JSZip.loadAsync(bytes);
    assert.ok(zip.file('xl/workbook.xml'), `${out.targetId} missing xl/workbook.xml`);
  }

  // Perf budget — 19 outputs (16 fan-out + 3 single); allow headroom for CI machines.
  assert.ok(elapsedMs < 30000, `populate took ${elapsedMs}ms — should be <30s`);
});
