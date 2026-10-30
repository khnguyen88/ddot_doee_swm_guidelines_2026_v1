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

test('backward-compat: pre-geometry fixture still parses without errors', () => {
  const parsed = parseWorkbook(wb);
  assert.ok(parsed.project.name, 'project name present');
  assert.ok(parsed.sdas.length > 0, 'SDAs parsed');
  assert.ok(parsed.bmps.length > 0, 'BMPs parsed');
});
