import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rvProvidedPerSda, rvProvidedPerBmp, swrvComplianceTableRows, areaSummaryRollup, peakDischargeRollup } from '../src/aggregate.mjs';

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

// ─── areaSummaryRollup ───────────────────────────────────────────────────────

test('areaSummaryRollup: splits Pre/Post by land use and flags Area Match', () => {
  const sdaExisting = [
    { sdaId: 'SDA-1', landUse: 'Impervious Vehicular',     areaIn: 1000 },
    { sdaId: 'SDA-1', landUse: 'Impervious Non-Vehicular', areaIn: 500 },
    { sdaId: 'SDA-1', landUse: 'Compacted (Open Space)',   areaIn: 200 },
    { sdaId: 'SDA-1', landUse: 'Natural (Woods)',          areaIn: 100 },
  ];
  const sdaProposed = [
    { sdaId: 'SDA-1', landUse: 'Impervious Vehicular',     areaIn: 1000 },
    { sdaId: 'SDA-1', landUse: 'Impervious Non-Vehicular', areaIn: 500 },
    { sdaId: 'SDA-1', landUse: 'Compacted (Open Space)',   areaIn: 200 },
    { sdaId: 'SDA-1', landUse: 'Natural (Woods)',          areaIn: 100 },
    { sdaId: 'SDA-1', landUse: 'BMP',                      areaIn: 0   },
  ];
  const cdaExisting = [{ cdaId: 'CDA-1', sdaId: 'SDA-1', areaIn: 500 }];
  const cdaProposed = [{ cdaId: 'CDA-1', sdaId: 'SDA-1', areaIn: 500 }];
  const r = areaSummaryRollup(sdaExisting, sdaProposed, cdaExisting, cdaProposed);
  assert.equal(r.sdaRows.length, 1);
  assert.equal(r.sdaRows[0].preImp, 1500);
  assert.equal(r.sdaRows[0].preTotal, 1800);
  assert.equal(r.sdaRows[0].postTotal, 1800);
  assert.equal(r.sdaRows[0].areaMatch, 'OK');
  assert.equal(r.cdaRows[0].maxBmpCredit, 500 * 1.7 / 12);
  assert.equal(r.cdaRows[0].areaMatch, 'OK');
});

test('areaSummaryRollup: flags MISMATCH when Pre differs from Post by > 1 SF', () => {
  const sdaExisting = [{ sdaId: 'SDA-2', landUse: 'Impervious Vehicular', areaIn: 1000 }];
  const sdaProposed = [{ sdaId: 'SDA-2', landUse: 'Impervious Vehicular', areaIn: 1100 }];
  const r = areaSummaryRollup(sdaExisting, sdaProposed, [], []);
  assert.equal(r.sdaRows[0].areaMatch, 'MISMATCH');
});

test('areaSummaryRollup: em-dash when Pre or Post missing', () => {
  const r = areaSummaryRollup(
    [{ sdaId: 'SDA-3', landUse: 'Impervious Vehicular', areaIn: 500 }],
    [],
    [], [],
  );
  assert.equal(r.sdaRows[0].areaMatch, '—');
});

test('areaSummaryRollup: numeric ID order (SDA-2 before SDA-10)', () => {
  const e = [
    { sdaId: 'SDA-10', landUse: 'Impervious Vehicular', areaIn: 10 },
    { sdaId: 'SDA-2',  landUse: 'Impervious Vehicular', areaIn: 20 },
    { sdaId: 'SDA-1',  landUse: 'Impervious Vehicular', areaIn: 30 },
  ];
  const r = areaSummaryRollup(e, e, [], []);
  assert.deepEqual(r.sdaRows.map(x => x.sdaId), ['SDA-1', 'SDA-2', 'SDA-10']);
});

test('areaSummaryRollup: ±1 SF tolerance boundary is OK', () => {
  const r = areaSummaryRollup(
    [{ sdaId: 'SDA-1', landUse: 'Impervious Vehicular', areaIn: 1000 }],
    [{ sdaId: 'SDA-1', landUse: 'Impervious Vehicular', areaIn: 1001 }],
    [], [],
  );
  assert.equal(r.sdaRows[0].areaMatch, 'OK');
});

