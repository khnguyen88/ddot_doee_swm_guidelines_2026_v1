// src/aggregate.mjs — reusable per-SDA retention aggregator.
// Pure function; no DOM, no SheetJS. Shared by MEP, Compliance, Executive Summary pages
// so Rv-applied is computed in exactly one place.

import {
  ppSizingSv, bioSizingSv, drySwaleSizingSv, rvFromSv,
  maxBmpCredit, treeRetentionCredit,
} from './calc.mjs';

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
