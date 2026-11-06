# summary_calculator — Template Gap Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add print-deck coverage in `summary_calculator` for Area_Summary, TC_PATH, PEAK_DISCHARGE_SDA, PEAK_DISCHARGE_CDA, DOEE_DETENTION_BMP, and a derived EISA §438 Direct Determination timestep view — matching the current workbook template.

**Architecture:** Reuse the existing 5-module layered style (parse / calc / aggregate / render / ui). New code lives inside those files. `calc.mjs`, `aggregate.mjs`, `parse.mjs` must stay byte-identical with `education/src/` copies (engine-parity CI test enforces this).

**Tech Stack:** Vanilla JS modules (ES modules), SheetJS (vendored bundle), Node test runner. Python (openpyxl) for fixture generation.

**Design reference:** `docs/superpowers/specs/2026-11-06-summary-calculator-template-gaps-design.md`

**Execution:** Each task is one subagent pass. After each task: tests green, engine-parity byte-diff clean (where applicable), one commit.

---

## Task 6.0 — Shared helpers (`optionalSheet`, `pushIfNonEmpty`)

**Files:**
- Modify: `summary_calculator/src/parse.mjs:26-37` (add `optionalSheet` next to `requireSheet`)
- Modify: `summary_calculator/src/ui.mjs` (add `pushIfNonEmpty` helper)
- Modify: `summary_calculator/tests/parse.test.mjs` (add helper tests)
- Sync: `education/src/parse.mjs` (via `scripts/sync-education-engines.sh`)

- [ ] **Step 1: Write the failing test for `optionalSheet`**

Open `summary_calculator/tests/parse.test.mjs` and append:

```javascript
import { optionalSheet } from '../src/parse.mjs';

test('optionalSheet: returns the sheet when present', () => {
  const fakeWb = { SheetNames: ['FOO'], Sheets: { FOO: { '!ref': 'A1:A1' } } };
  assert.equal(optionalSheet(fakeWb, 'FOO'), fakeWb.Sheets.FOO);
});

test('optionalSheet: returns null when missing (does not throw)', () => {
  const fakeWb = { SheetNames: ['FOO'], Sheets: { FOO: {} } };
  assert.equal(optionalSheet(fakeWb, 'MISSING'), null);
});
```

- [ ] **Step 2: Run tests, verify failure**

```bash
cd summary_calculator && npm test 2>&1 | grep -E "not ok|fail"
```
Expected: `SyntaxError: The requested module '../src/parse.mjs' does not provide an export named 'optionalSheet'` or `not ok`.

- [ ] **Step 3: Implement `optionalSheet`**

In `summary_calculator/src/parse.mjs`, right after the existing `requireSheet` function (around line 37), add:

```javascript
export function optionalSheet(wb, name) {
  if (!wb.SheetNames.includes(name)) return null;
  return wb.Sheets[name];
}
```

- [ ] **Step 4: Run tests, verify green**

```bash
cd summary_calculator && npm test 2>&1 | tail -5
```
Expected: `# pass 99+` (prior 99 + 2 new).

- [ ] **Step 5: Add `pushIfNonEmpty` to `ui.mjs`**

In `summary_calculator/src/ui.mjs`, locate the `const push = ...` declaration and add directly after it:

```javascript
const pushIfNonEmpty = (label, html) => {
  if (html && typeof html === 'string' && html.trim().length > 0) {
    push(label, html);
  }
};
```

- [ ] **Step 6: Sync to education**

```bash
bash scripts/sync-education-engines.sh
diff -q summary_calculator/src/parse.mjs education/src/parse.mjs
```
Expected: no output from `diff` (files identical).

- [ ] **Step 7: Run all three JS suites**

```bash
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education && npm test 2>&1 | tail -3
cd ../populator && npm test 2>&1 | tail -3
```
Expected: all green, education's engine-parity test passes.

- [ ] **Step 8: Commit**

```bash
git add summary_calculator/src/parse.mjs summary_calculator/src/ui.mjs \
        summary_calculator/tests/parse.test.mjs education/src/parse.mjs
git commit -m "feat(apps): add optionalSheet + pushIfNonEmpty helpers

Prerequisites for the Area_Summary / TC_PATH / PEAK_DISCHARGE /
DOEE_DETENTION_BMP / EISA Timestep features. optionalSheet lets
parsers gracefully handle workbooks that pre-date a sheet; pushIfNonEmpty
lets ui.mjs omit deck pages when the underlying sheet is absent.

Synced parse.mjs to education/src byte-identical."
```

---

## Task 6.1 — Area_Summary feature

**Files:**
- Modify: `summary_calculator/src/aggregate.mjs` (add `areaSummaryRollup`)
- Modify: `summary_calculator/src/render.mjs` (add `renderAreaSummarySheet`)
- Modify: `summary_calculator/src/ui.mjs` (wire the page between CDA Post and BMP)
- Modify: `summary_calculator/tests/aggregate.test.mjs` (rollup tests)
- Modify: `summary_calculator/tests/render.test.mjs` (render test)
- Sync: `education/src/aggregate.mjs`

- [ ] **Step 1: Write failing aggregate test**

Append to `summary_calculator/tests/aggregate.test.mjs`:

```javascript
import { areaSummaryRollup } from '../src/aggregate.mjs';

test('areaSummaryRollup: splits Pre/Post by land use and flags Area Match', () => {
  const sdaExisting = [
    { sdaId: 'SDA-1', landUse: 'Impervious Vehicular',     areaIn: 1000 },
    { sdaId: 'SDA-1', landUse: 'Impervious Non-Vehicular', areaIn: 500 },
    { sdaId: 'SDA-1', landUse: 'Compacted (Open Space)',   areaIn: 200 },
    { sdaId: 'SDA-1', landUse: 'Natural (Woods)',          areaIn: 100 },
  ];
  const sdaProposed = [
    { sdaId: 'SDA-1', landUse: 'Impervious Vehicular',     areaIn: 1000 },
    { sdaId: 'SDA-1', landUse: 'Impervious Non-Vehicular', areaIn: 500 },
    { sdaId: 'SDA-1', landUse: 'Compacted (Open Space)',   areaIn: 200 },
    { sdaId: 'SDA-1', landUse: 'Natural (Woods)',          areaIn: 100 },
    { sdaId: 'SDA-1', landUse: 'BMP',                      areaIn: 0   },
  ];
  const cdaExisting = [{ cdaId: 'CDA-1', sdaId: 'SDA-1', areaIn: 500 }];
  const cdaProposed = [{ cdaId: 'CDA-1', sdaId: 'SDA-1', areaIn: 500 }];
  const r = areaSummaryRollup(sdaExisting, sdaProposed, cdaExisting, cdaProposed);
  assert.equal(r.sdaRows.length, 1);
  assert.equal(r.sdaRows[0].preImp, 1500);
  assert.equal(r.sdaRows[0].preTotal, 1800);
  assert.equal(r.sdaRows[0].postTotal, 1800);
  assert.equal(r.sdaRows[0].areaMatch, 'OK');
  assert.equal(r.cdaRows[0].maxBmpCredit, 500 * 1.7 / 12);
  assert.equal(r.cdaRows[0].areaMatch, 'OK');
});

test('areaSummaryRollup: flags MISMATCH when Pre differs from Post by > 1 SF', () => {
  const sdaExisting = [{ sdaId: 'SDA-2', landUse: 'Impervious Vehicular', areaIn: 1000 }];
  const sdaProposed = [{ sdaId: 'SDA-2', landUse: 'Impervious Vehicular', areaIn: 1100 }];
  const r = areaSummaryRollup(sdaExisting, sdaProposed, [], []);
  assert.equal(r.sdaRows[0].areaMatch, 'MISMATCH');
});

test('areaSummaryRollup: em-dash when Pre or Post missing', () => {
  const r = areaSummaryRollup(
    [{ sdaId: 'SDA-3', landUse: 'Impervious Vehicular', areaIn: 500 }],
    [],
    [], [],
  );
  assert.equal(r.sdaRows[0].areaMatch, '—');
});
```

- [ ] **Step 2: Run tests, verify failure**

```bash
cd summary_calculator && npm test 2>&1 | grep -E "not ok|fail"
```
Expected: 3 new failures referencing `areaSummaryRollup`.

- [ ] **Step 3: Implement `areaSummaryRollup` in aggregate.mjs**

Append to `summary_calculator/src/aggregate.mjs`:

```javascript
export function areaSummaryRollup(sdaExisting, sdaProposed, cdaExisting, cdaProposed) {
  const _sumBy = (rows, sdaId, landUse) =>
    rows.filter(r => r.sdaId === sdaId && r.landUse === landUse)
        .reduce((a, r) => a + (r.areaIn || 0), 0);

  const _impSum = (rows, sdaId) =>
    _sumBy(rows, sdaId, 'Impervious Vehicular') +
    _sumBy(rows, sdaId, 'Impervious Non-Vehicular');

  const sdaIds = new Set([
    ...sdaExisting.map(r => r.sdaId),
    ...sdaProposed.map(r => r.sdaId),
  ].filter(Boolean));

  const sdaRows = [...sdaIds].sort().map(sdaId => {
    const preImp  = _impSum(sdaExisting, sdaId);
    const preComp = _sumBy(sdaExisting, sdaId, 'Compacted (Open Space)');
    const preNat  = _sumBy(sdaExisting, sdaId, 'Natural (Woods)');
    const preTotal = preImp + preComp + preNat;
    const postImp  = _impSum(sdaProposed, sdaId);
    const postComp = _sumBy(sdaProposed, sdaId, 'Compacted (Open Space)');
    const postNat  = _sumBy(sdaProposed, sdaId, 'Natural (Woods)');
    const postBmp  = _sumBy(sdaProposed, sdaId, 'BMP');
    const postTotal = postImp + postComp + postNat + postBmp;
    const hasPre  = sdaExisting.some(r => r.sdaId === sdaId);
    const hasPost = sdaProposed.some(r => r.sdaId === sdaId);
    const areaMatch = (!hasPre || !hasPost) ? '—'
                    : Math.abs(postTotal - preTotal) <= 1 ? 'OK'
                    : 'MISMATCH';
    return { sdaId, preImp, preComp, preNat, preTotal,
             postImp, postComp, postNat, postBmp, postTotal,
             swrvReq: 0, areaMatch };
  });

  const cdaIds = new Set([
    ...cdaExisting.map(r => r.cdaId),
    ...cdaProposed.map(r => r.cdaId),
  ].filter(Boolean));

  const cdaRows = [...cdaIds].sort().map(cdaId => {
    const preTotal  = cdaExisting.filter(r => r.cdaId === cdaId)
                                 .reduce((a, r) => a + (r.areaIn || 0), 0);
    const postTotal = cdaProposed.filter(r => r.cdaId === cdaId)
                                 .reduce((a, r) => a + (r.areaIn || 0), 0);
    const sdaId = (cdaProposed.find(r => r.cdaId === cdaId) || {}).sdaId
               || (cdaExisting.find(r => r.cdaId === cdaId) || {}).sdaId
               || '';
    const hasPre  = cdaExisting.some(r => r.cdaId === cdaId);
    const hasPost = cdaProposed.some(r => r.cdaId === cdaId);
    const areaMatch = (!hasPre || !hasPost) ? '—'
                    : Math.abs(postTotal - preTotal) <= 1 ? 'OK'
                    : 'MISMATCH';
    const maxBmpCredit = postTotal * 1.7 / 12;
    return { cdaId, sdaId, preTotal, postTotal, maxBmpCredit, areaMatch };
  });

  return { sdaRows, cdaRows };
}
```

- [ ] **Step 4: Run tests, verify green**

```bash
cd summary_calculator && npm test 2>&1 | tail -5
```
Expected: `# pass` count increased by 3.

- [ ] **Step 5: Write failing render test**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
import { renderAreaSummarySheet } from '../src/render.mjs';

