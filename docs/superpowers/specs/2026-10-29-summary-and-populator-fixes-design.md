# Summary & Populator — Second-Pass Fixes Design

**Date:** 2026-10-29
**Project:** `ddot_doee_swm_guidelines_2026_v1`
**Status:** Design approved, ready for implementation plan
**Related specs:**
- `2026-10-28-swm-summary-calculator-design.md` (summary calculator)
- `2026-10-29-swm-populator-design.md` (populator)

Second-pass fixes raised after the user manually reviewed both apps against the Minnesota Ave fixture. Six discrete changes — five in the summary calculator, one in the populator.

---

## 1. Dropzone border is visually split (summary app)

**Problem.** On the empty-state landing view, the dashed border around the file-pick dropzone renders as fragmented segments to the left and right of the inner text, not a single enclosing box.

**Root cause.** `summary_calculator/src/ui.mjs:163` renders `<label class="dropzone">` wrapping a block-level `<div>`. HTML `<label>` is inline by default; when an inline element contains a block-level child, the browser fragments the inline border around the block, producing split border segments.

**Fix.** One CSS declaration in `summary_calculator/src/styles.css:30`:

```css
.dropzone { display: block; margin-top: 20px; padding: 40px; border: 2px dashed var(--border); border-radius: 8px; cursor: pointer; }
```

Add `display: block;`. No markup change.

**Verification.** Load the dev page in a browser, confirm the dashed border forms a single rectangle. Playwright smoke test asserts the computed style for `.dropzone` has `display: block`.

---

## 2. Executive Summary sheet (new page, position 2)

**Problem.** No single page gives a reviewer the top-line project state. Compliance status is spread across the Site DA, Site SWRv, Compliance Roll-up, and EISA pages.

**Fix.** Insert a new page immediately after the cover sheet. Three blocks:

### Block A — Site DA roll-up
Table from `siteAggregateLandCover(sdas)` (already in `calc.mjs`):

| Land Cover | Pre (sf) | Post (sf) | Δ (sf) |
|---|---|---|---|
| Natural (Woods) | … | … | … |
| Compacted (Open) | … | … | … |
| Impervious | … | … | … |
| BMP | … | … | … |
| **Total LOD** | … | … | … |

Plus a key-value block: Pre impervious %, Post impervious %.

### Block B — SWRv required vs. provided (per SDA)
Compact table reusing the per-SDA aggregator currently feeding `renderCompliancePage`:

| SDA | SWRv Required (cf) | Rv Provided (cf) | % Met | Status |
|---|---|---|---|---|
| SDA-1 | … | … | …% | ✓ / ✗ |
| … | | | | |
| **SITE TOTAL** | … | … | …% | ✓ / ✗ |

### Block C — EISA §438 result
One line per method:

- **Direct Determination** — Pre `…` cf · Post `…` cf · Δ `…` cf · Net after BMP storage `…` cf · ✓/✗
- **TR-55 (SCS CN)** — Pre `…` cf · Post `…` cf · Δ `…` cf · Net after BMP storage `…` cf · ✓/✗
- **Elected method** — from `project.eisa`, with its overall result

**Dependencies.** Block C requires the EISA rework in §5. If the TR-55 engine isn't wired yet, Block C shows Direct only and a note "TR-55 pending".

**Implementation.** New function `renderExecutiveSummarySheet(project, agg, perSdaCompliance, eisaResults)` in `summary_calculator/src/render.mjs`. Add to the deck in `ui.mjs` builder at index 1 (after cover, before Site DA).

---

## 3. SDA/CDA — four separate pages with LOD columns

**Problem.** The combined SDA/CDA page uses the ambiguous headers "Pre In" and "Post In" (meaning *within LOD, pre-development* and *within LOD, post-development*), and the `Out` fields are discarded.

**Fix.** Replace `renderSdaCdaSummary` with four distinct pages:

| Page title | Columns |
|---|---|
| **SDA — Pre-development** | SDA · In PROW · Land Use · HSG · Inside LOD (sf) · Outside LOD (sf) |
| **SDA — Post-development** | SDA · In PROW · Land Use · HSG · Inside LOD (sf) · Outside LOD (sf) |
| **CDA — Pre-development** | CDA · SDA · Land Use · Inside LOD (sf) · Outside LOD (sf) |
| **CDA — Post-development** | CDA · SDA · Land Use · Inside LOD (sf) · Outside LOD (sf) |

- Column name "Inside LOD / Outside LOD" is unambiguous because the page title specifies Pre vs Post.
- Keep the existing 30-row chunking from `SDA_ROWS_PER_PAGE` so a 50-SDA project still paginates cleanly. Each of the four pages chunks independently.
- Data already parsed in `parse.mjs:66–75` (`preIn`, `preOut`, `postIn`, `postOut`) — no parser change.

**Implementation.** Replace `renderSdaCdaSummary` with four functions (or one factory parameterized by `{side: 'pre'|'post', scope: 'sda'|'cda'}`). The deck builder in `ui.mjs` adds four pages in sequence.

**Side effect on sidebar nav.** The sidebar page list grows by 3 entries. The TOC on the cover sheet (`renderCoverSheet` consumes `tocLabels`) automatically expands.

---

## 4. MEP summary rework — real per-SDA numbers

**Problem.** The MEP page renders a per-SDA table whose Step 1–4 cells all say literal `'Documented'` (`render.mjs:316–320`), making the page uninformative.

**Fix.** Keep the 4-step framework header (Guidebook Appendix B), but replace the fake table with a derived per-SDA metrics table. Restrict rows to **PROW SDAs only** — MEP applies to the public right-of-way per 21 DCMR §508.9.

Columns:

| SDA | Impervious Inside LOD (sf) | MEP Target @ 1.2″ (cf) | Rv Provided (cf) | Deficit (cf) | Status |
|---|---|---|---|---|---|

Where:
- `MEP Target = Impervious_InLOD × 1.2 / 12`
- `Rv Provided = Σ Rv_applied` for all BMPs with `bmp.sdaId === sda.sdaId` (reusing per-BMP Rv-applied values computed by the existing BMP page renderers)
- `Deficit = max(0, Target − Provided)`
- `Status = ✓ MET` if Deficit ≤ 0 else `DEFICIT — document in SWMP narrative`

If `sdas.filter(s => s.inProw === 'Yes').length === 0`, replace the table with a single note: *"No PROW SDAs in this project — MEP does not apply."*

Explicit note on the page: *"Narrative evidence for Steps 2–4 (infiltration suitability, infrastructure constraints, BMP placement rationale) lives in the DDOT MEP Worksheet file. The summary tool reads only the master template; see the populator-generated DDOT MEP Worksheet for narrative evidence."*

**Implementation.** Rewrite `renderMepSheet(project, sdas, bmps, cdas, params)` in `render.mjs`. Signature changes — add `bmps`, `cdas`, `params` so Rv-provided can be summed per SDA using the same calc path as `renderBmpSheets`. Update the deck builder in `ui.mjs` to pass the new args.

**Shared helper.** Extract a small `rvProvidedPerSda(bmps, cdas, params)` helper (returns `{sdaId → cf}`) used by the MEP page, the Compliance Roll-up, and the Executive Summary Block B. New file `summary_calculator/src/aggregate.mjs`.

The helper performs the BMP sizing and max-credit cap itself (reusing `ppSizingSv`, `bioSizingSv`, `rvFromSv`, `maxBmpCredit`, `treeRetentionCredit` from `calc.mjs`) — it does **not** depend on any render function. The existing per-BMP renderers in `render.mjs` are refactored to call this helper too, so Rv-applied is computed in exactly one place.

---

## 5. EISA §438 — Direct + TR-55 + BMP storage

**Problem.** The current single EISA page only shows Direct Determination totals with no step trace, no TR-55 alternative, and no accounting for BMP storage.

**Fix.** Replace the single page with **three** EISA pages.

