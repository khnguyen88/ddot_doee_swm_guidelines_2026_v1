// src/tr16-exhibit.mjs — SCS TR-16 Exhibit 2-7A reproduced as data.
// Rainfall-runoff lookup table: given CN and rainfall P (inches),
// returns runoff Q (inches). This is identical math to the TR-55
// formula Q = (P - 0.2S)^2 / (P + 0.8S); the table just rounds P to 0.1".
//
// Source: docs/manual_guidance/EISA 438 sample comps.pdf, pages 9–13
// (SCS TR-16 Exhibit 2-7A, Soil Conservation Service, Upper Darby PA).
//
// Design decision: the data is GENERATED computationally from
// tr55RunoffDepth(p, cn) rather than hand-copied. TR-16 IS the TR-55
// formula tabulated at 0.1" P intervals, so generation guarantees zero
// typos. The sampled-cell parity test verifies agreement with the printed
// PDF (within 0.02" to absorb typesetting rounding).

import { tr55RunoffDepth } from './calc.mjs';

export const TR16_CN_LIST = [60, 61, 68, 69, 70, 74, 75, 76, 80, 81, 82, 98];

// Row index: P whole inches 1..12 (zero-indexed → index 0 = P=1″).
// Column index: P tenths 0..9 (index 0 = x.0″, index 9 = x.9″).
// Values are runoff Q in inches, rounded to 2 decimal places.
function _buildTable(cn) {
  const table = [];
  for (let whole = 1; whole <= 12; whole++) {
    const row = [];
    for (let tenth = 0; tenth < 10; tenth++) {
      const p = whole + tenth / 10;
      const q = tr55RunoffDepth(p, cn);
      row.push(Number(q.toFixed(2)));
    }
    table.push(row);
  }
  return table;
}

export const TR16_EXHIBIT = Object.fromEntries(
  TR16_CN_LIST.map(cn => [cn, _buildTable(cn)]),
);

/**
 * Lookup runoff Q (inches) from the TR-16 Exhibit 2-7A table.
 * @param {number} cn — curve number; must be one of TR16_CN_LIST
 * @param {number} pInches — rainfall depth 1.0 ≤ P ≤ 12.9
 * @returns {number|null} Q in inches, or null if CN unknown or P out of range
 */
export function tr16LookupQ(cn, pInches) {
  const table = TR16_EXHIBIT[cn];
  if (!table) return null;
  if (pInches < 1 || pInches >= 13) return null;
  const whole = Math.floor(pInches);          // 1..12
  const tenth = Math.round((pInches - whole) * 10);  // 0..9
  if (tenth < 0 || tenth > 9) return null;
  return table[whole - 1][tenth];
}