test('renderAreaSummarySheet: emits both section headers and Area Match badges', () => {
  const project = { name: 'Test Project', number: 'T-001' };
  const areaSummary = {
    sdaRows: [
      { sdaId: 'SDA-1', preImp: 1500, preComp: 200, preNat: 100, preTotal: 1800,
        postImp: 1500, postComp: 200, postNat: 100, postBmp: 0, postTotal: 1800,
        swrvReq: 180, areaMatch: 'OK' },
    ],
    cdaRows: [
      { cdaId: 'CDA-1', sdaId: 'SDA-1', preTotal: 500, postTotal: 600,
        maxBmpCredit: 85, areaMatch: 'MISMATCH' },
    ],
  };
  const html = renderAreaSummarySheet(project, areaSummary);
  assert.ok(html.includes('SDA Summary'), 'SDA section header missing');
  assert.ok(html.includes('CDA Summary'), 'CDA section header missing');
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('CDA-1'));
  assert.ok(html.includes('MISMATCH'));
});
```

- [ ] **Step 6: Run test, verify failure**

```bash
cd summary_calculator && npm test 2>&1 | grep -E "renderAreaSummary"
```
Expected: `not ok` or missing-export error.

- [ ] **Step 7: Implement `renderAreaSummarySheet`**

Append to `summary_calculator/src/render.mjs`:

```javascript
export function renderAreaSummarySheet(project, areaSummary) {
  const sdaHeaders = ['SDA_ID',
    'Pre Imp (SF)', 'Pre Comp (SF)', 'Pre Nat (SF)', 'Pre Total (SF)',
    'Post Imp (SF)', 'Post Comp (SF)', 'Post Nat (SF)', 'Post BMP (SF)',
    'Post Total (SF)', 'SWRv Req (CF)', 'Area Match?'];
  const sdaRows = areaSummary.sdaRows.map(r => [
    r.sdaId,
    _asN(r.preImp), _asN(r.preComp), _asN(r.preNat), _asN(r.preTotal),
    _asN(r.postImp), _asN(r.postComp), _asN(r.postNat), _asN(r.postBmp),
    _asN(r.postTotal), _asN(r.swrvReq), _asBadge(r.areaMatch),
  ]);
  const cdaHeaders = ['CDA_ID', 'SDA_ID',
    'Pre Total (SF)', 'Post Total (SF)', 'Max BMP Credit (CF)', 'Area Match?'];
  const cdaRows = areaSummary.cdaRows.map(r => [
    r.cdaId, r.sdaId,
    _asN(r.preTotal), _asN(r.postTotal), _asN(r.maxBmpCredit), _asBadge(r.areaMatch),
  ]);
  const body = [
    renderBlock('SDA Summary — Pre vs. Post land cover + SWRv per SDA_ID',
      renderDataTable(sdaHeaders, sdaRows)),
    renderBlock('CDA Summary — Max BMP Credit per CDA (DOEE 1.7″ cap)',
      renderDataTable(cdaHeaders, cdaRows)),
  ].join('\n');
  return renderSheetShell({
    title: 'Area_Summary',
    sub:   `${project.name || ''} · ${project.number || ''}`,
    body,
    footer: 'Area Match tolerance ±1 SF',
    landscape: true,
  });
}

function _asN(v) {
  if (v == null || v === '') return '—';
  return (typeof v === 'number' ? v : Number(v)).toLocaleString('en-US',
    { maximumFractionDigits: 2 });
}

function _asBadge(status) {
  if (status === 'OK')       return '<span class="cs-ok">✓ OK</span>';
  if (status === 'MISMATCH') return '<span class="cs-warn">⚠ MISMATCH</span>';
  return '—';
}
```

- [ ] **Step 8: Run test, verify green**

```bash
cd summary_calculator && npm test 2>&1 | tail -5
```
Expected: all green.

- [ ] **Step 9: Wire the page into `ui.mjs`**

In `summary_calculator/src/ui.mjs`:

1. Add to the render import block:
   ```javascript
   renderAreaSummarySheet,
   ```
2. Add to the aggregate import block:
   ```javascript
   areaSummaryRollup,
   ```
3. After the `const cdaPostPages = renderCdaPostSheet(...)` line, add:
   ```javascript
   const areaSummary = areaSummaryRollup(
     parsed.sdaExisting, parsed.sdaProposed,
     parsed.cdaExisting, parsed.cdaProposed,
   );
   ```
4. In the `laterLabels.push(...sdaPreLabels, ...sdaPostLabels, ...cdaPreLabels, ...cdaPostLabels);` line, append `'Area_Summary'` to the array:
   ```javascript
   laterLabels.push(...sdaPreLabels, ...sdaPostLabels,
                    ...cdaPreLabels, ...cdaPostLabels,
                    'Area_Summary');
   ```
5. Right after the `cdaPostPages.forEach(...)` push loop, add:
   ```javascript
   pushIfNonEmpty('Area_Summary', renderAreaSummarySheet(project, areaSummary));
   ```

- [ ] **Step 10: Sync to education + byte-diff**

```bash
bash scripts/sync-education-engines.sh
diff -q summary_calculator/src/aggregate.mjs education/src/aggregate.mjs
```
Expected: no diff output.

- [ ] **Step 11: Run all three JS suites**

```bash
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education && npm test 2>&1 | tail -3
cd ../populator && npm test 2>&1 | tail -3
```
Expected: all green.

- [ ] **Step 12: Commit**

```bash
git add summary_calculator/src/aggregate.mjs summary_calculator/src/render.mjs \
        summary_calculator/src/ui.mjs \
        summary_calculator/tests/aggregate.test.mjs summary_calculator/tests/render.test.mjs \
        education/src/aggregate.mjs
git commit -m "feat(summary_calculator): render Area_Summary deck page

Aggregate SDA + CDA rollups into the Area_Summary shape (12-col SDA
section, 6-col CDA section) with Area Match status (OK / MISMATCH / em-dash,
tolerance 1 SF). Insert new deck page between CDA Post and BMP pages.
Synced aggregate.mjs to education/src byte-identical."
```

---

## Task 6.2 — TC_PATH feature

**Files:**
- Modify: `summary_calculator/src/parse.mjs` (add `parseTcPath` + wire into `parseWorkbook`)
- Modify: `summary_calculator/src/calc.mjs` (add TC functions)
- Modify: `summary_calculator/src/render.mjs` (add `renderTcPathSheet`)
- Modify: `summary_calculator/src/ui.mjs` (wire page)
- Create: `summary_calculator/tests/fixtures/tc-path-sample.xlsx` (generated by step 3)
- Create: `summary_calculator/tests/fixtures/generate_fixtures.py` (new shared fixture generator)
- Modify: tests
- Sync: `education/src/{parse,calc}.mjs`

- [ ] **Step 1: Write failing calc tests**

Append to `summary_calculator/tests/calc.test.mjs`:

```javascript
import { tcSheetFlow, tcShallowFlow, tcChannelFlow, timeOfConcentration } from '../src/calc.mjs';

test('tcSheetFlow: NRCS kinematic formula (TR-55 Eq 3-3)', () => {
  // L=100 ft, s=0.01, n=0.15 (short grass), P2=3.1 in
  // Tt = 0.007 * (n*L)^0.8 / (P2^0.5 * s^0.4) hr * 60 = min
  const tt = tcSheetFlow({ length: 100, slope: 0.01, n: 0.15, P2: 3.1 });
  // Hand: (0.15*100)^0.8 = 15^0.8 ≈ 8.6235; 3.1^0.5 ≈ 1.7607; 0.01^0.4 ≈ 0.1585
  // Tt_hr = 0.007 * 8.6235 / (1.7607 * 0.1585) ≈ 0.2164 hr → 12.98 min
  assert.ok(Math.abs(tt - 12.98) < 0.1, `expected ~12.98 min, got ${tt}`);
});

test('tcShallowFlow: V = k*sqrt(s); Tt_min = L / (V*60)', () => {
  // Paved, k=20.3282; L=500 ft, s=0.02; V = 20.3282*sqrt(0.02) ≈ 2.874 ft/s
  // Tt_min = 500 / (2.874 * 60) ≈ 2.9 min
  const tt = tcShallowFlow({ length: 500, slope: 0.02, surface: 'Paved' });
  assert.ok(Math.abs(tt - 2.9) < 0.1, `expected ~2.9 min, got ${tt}`);
});

test('tcChannelFlow: Tt_min = L / (V*60)', () => {
  // L=1000 ft, V=3 ft/s → 5.556 min
  assert.ok(Math.abs(tcChannelFlow({ length: 1000, velocity: 3 }) - 5.556) < 0.01);
});

test('timeOfConcentration: sum of segment minutes, floor 6 min (0.1 hr)', () => {
  const segs = [
    { type: 'sheet', length: 100, slope: 0.01, n: 0.15, P2: 3.1 },
    { type: 'shallow', length: 500, slope: 0.02, surface: 'Paved' },
    { type: 'channel', length: 1000, velocity: 3 },
  ];
  const tc = timeOfConcentration(segs);
  assert.ok(tc >= 6, 'floor not applied');
  assert.ok(Math.abs(tc - (12.98 + 2.9 + 5.556)) < 0.2);
});
```

- [ ] **Step 2: Run calc tests, verify failure**

```bash
cd summary_calculator && npm test 2>&1 | grep -E "tc(Sheet|Shallow|Channel|timeOf)"
```

- [ ] **Step 3: Implement TC calc functions**

Append to `summary_calculator/src/calc.mjs`:

```javascript
// Shallow-concentrated flow velocity coefficient k = ft/s per sqrt(slope).
// Per NRCS TR-55 Figure 3-1 (subset most commonly used in DC projects).
export const SHALLOW_FLOW_K = {
  'Paved':                20.3282,
  'Unpaved':              16.1345,
  'Grassed waterway':     15.0,
  'Nearly bare & untilled': 10.0,
};

export function tcSheetFlow({ length, slope, n, P2 }) {
  if (!(length > 0 && slope > 0 && n > 0 && P2 > 0)) return null;
  const Tt_hr = 0.007 * Math.pow(n * length, 0.8)
              / (Math.pow(P2, 0.5) * Math.pow(slope, 0.4));
  return Tt_hr * 60;
}

