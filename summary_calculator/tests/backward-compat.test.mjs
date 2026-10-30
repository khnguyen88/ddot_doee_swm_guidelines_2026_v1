import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sheetjsSrc = await readFile(join(__dirname, '..', 'lib', 'sheetjs-bundle.js'), 'utf8');
const XLSX = new Function(sheetjsSrc + '; return XLSX;')();

import { parseWorkbook } from '../src/parse.mjs';
import { rvProvidedPerSda } from '../src/aggregate.mjs';

const fixtureBytes = await readFile(
  join(__dirname, 'fixtures', 'minnesota-ave-pre-geometry.xlsx'),
);
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const parsed = parseWorkbook(wb);

test('backward-compat: pre-geometry fixture parses without errors', () => {
  assert.ok(parsed.project.name, 'project name present');
  assert.ok(parsed.sdas.length > 0, 'SDAs parsed');
  assert.ok(parsed.bmps.length > 0, 'BMPs parsed');
});

test('backward-compat: Bio BMPs on pre-geometry fixture have all NEW fields as null', () => {
  const bio = parsed.bmps.find(b => b.type === 'Bioretention');
  assert.ok(bio, 'pre-geometry fixture has Bioretention BMPs');
  assert.ok(bio.bio, 'bmp.bio populated');
  assert.equal(bio.bio.saPondTop,    null, 'saPondTop is null (not provided)');
  assert.equal(bio.bio.topElev,      null);
  assert.equal(bio.bio.overflowElev, null);
  assert.equal(bio.bio.sidewalkElev, null);
  assert.equal(bio.bio.curbCutElev,  null);
  // Existing fields still populated correctly.
  assert.ok(bio.bio.saBot > 0, 'saBot still populated');
  assert.ok(bio.bio.dMedia > 0, 'dMedia still populated');
});

test('backward-compat: pre-geometry fixture has NO Dry Swale BMPs (fixture-specific guard)', () => {
  // The frozen pre-geometry fixture pre-dates adding BMP-05-S.
  // If this fails after someone edits the frozen fixture, that defeats the regression safety net.
  const swales = parsed.bmps.filter(b => b.type === 'Dry Swale');
  assert.equal(swales.length, 0, 'frozen fixture should contain no Dry Swale rows');
});

test('backward-compat: Rv provided per SDA still computes without new fields', () => {
  // Downstream consumer (aggregate) must still work when new fields are null.
  const rv = rvProvidedPerSda(parsed.bmps, parsed.cdas, parsed.params);
  assert.ok(Object.keys(rv).length > 0, 'rvProvidedPerSda returns non-empty map');
  // Spot-check: SDA-2 (which has BMP-02-A Bioretention) has non-zero Rv.
  const sda2Rv = rv['SDA-2'];
  assert.ok(sda2Rv > 0, 'SDA-2 (which has BMP-02-A Bioretention) has non-zero Rv provided');
});