test('areaSummaryRollup: BMP area counts only toward Post total', () => {
  const e = [{ sdaId: 'SDA-1', landUse: 'Impervious Vehicular', areaIn: 1000 }];
  const p = [
    { sdaId: 'SDA-1', landUse: 'Impervious Vehicular', areaIn: 800 },
    { sdaId: 'SDA-1', landUse: 'BMP', areaIn: 200 },
  ];
  const r = areaSummaryRollup(e, p, [], []);
  assert.equal(r.sdaRows[0].preTotal, 1000);
  assert.equal(r.sdaRows[0].postBmp, 200);
  assert.equal(r.sdaRows[0].postTotal, 1000);
});

test('areaSummaryRollup: fills swrvReq from the optional swrvBySda map', () => {
  const e = [{ sdaId: 'SDA-1', landUse: 'Impervious Vehicular', areaIn: 1000 }];
  const r = areaSummaryRollup(e, e, [], [], { 'SDA-1': 180 });
  assert.equal(r.sdaRows[0].swrvReq, 180);
});

// ─── peakDischargeRollup ─────────────────────────────────────────────────────

const FULL_TR55 = [
  [0.10,2.55323,-0.61512,-0.16403],[0.30,2.46532,-0.62257,-0.11657],
  [0.35,2.41896,-0.61594,-0.08820],[0.40,2.36409,-0.59857,-0.05621],
  [0.45,2.29238,-0.57005,-0.02281],[0.50,2.20282,-0.51599,-0.01259],
];
const peakExisting = [{ sdaId:'SDA-1', landUse:'Natural (Woods)', areaIn:43560, areaOut:0 }];
const peakProposed = [
  { sdaId:'SDA-1', landUse:'Impervious Vehicular', areaIn:21780, areaOut:0 },
  { sdaId:'SDA-1', landUse:'Compacted (Open Space)', areaIn:21780, areaOut:0 },
];
const peakTcPaths = [{ pathId:'SDA-1', tcDirectMin:30, segments:[] }];
const peakParams = {
  detention: { p2In:3.14, p15In:5.23 },
  detentionCn: { Natural:70, Compacted:74, Impervious:98, BMP:98 },
  tr55: FULL_TR55,
};
test('peakDischargeRollup: per-SDA CN, qu, Q, Qp for 2yr and 15yr', () => {
  const [r] = peakDischargeRollup(peakExisting, peakProposed, peakTcPaths, peakParams);
  assert.equal(r.areaId, 'SDA-1');
  assert.equal(r.areaSf, 43560);
  assert.ok(Math.abs(r.areaMi2 - 0.0015625) < 1e-9);
  assert.ok(Math.abs(r.tcHr - 0.5) < 1e-9);
  assert.ok(Math.abs(r.cnPre - 70) < 1e-9);
  assert.ok(Math.abs(r.cnPost - 86) < 1e-9);
  // Hand-computed from the Excel formulas (tolerance 0.01):
  assert.ok(Math.abs(r.iaOverP2yrPre  - 0.27298) < 1e-4, `iaP2pre=${r.iaOverP2yrPre}`);
  assert.ok(Math.abs(r.qu2yrPre       - 449.949) < 0.01, `qu2pre=${r.qu2yrPre}`);
  assert.ok(Math.abs(r.qPre2yr        - 0.79339) < 1e-4, `Q2pre=${r.qPre2yr}`);
  assert.ok(Math.abs(r.qpPre2yr       - 0.55779) < 1e-4, `Qp2pre=${r.qpPre2yr}`);
  assert.ok(Math.abs(r.qu2yrPost      - 527.272) < 0.01, `qu2post=${r.qu2yrPost}`);
  assert.ok(Math.abs(r.qPost2yr       - 1.78306) < 1e-4, `Q2post=${r.qPost2yr}`);
  assert.ok(Math.abs(r.qpPost2yr      - 1.46900) < 1e-4, `Qp2post=${r.qpPost2yr}`);
  assert.ok(Math.abs(r.qu15yrPre      - 498.360) < 0.01, `qu15pre=${r.qu15yrPre}`);
  assert.ok(Math.abs(r.qpPre15yr      - 1.71968) < 1e-4, `Qp15pre=${r.qpPre15yr}`);
  assert.ok(Math.abs(r.qu15yrPost     - 529.097) < 0.01, `qu15post=${r.qu15yrPost}`);
  assert.ok(Math.abs(r.qpPost15yr     - 3.04413) < 1e-4, `Qp15post=${r.qpPost15yr}`);
});