export function tcShallowFlow({ length, slope, surface }) {
  const k = SHALLOW_FLOW_K[surface];
  if (!(length > 0 && slope > 0 && k > 0)) return null;
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
```

- [ ] **Step 4: Run calc tests, verify green**

```bash
cd summary_calculator && npm test 2>&1 | tail -5
```

- [ ] **Step 5: Create the shared fixture generator script**

Create `summary_calculator/tests/fixtures/generate_fixtures.py`:

```python
"""Generate minimal .xlsx test fixtures for parse.test.mjs.

Each fixture is a hand-crafted workbook with just enough sheets to
exercise one parse function. Run from repo root:

    python summary_calculator/tests/fixtures/generate_fixtures.py
"""
from pathlib import Path
import openpyxl

OUT_DIR = Path(__file__).resolve().parent


def _write_project_sheet(wb):
    ws = wb.create_sheet('PROJECT')
    for r, (k, v) in enumerate([
        ('Project Name', 'Test'),
        ('Project Number', 'T-001'),
        ('MS4 / CSS', 'MS4'),
        ('In AWDZ?', 'No'),
        ('DOEE Plan Review No.', 1),
        ('Total LOD Area (SF)', 10000),
        ('Retention Target (in)', 1.2),
        ('EISA 438 Depth (in)', 1.7),
        ('Trigger Type', 'MLD'),
        ('EISA Section 438 Applies?', 'Yes'),
    ], start=3):
        ws.cell(r, 1, k); ws.cell(r, 2, v)


def _write_bare_required_sheets(wb):
    """Minimal PROJECT, PARAMS, SDA_Existing, SDA_Proposed, CDA_Existing,
    CDA_Proposed, BMP so parseWorkbook does not throw."""
    _write_project_sheet(wb)
    for name in ['PARAMS', 'SDA_Existing', 'SDA_Proposed',
                 'CDA_Existing', 'CDA_Proposed', 'BMP']:
        wb.create_sheet(name)


def build_tc_path_fixture():
    wb = openpyxl.Workbook(); wb.remove(wb.active)
    _write_bare_required_sheets(wb)
    ws = wb.create_sheet('TC_PATH')
    # Header row 3
    for c, h in enumerate([
        'ID', 'Name', 'Tc direct (min)',
        'Sheet n', 'Sheet L', 'Sheet P2', 'Sheet S', 'Tt_sheet (hr)',
        'Shallow surface', 'Shallow L', 'Shallow S', 'Tt_shallow (hr)',
        'Channel 1 L', 'Channel 1 V', 'Tt_ch1 (hr)',
        'Channel 2 L', 'Channel 2 V', 'Tt_ch2 (hr)',
        'Tc computed (hr)', 'Tc final (hr)', 'Tc final (min)',
    ], start=1):
        ws.cell(3, c, h)
    # Row 4: full path (sheet + shallow + channel)
    ws.cell(4, 1, 'SDA-1'); ws.cell(4, 2, 'Full path')
    ws.cell(4, 4, 0.15); ws.cell(4, 5, 100); ws.cell(4, 6, 3.1); ws.cell(4, 7, 0.01)
    ws.cell(4, 9, 'Paved'); ws.cell(4, 10, 500); ws.cell(4, 11, 0.02)
    ws.cell(4, 13, 1000); ws.cell(4, 14, 3)
    # Row 5: Tc direct override
    ws.cell(5, 1, 'SDA-2'); ws.cell(5, 2, 'Direct'); ws.cell(5, 3, 12.5)
    # Row 6: incomplete (just a shallow segment)
    ws.cell(6, 1, 'CDA-1'); ws.cell(6, 2, 'Short path')
    ws.cell(6, 9, 'Unpaved'); ws.cell(6, 10, 300); ws.cell(6, 11, 0.03)
    wb.save(OUT_DIR / 'tc-path-sample.xlsx')


if __name__ == '__main__':
    build_tc_path_fixture()
    print('Wrote fixtures to', OUT_DIR)
```

Run it:

```bash
python summary_calculator/tests/fixtures/generate_fixtures.py
```

Expected: `Wrote fixtures to .../tests/fixtures`. A new `tc-path-sample.xlsx` appears.

- [ ] **Step 6: Write failing parse test**

Append to `summary_calculator/tests/parse.test.mjs`:

```javascript
import { parseTcPath, optionalSheet } from '../src/parse.mjs';

const tcFixtureBytes = await readFile(
  join(__dirname, 'fixtures', 'tc-path-sample.xlsx'),
);
const tcWb = XLSX.read(new Uint8Array(tcFixtureBytes), { type: 'array' });

test('parseTcPath: reads 3 paths including Tc-direct override and incomplete row', () => {
  const sheet = optionalSheet(tcWb, 'TC_PATH');
  assert.ok(sheet);
  const paths = parseTcPath(sheet);
  assert.equal(paths.length, 3);
  assert.equal(paths[0].pathId, 'SDA-1');
  assert.equal(paths[0].segments.length, 3);
  assert.equal(paths[1].pathId, 'SDA-2');
  assert.equal(paths[1].tcDirectMin, 12.5);
  assert.equal(paths[2].segments.length, 1);
});
```

- [ ] **Step 7: Run parse test, verify failure**

```bash
cd summary_calculator && npm test 2>&1 | grep -E "parseTcPath|tc-path"
```

- [ ] **Step 8: Implement `parseTcPath`**

Append to `summary_calculator/src/parse.mjs`:

```javascript
// TC_PATH layout (from workbook/builders/tc_path.py):
//   Header row 3; data rows 4..23 (20 paths max).
//   A=ID, B=Name, C=Tc direct (min),
//   D=Sheet n, E=Sheet L, F=Sheet P2, G=Sheet S,
//   I=Shallow surface, J=Shallow L, K=Shallow S,
//   M=Channel 1 L, N=Channel 1 V,
//   P=Channel 2 L, Q=Channel 2 V.
export function parseTcPath(sheet) {
  if (!sheet) return [];
  const rows = [];
  for (let r = 4; r <= DATA_MAX_ROW; r++) {
    const pathId = cell(sheet, r, 1);
    const name   = cell(sheet, r, 2);
    const tcDirectMin = cell(sheet, r, 3);
    const sheetN = cell(sheet, r, 4);
    const sheetL = cell(sheet, r, 5);
    const sheetP = cell(sheet, r, 6);
    const sheetS = cell(sheet, r, 7);
    const shSurf = cell(sheet, r, 9);
    const shL    = cell(sheet, r, 10);
    const shS    = cell(sheet, r, 11);
    const c1L    = cell(sheet, r, 13);
    const c1V    = cell(sheet, r, 14);
    const c2L    = cell(sheet, r, 16);
    const c2V    = cell(sheet, r, 17);
    const empty = [pathId, name, tcDirectMin, sheetL, shL, c1L, c2L].every(v => v == null);
    if (empty) break;
    const segments = [];
    if (sheetL != null) segments.push({ type: 'sheet', length: sheetL, slope: sheetS, n: sheetN, P2: sheetP });
    if (shL    != null) segments.push({ type: 'shallow', length: shL, slope: shS, surface: shSurf });
    if (c1L    != null) segments.push({ type: 'channel', length: c1L, velocity: c1V });
    if (c2L    != null) segments.push({ type: 'channel', length: c2L, velocity: c2V });
    rows.push({ pathId, name, tcDirectMin, segments });
  }
  return rows;
}
```

- [ ] **Step 9: Run parse test, verify green**

```bash
cd summary_calculator && npm test 2>&1 | tail -5
```

- [ ] **Step 10: Write failing render test**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
import { renderTcPathSheet } from '../src/render.mjs';

test('renderTcPathSheet: one row per path, includes Tc min column', () => {
  const html = renderTcPathSheet({ name: 'T', number: 'T-001' }, [
    { pathId: 'SDA-1', name: 'Full', tcDirectMin: null, segments: [
      { type: 'sheet',   length: 100, slope: 0.01, n: 0.15, P2: 3.1 },
      { type: 'channel', length: 1000, velocity: 3 },
    ], tcMin: 18.5 },
    { pathId: 'SDA-2', name: 'Direct', tcDirectMin: 12.5, segments: [], tcMin: 12.5 },
  ]);
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('SDA-2'));
  assert.ok(html.includes('18.5'));
  assert.ok(html.includes('Tc'));
});
```

- [ ] **Step 11: Run render test, verify failure**

- [ ] **Step 12: Implement `renderTcPathSheet`**

Append to `summary_calculator/src/render.mjs`:

```javascript
export function renderTcPathSheet(project, tcPaths) {
  if (!tcPaths || tcPaths.length === 0) return '';
  const headers = ['Path ID', 'Name', 'Method', 'Segments', 'Tc direct (min)', 'Tc total (min)'];
  const rows = tcPaths.map(p => {
    const method = p.tcDirectMin != null ? 'Direct' :
      p.segments.map(s => s.type).join(' + ') || '—';
    const segs = p.segments.length === 0 ? '—' :
      p.segments.map(s => `${s.type}:${s.length}ft`).join(', ');
    const tcDirect = p.tcDirectMin != null ? p.tcDirectMin.toFixed(1) : '—';
    const tcTotal  = p.tcMin != null ? p.tcMin.toFixed(1) : '—';
    return [p.pathId, p.name || '—', method, segs, tcDirect, tcTotal];
  });
  return renderSheetShell({
    title: 'TC_PATH — Time of Concentration',
    sub:   `${project.name || ''} · ${project.number || ''}`,
    body:  renderBlock('Flow paths', renderDataTable(headers, rows)),
    footer: 'NRCS TR-55 Sheet / Shallow / Channel; floor Tc ≥ 6 min',
    landscape: true,
  });
}
```

- [ ] **Step 13: Run render test, verify green**

- [ ] **Step 14: Wire parse + ui**

In `summary_calculator/src/parse.mjs`, inside `parseWorkbook`'s return object, add:

```javascript
    tcPaths: parseTcPath(optionalSheet(wb, 'TC_PATH')),
```

In `summary_calculator/src/ui.mjs`:
1. Import `renderTcPathSheet` and `timeOfConcentration`.
2. After the EISA Compliance push, add:
   ```javascript
   const tcPaths = (parsed.tcPaths || []).map(p => ({
     ...p,
     tcMin: p.tcDirectMin != null ? p.tcDirectMin
          : (p.segments.length ? timeOfConcentration(p.segments) : null),
   }));
   pushIfNonEmpty('TC_PATH — Time of Concentration',
                  renderTcPathSheet(project, tcPaths));
   ```
3. Add `'TC_PATH — Time of Concentration'` to `laterLabels` at the matching insertion index.

- [ ] **Step 15: Sync + byte-diff**

```bash
bash scripts/sync-education-engines.sh
diff -q summary_calculator/src/parse.mjs education/src/parse.mjs
diff -q summary_calculator/src/calc.mjs  education/src/calc.mjs
```

- [ ] **Step 16: Run all three JS suites**

```bash
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education && npm test 2>&1 | tail -3
cd ../populator && npm test 2>&1 | tail -3
```

- [ ] **Step 17: Commit**

```bash
git add summary_calculator/src/parse.mjs summary_calculator/src/calc.mjs \
        summary_calculator/src/render.mjs summary_calculator/src/ui.mjs \
        summary_calculator/tests/parse.test.mjs summary_calculator/tests/calc.test.mjs \
        summary_calculator/tests/render.test.mjs \
        summary_calculator/tests/fixtures/generate_fixtures.py \
        summary_calculator/tests/fixtures/tc-path-sample.xlsx \
        education/src/parse.mjs education/src/calc.mjs
git commit -m "feat(summary_calculator): render TC_PATH deck page

Parse TC_PATH sheet; compute Time of Concentration via NRCS TR-55
(sheet / shallow / channel flow segments) with Tc floor of 6 min.
New fixture generator script produces tc-path-sample.xlsx for
parse tests. Synced parse.mjs + calc.mjs to education/src."
```

---

## Task 6.3 — PEAK_DISCHARGE_SDA feature

**Files:**
- Modify: `summary_calculator/src/parse.mjs` (add `parsePeakDischarge`)
- Modify: `summary_calculator/src/calc.mjs` (add TR-55 unit peak + Qpeak)
- Modify: `summary_calculator/src/render.mjs` (add `renderPeakDischargeSdaSheet`)
- Modify: `summary_calculator/src/ui.mjs` (wire page)
- Modify: `summary_calculator/tests/fixtures/generate_fixtures.py` (add peak fixture builder)
- Create: `summary_calculator/tests/fixtures/peak-discharge-sample.xlsx` (generated)
- Modify: tests
- Sync: `education/src/{parse,calc}.mjs`

- [ ] **Step 1: Write failing calc test (unit peak + Qpeak)**

Append to `summary_calculator/tests/calc.test.mjs`:

```javascript
import { tr55UnitPeakDischarge, tr55PeakDischargeCfs } from '../src/calc.mjs';

// PARAMS_TR55 row shape per DOEE spreadsheet: [IaP, C0, C1, C2].
// Minimal 2-row test table to exercise interpolation + clamp.
const PARAMS_TR55 = [
  [0.10, 2.55323, -0.61512, -0.16403],
  [0.30, 2.46532, -0.62257, -0.11657],
];

test('tr55UnitPeakDischarge: evaluates polynomial at tabulated IaP', () => {
  // At IaP = 0.10, Tc = 0.5 hr: log10(0.5) = -0.30103
  // log10(qu) = 2.55323 + (-0.61512)*(-0.30103) + (-0.16403)*(-0.30103)^2
  //           = 2.55323 + 0.18520 + (-0.01487) = 2.72356
  // qu = 10^2.72356 ≈ 529
  const qu = tr55UnitPeakDischarge(70, 0.5, 0.10, PARAMS_TR55);
  assert.ok(Math.abs(qu - 529) < 5, `expected ~529 csm/in, got ${qu}`);
});

test('tr55UnitPeakDischarge: clamps IaP to table range', () => {
  const quLow = tr55UnitPeakDischarge(70, 0.5, 0.05, PARAMS_TR55);
  const quAt10 = tr55UnitPeakDischarge(70, 0.5, 0.10, PARAMS_TR55);
  assert.equal(quLow, quAt10, 'IaP < 0.10 should clamp to 0.10 row');
});

test('tr55UnitPeakDischarge: interpolates linearly on IaP', () => {
  // IaP = 0.20 is halfway between 0.10 and 0.30 — qu should be ~ midpoint
  const quMid = tr55UnitPeakDischarge(70, 0.5, 0.20, PARAMS_TR55);
  const qu10  = tr55UnitPeakDischarge(70, 0.5, 0.10, PARAMS_TR55);
  const qu30  = tr55UnitPeakDischarge(70, 0.5, 0.30, PARAMS_TR55);
  assert.ok(Math.abs(quMid - (qu10 + qu30) / 2) < 1);
});

test('tr55PeakDischargeCfs: Qpeak = qu * Am(mi^2) * Q(in) * Fp', () => {
  // qu=500 csm/in, Am=0.001 mi^2 (~0.64 ac), Q=2 in → Qpeak = 1 cfs
  const q = tr55PeakDischargeCfs(500, 0.001, 2);
  assert.ok(Math.abs(q - 1.0) < 0.01, `got ${q}`);
});
```

- [ ] **Step 2: Run calc tests, verify failure**

- [ ] **Step 3: Implement unit peak + Qpeak in calc.mjs**

Append to `summary_calculator/src/calc.mjs`:

```javascript
// NRCS TR-55 unit peak discharge (Appendix F log-polynomial).
// paramsTr55 shape: [[IaP, C0, C1, C2], ...] sorted ascending by IaP.
// Returns qu in csm/in. Clamps IaP to [first, last] row; linear interp between.
export function tr55UnitPeakDischarge(cn, tcHr, iaOverP, paramsTr55) {
  if (!(tcHr > 0) || !paramsTr55 || paramsTr55.length === 0) return null;
  const N = paramsTr55.length;
  const iaFirst = paramsTr55[0][0], iaLast = paramsTr55[N - 1][0];
  const iap = Math.min(Math.max(iaOverP, iaFirst), iaLast);

  // Find bracketing rows lo, hi (hi = lo + 1).
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
  const logTc = Math.log10(tcHr);
  const logQu = C0 + C1 * logTc + C2 * logTc * logTc;
  return Math.pow(10, logQu);
}

// TR-55 Eq 4-1: Qp = qu * Am * Q * Fp; Fp = 1.0.
export function tr55PeakDischargeCfs(qu, areaMi2, runoffIn) {
  if (qu == null || !(areaMi2 > 0)) return null;
  return qu * areaMi2 * (runoffIn || 0);
}
```

- [ ] **Step 4: Run calc tests, verify green**

- [ ] **Step 5: Add peak fixture builder**

In `summary_calculator/tests/fixtures/generate_fixtures.py`, append before `if __name__ == '__main__':`:

```python
def build_peak_discharge_fixture():
    wb = openpyxl.Workbook(); wb.remove(wb.active)
    _write_bare_required_sheets(wb)
    # Also need PARAMS_TR55 table for the interp
    params = wb['PARAMS']
    tr55 = [
        (0.10, 2.55323, -0.61512, -0.16403),
        (0.30, 2.46532, -0.62257, -0.11657),
        (0.35, 2.41896, -0.61594, -0.08820),
        (0.40, 2.36409, -0.59857, -0.05621),
        (0.45, 2.29238, -0.57005, -0.02281),
        (0.50, 2.20282, -0.51599,  0.01259),
    ]
    for i, (iap, c0, c1, c2) in enumerate(tr55):
        r = 76 + i
        params.cell(r, 1, iap); params.cell(r, 2, c0)
        params.cell(r, 3, c1);  params.cell(r, 4, c2)
    # PEAK_DISCHARGE_SDA sheet. Match workbook/builders/peak_discharge.py column layout.
    ws = wb.create_sheet('PEAK_DISCHARGE_SDA')
    # Header row 3 — we only need the parse-relevant columns to exist
    for c, h in enumerate([
        'SDA_ID', 'DA (SF)', 'DA (ac)', 'DA (mi^2)', 'Tc (hr)',
        'CN Pre', 'CN Post',
        'P 2yr (in)', 'S 2yr', 'Ia/P 2yr', 'qu 2yr',
        'Q Pre 2yr (in)', 'Q Post 2yr (in)', 'Qp Pre 2yr (cfs)', 'Qp Post 2yr (cfs)',
        'P 15yr (in)', 'S 15yr', 'Ia/P 15yr', 'qu 15yr',
        'Q Pre 15yr (in)', 'Q Post 15yr (in)', 'Qp Pre 15yr (cfs)', 'Qp Post 15yr (cfs)',
    ], start=1):
        ws.cell(3, c, h)
    # Row 4: one SDA with hand-pickable values
    ws.cell(4, 1, 'SDA-1')
    ws.cell(4, 2, 43560)   # DA (SF) = 1 acre
    ws.cell(4, 5, 0.5)     # Tc hr
    ws.cell(4, 6, 65); ws.cell(4, 7, 75)   # CN Pre/Post
    ws.cell(4, 8, 3.1); ws.cell(4, 10, 0.25)   # P 2yr, IaP 2yr
    ws.cell(4, 16, 5.23); ws.cell(4, 18, 0.15)  # P 15yr, IaP 15yr
    # Row 5: second SDA
    ws.cell(5, 1, 'SDA-2')
    ws.cell(5, 2, 87120)   # 2 ac
    ws.cell(5, 5, 0.3)
    ws.cell(5, 6, 70); ws.cell(5, 7, 85)
    ws.cell(5, 8, 3.1); ws.cell(5, 10, 0.20)
    ws.cell(5, 16, 5.23); ws.cell(5, 18, 0.12)
    wb.save(OUT_DIR / 'peak-discharge-sample.xlsx')
```

Add to `__main__`:
```python
    build_peak_discharge_fixture()
```

Run:
```bash
python summary_calculator/tests/fixtures/generate_fixtures.py
```

- [ ] **Step 6: Write failing parse test**

Append to `summary_calculator/tests/parse.test.mjs`:

```javascript
import { parsePeakDischarge } from '../src/parse.mjs';

const peakBytes = await readFile(
  join(__dirname, 'fixtures', 'peak-discharge-sample.xlsx'),
);
const peakWb = XLSX.read(new Uint8Array(peakBytes), { type: 'array' });

test('parsePeakDischarge: reads 2 SDA rows with DA, Tc, CN, P, IaP', () => {
  const rows = parsePeakDischarge(optionalSheet(peakWb, 'PEAK_DISCHARGE_SDA'), 'SDA_ID');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].areaId, 'SDA-1');
  assert.equal(rows[0].areaSf, 43560);
  assert.equal(rows[0].tcHr, 0.5);
  assert.equal(rows[0].cnPre, 65);
  assert.equal(rows[0].cnPost, 75);
  assert.equal(rows[0].p2In, 3.1);
  assert.equal(rows[0].iaOverP2yr, 0.25);
  assert.equal(rows[0].p15In, 5.23);
});
```

- [ ] **Step 7: Run parse test, verify failure**

- [ ] **Step 8: Implement `parsePeakDischarge`**

Append to `summary_calculator/src/parse.mjs`:

```javascript
// PEAK_DISCHARGE_SDA / _CDA layout (from workbook/builders/peak_discharge.py):
//   Header row 3; data rows 4..13.
//   A=ID, B=DA (SF), E=Tc (hr), F=CN Pre, G=CN Post,
//   H=P 2yr, J=Ia/P 2yr, P=P 15yr, R=Ia/P 15yr.
//   (Intermediate cols are Excel-side formulas; not parsed.)
export function parsePeakDischarge(sheet, idKey = 'SDA_ID') {
  if (!sheet) return [];
  const rows = [];
  for (let r = 4; r <= DATA_MAX_ROW; r++) {
    const areaId = cell(sheet, r, 1);
    if (!areaId) break;
    rows.push({
      areaId,
      idKey,
      areaSf:      cell(sheet, r, 2),
      tcHr:        cell(sheet, r, 5),
      cnPre:       cell(sheet, r, 6),
      cnPost:      cell(sheet, r, 7),
      p2In:        cell(sheet, r, 8),
      iaOverP2yr:  cell(sheet, r, 10),
      p15In:       cell(sheet, r, 16),
      iaOverP15yr: cell(sheet, r, 18),
    });
  }
  return rows;
}
```

- [ ] **Step 9: Run parse test, verify green**

- [ ] **Step 10: Write failing render test**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
import { renderPeakDischargeSdaSheet } from '../src/render.mjs';

test('renderPeakDischargeSdaSheet: renders 2-yr and 15-yr blocks per SDA', () => {
  const rows = [{
    areaId: 'SDA-1', areaSf: 43560, areaAc: 1, areaMi2: 0.0015625,
    tcHr: 0.5, cnPre: 65, cnPost: 75,
    p2In: 3.1, iaOverP2yr: 0.25,
    qu2yr: 400, qPre2yr: 0.3, qPost2yr: 0.9, qpPre2yr: 0.19, qpPost2yr: 0.56,
    p15In: 5.23, iaOverP15yr: 0.15,
    qu15yr: 500, qPre15yr: 1.4, qPost15yr: 2.5, qpPre15yr: 1.1, qpPost15yr: 2.0,
  }];
  const html = renderPeakDischargeSdaSheet({ name: 'T', number: 'T-001' }, rows);
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('2-yr'));
  assert.ok(html.includes('15-yr'));
});
```

- [ ] **Step 11: Run render test, verify failure**

- [ ] **Step 12: Implement `renderPeakDischargeSdaSheet`**

Append to `summary_calculator/src/render.mjs`:

```javascript
export function renderPeakDischargeSdaSheet(project, rows) {
  if (!rows || rows.length === 0) return '';
  const _fmt = (v, d = 2) => (v == null ? '—' :
    (typeof v === 'number' ? v.toFixed(d) : String(v)));
  const hdrs = ['SDA_ID', 'DA (ac)', 'Tc (hr)',
    'CN Pre', 'qu Pre', 'Q Pre (in)', 'Qp Pre (cfs)',
    'CN Post', 'qu Post', 'Q Post (in)', 'Qp Post (cfs)'];
  const to2yr = rows.map(r => [
    r.areaId, _fmt((r.areaSf || 0) / 43560), _fmt(r.tcHr),
    _fmt(r.cnPre, 0), _fmt(r.qu2yr, 0), _fmt(r.qPre2yr), _fmt(r.qpPre2yr),
    _fmt(r.cnPost, 0), _fmt(r.qu2yr, 0), _fmt(r.qPost2yr), _fmt(r.qpPost2yr),
  ]);
  const to15yr = rows.map(r => [
    r.areaId, _fmt((r.areaSf || 0) / 43560), _fmt(r.tcHr),
    _fmt(r.cnPre, 0), _fmt(r.qu15yr, 0), _fmt(r.qPre15yr), _fmt(r.qpPre15yr),
    _fmt(r.cnPost, 0), _fmt(r.qu15yr, 0), _fmt(r.qPost15yr), _fmt(r.qpPost15yr),
  ]);
  const body = [
    renderBlock('2-yr storm', renderDataTable(hdrs, to2yr)),
    renderBlock('15-yr storm', renderDataTable(hdrs, to15yr)),
  ].join('\n');
  return renderSheetShell({
    title: 'Peak Discharge — SDA',
    sub:   `${project.name || ''} · ${project.number || ''}`,
    body,
    footer: 'TR-55 Graphical (SCS Type II, NOAA Atlas 14); Qp = qu · Am · Q',
    landscape: true,
  });
}
```

- [ ] **Step 13: Run render test, verify green**

- [ ] **Step 14: Wire parse + ui**

In `parse.mjs` `parseWorkbook` return, add:

```javascript
    peakSda: parsePeakDischarge(optionalSheet(wb, 'PEAK_DISCHARGE_SDA'), 'SDA_ID'),
