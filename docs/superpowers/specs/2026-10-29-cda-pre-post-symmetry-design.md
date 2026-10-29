# CDA Pre/Post Symmetry — Design Spec

**Date:** 2026-10-29
**Project:** `ddot_doee_swm_guidelines_2026_v1`
**Status:** Design approved, ready for implementation plan
**Related work:**
- Workbook build pipeline (`workbook/`)
- Webpage A — SWM Summary Calculator (`summary_calculator/`)
- Webpage B — SWM DOEE Populator (`populator/`, branch `feat/populator`)

---

## 1. Goal

Extend the `CDA` sheet in the `SW_Required_Provided_DOEE_EISA438.xlsx` template so it mirrors `SDA`'s pre/post area-column pattern. The current CDA sheet carries only one area pair (`Within LOD (SF)`, `Outside LOD (SF)`) representing the post-development condition. After this change it will carry `Pre Within / Pre Outside / Post Within / Post Outside`, with matching SWRv output columns.

The purpose is record-keeping parity with SDA — downstream calculators today use only post-development CDA land cover, but future exports (DOEE record-keeping, SWMP-BMP, SWDB, DDOT MEP worksheets) are expected to want pre-development CDA land cover for the same catchment footprint, so the data must be captured in the template.

**Non-goals.**
- Splitting SDA/CDA into separate `_Existing` / `_Proposed` sheets. Rejected in brainstorming; the single-sheet mirror pattern is sufficient and keeps the sheet count unchanged.
- Introducing a per-sheet "Scope" marker cell. Not needed when both pre and post live on the same sheet.
- Changing SDA (unchanged — SDA already has this layout).
- Fixing the latent "CDA inside a PROW SDA should use rainfall = 0" issue. CDA SWRv formulas continue to use `PROJECT_Rainfall` directly. Out of scope.
- Resuming populator tasks 06–08. They proceed only after this schema change lands.

## 2. New CDA layout

### 2.1 Data region (rows 4–53, 50 input rows)

| Col | Header                           | Kind  | Source / formula                       |
|-----|----------------------------------|-------|----------------------------------------|
| A   | `CDA_ID`                         | input | —                                      |
| B   | `SDA_ID`                         | input | data-validated against `SDA_IDs`       |
| C   | `Land Use`                       | input | data-validated against `LAND_USES`     |
| D   | `HSG`                            | input | data-validated against `A,B,C,D`       |
| E   | `Pre Within LOD (SF)`            | input | —                                      |
| F   | `Pre Outside LOD (SF)`           | input | —                                      |
| G   | `Post Within LOD (SF)`           | input | —                                      |
| H   | `Post Outside LOD (SF)`          | input | —                                      |
| I   | `Rv`                             | calc  | `=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")` |
| J   | `Pre CDA SWRv Within (CF)`       | calc  | `=IFERROR(E{r}*I{r}*PROJECT_Rainfall/12,0)` |
| K   | `Pre CDA SWRv Outside (CF)`      | calc  | `=IFERROR(F{r}*I{r}*PROJECT_Rainfall/12,0)` |
| L   | `Post CDA SWRv Within (CF)`      | calc  | `=IFERROR(G{r}*I{r}*PROJECT_Rainfall/12,0)` |
| M   | `Post CDA SWRv Outside (CF)`     | calc  | `=IFERROR(H{r}*I{r}*PROJECT_Rainfall/12,0)` |

Column widths (14 columns total → 13 used; keep width defaults from current CDA for cols A–D, mirror SDA area widths for E–H, keep current widths for I–M).

Row 3 is the header. Rows 4–53 are data (50 rows). Row 54 is a blank separator; row 56 is the summary header.

### 2.2 Summary block (unchanged shape, repointed sources)

The summary block retains four columns. Its area column now reports **post** within-LOD aggregates:

| Col | Header                              | Formula                                                                                 |
|-----|-------------------------------------|-----------------------------------------------------------------------------------------|
| A   | `CDA_ID`                            | hard-coded label (`CDA-1` … `CDA-10`)                                                   |
| B   | `SDA_ID`                            | `=IFERROR(INDEX($B$4:$B$53,MATCH(A{r},$A$4:$A$53,0)),"")`                               |
| C   | `Total CDA Within LOD (SF)` *(post)* | `=SUMIFS($G$4:$G$53,$A$4:$A$53,A{r})`                                                   |
| D   | `Max BMP Credit (CF)`               | `=C{r}*1.7/12`                                                                          |

The summary column header for col C changes from `Total CDA Within LOD (SF)` to `Total CDA Within LOD (SF)` *(post)* — reader-visible marker that this is the post-development catchment. The underlying semantics is unchanged (BMP sizing cap has always been post-development).

Named range `CDA_IDs` continues to span the summary-block ID column (`$A$sum_data_start:$A$sum_data_end`). No change.

## 3. Downstream impact

### 3.1 `workbook/builders/cda.py` — rewrite

Fully rewrite to emit the 13-column layout above. Data validations stay the same (SDA_ID, Land Use, HSG). The summary block's SUMIFS switches from col E to col G.

### 3.2 `workbook/builders/bmp.py` — repoint Ksat SUMIFS

The Ksat auto-population formula currently reads from `'CDA'!$E` (the single Within-LOD column). It must switch to `'CDA'!$G` (post within-LOD) to preserve its current semantics.

```python
# in _ksat_sumifs() — change $E → $G
f"SUMIFS('CDA'!$G${CDA_D1}:$G${CDA_DL}, …"
```

The Max BMP Credit VLOOKUP references the CDA summary block, column index 4 — unchanged, since the summary block shape doesn't move.

### 3.3 `workbook/builders/doee.py` — unchanged semantics, verify refs

`DOEE_BMP_DATA` consumes CDA land cover for the post-development BMP record. It currently references the single post-equivalent CDA columns; after the schema change those are columns G–H. Update any direct `'CDA'!$E`/`'CDA'!$F` references to `'CDA'!$G`/`'CDA'!$H`. `DOEE_BMP_DATA` does **not** surface pre-development CDA land cover. (The pre columns exist on the CDA sheet for record-keeping; downstream consumers continue to use post only until an explicit requirement adds pre.)

### 3.4 `summary_calculator/src/parse.mjs` — expand `parseCda`

Current signature returns `{cdaId, sdaId, landUse, withinLodSf}`. New signature:

```js
{
  cdaId, sdaId, landUse, hsg,
  preIn, preOut, postIn, postOut,
}
```

Reads cols A, B, C, D, E, F, G, H respectively. Reader `cell(sheet, r, 5)` → `preIn`, cell 6 → `preOut`, cell 7 → `postIn`, cell 8 → `postOut`.

The existing `withinLodSf` field is renamed to `postIn` project-wide. No alias is retained — callers migrate explicitly.

### 3.5 `summary_calculator/src/calc.mjs` — rename and keep behavior

Every reference to `cda.withinLodSf` is replaced with `cda.postIn`. Business logic (Max BMP Credit cap) remains "post catchment × 1.7"/12". No new calcs are introduced.

### 3.6 `summary_calculator/src/render.mjs` — SDA/CDA summary page

The existing SDA/CDA summary page prints SDA pre vs post columns. The CDA block, which currently prints only a single `Within LOD (SF)` column, is extended to print `Pre Within LOD (SF)` and `Post Within LOD (SF)` side by side — parity with SDA. The max-BMP-credit column keeps using post. Outside-LOD values are not rendered (consistent with current SDA treatment on this page).

### 3.7 `summary_calculator/tests/parity.test.mjs` and `tests/fixtures/`

Fixtures regenerated. The reference JSON produced by `scripts/dump_reference.py` is reviewed for any CDA-shape expectations and updated.

### 3.8 `populator/src/parse.mjs` — copy from updated summary_calculator parse

The populator's copy of `parse.mjs` is updated to match. The two files stay in lockstep; a regression test asserts they produce identical output for the same fixture.

