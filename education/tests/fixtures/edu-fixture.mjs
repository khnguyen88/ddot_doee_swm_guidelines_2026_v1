// education/tests/fixtures/edu-fixture.mjs
//
// Shared hand-crafted fixture for the new render…EduPage unit tests
// (Task 7.1-7.5 of the 2026-11-18 education new-features plan).
//
// Goal: a small, fast-loading, parsed-style object that exercises every
// field each render function touches, with round numbers that are easy
// to eyeball when debugging. This is NOT a stand-in for the bundled
// Minnesota Ave / Trail xlsx fixtures — those remain the integration
// surface. This fixture lets each new-page test import a known-shape
// object in a few milliseconds instead of parsing a 100 KB workbook.
//
// Shape mirrors parseWorkbook() output in education/src/parse.mjs:
//   - project: { name, rainfallIn, rainfallEisa, ... }
//   - parsed:  { sdaExisting, sdaProposed, cdaExisting, cdaProposed,
//                bmps, tcPaths, params }
//   - Plus the already-computed rollups each render function reads:
//     areaSummary, tcPaths (with tcMin), peakSda, peakCda,
//     detentionBmp, eisaTimestep.

import { tcFinalMin, eisaTimestepTrace } from '../../src/calc.mjs';
import {
  areaSummaryRollup, peakDischargeRollup, detentionBmpRollup,
} from '../../src/aggregate.mjs';

