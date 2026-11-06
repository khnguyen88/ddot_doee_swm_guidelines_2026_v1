# Task 03 — Parse module

**Goal:** Build `src/parse.mjs` that takes a SheetJS workbook and returns a plain JS object with the project info, SDA rows, CDA rows, BMP rows, and PARAMS lookup tables. SheetJS stays at the caller boundary — this module just reads cells from the workbook it's given.

**Files:**
- Create: `summary_calculator/src/parse.mjs`
- Create: `summary_calculator/tests/parse.test.mjs`

---

- [ ] **Step 1: Write failing test `summary_calculator/tests/parse.test.mjs`**

```js
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
  assert.equal(first.preIn, 6910);
  assert.equal(first.postIn, 6910);
});

test('parse: CDA rows', () => {
  const { cdas } = parseWorkbook(wb);
  assert.ok(cdas.length >= 1);
  for (const cda of cdas) {
    assert.ok(cda.cdaId, 'cdaId required');
    assert.ok(cda.sdaId, 'sdaId required');
    assert.ok(typeof cda.withinLodSf === 'number');
  }
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
```

- [ ] **Step 2: Run tests, expect failure**

```bash
cd summary_calculator
node --test tests/parse.test.mjs
```

Expected: all tests fail with `Cannot find module '../src/parse.mjs'` or similar.

- [ ] **Step 3: Write `src/parse.mjs`**

