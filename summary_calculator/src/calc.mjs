// src/calc.mjs — pure calculation engine. Mirrors workbook/calculations.py.
// All volumes in cubic feet (CF), depths in inches, areas in square feet.

export const RV = {
  'Impervious Vehicular':     0.95,
  'Impervious Non-Vehicular': 0.95,
  'Compacted (Open Space)':   0.25,
  'Natural (Woods)':          0.00,
  'BMP':                      0.00,
};

export const CN = {
  'Impervious Vehicular':     { A: 98, B: 98, C: 98, D: 98 },
  'Impervious Non-Vehicular': { A: 98, B: 98, C: 98, D: 98 },
  'BMP':                      { A: 98, B: 98, C: 98, D: 98 },
  'Natural (Woods)':          { A: 25, B: 55, C: 70, D: 77 },
  'Compacted (Open Space)':   { A: 39, B: 61, C: 74, D: 80 },
};

const HORTON = {
  B: { fMax: 5.0, fMin: 0.3, k: 2.0 },
  C: { fMax: 3.0, fMin: 0.1, k: 3.5 },
};

const DEPRESSION_IMPERVIOUS = 0.1;
const DEPRESSION_PERVIOUS   = 0.2;

const IMPERVIOUS_LAND_USES = new Set([
  'Impervious Vehicular', 'Impervious Non-Vehicular', 'BMP',
]);

// ─── Formatting helpers ──────────────────────────────────────────────────────
const fmt = (n, places = 2) => {
  if (n === 0) return '0';
  if (Math.abs(n) < 0.01 && n !== 0) return n.toExponential(2);
  return n.toFixed(places).replace(/\.?0+$/, '');
};

// ─── SWRv ────────────────────────────────────────────────────────────────────
export function swrvVolume(areas, rainfallIn) {
  const terms = [
    { name: 'Imp Veh',     area: areas.impVeh    || 0, rv: RV['Impervious Vehicular'] },
    { name: 'Imp Non-Veh', area: areas.impNonVeh || 0, rv: RV['Impervious Non-Vehicular'] },
    { name: 'Compacted',   area: areas.comp      || 0, rv: RV['Compacted (Open Space)'] },
    { name: 'Natural',     area: areas.natural   || 0, rv: RV['Natural (Woods)'] },
    { name: 'BMP',         area: areas.bmp       || 0, rv: RV['BMP'] },
  ];
  const sumAR = terms.reduce((s, t) => s + t.area * t.rv, 0);
  const value = sumAR * rainfallIn / 12.0;
  const subTerms = terms
    .filter(t => t.area > 0)
    .map(t => `${t.area}·${t.rv}`)
    .join(' + ') || '0';
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'SWRv = (P / 12) × Σ(A_i · Rv_i)',
        sub:    `(${rainfallIn} / 12) × (${subTerms})`,
        eval:   `${fmt(rainfallIn / 12, 4)} × ${fmt(sumAR)}`,
        result: value },
    ],
  };
}

// ─── TR-55 runoff ────────────────────────────────────────────────────────────
export function tr55RunoffDepth(P, cn) {
  if (cn <= 0) return 0;
  const S = 1000 / cn - 10;
  const Ia = 0.2 * S;
  if (P <= Ia) return 0;
  return (P - Ia) ** 2 / (P - Ia + S);
}

export function tr55RunoffVolumeCf(areaSf, P, cn) {
  return areaSf * tr55RunoffDepth(P, cn) / 12;
}

export function tr55TotalVolumeCf(rows, P) {
  let total = 0;
  for (const [area, landUse, hsg] of rows) {
    const row = CN[landUse];
    if (!row || row[hsg] == null) {
      throw new Error(`No CN entry for ('${landUse}', '${hsg}')`);
    }
    total += tr55RunoffVolumeCf(area, P, row[hsg]);
  }
  return total;
}

// ─── Horton infiltration (closed form) ───────────────────────────────────────
export function hortonInfilLoss(fMax, fMin, k, T = 24) {
  return fMin * T + (fMax - fMin) / k * (1 - Math.exp(-k * T));
}

