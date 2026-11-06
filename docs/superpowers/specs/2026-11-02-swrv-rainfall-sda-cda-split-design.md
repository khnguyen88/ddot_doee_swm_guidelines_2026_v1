# SWRv Rainfall Model + SDA/CDA Split — Design Spec

**Date:** 2026-11-02
**Status:** Approved by user, ready for implementation plan

---

## Problem

Three sheets in the DOEE/EISA 438 template disagree on which rainfall depth drives the Stormwater Retention Volume (SWRv):

| Sheet | Rainfall actually used (today) | Should be |
|---|---|---|
| `SDA` (sda.py:53) | `PROJECT_Rainfall` (default 1.7″); **zeroed** when `In PROW? = Yes` | Retention target (1.2″ MLD / 0.8″ MSI / higher for AWDZ); applied **regardless of PROW** |
| `CDA` (cda.py:55–58) | `PROJECT_Rainfall` (default 1.7″) for SWRv; 1.7″ hardcoded for Max BMP Credit cap | Retention target for SWRv; 1.7″ cap unchanged (DOEE ceiling) |
| `CORRECT_MEP_SUMMARY` (correct_mep_summary.py:515–516) | 1.2″ hardcoded for J/K; 1.7″ hardcoded for AE/AF | Unchanged — matches DDOT MEP Worksheet template verbatim |
| `EISA_Direct`, `EISA_TR55` | `PROJECT_Rainfall` (default 1.7″) | 1.7″ (EISA 438 95th-percentile storm) |

Root cause: one overloaded `PROJECT_Rainfall` field (default 1.7″) is used for both retention and EISA calculations, and the SDA formula wrongly zeroes it out for PROW rows. PROW does change the compliance path (MEP documentation vs. numerical) but does **not** eliminate the volumetric treatment requirement.

A second structural issue: SDA and CDA each carry Pre/Post column pairs. When BMPs enter the picture, "BMP" as a land use has no coherent pre-development identity (that footprint was impervious or compacted before), so pre/post columns on one sheet get tangled.

---

## Changes

### 1. PROJECT sheet — two rainfall fields

File: `workbook/builders/project.py`

Replace single `PROJECT_Rainfall` (row 9) with two rows:

| Row | Label | Named range | Default | Cell comment |
|---|---|---|---|---|
| 9  | Retention Target (in) | `PROJECT_Rainfall_Retention` | 1.2 | "1.2″ MLD · 0.8″ MSI · higher for AWDZ. Edit per project." |
| 10 | EISA 438 Depth (in) | `PROJECT_Rainfall_EISA` | 1.7 | "95th percentile storm for DC. Fixed per EISA 438." |

Rows below shift by one: Trigger Type now at row 11, EISA Applies at row 12.

Both cells editable, no auto-logic driven by Trigger Type (user retains manual control; guidance lives in cell comments).

### 2. PARAMS Rv table — BMP = 0.95

File: `workbook/builders/params.py`

Single value change at row 29 of PARAMS sheet:

```
BMP: 0.00  →  0.95
```

Rationale: BMP footprint is impervious (concrete/structure/water surface); all precipitation on it must be captured. The retention credit of the BMP is calculated separately on the BMP sheet; this Rv change does not double-count.

`PARAMS_Rv` named range unchanged. VLOOKUPs in SDA/CDA sheets pick up the new value automatically.

### 3. SDA split — SDA_Existing + SDA_Proposed

File: `workbook/builders/sda.py` (replaces the single `SDA` sheet build)

**Current structure** (one sheet with pre/post columns, 14 cols) is replaced by two sheets:

#### SDA_Existing (10 columns)

```
A: SDA_ID       B: In PROW?    C: Land Use      D: HSG
E: Area Within LOD (SF)         F: Area Outside LOD (SF)
G: Rv (lookup)  H: Rainfall (in)  I: SWRv Within (CF)  J: SWRv Outside (CF)
```

- Land Use dropdown: **4 options** — Impervious Vehicular, Impervious Non-Vehicular, Compacted (Open Space), Natural (Woods). **No BMP.**
- Column G: `=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")`
- Column H: `=PROJECT_Rainfall_Retention` (unconditional — no PROW zero-out)
- Columns I/J: `=IFERROR(E{r}*G{r}*H{r}/12,0)` and same with F.

#### SDA_Proposed (10 columns, same layout)

- Land Use dropdown: **5 options** (adds BMP).
- Same formula pattern.

#### Summary blocks (bottom of each sheet)

**SDA_Existing summary** (per SDA_ID, 10 pre-generated rows):
- Imp Total, Comp Total, Nat Total (SF)
- Pre Total Within LOD (SF)

