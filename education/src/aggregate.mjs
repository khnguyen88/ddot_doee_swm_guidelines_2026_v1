// src/aggregate.mjs — reusable per-SDA retention aggregator.
// Pure function; no DOM, no SheetJS. Shared by MEP, Compliance, Executive Summary pages
// so Rv-applied is computed in exactly one place.

import {
  ppSizingSv, bioSizingSv, drySwaleSizingSv, rvFromSv,
  maxBmpCredit, treeRetentionCredit,
  compositeCn, scsRunoffDepth, tr55UnitPeakDischarge, tr55PeakDischargeCfs, tcFinalMin,
  LAND_USE_TO_DETENTION_KEY, SQFT_PER_SQMI, DEFAULT_TC_HR,
} from './calc.mjs';

// Sorts by the first run of digits, so SDA-2 precedes SDA-10; non-numeric ids compare as 0.
const _idNum = (s) => Number(String(s).replace(/\D+/g, '')) || 0;

const DEFAULT_PP_DESIGN  = { nReservoir: 0.40, retMultiplier: 1.0 };
const DEFAULT_BIO_DESIGN = { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 };

function _rvForBmp(bmp, cdas, params) {
  if (bmp.type === 'Permeable Pavement' && bmp.pp) {
    const design = params.bmpDesign[`Permeable Pavement / ${bmp.subType}`] || DEFAULT_PP_DESIGN;
    const sv = ppSizingSv(bmp.pp.sa, bmp.pp.dReservoir, design.nReservoir).value;
    const rv = rvFromSv(sv, design.retMultiplier).value;
    const cda = cdas.find(c => c.cdaId === bmp.cdaId);
    return cda ? Math.min(rv, maxBmpCredit(cda.postIn).value) : rv;
  }
  if (bmp.type === 'Bioretention' && bmp.bio) {
    const design = params.bmpDesign[`Bioretention / ${bmp.subType}`] || DEFAULT_BIO_DESIGN;
    const sv = bioSizingSv(
      bmp.bio.saBot, bmp.bio.saTop, bmp.bio.saPondTop,
      bmp.bio.dMedia, design.nMedia,
      bmp.bio.dGravel, design.nGravel, bmp.bio.dPond,
    ).value;
    const rv = rvFromSv(sv, design.retMultiplier).value;
    const cda = cdas.find(c => c.cdaId === bmp.cdaId);
    return cda ? Math.min(rv, maxBmpCredit(cda.postIn).value) : rv;
  }
  if (bmp.type === 'Dry Swale' && bmp.swale) {
    const design = params.bmpDesign[`Dry Swale / ${bmp.subType}`] || DEFAULT_BIO_DESIGN;
    const sv = drySwaleSizingSv({
      saBot: bmp.swale.saBot,
      dMedia: bmp.swale.dMedia, nMedia: design.nMedia,
      dGravel: bmp.swale.dGravel, nGravel: design.nGravel,
      dPond: bmp.swale.dPond,
      length: bmp.swale.length, bottomWidth: bmp.swale.bottomWidth,
      invUs: bmp.swale.invUs, invDs: bmp.swale.invDs,
      checkDamHeight: bmp.swale.checkDamHeight,
      checkDamSpacing: bmp.swale.checkDamSpacing,
    }).value;
    const rv = rvFromSv(sv, design.retMultiplier).value;
    const cda = cdas.find(c => c.cdaId === bmp.cdaId);
    return cda ? Math.min(rv, maxBmpCredit(cda.postIn).value) : rv;
  }
  if ((bmp.type === 'Planted Trees' || bmp.type === 'Preserve Trees') && bmp.trees) {
    return treeRetentionCredit(bmp.trees, params.treeCredits).value;
  }
  return 0;
}

export function rvProvidedPerSda(bmps, cdas, params) {
  const out = {};
  for (const bmp of bmps) {
    const rv = _rvForBmp(bmp, cdas, params);
    if (!rv) continue;
    out[bmp.sdaId] = (out[bmp.sdaId] || 0) + rv;
  }
  return out;
}

export function rvProvidedPerBmp(bmps, cdas, params) {
  return bmps.map(bmp => ({
    name: bmp.name,
    type: bmp.type,
    subType: bmp.subType,
    sdaId: bmp.sdaId,
    cdaId: bmp.cdaId,
    rvCf: _rvForBmp(bmp, cdas, params),
  }));
}

