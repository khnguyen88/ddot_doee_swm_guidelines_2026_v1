# BMP Geometry Schema + Freeboard — Design Spec

**Date:** 2026-10-30
**Project:** `ddot_doee_swm_guidelines_2026_v1`
**Status:** Design approved, ready for implementation plan
**Related specs:**
- `2026-10-28-swm-summary-calculator-design.md` (Webpage A — summary)
- `2026-10-29-swm-populator-design.md` (Webpage B — populator)
- `2026-10-29-education-app-design.md` (Webpage C — education)

Add 3D geometry and site-elevation fields to the Bioretention and Dry Swale BMP rows in the user's own template XLSX. Compute pond storage using the actual geometry (trapezoidal frustum for sloped-side Bio basins; longitudinal wedge model per check dam for Dry Swales). Report freeboard against DDOT §33.14.5.5 minimums. The official DOEE/DDOT/EISA government spreadsheets are NOT modified — populator mappings continue to write only the DOEE-expected cells; the new fields exist solely on the user template and are consumed by the summary + education apps.

The spec also includes a bundled pedagogical improvement flagged earlier: adding per-row arithmetic substitution traces to the EISA Direct, EISA TR-55, EISA TR-16 Lookup, and MEP pages in the education app so a learner can watch each number get derived instead of just seeing final values.

---

## 1. Goal

1. **Replace** `calc.mjs bioSizingSv(saBot, dMedia, nMedia, dGravel, nGravel, dPond)` with a geometry-aware function that uses a trapezoid-frustum pond term when `SA_pond_top` is provided.
2. **Add** `calc.mjs drySwaleSizingSv(…)` that computes pond storage as `N × wedge-volume-per-dam` when channel geometry + check-dam fields are provided; falls back to the current flat-pond formula when they're not.
3. **Add** freeboard helpers that compare top-of-containment elevations (overflow / sidewalk / curb cut for Bio; US/DS top-of-bank for Swale) against the design water surface and flag violations of DDOT §33.14.5.5 (3″ bio, 6″ swale).
4. **Extend** the user template's BMP sheet with new columns for the geometry + elevation fields. Official DOEE/DDOT/EISA government spreadsheets are **not** modified.
5. **Surface** the new fields in the summary + education app renderers. Fields are optional — rendering gracefully omits sections when inputs are missing.
6. **Bundle** per-row arithmetic substitution traces onto the education app's EISA 438 (Direct, TR-55, TR-16) and MEP pages.

**Non-goals (v1):**
- No stage-storage curve for detention-storm freeboard surcharge (just design-pond freeboard).
- No per-dam variable height / variable spacing on Dry Swales (uniform H_cd + X_cd only).
- No modification of DOEE SWMP-BMP Calc, DDOT MEP Worksheet, SWDB-PROW, General Retention, or Rainwater Harvesting spreadsheet cells written by the populator.
- No new regional 95th-percentile data or non-DC EISA extensions.

## 2. Standards & naming conventions

Field names and symbols come from the DOEE Guidebook (Jan 2020) and DDOT GI Standards 2014 where possible. The compliance-sanctioned sizing formula per DOEE §3.6 is `Sv = SA_avg × (d_media × n_media + d_gravel × n_gravel + d_pond)` with `SA_avg = (SA_top + SA_bot)/2`. Our existing code uses `SA_bot × …` (equivalent only when SA_top ≈ SA_bot).

The geometric refinement in this spec splits the vertical column into (a) a rectangular trench for the media + gravel subsurface and (b) a trapezoidal frustum for the pond above grade. Physically this matches typical construction: media and gravel sit in an excavated rectangular trench (nearly vertical walls below grade), while pond water above grade spreads laterally per the side slopes of the surrounding landscape. The engineering refinement reports more accurate volumes without altering the raw inputs written to the official DOEE spreadsheet.

**DDOT §33.14.5.5 freeboard minimums:**
- Online bioretention: **3″ min** from overflow structure rim to top of adjacent containment (sidewalk / curb).
- Dry swale: **6″ min** from design water surface (invert + H_cd) to top of bank, measured at each check dam and both US/DS ends.

**DDOT Table 3-32 check-dam spacing** targets ≤ 2% effective longitudinal slope. We display the longitudinal slope `S = (inv_US − inv_DS)/L_s` and the derived dam count so a reviewer can validate design intent against Table 3-32.

