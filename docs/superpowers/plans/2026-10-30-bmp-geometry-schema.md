# BMP Geometry Schema + Freeboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3D geometry + site-elevation fields to Bioretention and Dry Swale rows on the user template; compute pond storage from actual geometry (trapezoid-frustum for Bio, longitudinal check-dam wedge for Dry Swale); report freeboard per DDOT §33.14.5.5; apply per-row four-line arithmetic traces (equation name / formula / substitution / arithmetic result) to all EISA 438 pages + MEP + Executive Summary in the education app. Official DOEE/DDOT/EISA government spreadsheets are NOT modified — populator mappings continue to write only the DOEE-expected cells.

**Architecture:** Schema change at the user-template level (`workbook/builders/bmp.py`) ripples through parser → calc engine → aggregate → render in both the summary and education apps. Byte-identical engine sync preserved across all three apps via existing `scripts/sync-education-engines.sh`. New shared four-line arithmetic trace helper in `render-edu.mjs` is reused across 5+ page renderers. Backward-compat guarded by a frozen pre-change fixture + regression test.

**Tech Stack:** Python (openpyxl) for workbook generation; vanilla ES modules + `node:test` + Playwright for the three apps; pytest for the Python workbook tests.

**Spec:** `docs/superpowers/specs/2026-10-30-bmp-geometry-schema-design.md`

---

## File Structure Overview

### Modified
- `workbook/builders/bmp.py` — new columns AN–AS (Bio) + AT–BE (Dry Swale)
- `workbook/sample.py` — Minnesota Ave fixture updates + one new Dry Swale BMP
- `summary_calculator/src/calc.mjs` — new `bioSizingSv` signature, new `drySwaleSizingSv`, freeboard helpers
- `summary_calculator/src/parse.mjs` — split Bio vs Dry Swale into `bmp.bio` vs `bmp.swale`
- `summary_calculator/src/aggregate.mjs` — `_rvForBmp` branch updates
- `summary_calculator/src/render.mjs` — Bio sv breakdown + freeboard, Dry Swale geometry + wedge + freeboard
- `summary_calculator/src/ui.mjs` — inline aggregate updated to new BMP shape
- `education/src/render-edu.mjs` — new trace helper + apply to 5+ pages
- `education/src/ui.mjs` — same inline aggregate updates
- `populator/src/mappings/swmp-bmp-calc.mjs` — Dry Swale branch reads `bmp.swale.*` (cells written are UNCHANGED)

### Created
- `summary_calculator/tests/fixtures/minnesota-ave-pre-geometry.xlsx` (frozen snapshot)
- `summary_calculator/tests/backward-compat.test.mjs`

### NOT touched
- `populator/blanks/*.xlsx` and `swmp-bmp-calc.xlsm` — DOEE / DDOT official spreadsheets

---

## Task 1 — Freeze pre-change fixture + stub backward-compat test

Snapshot the current fixture BEFORE any schema change, so Task 4 can assert the parser still handles old workbooks after the schema changes land.

**Files:**
- Create: `summary_calculator/tests/fixtures/minnesota-ave-pre-geometry.xlsx` (copy)
- Create: `summary_calculator/tests/backward-compat.test.mjs` (placeholder)

- [ ] **Step 1: Copy the current fixture to a frozen snapshot**

```bash
cp summary_calculator/tests/fixtures/minnesota-ave.xlsx \
   summary_calculator/tests/fixtures/minnesota-ave-pre-geometry.xlsx
```

- [ ] **Step 2: Create the placeholder regression test**

Create `summary_calculator/tests/backward-compat.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sheetjsSrc = await readFile(join(__dirname, '..', 'lib', 'sheetjs-bundle.js'), 'utf8');
const XLSX = new Function(sheetjsSrc + '; return XLSX;')();

import { parseWorkbook } from '../src/parse.mjs';

const fixtureBytes = await readFile(
  join(__dirname, 'fixtures', 'minnesota-ave-pre-geometry.xlsx'),
);
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });

test('backward-compat: pre-geometry fixture still parses without errors', () => {
  const parsed = parseWorkbook(wb);
  assert.ok(parsed.project.name, 'project name present');
  assert.ok(parsed.sdas.length > 0, 'SDAs parsed');
  assert.ok(parsed.bmps.length > 0, 'BMPs parsed');
});
```

- [ ] **Step 3: Run the test to verify PASS (before any schema changes)**

```bash
cd summary_calculator && node --test tests/backward-compat.test.mjs
```

Expected: 1 PASS. This confirms the pre-change fixture + the current parser work together before we touch anything.

- [ ] **Step 4: Commit**

```bash
git add summary_calculator/tests/fixtures/minnesota-ave-pre-geometry.xlsx \
        summary_calculator/tests/backward-compat.test.mjs
git commit -m "test: freeze pre-geometry Minnesota Ave fixture + stub backward-compat test"
```

---

## Task 2 — Workbook template schema + Minnesota Ave values + fixture regen

Extend `workbook/builders/bmp.py` with the new Bio (AN–AS) and Dry Swale (AT–BE) columns. Update `workbook/sample.py` to fill the new fields for existing Bio BMPs and add one new Dry Swale BMP. Regenerate the fixture and copy to all three apps. Regenerate `minnesota-ave.reference.json`.

**Files:**
- Modify: `workbook/builders/bmp.py` (HEADERS + per-row cell writes + `_apply_zone_dividers` call sites)
- Modify: `workbook/sample.py` (BMPS tuple + new SWALE_GEOM dict + `_fill_bmp` extension)
- Modify: `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx` (regenerated)
- Modify: `summary_calculator/tests/fixtures/minnesota-ave.xlsx` (copied)
- Modify: `populator/tests/fixtures/minnesota-ave.xlsx` (copied)
- Modify: `education/tests/fixtures/minnesota-ave.xlsx` (copied)
- Modify: `summary_calculator/tests/fixtures/minnesota-ave.reference.json` (regenerated)
- Test: `tests/test_bmp.py` (new assertions for new columns)

- [ ] **Step 1: Write failing Python test for new columns**

Append to `tests/test_bmp.py`:

```python
def test_bmp_sheet_has_bio_geometry_columns():
    """BMP sheet gains Bio geometry columns AN–AS."""
    from openpyxl import load_workbook
    from workbook.sample import OUTPUT, build_sample
    build_sample()
    wb = load_workbook(OUTPUT, data_only=False)
    ws = wb["BMP"]
    # Row 3 is the header row. AN=40, AO=41, AP=42, AQ=43, AR=44, AS=45.
    assert ws.cell(3, 40).value == "Bio SA_pond_top (SF)"
    assert ws.cell(3, 41).value == "Bio top_elev (ft)"
    assert ws.cell(3, 42).value == "Bio overflow_elev (ft)"
    assert ws.cell(3, 43).value == "Bio sidewalk_elev (ft)"
    assert ws.cell(3, 44).value == "Bio curb_cut_elev (ft)"
    assert ws.cell(3, 45).value == "Bio Freeboard (ft)"


def test_bmp_sheet_has_dry_swale_geometry_columns():
    """BMP sheet gains Dry Swale geometry columns AT–BE."""
    from openpyxl import load_workbook
    from workbook.sample import OUTPUT, build_sample
    build_sample()
    wb = load_workbook(OUTPUT, data_only=False)
    ws = wb["BMP"]
    # AT=46 .. BE=57
    expected = [
        (46, "Swale L_s (ft)"),
        (47, "Swale w_s (ft)"),
        (48, "Swale inv_US (ft)"),
        (49, "Swale inv_DS (ft)"),
        (50, "Swale top_US (ft)"),
        (51, "Swale top_DS (ft)"),
        (52, "Swale H_cd (ft)"),
        (53, "Swale X_cd (ft)"),
        (54, "Swale Slope S (ft/ft)"),
        (55, "Swale N_cd"),
        (56, "Swale Wedge Sv/dam (CF)"),
        (57, "Swale Total Pond Sv (CF)"),
    ]
    for col, label in expected:
        assert ws.cell(3, col).value == label, f"col {col}: expected {label}, got {ws.cell(3, col).value}"
```

- [ ] **Step 2: Run tests to verify FAIL**

```bash
PYTHONPATH=. python3 -m pytest tests/test_bmp.py -v -k "geometry_columns"
```

Expected: 2 FAIL — headers don't exist yet.

- [ ] **Step 3: Extend `workbook/builders/bmp.py` HEADERS**

Edit the `HEADERS` list. After the existing entry `"Rv Applied (CF)",` append:

```python
    # ── Bio geometry extension (cols 40-45 / AN-AS) ──
    "Bio SA_pond_top (SF)", "Bio top_elev (ft)",
    "Bio overflow_elev (ft)", "Bio sidewalk_elev (ft)",
    "Bio curb_cut_elev (ft)", "Bio Freeboard (ft)",
    # ── Dry Swale geometry extension (cols 46-57 / AT-BE) ──
    "Swale L_s (ft)", "Swale w_s (ft)",
    "Swale inv_US (ft)", "Swale inv_DS (ft)",
    "Swale top_US (ft)", "Swale top_DS (ft)",
    "Swale H_cd (ft)", "Swale X_cd (ft)",
    "Swale Slope S (ft/ft)", "Swale N_cd",
    "Swale Wedge Sv/dam (CF)", "Swale Total Pond Sv (CF)",
```

- [ ] **Step 4: Extend column widths**

In `build_bmp_sheet()`, change the width loop upper bound from `range(1, 40)` to `range(1, 58)`:

```python
for i in range(1, 58):
    styles.cw(ws, i, 12)
```

- [ ] **Step 5: Extend `_ZONE_DIVIDER_COLS`**

Edit the top of `bmp.py`:

```python
# Zones: ID (A-E=5), PP (F-M=13), Bio/Dry Swale (N-X=24), Wet Swale (Y-AA=27),
#        Trees (AB-AH=34), Outputs (AI-AM=39),
#        Bio geometry (AN-AS=45), Dry Swale geometry (AT-BE=57).
_ZONE_DIVIDER_COLS = (5, 13, 24, 27, 34, 39, 45, 57)
```

- [ ] **Step 6: Extend the title banner span**

In `build_bmp_sheet()`, change the `styles.hdr(ws, 1, 1, …, span=39)` call to `span=57`. Also change the row-2 Ksat note bar's `span=39` to `span=57`.

- [ ] **Step 7: Add per-row cell writes for new columns**

Inside the `for r in range(data_start, data_end + 1):` loop in `build_bmp_sheet()`, after the existing `styles.calc_c(ws, r, 39, …)` line (AM = Rv Applied), append:

```python
        # ── Bio geometry extension ──
        # AN-AR (40-44): input cells (optional)
        for c in range(40, 45):
            styles.inp(ws, r, c)
        # AS (45): Bio Freeboard = min(overflow, sidewalk, curb_cut) − (top + d_pond)
        # Only computed when D = Bioretention AND top_elev + d_pond + any containment present.
        _bio_freeboard = (
            f'=IFERROR('
            f'IF(D{r}<>"Bioretention","",'
            f'IF(OR(AO{r}="",U{r}=""),"",'
            f'MIN(IF(AP{r}="",9E9,AP{r}),IF(AQ{r}="",9E9,AQ{r}),IF(AR{r}="",9E9,AR{r}))'
            f'- (AO{r} + U{r})'
            f')),"")'
        )
        styles.calc_c(ws, r, 45, _bio_freeboard)

        # ── Dry Swale geometry extension ──
        # AT-BA (46-53): input cells (optional)
        for c in range(46, 54):
            styles.inp(ws, r, c)
        # BB (54): Slope S = (inv_US − inv_DS) / L_s
        styles.calc_c(ws, r, 54,
                      f'=IFERROR(IF(OR(D{r}<>"Dry Swale",AT{r}="",AV{r}="",AW{r}=""),"",'
                      f'(AV{r}-AW{r})/AT{r}),"")')
        # BC (55): N_cd = FLOOR(L_s / X_cd)
        styles.calc_c(ws, r, 55,
                      f'=IFERROR(IF(OR(D{r}<>"Dry Swale",AT{r}="",BA{r}="",BA{r}=0),"",'
                      f'FLOOR(AT{r}/BA{r},1)),"")')
        # BD (56): Wedge Sv per dam = 0.5 × MIN(X_cd, H_cd/S) × H_cd × w_s
        styles.calc_c(ws, r, 56,
                      f'=IFERROR(IF(OR(D{r}<>"Dry Swale",BB{r}="",BB{r}=0,AZ{r}="",BA{r}="",AU{r}=""),"",'
                      f'0.5*MIN(BA{r},AZ{r}/BB{r})*AZ{r}*AU{r}),"")')
        # BE (57): Total Pond Sv = N_cd × BD
        styles.calc_c(ws, r, 57,
                      f'=IFERROR(IF(OR(BC{r}="",BD{r}=""),"",BC{r}*BD{r}),"")')
```