export const HORTON_INFIL_LOSS_B = hortonInfilLoss(HORTON.B.fMax, HORTON.B.fMin, HORTON.B.k, 24);
export const HORTON_INFIL_LOSS_C = hortonInfilLoss(HORTON.C.fMax, HORTON.C.fMin, HORTON.C.k, 24);

// ─── EISA Direct Determination ───────────────────────────────────────────────
export function eisaDirectRunoffDepth(landUse, hsg, P) {
  if (IMPERVIOUS_LAND_USES.has(landUse)) {
    return Math.max(0, P - DEPRESSION_IMPERVIOUS);
  }
  if (hsg === 'A') return 0;
  if (hsg === 'B') return Math.max(0, P - DEPRESSION_PERVIOUS - HORTON_INFIL_LOSS_B);
  if (hsg === 'C') return Math.max(0, P - DEPRESSION_PERVIOUS - HORTON_INFIL_LOSS_C);
  if (hsg === 'D') return Math.max(0, P - DEPRESSION_PERVIOUS);
  throw new Error(`Unknown HSG: ${hsg}`);
}

export function eisaDirectTotalVolumeCf(rows, P) {
  let total = 0;
  for (const [area, landUse, hsg] of rows) {
    total += area * eisaDirectRunoffDepth(landUse, hsg, P) / 12;
  }
  return total;
}

// ─── BMP sizing ──────────────────────────────────────────────────────────────

export function ppSizingSv(sa, dReservoir, nReservoir) {
  const value = sa * dReservoir * nReservoir;
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'Sv = SA × d_reservoir × n_reservoir',
        sub:    `${sa} × ${dReservoir} × ${nReservoir}`,
        eval:   `${sa * dReservoir} × ${nReservoir}`,
        result: value },
    ],
  };
}

export function bioSizingSv(saBot, saTop, saPondTop, dMedia, nMedia, dGravel, nGravel, dPond) {
  const mediaGravelSv = saBot * (dMedia * nMedia + dGravel * nGravel);
  const useTrapezoid = saPondTop != null && saPondTop > 0;
  const pondSv = useTrapezoid
    ? 0.5 * (saTop + saPondTop) * dPond
    : saBot * dPond;
  const value = mediaGravelSv + pondSv;
  const subs = useTrapezoid
    ? `${saBot}·(${dMedia}·${nMedia} + ${dGravel}·${nGravel}) + ½·(${saTop} + ${saPondTop})·${dPond}`
    : `${saBot}·(${dMedia}·${nMedia} + ${dGravel}·${nGravel} + ${dPond})`;
  return {
    value,
    units: 'cf',
    components: { mediaGravelSv, pondSv },
    pondModel: useTrapezoid ? 'trapezoid' : 'vertical',
    steps: [{
      expr: useTrapezoid
        ? 'Sv = SA_bot·(d_media·n_media + d_gravel·n_gravel) + ½·(SA_top + SA_pond_top)·d_pond'
        : 'Sv = SA_bot·(d_media·n_media + d_gravel·n_gravel + d_pond)',
      sub: subs,
      eval: `${mediaGravelSv.toFixed(2)} + ${pondSv.toFixed(2)}`,
      result: value,
    }],
  };
}