## 3. Scope boundary — "never deviate from DOEE / DDOT / EISA 438"

The populator (`populator/src/mappings/*.mjs`) continues to write ONLY the DOEE-defined cells of each official spreadsheet. The DOEE spreadsheet's own formulas then recompute Sv using DOEE's SA_avg convention. The populator never emits any of the new geometry or elevation fields to any official spreadsheet because those spreadsheets have no cells for them.

The summary + education apps display a **geometric-refinement Sv** that may differ from the DOEE-sheet-computed Sv when `SA_top ≠ SA_bot` or when `SA_pond_top > SA_top` or when Dry Swale channel geometry is provided. The apps make this distinction explicit in educational narrative: "DOEE §3.6 uses a single-column SA_avg approximation. The geometry-refined Sv shown here uses the actual rectangular subsurface + trapezoidal/wedge pond. For regulatory submittal, the DOEE spreadsheet's Sv (computed from the raw inputs via DOEE's formula) is the authoritative compliance number."

Freeboard reporting is a DDOT §33.14.5.5 standard (not an Sv modification) — no deviation.

## 4. File layout — files touched

### Modified
- `workbook/builders/bmp.py` — new columns for geometry + elevations on the user template's BMP sheet.
- `workbook/sample.py` — Minnesota Ave fixture gets realistic values for the new fields; one new Dry Swale BMP added to exercise the wedge path.
- `summary_calculator/src/calc.mjs` — new `bioSizingSv` signature (adds `saTop`, `saPondTop`); new `drySwaleSizingSv` function; new `bioFreeboardFt` + `drySwaleFreeboardFt` helpers.
- `summary_calculator/src/aggregate.mjs` — `_rvForBmp` branches on `bmp.swale` vs `bmp.bio`; passes full geometry object.
- `summary_calculator/src/parse.mjs` — Dry Swale rows populate `bmp.swale` (not `bmp.bio`); both Bio and Swale parse the new optional cells as `null` when blank.
- `summary_calculator/src/render.mjs` — Bio and Dry Swale BMP page renderers show new Sv breakdown + freeboard block when inputs are provided.
- `summary_calculator/src/ui.mjs` — deck builder's inline `_rvForBmp`-equivalent code updated to the new BMP shape.
- `education/src/render-edu.mjs` — Bio sizing page + Dry Swale sizing page get the four-block treatment + new worked-arithmetic traces; EISA Direct / TR-55 / TR-16 / MEP pages get per-row arithmetic traces.
- `education/src/ui.mjs` — same aggregation update as summary.
- `populator/src/mappings/swmp-bmp-calc.mjs` — Dry Swale branch reads `bmp.swale.*` instead of `bmp.bio.*`; cells written are UNCHANGED.
- `scripts/sync-education-engines.sh` + `scripts/dump_reference.py` — re-run after changes to re-baseline reference JSON.

### Created
- `summary_calculator/tests/fixtures/minnesota-ave-pre-geometry.xlsx` — frozen copy of the pre-change fixture, used for the backward-compat regression test.
- `summary_calculator/tests/backward-compat.test.mjs` — asserts the parser gracefully handles the frozen pre-change fixture and produces the pre-change SWRv values.

### NOT touched (per standards-preservation directive)
- `populator/blanks/*.xlsx` and `populator/blanks/swmp-bmp-calc.xlsm` — DOEE/DDOT official spreadsheets.
- The populator's output cell targets for the SWMP-BMP Calc, DDOT MEP, SWDB-PROW, General Retention, and RWH mappings.

## 5. Schema — new columns on the user template BMP sheet

Current BMP sheet (built by `workbook/builders/bmp.py`) ends at column AM (Rv Applied). All new columns append to the right of AM.

### Bio zone extension (columns AN–AS)