```js
// src/parse.mjs — XLSX → structured JS object. SheetJS workbook comes from caller.

const REQUIRED_SHEETS = ['PROJECT', 'SDA', 'CDA', 'BMP', 'PARAMS'];

// Data input region matches workbook n_rows=50 (data rows 4-53). Keep in sync
// with workbook/__main__.py; the SUMIFS summary blocks that start at row ~56
// use labels like "SDA-1" that would otherwise be mistaken for data rows.
const DATA_FIRST_ROW = 4;
const DATA_LAST_ROW = 53;

function requireSheet(wb, name) {
  if (!wb.SheetNames.includes(name)) {
    throw new Error(`Missing sheet: ${name}`);
  }
  return wb.Sheets[name];
}

function colToLetters(col) {
  // 1 → 'A', 26 → 'Z', 27 → 'AA', 28 → 'AB', …
  let s = '';
  while (col > 0) {
    const r = (col - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

function cell(sheet, row, col) {
  const ref = `${colToLetters(col)}${row}`;
  const c = sheet[ref];
  return c == null ? null : c.v;
}

// PROJECT layout (from workbook/builders/project.py):
//   col A = labels; col B = values (rows 3-11):
//   3=name, 4=number, 5=ms4, 6=awdz, 7=doeeReview,
//   8=totalLod, 9=rainfallIn, 10=trigger, 11=eisa
function parseProject(sheet) {
  const rainfall = cell(sheet, 9, 2);
  if (rainfall == null) {
    throw new Error('Missing PROJECT!B9 (Rainfall)');
  }
  return {
    name: cell(sheet, 3, 2),
    number: cell(sheet, 4, 2),
    ms4: cell(sheet, 5, 2),
    awdz: cell(sheet, 6, 2),
    doeeReview: cell(sheet, 7, 2),
    totalLod: cell(sheet, 8, 2),
    rainfallIn: rainfall,
    trigger: cell(sheet, 10, 2),
    eisa: cell(sheet, 11, 2),
  };
}

// SDA layout (from workbook/builders/sda.py):
//   data rows DATA_FIRST_ROW..DATA_LAST_ROW; cols A..H:
//   A=sdaId, B=inProw, C=landUse, D=hsg,
//   E=preIn, F=preOut, G=postIn, H=postOut
function parseSda(sheet) {
  const rows = [];
  for (let r = DATA_FIRST_ROW; r <= DATA_LAST_ROW; r++) {
    const sdaId = cell(sheet, r, 1);
    if (!sdaId) break;
    rows.push({
      sdaId,
      inProw: cell(sheet, r, 2),
      landUse: cell(sheet, r, 3),
      hsg: cell(sheet, r, 4) || 'D',
      preIn: cell(sheet, r, 5) || 0,
      preOut: cell(sheet, r, 6) || 0,
      postIn: cell(sheet, r, 7) || 0,
      postOut: cell(sheet, r, 8) || 0,
    });
  }
  return rows;
}

// CDA layout (from workbook/builders/cda.py):
//   data rows DATA_FIRST_ROW..DATA_LAST_ROW; parser reads A, B, C, E only
//   (col D=HSG and col F=outsideLodSf are not consumed by any current calc).
//   A=cdaId, B=sdaId, C=landUse, E=withinLodSf
function parseCda(sheet) {
  const rows = [];
  for (let r = DATA_FIRST_ROW; r <= DATA_LAST_ROW; r++) {
    const cdaId = cell(sheet, r, 1);
    if (!cdaId) break;
    rows.push({
      cdaId,
      sdaId: cell(sheet, r, 2),
      landUse: cell(sheet, r, 3),
      withinLodSf: cell(sheet, r, 5) || 0,
    });
  }
  return rows;
}

// BMP layout (from workbook/builders/bmp.py):
//   data rows DATA_FIRST_ROW..DATA_LAST_ROW; conditional cols by BMP type:
//     Permeable Pavement:   F=sa, G=dReservoir
//     Bioretention/DrySwale: N=saTop, O=saBot, Q=dMedia, S=dGravel, U=dPond
//     Planted/Preserve Trees: AB..AG = plantedSmall..preservedHeritage
//   Wet Swale (cols Y, Z) is not currently parsed — add here when needed.
function parseBmp(sheet) {
  const rows = [];
  for (let r = DATA_FIRST_ROW; r <= DATA_LAST_ROW; r++) {
    const name = cell(sheet, r, 1);
    if (!name) break;
    const type = cell(sheet, r, 4);
    const row = {
      name,
      sdaId: cell(sheet, r, 2),
      cdaId: cell(sheet, r, 3),
      type,
      subType: cell(sheet, r, 5),
    };
    if (type === 'Permeable Pavement') {
      row.pp = {
        sa: cell(sheet, r, 6) || 0,
        dReservoir: cell(sheet, r, 7) || 0,
      };
    } else if (type === 'Bioretention' || type === 'Dry Swale') {
      row.bio = {
        saTop: cell(sheet, r, 14) || 0,
        saBot: cell(sheet, r, 15) || 0,
        dMedia: cell(sheet, r, 17) || 0,
        dGravel: cell(sheet, r, 19) || 0,
        dPond: cell(sheet, r, 21) || 0,
      };
    } else if (type === 'Planted Trees' || type === 'Preserve Trees') {
      row.trees = {
        plantedSmall: cell(sheet, r, 28) || 0,
        plantedLarge: cell(sheet, r, 29) || 0,
        preservedSmall: cell(sheet, r, 30) || 0,
        preservedLarge: cell(sheet, r, 31) || 0,
        preservedSpecial: cell(sheet, r, 32) || 0,
        preservedHeritage: cell(sheet, r, 33) || 0,
      };
    }
    rows.push(row);
  }
  return rows;
}

function parseParams(sheet) {
  // PARAMS layout (from workbook/builders/params.py):
  //   Rv table: rows 7-11 cols A-B
  //   CN table: rows 15-18 cols A-E (A=land use label, B-E = HSG A-D)
  //   BMP design: rows 36-42 cols A-G (A=type, B=subtype, F=ret multiplier)
  //   Tree credits: rows 46-51 cols A-C (A=code, C=credit CF)
  //   Detention storm depths: rows 55-57 cols A-B (A=label, B=inches)
  //   Detention CN defaults: rows 61-64 cols A-B (A=label, B=cn)

  const rv = {};
  for (let r = 7; r <= 11; r++) {
    const label = cell(sheet, r, 1);
    if (label) rv[label] = cell(sheet, r, 2);
  }

  const cn = {};
  for (let r = 15; r <= 18; r++) {
    const label = cell(sheet, r, 1);
    if (!label) continue;
    // The PARAMS table uses "Impervious" (collapsed). Fan out to both vehicular
    // and non-vehicular + BMP so lookups by SDA land use work directly.
    const row = {
      A: cell(sheet, r, 2),
      B: cell(sheet, r, 3),
      C: cell(sheet, r, 4),
      D: cell(sheet, r, 5),
    };
    if (label === 'Impervious') {
      cn['Impervious Vehicular'] = row;
      cn['Impervious Non-Vehicular'] = row;
    } else {
      cn[label] = row;
    }
  }

  const bmpDesign = {};
  for (let r = 36; r <= 42; r++) {
    const type = cell(sheet, r, 1);
    const subType = cell(sheet, r, 2);
    if (!type) continue;
    const key = `${type} / ${subType}`;
    bmpDesign[key] = {
      nMedia:      typeof cell(sheet, r, 3) === 'number' ? cell(sheet, r, 3) : null,
      nGravel:     typeof cell(sheet, r, 4) === 'number' ? cell(sheet, r, 4) : null,
      nReservoir:  typeof cell(sheet, r, 5) === 'number' ? cell(sheet, r, 5) : null,
      retMultiplier: cell(sheet, r, 6),
      maxDrawdownDays: cell(sheet, r, 7),
    };
  }

  const treeCredits = {};
  for (let r = 46; r <= 51; r++) {
    const code = cell(sheet, r, 1);
    if (code) treeCredits[code] = cell(sheet, r, 3);
  }

  const detention = {
    p2In: cell(sheet, 55, 2),
    p15In: cell(sheet, 56, 2),
    p100In: cell(sheet, 57, 2),
  };

  const detentionCn = {};
  for (let r = 61; r <= 64; r++) {
    const label = cell(sheet, r, 1);
    if (label) detentionCn[label] = cell(sheet, r, 2);
  }

  return { rv, cn, bmpDesign, treeCredits, detention, detentionCn };
}

/**
 * Parse a SheetJS workbook into the structured object every downstream module
 * consumes. The `bmps` array has a conditional shape — pp/bio/trees sub-objects
 * are only present for matching BMP types.
 *
 * @param {{SheetNames: string[], Sheets: Record<string, object>}} wb
 * @returns {{
 *   project: {name, number, ms4, awdz, doeeReview, totalLod, rainfallIn, trigger, eisa},
 *   sdas:    Array<{sdaId, inProw, landUse, hsg, preIn, preOut, postIn, postOut}>,
 *   cdas:    Array<{cdaId, sdaId, landUse, withinLodSf}>,
 *   bmps:    Array<{name, sdaId, cdaId, type, subType,
 *                   pp?:    {sa, dReservoir},
 *                   bio?:   {saTop, saBot, dMedia, dGravel, dPond},
 *                   trees?: {plantedSmall, plantedLarge, preservedSmall, preservedLarge, preservedSpecial, preservedHeritage}}>,
 *   params:  {rv, cn, bmpDesign, treeCredits, detention: {p2In, p15In, p100In}, detentionCn}
 * }}
 * @throws if a required sheet (PROJECT, SDA, CDA, BMP, PARAMS) is missing or
 *         if PROJECT!B9 (Rainfall) is empty.
 */
export function parseWorkbook(wb) {
  for (const name of REQUIRED_SHEETS) requireSheet(wb, name);

  return {
    project: parseProject(wb.Sheets.PROJECT),
    sdas:    parseSda(wb.Sheets.SDA),
    cdas:    parseCda(wb.Sheets.CDA),
    bmps:    parseBmp(wb.Sheets.BMP),
    params:  parseParams(wb.Sheets.PARAMS),
  };
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
cd summary_calculator
node --test tests/parse.test.mjs
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add summary_calculator/src/parse.mjs summary_calculator/tests/parse.test.mjs
git commit -m "summary-calculator: add parse module (project, SDA, CDA, BMP, PARAMS)"
```
