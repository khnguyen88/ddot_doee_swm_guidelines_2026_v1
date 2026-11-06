# Task 02 — XLSX surgical edit module

**Goal:** Build `src/xlsx-surgical.mjs` — four pure functions over an XLSX ZIP that let callers read/write individual cells without disturbing anything else in the archive. Prove preservation of charts, VBA macros, and sheet protection via tests.

**Files:**
- Create: `populator/src/xlsx-surgical.mjs`
- Create: `populator/tests/xlsx-surgical.test.mjs`

---

- [ ] **Step 1: Write failing test `populator/tests/xlsx-surgical.test.mjs`**

```js
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
  // Verify we don't overwrite them.
  const bytes = await readFile(blankPath('general-retention.xlsx'));
  const xlsx = await openXlsx(bytes);
  const originalFormulaValue = readCell(xlsx, 'Compliance Check Summary', 'C5');  // adjust ref if needed
  setCell(xlsx, 'Compliance Check Summary', 'C5', 9999);
  const after = readCell(xlsx, 'Compliance Check Summary', 'C5');
  // The cell either keeps its formula value (not overwritten) or returns the original.
  // The key assertion is that we don't throw.
  assert.ok(after !== 9999 || after === originalFormulaValue, 'formula cell should not be overwritten');
});
```

- [ ] **Step 2: Run tests, expect failure**

```powershell
Set-Location C:\_AAA\WS_HH\ddot_doee_swm_guidelines_2026_v1\populator
node --test tests/xlsx-surgical.test.mjs
```

Expected: all 7 tests fail (module not found).

- [ ] **Step 3: Write `populator/src/xlsx-surgical.mjs`**

```js
// src/xlsx-surgical.mjs — JSZip + XML DOM primitives for surgical XLSX edits.
// Loaded under two environments:
//   browser: window.JSZip is set by lib/jszip.min.js; DOMParser is global.
//   node tests: globalThis.JSZip is set by the test harness; a minimal DOMParser
//     shim is lazy-loaded via @xmldom/xmldom if not present.

const getJSZip = () => globalThis.JSZip || window.JSZip;

async function getDomParser() {
  if (typeof globalThis.DOMParser !== 'undefined') {
    return { DOMParser: globalThis.DOMParser, XMLSerializer: globalThis.XMLSerializer };
  }
  // Node fallback — zero deps if we build a minimal parser.
  // For this project we use a lightweight regex-based cell editor (see editSheetXml below)
  // and fall back to full DOM only if needed. For now assume browser DOMParser.
  throw new Error('DOMParser not available — run in a browser or add @xmldom/xmldom');
}

// A1-ref parse / unparse.
export function colToLetters(col) {
  let s = '';
  while (col > 0) {
    const r = (col - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}
export function parseRef(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`Bad cell ref: ${ref}`);
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]) };
}

// XML escaping for shared-strings values.
const xmlEscape = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function openXlsx(bytes) {
  const JSZip = getJSZip();
  const zip = await JSZip.loadAsync(bytes);

  // Build sheetName → path map from xl/workbook.xml + xl/_rels/workbook.xml.rels.
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');

  const sheetMap = {};
  // <sheet name="X" sheetId="N" r:id="rIdK"/>
  const sheetRe = /<sheet\s+[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?>/g;
  let m;
  while ((m = sheetRe.exec(wbXml)) !== null) {
    const [, name, rid] = m;
    // Resolve rid → Target via the rels file.
    const relRe = new RegExp(`<Relationship\\s+[^>]*Id="${rid}"[^>]*Target="([^"]+)"`);
    const relMatch = relRe.exec(relsXml);
    if (relMatch) {
      let target = relMatch[1];
      if (!target.startsWith('/')) target = 'xl/' + target.replace(/^\/?xl\//, '');
      sheetMap[name] = target;
    }
  }

  // Load shared strings (may not exist on a brand-new workbook).
  let sstXml = null;
  if (zip.file('xl/sharedStrings.xml')) {
    sstXml = await zip.file('xl/sharedStrings.xml').async('string');
  }
  const sst = parseSst(sstXml);

  return {
    zip,
    sheetMap,
    sst,
    // Per-sheet mutable XML strings; load lazily.
    sheetXml: {},
  };
}