| Col | Header | Symbol | Unit | Required? | Source |
|---|---|---|---|---|---|
| AN | Bio SA_pond_top (SF) | `SA_pond_top` | sf | optional | Water-surface area at design ponding elevation. For vertical-wall structural bio, equals `SA_top`. For sloped-side graded bio, enter the larger surface at the top of the pond. |
| AO | Bio top-of-footprint elev | `top_elev` | ft | optional | Finished grade of BMP media surface, site datum. |
| AP | Bio overflow rim elev | `overflow_elev` | ft | optional | Rim elevation of the overflow structure (DDOT §33.14.5.5). |
| AQ | Bio adjacent sidewalk elev | `sidewalk_elev` | ft | optional | DDOT §33.14.5.6 containment check. |
| AR | Bio adjacent curb-cut elev | `curb_cut_elev` | ft | optional | DDOT §33.14.5.6 containment check. |
| AS | Bio freeboard (ft) [calc] | — | ft | — | `= min(overflow, sidewalk, curb_cut) − (top_elev + d_pond)` when inputs present. |

### Dry Swale zone extension (columns AT–BE)

| Col | Header | Symbol | Unit | Required? | Source |
|---|---|---|---|---|---|
| AT | Swale length | `L_s` | ft | optional | §3.9 geometry |
| AU | Swale bottom width | `w_s` | ft | optional | §3.9 geometry (DDOT §33.14.5 — 4–8 ft typical) |
| AV | Upstream invert elev | `inv_US` | ft | optional | Site datum |
| AW | Downstream invert elev | `inv_DS` | ft | optional | Site datum |
| AX | US top-of-bank elev | `top_US` | ft | optional | DDOT §33.14.5.5 freeboard reference |
| AY | DS top-of-bank elev | `top_DS` | ft | optional | DDOT §33.14.5.5 freeboard reference |
| AZ | Check dam height | `H_cd` | ft | optional | DDOT 12″ typical / 18″ max |
| BA | Check dam spacing | `X_cd` | ft | optional | DDOT Table 3-32 |
| BB | Longitudinal slope [calc] | `S` | ft/ft | — | `= (inv_US − inv_DS) / L_s` when inputs present |
| BC | Derived dam count [calc] | `N_cd` | — | — | `= FLOOR(L_s / X_cd)` when inputs present |
| BD | Wedge Sv per dam [calc] | — | cf | — | `= ½ × MIN(X_cd, H_cd/S) × H_cd × w_s` when inputs present |
| BE | Total pond Sv [calc] | — | cf | — | `= N_cd × BD` when inputs present; else `SA_bot × d_pond` fallback |

Zone divider borders in `_apply_zone_dividers` extend to cover the new column ranges. Column widths default to 12.

## 6. Calc engine — new / changed functions

### 6.1 `bioSizingSv` — new signature

```javascript
export function bioSizingSv(saBot, saTop, saPondTop, dMedia, nMedia, dGravel, nGravel, dPond) {
  const mediaGravelSv = saBot * (dMedia * nMedia + dGravel * nGravel);
  const pondSv = (saPondTop != null && saPondTop > 0)
    ? 0.5 * (saTop + saPondTop) * dPond
    : saBot * dPond;
  return {
    value: mediaGravelSv + pondSv,
    units: 'cf',
    components: { mediaGravelSv, pondSv },
    pondModel: (saPondTop != null && saPondTop > 0) ? 'trapezoid' : 'vertical',
    steps: /* substitution trace per layer */,
  };
}
```

Callers that previously invoked `bioSizingSv(saBot, dMedia, nMedia, dGravel, nGravel, dPond)` must be updated to pass `saTop` and `saPondTop` (both can be `null`). Backward-compat: when both are `null`, pond term degrades to the current `saBot × dPond` expression — identical Sv to prior behavior.

### 6.2 `drySwaleSizingSv` — new

```javascript
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
  }
  return {
    value: mediaGravelSv + pondSv,
    units: 'cf',
    components: { mediaGravelSv, pondSv },
    pondModel,
    pondTrace,
    steps: /* substitution trace */,
  };
}
```

### 6.3 Freeboard helpers

