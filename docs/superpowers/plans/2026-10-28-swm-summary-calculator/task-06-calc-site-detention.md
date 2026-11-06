# Task 06 — Calc engine (Site aggregates + Detention)

**Goal:** Add site-level aggregation and detention helpers to `src/calc.mjs`: `compositeCn`, `scsRunoffDepth` (alias), `detentionSummary`, `siteAggregateLandCover`, `siteSwrv`.

**Files:**
- Modify: `summary_calculator/src/calc.mjs`
- Modify: `summary_calculator/tests/calc.test.mjs`

---

- [ ] **Step 1: Append failing tests**

```js
import {
  compositeCn,
  scsRunoffDepth,
  detentionSummary,
  siteAggregateLandCover,
  siteSwrv,
} from '../src/calc.mjs';

test('compositeCn: area-weighted', () => {
  // 1000 sf Impervious (CN 98) + 1000 sf Natural (CN 70) → (98+70)/2 = 84
  const r = compositeCn(
    { Natural: 1000, Compacted: 0, Impervious: 1000, BMP: 0 },
    { Natural: 70, Compacted: 74, Impervious: 98, BMP: 98 },
  );
  approx(r.value, 84);
});

test('compositeCn: zero area returns 0', () => {
  const r = compositeCn(
    { Natural: 0, Compacted: 0, Impervious: 0, BMP: 0 },
    { Natural: 70, Compacted: 74, Impervious: 98, BMP: 98 },
  );
  approx(r.value, 0);
});

test('scsRunoffDepth alias == tr55RunoffDepth', () => {
  approx(scsRunoffDepth(3.14, 98), tr55RunoffDepth(3.14, 98), 1e-9);
});

test('detentionSummary: flags SDAs where post Q > pre Q', () => {
  const sdas = [
    { sdaId: 'SDA-1',
      pre:  { Natural: 1000, Compacted: 0, Impervious: 0,    BMP: 0 },
      post: { Natural: 0,    Compacted: 0, Impervious: 1000, BMP: 0 } },
    { sdaId: 'SDA-2',
      pre:  { Natural: 1000, Compacted: 0, Impervious: 0, BMP: 0 },
      post: { Natural: 1000, Compacted: 0, Impervious: 0, BMP: 0 } },
  ];
  const detentionCn = { Natural: 70, Compacted: 74, Impervious: 98, BMP: 98 };
  const r = detentionSummary(sdas, 3.14, 5.23, detentionCn);
  assert.equal(r.anyRequired, true);
  const sda1 = r.perSda[0];
  assert.equal(sda1.sdaId, 'SDA-1');
  assert.equal(sda1.p2Required, true);
  assert.equal(sda1.p15Required, true);
  const sda2 = r.perSda[1];
  assert.equal(sda2.p2Required, false);
  assert.equal(sda2.p15Required, false);
});

test('siteAggregateLandCover: sums across SDAs', () => {
  const sdas = [
    { landUse: 'Impervious Vehicular', preIn: 1000, postIn: 1200 },
    { landUse: 'Natural (Woods)',      preIn: 500,  postIn: 300 },
    { landUse: 'Impervious Vehicular', preIn: 200,  postIn: 400 },
  ];
  const r = siteAggregateLandCover(sdas);
  assert.equal(r.pre.impervious, 1200);
  assert.equal(r.pre.natural, 500);
  assert.equal(r.post.impervious, 1600);
  assert.equal(r.post.natural, 300);
});

test('siteSwrv: sum of per-SDA SWRv_req (informational)', () => {
  const sdas = [
    { sdaId: 'SDA-1', landUse: 'Impervious Vehicular', postIn: 1000 },
    { sdaId: 'SDA-2', landUse: 'Impervious Vehicular', postIn: 2000 },
  ];
  const r = siteSwrv(sdas, 1.2, { rv: { 'Impervious Vehicular': 0.95 } });
  // (1000+2000) × 0.95 × 1.2 / 12 = 285 CF
  approx(r.value, 285);
});
```

- [ ] **Step 2: Run tests, expect 6 failures**

```bash
cd summary_calculator
node --test tests/calc.test.mjs
```

- [ ] **Step 3: Append to `src/calc.mjs`**

```js
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
```

- [ ] **Step 4: Run tests, expect all pass**

```bash
cd summary_calculator
node --test tests/calc.test.mjs
```

Expected: 21 tests pass (10 ports + 5 BMP sizing + 6 site/detention).

- [ ] **Step 5: Commit**

```bash
git add summary_calculator/src/calc.mjs summary_calculator/tests/calc.test.mjs
git commit -m "summary-calculator: add site aggregates, composite CN, detention summary"
```
