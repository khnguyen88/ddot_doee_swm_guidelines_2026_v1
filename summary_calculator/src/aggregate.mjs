// src/aggregate.mjs — reusable per-SDA retention aggregator.
// Pure function; no DOM, no SheetJS. Shared by MEP, Compliance, Executive Summary pages
// so Rv-applied is computed in exactly one place.

import {
  ppSizingSv, bioSizingSv, rvFromSv, maxBmpCredit, treeRetentionCredit,
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
  if ((bmp.type === 'Bioretention' || bmp.type === 'Dry Swale') && bmp.bio) {
    const design = params.bmpDesign[`${bmp.type} / ${bmp.subType}`] || DEFAULT_BIO_DESIGN;
    const sv = bioSizingSv(
      bmp.bio.saBot, bmp.bio.dMedia, design.nMedia,
      bmp.bio.dGravel, design.nGravel, bmp.bio.dPond,
    ).value;
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
