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

export const LAND_USE_TO_DETENTION_KEY = {
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

// ─── Time of Concentration (NRCS TR-55) ─────────────────────────────────────

// Shallow-concentrated flow velocity coefficients (TR-55 Fig 3-1).
// Template dropdown offers only "paved" / "unpaved"; the workbook formula
// treats anything other than "paved" as unpaved.
export const SHALLOW_FLOW_K = {
  paved:   20.3282,
  unpaved: 16.1345,
};

export function tcSheetFlow({ length, slope, n, P2 }) {
  if (!(length > 0 && slope > 0 && n > 0 && P2 > 0)) return null;
  const Tt_hr = 0.007 * Math.pow(n * length, 0.8)
              / (Math.pow(P2, 0.5) * Math.pow(slope, 0.4));
  return Tt_hr * 60;
}

export function tcShallowFlow({ length, slope, surface }) {
  if (!(length > 0 && slope > 0)) return null;
  const key = String(surface ?? '').trim().toLowerCase();
  const k = SHALLOW_FLOW_K[key] ?? SHALLOW_FLOW_K.unpaved;
  const V = k * Math.sqrt(slope);
  return length / (V * 60);
}

export function tcChannelFlow({ length, velocity }) {
  if (!(length > 0 && velocity > 0)) return null;
  return length / (velocity * 60);
}

export function timeOfConcentration(segments) {
  const perSegment = segments.map(s => {
    if (s.type === 'sheet')   return tcSheetFlow(s);
    if (s.type === 'shallow') return tcShallowFlow(s);
    if (s.type === 'channel') return tcChannelFlow(s);
    return null;
  });
  const total = perSegment.reduce((a, t) => a + (t || 0), 0);
  // TR-55 / DOEE floor: Tc_final >= 0.1 hr (6 min).
  return Math.max(total, 6);
}

// Final Tc in minutes: a direct entry overrides the computed sum, and the
// TR-55 / DOEE 6-minute floor applies to both paths.
export function tcFinalMin(tcDirectMin, segments) {
  if (tcDirectMin != null) return Math.max(tcDirectMin, 6);
  if (!segments || segments.length === 0) return null;
  return timeOfConcentration(segments);
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

// ─── TR-55 Graphical Peak Discharge (Appendix F) ────────────────────────────

export const SQFT_PER_ACRE = 43560;
export const SQFT_PER_SQMI = 27878400;
export const DEFAULT_TC_HR = 0.1;

// NRCS TR-55 unit peak discharge (Appendix F log-polynomial).
// paramsTr55 shape: [[IaP, C0, C1, C2], ...] sorted ascending by IaP.
// Returns qu in csm/in. Clamps IaP to the tabulated [0.10, 0.50] range
// (values below 0.10 use the 0.10 curve, per TR-55 Exhibit 4-II); linear
// interpolation between bins.
//
// Intentional deviation: the DOEE SWMP-BMP Calc template uses MATCH(...,1),
// which returns #N/A for Ia/P below 0.10, so its IFERROR sets qu = 0. This
// engine instead clamps to the 0.10 curve because that is the physically
// correct TR-55 Exhibit 4-II behavior. The DOEE spreadsheet remains the
// authoritative compliance source; this is a cross-check.
export function tr55UnitPeakDischarge(tcHr, iaOverP, paramsTr55) {
  if (!(tcHr > 0) || !paramsTr55 || paramsTr55.length < 2) return null;
  const N = paramsTr55.length;
  const iaFirst = paramsTr55[0][0], iaLast = paramsTr55[N - 1][0];
  const iap = Math.min(Math.max(iaOverP, iaFirst), iaLast);
  let lo = 0;
  for (let i = 0; i < N - 1; i++) {
    if (paramsTr55[i][0] <= iap && paramsTr55[i + 1][0] >= iap) { lo = i; break; }
  }
  if (iap >= iaLast) lo = N - 2;
  const hi = lo + 1;
  const [iapLo, c0Lo, c1Lo, c2Lo] = paramsTr55[lo];
  const [iapHi, c0Hi, c1Hi, c2Hi] = paramsTr55[hi];
  const f = (iap - iapLo) / (iapHi - iapLo);
  const C0 = c0Lo + f * (c0Hi - c0Lo);
  const C1 = c1Lo + f * (c1Hi - c1Lo);
  const C2 = c2Lo + f * (c2Hi - c2Lo);
  const lt = Math.log10(tcHr);
  return Math.pow(10, C0 + C1 * lt + C2 * lt * lt);
}

// TR-55 Eq 4-1: Qp = qu * Am * Q * Fp; Fp = 1.0.
export function tr55PeakDischargeCfs(qu, areaMi2, runoffIn) {
  if (qu == null || !(areaMi2 > 0)) return null;
  return qu * areaMi2 * (runoffIn || 0);
}

// ─── 2020 DOEE CDA-level detention (BMP-adjusted) ───────────────────────────

// Adj Q = max(0, PostQ − BMP_Sv·12 / DA_SF). BMP storage subtracts from the
// post-development runoff depth as an equivalent uniform withdrawal. When
// DA_SF <= 0 the builder's IFERROR falls back to PostQ unchanged.
export function detentionBmpAdjustedQ(qPostIn, bmpSvCf, daSf) {
  if (!(daSf > 0)) return qPostIn;
  const reductionIn = (bmpSvCf || 0) * 12 / daSf;
  return Math.max(0, (qPostIn || 0) - reductionIn);
}

// Closed-form inverse of the SCS runoff equation, solving for S given Q and P:
//   S_adj = 5·(P + 2Q − sqrt(Q·(4Q + 5P)))
//   CN    = 1000/(S_adj + 10)
// Returns 0 when Q <= 0 (sufficient storage → no runoff → no CN needed).
export function detentionBmpAdjustedCn(adjQIn, pIn) {
  if (!(adjQIn > 0) || !(pIn > 0)) return 0;
  const sAdj = 5 * (pIn + 2 * adjQIn - Math.sqrt(adjQIn * (4 * adjQIn + 5 * pIn)));
  return 1000 / (sAdj + 10);
}

// Trigger check per 2020 DOEE methodology:
//   2-yr  → Adj CN > 70
//   15-yr → Adj CN > Pre CN
//   100-yr → no trigger
export function detentionBmpRequired(adjCn, cnPre, stormLabel) {
  if (stormLabel === '2-yr')  return adjCn > 70    ? 'Yes' : 'No';
  if (stormLabel === '15-yr') return adjCn > cnPre ? 'Yes' : 'No';
  return '—';
}

// ─── EISA §438 Direct Determination timestep engine ─────────────────────────

// SCS Type II dimensionless cumulative rainfall distribution.
// 240 × 6-min steps; cumulative fraction of the 24-hour depth. Mid-storm
// burst (~t=12 hr) delivers ~50% of the total. Values transcribed from
// NRCS TR-55 Table 5-1 (24-hour Type II, mid-Atlantic incl. DC).
const _TR55_TYPE_II_6MIN_STR = `
0.000,0.001,0.002,0.003,0.004,0.005,0.006,0.007,0.008,0.009,
0.010,0.011,0.012,0.013,0.015,0.016,0.017,0.018,0.019,0.021,
0.022,0.023,0.025,0.026,0.028,0.029,0.031,0.032,0.034,0.035,
0.037,0.039,0.040,0.042,0.044,0.046,0.047,0.049,0.051,0.053,
0.055,0.057,0.059,0.061,0.063,0.065,0.067,0.069,0.071,0.074,
0.076,0.078,0.081,0.083,0.086,0.088,0.091,0.093,0.096,0.099,
0.102,0.104,0.107,0.110,0.113,0.116,0.119,0.122,0.126,0.129,
0.132,0.135,0.139,0.142,0.146,0.150,0.153,0.157,0.161,0.165,
0.169,0.173,0.177,0.181,0.185,0.190,0.194,0.199,0.203,0.208,
0.213,0.218,0.223,0.228,0.233,0.239,0.244,0.250,0.256,0.262,
0.268,0.275,0.282,0.289,0.296,0.303,0.311,0.319,0.328,0.337,
0.347,0.357,0.368,0.380,0.393,0.407,0.422,0.439,0.457,0.478,
0.500,0.541,0.577,0.608,0.634,0.657,0.678,0.696,0.711,0.724,
0.736,0.746,0.755,0.763,0.770,0.777,0.784,0.790,0.795,0.801,
0.806,0.811,0.815,0.820,0.824,0.828,0.832,0.835,0.839,0.842,
0.846,0.849,0.852,0.855,0.858,0.861,0.864,0.867,0.869,0.872,
0.874,0.877,0.879,0.881,0.883,0.886,0.888,0.890,0.892,0.894,
0.896,0.898,0.900,0.902,0.904,0.906,0.907,0.909,0.911,0.912,
0.914,0.916,0.917,0.919,0.920,0.922,0.923,0.925,0.926,0.928,
0.929,0.931,0.932,0.933,0.935,0.936,0.938,0.939,0.940,0.942,
0.943,0.944,0.946,0.947,0.948,0.950,0.951,0.952,0.953,0.955,
0.956,0.957,0.958,0.959,0.961,0.962,0.963,0.964,0.965,0.967,
0.968,0.969,0.970,0.971,0.972,0.974,0.975,0.976,0.977,0.978,
0.979,0.980,0.982,0.983,0.984,0.985,0.986,0.987,0.988,1.000`;

export const SCS_TYPE_II_CURVE = _TR55_TYPE_II_6MIN_STR
  .replace(/\s+/g, '')
  .split(',')
  .map(Number);

// Scale the dimensionless curve to a total depth; 240 timesteps of
// { tMin, pInRate (in/hr average over the step), pCumIn }.
export function scsType2Hyetograph(totalDepthIn, timestepMin = 6) {
  if (!(totalDepthIn > 0)) return [];
  const steps = [];
  let prevCum = 0;
  for (let i = 0; i < SCS_TYPE_II_CURVE.length; i++) {
    const pCumIn = SCS_TYPE_II_CURVE[i] * totalDepthIn;
    const dCum   = pCumIn - prevCum;
    const pInRate = (dCum / timestepMin) * 60;
    steps.push({ tMin: i * timestepMin, pInRate, pCumIn });
    prevCum = pCumIn;
  }
  return steps;
}

// Horton infiltration rate at time t (hours): f(t) = fMin + (fMax - fMin)e^(-k t).
export function hortonInfilRate(fMax, fMin, k, tHours) {
  if (fMax == null || fMin == null || k == null) return null;
  return fMin + (fMax - fMin) * Math.exp(-k * tHours);
}

// EISA §438 Direct Determination timestep trace. Distributes P over 24 hr
// via the SCS Type II hyetograph, computes per-6-min excess runoff for
// pre/post land cover, and withdraws BMP storage as a uniform per-step
// withdrawal. Simplified aggregate loss model: a single area-weighted
// Horton rate (weighted over HSGs that have PARAMS values — the template
// only defines B and C) is applied site-wide. Falls back to an SCS-CN loss
// stand-in (CN 80 pre / 95 post) when Horton params are absent and records
// the path in `lossModelUsed`. This is an educational cross-check, not the
// authoritative compliance calculation.
export function eisaTimestepTrace({ sdas, bmps, params, P = 1.7, lossModel = 'horton' }) {
  const hyeto = scsType2Hyetograph(P, 6);
  const totalBmpSv = (bmps || []).reduce((a, b) => a + (b.rvApplied || 0), 0);
  const haveHorton = params && params.horton && Object.keys(params.horton).length > 0;
  const lossModelUsed = (lossModel === 'horton' && haveHorton) ? 'horton' : 'scs-cn';

  const _sumArea = (phase) => (sdas || []).reduce((a, s) => a + (s[phase] || 0), 0);
  const aPreSf  = _sumArea('preIn');
  const aPostSf = _sumArea('postIn');

  const weighted = (phase) => {
    let fMax = 0, fMin = 0, k = 0, area = 0;
    for (const s of (sdas || [])) {
      const a = s[phase] || 0;
      const h = params?.horton?.[s.hsg || 'D'];
      if (!h || !a) continue;
      area += a;
      fMax += a * (h.fMax || 0);
      fMin += a * (h.fMin || 0);
      k    += a * (h.k    || 4);
    }
    if (area === 0) return null;
    return { fMax: fMax / area, fMin: fMin / area, k: k / area };
  };
  const hPre  = weighted('preIn');
  const hPost = weighted('postIn');

  const stepHr = 6 / 60;
  let cumBmpUsedCf = 0;
  let peakPre = 0, peakPost = 0, peakPostWithBmp = 0;
  let totalPreIn = 0, totalPostIn = 0, totalNetPostIn = 0;

  const timeSteps = hyeto.map((row, i) => {
    const tHours = row.tMin / 60;
    if (lossModelUsed === 'scs-cn') {
      const Sp = 1000 / 80 - 10, Spost = 1000 / 95 - 10;
      const Q = (P_, S) => (P_ > 0.2 * S ? (P_ - 0.2 * S) ** 2 / (P_ + 0.8 * S) : 0);
      const qPreCum  = Q(row.pCumIn, Sp);
      const qPostCum = Q(row.pCumIn, Spost);
      const prevPreCum  = i > 0 ? Q(hyeto[i - 1].pCumIn, Sp)    : 0;
      const prevPostCum = i > 0 ? Q(hyeto[i - 1].pCumIn, Spost) : 0;
      const excessPreIn  = Math.max(0, qPreCum  - prevPreCum);
      const excessPostIn = Math.max(0, qPostCum - prevPostCum);
      const bmpPerStepCf = totalBmpSv / 240;
      const usedCf = Math.min(bmpPerStepCf, excessPostIn * (aPostSf / 12));
      cumBmpUsedCf += usedCf;
      const netPostIn = Math.max(0, excessPostIn - usedCf * 12 / (aPostSf || 1));
      totalPreIn += excessPreIn; totalPostIn += excessPostIn; totalNetPostIn += netPostIn;
      peakPre = Math.max(peakPre, excessPreIn);
      peakPost = Math.max(peakPost, excessPostIn);
      peakPostWithBmp = Math.max(peakPostWithBmp, netPostIn);
      return { tMin: row.tMin, rainIn: row.pInRate * stepHr, infilIn: 0,
               excessPreIn, excessPostIn, bmpStorageUsedCf: usedCf, netPostIn };
    }
    let fPre = 0, fPost = 0;
    if (hPre)  fPre  = hortonInfilRate(hPre.fMax,  hPre.fMin,  hPre.k,  tHours);
    if (hPost) fPost = hortonInfilRate(hPost.fMax, hPost.fMin, hPost.k, tHours);
    const rainIn = row.pInRate * stepHr;
    const excessPreIn  = Math.max(0, rainIn - Math.min(rainIn, (fPre  || 0) * stepHr));
    const excessPostIn = Math.max(0, rainIn - Math.min(rainIn, (fPost || 0) * stepHr));
    const bmpPerStepCf = totalBmpSv / 240;
    const usedCf = Math.min(bmpPerStepCf, excessPostIn * ((aPostSf || 1) / 12));
    cumBmpUsedCf += usedCf;
    const netPostIn = Math.max(0, excessPostIn - usedCf * 12 / (aPostSf || 1));
    totalPreIn += excessPreIn; totalPostIn += excessPostIn; totalNetPostIn += netPostIn;
    peakPre = Math.max(peakPre, excessPreIn);
    peakPost = Math.max(peakPost, excessPostIn);
    peakPostWithBmp = Math.max(peakPostWithBmp, netPostIn);
    return { tMin: row.tMin, rainIn, infilIn: Math.min(rainIn, (fPost || 0) * stepHr),
             excessPreIn, excessPostIn, bmpStorageUsedCf: usedCf, netPostIn };
  });

  return {
    lossModelUsed,
    timeSteps,
    peaks: { pre: peakPre, post: peakPost, postWithBmp: peakPostWithBmp },
    totals: {
      preCf:     totalPreIn     * (aPreSf  || 0) / 12,
      postCf:    totalPostIn    * (aPostSf || 0) / 12,
      netPostCf: totalNetPostIn * (aPostSf || 0) / 12,
    },
  };
}