export function drySwaleSizingSv({
  saBot, dMedia, nMedia, dGravel, nGravel, dPond,
  length, bottomWidth, invUs, invDs,
  checkDamHeight, checkDamSpacing,
}) {
  const mediaGravelSv = saBot * (dMedia * nMedia + dGravel * nGravel);
  const haveGeom = length > 0 && bottomWidth > 0
                && invUs != null && invDs != null
                && checkDamHeight > 0 && checkDamSpacing > 0;
  let pondSv, pondModel, pondTrace;
  if (haveGeom) {
    const slope = Math.max(1e-6, (invUs - invDs) / length);
    const nDams = Math.max(0, Math.floor(length / checkDamSpacing));
    const fullWedgeBase = checkDamHeight / slope;
    const effectiveBase = Math.min(checkDamSpacing, fullWedgeBase);
    const wedgePerDam = 0.5 * effectiveBase * checkDamHeight * bottomWidth;
    pondSv = nDams * wedgePerDam;
    pondModel = 'wedge';
    pondTrace = { slope, nDams, fullWedgeBase, effectiveBase, wedgePerDam };
  } else {
    pondSv = saBot * (dPond || 0);
    pondModel = 'flat-fallback';
    pondTrace = null;
  }
  const value = mediaGravelSv + pondSv;
  return {
    value,
    units: 'cf',
    components: { mediaGravelSv, pondSv },
    pondModel,
    pondTrace,
    steps: [{
      expr: haveGeom
        ? 'Sv = SA_bot·(d_media·n_media + d_gravel·n_gravel) + N_cd · ½·min(X_cd, H_cd/S)·H_cd·w_s'
        : 'Sv = SA_bot·(d_media·n_media + d_gravel·n_gravel + d_pond)',
      sub: haveGeom
        ? `${saBot}·(${dMedia}·${nMedia} + ${dGravel}·${nGravel}) + ${pondTrace.nDams}·½·${pondTrace.effectiveBase}·${checkDamHeight}·${bottomWidth}`
        : `${saBot}·(${dMedia}·${nMedia} + ${dGravel}·${nGravel} + ${dPond})`,
      eval: `${mediaGravelSv.toFixed(2)} + ${pondSv.toFixed(2)}`,
      result: value,
    }],
  };
}

export function bioFreeboardFt({ topElev, dPond, overflowElev, sidewalkElev, curbCutElev }) {
  if (topElev == null || dPond == null) return null;
  const containments = [overflowElev, sidewalkElev, curbCutElev].filter(e => e != null);
  if (!containments.length) return null;
  return Math.min(...containments) - (topElev + dPond);
}

export function drySwaleFreeboardFt({ invUs, invDs, topUs, topDs, checkDamHeight }) {
  if (invUs == null || invDs == null || topUs == null || topDs == null || !checkDamHeight) return null;
  return Math.min(topUs - (invUs + checkDamHeight), topDs - (invDs + checkDamHeight));
}

export function rvFromSv(sv, retMultiplier) {
  const value = sv * retMultiplier;
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'Rv = Sv × retention_multiplier',
        sub:    `${sv} × ${retMultiplier}`,
        eval:   `${sv} × ${retMultiplier}`,
        result: value },
    ],
  };
}

export function maxBmpCredit(cdaAreaSf, maxCreditInches = 1.7) {
  const value = cdaAreaSf * maxCreditInches / 12;
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'Max BMP Credit = CDA area × 1.7 / 12',
        sub:    `${cdaAreaSf} × ${maxCreditInches} / 12`,
        eval:   `${(cdaAreaSf * maxCreditInches).toFixed(2)} / 12`,
        result: value },
    ],
  };
}

const TREE_COUNT_KEY = {
  plantedSmall:     'T-1 Small',
  plantedLarge:     'T-1 Large',
  preservedSmall:   'T-2 Small',
  preservedLarge:   'T-2 Large',
  preservedSpecial: 'T-2 Special',
  preservedHeritage:'T-2 Heritage',
};

export function treeRetentionCredit(counts, treeCredits) {
  const lines = [];
  let value = 0;
  for (const [countKey, creditKey] of Object.entries(TREE_COUNT_KEY)) {
    const n = counts[countKey] || 0;
    if (!n) continue;
    const credit = treeCredits[creditKey] || 0;
    value += n * credit;
    lines.push(`${n}×${credit}`);
  }
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'Rv_trees = Σ (count × credit)',
        sub:    lines.join(' + ') || '0',
        eval:   `${value}`,
        result: value },
    ],
  };
}

// ─── Composite CN + detention ────────────────────────────────────────────────