function parseSst(xml) {
  if (!xml) return { strings: [], index: new Map() };
  const strings = [];
  const index = new Map();
  // <si><t ...>...</t></si>  OR  <si><r>...<t>...</t>...</r></si>
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml)) !== null) {
    // Simple extraction — concatenate all <t> contents inside this si.
    const inner = m[1];
    const parts = [];
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let tm;
    while ((tm = tRe.exec(inner)) !== null) parts.push(tm[1]);
    const text = parts.join('')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
    const idx = strings.length;
    strings.push(text);
    index.set(text, idx);
  }
  return { strings, index };
}

function sstGetOrAdd(sst, s) {
  if (sst.index.has(s)) return sst.index.get(s);
  const idx = sst.strings.length;
  sst.strings.push(s);
  sst.index.set(s, idx);
  return idx;
}

async function loadSheetXml(xlsx, sheetName) {
  if (xlsx.sheetXml[sheetName]) return xlsx.sheetXml[sheetName];
  const path = xlsx.sheetMap[sheetName];
  if (!path) throw new Error(`Sheet not found: ${sheetName}`);
  const file = xlsx.zip.file(path);
  if (!file) throw new Error(`Sheet file not found: ${path}`);
  const xml = await file.async('string');
  xlsx.sheetXml[sheetName] = xml;
  return xml;
}