export function buildEduFixture() {
  // ── PROJECT ────────────────────────────────────────────────────────
  const project = {
    name: 'Edu Test Project',
    number: 'EDU-0001',
    ms4: 'Yes',
    awdz: 'No',
    doeeReview: 'MLD',
    totalLod: 20000,
    rainfallRetention: 1.2,
    rainfallEisa: 1.7,
    rainfallIn: 1.2,       // alias set by parseWorkbook()
    trigger: 'MLD',
    eisa438Applies: 'Yes',
  };

  // ── PARAMS (parseParams shape) ─────────────────────────────────────
  const params = {
    rv: {
      'Impervious Vehicular':     0.95,
      'Impervious Non-Vehicular': 0.95,
      'Compacted (Open Space)':   0.25,
      'Natural (Woods)':          0.00,
      'BMP':                      0.00,
    },
    cn: {
      'Impervious Vehicular':     { A: 98, B: 98, C: 98, D: 98 },
      'Impervious Non-Vehicular': { A: 98, B: 98, C: 98, D: 98 },
      'Natural (Woods)':          { A: 25, B: 55, C: 70, D: 77 },
      'Compacted (Open Space)':   { A: 39, B: 61, C: 74, D: 80 },
    },
    // Key format: `${type} / ${subType}` (see aggregate.mjs _svForBmp).
    bmpDesign: {
      'Permeable Pavement / Enhanced':
        { nMedia: null, nGravel: null, nReservoir: 0.40, retMultiplier: 1.0, maxDrawdownDays: 2 },
      'Permeable Pavement / Underdrained Enhanced':
        { nMedia: null, nGravel: null, nReservoir: 0.40, retMultiplier: 0.6, maxDrawdownDays: 2 },
      'Bioretention / Standard':
        { nMedia: 0.25, nGravel: 0.40, nReservoir: null, retMultiplier: 0.6, maxDrawdownDays: 3 },
      'Bioretention / Enhanced':
        { nMedia: 0.25, nGravel: 0.40, nReservoir: null, retMultiplier: 1.0, maxDrawdownDays: 3 },
      'Bioretention / Enhanced w/ Underdrain':
        { nMedia: 0.25, nGravel: 0.40, nReservoir: null, retMultiplier: 1.0, maxDrawdownDays: 3 },
      'Dry Swale / —':
        { nMedia: 0.25, nGravel: 0.40, nReservoir: null, retMultiplier: 0.6, maxDrawdownDays: 3 },
      'Wet Swale / —':
        { nMedia: null, nGravel: null, nReservoir: null, retMultiplier: 0.1, maxDrawdownDays: null },
    },
    treeCredits: {
      'T-1 Small':    5,
      'T-1 Large':    10,
      'T-2 Small':    10,
      'T-2 Large':    20,
      'T-2 Special':  30,
      'T-2 Heritage': 40,
    },
    detention: { p2In: 3.14, p15In: 5.23, p100In: 8.34 },
    detentionCn: { Natural: 70, Compacted: 74, Impervious: 98, BMP: 98 },
    // TR-55 Appendix F: Ia/P, C0, C1, C2. Two rows is the minimum
    // peakDischargeRollup's interpolation bracket requires. These are
    // the real 0.10 / 0.30 coefficients from TR-55 Exhibit 4-II.
    tr55: [
      [0.10, 2.55323, -0.61512, -0.16403],
      [0.30, 2.46532, -0.62257, -0.11657],
    ],
    // Horton: all four HSGs so eisaTimestepTrace's area-weighted average
    // can resolve any row, even if the actual area rows only use HSG B.
    horton: {
      A: { fMax: 8.0, fMin: 0.5, k: 1.5 },
      B: { fMax: 5.0, fMin: 0.3, k: 2.0 },
      C: { fMax: 3.0, fMin: 0.1, k: 3.5 },
      D: { fMax: 1.0, fMin: 0.05, k: 5.0 },
    },
  };

  // ── SDA rows (split existing/proposed) ─────────────────────────────
  // Round areas (10 000 sf total) that produce non-zero every column:
  //   Existing: 6 000 imp-veh (B) + 4 000 compacted (B)
  //   Proposed: 4 000 imp-veh (B) + 2 000 compacted (B) + 4 000 BMP (B)
  const sdaExisting = [
    { sdaId: 'SDA-1', inProw: 'No', landUse: 'Impervious Vehicular',   hsg: 'B', areaIn: 6000, areaOut: 0 },
    { sdaId: 'SDA-1', inProw: 'No', landUse: 'Compacted (Open Space)', hsg: 'B', areaIn: 4000, areaOut: 0 },
  ];
  const sdaProposed = [
    { sdaId: 'SDA-1', inProw: 'No', landUse: 'Impervious Vehicular',   hsg: 'B', areaIn: 4000, areaOut: 0 },
    { sdaId: 'SDA-1', inProw: 'No', landUse: 'Compacted (Open Space)', hsg: 'B', areaIn: 2000, areaOut: 0 },
    { sdaId: 'SDA-1', inProw: 'No', landUse: 'BMP',                    hsg: 'B', areaIn: 4000, areaOut: 0 },
  ];

  // ── CDA rows ───────────────────────────────────────────────────────
  // CDA-1 nested under SDA-1. 6 000 sf of impervious flows to one
  // bioretention BMP. Max credit = 6000 × 1.7 / 12 = 850 cf.
  const cdaExisting = [
    { cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular',   hsg: 'B', areaIn: 6000, areaOut: 0 },
  ];
  const cdaProposed = [
    { cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'Impervious Vehicular',   hsg: 'B', areaIn: 4000, areaOut: 0 },
    { cdaId: 'CDA-1', sdaId: 'SDA-1', landUse: 'BMP',                    hsg: 'B', areaIn: 2000, areaOut: 0 },
  ];

  // ── BMPs ───────────────────────────────────────────────────────────
  // One Bioretention (Enhanced) with round geometry.
  //   Sv = saBot·(d_media·n_media + d_gravel·n_gravel) + saBot·d_pond
  //      = 400·(2·0.25 + 1·0.40) + 400·0.5 = 400·0.9 + 200 = 560 cf
  //   Rv = Sv × 1.0 = 560 cf   (bounded by CDA max credit of 850 → 560)
  const bmps = [
    {
      name: 'BMP-1',
      sdaId: 'SDA-1',
      cdaId: 'CDA-1',
      type: 'Bioretention',
      subType: 'Enhanced',
      bio: {
        saTop:        500,
        saBot:        400,
        dMedia:       2.0,
        dGravel:      1.0,
        dPond:        0.5,
        saPondTop:    null,
        topElev:      null,
        overflowElev: null,
        sidewalkElev: null,
        curbCutElev:  null,
      },
    },
  ];

  // ── TC paths ───────────────────────────────────────────────────────
  // One path named to match SDA-1 / CDA-1 for the peak-discharge rollup
  // join (tcPaths.find(t => t.pathId === areaId)). Exercises sheet +
  // shallow + channel segment types so the TC render path sees all three.
  const tcPaths = [
    {
      pathId: 'SDA-1',
      name: 'Primary flow path',
      tcDirectMin: null,
      segments: [
        { type: 'sheet',   length: 100, slope: 0.02, n: 0.15, P2: 3.14 },
        { type: 'shallow', length: 200, slope: 0.03, surface: 'unpaved' },
        { type: 'channel', length: 400, velocity: 3.0 },
      ],
    },
    {
      pathId: 'CDA-1',
      name: 'CDA flow path',
      tcDirectMin: null,
      segments: [
        { type: 'sheet',   length: 80,  slope: 0.02, n: 0.15, P2: 3.14 },
        { type: 'shallow', length: 150, slope: 0.03, surface: 'paved' },
        { type: 'channel', length: 300, velocity: 3.0 },
      ],
    },
  ];

  // ── Rollups (same calls ui.mjs makes) ──────────────────────────────
  const areaSummary = areaSummaryRollup(
    sdaExisting, sdaProposed, cdaExisting, cdaProposed, {},
  );
  const tcPathsWithTc = tcPaths.map(p => ({
    ...p, tcMin: tcFinalMin(p.tcDirectMin, p.segments),
  }));
  const peakSda = peakDischargeRollup(
    sdaExisting, sdaProposed, tcPaths, params,
  );
  const peakCda = peakDischargeRollup(
    cdaExisting, cdaProposed, tcPaths, params, 'cdaId',
  );
  const detentionBmp = detentionBmpRollup(
    cdaExisting, cdaProposed, bmps, params,
  );
  // eisaTimestepTrace reads s.preIn / s.postIn on each row, so it needs
  // the MERGED compat shape (same one parseWorkbook() exposes as `sdas`),
  // not the split *_Proposed array. Build it inline — the real parser's
  // _mergeSdaCompat is not exported.
  const _mergeKey = (r) => `${r.sdaId}|${r.landUse}|${r.hsg || ''}`;
  const sdasMerged = (() => {
    const by = new Map();
    for (const r of sdaExisting) {
      by.set(_mergeKey(r), {
        sdaId: r.sdaId, inProw: r.inProw, landUse: r.landUse, hsg: r.hsg,
        preIn: r.areaIn || 0, preOut: r.areaOut || 0, postIn: 0, postOut: 0,
      });
    }
    for (const r of sdaProposed) {
      const k = _mergeKey(r);
      const row = by.get(k) || {
        sdaId: r.sdaId, inProw: r.inProw, landUse: r.landUse, hsg: r.hsg,
        preIn: 0, preOut: 0, postIn: 0, postOut: 0,
      };
      row.postIn = r.areaIn || 0;
      row.postOut = r.areaOut || 0;
      by.set(k, row);
    }
    return [...by.values()];
  })();
  const eisaTimestep = eisaTimestepTrace({
    sdas: sdasMerged,
    bmps,
    params,
    P: project.rainfallEisa,
    lossModel: 'horton',
  });

  return {
    project,
    params,
    parsed: {
      sdaExisting, sdaProposed, cdaExisting, cdaProposed,
      bmps, tcPaths, params,
    },
    areaSummary,
    tcPaths: tcPathsWithTc,
    peakSda,
    peakCda,
    detentionBmp,
    eisaTimestep,
  };
}