```

Also parse `params.tr55` (new, minimal addition). Inside `parseParams`, append before `return`:

```javascript
  // TR-55 Appendix F coefficients: rows 76-81, cols A-D.
  const tr55 = [];
  for (let r = 76; r <= 81; r++) {
    const iap = cell(sheet, r, 1);
    if (iap == null) continue;
    tr55.push([iap, cell(sheet, r, 2), cell(sheet, r, 3), cell(sheet, r, 4)]);
  }
```

And add `, tr55` to the returned object.

In `summary_calculator/src/ui.mjs`:
1. Import `renderPeakDischargeSdaSheet`, `tr55UnitPeakDischarge`, `tr55PeakDischargeCfs`.
2. After TC_PATH push, add:
   ```javascript
   const peakSda = (parsed.peakSda || []).map(r => {
     const areaMi2 = (r.areaSf || 0) / 27878400;
     const sPre  = 1000 / (r.cnPre  || 1) - 10;
     const sPost = 1000 / (r.cnPost || 1) - 10;
     const Q = (P, S) => (P > 0.2 * S ? Math.pow(P - 0.2 * S, 2) / (P + 0.8 * S) : 0);
     const qu2  = tr55UnitPeakDischarge(r.cnPre,  r.tcHr, r.iaOverP2yr,  parsed.params.tr55);
     const qu15 = tr55UnitPeakDischarge(r.cnPre,  r.tcHr, r.iaOverP15yr, parsed.params.tr55);
     const qPre2 = Q(r.p2In, sPre),   qPost2 = Q(r.p2In, sPost);
     const qPre15 = Q(r.p15In, sPre), qPost15 = Q(r.p15In, sPost);
     return { ...r, areaMi2,
       qu2yr: qu2, qPre2yr: qPre2, qPost2yr: qPost2,
       qpPre2yr:  tr55PeakDischargeCfs(qu2,  areaMi2, qPre2),
       qpPost2yr: tr55PeakDischargeCfs(qu2,  areaMi2, qPost2),
       qu15yr: qu15, qPre15yr: qPre15, qPost15yr: qPost15,
       qpPre15yr:  tr55PeakDischargeCfs(qu15, areaMi2, qPre15),
       qpPost15yr: tr55PeakDischargeCfs(qu15, areaMi2, qPost15),
     };
   });
   pushIfNonEmpty('Peak Discharge — SDA', renderPeakDischargeSdaSheet(project, peakSda));
   ```
3. Add `'Peak Discharge — SDA'` to `laterLabels` at the matching position.

- [ ] **Step 15: Sync + byte-diff + full suites**

```bash
bash scripts/sync-education-engines.sh
diff -q summary_calculator/src/parse.mjs education/src/parse.mjs
diff -q summary_calculator/src/calc.mjs  education/src/calc.mjs
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education && npm test 2>&1 | tail -3
cd ../populator && npm test 2>&1 | tail -3
```

- [ ] **Step 16: Commit**

```bash
git add summary_calculator/src/parse.mjs summary_calculator/src/calc.mjs \
        summary_calculator/src/render.mjs summary_calculator/src/ui.mjs \
        summary_calculator/tests/parse.test.mjs summary_calculator/tests/calc.test.mjs \
        summary_calculator/tests/render.test.mjs \
        summary_calculator/tests/fixtures/generate_fixtures.py \
        summary_calculator/tests/fixtures/peak-discharge-sample.xlsx \
        education/src/parse.mjs education/src/calc.mjs