// Build SWRv-compliance table rows (SDA + totals) from compliance rows.
// Used by both the detailed Compliance page and the compact Executive Summary.
// `shortStatus = true` returns bare ✓/✗ (compact), false returns ✓ PASS / ✗ FAIL (verbose).
export function swrvComplianceTableRows(rows, shortStatus = false) {
  const perRow = rows.map(r => {
    const pct = r.swrvReqCf > 0 ? (r.rvProvidedCf / r.swrvReqCf * 100) : 0;
    const pass = r.rvProvidedCf >= r.swrvReqCf || r.swrvReqCf === 0;
    const status = shortStatus
      ? (pass ? '✓' : '✗')
      : (pass ? '✓ PASS' : '✗ FAIL');
    return { sdaId: r.sdaId, swrvReqCf: r.swrvReqCf, rvProvidedCf: r.rvProvidedCf,
             pct, pass, status };
  });
  const totalReq      = rows.reduce((s, r) => s + r.swrvReqCf, 0);
  const totalProvided = rows.reduce((s, r) => s + r.rvProvidedCf, 0);
  const sitePass = totalProvided >= totalReq;
  const siteTotal = {
    sdaId: 'SITE TOTAL',
    swrvReqCf: totalReq,
    rvProvidedCf: totalProvided,
    pct: totalReq > 0 ? totalProvided / totalReq * 100 : 0,
    pass: sitePass,
    status: sitePass ? '✓ PASS' : '✗ FAIL',
  };
  return { perRow, siteTotal };
}

export function areaSummaryRollup(sdaExisting, sdaProposed, cdaExisting, cdaProposed, swrvBySda = {}) {
  const _sumBy = (rows, sdaId, landUse) =>
    rows.filter(r => r.sdaId === sdaId && r.landUse === landUse)
        .reduce((a, r) => a + (r.areaIn || 0), 0);

  const _impSum = (rows, sdaId) =>
    _sumBy(rows, sdaId, 'Impervious Vehicular') +
    _sumBy(rows, sdaId, 'Impervious Non-Vehicular');

  const sdaIds = new Set([
    ...sdaExisting.map(r => r.sdaId),
    ...sdaProposed.map(r => r.sdaId),
  ].filter(Boolean));

  const sdaRows = [...sdaIds].sort((a, b) => _idNum(a) - _idNum(b)).map(sdaId => {
    const preImp  = _impSum(sdaExisting, sdaId);
    const preComp = _sumBy(sdaExisting, sdaId, 'Compacted (Open Space)');
    const preNat  = _sumBy(sdaExisting, sdaId, 'Natural (Woods)');
    const preTotal = preImp + preComp + preNat;
    const postImp  = _impSum(sdaProposed, sdaId);
    const postComp = _sumBy(sdaProposed, sdaId, 'Compacted (Open Space)');
    const postNat  = _sumBy(sdaProposed, sdaId, 'Natural (Woods)');
    const postBmp  = _sumBy(sdaProposed, sdaId, 'BMP');
    const postTotal = postImp + postComp + postNat + postBmp;
    const hasPre  = sdaExisting.some(r => r.sdaId === sdaId);
    const hasPost = sdaProposed.some(r => r.sdaId === sdaId);
    const areaMatch = (!hasPre || !hasPost) ? '—'
                    : Math.abs(postTotal - preTotal) <= 1 ? 'OK'
                    : 'MISMATCH';
    return { sdaId, preImp, preComp, preNat, preTotal,
             postImp, postComp, postNat, postBmp, postTotal,
             swrvReq: swrvBySda[sdaId] ?? 0, areaMatch };
  });

  const cdaIds = new Set([
    ...cdaExisting.map(r => r.cdaId),
    ...cdaProposed.map(r => r.cdaId),
  ].filter(Boolean));

  const cdaRows = [...cdaIds].sort((a, b) => _idNum(a) - _idNum(b)).map(cdaId => {
    const preTotal  = cdaExisting.filter(r => r.cdaId === cdaId)
                                 .reduce((a, r) => a + (r.areaIn || 0), 0);
    const postTotal = cdaProposed.filter(r => r.cdaId === cdaId)
                                 .reduce((a, r) => a + (r.areaIn || 0), 0);
    const sdaId = (cdaProposed.find(r => r.cdaId === cdaId) || {}).sdaId
               || (cdaExisting.find(r => r.cdaId === cdaId) || {}).sdaId
               || '';
    const hasPre  = cdaExisting.some(r => r.cdaId === cdaId);
    const hasPost = cdaProposed.some(r => r.cdaId === cdaId);
    const areaMatch = (!hasPre || !hasPost) ? '—'
                    : Math.abs(postTotal - preTotal) <= 1 ? 'OK'
                    : 'MISMATCH';
    const maxCredit = maxBmpCredit(postTotal).value;
    return { cdaId, sdaId, preTotal, postTotal, maxBmpCredit: maxCredit, areaMatch };
  });

  return { sdaRows, cdaRows };
}

