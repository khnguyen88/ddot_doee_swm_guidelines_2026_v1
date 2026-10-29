import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sheetjsSrc = await readFile(join(__dirname, '..', 'lib', 'sheetjs-bundle.js'), 'utf8');
const XLSX = new Function(sheetjsSrc + '; return XLSX;')();

import { parseWorkbook } from '../src/parse.mjs';
import {
  siteSwrv, swrvVolume, eisaDirectTotalVolumeCf,
  detentionSummary, HORTON_INFIL_LOSS_B, HORTON_INFIL_LOSS_C,
} from '../src/calc.mjs';

const fixtureBytes = await readFile(join(__dirname, 'fixtures', 'minnesota-ave.xlsx'));
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const parsed = parseWorkbook(wb);

const reference = JSON.parse(
  await readFile(join(__dirname, 'fixtures', 'minnesota-ave.reference.json'), 'utf8')
);

const CF_TOL = 0.5;
const IN_TOL = 0.001;

const approxCf = (a, b, label) =>
  assert.ok(Math.abs(a - b) < CF_TOL, `${label}: ${a} vs ${b} (|Δ|=${Math.abs(a-b).toFixed(3)}, tol ${CF_TOL} CF)`);
const approxIn = (a, b, label) =>
  assert.ok(Math.abs(a - b) < IN_TOL, `${label}: ${a} vs ${b} (|Δ|=${Math.abs(a-b).toFixed(5)}, tol ${IN_TOL} in)`);

test('parity: Horton loss constants', () => {
  approxIn(HORTON_INFIL_LOSS_B, reference.horton_loss_B_in, 'Horton B');
  approxIn(HORTON_INFIL_LOSS_C, reference.horton_loss_C_in, 'Horton C');
});

test('parity: per-SDA SWRv required', () => {
  // Group SDA rows by sdaId, compute SWRv for each with post-condition areas.
  const by = {};
  for (const row of parsed.sdas) {
    if (!by[row.sdaId]) by[row.sdaId] = { impVeh: 0, impNonVeh: 0, comp: 0, natural: 0, bmp: 0 };
    const bucket = by[row.sdaId];
    const a = row.postIn || 0;
    if (row.landUse === 'Impervious Vehicular') bucket.impVeh += a;
    else if (row.landUse === 'Impervious Non-Vehicular') bucket.impNonVeh += a;
    else if (row.landUse === 'Compacted (Open Space)') bucket.comp += a;
    else if (row.landUse === 'Natural (Woods)') bucket.natural += a;
    else if (row.landUse === 'BMP') bucket.bmp += a;
  }
  for (const [sdaId, areas] of Object.entries(by)) {
    const expected = reference.swrv_req_cf_per_sda[sdaId];
    assert.ok(expected != null, `reference missing ${sdaId}`);
    const got = swrvVolume(areas, parsed.project.rainfallIn).value;
    approxCf(got, expected, `SWRv ${sdaId}`);
  }
});

test('parity: site-total SWRv', () => {
  const r = siteSwrv(parsed.sdas, parsed.project.rainfallIn, parsed.params);
  approxCf(r.value, reference.swrv_req_cf_site_total, 'site SWRv');
});

test('parity: EISA direct pre/post', () => {
  const preRows  = parsed.sdas.map(r => [r.preIn,  r.landUse, r.hsg]);
  const postRows = parsed.sdas.map(r => [r.postIn, r.landUse, r.hsg]);
  approxCf(eisaDirectTotalVolumeCf(preRows,  1.7), reference.eisa_direct.pre_cf,  'EISA pre');
  approxCf(eisaDirectTotalVolumeCf(postRows, 1.7), reference.eisa_direct.post_cf, 'EISA post');
});

test('parity: detention per SDA', () => {
  const r = detentionSummary(
    parsed.sdas,
    parsed.params.detention.p2In,
    parsed.params.detention.p15In,
    parsed.params.detentionCn,
  );
  for (const sda of r.perSda) {
    const expected = reference.detention_per_sda[sda.sdaId];
    assert.ok(expected, `reference missing detention for ${sda.sdaId}`);
    approxIn(sda.preCn,    expected.pre_cn,    `${sda.sdaId} pre CN`);
    approxIn(sda.postCn,   expected.post_cn,   `${sda.sdaId} post CN`);
    approxIn(sda.p2PreQ,   expected.p2_pre_q,  `${sda.sdaId} p2 pre Q`);
    approxIn(sda.p2PostQ,  expected.p2_post_q, `${sda.sdaId} p2 post Q`);
    approxIn(sda.p15PreQ,  expected.p15_pre_q, `${sda.sdaId} p15 pre Q`);
    approxIn(sda.p15PostQ, expected.p15_post_q,`${sda.sdaId} p15 post Q`);
  }
});