git commit -m "feat(summary_calculator): render PEAK_DISCHARGE_SDA deck page

TR-55 graphical peak discharge per SDA, 2-yr and 15-yr storms.
tr55UnitPeakDischarge evaluates the Appendix F log-polynomial with
linear IaP interpolation (clamped to table range). parsePeakDischarge
is parameterized on idKey so the same function serves CDA in 6.4.
Synced parse.mjs + calc.mjs to education/src."
```

---

## Task 6.4 — PEAK_DISCHARGE_CDA feature

Reuses the parse + calc from 6.3; only the render differs.

**Files:**
- Modify: `summary_calculator/src/parse.mjs` (one line in `parseWorkbook`)
- Modify: `summary_calculator/src/render.mjs` (add `renderPeakDischargeCdaSheet`)
- Modify: `summary_calculator/src/ui.mjs` (wire)
- Modify: `summary_calculator/tests/fixtures/generate_fixtures.py` (add PEAK_DISCHARGE_CDA to fixture)
- Modify: tests
- Sync: `education/src/parse.mjs`

- [ ] **Step 1: Extend peak fixture to include CDA sheet**

In `summary_calculator/tests/fixtures/generate_fixtures.py`, inside `build_peak_discharge_fixture`, after the SDA block, add:

```python
    ws = wb.create_sheet('PEAK_DISCHARGE_CDA')
    for c, h in enumerate([
        'CDA_ID', 'DA (SF)', 'DA (ac)', 'DA (mi^2)', 'Tc (hr)',
        'CN Pre', 'CN Post',
        'P 2yr (in)', 'S 2yr', 'Ia/P 2yr', 'qu 2yr',
        'Q Pre 2yr (in)', 'Q Post 2yr (in)', 'Qp Pre 2yr (cfs)', 'Qp Post 2yr (cfs)',
        'P 15yr (in)', 'S 15yr', 'Ia/P 15yr', 'qu 15yr',
        'Q Pre 15yr (in)', 'Q Post 15yr (in)', 'Qp Pre 15yr (cfs)', 'Qp Post 15yr (cfs)',
    ], start=1):
        ws.cell(3, c, h)
    ws.cell(4, 1, 'CDA-1'); ws.cell(4, 2, 21780); ws.cell(4, 5, 0.3)
    ws.cell(4, 6, 65); ws.cell(4, 7, 75)
    ws.cell(4, 8, 3.1); ws.cell(4, 10, 0.25)
    ws.cell(4, 16, 5.23); ws.cell(4, 18, 0.15)
```

Re-run:
```bash
python summary_calculator/tests/fixtures/generate_fixtures.py
```

- [ ] **Step 2: Write failing parse test (CDA uses same parse function)**

Append to `summary_calculator/tests/parse.test.mjs`:

```javascript
test('parsePeakDischarge: reads CDA sheet when given idKey=CDA_ID', () => {
  const rows = parsePeakDischarge(optionalSheet(peakWb, 'PEAK_DISCHARGE_CDA'), 'CDA_ID');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].areaId, 'CDA-1');
  assert.equal(rows[0].idKey, 'CDA_ID');
});
```

- [ ] **Step 3: Run parse test, verify passes (parse function already supports both)**

```bash
cd summary_calculator && npm test 2>&1 | tail -5
```
Expected: already passes — no implementation change needed. The test documents the contract.

- [ ] **Step 4: Write failing render test**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
import { renderPeakDischargeCdaSheet } from '../src/render.mjs';

test('renderPeakDischargeCdaSheet: includes SDA_ID join column', () => {
  const rows = [{
    areaId: 'CDA-1', sdaId: 'SDA-1',
    areaSf: 21780, tcHr: 0.3,
    cnPre: 65, cnPost: 75,
    qu2yr: 500, qPre2yr: 0.3, qPost2yr: 1.0, qpPre2yr: 0.2, qpPost2yr: 0.6,
    qu15yr: 600, qPre15yr: 1.5, qPost15yr: 2.5, qpPre15yr: 1.1, qpPost15yr: 2.0,
  }];
  const html = renderPeakDischargeCdaSheet({ name: 'T', number: 'T-001' }, rows);
  assert.ok(html.includes('CDA-1'));
  assert.ok(html.includes('SDA-1'));
});
```

- [ ] **Step 5: Run render test, verify failure**

- [ ] **Step 6: Implement `renderPeakDischargeCdaSheet`**

Append to `summary_calculator/src/render.mjs`:

```javascript
export function renderPeakDischargeCdaSheet(project, rows) {
  if (!rows || rows.length === 0) return '';
  const _fmt = (v, d = 2) => (v == null ? '—' :
    (typeof v === 'number' ? v.toFixed(d) : String(v)));
  const hdrs = ['CDA_ID', 'SDA_ID', 'DA (ac)', 'Tc (hr)',
    'CN Pre', 'qu', 'Q Pre (in)', 'Qp Pre (cfs)',
    'CN Post', 'Q Post (in)', 'Qp Post (cfs)'];
  const to2yr = rows.map(r => [
    r.areaId, r.sdaId || '—',
    _fmt((r.areaSf || 0) / 43560), _fmt(r.tcHr),
    _fmt(r.cnPre, 0), _fmt(r.qu2yr, 0), _fmt(r.qPre2yr), _fmt(r.qpPre2yr),
    _fmt(r.cnPost, 0), _fmt(r.qPost2yr), _fmt(r.qpPost2yr),
  ]);
  const to15yr = rows.map(r => [
    r.areaId, r.sdaId || '—',
    _fmt((r.areaSf || 0) / 43560), _fmt(r.tcHr),
    _fmt(r.cnPre, 0), _fmt(r.qu15yr, 0), _fmt(r.qPre15yr), _fmt(r.qpPre15yr),
    _fmt(r.cnPost, 0), _fmt(r.qPost15yr), _fmt(r.qpPost15yr),
  ]);
  const body = [
    renderBlock('2-yr storm', renderDataTable(hdrs, to2yr)),
    renderBlock('15-yr storm', renderDataTable(hdrs, to15yr)),
  ].join('\n');
  return renderSheetShell({
    title: 'Peak Discharge — CDA',
    sub:   `${project.name || ''} · ${project.number || ''}`,
    body,
    footer: 'TR-55 Graphical (SCS Type II); SDA_ID joined from CDA_Proposed',
    landscape: true,
  });
}
```

- [ ] **Step 7: Run render test, verify green**

- [ ] **Step 8: Wire parse + ui**

In `parse.mjs` `parseWorkbook` return, add after the `peakSda:` line:

```javascript
    peakCda: parsePeakDischarge(optionalSheet(wb, 'PEAK_DISCHARGE_CDA'), 'CDA_ID'),
```

In `ui.mjs`:
1. Import `renderPeakDischargeCdaSheet`.
2. After `Peak Discharge — SDA` push, add an analogous block for CDA, joining `sdaId` from `parsed.cdaProposed`:
   ```javascript
   const cdaSdaById = Object.fromEntries(
     (parsed.cdaProposed || []).map(c => [c.cdaId, c.sdaId]),
   );
   const peakCda = (parsed.peakCda || []).map(r => {
     const areaMi2 = (r.areaSf || 0) / 27878400;
     const sPre  = 1000 / (r.cnPre  || 1) - 10;
     const sPost = 1000 / (r.cnPost || 1) - 10;
     const Q = (P, S) => (P > 0.2 * S ? Math.pow(P - 0.2 * S, 2) / (P + 0.8 * S) : 0);
     const qu2  = tr55UnitPeakDischarge(r.cnPre, r.tcHr, r.iaOverP2yr,  parsed.params.tr55);
     const qu15 = tr55UnitPeakDischarge(r.cnPre, r.tcHr, r.iaOverP15yr, parsed.params.tr55);
     const qPre2 = Q(r.p2In, sPre),   qPost2 = Q(r.p2In, sPost);
     const qPre15 = Q(r.p15In, sPre), qPost15 = Q(r.p15In, sPost);
     return { ...r, sdaId: cdaSdaById[r.areaId] || '', areaMi2,
       qu2yr: qu2, qPre2yr: qPre2, qPost2yr: qPost2,
       qpPre2yr:  tr55PeakDischargeCfs(qu2, areaMi2, qPre2),
       qpPost2yr: tr55PeakDischargeCfs(qu2, areaMi2, qPost2),
       qu15yr: qu15, qPre15yr: qPre15, qPost15yr: qPost15,
       qpPre15yr:  tr55PeakDischargeCfs(qu15, areaMi2, qPre15),
       qpPost15yr: tr55PeakDischargeCfs(qu15, areaMi2, qPost15),
     };
   });
   pushIfNonEmpty('Peak Discharge — CDA', renderPeakDischargeCdaSheet(project, peakCda));
   ```
3. Add `'Peak Discharge — CDA'` to `laterLabels`.

- [ ] **Step 9: Sync + byte-diff + full suites**

```bash
bash scripts/sync-education-engines.sh
diff -q summary_calculator/src/parse.mjs education/src/parse.mjs
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education && npm test 2>&1 | tail -3
cd ../populator && npm test 2>&1 | tail -3
```

- [ ] **Step 10: Commit**

```bash
git add summary_calculator/src/parse.mjs summary_calculator/src/render.mjs \
        summary_calculator/src/ui.mjs \
        summary_calculator/tests/parse.test.mjs summary_calculator/tests/render.test.mjs \
        summary_calculator/tests/fixtures/generate_fixtures.py \
        summary_calculator/tests/fixtures/peak-discharge-sample.xlsx \
        education/src/parse.mjs
git commit -m "feat(summary_calculator): render PEAK_DISCHARGE_CDA deck page

Reuses parsePeakDischarge + tr55UnitPeakDischarge from 6.3.
Adds SDA_ID join column by looking up each CDA in cdaProposed.
Synced parse.mjs to education/src."
```

---

## Task 6.5 — DOEE_DETENTION_BMP feature

**Files:**
- Modify: `summary_calculator/src/parse.mjs` (add `parseDoeeDetentionBmp`)
- Modify: `summary_calculator/src/calc.mjs` (detention-BMP functions)
- Modify: `summary_calculator/src/render.mjs` (add `renderDoeeDetentionBmpSheet`)
- Modify: `summary_calculator/src/ui.mjs` (wire)
- Modify: `summary_calculator/tests/fixtures/generate_fixtures.py` (add fixture)
- Modify: tests
- Sync: `education/src/{parse,calc}.mjs`

- [ ] **Step 1: Write failing calc tests**