export function compositeCn(areas, cnByLandUse) {
  const keys = Object.keys(areas);
  const totalArea = keys.reduce((s, k) => s + (areas[k] || 0), 0);
  if (totalArea === 0) return { value: 0, units: '', steps: [] };
  const num = keys.reduce((s, k) => s + (areas[k] || 0) * cnByLandUse[k], 0);
  const value = num / totalArea;
  const subs = keys
    .filter(k => areas[k] > 0)
    .map(k => `${areas[k]}·${cnByLandUse[k]}`)
    .join(' + ');
  return {
    value,
    units: '',
    steps: [
      { expr:   'CN = Σ(A_i · CN_i) / Σ A_i',
        sub:    `(${subs}) / ${totalArea}`,
        eval:   `${num.toFixed(0)} / ${totalArea}`,
        result: value },
    ],
  };
}

export const scsRunoffDepth = tr55RunoffDepth;

const LAND_USE_TO_DETENTION_KEY = {
  'Natural (Woods)':          'Natural',
  'Compacted (Open Space)':   'Compacted',
  'Impervious Vehicular':     'Impervious',
  'Impervious Non-Vehicular': 'Impervious',
  'BMP':                      'BMP',
};

function _sdaAreasFromRows(sdaRows, which) {
  // which = 'pre' | 'post'
  const key = which + 'In';
  const out = { Natural: 0, Compacted: 0, Impervious: 0, BMP: 0 };
  for (const row of sdaRows) {
    const k = LAND_USE_TO_DETENTION_KEY[row.landUse];
    if (k) out[k] += row[key] || 0;
  }
  return out;
}

export function detentionSummary(sdas, p2In, p15In, detentionCn) {
  // sdas can either be: (a) list of per-SDA {sdaId, pre, post} objects (pre-aggregated), or
  // (b) list of SDA data rows with landUse + preIn + postIn. We detect by checking for
  //     'pre' / 'post' keys on the first element.
  let perSdaInput;
  if (sdas.length === 0) {
    perSdaInput = [];
  } else if ('pre' in sdas[0] && 'post' in sdas[0]) {
    perSdaInput = sdas;
  } else {
    // Group raw rows by sdaId first.
    const by = {};
    for (const r of sdas) {
      if (!by[r.sdaId]) by[r.sdaId] = [];
      by[r.sdaId].push(r);
    }
    perSdaInput = Object.entries(by).map(([sdaId, rows]) => ({
      sdaId,
      pre:  _sdaAreasFromRows(rows, 'pre'),
      post: _sdaAreasFromRows(rows, 'post'),
    }));
  }

  const perSda = perSdaInput.map(sda => {
    const preCn  = compositeCn(sda.pre,  detentionCn).value;
    const postCn = compositeCn(sda.post, detentionCn).value;
    const p2PreQ   = scsRunoffDepth(p2In,  preCn);
    const p2PostQ  = scsRunoffDepth(p2In,  postCn);
    const p15PreQ  = scsRunoffDepth(p15In, preCn);
    const p15PostQ = scsRunoffDepth(p15In, postCn);
    return {
      sdaId: sda.sdaId,
      preCn, postCn,
      p2PreQ, p2PostQ, p2Required: p2PostQ > p2PreQ,
      p15PreQ, p15PostQ, p15Required: p15PostQ > p15PreQ,
    };
  });
  const anyRequired = perSda.some(s => s.p2Required || s.p15Required);
  return { perSda, anyRequired };
}

// ─── Site aggregates ─────────────────────────────────────────────────────────

const LAND_USE_TO_SITE_KEY = {
  'Natural (Woods)':          'natural',
  'Compacted (Open Space)':   'compacted',
  'Impervious Vehicular':     'impervious',
  'Impervious Non-Vehicular': 'impervious',
  'BMP':                      'bmp',
};