### 5A. EISA §438 — Direct Determination (per-land-use trace)
Two tables (Pre and Post), each with columns: Land Use · HSG · Area (sf) · Runoff Depth @ 1.7″ (in) · Runoff Volume (cf). Runoff depth lines include the deductions explicitly:

- Impervious: `max(0, 1.7 − 0.1_depression)`
- Pervious HSG A: `0`
- Pervious HSG B: `max(0, 1.7 − 0.2_depression − Horton_B)` where `Horton_B = fMin·T + (fMax−fMin)/k · (1−e^−kT)` with 24 hr
- Pervious HSG C: analogous with HSG C parameters
- Pervious HSG D: `max(0, 1.7 − 0.2_depression)`

Below the two tables: a Δ line `Post − Pre`, a result banner (pass if Δ ≤ 0).

**Calc change.** `eisaDirectRunoffDepth` currently returns a scalar. Add a trace variant `eisaDirectRunoffDepthTrace(landUse, hsg, P)` returning `{value, formula, breakdown}` so the page can show the deduction math per land use. Aggregate function `eisaDirectVolumeTraceCf(rows, P)` returns `{value, perRow: [{landUse, hsg, area, depth, volume}], steps}` compatible with existing `renderTrace`.

### 5B. EISA §438 — TR-55 (SCS CN method)
Two tables (Pre and Post), each with columns: Land Use · HSG · Area (sf) · CN · Runoff Depth @ 1.7″ (in) · Runoff Volume (cf). Formula block above each table:

```
S  = 1000/CN − 10
Ia = 0.2·S
Q  = (P − Ia)² / (P − Ia + S)    if P > Ia, else 0
```

Totals and Δ as in 5A. Pass/fail banner.

**Calc change.** Add `tr55VolumeTraceCf(rows, P)` returning the same shape as the direct-method aggregate so the renderer is symmetric.

### 5C. EISA §438 — Compliance with BMP Storage
A single comparison page that pulls both method results and the BMP-provided retention:

- **BMP storage block** — table listing every BMP that stores water: Name · Type · SDA · Rv Provided (cf). Includes Permeable Pavement, Bioretention, Dry Swale, Planted/Preserve Trees. Green Roof / Rainwater Harvesting / Impervious Disconnection are listed with `—` and a footnote if the parsed `bmps` array has no entries of those types (the current parser doesn't model them). Total row.
- **Method comparison table** — Direct Pre/Post/Δ, TR-55 Pre/Post/Δ, BMP Σ, `Net Δ = Δ − Σ Rv_BMP` for each method, Pass/Fail for each method.
- **Elected method line** — reads `project.eisa` string, displays which method the project elected, and the pass/fail call for that method.

**Note on BMP storage inclusion.** EISA §438 TG permits using any BMP that stores or infiltrates the 95th percentile storm on the parcel. All retention credits that the summary tool already computes for the Site Compliance roll-up are reused here — no new sizing math.

**Implementation.** Three new render functions in `render.mjs`:
- `renderEisaDirectSheet(project, direct)`
- `renderEisaTr55Sheet(project, tr55)`
- `renderEisaComplianceSheet(project, direct, tr55, bmpStorage, electedMethod)`

The deck builder computes `direct = eisaDirectVolumeTraceCf(sdaRows, 1.7)` for pre and post separately, same for TR-55, and passes to the renderers. Delete the old `renderEisa438Sheet`.

---

## 6. Populator — one SWMP-BMP Calc workbook per BMP

**Problem.** `populator/src/mappings/swmp-bmp-calc.mjs:104–114` writes only the first BMP of each type to a single `.xlsm` output and emits a warning naming the skipped BMPs.

**Fix.** Change behavior to generate **one `.xlsm` file per BMP**. The blank `.xlsm` is cloned per BMP; each clone has only that BMP's cells written on the appropriate type-specific sheet; other type sheets stay in their blank state. VBA (`xl/vbaProject.bin`) rides through untouched by `xlsx-surgical` as it already does.

### Rejected alternatives
- **Duplicate sheets inside one `.xlsm`** — VBA macros reference specific sheet names (e.g., `Sheets("3.5 Permeable Pavement")`); duplicating produces `3.5 Permeable Pavement (2)` and macros silently break.
- **One sheet-per-BMP with extended input blocks** — would require editing the DOEE blank's hardcoded input-row layout. The blank is a DOEE deliverable; we don't modify it.

### Mechanism

The orchestrator in `populator/src/populate.mjs` currently assumes `applyMapping` returns a single output. The SWMP-BMP Calc mapping becomes a special case that returns N outputs from one blank. Shape:

- Add an optional `fanOut` field to the mapping's `build(parsed, options)` return. When present, it's an array of `{filename, cells}` objects — one per BMP. `cells` is the same `staticCells` list the mapping already produces, but filtered to this one BMP's writes.
- `applyMapping` recognises `fanOut` and, instead of writing `staticCells` once into one blank, loops: for each entry, open a fresh clone of the blank, write that entry's cells, save as a new output.
- Return shape becomes `{targetId, outputs: [{filename, blob, warnings}]}` for fan-out mappings; existing single-output mappings keep returning `{targetId, filename, blob, warnings}`. `populateAll` flattens into the existing `outputs` array.

### Filename convention

`SWMP-BMP Calc Spreadsheet - {bmp.name}.xlsm`

Sanitization: replace `/\\:*?"<>|` with `_`. On duplicate names (shouldn't happen in practice — the fixture uses unique IDs like PP-1, Bio-1 — but guard anyway), suffix with `-2`, `-3`, etc.

### Warning cleanup

Delete the "filled only first; template has N BMPs of this type" warnings — they're no longer true. Keep the per-BMP guard that skips the write if the required sub-object (`bmp.pp` / `bmp.bio` / `bmp.trees`) is missing, with a warning for that specific BMP.

### UI changes

- The ZIP download in `ui.mjs` already handles N outputs — no change needed; the ZIP just grows by N−1 entries.
- The per-file download list in `renderDone()` grows by N−1 rows for SWMP-BMP Calc files. No layout changes.

### Test updates

- `populator/tests/mappings/swmp-bmp-calc.test.mjs` (if exists) expects N outputs for Minnesota Ave (count = number of BMPs with a supported type in the fixture — Permeable Pavement, Bioretention, Dry Swale, Planted Trees, Preserve Trees).
- `populator/tests/populate.test.mjs` E2E assertion changes from "one SWMP-BMP Calc file" to "N SWMP-BMP Calc files, one per BMP".
- The Playwright smoke test's expected output count rises by N−1 compared to today's single file.

---

## 7. Out of scope

- Rewriting the parser to pull MEP narrative data from the DDOT MEP Worksheet file (the summary tool reads only the master template).
- Extending the parser to Green Roof / Rainwater Harvesting / Impervious Disconnection / Infiltration BMP types (those sub-objects don't exist yet in `bmps[]`).
- Multi-BMP support for OTHER populator targets (SWDB-PROW, DDOT MEP, General Retention, Rainwater Harvesting). This spec only fans out SWMP-BMP Calc.

---

## 8. Verification checklist

- [ ] Dropzone renders as a single dashed rectangle in Chrome, Edge, Firefox.
- [ ] Executive Summary page shows for the Minnesota Ave fixture with correct Site DA totals, per-SDA SWRv compliance, and EISA Direct + TR-55 result lines.
- [ ] SDA page count rises from 1–2 to 4 (plus overflow if >30 rows).
- [ ] "Pre In / Post In" string is absent from the rendered output.
- [ ] MEP page shows per-PROW-SDA Impervious / Target / Provided / Deficit; shows the "no PROW SDAs" fallback when applicable.
- [ ] EISA page count rises from 1 to 3.
- [ ] TR-55 and Direct totals both match a hand-computed Minnesota Ave reference.
- [ ] Populator produces N SWMP-BMP Calc `.xlsm` files for the Minnesota Ave fixture (one per BMP of supported type); each file opens in Excel without macro warnings beyond the normal "enable macros" prompt; each file has only its own BMP's cells populated.
- [ ] Playwright smoke tests (both apps) pass.