```javascript
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

### 6.4 `aggregate._rvForBmp` branch updates

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

The existing Permeable Pavement, Planted Trees, and Preserve Trees branches are unchanged.

## 7. Parser — `parse.mjs`

Bio and Dry Swale rows parse into separate sub-objects. New optional fields read as `null` when the cell is blank (NOT `0`, which would conflate "not provided" with "legitimately zero").

```javascript
if (type === 'Bioretention') {
  row.bio = {
    saTop:        cell(sheet, r, 14) || 0,
    saBot:        cell(sheet, r, 15) || 0,
    dMedia:       cell(sheet, r, 17) || 0,
    dGravel:      cell(sheet, r, 19) || 0,
    dPond:        cell(sheet, r, 21) || 0,
    saPondTop:    cell(sheet, r, 40),  // AN  (null if blank)
    topElev:      cell(sheet, r, 41),  // AO
    overflowElev: cell(sheet, r, 42),  // AP
    sidewalkElev: cell(sheet, r, 43),  // AQ
    curbCutElev:  cell(sheet, r, 44),  // AR
  };
} else if (type === 'Dry Swale') {
  row.swale = {
    saTop:           cell(sheet, r, 14) || 0,
    saBot:           cell(sheet, r, 15) || 0,
    dMedia:          cell(sheet, r, 17) || 0,
    dGravel:         cell(sheet, r, 19) || 0,
    dPond:           cell(sheet, r, 21) || 0,
    length:          cell(sheet, r, 46),  // AT
    bottomWidth:     cell(sheet, r, 47),  // AU
    invUs:           cell(sheet, r, 48),  // AV
    invDs:           cell(sheet, r, 49),  // AW
    topUs:           cell(sheet, r, 50),  // AX
    topDs:           cell(sheet, r, 51),  // AY
    checkDamHeight:  cell(sheet, r, 52),  // AZ
    checkDamSpacing: cell(sheet, r, 53),  // BA
  };
}
```

**Breaking change:** `parsed.bmps[i].bio` is no longer populated for `Dry Swale` BMPs. Downstream code that currently does `if ((bmp.type === 'Bioretention' || bmp.type === 'Dry Swale') && bmp.bio)` must split: Bio continues using `.bio`, Dry Swale moves to `.swale`.

Touched sites: `summary_calculator/src/aggregate.mjs` `_rvForBmp`, `summary_calculator/src/ui.mjs` deck builder's inline aggregate, `summary_calculator/src/render.mjs` BMP page renderers, `education/src/render-edu.mjs` BMP sizing page, `populator/src/mappings/swmp-bmp-calc.mjs` Dry Swale branch (reads from `bmp.swale.*` but writes the SAME DOEE cells).

## 8. Render — summary + education apps

### 8.1 Summary app — per-BMP sizing pages

**Bioretention page** gains a new Sv breakdown block when `SA_pond_top` is provided:

```
STORAGE VOLUME COMPONENTS
  media_Sv  = SA_bot × d_media × n_media            = 210 × 2.0 × 0.40  = 168 cf
  gravel_Sv = SA_bot × d_gravel × n_gravel          = 210 × 0.5 × 0.40  =  42 cf
  pond_Sv   = ½ × (SA_top + SA_pond_top) × d_pond   = ½ × (210 + 294) × 0.5 = 126 cf  [trapezoid]
  Sv_total  = 336 cf
```

When `SA_pond_top` is absent, pond_Sv line reads `pond_Sv = SA_bot × d_pond = 210 × 0.5 = 105 cf  [vertical-wall]`.

**New FREEBOARD block** when any of `top_elev / overflow_elev / sidewalk_elev / curb_cut_elev` is provided:

```
FREEBOARD CHECK (DDOT §33.14.5.5 min 3″)
  top_elev + d_pond (design water surface) = 100.00 + 0.50 = 100.50 ft
  Min containment = min(overflow 100.75, sidewalk 100.80) = 100.75 ft
  Freeboard = 100.75 − 100.50 = 0.25 ft (3.0″)   ✓ meets DDOT 3″ min
```

**Dry Swale page** gains a new geometry input block + wedge Sv trace:

```
CHANNEL GEOMETRY
  L_s = 100 ft    w_s = 4 ft
  inv_US = 100.00 ft    inv_DS = 98.00 ft
  Slope S = (100 − 98) / 100 = 0.020 ft/ft
  Check dam H_cd = 1.0 ft    Spacing X_cd = 50 ft
  N_cd = floor(100 / 50) = 2 dams

POND STORAGE PER CHECK DAM (3D WEDGE)
  Full wedge upstream length = H_cd / S = 1.0 / 0.020 = 50.0 ft
  Effective base = min(X_cd, H_cd/S) = min(50, 50.0) = 50.0 ft
  Wedge Sv per dam = ½ × 50.0 × 1.0 × 4 = 100 cf
  Total pond Sv = N_cd × wedge Sv = 2 × 100 = 200 cf  [wedge]