**SDA_Proposed summary** (per SDA_ID, 10 rows):
- Imp Total, Comp Total, Nat Total, BMP Total (SF)
- Post Total Within LOD (SF)
- SWRv Required (CF) — SUMIFS over SWRv Within column
- Area Match? — cross-sheet SUMIFS against SDA_Existing's Pre Total Within for the same SDA_ID, ±1 SF tolerance → "OK" / "⚠ MISMATCH"

#### Named ranges

- `SDA_IDs` → points at the SDA_Proposed summary block A column (authoritative post-development list). CDA_Proposed, BMP, and downstream dropdowns continue to reference `SDA_IDs`.
- `LAND_USES` list stays in sda.py as a Python constant; the `_EXISTING` variant omits "BMP".

### 4. CDA split — CDA_Existing + CDA_Proposed

File: `workbook/builders/cda.py`

Same pattern as SDA. Each sheet has 10 columns (SDA_ID link in column B replaces the second In-PROW column — PROW status is already captured on the parent SDA row).

```
A: CDA_ID       B: SDA_ID       C: Land Use      D: HSG
E: Area Within LOD (SF)         F: Area Outside LOD (SF)
G: Rv (lookup)  H: Rainfall (in)  I: SWRv Within (CF)  J: SWRv Outside (CF)
```

- CDA_Existing Land Use: 4 options (no BMP).
- CDA_Proposed Land Use: 5 options (includes BMP).
- Rainfall column H: `=PROJECT_Rainfall_Retention`.
- Max BMP Credit (DOEE 1.7″ cap) column in CDA_Proposed summary: `=C{r}*1.7/12` — hardcoded 1.7″ unchanged. This is the DOEE compliance ceiling and is independent of the project's retention target.

#### Summary blocks

**CDA_Existing summary**: Pre Total Within LOD (SF) per CDA_ID.

**CDA_Proposed summary**: CDA_ID, SDA_ID (lookup), Total CDA Within LOD (SF) post, Max BMP Credit (CF) at 1.7″ cap, Area Match? (cross-sheet vs. CDA_Existing).

`CDA_IDs` named range → from CDA_Proposed summary block.

### 5. DataValidation / dropdown fix

Across `project.py`, `sda.py`, `cda.py`, `bmp.py` (and anywhere else `DataValidation` is created):

Replace:
```python
dv = DataValidation(type="list", formula1=..., allow_blank=True, showDropDown=False)
```

With:
```python
dv = DataValidation(
    type="list", formula1=..., allow_blank=True,
    showErrorMessage=True,
    errorTitle="Invalid entry",
    error="Pick a value from the dropdown list.",
)
```

Drop `showDropDown` entirely (defaults to showing the arrow). This is the OOXML convention — the attribute is inverted ("True = hide"), and omitting it is cleaner than relying on `False`. `showErrorMessage=True` gives users feedback when they type an invalid value instead of silently accepting it.

### 6. Downstream code updates

All downstream references to the old `SDA` / `CDA` sheets must be re-pointed to `SDA_Proposed` / `CDA_Proposed` (never to the Existing sheets — downstream calcs are all post-development).