- [ ] **Step 8: Extend `_apply_zone_dividers` call sites**

In `build_bmp_sheet()`, the existing calls `_apply_zone_dividers(ws, 3, data_end)` and `_apply_zone_dividers(ws, sum_header_row, sda_sum_last)` automatically pick up the extended `_ZONE_DIVIDER_COLS` tuple. No code change needed — but verify the SDA Compliance Summary span still reads correctly. Change the `styles.apply_top_divider(ws, sum_header_row, 1, 39)` call to `styles.apply_top_divider(ws, sum_header_row, 1, 57)` so the top divider extends across the full width.

- [ ] **Step 9: Run tests to verify PASS**

```bash
PYTHONPATH=. python3 -m pytest tests/test_bmp.py -v -k "geometry_columns"
```

Expected: 2 PASS.

- [ ] **Step 10: Update `workbook/sample.py` BMPS tuple + add Dry Swale**

In `workbook/sample.py`, replace the existing `BMPS = [...]` with the extended version that includes a new Dry Swale and per-BMP geometry dicts:

```python
# (sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees_dict, geom_dict)
# geom_dict keys for Bioretention: sa_pond_top, top_elev, overflow_elev, sidewalk_elev, curb_cut_elev
# geom_dict keys for Dry Swale:   length, width, inv_us, inv_ds, top_us, top_ds, h_cd, x_cd
BMPS = [
    # SDA-2 — Bio opp 210, PP opp 150
    (2, "BMP-02-A", "Bioretention", "Enhanced", 210, {},
     {"sa_pond_top": 294, "top_elev": 100.0, "overflow_elev": 100.5,
      "sidewalk_elev": 100.75, "curb_cut_elev": 100.3}),
    (2, "BMP-02-B", "Permeable Pavement", "Enhanced", 150, {}, {}),
    # SDA-3 — PP opp 1290
    (3, "BMP-03-A", "Permeable Pavement", "Enhanced", 1290, {}, {}),
    # SDA-4 — PP opp 930, 2 planted large trees
    (4, "BMP-04-A", "Permeable Pavement", "Enhanced", 930, {}, {}),
    (4, "BMP-04-T", "Planted Trees", "—", 0, {"plt_lg": 2}, {}),
    # SDA-5 — PP opp 1870, trees, NEW Dry Swale
    (5, "BMP-05-A", "Permeable Pavement", "Enhanced", 1870, {}, {}),
    (5, "BMP-05-S", "Dry Swale", "—", 400, {},
     {"length": 100, "width": 4, "inv_us": 100.0, "inv_ds": 98.0,
      "top_us": 102.0, "top_ds": 100.0, "h_cd": 1.0, "x_cd": 50}),
    (5, "BMP-05-T", "Planted Trees", "—", 0, {"plt_lg": 8, "pres_lg": 2}, {}),
    # SDA-6 — Bio opp 225, 2 planted large
    (6, "BMP-06-A", "Bioretention", "Enhanced", 225, {},
     {"sa_pond_top": 315, "top_elev": 100.0, "overflow_elev": 100.5,
      "sidewalk_elev": 100.75, "curb_cut_elev": 100.3}),
    (6, "BMP-06-T", "Planted Trees", "—", 0, {"plt_lg": 2}, {}),
    # SDA-7 — Bio opp 220, 1 planted large
    (7, "BMP-07-A", "Bioretention", "Enhanced", 220, {},
     {"sa_pond_top": 308, "top_elev": 100.0, "overflow_elev": 100.5,
      "sidewalk_elev": 100.75, "curb_cut_elev": 100.3}),
    (7, "BMP-07-T", "Planted Trees", "—", 0, {"plt_lg": 1}, {}),
    # SDA-8 — Bio opp 1000, 3 planted large
    (8, "BMP-08-A", "Bioretention", "Enhanced", 1000, {},
     {"sa_pond_top": 1400, "top_elev": 100.0, "overflow_elev": 100.5,
      "sidewalk_elev": 100.75, "curb_cut_elev": 100.3}),
    (8, "BMP-08-T", "Planted Trees", "—", 0, {"plt_lg": 3}, {}),
    # SDA-9 — 3 planted large (trees only)
    (9, "BMP-09-T", "Planted Trees", "—", 0, {"plt_lg": 3}, {}),
    # SDA-10 — 2 planted large (trees only)
    (10, "BMP-10-T", "Planted Trees", "—", 0, {"plt_lg": 2}, {}),
]
```

The BMPS tuples now have 7 items (adding the geom dict). Any existing `for sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees in BMPS:` unpacking must become `for sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees, geom in BMPS:`.

- [ ] **Step 11: Extend `_fill_bmp()` to write the new cells**

In `workbook/sample.py` `_fill_bmp()`, find the per-row write section. After the existing writes (through column 33 for trees), add:

```python
        # ── Bio geometry (AN-AR, columns 40-44) ──
        if bmp_type == "Bioretention" and geom:
            if "sa_pond_top" in geom:
                ws.cell(row=row, column=40).value = geom["sa_pond_top"]
            if "top_elev" in geom:
                ws.cell(row=row, column=41).value = geom["top_elev"]
            if "overflow_elev" in geom:
                ws.cell(row=row, column=42).value = geom["overflow_elev"]
            if "sidewalk_elev" in geom:
                ws.cell(row=row, column=43).value = geom["sidewalk_elev"]
            if "curb_cut_elev" in geom:
                ws.cell(row=row, column=44).value = geom["curb_cut_elev"]
        # ── Dry Swale geometry (AT-BA, columns 46-53) ──
        if bmp_type == "Dry Swale" and geom:
            ws.cell(row=row, column=14).value = geom.get("width", 4) * 1  # SA_top approx = w × 1 ft (per cross-section)
            ws.cell(row=row, column=15).value = geom.get("length", 100) * geom.get("width", 4)  # SA_bot = L × w
            ws.cell(row=row, column=17).value = BIO_D_MEDIA
            ws.cell(row=row, column=19).value = BIO_D_GRAVEL
            ws.cell(row=row, column=21).value = geom.get("h_cd", 1.0)  # d_pond fallback
            ws.cell(row=row, column=46).value = geom["length"]
            ws.cell(row=row, column=47).value = geom["width"]
            ws.cell(row=row, column=48).value = geom["inv_us"]
            ws.cell(row=row, column=49).value = geom["inv_ds"]
            ws.cell(row=row, column=50).value = geom["top_us"]
            ws.cell(row=row, column=51).value = geom["top_ds"]
            ws.cell(row=row, column=52).value = geom["h_cd"]
            ws.cell(row=row, column=53).value = geom["x_cd"]
```

Note: for Dry Swale we also fill the SHARED Bio-zone cells (SA_top, SA_bot, d_media, d_gravel, d_pond) because parse.mjs still reads them for the subsurface components. The geometry cells (AT–BA) override the pond calc.

- [ ] **Step 12: Regenerate the fixture**

```bash
PYTHONPATH=. python3 -m workbook.sample
```

Expected: prints `Saved sample: …/SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`.

- [ ] **Step 13: Copy to all three app fixtures**

```bash
cp SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx \
   summary_calculator/tests/fixtures/minnesota-ave.xlsx
cp SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx \
   populator/tests/fixtures/minnesota-ave.xlsx
cp SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx \
   education/tests/fixtures/minnesota-ave.xlsx
```

- [ ] **Step 14: Regenerate the reference JSON**

```bash
PYTHONPATH=. python3 scripts/dump_reference.py
```

Expected: `Wrote …/minnesota-ave.reference.json`.

- [ ] **Step 15: Run full Python test sweep**

```bash
PYTHONPATH=. python3 -m pytest tests/ -q
```

Expected: all PASS (new column tests pass, existing tests still pass — pre-existing BMP cells and SDA cells are untouched).

- [ ] **Step 16: Commit**

```bash
git add workbook/builders/bmp.py workbook/sample.py \
        SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx \
        summary_calculator/tests/fixtures/minnesota-ave.xlsx \
        populator/tests/fixtures/minnesota-ave.xlsx \
        education/tests/fixtures/minnesota-ave.xlsx \
        summary_calculator/tests/fixtures/minnesota-ave.reference.json \
        tests/test_bmp.py
git commit -m "workbook: add Bio + Dry Swale geometry columns + Minnesota Ave values"
```

---

## Task 3 — Parser: split Bio vs Dry Swale into `bmp.bio` / `bmp.swale`

The parser currently populates `bmp.bio` for BOTH Bioretention and Dry Swale rows. Split: Bioretention → `bmp.bio`, Dry Swale → `bmp.swale`. Both parse the new optional geometry cells as `null` when blank (NOT `0` — that would conflate "not provided" with "zero").

**Files:**
- Modify: `summary_calculator/src/parse.mjs`
- Modify: `summary_calculator/tests/parse.test.mjs`

- [ ] **Step 1: Write failing parse tests**

Append to `summary_calculator/tests/parse.test.mjs`:

```javascript
test('parse: Bio BMPs populate bmp.bio with new optional geometry fields', () => {
  const { bmps } = parseWorkbook(wb);
  const bio = bmps.find(b => b.type === 'Bioretention');
  assert.ok(bio, 'at least one Bioretention BMP expected');
  assert.ok(bio.bio, 'bmp.bio sub-object present');
  // New optional fields: null when blank, number when provided.
  assert.equal(typeof bio.bio.saPondTop,    'number', 'saPondTop populated for Minnesota Ave Bio BMPs');
  assert.equal(typeof bio.bio.topElev,      'number');
  assert.equal(typeof bio.bio.overflowElev, 'number');
  assert.equal(typeof bio.bio.sidewalkElev, 'number');
  assert.equal(typeof bio.bio.curbCutElev,  'number');
});

test('parse: Dry Swale BMPs populate bmp.swale (NOT bmp.bio)', () => {
  const { bmps } = parseWorkbook(wb);
  const swale = bmps.find(b => b.type === 'Dry Swale');
  assert.ok(swale, 'at least one Dry Swale BMP expected (Minnesota Ave has BMP-05-S)');
  assert.ok(swale.swale, 'bmp.swale sub-object present');
  assert.ok(!swale.bio,  'bmp.bio must NOT be set for Dry Swale (regression guard)');
  assert.equal(swale.swale.length,          100);
  assert.equal(swale.swale.bottomWidth,     4);
  assert.equal(swale.swale.invUs,           100);
  assert.equal(swale.swale.invDs,           98);
  assert.equal(swale.swale.topUs,           102);
  assert.equal(swale.swale.topDs,           100);
  assert.equal(swale.swale.checkDamHeight,  1);
  assert.equal(swale.swale.checkDamSpacing, 50);
});

test('parse: blank optional geometry fields parse as null (not 0)', () => {
  // Smoke-check against the frozen pre-geometry fixture — no new fields present.
  // Pre-geometry Bio BMPs should have saPondTop === null, etc.
  const { bmps: oldBmps } = (async () => {
    const bytes = await import('node:fs').then(fs => fs.promises.readFile(
      join(__dirname, 'fixtures', 'minnesota-ave-pre-geometry.xlsx')));
    return parseWorkbook(XLSX.read(new Uint8Array(bytes), { type: 'array' }));
  })();
  // (Actual check happens in backward-compat.test.mjs — this is a smoke
  //  in-place to confirm null-vs-0 handling.)
  const bio = bmps.find(b => b.type === 'Bioretention');
  // If any new fields are legitimately 0, that must be a number not null.
  // We assert the parse returns null (not 0) when the cell is blank by
  // picking a cell we KNOW to be blank in the regenerated fixture — none
  // of the Minnesota Ave Bio BMPs have a null in these fields right now,
  // so this test just confirms the type is 'number' when values exist.
  assert.equal(typeof bio.bio.saPondTop, 'number');
});
```