### 3.9 `populator/src/mappings/general-retention.mjs`, `ddot-mep.mjs`

Both existing mappings touch CDA data. They are audited and switched to the `postIn` field name. Pre-development CDA data is not written to any target workbook in v1 (populator tasks 06–08 may add it where the target DOEE/DDOT template accepts it).

### 3.10 `populator/tests/` — fixtures + mapping tests

Minnesota Ave fixture (`populator/tests/fixtures/minnesota-ave.xlsx`) is regenerated. Golden-cell assertions in mapping tests are reviewed; any that reference CDA cells shift by the new column offsets.

### 3.11 Sample workbook

`SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx` is regenerated by rerunning `python -m workbook.sample` (or the equivalent entry point). The sample's CDA sheet gains the pre-development land-cover values for parity with SDA. Where the pre-development land cover is unknown or not meaningful, pre columns are left blank (zero-contribution via `IFERROR`).

### 3.12 Repo-level tests

`tests/` at the repo root exercises `calculations.py` and the workbook build. Any CDA-column expectations are updated. New assertion: given a filled CDA with distinct pre and post land cover, the post-based Max BMP Credit still matches the regulatory `area × 1.7"/12` cap.

## 4. Named ranges, data validation, protection

- `SDA_IDs`, `CDA_IDs` — unchanged (summary-block column A on each sheet).
- `PARAMS_Rv`, `PROJECT_Rainfall` — unchanged.
- CDA data validations (SDA_ID list, Land Use list, HSG list) — unchanged, still applied to cols B, C, D over rows 4–53.
- Protection / locked status on the CDA sheet — preserved.

## 5. Migration path

1. Update `workbook/builders/cda.py`.
2. Update `workbook/builders/bmp.py` Ksat SUMIFS column letter.
3. Update `workbook/builders/doee.py` for the post column shift.
4. Rebuild blank template: `python -m workbook` → verify the new CDA layout opens cleanly in Excel with no validation errors.
5. Rebuild sample: `python -m workbook.sample` → inspect Minnesota Ave file.
6. Update `summary_calculator/src/parse.mjs`, `calc.mjs`, `render.mjs`.
7. Update `summary_calculator/tests/` fixtures and expectations; run the full test suite.
8. Rebuild dist: `node summary_calculator/build.js`.
9. Copy updated `parse.mjs` to `populator/src/parse.mjs`.
10. Update `populator/src/mappings/general-retention.mjs` and `ddot-mep.mjs` to use `postIn`.
11. Regenerate `populator/tests/fixtures/minnesota-ave.xlsx`; update mapping tests.
12. Run `node --test populator/tests/**/*.test.mjs` → verify green.
13. Resume populator tasks 06–08 on top of this schema.

## 6. Validation checklist

Before merge:

- Fresh blank template opens in Excel; CDA sheet shows 13 columns A–M with headers above.
- Fresh blank template opens in LibreOffice without warnings.
- Minnesota Ave sample loaded into Excel: all CDA formulas resolve, no `#REF!` or `#NAME?`.
- `summary_calculator/summary-calculator.html` (rebuilt dist) loads the Minnesota Ave sample from `file://`, renders the CDA page with pre vs post columns, and matches the reference JSON on parity test.
- All existing BMP Max-Credit values match pre-change values when post land cover is unchanged (the migration must be numerically neutral for already-filled samples).
- `node --test` passes across both webapps.

## 7. Order of operations vs. populator branch

This schema change lands on a new branch off `main` (not on `feat/populator`), merges to `main`, then `feat/populator` rebases onto the updated `main`. Reasons:

- Populator tasks 06–08 (SWDB-PROW, SWMP-BMP-Calc, Rainwater-Harvesting mappings) will read CDA columns. They should see the final layout.
- Keeping the schema change on its own branch keeps the diff reviewable and bisectable.
- The two populator mappings already on `feat/populator` (`general-retention`, `ddot-mep`) touch CDA data — step 10 of the migration path fixes them in-place on the rebase.