| File | Change |
|---|---|
| `workbook/builders/correct_mep_summary.py` | `'SDA'!…` → `'SDA_Proposed'!…`; `'CDA'!…` → `'CDA_Proposed'!…`. All 33 DA rows + SUMIFS blocks. Hardcoded 1.2″ in J/K and 1.7″ in AE/AF unchanged — matches DDOT template. |
| `workbook/builders/bmp.py` | `'SDA'!` and `'CDA'!` references → `'SDA_Proposed'!`, `'CDA_Proposed'!`. SDA summary row references update to match new SDA_Proposed summary layout (which may have different column indices than today's SDA summary). |
| `workbook/builders/doee.py` | Same sheet-name repoint. |
| `workbook/builders/eisa_direct.py`, `workbook/builders/eisa_tr55.py` | `PROJECT_Rainfall` → `PROJECT_Rainfall_EISA` (name change only). |
| `populator/src/parse.mjs` | Parse the new sheet names. If old `SDA` / `CDA` sheets are found on a filled template, fail with a clear message: "This workbook uses the old SDA/CDA pre/post layout. Regenerate from the current blank template." No silent dual-schema parse. |
| `summary_calculator/src/parse.mjs` and `education/src/parse.mjs` | Same. Sync via `bash scripts/sync-education-engines.sh`. CI parity test will fail if they drift. |

### 7. Fixtures

| File | Change |
|---|---|
| `workbook/sample.py` (Minnesota Ave) | Split SDA row inserts into existing + proposed; same for CDA. BMP rows only on `_Proposed` sheets. |
| `workbook/sample_trail.py` | Same split. |
| `summary_calculator/tests/fixtures/minnesota-ave-pre-geometry.xlsx` | **Frozen — do not edit.** This fixture tests backward-compat parsing of the OLD schema. The populator parse layer must either (a) refuse this fixture gracefully (and the test asserts that refusal), or (b) carry a one-off dual-schema path that reads the frozen fixture but is not used for current templates. See Section 8 for the decision. |

### 8. Backward-compatibility strategy — Hard break

**Decision (approved by user):** Hard break. Parse layer rejects old `SDA`/`CDA` sheets with a clear error:

> "This workbook uses the old SDA/CDA pre/post layout. Regenerate from the current blank template (`SW_Required_Provided_DOEE_EISA438.xlsx`)."

- `summary_calculator/tests/backward-compat.test.mjs` is updated so the frozen `minnesota-ave-pre-geometry.xlsx` fixture asserts the rejection (not the parse). The frozen fixture itself stays untouched — it now proves the parser *refuses* the old schema with a clear message, rather than parsing it transparently.
- README gets a note under the "Standards Compliance" section describing the schema change and the regeneration workflow.
- No dual-schema code path.

### 9. Tests

New / updated tests:

| Test file | What it asserts |
|---|---|
| `tests/test_project.py` | PROJECT sheet has rows 9 and 10 with the two rainfall labels; named ranges `PROJECT_Rainfall_Retention` and `PROJECT_Rainfall_EISA` resolve to those cells; defaults 1.2 and 1.7. |
| `tests/test_params.py` | `PARAMS_Rv` lookup for "BMP" returns 0.95. |
| `tests/test_sda_existing.py` (new, renamed from part of `test_sda.py`) | Sheet exists; 10-column headers; Land Use dropdown has 4 options (no BMP); rainfall formula = `=PROJECT_Rainfall_Retention` (no PROW IF); SWRv formulas correct; existing summary block has Imp/Comp/Nat totals, no BMP column. |
| `tests/test_sda_proposed.py` (new) | 10-column headers; Land Use dropdown has 5 options (with BMP); rainfall formula = `=PROJECT_Rainfall_Retention`; proposed summary has Imp/Comp/Nat/BMP totals, SWRv Required, Area Match cross-sheet SUMIFS to SDA_Existing. |
| `tests/test_cda_existing.py` + `tests/test_cda_proposed.py` (new) | Mirror of SDA pair. CDA_Proposed summary still has Max BMP Credit = `=C{r}*1.7/12` hardcoded. |
| `tests/test_correct_mep_summary.py` | Updated SDA/CDA sheet-name references; hardcoded 1.2″ and 1.7″ cells unchanged. |
| `tests/test_rainfall_sources.py` (new, cross-cutting) | SDA_Existing + SDA_Proposed + CDA_Existing + CDA_Proposed rainfall cells reference `PROJECT_Rainfall_Retention`; EISA_Direct + EISA_TR55 reference `PROJECT_Rainfall_EISA`; CORRECT_MEP_SUMMARY J-row and AE-row still contain literal `1.2` and `1.7`. |
| `populator` / `summary_calculator` / `education` test suites | Update parse-layer tests to new sheet names; backward-compat test updated per Section 8 decision. |

TDD discipline per project CLAUDE.md: write each new test first, verify it fails, implement, verify pass, commit.

---

## Out of scope

- Changing DDOT MEP Worksheet 1.2″ hardcoded label or formula (hard rule: match DDOT template verbatim).
- Auto-driving the retention target from Trigger Type (user explicitly chose manual entry).
- EISA 438 TR-55 or Direct Determination formula changes (those sheets just need the named-range rename).
- Any new BMP types or Rv categories.

---

## Decided risks / open implementation details

1. **Backward-compat:** Hard break — see Section 8.
2. **SDA_Proposed / CDA_Proposed summary column order:** User approved reshuffling column indices as the split dictates. BMP sheet references (`'SDA'!A{sum_row}`, `'SDA'!J{sum_row}`, etc.) and `correct_mep_summary.py` references will be updated to match the new maps. The plan should enumerate the final column maps up-front so the downstream references can be updated in one pass.
3. **Populator XML surgery:** The populator writes to official DOEE spreadsheets via surgical XML edits. The split affects only where the populator *reads from* (our generated template); the output XML written to DOEE SWMP-BMP Calc / Compliance Calculator etc. is unchanged. The plan should verify this assumption with a smoke test early.