```

Followed by a Dry Swale FREEBOARD block (DDOT 6″ min).

### 8.2 Education app — four-block pattern

The Bio sizing page and Dry Swale sizing page in `render-edu.mjs` extend their *Overview* / *Why it matters* text to explain:
- Why the trapezoid pond model matters for traditional graded basins (not for structural planters).
- Why check-dam wedges correctly model longitudinal channel ponding.
- Why DOEE's SA_avg formula is a simplification and when geometric refinement differs from the DOEE-sheet-computed Sv — with explicit guidance that for regulatory submittal, the DOEE spreadsheet's Sv is the authoritative compliance number.

The *Formula & Derivation* block shows both the DOEE sanctioned formula and the geometric-refinement formula side by side.

The *Worked Application* block substitutes real project numbers at every arithmetic step. For each EISA 438 page and the MEP page, every per-row trace must show **(a) the equation name, (b) the symbolic formula, (c) the substitution with concrete numeric values, and (d) the arithmetic result**. "Just the final answer" is explicitly rejected. The same four-line pattern applies to every intermediate quantity (depression, Horton loss, S, Ia, Q, etc.), not only the final volume.

**Example — `renderEisaDirectEduPage` row trace (SDA-1 Impervious Vehicular, A=10,000 sf, HSG D):**

```
Depression deduction (impervious):
  depth = max(0, P − 0.1)
        = max(0, 1.7 − 0.1)
        = max(0, 1.600)
        = 1.600 in

Area volume:
  volume = Area × depth / 12
         = 10,000 × 1.600 / 12
         = 16,000 / 12
         = 1,333 cf
```

**Example — same page, SDA-1 Natural (Woods), A=5,000 sf, HSG C:**

```
Horton 24-hr infiltration loss (HSG C):
  Horton_C = f_min × T + ((f_max − f_min) / k) × (1 − e^(−k·T))
           = 0.1 × 24 + ((3.0 − 0.1) / 3.5) × (1 − e^(−3.5 × 24))
           = 2.4 + 0.829 × (1 − 0)
           = 2.4 + 0.829
           = 3.229 in

Pervious HSG C runoff:
  depth = max(0, P − 0.2 − Horton_C)
        = max(0, 1.7 − 0.2 − 3.229)
        = max(0, −1.729)
        = 0.000 in

Area volume:
  volume = 5,000 × 0.000 / 12
         = 0 cf
```

**Example — `renderEisaTr55EduPage` row trace (SDA-1 Impervious Vehicular, CN=98):**

```
Maximum potential retention:
  S = 1000 / CN − 10
    = 1000 / 98 − 10
    = 10.204 − 10
    = 0.204 in

Initial abstraction:
  Ia = 0.2 × S
     = 0.2 × 0.204
     = 0.041 in

Runoff depth (SCS equation):
  Q = (P − Ia)² / (P − Ia + S)             if P > Ia
    = (1.7 − 0.041)² / (1.7 − 0.041 + 0.204)
    = (1.659)² / 1.863
    = 2.752 / 1.863
    = 1.477 in

Area volume:
  volume = 10,000 × 1.477 / 12
         = 1,231 cf
```

**Example — `renderEisaTr16EduPage` row trace (SDA-1 Impervious Vehicular, CN=98):**

Shows the **underlying TR-55 math first** (since TR-16 Exhibit 2-7A is a tabulation of the same equation), then verifies against the lookup. This proves to the learner that TR-16 is not a magic lookup but a pre-computed tabulation of the TR-55 formula.

```
Underlying TR-55 computation (TR-16 is a tabulation of the same equation):
  S  = 1000 / CN − 10 = 1000 / 98 − 10 = 0.204 in
  Ia = 0.2 × S         = 0.2 × 0.204    = 0.041 in
  Q  = (P − Ia)² / (P − Ia + S)
     = (1.7 − 0.041)² / (1.7 − 0.041 + 0.204)
     = (1.659)² / 1.863
     = 2.752 / 1.863
     = 1.477 in

TR-16 Exhibit 2-7A lookup (printed table, rounded to 0.01 in):
  Locate CN=98 block.
  Row = whole inches of P = 1.
  Column = tenths of P = 7.
  Table cell at (row 1, col 7) in CN=98 block → Q = 1.48 in  (highlighted)