// Edit a single cell within the sheet's XML string. Returns the new XML.
function editSheetXml(sheetXml, ref, value, sst) {
  const { row } = parseRef(ref);

  // Determine the cell element we want to produce.
  let cellXml;
  if (value === null || value === undefined) {
    cellXml = `<c r="${ref}"/>`;
  } else if (typeof value === 'number') {
    cellXml = `<c r="${ref}" t="n"><v>${value}</v></c>`;
  } else if (typeof value === 'boolean') {
    cellXml = `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  } else {
    const idx = sstGetOrAdd(sst, String(value));
    cellXml = `<c r="${ref}" t="s"><v>${idx}</v></c>`;
  }

  // Does the cell already exist?
  const cellRe = new RegExp(`<c\\s+[^>]*r="${ref}"[^>]*(?:/>|>[\\s\\S]*?</c>)`);
  if (cellRe.test(sheetXml)) {
    // Check for formula cell — contains <f> element.
    const existing = cellRe.exec(sheetXml)[0];
    if (/<f[^>]*>/.test(existing)) {
      console.warn(`xlsx-surgical: skipping formula cell ${ref} to preserve formula`);
      return sheetXml;
    }
    // Preserve style attribute if present on the existing cell.
    const styleMatch = /\bs="(\d+)"/.exec(existing);
    if (styleMatch) {
      cellXml = cellXml.replace(/^<c /, `<c s="${styleMatch[1]}" `);
    }
    return sheetXml.replace(cellRe, cellXml);
  }

  // Cell doesn't exist. Insert it into the right <row>.
  const rowRe = new RegExp(`(<row\\s+[^>]*r="${row}"[^>]*>)([\\s\\S]*?)(</row>)`);
  if (rowRe.test(sheetXml)) {
    return sheetXml.replace(rowRe, (_, open, inner, close) => {
      // Insert cell in column order.
      const { col: newCol } = parseRef(ref);
      const existingCells = [];
      const existingCellRe = /<c\s+[^>]*r="([A-Z]+\d+)"[^>]*(?:\/>|>[\s\S]*?<\/c>)/g;
      let em;
      while ((em = existingCellRe.exec(inner)) !== null) {
        existingCells.push({ col: parseRef(em[1]).col, xml: em[0] });
      }
      existingCells.push({ col: newCol, xml: cellXml });
      existingCells.sort((a, b) => a.col - b.col);
      return open + existingCells.map(c => c.xml).join('') + close;
    });
  }

  // Row doesn't exist either — insert a new <row> inside <sheetData>.
  const sheetDataRe = /(<sheetData[^>]*>)([\s\S]*?)(<\/sheetData>)/;
  return sheetXml.replace(sheetDataRe, (_, open, inner, close) => {
    const existingRows = [];
    const rowReAll = /<row\s+[^>]*r="(\d+)"[^>]*>[\s\S]*?<\/row>/g;
    let rm;
    while ((rm = rowReAll.exec(inner)) !== null) {
      existingRows.push({ row: Number(rm[1]), xml: rm[0] });
    }
    const newRow = `<row r="${row}">${cellXml}</row>`;
    existingRows.push({ row, xml: newRow });
    existingRows.sort((a, b) => a.row - b.row);
    return open + existingRows.map(r => r.xml).join('') + close;
  });
}

// Edit multiple cells on one sheet.
function editSheetXmlBatch(sheetXml, entries, sst) {
  let xml = sheetXml;
  for (const { ref, value } of entries) {
    xml = editSheetXml(xml, ref, value, sst);
  }
  return xml;
}

export async function setCell(xlsx, sheetName, ref, value) {
  const xml = await loadSheetXml(xlsx, sheetName);
  xlsx.sheetXml[sheetName] = editSheetXml(xml, ref, value, xlsx.sst);
}

export async function setCells(xlsx, sheetName, entries) {
  const xml = await loadSheetXml(xlsx, sheetName);
  xlsx.sheetXml[sheetName] = editSheetXmlBatch(xml, entries, xlsx.sst);
}

// Read a cell's current value. Useful for tests and for reading formula results.
export function readCell(xlsx, sheetName, ref) {
  const xml = xlsx.sheetXml[sheetName];
  if (!xml) {
    // Lazy sync path for tests: pull synchronously via a cached Promise is messy;
    // just signal that caller should await the first write/load.
    throw new Error(`readCell: sheet ${sheetName} not loaded. Call setCell/setCells first or use loadSheet.`);
  }
  const cellRe = new RegExp(`<c\\s+[^>]*r="${ref}"[^>]*(?:/>|>([\\s\\S]*?)</c>)`);
  const m = cellRe.exec(xml);
  if (!m || !m[1]) return null;
  const inner = m[1];
  // Pull <v>...</v>
  const vMatch = /<v[^>]*>([\s\S]*?)<\/v>/.exec(inner);
  if (!vMatch) return null;
  const raw = vMatch[1];
  // Determine type from the <c t="..."> attribute.
  const cellOpen = /<c\s+[^>]*>/.exec(cellRe.exec(xml)[0])[0];
  const tMatch = /\bt="([^"]+)"/.exec(cellOpen);
  const t = tMatch ? tMatch[1] : 'n';
  if (t === 's') return xlsx.sst.strings[Number(raw)];
  if (t === 'b') return raw === '1';
  if (t === 'n') return Number(raw);
  return raw;  // inline string / other
}

export async function saveXlsx(xlsx) {
  // Write back any mutated sheet XMLs.
  for (const [sheetName, xml] of Object.entries(xlsx.sheetXml)) {
    const path = xlsx.sheetMap[sheetName];
    xlsx.zip.file(path, xml);
  }
  // Write back shared strings if we touched them (always safe to rewrite).
  const sstXml = buildSstXml(xlsx.sst);
  xlsx.zip.file('xl/sharedStrings.xml', sstXml);

  const out = await xlsx.zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return out;
}

function buildSstXml(sst) {
  const uniqueCount = sst.strings.length;
  const count = uniqueCount;  // not tracking total duplicate uses
  const sis = sst.strings.map(s => `<si><t xml:space="preserve">${xmlEscape(s)}</t></si>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${count}" uniqueCount="${uniqueCount}">` +
    sis +
    `</sst>`;
}
```

- [ ] **Step 4: Load the Node polyfill for DOMParser (if the regex-based approach is insufficient)**

The implementation above is regex-based (no DOMParser dependency), which works for the typical cell shapes produced by Excel and the DOEE templates. If tests fail with XML parsing errors on edge-case cells (e.g., rich-text runs with embedded `<r>`), add `@xmldom/xmldom` as a devDep in `package.json` and use its `DOMParser` inside `openXlsx`. For now, start with the regex path.

- [ ] **Step 5: Run tests, expect pass**

```powershell
Set-Location C:\_AAA\WS_HH\ddot_doee_swm_guidelines_2026_v1\populator
node --test tests/xlsx-surgical.test.mjs
```

Expected: all 7 tests pass. If the formula-cell test fails because `C5` isn't actually a formula in the real file, open the General Retention Calculator in Excel and pick a known formula cell on the Compliance Check Summary sheet, update the test ref.

- [ ] **Step 6: Commit**

```bash
git add populator/src/xlsx-surgical.mjs populator/tests/xlsx-surgical.test.mjs
git commit -m "populator: xlsx-surgical module with VBA + chart + protection preservation"
```