Append to `summary_calculator/tests/calc.test.mjs`:

```javascript
import { detentionBmpAdjustedQ, detentionBmpAdjustedCn, detentionBmpRequired } from '../src/calc.mjs';

test('detentionBmpAdjustedQ: max(0, qPost - bmpSv*12/DA)', () => {
  // qPost=2 in, bmpSv=500 cf, DA=10000 sf → adj = 2 - 500*12/10000 = 2 - 0.6 = 1.4
  assert.equal(detentionBmpAdjustedQ(2.0, 500, 10000), 1.4);
  // negative clamp to 0
  assert.equal(detentionBmpAdjustedQ(0.5, 500, 10000), 0);
});

test('detentionBmpAdjustedCn: closed-form inverse SCS', () => {
  // adjQ=1.4, P=3.14 → S_adj = 5(P + 2Q - sqrt(Q(4Q+5P)))
  //                 = 5(3.14 + 2.8 - sqrt(1.4*(5.6 + 15.7)))
  //                 = 5(5.94 - sqrt(29.82)) = 5(5.94 - 5.461) ≈ 2.396
  // CN = 1000/(2.396+10) ≈ 80.67
  const cn = detentionBmpAdjustedCn(1.4, 3.14);
  assert.ok(Math.abs(cn - 80.67) < 0.3, `expected ~80.67, got ${cn}`);
});

test('detentionBmpAdjustedCn: Q=0 returns 0', () => {
  assert.equal(detentionBmpAdjustedCn(0, 3.14), 0);
});

test('detentionBmpRequired: 2-yr triggers when adjCn > 70', () => {
  assert.equal(detentionBmpRequired(75, 60, '2-yr'), 'Yes');
  assert.equal(detentionBmpRequired(65, 60, '2-yr'), 'No');
});

test('detentionBmpRequired: 15-yr triggers when adjCn > cnPre', () => {
  assert.equal(detentionBmpRequired(75, 70, '15-yr'), 'Yes');
  assert.equal(detentionBmpRequired(70, 75, '15-yr'), 'No');
});

test('detentionBmpRequired: 100-yr returns em-dash', () => {
  assert.equal(detentionBmpRequired(80, 70, '100-yr'), '—');
});
```

- [ ] **Step 2: Run calc tests, verify failure**

- [ ] **Step 3: Implement detention-BMP calc functions**

Append to `summary_calculator/src/calc.mjs`:

```javascript
// 2020 DOEE CDA-level detention methodology.
//
// adjustedQ = max(0, qPost - bmpSv*12/DA_sf). BMP storage subtracts from the
// post-development runoff depth as an equivalent uniform withdrawal.
export function detentionBmpAdjustedQ(qPostIn, bmpSvCf, daSf) {
  if (!(daSf > 0)) return qPostIn;
  const reductionIn = (bmpSvCf || 0) * 12 / daSf;
  return Math.max(0, (qPostIn || 0) - reductionIn);
}

// Closed-form inverse of the SCS runoff equation. Solves for S given Q and P:
//   S_adj = 5·(P + 2Q − sqrt(Q·(4Q + 5P)))
//   CN    = 1000/(S_adj + 10)
// Returns 0 when Q <= 0 (no runoff, no CN needed).
export function detentionBmpAdjustedCn(adjQIn, pIn) {
  if (!(adjQIn > 0) || !(pIn > 0)) return 0;
  const sAdj = 5 * (pIn + 2 * adjQIn - Math.sqrt(adjQIn * (4 * adjQIn + 5 * pIn)));
  return 1000 / (sAdj + 10);
}

// Trigger check per 2020 DOEE methodology.
export function detentionBmpRequired(adjCn, cnPre, stormLabel) {
  if (stormLabel === '2-yr')  return adjCn > 70     ? 'Yes' : 'No';
  if (stormLabel === '15-yr') return adjCn > cnPre  ? 'Yes' : 'No';
  return '—';
}
```

- [ ] **Step 4: Run calc tests, verify green**

- [ ] **Step 5: Add detention fixture builder**

In `summary_calculator/tests/fixtures/generate_fixtures.py`, append before `__main__`:

```python
def build_detention_bmp_fixture():
    wb = openpyxl.Workbook(); wb.remove(wb.active)
    _write_bare_required_sheets(wb)
    ws = wb.create_sheet('DOEE_DETENTION_BMP')
    # Header row 3 (24 cols; we only populate the parse-relevant columns)
    for c, h in enumerate([
        'CDA Number', 'BMP Name', 'SDA Number',
        'Pre CN', 'Post CN', 'DA (SF)', 'BMP Sv (CF)',
        '2-yr Rain (in)', '2-yr Pre Q', '2-yr Post Q', '2-yr Adj Q',
        '2-yr Adj CN', "2-yr Det Req'd?",
        '15-yr Rain (in)', '15-yr Pre Q', '15-yr Post Q', '15-yr Adj Q',
        '15-yr Adj CN', "15-yr Det Req'd?",
        '100-yr Rain (in)', '100-yr Pre Q', '100-yr Post Q', '100-yr Adj Q',
        '100-yr Adj CN',
    ], start=1):
        ws.cell(3, c, h)
    # Row 4: CDA-1 triggers 2-yr (high post CN)
    ws.cell(4, 1, 'CDA-1'); ws.cell(4, 2, 'BMP-1'); ws.cell(4, 3, 'SDA-1')
    ws.cell(4, 4, 65); ws.cell(4, 5, 85); ws.cell(4, 6, 10000); ws.cell(4, 7, 100)
    ws.cell(4, 8, 3.14); ws.cell(4, 14, 5.23); ws.cell(4, 20, 7.00)
    # Row 5: CDA-2 passes (low post CN, lots of BMP Sv)
    ws.cell(5, 1, 'CDA-2'); ws.cell(5, 2, 'BMP-2'); ws.cell(5, 3, 'SDA-1')
    ws.cell(5, 4, 65); ws.cell(5, 5, 70); ws.cell(5, 6, 10000); ws.cell(5, 7, 1500)
    ws.cell(5, 8, 3.14); ws.cell(5, 14, 5.23); ws.cell(5, 20, 7.00)
    wb.save(OUT_DIR / 'detention-bmp-sample.xlsx')
```

Add to `__main__`:
```python
    build_detention_bmp_fixture()
```

Run it.

- [ ] **Step 6: Write failing parse test**

Append to `summary_calculator/tests/parse.test.mjs`:

```javascript
import { parseDoeeDetentionBmp } from '../src/parse.mjs';

const detentionBytes = await readFile(
  join(__dirname, 'fixtures', 'detention-bmp-sample.xlsx'),
);
const detentionWb = XLSX.read(new Uint8Array(detentionBytes), { type: 'array' });

test('parseDoeeDetentionBmp: 2 CDAs with 3 storms each', () => {
  const rows = parseDoeeDetentionBmp(optionalSheet(detentionWb, 'DOEE_DETENTION_BMP'));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].cdaId, 'CDA-1');
  assert.equal(rows[0].bmpName, 'BMP-1');
  assert.equal(rows[0].sdaId, 'SDA-1');
  assert.equal(rows[0].cnPre, 65);
  assert.equal(rows[0].bmpSvCf, 100);
  assert.equal(rows[0].storms.length, 3);
  assert.deepEqual(rows[0].storms.map(s => s.label), ['2-yr', '15-yr', '100-yr']);
  assert.equal(rows[0].storms[0].rainIn, 3.14);
});
```

- [ ] **Step 7: Run parse test, verify failure**

- [ ] **Step 8: Implement `parseDoeeDetentionBmp`**

Append to `summary_calculator/src/parse.mjs`:

```javascript
// DOEE_DETENTION_BMP layout (from workbook/builders/doee.py build_doee_detention_bmp):
//   Header row 3; data rows 4..13 (10 CDAs max).
//   A=CDA, B=BMP Name, C=SDA, D=Pre CN, E=Post CN, F=DA (SF), G=BMP Sv (CF),
//   H=2-yr Rain, N=15-yr Rain, T=100-yr Rain.
//   Per-storm cols after the Rain cell (Q Pre, Q Post, Adj Q, Adj CN, Req)
//   are Excel-computed; we only read the Rain inputs here.
export function parseDoeeDetentionBmp(sheet) {
  if (!sheet) return [];
  const rows = [];
  for (let r = 4; r <= DATA_MAX_ROW; r++) {
    const cdaId = cell(sheet, r, 1);
    if (!cdaId) break;
    rows.push({
      cdaId,
      bmpName: cell(sheet, r, 2),
      sdaId:   cell(sheet, r, 3),
      cnPre:   cell(sheet, r, 4),
      cnPost:  cell(sheet, r, 5),
      daSf:    cell(sheet, r, 6),
      bmpSvCf: cell(sheet, r, 7),
      storms: [
        { label: '2-yr',   rainIn: cell(sheet, r, 8)  },
        { label: '15-yr',  rainIn: cell(sheet, r, 14) },
        { label: '100-yr', rainIn: cell(sheet, r, 20) },
      ],
    });
  }
  return rows;
}
```

- [ ] **Step 9: Run parse test, verify green**

- [ ] **Step 10: Write failing render test**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
import { renderDoeeDetentionBmpSheet } from '../src/render.mjs';

test('renderDoeeDetentionBmpSheet: 3 storm blocks with trigger badges', () => {
  const rows = [{
    cdaId: 'CDA-1', bmpName: 'BMP-1', sdaId: 'SDA-1',
    cnPre: 65, cnPost: 85, daSf: 10000, bmpSvCf: 100,
    storms: [
      { label: '2-yr',   rainIn: 3.14, qPreIn: 0.5, qPostIn: 1.8, adjQIn: 1.68, adjCn: 82, detRequired: 'Yes' },
      { label: '15-yr',  rainIn: 5.23, qPreIn: 1.5, qPostIn: 3.2, adjQIn: 3.08, adjCn: 86, detRequired: 'Yes' },
      { label: '100-yr', rainIn: 7.00, qPreIn: 2.7, qPostIn: 4.5, adjQIn: 4.38, adjCn: 88, detRequired: '—' },
    ],
  }];
  const html = renderDoeeDetentionBmpSheet({ name: 'T', number: 'T-001' }, rows);
  assert.ok(html.includes('CDA-1'));
  assert.ok(html.includes('2-yr'));
  assert.ok(html.includes('15-yr'));
  assert.ok(html.includes('100-yr'));
  assert.ok(html.includes('Yes'));
});
```

- [ ] **Step 11: Run render test, verify failure**

- [ ] **Step 12: Implement `renderDoeeDetentionBmpSheet`**

Append to `summary_calculator/src/render.mjs`:

```javascript
export function renderDoeeDetentionBmpSheet(project, rows) {
  if (!rows || rows.length === 0) return '';
  const _fmt = (v, d = 2) => (v == null ? '—' :
    (typeof v === 'number' ? v.toFixed(d) : String(v)));
  const _trig = (s) => s === 'Yes' ? '<span class="cs-warn">⚠ Yes</span>'
                     : s === 'No'  ? '<span class="cs-ok">✓ No</span>'
                     : '—';
  const hdrs = ['CDA', 'BMP', 'SDA', 'DA (SF)', 'BMP Sv (CF)',
    'Rain (in)', 'Pre Q (in)', 'Post Q (in)', 'Adj Q (in)', 'Adj CN', "Det Req'd?"];
  const blockFor = (storm) => {
    const data = rows.map(r => {
      const s = r.storms.find(x => x.label === storm) || {};
      return [r.cdaId, r.bmpName || '—', r.sdaId || '—',
              _fmt(r.daSf, 0), _fmt(r.bmpSvCf, 0),
              _fmt(s.rainIn), _fmt(s.qPreIn), _fmt(s.qPostIn),
              _fmt(s.adjQIn), _fmt(s.adjCn, 1), _trig(s.detRequired)];
    });
    return renderBlock(`${storm} storm`, renderDataTable(hdrs, data));
  };
  const body = ['2-yr', '15-yr', '100-yr'].map(blockFor).join('\n');
  return renderSheetShell({
    title: 'Detention Summary — 2020 CDA (BMP-Adjusted)',
    sub:   `${project.name || ''} · ${project.number || ''}`,
    body,
    footer: '2-yr trigger when Adj CN > 70; 15-yr trigger when Adj CN > Pre CN',
    landscape: true,
  });
}
```

- [ ] **Step 13: Run render test, verify green**

- [ ] **Step 14: Wire parse + ui**

In `parse.mjs` `parseWorkbook` return, add:

```javascript
    detentionBmp: parseDoeeDetentionBmp(optionalSheet(wb, 'DOEE_DETENTION_BMP')),
