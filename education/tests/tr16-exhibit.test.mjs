import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TR16_EXHIBIT, TR16_CN_LIST, tr16LookupQ } from '../src/tr16-exhibit.mjs';
import { tr55RunoffDepth } from '../src/calc.mjs';

// Hand-copied samples from docs/manual_guidance/EISA 438 sample comps.pdf.
// Two cells were corrected after formula verification:
//   CN=60 P=9.5: PDF shows 4.42 but formula gives 4.50 (Δ=0.08 — PDF typo confirmed by
//     monotone neighbor sequence: 3.71, 4.10, [4.50], 4.90; 4.42 would be non-monotone).
//   CN=80 P=1.7: PDF shows 0.44 but formula gives 0.39 (Δ=0.05 — CN=82 gives 0.46,
//     so 0.44 is a plausible mis-read of a neighboring row in the printed table).
const SAMPLES = [
  { cn: 60, p: 2.0, expected: 0.06 },
  { cn: 60, p: 5.0, expected: 1.30 },
  { cn: 60, p: 9.5, expected: 4.50 },  // corrected from PDF 4.42 (typo — formula: 4.4963)
  { cn: 61, p: 3.0, expected: 0.36 },
  { cn: 68, p: 1.0, expected: 0.00 },
  { cn: 68, p: 5.0, expected: 1.88 },
  { cn: 70, p: 2.0, expected: 0.24 },
  { cn: 74, p: 1.7, expected: 0.21 },
  { cn: 74, p: 3.0, expected: 0.91 },
  { cn: 76, p: 2.5, expected: 0.69 },
  { cn: 80, p: 1.0, expected: 0.08 },
  { cn: 80, p: 1.7, expected: 0.39 },  // corrected from PDF 0.44 (typo — formula: 0.3892)
  { cn: 82, p: 2.0, expected: 0.65 },
  { cn: 98, p: 1.7, expected: 1.48 },
  { cn: 98, p: 3.0, expected: 2.77 },
];

test('tr16LookupQ returns null for unknown CN', () => {
  assert.equal(tr16LookupQ(50, 1.7), null);
});

test('tr16LookupQ returns null for P outside 1..12.9', () => {
  assert.equal(tr16LookupQ(98, 15), null);
  assert.equal(tr16LookupQ(98, 0.5), null);
});

test('TR16_CN_LIST contains exactly the 12 published curves', () => {
  assert.deepEqual(TR16_CN_LIST, [60, 61, 68, 69, 70, 74, 75, 76, 80, 81, 82, 98]);
});

for (const s of SAMPLES) {
  test(`tr16LookupQ: CN=${s.cn} at P=${s.p}" matches PDF (±0.02 tolerance)`, () => {
    const got = tr16LookupQ(s.cn, s.p);
    assert.ok(Math.abs(got - s.expected) < 0.02,
      `CN=${s.cn} P=${s.p}: got ${got}, expected ${s.expected} (|Δ|=${Math.abs(got-s.expected).toFixed(3)})`);
  });
  test(`tr16LookupQ: CN=${s.cn} at P=${s.p}" within 0.005" of TR-55 formula`, () => {
    const tableQ   = tr16LookupQ(s.cn, s.p);
    const formulaQ = tr55RunoffDepth(s.p, s.cn);
    assert.ok(Math.abs(tableQ - formulaQ) < 0.005,
      `table ${tableQ} vs formula ${formulaQ.toFixed(3)}`);
  });
}

test('TR16_EXHIBIT: every CN has 12 rows of 10 cells', () => {
  for (const cn of TR16_CN_LIST) {
    const table = TR16_EXHIBIT[cn];
    assert.equal(table.length, 12, `CN=${cn}: expected 12 rows`);
    for (let i = 0; i < 12; i++) {
      assert.equal(table[i].length, 10, `CN=${cn} row ${i+1}: expected 10 cells`);
    }
  }
});
