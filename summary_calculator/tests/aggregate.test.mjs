import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rvProvidedPerSda } from '../src/aggregate.mjs';

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
  assert.ok(result['SDA-1'] < 15, `expected capped Rv ~14.17, got ${result['SDA-1']}`);
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
    { name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-X', type: 'Bioretention', subType: 'Enhanced',
      bio: { saTop: 100, saBot: 100, dMedia: 2, dGravel: 0.5, dPond: 0.5 } },
  ];
  const result = rvProvidedPerSda(bmps, [], params);
  // Sv = 100 * (2*0.4 + 0.5*0.4 + 0.5) = 100*1.5 = 150
  assert.equal(result['SDA-1'], 150);
});

test('rvProvidedPerSda: empty BMP list returns empty object', () => {
  assert.deepEqual(rvProvidedPerSda([], [], params), {});
});
