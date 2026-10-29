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
