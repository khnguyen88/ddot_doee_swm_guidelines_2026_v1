import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rvProvidedPerSda, rvProvidedPerBmp, swrvComplianceTableRows } from '../src/aggregate.mjs';

const params = {
  bmpDesign: {
    'Permeable Pavement / Enhanced': { nReservoir: 0.4, retMultiplier: 1.0 },
    'Bioretention / Enhanced':       { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 },
  },
  treeCredits: { 'T-1 Large': 10, 'T-2 Large': 20 },
};

test('rvProvidedPerSda: PP uses sa*d*n * retMultiplier capped by maxBmpCredit', () => {
  const bmps = [
    { name: 'PP-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Permeable Pavement',
      subType: 'Enhanced', pp: { sa: 100, dReservoir: 1 } },
  ];
  const cdas = [{ cdaId: 'CDA-1', postIn: 10000 }]; // cap = 10000*1.7/12 ≈ 1417
  const result = rvProvidedPerSda(bmps, cdas, params);
  // Sv = 100 * 1 * 0.4 = 40; Rv = 40 * 1 = 40; cap = 1416.67 → not capped
  assert.equal(result['SDA-1'], 40);
});

test('rvProvidedPerSda: PP Rv capped by CDA max credit when oversized', () => {
  const bmps = [
    { name: 'PP-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Permeable Pavement',
      subType: 'Enhanced', pp: { sa: 10000, dReservoir: 5 } }, // Sv = 20000 cf
  ];
  const cdas = [{ cdaId: 'CDA-1', postIn: 100 }]; // cap = 100*1.7/12 ≈ 14.17
  const result = rvProvidedPerSda(bmps, cdas, params);
  const expectedCap = 100 * 1.7 / 12;
  assert.ok(Math.abs(result['SDA-1'] - expectedCap) < 1e-9,
    `expected capped Rv ${expectedCap}, got ${result['SDA-1']}`);
});

test('rvProvidedPerSda: sums multiple BMPs within one SDA', () => {
  const bmps = [
    { name: 'T-1', sdaId: 'SDA-1', type: 'Planted Trees', trees: { plantedLarge: 2 } },
    { name: 'T-2', sdaId: 'SDA-1', type: 'Preserve Trees', trees: { preservedLarge: 3 } },
  ];
  const result = rvProvidedPerSda(bmps, [], params);
  // 2*10 + 3*20 = 80
  assert.equal(result['SDA-1'], 80);
});

test('rvProvidedPerSda: BMP without a CDA entry is NOT capped', () => {
  const bmps = [
    // saPondTop=null → vertical fallback; saTop unused in vertical path
    { name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-X', type: 'Bioretention', subType: 'Enhanced',
      bio: { saBot: 100, saTop: 100, saPondTop: null, dMedia: 2, dGravel: 0.5, dPond: 0.5 } },
  ];
  const result = rvProvidedPerSda(bmps, [], params);
  // Sv = 100 * (2*0.4 + 0.5*0.4 + 0.5) = 100*1.5 = 150
  assert.equal(result['SDA-1'], 150);
});

test('rvProvidedPerSda: empty BMP list returns empty object', () => {
  assert.deepEqual(rvProvidedPerSda([], [], params), {});
});

// ─── rvProvidedPerBmp ────────────────────────────────────────────────────────

test('rvProvidedPerBmp: correct shape, uncapped Bio, capped PP, zero for unsupported', () => {
  const bmps = [
    // Bio with no matching CDA → Sv = 100*(2*0.4 + 0.5*0.4 + 0.5) = 150, Rv = 150*1.0 = 150
    { name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-X', type: 'Bioretention', subType: 'Enhanced',
      bio: { saBot: 100, saTop: 100, saPondTop: null, dMedia: 2, dGravel: 0.5, dPond: 0.5 } },
    // PP with matching CDA → Sv = 10000*5*0.4 = 20000, capped at 100*1.7/12 ≈ 14.17
    { name: 'PP-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Permeable Pavement', subType: 'Enhanced',
      pp: { sa: 10000, dReservoir: 5 } },
    // Unsupported type → rvCf = 0
    { name: 'GR-1', sdaId: 'SDA-2', cdaId: null, type: 'Green Roof', subType: 'Intensive' },
  ];
  const cdas = [{ cdaId: 'CDA-1', postIn: 100 }];
  const result = rvProvidedPerBmp(bmps, cdas, params);

  // Correct length
  assert.equal(result.length, 3);

  // Each row has the required shape keys
  for (const row of result) {
    for (const key of ['name', 'type', 'subType', 'sdaId', 'cdaId', 'rvCf']) {
      assert.ok(key in row, `row missing key: ${key}`);
    }
  }

  // Bio row — uncapped, Rv = 150
  assert.equal(result[0].name, 'B-1');
  assert.equal(result[0].rvCf, 150);

  // PP row — capped at 100*1.7/12
  const expectedCap = 100 * 1.7 / 12;
  assert.ok(Math.abs(result[1].rvCf - expectedCap) < 1e-9,
    `expected capped PP rvCf ${expectedCap}, got ${result[1].rvCf}`);

  // Unsupported type — rvCf = 0
  assert.equal(result[2].rvCf, 0);
});

