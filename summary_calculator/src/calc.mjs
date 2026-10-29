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