export function siteAggregateLandCover(sdas) {
  const empty = () => ({ natural: 0, compacted: 0, impervious: 0, bmp: 0 });
  const pre = empty();
  const post = empty();
  for (const row of sdas) {
    const k = LAND_USE_TO_SITE_KEY[row.landUse];
    if (!k) continue;
    pre[k]  += row.preIn  || 0;
    post[k] += row.postIn || 0;
  }
  const total = (o) => o.natural + o.compacted + o.impervious + o.bmp;
  return {
    pre, post,
    preTotal:  total(pre),
    postTotal: total(post),
    impPctPre:  total(pre)  ? pre.impervious  / total(pre)  * 100 : 0,
    impPctPost: total(post) ? post.impervious / total(post) * 100 : 0,
  };
}

export function siteSwrv(sdas, rainfallIn, params) {
  const terms = sdas.map(r => ({
    landUse: r.landUse,
    area:    r.postIn || 0,
    rv:      params.rv[r.landUse] || 0,
  })).filter(t => t.area > 0);
  const sumAR = terms.reduce((s, t) => s + t.area * t.rv, 0);
  const value = sumAR * rainfallIn / 12;
  const subs = terms.map(t => `${t.area}·${t.rv}`).join(' + ') || '0';
  return {
    value,
    units: 'cf',
    steps: [
      { expr:   'Site SWRv = (P/12) × Σ(A_i · Rv_i)   [informational — compliance is per-SDA]',
        sub:    `(${rainfallIn}/12) × (${subs})`,
        eval:   `${(rainfallIn/12).toFixed(4)} × ${sumAR.toFixed(2)}`,
        result: value },
    ],
  };
}

// ─── Trace variants used by EISA render pages ───────────────────────────────
// Row shape divergence: trace variants take `{area, landUse, hsg}` objects
// (easier to destructure in .map and makes perRow output self-describing).
// The scalar siblings eisaDirectTotalVolumeCf and tr55TotalVolumeCf take
// `[area, landUse, hsg]` tuples. If you call both from one call site, build
// two row arrays.

export function eisaDirectVolumeTraceCf(rows, P) {
  const perRow = rows.map(r => {
    if (!['A', 'B', 'C', 'D'].includes(r.hsg)) {
      throw new Error(`No EISA Direct entry for ('${r.landUse}', '${r.hsg}')`);
    }
    const depth = eisaDirectRunoffDepth(r.landUse, r.hsg, P);
    return {
      landUse: r.landUse,
      hsg: r.hsg,
      area: r.area,
      depthIn: depth,
      volumeCf: r.area * depth / 12,
    };
  });
  const value = perRow.reduce((s, r) => s + r.volumeCf, 0);
  return {
    value,
    units: 'cf',
    perRow,
    steps: [
      { expr: 'EISA Direct — total runoff = Σ (A_i × depth_i / 12)',
        sub:  `Σ over ${perRow.length} rows`,
        eval: `${perRow.map(r => `${r.area}·${r.depthIn.toFixed(3)}/12`).join(' + ')}`,
        result: value },
    ],
  };
}

export function tr55VolumeTraceCf(rows, P) {
  const perRow = rows.map(r => {
    const cnRow = CN[r.landUse];
    if (!cnRow || cnRow[r.hsg] == null) {
      throw new Error(`No CN entry for ('${r.landUse}', '${r.hsg}')`);
    }
    const cn = cnRow[r.hsg];
    const depth = tr55RunoffDepth(P, cn);
    return {
      landUse: r.landUse,
      hsg: r.hsg,
      area: r.area,
      cn,
      depthIn: depth,
      volumeCf: r.area * depth / 12,
    };
  });
  const value = perRow.reduce((s, r) => s + r.volumeCf, 0);
  return {
    value,
    units: 'cf',
    perRow,
    steps: [
      { expr: 'TR-55 — Q = (P − 0.2S)² / (P + 0.8S)   where S = 1000/CN − 10',
        sub:  `Σ over ${perRow.length} rows (A × Q / 12)`,
        eval: `${perRow.map(r => `${r.area}·${r.depthIn.toFixed(3)}/12`).join(' + ')}`,
        result: value },
    ],
  };
}