// ─── swrvComplianceTableRows ─────────────────────────────────────────────────

test('swrvComplianceTableRows: perRow + siteTotal with pass/fail and %', () => {
  const rows = [
    { sdaId: 'SDA-1', swrvReqCf: 100, rvProvidedCf: 150 },
    { sdaId: 'SDA-2', swrvReqCf: 200, rvProvidedCf: 100 },
  ];
  const { perRow, siteTotal } = swrvComplianceTableRows(rows);
  assert.equal(perRow.length, 2);
  assert.equal(perRow[0].pass, true);
  assert.equal(perRow[1].pass, false);
  assert.equal(siteTotal.swrvReqCf, 300);
  assert.equal(siteTotal.rvProvidedCf, 250);
  assert.equal(siteTotal.pass, false);
  assert.equal(siteTotal.status, '✗ FAIL');
});

test('swrvComplianceTableRows: shortStatus=true returns bare ✓/✗ per row', () => {
  const rows = [{ sdaId: 'SDA-1', swrvReqCf: 100, rvProvidedCf: 150 }];
  const { perRow } = swrvComplianceTableRows(rows, true);
  assert.equal(perRow[0].status, '✓');
});

test('rvProvidedPerSda: Bio with saPondTop uses trapezoid pond (higher Rv than vertical fallback)', () => {
  const bmps = [
    { name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
      bio: { saBot: 210, saTop: 210, saPondTop: 294,
             dMedia: 2.0, dGravel: 0.5, dPond: 0.5 } },
  ];
  const cdas = []; // no cap
  const result = rvProvidedPerSda(bmps, cdas, params);
  // media_gravel = 210 × 1.0 = 210; pond trap = 0.5 × (210 + 294) × 0.5 = 126
  // Sv = 336, Rv = 336 × 1.0 = 336
  assert.equal(result['SDA-1'], 336);
});

test('rvProvidedPerSda: Bio without saPondTop uses vertical fallback (backward-compat)', () => {
  const bmps = [
    { name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
      bio: { saBot: 210, saTop: 210, saPondTop: null,
             dMedia: 2.0, dGravel: 0.5, dPond: 0.5 } },
  ];
  const result = rvProvidedPerSda(bmps, [], params);
  // media_gravel = 210; pond vertical = 210 × 0.5 = 105; Sv = 315
  assert.equal(result['SDA-1'], 315);
});

test('rvProvidedPerSda: Dry Swale with full geometry uses wedge pond', () => {
  const bmps = [
    { name: 'S-1', sdaId: 'SDA-1', cdaId: null, type: 'Dry Swale', subType: '—',
      swale: {
        saBot: 400, dMedia: 2.0, dGravel: 0.5, dPond: 1.0,
        length: 100, bottomWidth: 4, invUs: 100.0, invDs: 98.0,
        checkDamHeight: 1.0, checkDamSpacing: 50,
      } },
  ];
  const result = rvProvidedPerSda(bmps, [], {
    bmpDesign: { 'Dry Swale / —': { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 } },
    treeCredits: {},
  });
  // media_gravel = 400 × 1.0 = 400; wedge pond = 2 × 100 = 200; Sv = 600; Rv = 600
  assert.equal(result['SDA-1'], 600);
});

test('rvProvidedPerSda: Dry Swale without geometry falls back to flat-pond formula', () => {
  const bmps = [
    { name: 'S-1', sdaId: 'SDA-1', cdaId: null, type: 'Dry Swale', subType: '—',
      swale: {
        saBot: 400, dMedia: 2.0, dGravel: 0.5, dPond: 1.0,
        length: null, bottomWidth: null, invUs: null, invDs: null,
        checkDamHeight: null, checkDamSpacing: null,
      } },
  ];
  const result = rvProvidedPerSda(bmps, [], {
    bmpDesign: { 'Dry Swale / —': { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 } },
    treeCredits: {},
  });
  // media_gravel = 400; flat pond = 400 × 1.0 = 400; Sv = 800
  assert.equal(result['SDA-1'], 800);
});