test('peakDischargeRollup: no TC_PATH row falls back to 0.1 hr', () => {
  const [r] = peakDischargeRollup(peakExisting, peakProposed, [], peakParams);
  assert.equal(r.tcHr, 0.1);
});

test('peakDischargeRollup: missing Existing rows model a zero baseline', () => {
  // No existing-condition rows for SDA-1 → pre areas are all zero → composite
  // CN 0 → zero pre run-off (Q) and zero pre Qp. This treats a missing existing
  // condition as a zero-runoff baseline.
  const [r] = peakDischargeRollup([], peakProposed, peakTcPaths, peakParams);
  assert.equal(r.cnPre, 0);
  assert.equal(r.qPre2yr, 0);
  assert.equal(r.qpPre2yr, 0);
});

test('peakDischargeRollup: existing-only SDA included, IDs ordered numerically', () => {
  const existing = [{ sdaId: 'SDA-2', landUse: 'Natural (Woods)', areaIn: 43560 }];
  const proposed = [{ sdaId: 'SDA-10', landUse: 'Impervious Vehicular', areaIn: 21780 }];
  const rows = peakDischargeRollup(existing, proposed, [], peakParams);
  assert.deepEqual(rows.map(r => r.areaId), ['SDA-2', 'SDA-10']);
});

test('peakDischargeRollup: fewer than 2 TR-55 bins → null qu/Qp, row still returned', () => {
  const params = { ...peakParams, tr55: [FULL_TR55[0]] };
  const rows = peakDischargeRollup(peakExisting, peakProposed, peakTcPaths, params);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].qu2yrPre, null);
  assert.equal(rows[0].qpPre2yr, null);
});

test('peakDischargeRollup: CDA grouping with idKey="cdaId" and sdaId join', () => {
  const exCda = [{ cdaId:'CDA-1', sdaId:'SDA-1', landUse:'Natural (Woods)', areaIn:21780, areaOut:0 }];
  const prCda = [{ cdaId:'CDA-1', sdaId:'SDA-1', landUse:'Impervious Vehicular', areaIn:21780 }];
  const tc = [{ pathId:'CDA-1', tcDirectMin:18, segments:[] }];
  const [r] = peakDischargeRollup(exCda, prCda, tc, peakParams, 'cdaId');
  assert.equal(r.areaId, 'CDA-1');
  assert.equal(r.sdaId, 'SDA-1');
  assert.equal(r.areaSf, 21780);
  assert.ok(Math.abs(r.areaMi2 - 0.00078125) < 1e-12);
  assert.ok(Math.abs(r.tcHr - 0.3) < 1e-9);
  assert.ok(Math.abs(r.cnPre - 70) < 1e-9);
  assert.ok(Math.abs(r.cnPost - 98) < 1e-9);
  // Hand-computed from the Excel formulas (Tc=0.3 hr, P2=3.14, P15=5.23):
  assert.ok(Math.abs(r.qu2yrPre   - 586.918) < 0.01, `qu2pre=${r.qu2yrPre}`);
  assert.ok(Math.abs(r.qpPre2yr   - 0.363792) < 1e-4, `Qp2pre=${r.qpPre2yr}`);
  assert.ok(Math.abs(r.qu2yrPost  - 676.110) < 0.01, `qu2post=${r.qu2yrPost}`);
  assert.ok(Math.abs(r.qpPost2yr  - 1.535883) < 1e-4, `Qp2post=${r.qpPost2yr}`);
  assert.ok(Math.abs(r.qu15yrPre  - 641.688) < 0.01, `qu15pre=${r.qu15yrPre}`);
  assert.ok(Math.abs(r.qpPre15yr  - 1.107129) < 1e-4, `Qp15pre=${r.qpPre15yr}`);
  assert.ok(Math.abs(r.qu15yrPost - 676.110) < 0.01, `qu15post=${r.qu15yrPost}`);
  assert.ok(Math.abs(r.qpPost15yr - 2.637262) < 1e-4, `Qp15post=${r.qpPost15yr}`);
});