```

In `ui.mjs`, after the existing `Detention Summary` push, add:

```javascript
import { detentionBmpAdjustedQ, detentionBmpAdjustedCn, detentionBmpRequired, renderDoeeDetentionBmpSheet } from ...;
// (add renderDoeeDetentionBmpSheet to render import; the three calc funcs to calc import)

const detentionBmp = (parsed.detentionBmp || []).map(r => {
  const sPre  = 1000 / (r.cnPre  || 1) - 10;
  const sPost = 1000 / (r.cnPost || 1) - 10;
  const Q = (P, S) => (P > 0.2 * S ? Math.pow(P - 0.2 * S, 2) / (P + 0.8 * S) : 0);
  const storms = r.storms.map(s => {
    const qPreIn  = Q(s.rainIn || 0, sPre);
    const qPostIn = Q(s.rainIn || 0, sPost);
    const adjQIn  = detentionBmpAdjustedQ(qPostIn, r.bmpSvCf, r.daSf);
    const adjCn   = detentionBmpAdjustedCn(adjQIn, s.rainIn);
    const detRequired = detentionBmpRequired(adjCn, r.cnPre, s.label);
    return { ...s, qPreIn, qPostIn, adjQIn, adjCn, detRequired };
  });
  return { ...r, storms };
});
pushIfNonEmpty('Detention Summary — 2020 CDA (BMP-Adjusted)',
               renderDoeeDetentionBmpSheet(project, detentionBmp));
```

Add `'Detention Summary — 2020 CDA (BMP-Adjusted)'` to `laterLabels`.

- [ ] **Step 15: Sync + byte-diff + full suites**

```bash
bash scripts/sync-education-engines.sh
diff -q summary_calculator/src/parse.mjs education/src/parse.mjs
diff -q summary_calculator/src/calc.mjs  education/src/calc.mjs
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education && npm test 2>&1 | tail -3
cd ../populator && npm test 2>&1 | tail -3
```

- [ ] **Step 16: Commit**

```bash
git add summary_calculator/src/parse.mjs summary_calculator/src/calc.mjs \
        summary_calculator/src/render.mjs summary_calculator/src/ui.mjs \
        summary_calculator/tests/parse.test.mjs summary_calculator/tests/calc.test.mjs \
        summary_calculator/tests/render.test.mjs \
        summary_calculator/tests/fixtures/generate_fixtures.py \
        summary_calculator/tests/fixtures/detention-bmp-sample.xlsx \
        education/src/parse.mjs education/src/calc.mjs
git commit -m "feat(summary_calculator): render DOEE_DETENTION_BMP deck page

2020 CDA-level detention methodology. detentionBmpAdjustedQ subtracts
BMP storage as an equivalent uniform depth; detentionBmpAdjustedCn
uses the closed-form inverse SCS runoff equation. Trigger rules:
2-yr when Adj CN > 70, 15-yr when Adj CN > Pre CN, 100-yr no trigger.
Synced parse.mjs + calc.mjs to education/src."
```

---

## Task 6.6.A — EISA Direct Timestep engine (calc only)

**Files:**
- Modify: `summary_calculator/src/calc.mjs` (hyetograph + Horton + timestep trace)
- Modify: `summary_calculator/tests/calc.test.mjs`
- Sync: `education/src/calc.mjs`

- [ ] **Step 1: Write failing hyetograph test**

Append to `summary_calculator/tests/calc.test.mjs`:

```javascript
import { SCS_TYPE_II_CURVE, scsType2Hyetograph, hortonInfilRate } from '../src/calc.mjs';

test('SCS_TYPE_II_CURVE: length 240, sums to ~1.0, midpoint ~0.5', () => {
  assert.equal(SCS_TYPE_II_CURVE.length, 240);
  const last = SCS_TYPE_II_CURVE[SCS_TYPE_II_CURVE.length - 1];
  assert.ok(Math.abs(last - 1.0) < 1e-6, `last value should be 1.0, got ${last}`);
  // Midpoint of 24-hr Type II curve is at t=12 hr → index 120 → ~0.5
  assert.ok(Math.abs(SCS_TYPE_II_CURVE[119] - 0.5) < 0.05);
});

test('scsType2Hyetograph: 240 steps, cumulative ends at totalDepth', () => {
  const h = scsType2Hyetograph(1.7, 6);
  assert.equal(h.length, 240);
  assert.equal(h[0].tMin, 0);
  assert.ok(Math.abs(h[h.length - 1].pCumIn - 1.7) < 1e-6);
});

test('hortonInfilRate: f(0) = fMax, f(∞) → fMin', () => {
  assert.ok(Math.abs(hortonInfilRate(5.0, 0.5, 2, 0) - 5.0) < 1e-6);
  assert.ok(Math.abs(hortonInfilRate(5.0, 0.5, 2, 24) - 0.5) < 0.001);
});
```

- [ ] **Step 2: Run tests, verify failure**

- [ ] **Step 3: Implement the hyetograph table + helpers**

Append to `summary_calculator/src/calc.mjs`:

```javascript
// SCS Type II dimensionless cumulative rainfall distribution.
// Source: NRCS TR-55 Table 5-1, 24-hour Type II (used in the mid-Atlantic
// including DC). 240 × 6-min steps; values are cumulative fraction of the
// 24-hour depth. The mid-storm burst (t = 11-13 hr) delivers ~50% of the
// total rainfall. Values transcribed from the published table.
//
// NOTE: This array is populated at module load from the TR55_TYPE_II_6MIN
// text constant below so the file stays readable.
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

// Multiply the dimensionless curve by total depth; return 240 timesteps
// each with { tMin, pInRate (in/hr), pCumIn }. pInRate is the average
// rate over the 6-minute step (not the instantaneous rate).
export function scsType2Hyetograph(totalDepthIn, timestepMin = 6) {
  if (!(totalDepthIn > 0)) return [];
  const steps = [];
  let prevCum = 0;
  for (let i = 0; i < SCS_TYPE_II_CURVE.length; i++) {
    const pCumIn = SCS_TYPE_II_CURVE[i] * totalDepthIn;
    const dCum   = pCumIn - prevCum;
    const pInRate = (dCum / timestepMin) * 60; // in/hr average over step
    steps.push({ tMin: i * timestepMin, pInRate, pCumIn });
    prevCum = pCumIn;
  }
  return steps;
}

// Horton infiltration rate at time t (hours): f(t) = fMin + (fMax - fMin)*e^(-k*t).
export function hortonInfilRate(fMax, fMin, k, tHours) {
  if (fMax == null || fMin == null || k == null) return null;
  return fMin + (fMax - fMin) * Math.exp(-k * tHours);
}
```

- [ ] **Step 4: Run tests, verify green**

- [ ] **Step 5: Write failing test for `eisaTimestepTrace`**

Append to `summary_calculator/tests/calc.test.mjs`:

```javascript
import { eisaTimestepTrace } from '../src/calc.mjs';

test('eisaTimestepTrace: 2-SDA, 1-BMP fixture produces 240 steps + peaks', () => {
  const sdas = [
    { sdaId: 'SDA-1', hsg: 'C', preIn: 10000, postIn: 10000,
      landUse: 'Impervious Vehicular' },
    { sdaId: 'SDA-2', hsg: 'B', preIn:  5000, postIn:  5000,
      landUse: 'Compacted (Open Space)' },
  ];
  const bmps = [{ name: 'BMP-1', type: 'Bioretention', rvApplied: 500 }];
  const params = {
    horton: { A: { fMax: 9.0, fMin: 0.3, k: 4.0 },
              B: { fMax: 6.0, fMin: 0.15, k: 4.0 },
              C: { fMax: 2.0, fMin: 0.05, k: 4.0 },
              D: { fMax: 1.0, fMin: 0.00, k: 4.0 } },
  };
  const trace = eisaTimestepTrace({ sdas, bmps, params, P: 1.7, lossModel: 'horton' });
  assert.equal(trace.timeSteps.length, 240);
  assert.ok(trace.totals.postCf > 0);
  assert.ok(trace.totals.netPostCf >= 0);
  assert.ok(trace.totals.netPostCf <= trace.totals.postCf);
  assert.ok(trace.peaks.post > 0);
});

test('eisaTimestepTrace: Horton params missing → fallback scs-cn', () => {
  const sdas = [{ sdaId: 'SDA-1', hsg: 'C', preIn: 1000, postIn: 1000,
                  landUse: 'Impervious Vehicular' }];
  const paramsNoHorton = { horton: null };
  const t1 = eisaTimestepTrace({ sdas, bmps: [], params: paramsNoHorton, P: 1.7 });
  assert.equal(t1.lossModelUsed, 'scs-cn');
});
```

- [ ] **Step 6: Run tests, verify failure**

- [ ] **Step 7: Implement `eisaTimestepTrace` + Horton params in parse**

First, extend `parseParams` in `summary_calculator/src/parse.mjs`. Inside the function, before the final `return`, add:

```javascript
  // Horton infil params per HSG. Per workbook/builders/params.py, the
  // PARAMS_Horton named range is `$A$22:$C$25` with cols A=HSG label, B=fMax
  // (in/hr), C=fMin (in/hr). The decay constant k is NOT in this range —
  // it's at PARAMS_HortonLossB (`$B$26`), a single scalar reused across HSGs.
  // VERIFY the layout by reading workbook/builders/params.py before coding.
  const horton = {};
  const kScalar = cell(sheet, 26, 2) || 4;  // PARAMS_HortonLossB (fallback 4/hr)
  for (let r = 22; r <= 25; r++) {
    const label = cell(sheet, r, 1);
    if (!label) continue;
    horton[String(label).trim()] = {
      fMax: cell(sheet, r, 2),
      fMin: cell(sheet, r, 3),
      k:    kScalar,
    };
  }
