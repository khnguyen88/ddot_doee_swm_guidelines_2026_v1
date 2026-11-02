import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sheetjsSrc = await readFile(join(__dirname, '..', 'lib', 'sheetjs-bundle.js'), 'utf8');
const XLSX = new Function(sheetjsSrc + '; return XLSX;')();

import { parseWorkbook } from '../src/parse.mjs';

const fixtureBytes = await readFile(
  join(__dirname, 'fixtures', 'minnesota-ave-pre-geometry.xlsx'),
);
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });

test('backward-compat: legacy pre/post SDA/CDA layout is rejected', () => {
  // Fixture was generated before the 2026-11 schema change that split
  // SDA/CDA into Existing + Proposed sheets. Loading it must now fail
  // with a clear message pointing users at the current blank template.
  assert.throws(
    () => parseWorkbook(wb),
    /old (SDA|CDA) pre\/post layout/,
    'parseWorkbook must reject the legacy single-SDA schema',
  );
});