// ─── TR-55 Graphical Peak Discharge roll-up ────────────────────────────────
// Mirrors workbook/builders/peak_discharge.py. Computes Qp per SDA for the
// 2-yr and 15-yr storms from the raw SDA rows, PARAMS tables, and TC_PATH.

export function peakDischargeRollup(existingRows, proposedRows, tcPaths, params) {
  const p2In = params?.detention?.p2In;
  const p15In = params?.detention?.p15In;
  if (!(p2In > 0) || !(p15In > 0)) return [];

  // Group raw rows by their SDA ID, preserving first-appearance order.
  const postBy = new Map();
  for (const r of proposedRows) {
    if (!r.sdaId) continue;
    if (!postBy.has(r.sdaId)) postBy.set(r.sdaId, []);
    postBy.get(r.sdaId).push(r);
  }
  const preBy = new Map();
  for (const r of existingRows) {
    if (!r.sdaId) continue;
    if (!preBy.has(r.sdaId)) preBy.set(r.sdaId, []);
    preBy.get(r.sdaId).push(r);
  }

  const _areasFor = (rows) => {
    const out = { Natural: 0, Compacted: 0, Impervious: 0, BMP: 0 };
    for (const r of rows || []) {
      const k = LAND_USE_TO_DETENTION_KEY[r.landUse];
      if (k) out[k] += r.areaIn || 0;
    }
    return out;
  };

  // Union of proposed and existing SDA IDs (proposed first), ordered numerically.
  const areaIds = new Set([...postBy.keys(), ...preBy.keys()]);
  const orderedIds = [...areaIds].sort((a, b) => _idNum(a) - _idNum(b));

  return orderedIds.map(sdaId => {
    const postRows = postBy.get(sdaId) || [];
    // Missing Existing rows model a zero baseline: no pre areas → composite CN 0
    // → zero pre-storm runoff (Q = 0) and zero pre-storm Qp.
    const preRows  = preBy.get(sdaId) || [];
    const preAreas  = _areasFor(preRows);
    const postAreas = _areasFor(postRows);
    const cnPre  = compositeCn(preAreas,  params.detentionCn).value;
    const cnPost = compositeCn(postAreas, params.detentionCn).value;

    const areaSf  = postRows.reduce((s, r) => s + (r.areaIn || 0), 0);
    const areaMi2 = areaSf / SQFT_PER_SQMI;

    const p = (tcPaths || []).find(t => t.pathId === sdaId);
    const tcMin = p ? tcFinalMin(p.tcDirectMin, p.segments) : null;
    const tcHr = tcMin != null ? tcMin / 60 : DEFAULT_TC_HR;

    const sPre  = cnPre  > 0 ? 1000 / cnPre  - 10 : 0;
    const sPost = cnPost > 0 ? 1000 / cnPost - 10 : 0;

    const _storm = (P, s, cn) => {
      const iaP = s > 0 ? 0.2 * s / P : 0;
      const qu = tr55UnitPeakDischarge(tcHr, iaP, params.tr55);
      const q = scsRunoffDepth(P, cn);
      const qp = tr55PeakDischargeCfs(qu, areaMi2, q);
      return { iaP, qu, q, qp };
    };
    const pre2  = _storm(p2In,  sPre,  cnPre);
    const post2 = _storm(p2In,  sPost, cnPost);
    const pre15 = _storm(p15In, sPre,  cnPre);
    const post15 = _storm(p15In, sPost, cnPost);

    return {
      areaId: sdaId,
      areaSf, areaMi2, tcHr, cnPre, cnPost, p2In, p15In,
      iaOverP2yrPre: pre2.iaP, iaOverP2yrPost: post2.iaP,
      qu2yrPre: pre2.qu, qu2yrPost: post2.qu,
      qPre2yr: pre2.q, qPost2yr: post2.q,
      qpPre2yr: pre2.qp, qpPost2yr: post2.qp,
      iaOverP15yrPre: pre15.iaP, iaOverP15yrPost: post15.iaP,
      qu15yrPre: pre15.qu, qu15yrPost: post15.qu,
      qPre15yr: pre15.q, qPost15yr: post15.q,
      qpPre15yr: pre15.qp, qpPost15yr: post15.qp,
    };
  });
}