Agreement check:
  TR-55 formula Q  = 1.477 in
  TR-16 lookup Q   = 1.480 in
  |Δ| = 0.003 in   (< 0.01 in rounding tolerance — tables agree with formula)

Area volume (using TR-16 lookup value):
  volume = 10,000 × 1.48 / 12
         = 14,800 / 12
         = 1,233 cf
```

**Example — `renderMepEduPage` row trace (SDA-1, Impervious In LOD = 10,000 sf, PROW):**

```
MEP target retention @ 1.2″ storm:
  target = Imp_In_LOD × 1.2 / 12
         = 10,000 × 1.2 / 12
         = 12,000 / 12
         = 1,000 cf

Rv provided (sum of applied retention credits from BMPs in this SDA):
  Rv_provided = Σ Rv_applied for all BMPs where bmp.sdaId == SDA-1
              = 750 cf   (BMP-01-A alone)

Deficit:
  deficit = max(0, target − Rv_provided)
          = max(0, 1,000 − 750)
          = 250 cf

Status: DEFICIT — document in SWMP narrative (DDOT GI Standards 2014, DOEE Guidebook Appendix B)
```

**Rendering mechanism.** Each row trace is produced by a shared helper in `render-edu.mjs` that takes the row inputs + chosen method and returns an HTML `<pre>` block with the four-line pattern applied to every intermediate step. The helper is reused across EISA Direct, EISA TR-55, EISA TR-16, MEP, **and the Executive Summary** so the look is consistent. Narrative text above the per-row traces still explains the physical meaning (depression storage, Horton infiltration, SCS runoff equation origin, etc.); the per-row trace is the mechanical substitution.

**Executive Summary four-line traces.** Previously the Exec Summary page only showed totals. It is now expanded to include per-row arithmetic traces for every quantity on the page: SWRv required per SDA, EISA Direct Δ, EISA TR-55 Δ, EISA TR-16 Δ, net-after-BMP for each method, and the elected-method final verdict. The page naturally grows to multiple sheets.

**Pagination.** The rendering helper splits per-row traces across sheets as needed to fit within the 10″ print sheet height but **does NOT cap the number of trace rows displayed**. If a project has many SDAs the EISA Direct / TR-55 / TR-16 / MEP / Executive Summary pages each become multi-sheet sections. Page count is not a constraint. The _chunkPages helper handles the natural split and adds `(part N/M)` suffixes to sheet titles.

**"Why the methods diverge" narrative on the EISA Three-Method Comparison page.** Add an explicit explanation block (not just a sentence) so a learner understands the methods will NOT produce matching totals and WHY:

> **Why Direct, TR-55, and TR-16 produce different totals**
>
> All three methods approximate the same physical quantity (24-hr runoff from the design storm) but use different physical models.
>
> **Direct Determination** (EPA EISA §438 TG, Dec 2009) is a linear deduction model: subtract a fixed depression storage, subtract the 24-hr Horton infiltration integral (pervious only), and whatever remains becomes runoff. No continuing abstraction after the fixed losses are satisfied.
>
> **TR-55** (SCS CN method) uses an initial abstraction Ia = 0.2·S and a **continuing abstraction** encoded in the `(P − Ia + S)` denominator of `Q = (P − Ia)² / (P − Ia + S)`. The soil keeps absorbing water even after Ia is satisfied, so TR-55 Q is always strictly less than `P − Ia`.
>
> **TR-16** is a tabulation of the TR-55 equation at 0.1″ P increments; it matches TR-55 to within 0.01″ rounding.
>
> **Expected direction of divergence on a given surface:**
> | Surface | Direct vs TR-55 | Why |
> |---|---|---|
> | Impervious (CN=98) | Direct > TR-55 | Direct subtracts only 0.1″ depression; TR-55 continues to absorb via S ≈ 0.20″ |
> | Pervious HSG A/B/C | Direct < TR-55 | Direct's 24-hr Horton loss (~3–7″) exceeds rainfall; TR-55 CN captures only partial infiltration |
> | Pervious HSG D | Direct > TR-55 | Direct uses no Horton on D (just 0.2″ depression); TR-55 still has large S for high-CN D soils |
>
> **Net total divergence** on a project depends on the impervious / pervious mix and HSG distribution. For Minnesota Ave (all HSG D, highly impervious), expect **Direct > TR-55 overall**.
>
> EPA's EISA §438 TG offers both methods and lets the designer pick. Neither is "wrong"; they encode different physical assumptions. Direct is more defensible on well-studied natural soils with reliable Horton parameters; TR-55 is more defensible on urban developed watersheds with established CN calibration.

### 8.3 Populator app

No render changes. UI remains a simple list of output files + warnings. The Dry Swale mapping's Python code reads `bmp.swale.*` but still writes exactly the same cells to the DOEE SWMP-BMP Calc blank (C29–C36). Verified by the existing cell-value assertions in `tests/mappings/swmp-bmp-calc.test.mjs`.

## 9. Minnesota Ave fixture updates

`workbook/sample.py`:

- **BMPs** list grows by one Dry Swale (e.g., `BMP-05-S` on SDA-5) to exercise the wedge path. Realistic DDOT-compliant values: `L_s=100 ft, w_s=4 ft, inv_US=100.0, inv_DS=98.0, top_US=102.0, top_DS=100.0, H_cd=1.0 ft, X_cd=50 ft` → slope 2%, N=2 dams, each ponds a full H/S=50 ft wedge, pond Sv = 2 × ½ × 50 × 1 × 4 = **200 cf**.
- **4 Bioretention BMPs** (02-A, 06-A, 07-A, 08-A) get `SA_pond_top = 1.4 × SA_top` to make side-slope flare visible, plus elevations: `top_elev = 100.0`, `overflow_elev = 100.5` (6″ above grade), `sidewalk_elev = 100.75` (9″ above grade), `curb_cut_elev = 100.3` (3.6″ above grade — curb inlet).

Expected Sv changes:
- Bio BMPs with `SA_pond_top > SA_top`: pond_Sv increases from `210 × 0.5 = 105 cf` to `½ × (210 + 294) × 0.5 = 126 cf` per Bio BMP (+ ~20% pond Sv).
- Dry Swale BMP-05-S: brand new (previously no Dry Swales in fixture), contributes 200 cf pond Sv + subsurface.

Regenerate:
1. `python -m workbook.sample` → updates root `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`.
2. Copy fixture → `summary_calculator/tests/fixtures/minnesota-ave.xlsx`, `populator/tests/fixtures/minnesota-ave.xlsx`, `education/tests/fixtures/minnesota-ave.xlsx`.
3. `PYTHONPATH=. python3 scripts/dump_reference.py` → re-baselines `minnesota-ave.reference.json`.

## 10. Rigorous testing

### 10.1 Pure calc tests (`summary_calculator/tests/calc.test.mjs`)

- `bioSizingSv` with `SA_pond_top` provided → trapezoid pond_Sv matches hand-computed value.
- `bioSizingSv` with `SA_pond_top` = null → degrades to `SA_bot × d_pond` (behaviorally identical to prior code when `SA_top = SA_bot`).
- `bioSizingSv` with `SA_pond_top` = `SA_top` → trapezoid collapses to `SA_top × d_pond` (identical to vertical-wall when there's no flare).
- `drySwaleSizingSv` with full geometry → wedge pond_Sv = `N × ½ × min(X,H/S) × H × w`.
- `drySwaleSizingSv` with `X > H/S` → effective base capped at `H/S` (dead-zone case).
- `drySwaleSizingSv` with `X < H/S` → effective base = `X` (overlap case — truncated wedge).
- `drySwaleSizingSv` with any geometry field missing → falls back to `SA_bot × d_pond`.
- `drySwaleSizingSv` with slope = 0 → doesn't divide-by-zero (guarded by `Math.max(1e-6, …)`).
- `bioFreeboardFt` and `drySwaleFreeboardFt` return `null` when inputs are incomplete; return the correct Δ when complete.

### 10.2 Parser tests (`summary_calculator/tests/parse.test.mjs`)

- `bmp.swale` is populated for `Dry Swale` type; `bmp.bio` is NOT populated for Dry Swale.
- New optional cells parse as `null` when blank, not `0`.
- All existing BMP parsing assertions still pass.

### 10.3 Aggregate tests (`summary_calculator/tests/aggregate.test.mjs`)

- `rvProvidedPerSda` with a Bio BMP that has `saPondTop` provided → Rv reflects trapezoid pond (higher than vertical-wall when flare present).
- `rvProvidedPerSda` with a Dry Swale BMP that has channel geometry → Rv reflects wedge pond.
- `rvProvidedPerBmp` returns the per-BMP objects with correct `rvCf` for each sizing path.
- `_rvForBmp` branches correctly on `bmp.swale` vs `bmp.bio`.

### 10.4 Reference parity (`summary_calculator/tests/parity.test.mjs`)

- Minnesota Ave numeric values (SWRv per SDA + site total + EISA Direct pre/post + detention per SDA) match the re-baselined `reference.json` to 0.5 cf tolerance.

### 10.5 Render tests (`summary_calculator/tests/render.test.mjs`, `education/tests/render-edu.test.mjs`)

- Summary Bio page shows `[trapezoid]` tag when `saPondTop` provided; `[vertical-wall]` tag when absent.
- Summary Dry Swale page shows wedge Sv trace when channel geometry provided; shows flat-pond fallback trace when absent.
- Summary Bio and Dry Swale pages render FREEBOARD block only when the required elevations are present.
- Education EISA Direct / TR-55 / TR-16 / MEP pages contain arithmetic substitution strings for sampled rows.

### 10.6 Engine parity (`education/tests/engine-parity.test.mjs`)

- Byte-equality of `calc.mjs` / `aggregate.mjs` / `parse.mjs` across `summary_calculator/` and `education/` still holds after sync script runs.

### 10.7 Populator cell writes (`populator/tests/mappings/*.test.mjs`)

- `swmp-bmp-calc` mapping writes identical cells to the DOEE sheet for Dry Swale as before (regression guard — ensures the `bmp.bio` → `bmp.swale` rename didn't change what the populator emits).
- `swdb-prow`, `ddot-mep`, `general-retention`, `rainwater-harvesting` mapping outputs unchanged.

### 10.8 Backward-compat regression (`summary_calculator/tests/backward-compat.test.mjs`)

- Create `summary_calculator/tests/fixtures/minnesota-ave-pre-geometry.xlsx` — frozen copy of the pre-change fixture (snapshot BEFORE the new geometry columns are added).
- Test asserts the current parser handles this old fixture without errors: `bmp.swale` fields are all `null`, Dry Swale (if any) falls back to flat-pond formula, Bio BMPs render without the freeboard block, all pages render.
- Protects against a future parser edit that would break old workbooks.

### 10.9 Playwright smoke across all three apps

- Full deck still renders for Minnesota Ave fixture in summary + education apps.
- Populator still produces the expected 18 outputs (3 single + 15 fan-out).

### 10.10 Python workbook tests (`tests/test_bmp.py`, `tests/test_calculations.py`)

- Add assertions that the generated workbook contains headers at the new column positions.
- Verify Minnesota Ave sample Dry Swale BMP correctly populates the new cells.

## 11. Out of scope (v1)

- Detention-storm freeboard surcharge via stage-storage curves.
- Per-dam variable height / variable spacing (sub-rows per BMP).
- Lateral check-dam geometry that extends across sloped side-walls instead of flat bottom.
- Field-measured infiltration overriding `n_media` / `n_gravel`.
- Non-DC regional values anywhere.

## 12. Verification checklist

- [ ] Running `python -m workbook.sample` produces a BMP sheet whose Bio zone extends to column AS and Dry Swale zone extends to column BE.
- [ ] Running `node --test` in all three apps shows all tests pass (including the new calc, aggregate, parse, parity, render, backward-compat tests).
- [ ] `npx playwright test` in all three apps passes.
- [ ] `PYTHONPATH=. python3 -m pytest tests/` passes.
- [ ] Opening `summary_calculator/summary-calculator.html` with the regenerated Minnesota Ave fixture shows a FREEBOARD block on Bio BMPs 02-A / 06-A / 07-A / 08-A, and a channel-geometry + wedge-pond + freeboard block on new BMP-05-S Dry Swale.
- [ ] Opening `education/education.html` with the same fixture shows the same geometry info, with the four-block pedagogical pattern + per-row arithmetic substitution traces on the EISA 438 and MEP pages.
- [ ] Opening a populated SWMP-BMP Calc output in Excel shows DOEE sheet cells (C29–C36 for Dry Swale, C57–C66 for Bio) populated EXACTLY as before — no new cells written anywhere in the official spreadsheet.
- [ ] `summary_calculator/tests/backward-compat.test.mjs` loads the frozen pre-change fixture and passes.
