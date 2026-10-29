import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load JSZip the same way the browser does — classic script that sets window.JSZip.
// In Node we need to eval the UMD bundle and extract the global.
const jszipSrc = await readFile(join(__dirname, '..', 'lib', 'jszip.min.js'), 'utf8');
const JSZip = new Function(jszipSrc + '; return JSZip;')();

// Make JSZip visible to xlsx-surgical.mjs (same mechanism as the browser).
globalThis.JSZip = JSZip;

const { openXlsx, setCell, setCells, saveXlsx, readCell } = await import('../src/xlsx-surgical.mjs');

const blankPath = (name) => join(__dirname, '..', 'blanks', name);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

test('openXlsx + saveXlsx with no changes preserves entry count', async () => {
  const bytes = await readFile(blankPath('general-retention.xlsx'));
  const srcZip = await JSZip.loadAsync(bytes);
  const srcEntryCount = Object.keys(srcZip.files).length;

  const xlsx = await openXlsx(bytes);
  const out = await saveXlsx(xlsx);
  const outBytes = Buffer.from(await out.arrayBuffer());

  const dstZip = await JSZip.loadAsync(outBytes);
  const dstEntryCount = Object.keys(dstZip.files).length;
  assert.equal(dstEntryCount, srcEntryCount, `entry count mismatch: ${srcEntryCount} → ${dstEntryCount}`);
});

test('setCell writes a number and we can read it back', async () => {
  const bytes = await readFile(blankPath('general-retention.xlsx'));
  const xlsx = await openXlsx(bytes);
  setCell(xlsx, '1. Site Drainage Areas', 'B10', 42);
  const out = await saveXlsx(xlsx);

  const xlsx2 = await openXlsx(Buffer.from(await out.arrayBuffer()));
  const v = readCell(xlsx2, '1. Site Drainage Areas', 'B10');
  assert.equal(v, 42);
});

test('setCell writes a string via shared-strings pool', async () => {
  const bytes = await readFile(blankPath('general-retention.xlsx'));
  const xlsx = await openXlsx(bytes);
  setCell(xlsx, '1. Site Drainage Areas', 'B6', 'Minnesota Ave Great Street Test Case');
  const out = await saveXlsx(xlsx);

  const xlsx2 = await openXlsx(Buffer.from(await out.arrayBuffer()));
  const v = readCell(xlsx2, '1. Site Drainage Areas', 'B6');
  assert.equal(v, 'Minnesota Ave Great Street Test Case');
});

test('preserves VBA macros in .xlsm', async () => {
  const bytes = await readFile(blankPath('swmp-bmp-calc.xlsm'));
  const srcZip = await JSZip.loadAsync(bytes);
  const srcVba = await srcZip.file('xl/vbaProject.bin').async('uint8array');
  const srcHash = sha256(srcVba);

  const xlsx = await openXlsx(bytes);
  setCell(xlsx, '3.6 Bioretention', 'C8', 100);  // first input cell on Bioretention sheet
  const out = await saveXlsx(xlsx);

  const dstZip = await JSZip.loadAsync(Buffer.from(await out.arrayBuffer()));
  const dstVba = await dstZip.file('xl/vbaProject.bin').async('uint8array');
  assert.equal(sha256(dstVba), srcHash, 'VBA bin should be byte-identical');
});

test('preserves charts in Rainwater Harvesting workbook', async () => {
  const bytes = await readFile(blankPath('rainwater-harvesting.xlsx'));
  const srcZip = await JSZip.loadAsync(bytes);
  // Find any chart file; preserve it byte-for-byte.
  const chartFiles = Object.keys(srcZip.files).filter(n => n.startsWith('xl/charts/') && n.endsWith('.xml'));
  assert.ok(chartFiles.length > 0, 'Rainwater Harvesting should have at least one chart');
  const srcChart = await srcZip.file(chartFiles[0]).async('uint8array');
  const srcHash = sha256(srcChart);

  const xlsx = await openXlsx(bytes);
  setCell(xlsx, 'Input', 'B5', 100);  // any input cell
  const out = await saveXlsx(xlsx);

  const dstZip = await JSZip.loadAsync(Buffer.from(await out.arrayBuffer()));
  const dstChart = await dstZip.file(chartFiles[0]).async('uint8array');
  assert.equal(sha256(dstChart), srcHash, 'Chart XML should be byte-identical');
});

test('setCells batch writes to a single sheet in one DOM pass', async () => {
  const bytes = await readFile(blankPath('general-retention.xlsx'));
  const xlsx = await openXlsx(bytes);
  setCells(xlsx, '1. Site Drainage Areas', [
    { ref: 'B10', value: 1 },
    { ref: 'B11', value: 2 },
    { ref: 'B12', value: 3 },
  ]);
  const out = await saveXlsx(xlsx);

  const xlsx2 = await openXlsx(Buffer.from(await out.arrayBuffer()));
  assert.equal(readCell(xlsx2, '1. Site Drainage Areas', 'B10'), 1);
  assert.equal(readCell(xlsx2, '1. Site Drainage Areas', 'B11'), 2);
  assert.equal(readCell(xlsx2, '1. Site Drainage Areas', 'B12'), 3);
});

test('setCell on a formula cell logs warning and skips', async () => {
  // The DOEE Compliance Check Summary has formulas pulling from input sheets.
  // D4 is `='Site Data'!B26`, so it is a real formula cell on this sheet.
  const bytes = await readFile(blankPath('general-retention.xlsx'));
  const xlsx = await openXlsx(bytes);
  const originalFormulaValue = readCell(xlsx, 'Compliance Check Summary', 'D4');
  setCell(xlsx, 'Compliance Check Summary', 'D4', 9999);
  const after = readCell(xlsx, 'Compliance Check Summary', 'D4');
  // The cell either keeps its formula value (not overwritten) or returns the original.
  // The key assertion is that we don't throw.
  assert.ok(after !== 9999 || after === originalFormulaValue, 'formula cell should not be overwritten');
});