```

And add `, horton` to the returned object.

Then append to `summary_calculator/src/calc.mjs`:

```javascript
// EISA §438 Direct Determination timestep trace.
// Distributes the 1.7" design storm over 24 hours via the SCS Type II
// hyetograph and computes per-6-min-step excess runoff for pre/post land
// cover, then subtracts BMP storage as a uniform withdrawal across the storm.
//
// Pure for education app re-use. Returns a structured object; render layer
// formats it. When Horton params are not available, falls back to SCS-CN
// loss (the lossModelUsed field records which path ran).
export function eisaTimestepTrace({ sdas, bmps, params, P = 1.7, lossModel = 'horton' }) {
  const hyeto = scsType2Hyetograph(P, 6);  // 240 x 6-min steps
  const totalBmpSv = (bmps || []).reduce((a, b) => a + (b.rvApplied || 0), 0);
  const haveHorton = params && params.horton && Object.keys(params.horton).length > 0;
  const lossModelUsed = (lossModel === 'horton' && haveHorton) ? 'horton' : 'scs-cn';

  // Compute total site area (Within LOD) per phase.
  const _sumArea = (phase) => (sdas || []).reduce((a, s) => a + (s[phase] || 0), 0);
  const aPreSf  = _sumArea('preIn');
  const aPostSf = _sumArea('postIn');

  // Per-timestep: compute average infiltration rate (weighted by HSG area)
  // and subtract from rain rate to get excess rate; convert to volume.
  // Simplified aggregate approach: use site-weighted average fMax/fMin/k.
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
    let fPre = 0, fPost = 0;
    if (lossModelUsed === 'horton') {
      if (hPre)  fPre  = hortonInfilRate(hPre.fMax,  hPre.fMin,  hPre.k,  tHours);
      if (hPost) fPost = hortonInfilRate(hPost.fMax, hPost.fMin, hPost.k, tHours);
    } else {
      // SCS-CN fallback: assume CN=80 pre, 95 post (conservative stand-in).
      const Sp = 1000 / 80 - 10, Spost = 1000 / 95 - 10;
      const Q = (P, S) => (P > 0.2 * S ? (P - 0.2 * S) ** 2 / (P + 0.8 * S) : 0);
      // Convert cumulative excess into per-step rate (post diff).
      const qPreCum  = Q(row.pCumIn, Sp);
      const qPostCum = Q(row.pCumIn, Spost);
      const prevCumPreIn  = i > 0 ? Q(hyeto[i-1].pCumIn, Sp)    : 0;
      const prevCumPostIn = i > 0 ? Q(hyeto[i-1].pCumIn, Spost) : 0;
      const excessPreIn  = Math.max(0, qPreCum  - prevCumPreIn);
      const excessPostIn = Math.max(0, qPostCum - prevCumPostIn);
      // Withdraw BMP storage at a constant rate over the storm.
      const bmpPerStepCf = totalBmpSv / 240;
      const usedCf = Math.min(bmpPerStepCf, excessPostIn * (aPostSf / 12));
      cumBmpUsedCf += usedCf;
      const netPostIn = Math.max(0, excessPostIn - usedCf * 12 / (aPostSf || 1));
      totalPreIn    += excessPreIn;
      totalPostIn   += excessPostIn;
      totalNetPostIn += netPostIn;
      peakPre  = Math.max(peakPre,  excessPreIn);
      peakPost = Math.max(peakPost, excessPostIn);
      peakPostWithBmp = Math.max(peakPostWithBmp, netPostIn);
      return { tMin: row.tMin, rainIn: row.pInRate * stepHr, infilIn: 0,
               excessPreIn, excessPostIn, bmpStorageUsedCf: usedCf,
               netPostIn };
    }
    // Horton path
    const rainIn = row.pInRate * stepHr;
    const infilPreIn  = Math.min(rainIn, (fPre  || 0) * stepHr);
    const infilPostIn = Math.min(rainIn, (fPost || 0) * stepHr);
    const excessPreIn  = Math.max(0, rainIn - infilPreIn);
    const excessPostIn = Math.max(0, rainIn - infilPostIn);
    const bmpPerStepCf = totalBmpSv / 240;
    const usedCf = Math.min(bmpPerStepCf,
      excessPostIn * ((aPostSf || 1) / 12));
    cumBmpUsedCf += usedCf;
    const netPostIn = Math.max(0, excessPostIn - usedCf * 12 / (aPostSf || 1));
    totalPreIn    += excessPreIn;
    totalPostIn   += excessPostIn;
    totalNetPostIn += netPostIn;
    peakPre  = Math.max(peakPre,  excessPreIn);
    peakPost = Math.max(peakPost, excessPostIn);
    peakPostWithBmp = Math.max(peakPostWithBmp, netPostIn);
    return { tMin: row.tMin, rainIn, infilIn: infilPostIn,
             excessPreIn, excessPostIn, bmpStorageUsedCf: usedCf,
             netPostIn };
  });

  return {
    lossModelUsed,
    timeSteps,
    peaks: { pre: peakPre, post: peakPost, postWithBmp: peakPostWithBmp },
    totals: {
      preCf:     totalPreIn    * (aPreSf  || 0) / 12,
      postCf:    totalPostIn   * (aPostSf || 0) / 12,
      netPostCf: totalNetPostIn * (aPostSf || 0) / 12,
    },
  };
}
```

- [ ] **Step 8: Run tests, verify green**

```bash
cd summary_calculator && npm test 2>&1 | tail -5
```

- [ ] **Step 9: Sync + byte-diff + full suites**

```bash
bash scripts/sync-education-engines.sh
diff -q summary_calculator/src/calc.mjs  education/src/calc.mjs
diff -q summary_calculator/src/parse.mjs education/src/parse.mjs
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education && npm test 2>&1 | tail -3
cd ../populator && npm test 2>&1 | tail -3
```

- [ ] **Step 10: Commit**

```bash
git add summary_calculator/src/calc.mjs summary_calculator/src/parse.mjs \
        summary_calculator/tests/calc.test.mjs \
        education/src/calc.mjs education/src/parse.mjs
git commit -m "feat(calc): EISA Direct Determination timestep engine

SCS_TYPE_II_CURVE (240 × 6-min cumulative values transcribed from
NRCS TR-55 Table 5-1), scsType2Hyetograph scaled to arbitrary depth,
hortonInfilRate single-point formula, and eisaTimestepTrace producing
per-step pre/post excess + BMP storage withdrawal + net post runoff.
Falls back to SCS-CN loss when Horton params missing (records
lossModelUsed in the return shape).

parseParams now reads the Horton table at PARAMS rows 22-25.

Synced parse.mjs + calc.mjs to education/src byte-identical."
```

---

## Task 6.6.B — EISA Direct Timestep deck page

**Files:**
- Modify: `summary_calculator/src/render.mjs` (add `renderEisaTimestepSheet`)
- Modify: `summary_calculator/src/ui.mjs` (wire)
- Modify: `summary_calculator/tests/render.test.mjs`

- [ ] **Step 1: Write failing render test**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
import { renderEisaTimestepSheet } from '../src/render.mjs';

test('renderEisaTimestepSheet: shows peaks, totals, and timestep table', () => {
  const trace = {
    lossModelUsed: 'horton',
    timeSteps: Array.from({ length: 240 }, (_, i) => ({
      tMin: i * 6, rainIn: 0.01, infilIn: 0.005,
      excessPreIn: 0.002, excessPostIn: 0.005,
      bmpStorageUsedCf: 0, netPostIn: 0.005,
    })),
    peaks: { pre: 0.02, post: 0.05, postWithBmp: 0.04 },
    totals: { preCf: 100, postCf: 300, netPostCf: 250 },
  };
  const html = renderEisaTimestepSheet({ name: 'T', number: 'T-001' }, trace, {});
  assert.ok(html.includes('Direct Determination Timestep'));
  assert.ok(html.includes('horton'));
  assert.ok(html.includes('Peak'));
});
```

- [ ] **Step 2: Run test, verify failure**

- [ ] **Step 3: Implement `renderEisaTimestepSheet`**

Append to `summary_calculator/src/render.mjs`:

```javascript
export function renderEisaTimestepSheet(project, trace, params) {
  if (!trace || !trace.timeSteps || trace.timeSteps.length === 0) return '';
  const _fmt = (v, d = 3) => (v == null ? '—' :
    (typeof v === 'number' ? v.toFixed(d) : String(v)));
  const inputsBlock = renderKvTable([
    ['Design storm (in)', '1.7 (EISA 95th percentile)'],
    ['Timestep (min)',    '6'],
    ['Loss model',        trace.lossModelUsed],
    ['Hyetograph',        'SCS Type II (NRCS TR-55 Table 5-1)'],
  ]);

  // Table: hourly bolding every 10 steps (60 min).
  const hdrs = ['t (min)', 'Rain (in)', 'Infil (in)',
    'Excess Pre (in)', 'Excess Post (in)', 'BMP used (CF)', 'Net Post (in)'];
  const rows = trace.timeSteps.map(s => {
    const vals = [s.tMin, _fmt(s.rainIn), _fmt(s.infilIn),
      _fmt(s.excessPreIn), _fmt(s.excessPostIn),
      _fmt(s.bmpStorageUsedCf, 1), _fmt(s.netPostIn)];
    if (s.tMin % 60 === 0) {
      return vals.map(v => `<b>${v}</b>`);
    }
    return vals;
  });

  const summaryBlock = renderKvTable([
    ['Peak Pre (in/step)',          _fmt(trace.peaks.pre)],
    ['Peak Post (in/step)',         _fmt(trace.peaks.post)],
    ['Peak Post-with-BMP (in/step)', _fmt(trace.peaks.postWithBmp)],
    ['Total Pre (CF)',               _fmt(trace.totals.preCf, 1)],
    ['Total Post (CF)',              _fmt(trace.totals.postCf, 1)],
    ['Net Post after BMP (CF)',      _fmt(trace.totals.netPostCf, 1)],
  ]);

  const body = [
    renderBlock('Inputs', inputsBlock),
    renderBlock('240 × 6-min steps', renderDataTable(hdrs, rows)),
    renderBlock('Peaks and totals', summaryBlock),
  ].join('\n');

  return renderSheetShell({
    title: 'EISA §438 — Direct Determination Timestep',
    sub:   `${project.name || ''} · ${project.number || ''}`,
    body,
    footer: '1.7″ design storm distributed via SCS Type II; BMP storage withdrawn uniformly',
    landscape: true,
  });
}
```

- [ ] **Step 4: Run test, verify green**

- [ ] **Step 5: Wire ui**

In `summary_calculator/src/ui.mjs`:
1. Import `renderEisaTimestepSheet`, `eisaTimestepTrace`.
2. After the existing EISA Direct push, add:
   ```javascript
   const eisaTimestep = eisaTimestepTrace({
     sdas, bmps,
     params: parsed.params,
     P: project.rainfallEisa || 1.7,
     lossModel: 'horton',
   });
   pushIfNonEmpty('EISA §438 — DD Timestep',
                  renderEisaTimestepSheet(project, eisaTimestep, parsed.params));
   ```
3. Add `'EISA §438 — DD Timestep'` to `laterLabels`.

- [ ] **Step 6: Run all three JS suites**

```bash
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education && npm test 2>&1 | tail -3
cd ../populator && npm test 2>&1 | tail -3
```

- [ ] **Step 7: Commit**

```bash
git add summary_calculator/src/render.mjs summary_calculator/src/ui.mjs \
        summary_calculator/tests/render.test.mjs
git commit -m "feat(summary_calculator): render EISA DD Timestep deck page

Three blocks: inputs summary, 240-row timestep table with hourly
bolding, and peaks + totals callout. Reads lossModelUsed from the
trace so reviewers see which path ran (horton vs scs-cn fallback)."
```

---

## Task 6.7 — Final integration pass

**Files:**
- No code changes; verification + smoke-check only.

- [ ] **Step 1: Run every test suite from scratch**

```bash
cd summary_calculator && npm test 2>&1 | tail -5
cd ../education && npm test 2>&1 | tail -5
cd ../populator && npm test 2>&1 | tail -5
cd .. && python -m pytest tests/ -q 2>&1 | tail -3
```
Expected: all green across all suites.

- [ ] **Step 2: Confirm engine-parity byte-diff passes**

```bash
diff summary_calculator/src/parse.mjs     education/src/parse.mjs
diff summary_calculator/src/calc.mjs      education/src/calc.mjs
diff summary_calculator/src/aggregate.mjs education/src/aggregate.mjs
```
Expected: no output from any `diff` call.

Also run the engine-parity CI test explicitly:

```bash
cd education && node --test tests/engine-parity.test.mjs 2>&1 | tail -5
```
Expected: pass.

- [ ] **Step 3: Rebuild the summary_calculator bundle**

```bash
node summary_calculator/build.js
```
Expected: one line reporting the output path.

- [ ] **Step 4: Smoke-check the deck against a regenerated sample**

Open `summary_calculator/dist/index.html` in a browser (or run `python -m http.server 8000` from `summary_calculator/dist/`) and load `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx` via the file picker. Verify:
- No console errors.
- New pages appear in this order: Area_Summary (after CDA Post), EISA DD Timestep (after EISA Direct), TC_PATH → Peak-SDA → Peak-CDA (after EISA Compliance), Detention 2020 CDA (after existing Detention Summary).
- TOC labels on Cover page match the actual page sequence.
- Each new page renders without `undefined`, `NaN`, or `[object Object]` in visible cells.

- [ ] **Step 5: Snapshot page count for the integration commit**

```bash
# Count labels by running the app with a headless browser (reuses browser-smoke tooling)
cd summary_calculator && node --experimental-vm-modules tests/print-dimensions.mjs 2>&1 | tail
```
If no such helper exists, note the page count visually from the TOC on the Cover page.

- [ ] **Step 6: Commit the integration pass note**

If the smoke-check uncovered issues, fix them first (small follow-up commits per issue). Once clean:

```bash
git commit --allow-empty -m "chore(summary_calculator): integration pass for template gap fill

All six new deck pages (Area_Summary, TC_PATH, Peak-SDA, Peak-CDA,
DOEE Detention-BMP, EISA DD Timestep) land cleanly, engine-parity
byte-diff clean, full test matrix green.

Deck page count: <N> (Cover + Executive + ... + new pages)."
```

- [ ] **Step 7: Push the branch**

```bash
git push origin main
```

---

## Related follow-ons (NOT in this plan — see spec §8)

- `education` spec: Four-Block pedagogy for all six features, reusing this plan's calc.mjs functions.
- `populator` spec: mappings into DOEE/DDOT output workbooks that carry TC / peak / detention cells.
- Formula-drift validator scripts: `scripts/validate_doee_calc_parity.py`, `scripts/validate_formula_shapes.py`, `tests/test_calc_mjs_against_doee_hand_calcs.py`.