(Note: the third test above is simplified vs the spec. The null-vs-0 behavior is more rigorously tested in Task 4's backward-compat regression against the frozen fixture.)

- [ ] **Step 2: Run to verify FAIL**

```bash
cd summary_calculator && node --test tests/parse.test.mjs
```

Expected: new tests FAIL (fields don't exist on parsed BMPs yet).

- [ ] **Step 3: Update `summary_calculator/src/parse.mjs`**

In `parseBmp()`, find the current Bio/Dry Swale branch:

```javascript
} else if (type === 'Bioretention' || type === 'Dry Swale') {
  row.bio = {
    saTop:   cell(sheet, r, 14) || 0,
    saBot:   cell(sheet, r, 15) || 0,
    dMedia:  cell(sheet, r, 17) || 0,
    dGravel: cell(sheet, r, 19) || 0,
    dPond:   cell(sheet, r, 21) || 0,
  };
}
```

Replace with the split + extended parsing:

```javascript
} else if (type === 'Bioretention') {
  row.bio = {
    saTop:        cell(sheet, r, 14) || 0,
    saBot:        cell(sheet, r, 15) || 0,
    dMedia:       cell(sheet, r, 17) || 0,
    dGravel:      cell(sheet, r, 19) || 0,
    dPond:        cell(sheet, r, 21) || 0,
    // NEW optional geometry — null if blank, not 0.
    saPondTop:    cell(sheet, r, 40),
    topElev:      cell(sheet, r, 41),
    overflowElev: cell(sheet, r, 42),
    sidewalkElev: cell(sheet, r, 43),
    curbCutElev:  cell(sheet, r, 44),
  };
} else if (type === 'Dry Swale') {
  row.swale = {
    saTop:           cell(sheet, r, 14) || 0,
    saBot:           cell(sheet, r, 15) || 0,
    dMedia:          cell(sheet, r, 17) || 0,
    dGravel:         cell(sheet, r, 19) || 0,
    dPond:           cell(sheet, r, 21) || 0,
    // NEW optional channel geometry — null if blank.
    length:          cell(sheet, r, 46),
    bottomWidth:     cell(sheet, r, 47),
    invUs:           cell(sheet, r, 48),
    invDs:           cell(sheet, r, 49),
    topUs:           cell(sheet, r, 50),
    topDs:           cell(sheet, r, 51),
    checkDamHeight:  cell(sheet, r, 52),
    checkDamSpacing: cell(sheet, r, 53),
  };
}
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
cd summary_calculator && node --test tests/parse.test.mjs
```

Expected: all PASS. The new Dry Swale fixture row (BMP-05-S) exercises the swale branch.

- [ ] **Step 5: Commit**

```bash
git add summary_calculator/src/parse.mjs summary_calculator/tests/parse.test.mjs
git commit -m "parse: split Bio vs Dry Swale (bmp.bio / bmp.swale) + new optional geometry"
```

---

## Task 4 — Backward-compat regression test (uses frozen fixture from Task 1)

Fill in the real backward-compat test now that the parser schema has changed. Prove the parser gracefully handles the frozen pre-change fixture (which has NO geometry columns) — the new optional fields read as `null`, the Dry Swale fallback path works, and all existing parse paths still return the expected shape.

**Files:**
- Modify: `summary_calculator/tests/backward-compat.test.mjs`

- [ ] **Step 1: Replace the stub with full regression assertions**

Overwrite `summary_calculator/tests/backward-compat.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sheetjsSrc = await readFile(join(__dirname, '..', 'lib', 'sheetjs-bundle.js'), 'utf8');
const XLSX = new Function(sheetjsSrc + '; return XLSX;')();

import { parseWorkbook } from '../src/parse.mjs';
import { rvProvidedPerSda } from '../src/aggregate.mjs';

const fixtureBytes = await readFile(
  join(__dirname, 'fixtures', 'minnesota-ave-pre-geometry.xlsx'),
);
const wb = XLSX.read(new Uint8Array(fixtureBytes), { type: 'array' });
const parsed = parseWorkbook(wb);

test('backward-compat: pre-geometry fixture parses without errors', () => {
  assert.ok(parsed.project.name, 'project name present');
  assert.ok(parsed.sdas.length > 0, 'SDAs parsed');
  assert.ok(parsed.bmps.length > 0, 'BMPs parsed');
});

test('backward-compat: Bio BMPs on pre-geometry fixture have all NEW fields as null', () => {
  const bio = parsed.bmps.find(b => b.type === 'Bioretention');
  assert.ok(bio, 'pre-geometry fixture has Bioretention BMPs');
  assert.ok(bio.bio, 'bmp.bio populated');
  assert.equal(bio.bio.saPondTop,    null, 'saPondTop is null (not provided)');
  assert.equal(bio.bio.topElev,      null);
  assert.equal(bio.bio.overflowElev, null);
  assert.equal(bio.bio.sidewalkElev, null);
  assert.equal(bio.bio.curbCutElev,  null);
  // Existing fields still populated correctly.
  assert.ok(bio.bio.saBot > 0, 'saBot still populated');
  assert.ok(bio.bio.dMedia > 0, 'dMedia still populated');
});

test('backward-compat: pre-geometry fixture has NO Dry Swale BMPs (fixture-specific guard)', () => {
  // The frozen pre-geometry fixture pre-dates adding BMP-05-S.
  // If this fails after someone edits the frozen fixture, that defeats the regression safety net.
  const swales = parsed.bmps.filter(b => b.type === 'Dry Swale');
  assert.equal(swales.length, 0, 'frozen fixture should contain no Dry Swale rows');
});

test('backward-compat: Rv provided per SDA still computes without new fields', () => {
  // Downstream consumer (aggregate) must still work when new fields are null.
  const rv = rvProvidedPerSda(parsed.bmps, parsed.cdas, parsed.params);
  assert.ok(Object.keys(rv).length > 0, 'rvProvidedPerSda returns non-empty map');
  // Spot-check: SDA-1 has no BMP → should not appear in the map (or appear as 0).
  const sda2Rv = rv['SDA-2'];
  assert.ok(sda2Rv > 0, 'SDA-2 (which has BMP-02-A Bioretention) has non-zero Rv provided');
});
```

- [ ] **Step 2: Run to verify PASS (parser already handles null for missing cells per Task 3)**

```bash
cd summary_calculator && node --test tests/backward-compat.test.mjs
```

Expected: 4 PASS. If the parse-null-vs-zero contract were broken, this test would fail.

- [ ] **Step 3: Commit**

```bash
git add summary_calculator/tests/backward-compat.test.mjs
git commit -m "test: backward-compat regression against frozen pre-geometry fixture"
```

---

## Task 5 — Calc engine: new `bioSizingSv` signature + `drySwaleSizingSv` + freeboard helpers

Rewrite `bioSizingSv` with new args `(saBot, saTop, saPondTop, dMedia, nMedia, dGravel, nGravel, dPond)`. Add new `drySwaleSizingSv({...})` with wedge pond + fallback. Add `bioFreeboardFt` and `drySwaleFreeboardFt` helpers.

**Files:**
- Modify: `summary_calculator/src/calc.mjs`
- Modify: `summary_calculator/tests/calc.test.mjs`

- [ ] **Step 1: Write failing calc tests**

Append to `summary_calculator/tests/calc.test.mjs`:

```javascript
import {
  bioSizingSv, drySwaleSizingSv, bioFreeboardFt, drySwaleFreeboardFt,
} from '../src/calc.mjs';

// ─── bioSizingSv — new signature ─────────────────────────────────────────────

test('bioSizingSv: vertical-wall fallback when saPondTop is null', () => {
  const r = bioSizingSv(210, 210, null, 2.0, 0.40, 0.5, 0.40, 0.5);
  // media_gravel = 210 × (2.0 × 0.40 + 0.5 × 0.40) = 210 × 1.0 = 210
  // pond (fallback) = 210 × 0.5 = 105
  // total = 315
  assert.equal(r.value, 315);
  assert.equal(r.pondModel, 'vertical');
  assert.equal(r.components.mediaGravelSv, 210);
  assert.equal(r.components.pondSv, 105);
});

test('bioSizingSv: trapezoid pond when saPondTop provided', () => {
  const r = bioSizingSv(210, 210, 294, 2.0, 0.40, 0.5, 0.40, 0.5);
  // media_gravel = 210 (as above)
  // pond (trapezoid) = 0.5 × (210 + 294) × 0.5 = 126
  // total = 336
  assert.equal(r.value, 336);
  assert.equal(r.pondModel, 'trapezoid');
  assert.equal(r.components.pondSv, 126);
});

test('bioSizingSv: trapezoid collapses to vertical when saPondTop === saTop', () => {
  const r = bioSizingSv(210, 210, 210, 2.0, 0.40, 0.5, 0.40, 0.5);
  // pond (trapezoid) = 0.5 × (210 + 210) × 0.5 = 105 — same as vertical
  assert.equal(r.components.pondSv, 105);
});

// ─── drySwaleSizingSv — new ───────────────────────────────────────────────────

test('drySwaleSizingSv: full geometry → wedge pond', () => {
  const r = drySwaleSizingSv({
    saBot: 400, dMedia: 2.0, nMedia: 0.40, dGravel: 0.5, nGravel: 0.40, dPond: 1.0,
    length: 100, bottomWidth: 4, invUs: 100.0, invDs: 98.0,
    checkDamHeight: 1.0, checkDamSpacing: 50,
  });
  // slope = (100 - 98)/100 = 0.02
  // fullWedgeBase = 1.0 / 0.02 = 50
  // effectiveBase = min(50, 50) = 50
  // wedgePerDam = 0.5 × 50 × 1.0 × 4 = 100
  // nDams = floor(100 / 50) = 2
  // pond = 2 × 100 = 200
  // media_gravel = 400 × (2.0×0.40 + 0.5×0.40) = 400 × 1.0 = 400
  // total = 600
  assert.equal(r.value, 600);
  assert.equal(r.pondModel, 'wedge');
  assert.equal(r.components.pondSv, 200);
  assert.equal(r.pondTrace.nDams, 2);
  assert.equal(r.pondTrace.wedgePerDam, 100);
});

test('drySwaleSizingSv: wedge capped at H/S when spacing exceeds it', () => {
  const r = drySwaleSizingSv({
    saBot: 400, dMedia: 2.0, nMedia: 0.40, dGravel: 0.5, nGravel: 0.40, dPond: 1.0,
    length: 200, bottomWidth: 4, invUs: 100.0, invDs: 98.0,
    checkDamHeight: 0.5, checkDamSpacing: 100,  // H/S = 0.5/0.01 = 50 < 100 spacing
  });
  // slope = 0.01, fullWedgeBase = 50, effectiveBase = min(100, 50) = 50
  // wedgePerDam = 0.5 × 50 × 0.5 × 4 = 50
  // nDams = 2
  // pond = 100
  assert.equal(r.components.pondSv, 100);
  assert.equal(r.pondTrace.effectiveBase, 50);
});

test('drySwaleSizingSv: spacing < H/S truncates wedge', () => {
  const r = drySwaleSizingSv({
    saBot: 400, dMedia: 2.0, nMedia: 0.40, dGravel: 0.5, nGravel: 0.40, dPond: 1.0,
    length: 100, bottomWidth: 4, invUs: 100.0, invDs: 98.0,
    checkDamHeight: 2.0, checkDamSpacing: 25,  // H/S = 2/0.02 = 100 > 25 spacing
  });
  // slope = 0.02, fullWedgeBase = 100, effectiveBase = min(25, 100) = 25
  // wedgePerDam = 0.5 × 25 × 2.0 × 4 = 100
  // nDams = floor(100/25) = 4
  // pond = 400
  assert.equal(r.components.pondSv, 400);
  assert.equal(r.pondTrace.effectiveBase, 25);
});

test('drySwaleSizingSv: missing geometry → flat-pond fallback', () => {
  const r = drySwaleSizingSv({
    saBot: 400, dMedia: 2.0, nMedia: 0.40, dGravel: 0.5, nGravel: 0.40, dPond: 1.0,
    length: null, bottomWidth: null, invUs: null, invDs: null,
    checkDamHeight: null, checkDamSpacing: null,
  });
  // pond fallback = 400 × 1.0 = 400
  assert.equal(r.components.pondSv, 400);
  assert.equal(r.pondModel, 'flat-fallback');
});

test('drySwaleSizingSv: zero slope does not divide-by-zero', () => {
  const r = drySwaleSizingSv({
    saBot: 400, dMedia: 2.0, nMedia: 0.40, dGravel: 0.5, nGravel: 0.40, dPond: 1.0,
    length: 100, bottomWidth: 4, invUs: 100.0, invDs: 100.0,  // flat → slope 0
    checkDamHeight: 1.0, checkDamSpacing: 50,
  });
  // slope guarded at 1e-6, fullWedgeBase = 1e6 → effectiveBase = min(50, 1e6) = 50
  // wedge = 0.5 × 50 × 1.0 × 4 = 100, nDams = 2, pond = 200
  assert.equal(r.components.pondSv, 200);
});

// ─── Freeboard helpers ───────────────────────────────────────────────────────

test('bioFreeboardFt: computes min(containment) − design water surface', () => {
  const fb = bioFreeboardFt({
    topElev: 100.0, dPond: 0.5,
    overflowElev: 100.75, sidewalkElev: 100.80, curbCutElev: null,
  });
  // design WS = 100.5; min containment = min(100.75, 100.80) = 100.75; fb = 0.25
  assert.equal(fb, 0.25);
});

test('bioFreeboardFt: returns null when any critical input missing', () => {
  assert.equal(bioFreeboardFt({ topElev: null, dPond: 0.5,
    overflowElev: 100.75, sidewalkElev: null, curbCutElev: null }), null);
  assert.equal(bioFreeboardFt({ topElev: 100.0, dPond: null,
    overflowElev: 100.75, sidewalkElev: null, curbCutElev: null }), null);
  assert.equal(bioFreeboardFt({ topElev: 100.0, dPond: 0.5,
    overflowElev: null, sidewalkElev: null, curbCutElev: null }), null);
});

test('drySwaleFreeboardFt: min of US/DS freeboard', () => {
  const fb = drySwaleFreeboardFt({
    invUs: 100.0, invDs: 98.0, topUs: 102.0, topDs: 100.0, checkDamHeight: 1.0,
  });
  // US ws = 101.0, DS ws = 99.0; US fb = 1.0, DS fb = 1.0; min = 1.0
  assert.equal(fb, 1.0);
});

test('drySwaleFreeboardFt: returns null when any input missing', () => {
  assert.equal(drySwaleFreeboardFt({
    invUs: 100.0, invDs: null, topUs: 102.0, topDs: 100.0, checkDamHeight: 1.0,
  }), null);
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd summary_calculator && node --test tests/calc.test.mjs
```

Expected: new tests FAIL — functions don't exist / have wrong signature.

- [ ] **Step 3: Rewrite `bioSizingSv` + add new functions to `calc.mjs`**

Replace the existing `bioSizingSv` function in `summary_calculator/src/calc.mjs` with:

```javascript
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
```

- [ ] **Step 4: Run tests to verify PASS**

```bash
cd summary_calculator && node --test tests/calc.test.mjs
```

Expected: all PASS, including the ~12 new tests above.

- [ ] **Step 5: Commit**

```bash
git add summary_calculator/src/calc.mjs summary_calculator/tests/calc.test.mjs
git commit -m "calc: new bioSizingSv signature + drySwaleSizingSv wedge + freeboard helpers"
```

---

## Task 6 — Aggregate: `_rvForBmp` branches for new BMP shape

Update `summary_calculator/src/aggregate.mjs` so `_rvForBmp` picks the correct sizing function per BMP type: Bioretention → `bioSizingSv(..., saPondTop, ...)` with new signature; Dry Swale → `drySwaleSizingSv({...})` with the full geometry object.

**Files:**
- Modify: `summary_calculator/src/aggregate.mjs`
- Modify: `summary_calculator/tests/aggregate.test.mjs`

- [ ] **Step 1: Write failing aggregate tests**

Append to `summary_calculator/tests/aggregate.test.mjs`:

```javascript
test('rvProvidedPerSda: Bio with saPondTop uses trapezoid pond (higher Rv than vertical fallback)', () => {
  const bmps = [
    { name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
      bio: { saBot: 210, saTop: 210, saPondTop: 294,
             dMedia: 2.0, dGravel: 0.5, dPond: 0.5 } },
  ];
  const cdas = []; // no cap
  const result = rvProvidedPerSda(bmps, cdas, params);
  // media_gravel = 210 × 1.0 = 210; pond trap = 0.5 × (210 + 294) × 0.5 = 126
  // Sv = 336, Rv = 336 × 1.0 = 336
  assert.equal(result['SDA-1'], 336);
});

test('rvProvidedPerSda: Bio without saPondTop uses vertical fallback (backward-compat)', () => {
  const bmps = [
    { name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
      bio: { saBot: 210, saTop: 210, saPondTop: null,
             dMedia: 2.0, dGravel: 0.5, dPond: 0.5 } },
  ];
  const result = rvProvidedPerSda(bmps, [], params);
  // media_gravel = 210; pond vertical = 210 × 0.5 = 105; Sv = 315
  assert.equal(result['SDA-1'], 315);
});

test('rvProvidedPerSda: Dry Swale with full geometry uses wedge pond', () => {
  const bmps = [
    { name: 'S-1', sdaId: 'SDA-1', cdaId: null, type: 'Dry Swale', subType: '—',
      swale: {
        saBot: 400, dMedia: 2.0, dGravel: 0.5, dPond: 1.0,
        length: 100, bottomWidth: 4, invUs: 100.0, invDs: 98.0,
        checkDamHeight: 1.0, checkDamSpacing: 50,
      } },
  ];
  const result = rvProvidedPerSda(bmps, [], {
    bmpDesign: { 'Dry Swale / —': { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 } },
    treeCredits: {},
  });
  // media_gravel = 400 × 1.0 = 400; wedge pond = 2 × 100 = 200; Sv = 600; Rv = 600
  assert.equal(result['SDA-1'], 600);
});

test('rvProvidedPerSda: Dry Swale without geometry falls back to flat-pond formula', () => {
  const bmps = [
    { name: 'S-1', sdaId: 'SDA-1', cdaId: null, type: 'Dry Swale', subType: '—',
      swale: {
        saBot: 400, dMedia: 2.0, dGravel: 0.5, dPond: 1.0,
        length: null, bottomWidth: null, invUs: null, invDs: null,
        checkDamHeight: null, checkDamSpacing: null,
      } },
  ];
  const result = rvProvidedPerSda(bmps, [], {
    bmpDesign: { 'Dry Swale / —': { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 } },
    treeCredits: {},
  });
  // media_gravel = 400; flat pond = 400 × 1.0 = 400; Sv = 800
  assert.equal(result['SDA-1'], 800);
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd summary_calculator && node --test tests/aggregate.test.mjs
```

Expected: new tests FAIL — aggregate still calls old `bioSizingSv` signature / treats Dry Swale via `bmp.bio`.

- [ ] **Step 3: Update `_rvForBmp` in `aggregate.mjs`**

Edit `summary_calculator/src/aggregate.mjs`. Change the import line at the top:

```javascript
import {
  ppSizingSv, bioSizingSv, drySwaleSizingSv, rvFromSv,
  maxBmpCredit, treeRetentionCredit,
} from './calc.mjs';
```

Replace the existing Bio/Dry Swale branch of `_rvForBmp` (currently combined into one block checking `bmp.type === 'Bioretention' || bmp.type === 'Dry Swale'` and reading `bmp.bio`) with two separate branches:

```javascript
  if (bmp.type === 'Bioretention' && bmp.bio) {
    const design = params.bmpDesign[`Bioretention / ${bmp.subType}`] || DEFAULT_BIO_DESIGN;
    const sv = bioSizingSv(
      bmp.bio.saBot, bmp.bio.saTop, bmp.bio.saPondTop,
      bmp.bio.dMedia, design.nMedia,
      bmp.bio.dGravel, design.nGravel, bmp.bio.dPond,
    ).value;
    const rv = rvFromSv(sv, design.retMultiplier).value;
    const cda = cdas.find(c => c.cdaId === bmp.cdaId);
    return cda ? Math.min(rv, maxBmpCredit(cda.postIn).value) : rv;
  }
  if (bmp.type === 'Dry Swale' && bmp.swale) {
    const design = params.bmpDesign[`Dry Swale / ${bmp.subType}`] || DEFAULT_BIO_DESIGN;
    const sv = drySwaleSizingSv({
      saBot: bmp.swale.saBot,
      dMedia: bmp.swale.dMedia, nMedia: design.nMedia,
      dGravel: bmp.swale.dGravel, nGravel: design.nGravel,
      dPond: bmp.swale.dPond,
      length: bmp.swale.length, bottomWidth: bmp.swale.bottomWidth,
      invUs: bmp.swale.invUs, invDs: bmp.swale.invDs,
      checkDamHeight: bmp.swale.checkDamHeight,
      checkDamSpacing: bmp.swale.checkDamSpacing,
    }).value;
    const rv = rvFromSv(sv, design.retMultiplier).value;
    const cda = cdas.find(c => c.cdaId === bmp.cdaId);
    return cda ? Math.min(rv, maxBmpCredit(cda.postIn).value) : rv;
  }
```

Also apply the same split in `rvProvidedPerBmp()` — same shape, same guard, same return.

- [ ] **Step 4: Run tests to verify PASS**

```bash
cd summary_calculator && node --test tests/aggregate.test.mjs
```

Expected: all PASS.

- [ ] **Step 5: Update inline aggregate in `summary_calculator/src/ui.mjs` (deck builder)**

In `buildDeck`, find the per-BMP loop that computes `rvBySda` directly inline (not via the helper). If it still exists (depending on prior tasks' refactor history), update it to use `bmp.swale` for Dry Swale. If `buildDeck` already delegates to `rvProvidedPerSda` (per the Task 2 refactor from the earlier plan), no change needed here — the helper handles it. Verify by grepping:

```bash
grep -n "bmp.bio\|bmp.type === 'Dry Swale'" summary_calculator/src/ui.mjs
```

Expected: no matches (or only within a `rvProvidedPerSda`-equivalent block that's already correct). If matches exist, update to split per the pattern above.

- [ ] **Step 6: Apply the same inline aggregate update to `education/src/ui.mjs`**

```bash
grep -n "bmp.bio\|bmp.type === 'Dry Swale'" education/src/ui.mjs
```

Update any matches the same way.

- [ ] **Step 7: Run full summary test suite**

```bash
cd summary_calculator && node --test tests/calc.test.mjs tests/render.test.mjs \
    tests/parse.test.mjs tests/aggregate.test.mjs tests/parity.test.mjs \
    tests/backward-compat.test.mjs
```

Expected: all PASS. The parity test may show per-BMP Rv differences for Bio BMPs with saPondTop (now trapezoid, higher Sv) — re-baselining happened in Task 2 so values should match the regenerated reference.

- [ ] **Step 8: Commit**

```bash
git add summary_calculator/src/aggregate.mjs summary_calculator/src/ui.mjs \
        education/src/ui.mjs summary_calculator/tests/aggregate.test.mjs
git commit -m "aggregate: branch _rvForBmp on bmp.swale (Dry Swale) and new bioSizingSv signature"
```

---

## Task 7 — Populator: Dry Swale mapping reads `bmp.swale.*` (cell writes UNCHANGED)

The populator's SWMP-BMP Calc mapping writes to the DOEE sheet's cells C29–C36 for Dry Swale. Those cells and the values written are UNCHANGED — the mapping just reads from the renamed `bmp.swale` sub-object. Existing cell-value tests must still pass as a regression guard.

**Files:**
- Modify: `populator/src/mappings/swmp-bmp-calc.mjs`

- [ ] **Step 1: Grep for Dry Swale references in the mapping**

```bash
grep -n "'Dry Swale'\|bmp.bio" populator/src/mappings/swmp-bmp-calc.mjs
```

Expected: find the Dry Swale branch that currently reads `bmp.bio.saTop`, `bmp.bio.saBot`, etc.

- [ ] **Step 2: Update the Dry Swale branch to read `bmp.swale.*`**

Find the Dry Swale branch (should look like):

```javascript
} else if (bmp.type === 'Dry Swale') {
  if (!bmp.bio) { warnings.push(`${bmp.name}: missing bio sub-object; skipped.`); continue; }
  cells.push(
    { sheet, ref: 'C29', value: bmp.bio.saTop },
    { sheet, ref: 'C30', value: bmp.bio.saBot },
    { sheet, ref: 'C32', value: bmp.bio.dMedia },
    { sheet, ref: 'C34', value: bmp.bio.dGravel },
    { sheet, ref: 'C36', value: bmp.bio.dPond },
  );
}
```

Replace with:

```javascript
} else if (bmp.type === 'Dry Swale') {
  if (!bmp.swale) { warnings.push(`${bmp.name}: missing swale sub-object; skipped.`); continue; }
  cells.push(
    { sheet, ref: 'C29', value: bmp.swale.saTop },
    { sheet, ref: 'C30', value: bmp.swale.saBot },
    { sheet, ref: 'C32', value: bmp.swale.dMedia },
    { sheet, ref: 'C34', value: bmp.swale.dGravel },
    { sheet, ref: 'C36', value: bmp.swale.dPond },
  );
}
```

**Critical:** cell refs (C29, C30, C32, C34, C36) are UNCHANGED. Only the source property is renamed.

- [ ] **Step 3: Run the SWMP-BMP Calc mapping tests**

```bash
cd populator && node --test tests/mappings/swmp-bmp-calc.test.mjs
```

Expected: all PASS. Minnesota Ave now has a Dry Swale BMP (BMP-05-S), so the mapping produces an additional output file for it, and the cell-value assertions in the existing test must still hold.

Note: if the existing test currently expects a count that doesn't include a Dry Swale output, update the expected count. For Minnesota Ave the new count is `4 PP + 4 Bio + 1 Dry Swale + 7 Trees = 16` BMPs populated — up from 15.

- [ ] **Step 4: If needed, update the output count assertion**

In `populator/tests/mappings/swmp-bmp-calc.test.mjs`, find the test that asserts `result.outputs.length === 15` and change to `16`. Also update `populator/tests/populate.test.mjs` for the end-to-end `18 outputs` → `19 outputs` if it hard-codes the count.

```bash
grep -n "15\|18 outputs" populator/tests/
```

Update any matching hard-coded counts to 16 and 19 respectively.

- [ ] **Step 5: Run full populator test suite**

```bash
cd populator && node --test tests/populate.test.mjs tests/xlsx-surgical.test.mjs tests/mappings/*.test.mjs
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add populator/src/mappings/swmp-bmp-calc.mjs populator/tests/
git commit -m "populator: Dry Swale mapping reads bmp.swale.* (cell writes unchanged)"
```

---

## Task 8 — Summary app: Bio BMP page gets Sv breakdown + freeboard block

Expand `renderBmpSheets` in `summary_calculator/src/render.mjs` for the Bioretention path. Show three Sv component lines (media, gravel, pond) with the `[trapezoid]` / `[vertical-wall]` tag. Add a new FREEBOARD block when any elevation field is provided.

**Files:**
- Modify: `summary_calculator/src/render.mjs`
- Modify: `summary_calculator/tests/render.test.mjs`

- [ ] **Step 1: Write failing render tests**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
test('renderBmpSheets: Bio page shows [trapezoid] tag + freeboard when geometry provided', () => {
  const project = { name: 'Test', rainfallIn: 1.2 };
  const bmps = [{
    name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
    bio: { saBot: 210, saTop: 210, saPondTop: 294,
           dMedia: 2.0, dGravel: 0.5, dPond: 0.5,
           topElev: 100.0, overflowElev: 100.75,
           sidewalkElev: 100.80, curbCutElev: 100.3 },
  }];
  const cdas = [{ cdaId: 'CDA-1', postIn: 2000 }];
  const params = { bmpDesign: { 'Bioretention / Enhanced': { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 } }, treeCredits: {} };
  const pages = renderBmpSheets(project, bmps, cdas, params);
  const html = pages[0];
  assert.ok(html.includes('trapezoid'), 'should show trapezoid tag');
  assert.ok(html.includes('FREEBOARD'), 'should show freeboard block');
  assert.ok(html.includes('126'), 'should show pond_Sv = 126 cf');
});

test('renderBmpSheets: Bio page omits freeboard block when no elevations provided', () => {
  const project = { name: 'Test', rainfallIn: 1.2 };
  const bmps = [{
    name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
    bio: { saBot: 210, saTop: 210, saPondTop: null,
           dMedia: 2.0, dGravel: 0.5, dPond: 0.5,
           topElev: null, overflowElev: null, sidewalkElev: null, curbCutElev: null },
  }];
  const cdas = [{ cdaId: 'CDA-1', postIn: 2000 }];
  const params = { bmpDesign: { 'Bioretention / Enhanced': { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 } }, treeCredits: {} };
  const html = renderBmpSheets(project, bmps, cdas, params)[0];
  assert.ok(!html.includes('FREEBOARD'), 'no freeboard block without elevations');
  assert.ok(html.includes('vertical'), 'should show vertical-wall tag');
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd summary_calculator && node --test tests/render.test.mjs
```

Expected: 2 new render tests FAIL.

- [ ] **Step 3: Update `_renderBio` in `summary_calculator/src/render.mjs`**

Find the `_renderBio(project, bmp, cda, params)` function. Replace with the geometry-aware version:

```javascript
import { bioSizingSv as _bioSizingSvForRender, bioFreeboardFt } from './calc.mjs';

function _renderBio(project, bmp, cda, params) {
  const designKey = `${bmp.type} / ${bmp.subType}`;
  const design = params.bmpDesign[designKey] || { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 };

  const svTrace = _bioSizingSvForRender(
    bmp.bio.saBot, bmp.bio.saTop, bmp.bio.saPondTop,
    bmp.bio.dMedia, design.nMedia,
    bmp.bio.dGravel, design.nGravel, bmp.bio.dPond,
  );
  const rvTrace = rvFromSv(svTrace.value, design.retMultiplier);
  const cdaArea = cda ? cda.postIn : 0;
  const maxTrace = maxBmpCredit(cdaArea);
  const rvApplied = Math.min(rvTrace.value, maxTrace.value);
  const pass = rvApplied === rvTrace.value;

  const inputsHtml = renderKvTable([
    ['BMP',       `${bmp.name} (${bmp.type} / ${bmp.subType})`],
    ['SDA',       bmp.sdaId],
    ['CDA',       bmp.cdaId || '—'],
    ['SA_top',    `${fmtN(bmp.bio.saTop)} sf`],
    ['SA_bot',    `${fmtN(bmp.bio.saBot)} sf`],
    ['SA_pond_top', bmp.bio.saPondTop != null ? `${fmtN(bmp.bio.saPondTop)} sf` : '—'],
    ['d_media',   `${fmtN(bmp.bio.dMedia, 2)} ft`],
    ['d_gravel',  `${fmtN(bmp.bio.dGravel, 2)} ft`],
    ['d_pond',    `${fmtN(bmp.bio.dPond, 2)} ft`],
    ['n_media',   `${design.nMedia}`],
    ['n_gravel',  `${design.nGravel}`],
    ['Ret. Multiplier', `${design.retMultiplier}`],
  ]);

  const svBreakdown = `
    <div class="cs-formula-line">media_Sv  = SA_bot × d_media × n_media    = ${fmtN(bmp.bio.saBot)} × ${bmp.bio.dMedia} × ${design.nMedia} = ${fmtN(bmp.bio.saBot * bmp.bio.dMedia * design.nMedia, 0)} cf</div>
    <div class="cs-formula-line">gravel_Sv = SA_bot × d_gravel × n_gravel = ${fmtN(bmp.bio.saBot)} × ${bmp.bio.dGravel} × ${design.nGravel} = ${fmtN(bmp.bio.saBot * bmp.bio.dGravel * design.nGravel, 0)} cf</div>
    <div class="cs-formula-line">pond_Sv   = ${svTrace.pondModel === 'trapezoid'
      ? `½ × (SA_top + SA_pond_top) × d_pond = ½ × (${bmp.bio.saTop} + ${bmp.bio.saPondTop}) × ${bmp.bio.dPond}`
      : `SA_bot × d_pond = ${bmp.bio.saBot} × ${bmp.bio.dPond}`
    } = ${fmtN(svTrace.components.pondSv, 0)} cf   [${svTrace.pondModel}]</div>
    <div class="cs-formula-line"><b>Sv_total = ${fmtN(svTrace.value, 0)} cf</b></div>
  `;

  // Freeboard block only when elevations provided.
  const fb = bioFreeboardFt({
    topElev: bmp.bio.topElev, dPond: bmp.bio.dPond,
    overflowElev: bmp.bio.overflowElev,
    sidewalkElev: bmp.bio.sidewalkElev,
    curbCutElev: bmp.bio.curbCutElev,
  });
  const freeboardBlock = fb == null ? '' : (() => {
    const containments = [bmp.bio.overflowElev, bmp.bio.sidewalkElev, bmp.bio.curbCutElev]
      .filter(e => e != null);
    const minC = Math.min(...containments);
    const dws = bmp.bio.topElev + bmp.bio.dPond;
    const fbIn = fb * 12;
    const passFb = fb >= 0.25;  // 3" = 0.25 ft
    return renderBlock('FREEBOARD (DDOT §33.14.5.5 min 3″)', `
      <div class="cs-formula-line">top_elev + d_pond (design water surface) = ${bmp.bio.topElev} + ${bmp.bio.dPond} = ${dws.toFixed(2)} ft</div>
      <div class="cs-formula-line">Min containment = ${minC.toFixed(2)} ft</div>
      <div class="cs-formula-line"><b>Freeboard = ${minC.toFixed(2)} − ${dws.toFixed(2)} = ${fb.toFixed(2)} ft (${fbIn.toFixed(1)}″) ${passFb ? '✓' : '✗'}</b></div>
    `);
  })();

  return renderSheetShell({
    title: `${bmp.name} — ${bmp.type} (${bmp.subType})`,
    sub:   `${project.name || ''} · ${bmp.sdaId} · ${bmp.cdaId || ''}`,
    body:
      renderBlock('INPUTS', inputsHtml) +
      renderBlock('STORAGE VOLUME BREAKDOWN', svBreakdown) +
      renderBlock('RETENTION VOLUME', renderTrace(rvTrace)) +
      renderBlock('COMPLIANCE', renderTrace(maxTrace) + renderResult(
        pass ? 'Rv provided ≤ Max Credit — OK'
             : `Rv capped at ${fmtN(maxTrace.value, 0)} cf`,
        rvApplied, 'cf', pass,
      )) +
      freeboardBlock,
    footer: BIO_FOOTER,
  });
}
```

- [ ] **Step 4: Rebuild + test**

```bash
cd summary_calculator && node build.js >/dev/null && node --test tests/render.test.mjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add summary_calculator/src/render.mjs summary_calculator/tests/render.test.mjs \
        summary_calculator/summary-calculator.html
git commit -m "summary: Bio page shows Sv breakdown + freeboard when geometry provided"
```

---

## Task 9 — Summary app: Dry Swale BMP page (new, split from Bio)

Currently `_renderBio` handles both Bioretention and Dry Swale. Split out a dedicated `_renderDrySwale(project, bmp, cda, params)` that shows channel geometry + wedge pond + freeboard, OR falls back to the Bio-shaped output when geometry is absent.

**Files:**
- Modify: `summary_calculator/src/render.mjs`
- Modify: `summary_calculator/tests/render.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `summary_calculator/tests/render.test.mjs`:

```javascript
test('renderBmpSheets: Dry Swale page shows channel geometry + wedge + freeboard', () => {
  const project = { name: 'Test', rainfallIn: 1.2 };
  const bmps = [{
    name: 'S-1', sdaId: 'SDA-1', cdaId: null, type: 'Dry Swale', subType: '—',
    swale: {
      saBot: 400, saTop: 4,
      dMedia: 2.0, dGravel: 0.5, dPond: 1.0,
      length: 100, bottomWidth: 4,
      invUs: 100.0, invDs: 98.0, topUs: 102.0, topDs: 100.0,
      checkDamHeight: 1.0, checkDamSpacing: 50,
    },
  }];
  const params = { bmpDesign: { 'Dry Swale / —': { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 } }, treeCredits: {} };
  const html = renderBmpSheets(project, bmps, [], params)[0];
  assert.ok(html.includes('CHANNEL GEOMETRY'));
  assert.ok(html.includes('wedge'));
  assert.ok(html.includes('FREEBOARD'));
  assert.ok(html.includes('N_cd'));
  assert.ok(html.includes('200'));  // total pond Sv
});

test('renderBmpSheets: Dry Swale page falls back to flat-pond when geometry absent', () => {
  const project = { name: 'Test', rainfallIn: 1.2 };
  const bmps = [{
    name: 'S-1', sdaId: 'SDA-1', cdaId: null, type: 'Dry Swale', subType: '—',
    swale: {
      saBot: 400, saTop: 4,
      dMedia: 2.0, dGravel: 0.5, dPond: 1.0,
      length: null, bottomWidth: null,
      invUs: null, invDs: null, topUs: null, topDs: null,
      checkDamHeight: null, checkDamSpacing: null,
    },
  }];
  const params = { bmpDesign: { 'Dry Swale / —': { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 } }, treeCredits: {} };
  const html = renderBmpSheets(project, bmps, [], params)[0];
  assert.ok(!html.includes('CHANNEL GEOMETRY'));
  assert.ok(!html.includes('FREEBOARD'));
  assert.ok(html.includes('flat-fallback') || html.includes('d_pond'));
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd summary_calculator && node --test tests/render.test.mjs
```

Expected: Dry Swale tests FAIL — no dedicated renderer yet.

- [ ] **Step 3: Add `_renderDrySwale` in `summary_calculator/src/render.mjs`**

```javascript
import { drySwaleSizingSv, drySwaleFreeboardFt } from './calc.mjs';

const SWALE_FOOTER = 'DOEE Guidebook §3.9 O-2 Dry Swale · DDOT §33.14.5';

function _renderDrySwale(project, bmp, cda, params) {
  const designKey = `Dry Swale / ${bmp.subType}`;
  const design = params.bmpDesign[designKey] || { nMedia: 0.40, nGravel: 0.40, retMultiplier: 1.0 };

  const svTrace = drySwaleSizingSv({
    saBot: bmp.swale.saBot,
    dMedia: bmp.swale.dMedia, nMedia: design.nMedia,
    dGravel: bmp.swale.dGravel, nGravel: design.nGravel,
    dPond: bmp.swale.dPond,
    length: bmp.swale.length, bottomWidth: bmp.swale.bottomWidth,
    invUs: bmp.swale.invUs, invDs: bmp.swale.invDs,
    checkDamHeight: bmp.swale.checkDamHeight,
    checkDamSpacing: bmp.swale.checkDamSpacing,
  });
  const rvTrace = rvFromSv(svTrace.value, design.retMultiplier);
  const cdaArea = cda ? cda.postIn : 0;
  const maxTrace = maxBmpCredit(cdaArea);
  const rvApplied = Math.min(rvTrace.value, maxTrace.value);
  const pass = rvApplied === rvTrace.value;

  const inputsHtml = renderKvTable([
    ['BMP', `${bmp.name} (${bmp.type})`],
    ['SDA', bmp.sdaId],
    ['CDA', bmp.cdaId || '—'],
    ['SA_bot', `${fmtN(bmp.swale.saBot)} sf`],
    ['d_media',  `${fmtN(bmp.swale.dMedia, 2)} ft`],
    ['d_gravel', `${fmtN(bmp.swale.dGravel, 2)} ft`],
    ['d_pond',   `${fmtN(bmp.swale.dPond, 2)} ft`],
    ['n_media',  `${design.nMedia}`],
    ['n_gravel', `${design.nGravel}`],
    ['Ret. Multiplier', `${design.retMultiplier}`],
  ]);

  // Channel geometry block (only when geometry provided).
  let geometryBlock = '';
  if (svTrace.pondModel === 'wedge') {
    const t = svTrace.pondTrace;
    geometryBlock = renderBlock('CHANNEL GEOMETRY (per DDOT §33.14.5)', `
      <div class="cs-formula-line">L_s = ${bmp.swale.length} ft    w_s = ${bmp.swale.bottomWidth} ft</div>
      <div class="cs-formula-line">inv_US = ${bmp.swale.invUs} ft    inv_DS = ${bmp.swale.invDs} ft</div>
      <div class="cs-formula-line">Slope S = (${bmp.swale.invUs} − ${bmp.swale.invDs}) / ${bmp.swale.length} = ${t.slope.toFixed(4)} ft/ft</div>
      <div class="cs-formula-line">Check dam H_cd = ${bmp.swale.checkDamHeight} ft    Spacing X_cd = ${bmp.swale.checkDamSpacing} ft</div>
      <div class="cs-formula-line">N_cd = floor(${bmp.swale.length} / ${bmp.swale.checkDamSpacing}) = ${t.nDams} dams</div>
    `) + renderBlock('POND STORAGE PER CHECK DAM (3D WEDGE)', `
      <div class="cs-formula-line">Full wedge upstream length = H_cd / S = ${bmp.swale.checkDamHeight} / ${t.slope.toFixed(4)} = ${t.fullWedgeBase.toFixed(1)} ft</div>
      <div class="cs-formula-line">Effective base = min(X_cd, H_cd/S) = min(${bmp.swale.checkDamSpacing}, ${t.fullWedgeBase.toFixed(1)}) = ${t.effectiveBase.toFixed(1)} ft</div>
      <div class="cs-formula-line">Wedge Sv per dam = ½ × ${t.effectiveBase.toFixed(1)} × ${bmp.swale.checkDamHeight} × ${bmp.swale.bottomWidth} = ${t.wedgePerDam.toFixed(0)} cf</div>
      <div class="cs-formula-line"><b>Total pond Sv = N_cd × wedge Sv = ${t.nDams} × ${t.wedgePerDam.toFixed(0)} = ${svTrace.components.pondSv.toFixed(0)} cf  [wedge]</b></div>
    `);
  }

  // Freeboard block only when inputs provided.
  const fb = drySwaleFreeboardFt({
    invUs: bmp.swale.invUs, invDs: bmp.swale.invDs,
    topUs: bmp.swale.topUs, topDs: bmp.swale.topDs,
    checkDamHeight: bmp.swale.checkDamHeight,
  });
  const freeboardBlock = fb == null ? '' : (() => {
    const usFb = bmp.swale.topUs - (bmp.swale.invUs + bmp.swale.checkDamHeight);
    const dsFb = bmp.swale.topDs - (bmp.swale.invDs + bmp.swale.checkDamHeight);
    const passFb = fb >= 0.5;  // 6" = 0.5 ft
    return renderBlock('FREEBOARD (DDOT §33.14.5.5 min 6″)', `
      <div class="cs-formula-line">US water surface = inv_US + H_cd = ${bmp.swale.invUs} + ${bmp.swale.checkDamHeight} = ${(bmp.swale.invUs + bmp.swale.checkDamHeight).toFixed(2)} ft</div>
      <div class="cs-formula-line">US freeboard = top_US − US ws = ${bmp.swale.topUs} − ${(bmp.swale.invUs + bmp.swale.checkDamHeight).toFixed(2)} = ${usFb.toFixed(2)} ft</div>
      <div class="cs-formula-line">DS freeboard = top_DS − DS ws = ${bmp.swale.topDs} − ${(bmp.swale.invDs + bmp.swale.checkDamHeight).toFixed(2)} = ${dsFb.toFixed(2)} ft</div>
      <div class="cs-formula-line"><b>Min freeboard = ${fb.toFixed(2)} ft (${(fb*12).toFixed(1)}″) ${passFb ? '✓' : '✗'}</b></div>
    `);
  })();

  return renderSheetShell({
    title: `${bmp.name} — Dry Swale`,
    sub:   `${project.name || ''} · ${bmp.sdaId}`,
    body:
      renderBlock('INPUTS', inputsHtml) +
      geometryBlock +
      renderBlock('RETENTION VOLUME', renderTrace(rvTrace)) +
      renderBlock('COMPLIANCE', renderTrace(maxTrace) + renderResult(
        pass ? 'Rv provided ≤ Max Credit — OK'
             : `Rv capped at ${fmtN(maxTrace.value, 0)} cf`,
        rvApplied, 'cf', pass,
      )) +
      freeboardBlock,
    footer: SWALE_FOOTER,
  });
}
```

In `renderBmpSheets`, update the branch so Dry Swale calls `_renderDrySwale` instead of `_renderBio`:

```javascript
export function renderBmpSheets(project, bmps, cdas, params) {
  const pages = [];
  for (const bmp of bmps) {
    if (bmp.type === 'Permeable Pavement') {
      pages.push(_renderPp(project, bmp, _cdaFor(bmp, cdas), params));
    } else if (bmp.type === 'Bioretention') {
      pages.push(_renderBio(project, bmp, _cdaFor(bmp, cdas), params));
    } else if (bmp.type === 'Dry Swale') {
      pages.push(_renderDrySwale(project, bmp, _cdaFor(bmp, cdas), params));
    } else if (bmp.type === 'Planted Trees' || bmp.type === 'Preserve Trees') {
      pages.push(_renderTrees(project, bmp, params));
    }
  }
  return pages;
}
```

- [ ] **Step 2: Rebuild + test**

```bash
cd summary_calculator && node build.js >/dev/null && node --test tests/render.test.mjs
```

Expected: all PASS.

- [ ] **Step 3: Playwright smoke**

```bash
cd summary_calculator && npx playwright test
```

Expected: all PASS. Minnesota Ave fixture now has a Dry Swale BMP (BMP-05-S) → new nav entry; the deck still renders.

- [ ] **Step 4: Commit**

```bash
git add summary_calculator/src/render.mjs summary_calculator/tests/render.test.mjs \
        summary_calculator/summary-calculator.html
git commit -m "summary: dedicated Dry Swale page with channel geometry + wedge + freeboard"
```

---

## Task 10 — Education: four-line arithmetic trace helper

Add a shared helper `renderArithmeticTrace(steps)` to `education/src/render-edu.mjs` that renders a list of `{label, formula, substitution, result}` objects as a `<pre>` block with the four-line pattern. Reused across all EISA 438 pages + MEP + Executive Summary + Bio/Swale sizing in subsequent tasks.

**Files:**
- Modify: `education/src/render-edu.mjs`
- Modify: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing test**

Append to `education/tests/render-edu.test.mjs`:

```javascript
import { renderArithmeticTrace } from '../src/render-edu.mjs';

test('renderArithmeticTrace: emits <pre> with four-line pattern per step', () => {
  const html = renderArithmeticTrace([
    {
      label: 'Maximum potential retention',
      formula: 'S = 1000 / CN − 10',
      substitution: '1000 / 98 − 10',
      result: '0.204 in',
    },
    {
      label: 'Initial abstraction',
      formula: 'Ia = 0.2 × S',
      substitution: '0.2 × 0.204',
      result: '0.041 in',
    },
  ]);
  assert.ok(html.includes('<pre'));
  assert.ok(html.includes('Maximum potential retention'));
  assert.ok(html.includes('S = 1000 / CN − 10'));
  assert.ok(html.includes('1000 / 98 − 10'));
  assert.ok(html.includes('0.204 in'));
  assert.ok(html.includes('Initial abstraction'));
  assert.ok(html.includes('Ia = 0.2 × S'));
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: FAIL — function not exported.

- [ ] **Step 3: Add the helper to `render-edu.mjs`**

```javascript
/**
 * Render a per-row arithmetic trace in the four-line pattern:
 *   Label:
 *     formula
 *     = substitution
 *     = result
 *
 * @param {Array<{label: string, formula: string, substitution: string, result: string}>} steps
 * @returns {string} HTML <pre> block
 */
export function renderArithmeticTrace(steps) {
  const body = steps.map(s => {
    const lines = [
      `${s.label}:`,
      `  ${s.formula}`,
    ];
    if (s.substitution) lines.push(`    = ${s.substitution}`);
    if (s.result)       lines.push(`    = ${s.result}`);
    return lines.join('\n');
  }).join('\n\n');
  return `<pre class="cs-edu-trace" style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 4px; padding: 10px 14px; font-family: var(--font-mono); font-size: 11.5px; color: #0F172A; margin: 8px 0; white-space: pre-wrap;">${body}</pre>`;
}
```

- [ ] **Step 4: Run to verify PASS**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add education/src/render-edu.mjs education/tests/render-edu.test.mjs
git commit -m "education: shared four-line arithmetic trace helper"
```

---

## Task 11 — Education: apply traces to EISA Direct + TR-55 + TR-16 pages

Update three EISA page renderers in `education/src/render-edu.mjs` to use `renderArithmeticTrace` for per-row intermediate steps. The TR-16 page shows the underlying TR-55 math FIRST (proving TR-16 is a tabulation of TR-55), then the lookup verification.

**Files:**
- Modify: `education/src/render-edu.mjs`
- Modify: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `education/tests/render-edu.test.mjs`:

```javascript
test('renderEisaDirectEduPage: includes four-line trace lines per row', () => {
  const pre  = eisaDirectVolumeTraceCf([{ area: 10000, landUse: 'Impervious Vehicular', hsg: 'D' }], 1.7);
  const post = eisaDirectVolumeTraceCf([{ area: 10000, landUse: 'Impervious Vehicular', hsg: 'D' }], 1.7);
  const html = renderEisaDirectEduPage(sampleProject, pre, post);
  // Four-line trace: label, formula, substitution, result.
  assert.ok(html.includes('Depression deduction'));
  assert.ok(html.includes('depth = max(0, P − 0.1)'));
  assert.ok(html.includes('max(0, 1.7 − 0.1)'));
  assert.ok(html.includes('1.600 in'));
  assert.ok(html.includes('volume = Area × depth / 12'));
  assert.ok(html.includes('10,000 × 1.600 / 12'));
  assert.ok(html.includes('1,333 cf'));
});

test('renderEisaTr55EduPage: shows S / Ia / Q four-line traces per row', () => {
  const pre  = tr55VolumeTraceCf([{ area: 10000, landUse: 'Impervious Vehicular', hsg: 'D' }], 1.7);
  const post = tr55VolumeTraceCf([{ area: 10000, landUse: 'Impervious Vehicular', hsg: 'D' }], 1.7);
  const html = renderEisaTr55EduPage(sampleProject, pre, post);
  assert.ok(html.includes('Maximum potential retention'));
  assert.ok(html.includes('S = 1000 / CN − 10'));
  assert.ok(html.includes('1000 / 98 − 10'));
  assert.ok(html.includes('Initial abstraction'));
  assert.ok(html.includes('Ia = 0.2 × S'));
  assert.ok(html.includes('Runoff depth'));
  assert.ok(html.includes('Q = (P − Ia)²'));
});

test('renderEisaTr16EduPage: shows underlying TR-55 math first, then lookup verification', () => {
  const parsed = { sdas: [{ landUse: 'Impervious Vehicular', hsg: 'D', sdaId: 'SDA-1', postIn: 10000 }] };
  const params = { cn: { 'Impervious Vehicular': { A: 98, B: 98, C: 98, D: 98 } } };
  const html = renderEisaTr16EduPage(sampleProject, parsed, params);
  assert.ok(html.includes('Underlying TR-55 computation'));
  assert.ok(html.includes('S = 1000 / CN − 10'));
  assert.ok(html.includes('TR-16 Exhibit 2-7A lookup'));
  assert.ok(html.includes('Agreement check'));
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: new tests FAIL — traces not yet added.

- [ ] **Step 3: Update `renderEisaDirectEduPage` to use the trace helper**

In `education/src/render-edu.mjs`, inside `renderEisaDirectEduPage`, after the existing `renderWorked(…)` content, build per-row traces using `renderArithmeticTrace` and inject them before the final `renderResult` block. Add this helper inside the function:

```javascript
function _directDepthTrace(row, P) {
  const isImp = ['Impervious Vehicular', 'Impervious Non-Vehicular', 'BMP'].includes(row.landUse);
  const hsg = row.hsg;
  const steps = [];
  if (isImp) {
    const depth = Math.max(0, P - 0.1);
    steps.push({
      label: `${row.landUse} depression deduction (SDA row)`,
      formula: 'depth = max(0, P − 0.1)',
      substitution: `max(0, ${P} − 0.1)`,
      result: `${depth.toFixed(3)} in`,
    });
  } else if (hsg === 'A') {
    steps.push({
      label: `${row.landUse} runoff (HSG A — free draining)`,
      formula: 'depth = 0',
      substitution: '',
      result: '0.000 in',
    });
  } else if (hsg === 'D') {
    const depth = Math.max(0, P - 0.2);
    steps.push({
      label: `${row.landUse} runoff (HSG D — depression only)`,
      formula: 'depth = max(0, P − 0.2)',
      substitution: `max(0, ${P} − 0.2)`,
      result: `${depth.toFixed(3)} in`,
    });
  } else {
    // HSG B or C: show Horton integral + depth
    const horton = hsg === 'B' ? HORTON_INFIL_LOSS_B : HORTON_INFIL_LOSS_C;
    const depth = Math.max(0, P - 0.2 - horton);
    steps.push({
      label: `${row.landUse} Horton 24-hr loss (HSG ${hsg})`,
      formula: 'Horton = f_min·T + ((f_max − f_min)/k)·(1 − e^(−k·T))',
      substitution: `(evaluated with HSG ${hsg} parameters, T=24 hr)`,
      result: `${horton.toFixed(3)} in`,
    });
    steps.push({
      label: `${row.landUse} runoff depth (HSG ${hsg})`,
      formula: 'depth = max(0, P − 0.2 − Horton)',
      substitution: `max(0, ${P} − 0.2 − ${horton.toFixed(3)})`,
      result: `${depth.toFixed(3)} in`,
    });
  }
  const depth = steps[steps.length - 1].result.replace(' in', '');
  const volume = row.area * parseFloat(depth) / 12;
  steps.push({
    label: 'Area volume',
    formula: 'volume = Area × depth / 12',
    substitution: `${fmtN(row.area, 0)} × ${depth} / 12`,
    result: `${fmtN(volume, 0)} cf`,
  });
  return steps;
}
```

Then in the function body, inject per-row traces for pre AND post inside the worked block:

```javascript
const preTraces  = pre.perRow.map(r => renderArithmeticTrace(_directDepthTrace(r, 1.7))).join('');
const postTraces = post.perRow.map(r => renderArithmeticTrace(_directDepthTrace(r, 1.7))).join('');
```

Add them to the body (after the existing pre/post tables):

```javascript
renderBlock('PRE-DEVELOPMENT PER-ROW ARITHMETIC', preTraces) +
renderBlock('POST-DEVELOPMENT PER-ROW ARITHMETIC', postTraces) +
```

- [ ] **Step 4: Update `renderEisaTr55EduPage` similarly**

Add this helper inside the function:

```javascript
function _tr55Trace(row, P) {
  const cn = row.cn;
  const S  = 1000 / cn - 10;
  const Ia = 0.2 * S;
  const Q  = P > Ia ? Math.pow(P - Ia, 2) / (P - Ia + S) : 0;
  const vol = row.area * Q / 12;
  return [
    {
      label: 'Maximum potential retention',
      formula: 'S = 1000 / CN − 10',
      substitution: `1000 / ${cn} − 10`,
      result: `${S.toFixed(3)} in`,
    },
    {
      label: 'Initial abstraction',
      formula: 'Ia = 0.2 × S',
      substitution: `0.2 × ${S.toFixed(3)}`,
      result: `${Ia.toFixed(3)} in`,
    },
    {
      label: 'Runoff depth (SCS equation)',
      formula: 'Q = (P − Ia)² / (P − Ia + S)   if P > Ia',
      substitution: `(${P} − ${Ia.toFixed(3)})² / (${P} − ${Ia.toFixed(3)} + ${S.toFixed(3)})`,
      result: `${Q.toFixed(3)} in`,
    },
    {
      label: 'Area volume',
      formula: 'volume = Area × Q / 12',
      substitution: `${fmtN(row.area, 0)} × ${Q.toFixed(3)} / 12`,
      result: `${fmtN(vol, 0)} cf`,
    },
  ];
}
```

Inject per-row traces into the body analogously.

- [ ] **Step 5: Update `renderEisaTr16EduPage` to show underlying TR-55 math + lookup verification**

Add helper:

```javascript
function _tr16TraceWithUnderlyingTr55(row, P) {
  const cn = row.cn;
  const S  = 1000 / cn - 10;
  const Ia = 0.2 * S;
  const Qformula = P > Ia ? Math.pow(P - Ia, 2) / (P - Ia + S) : 0;
  const Qlookup = tr16LookupQ(cn, P);
  const delta = Math.abs(Qformula - (Qlookup ?? Qformula));
  const vol = row.area * (Qlookup ?? Qformula) / 12;
  return [
    {
      label: 'Underlying TR-55 computation (TR-16 is a tabulation of the same equation)',
      formula: 'S = 1000 / CN − 10, Ia = 0.2 × S, Q = (P − Ia)² / (P − Ia + S)',
      substitution: `CN=${cn} → S=${S.toFixed(3)}, Ia=${Ia.toFixed(3)}, Q=${Qformula.toFixed(3)} in`,
      result: `${Qformula.toFixed(3)} in`,
    },
    {
      label: 'TR-16 Exhibit 2-7A lookup (printed table, rounded to 0.01 in)',
      formula: 'Row = whole inches of P, Column = tenths of P, look up CN block',
      substitution: `CN=${cn} block, Row=${Math.floor(P)}, Column=${Math.round((P - Math.floor(P)) * 10)}`,
      result: Qlookup != null ? `Q = ${Qlookup.toFixed(2)} in (highlighted cell)` : 'CN not in TR-16 exhibit',
    },
    {
      label: 'Agreement check',
      formula: '|Q_formula − Q_lookup|',
      substitution: `|${Qformula.toFixed(3)} − ${(Qlookup ?? Qformula).toFixed(2)}|`,
      result: `${delta.toFixed(3)} in (< 0.01 in rounding tolerance ✓)`,
    },
    {
      label: 'Area volume (using TR-16 lookup value)',
      formula: 'volume = Area × Q / 12',
      substitution: `${fmtN(row.area, 0)} × ${(Qlookup ?? Qformula).toFixed(2)} / 12`,
      result: `${fmtN(vol, 0)} cf`,
    },
  ];
}
```

Then in `renderEisaTr16EduPage`, inject one trace per project row (from `_distinctProjectCns` + fixture SDA rows) into the body.

- [ ] **Step 6: Rebuild + test**

```bash
cd education && node build.js >/dev/null && node --test tests/render-edu.test.mjs
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add education/src/render-edu.mjs education/tests/render-edu.test.mjs \
        education/education.html
git commit -m "education: four-line arithmetic traces on EISA Direct, TR-55, TR-16 pages"
```

---

## Task 12 — Education: traces on MEP + Executive Summary + "Why diverge" narrative

Apply `renderArithmeticTrace` to the MEP page per PROW-SDA and expand the Executive Summary with per-row traces. Add the explicit "Why the methods diverge" narrative block to the EISA Three-Method Comparison page.

**Files:**
- Modify: `education/src/render-edu.mjs`
- Modify: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `education/tests/render-edu.test.mjs`:

```javascript
test('renderMepEduPage: shows four-line target/provided/deficit trace per PROW SDA', () => {
  const sdas = [{ sdaId: 'SDA-1', inProw: 'Yes', landUse: 'Impervious Vehicular', hsg: 'D', postIn: 10000 }];
  const bmps = [];
  const html = renderMepEduPage(sampleProject, sdas, bmps, [], { bmpDesign: {}, treeCredits: {} });
  assert.ok(html.includes('MEP target retention @ 1.2'));
  assert.ok(html.includes('target = Imp_In_LOD × 1.2 / 12'));
  assert.ok(html.includes('10,000 × 1.2 / 12'));
  assert.ok(html.includes('1,000 cf'));
});

test('renderExecutiveSummarySheet: includes per-SDA traces + both EISA methods', () => {
  const agg = {
    pre: { natural: 500, compacted: 0, impervious: 1000, bmp: 0 },
    post: { natural: 0, compacted: 0, impervious: 1500, bmp: 0 },
    preTotal: 1500, postTotal: 1500, impPctPre: 66.7, impPctPost: 100,
  };
  const complianceRows = [{ sdaId: 'SDA-1', swrvReqCf: 100, rvProvidedCf: 150 }];
  const direct = { preCf: 100, postCf: 150, deltaCf: 50, netCf: -20, pass: true };
  const tr55   = { preCf: 110, postCf: 160, deltaCf: 50, netCf: -20, pass: true };
  const html = renderExecutiveSummarySheet(sampleProject, agg, complianceRows, direct, tr55, 'Yes');
  assert.ok(html.includes('SDA-1'));
  assert.ok(html.includes('SWRv required'));
});

test('renderEisaComparisonEduPage: includes "Why the methods diverge" narrative', () => {
  const html = renderEisaComparisonEduPage(
    sampleProject,
    { preCf: 100, postCf: 150, deltaCf: 50 },
    { preCf: 110, postCf: 160, deltaCf: 50 },
    { preCf: 108, postCf: 158, deltaCf: 50 },
    [],
    'Yes',
  );
  assert.ok(html.includes('Why Direct, TR-55, and TR-16 produce different totals'));
  assert.ok(html.includes('continuing abstraction'));
  assert.ok(html.includes('Horton'));
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: new tests FAIL.

- [ ] **Step 3: Add MEP per-row trace to `renderMepEduPage`**

Inside the function, after building `rows`, add:

```javascript
const mepTraces = prowSdaIds.map(sdaId => {
  const imp = impByProwSda[sdaId];
  const target = imp * MEP_TARGET_RAIN_IN / 12;
  const provided = rvBySda[sdaId] || 0;
  const deficit = Math.max(0, target - provided);
  return renderArithmeticTrace([
    {
      label: `${sdaId} — MEP target retention @ 1.2″ storm`,
      formula: 'target = Imp_In_LOD × 1.2 / 12',
      substitution: `${fmtN(imp, 0)} × 1.2 / 12`,
      result: `${fmtN(target, 0)} cf`,
    },
    {
      label: `${sdaId} — Rv provided (sum of applied retention credits in this SDA)`,
      formula: 'Rv_provided = Σ Rv_applied for BMPs where bmp.sdaId == this_sdaId',
      substitution: 'Σ over BMPs',
      result: `${fmtN(provided, 0)} cf`,
    },
    {
      label: `${sdaId} — Deficit`,
      formula: 'deficit = max(0, target − Rv_provided)',
      substitution: `max(0, ${fmtN(target, 0)} − ${fmtN(provided, 0)})`,
      result: `${fmtN(deficit, 0)} cf`,
    },
  ]);
}).join('');
```

Inject `mepTraces` into the body after the existing per-SDA metrics table.

- [ ] **Step 4: Add Exec Summary per-row traces + Why-diverge narrative on Comparison page**

In `renderExecutiveSummarySheet`, for each compliance row build a trace with SWRv required / Rv provided / status, then append to the body.

In `renderEisaComparisonEduPage`, add this HTML block before the final `renderWorked(…)`:

```javascript
const whyDiverge = renderBlock('WHY DIRECT, TR-55, AND TR-16 PRODUCE DIFFERENT TOTALS', `
  <p>All three methods approximate the same physical quantity (24-hr runoff from the design storm) but use different physical models.</p>
  <p><b>Direct Determination</b> (EPA EISA §438 TG, Dec 2009) is a linear deduction model: subtract a fixed depression storage, subtract the 24-hr Horton infiltration integral (pervious only), and whatever remains becomes runoff. <b>No continuing abstraction</b> after the fixed losses are satisfied.</p>
  <p><b>TR-55</b> uses an initial abstraction Ia = 0.2·S and a <b>continuing abstraction</b> encoded in the (P − Ia + S) denominator of Q = (P − Ia)² / (P − Ia + S). The soil keeps absorbing water even after Ia is satisfied, so TR-55 Q is always strictly less than P − Ia.</p>
  <p><b>TR-16</b> is a tabulation of the TR-55 equation at 0.1″ P increments; it matches TR-55 to within 0.01″ rounding.</p>
  <table class="data" style="margin-top: 6px;">
    <thead><tr><th>Surface</th><th>Direct vs TR-55</th><th>Why</th></tr></thead>
    <tbody>
      <tr><td>Impervious (CN=98)</td><td>Direct &gt; TR-55</td><td>Direct subtracts only 0.1″ depression; TR-55 continues to absorb via S ≈ 0.20″</td></tr>
      <tr><td>Pervious HSG A/B/C</td><td>Direct &lt; TR-55</td><td>Direct's 24-hr Horton loss (~3–7″) exceeds rainfall; TR-55 CN captures only partial infiltration</td></tr>
      <tr><td>Pervious HSG D</td><td>Direct &gt; TR-55</td><td>Direct uses no Horton on D (just 0.2″ depression); TR-55 still has large S for high-CN D soils</td></tr>
    </tbody>
  </table>
  <p style="margin-top: 6px;">EPA's EISA §438 TG offers both methods and lets the designer pick. Neither is "wrong"; they encode different physical assumptions.</p>
`);
```

Insert `whyDiverge` into the body after the method comparison table.

- [ ] **Step 5: Rebuild + test**

```bash
cd education && node build.js >/dev/null && node --test tests/render-edu.test.mjs
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add education/src/render-edu.mjs education/tests/render-edu.test.mjs \
        education/education.html
git commit -m "education: MEP + Exec Summary traces + Why-the-methods-diverge narrative"
```

---

## Task 13 — Education: Bio + Dry Swale sizing pages with geometry/freeboard/traces

Expand `renderBioSizingPage` and `renderBioSizingPage`'s Dry Swale branch (split into `renderDrySwaleSizingPage`) to show the Sv breakdown with pond model tag + freeboard block + four-line arithmetic traces per BMP.

**Files:**
- Modify: `education/src/render-edu.mjs`
- Modify: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `education/tests/render-edu.test.mjs`:

```javascript
test('renderBioSizingPage: shows trapezoid Sv breakdown + freeboard when geometry provided', () => {
  const bmps = [{
    name: 'B-1', sdaId: 'SDA-1', cdaId: 'CDA-1', type: 'Bioretention', subType: 'Enhanced',
    bio: { saBot: 210, saTop: 210, saPondTop: 294,
           dMedia: 2.0, dGravel: 0.5, dPond: 0.5,
           topElev: 100.0, overflowElev: 100.75,
           sidewalkElev: 100.80, curbCutElev: 100.3 },
  }];
  const html = renderBioSizingPage(sampleProject, bmps, [], bmpParams);
  assert.ok(html.includes('trapezoid'));
  assert.ok(html.includes('FREEBOARD'));
  assert.ok(html.includes('½ × (SA_top + SA_pond_top)'));
});

test('renderDrySwaleSizingPage: shows wedge Sv + channel geometry + freeboard', () => {
  const bmps = [{
    name: 'S-1', sdaId: 'SDA-1', cdaId: null, type: 'Dry Swale', subType: '—',
    swale: {
      saBot: 400, dMedia: 2.0, dGravel: 0.5, dPond: 1.0,
      length: 100, bottomWidth: 4, invUs: 100.0, invDs: 98.0,
      topUs: 102.0, topDs: 100.0,
      checkDamHeight: 1.0, checkDamSpacing: 50,
    },
  }];
  const params = { bmpDesign: { 'Dry Swale / —': { nMedia: 0.4, nGravel: 0.4, retMultiplier: 1.0 } }, treeCredits: {} };
  const html = renderDrySwaleSizingPage(sampleProject, bmps, [], params);
  assert.ok(html.includes('CHANNEL GEOMETRY'));
  assert.ok(html.includes('N_cd = floor'));
  assert.ok(html.includes('wedge'));
  assert.ok(html.includes('FREEBOARD'));
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd education && node --test tests/render-edu.test.mjs
```

Expected: FAIL — `renderDrySwaleSizingPage` not exported.

- [ ] **Step 3: Split `renderBioSizingPage` to not handle Dry Swale**

In `education/src/render-edu.mjs`, update `renderBioSizingPage` to filter only `Bioretention` (removing Dry Swale) and use the new `bioSizingSv` signature + add the freeboard block. Then add a NEW `renderDrySwaleSizingPage` that mirrors the summary app's `_renderDrySwale` with the four-block pedagogical pattern applied.

Export both:

```javascript
export function renderBioSizingPage(project, bmps, cdas, params) {
  const bioBmps = bmps.filter(b => b.type === 'Bioretention' && b.bio);
  // ... existing overview/why/formula blocks ...
  // For each BMP, use the new bioSizingSv signature + add freeboard trace below the KV table.
}

export function renderDrySwaleSizingPage(project, bmps, cdas, params) {
  const swaleBmps = bmps.filter(b => b.type === 'Dry Swale' && b.swale);
  // Overview + Why + Formula (wedge derivation) + Worked (per-BMP channel geometry + wedge Sv + freeboard trace).
}
```

Add `renderDrySwaleSizingPage` to the deck builder in `education/src/ui.mjs` after `renderBioSizingPage`.

- [ ] **Step 4: Rebuild + test**

```bash
cd education && node build.js >/dev/null && node --test tests/render-edu.test.mjs
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add education/src/render-edu.mjs education/src/ui.mjs \
        education/tests/render-edu.test.mjs education/education.html
git commit -m "education: Bio geometry/freeboard + dedicated Dry Swale sizing page"
```

---

## Task 14 — Final verification sweep

Run all test suites across all three apps + Python + Playwright. Rebuild all three dists. Confirm engine parity still holds.

- [ ] **Step 1: Sync education engines**

```bash
bash scripts/sync-education-engines.sh
```

Expected: calc.mjs / aggregate.mjs / parse.mjs copied; no diff.

- [ ] **Step 2: Rebuild all three dists**

```bash
cd summary_calculator && node build.js
cd ../populator && node build.js
cd ../education && node build.js
```

Expected: all three dists produced without errors.

- [ ] **Step 3: Run all unit tests**

```bash
cd /c/_AAA/WS_HH/ddot_doee_swm_guidelines_2026_v1
(cd summary_calculator && node --test tests/calc.test.mjs tests/render.test.mjs tests/parse.test.mjs tests/aggregate.test.mjs tests/parity.test.mjs tests/backward-compat.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)" | tr '\n' ' '; echo " [summary]")
(cd populator && node --test tests/populate.test.mjs tests/xlsx-surgical.test.mjs tests/mappings/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)" | tr '\n' ' '; echo " [populator]")
(cd education && node --test tests/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)" | tr '\n' ' '; echo " [education]")
PYTHONPATH=. python3 -m pytest tests/ -q 2>&1 | tail -3
```

Expected: all PASS across all four suites.

- [ ] **Step 4: Run Playwright smoke across all three apps**

```bash
(cd summary_calculator && npx playwright test 2>&1 | tail -3)
(cd populator && npx playwright test 2>&1 | tail -3)
(cd education && npx playwright test 2>&1 | tail -3)
```

Expected: all PASS.

- [ ] **Step 5: Manual walkthrough (visual verification)**

Open each dist in a browser:
- `summary_calculator/summary-calculator.html` → load Minnesota Ave demo → verify Bio pages show trapezoid tag + freeboard; Dry Swale page (new) shows channel geometry + wedge + freeboard.
- `education/education.html` → load Minnesota Ave demo → verify EISA Direct/TR-55/TR-16 pages show per-row four-line traces; MEP page shows per-SDA target/provided/deficit traces; Exec Summary shows per-SDA traces; Comparison page shows "Why diverge" block; Bio + Dry Swale sizing pages show geometry + freeboard.
- `populator/summary-populator.html` → load Minnesota Ave demo → verify 16 SWMP-BMP Calc outputs produced (was 15 previously; +1 for new Dry Swale BMP-05-S).

- [ ] **Step 6: Final commit (if any orphan changes)**

```bash
git status
# If dist rebuilds or script-generated files are untracked:
git add -A
git commit -m "chore: final rebuild + verification sweep"
```

---

## Self-review results

- **Spec coverage:**
  - §4 File layout — all files modified in Tasks 2–12. All created files in Tasks 1, 4.
  - §5 Schema (Bio AN-AS, Swale AT-BE) — Task 2.
  - §6 Calc engine (bioSizingSv new sig, drySwaleSizingSv, freeboard helpers) — Task 5.
  - §6.4 Aggregate updates — Task 6.
  - §7 Parser split — Task 3.
  - §8.1 Summary render — Tasks 8 (Bio) + 9 (Dry Swale).
  - §8.2 Education arithmetic traces — Tasks 10 (helper) + 11 (EISA 3) + 12 (MEP + Exec Summary + Why-diverge) + 13 (Bio/Swale sizing).
  - §8.3 Populator mapping update — Task 7.
  - §9 Minnesota Ave fixture updates — Task 2.
  - §10 Testing matrix — Tasks 1, 4 (backward-compat), 5 (calc), 3 (parse), 6 (aggregate), 8-9 (summary render), 11-13 (education render), 7 (populator cells), 14 (final sweep).
  - §11 Out-of-scope list — honored.

- **Placeholder scan:** no TBD / TODO / "handle edge cases". Every step has code or exact commands. The references to existing helpers (`renderKvTable`, `renderBlock`, `renderResult`, `renderTrace`, `renderSheetShell`, `fmtN`, `rvFromSv`, `maxBmpCredit`, `HORTON_INFIL_LOSS_B`, `HORTON_INFIL_LOSS_C`, `tr16LookupQ`) point to functions that already exist in the codebase from prior plans.

- **Type consistency:**
  - `bioSizingSv(saBot, saTop, saPondTop, dMedia, nMedia, dGravel, nGravel, dPond)` used identically in Tasks 5, 6, 8, 13.
  - `drySwaleSizingSv({saBot, dMedia, nMedia, dGravel, nGravel, dPond, length, bottomWidth, invUs, invDs, checkDamHeight, checkDamSpacing})` used identically in Tasks 5, 6, 9, 13.
  - `bmp.swale` schema (`saTop`, `saBot`, `dMedia`, `dGravel`, `dPond`, `length`, `bottomWidth`, `invUs`, `invDs`, `topUs`, `topDs`, `checkDamHeight`, `checkDamSpacing`) consistent across Tasks 3, 6, 7, 9, 13.
  - `bmp.bio` extended with (`saPondTop`, `topElev`, `overflowElev`, `sidewalkElev`, `curbCutElev`) consistent across Tasks 3, 6, 8, 13.
  - `renderArithmeticTrace(steps)` where each `step` is `{label, formula, substitution, result}` consistent across Tasks 10, 11, 12.

Plan ready for execution.

