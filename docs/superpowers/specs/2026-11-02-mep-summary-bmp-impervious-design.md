# DDOT MEP Summary — Factor BMP into Impervious Totals

**Date:** 2026-11-02
**Scope:** `workbook/builders/correct_mep_summary.py` only. No change to DOEE Compliance Calc mirror sheets, SDA/CDA sheets, EISA sheets, or PARAMS.

## Problem

The DDOT MEP Summary (`CORRECT_MEP_SUMMARY`) undercounts "Impervious" area by excluding BMP footprint, while `SDA_Proposed` treats BMP as impervious for runoff. The two sheets disagree on project SWRv.

Specifically:

- `SDA_Proposed` data rows compute `SWRv Within (CF) = Area × Rv × 1.2 / 12` per land use. BMP has `Rv = 0.95` (same as Impervious Vehicular / Non-Vehicular) per `PARAMS!PARAMS_Rv`. BMP area contributes to the SWRv.
- `CORRECT_MEP_SUMMARY` col B ("Impervious within LOD") pulls `'SDA_Proposed'!B{s}` — the SDA summary's `Imp Total`, which SUMIFs only `"Impervious Vehicular"` + `"Impervious Non-Vehicular"`. BMP area (`'SDA_Proposed'!E{s}`, `BMP Total`) is omitted.
- `CORRECT_MEP_SUMMARY` col F ("Impervious outside LOD") does a direct SUMIFS on `SDA_Proposed` col F for `"Impervious Vehicular"` + `"Impervious Non-Vehicular"`. BMP outside LOD is omitted.
- Col E = `SUM(B:D)` is therefore less than `SDA_Proposed` summary col F (`Post Total Within = Imp + Comp + Nat + BMP`).
- Col J (SWRv Within) = `AP × 1.2/12 × E`, where `AP = (B×0.95 + C×0.25 + D×0)/E`. With B missing BMP, J undercounts the SWRv by `BMP area × 0.95 × 1.2 / 12`.
- Row 45 (DATOTAL) SUMs J into J45, which feeds J3 ("Regulated Retention Volume (1.2")") in the project header. Project-level SWRv is undercounted on the DDOT submission deck.

The same chain applies for outside-LOD: col F → col I (SUM) → col K (SWRv Outside via AQ).

## Invariant to Restore

For the same project, these must hold:

1. `CORRECT_MEP_SUMMARY!E45` == sum of `SDA_Proposed` summary col F ("Post Total Within") across all SDAs.
2. `CORRECT_MEP_SUMMARY!J45` == sum of `SDA_Proposed` summary col G ("SWRv Required (CF)") across all SDAs.
3. For every row `r` in rows 12–44, `CORRECT_MEP_SUMMARY!B{r}` == `SDA_Proposed!B{s} + SDA_Proposed!E{s}` where `s = 58 + (r − 12)`.

## Fix

Two edits in `workbook/builders/correct_mep_summary.py` inside `_write_da_rows`:

### Edit 1 — Col B (Imp within LOD)

File: `workbook/builders/correct_mep_summary.py`, line 509.

Before:

```python
ws.cell(row=r, column=2, value=_guard(f"'SDA_Proposed'!B{s}", a))  # B — Imp Within
```

After:

```python
ws.cell(row=r, column=2, value=_guard(f"'SDA_Proposed'!B{s}+'SDA_Proposed'!E{s}", a))  # B — Imp + BMP Within
```

`SDA_Proposed` summary col B = `Imp Total (Vehicular + Non-Vehicular)`; col E = `BMP Total`. Sum is total impervious-equivalent area within LOD per SDA.

### Edit 2 — Col F (Imp outside LOD)

File: `workbook/builders/correct_mep_summary.py`, lines 534–537.

Before:

```python
ws.cell(row=r, column=6, value=_guard(
    f"SUMIFS('SDA_Proposed'!$F${D1}:$F${DL},'SDA_Proposed'!$A${D1}:$A${DL},{a},'SDA_Proposed'!$C${D1}:$C${DL},\"Impervious Vehicular\")"
    f"+SUMIFS('SDA_Proposed'!$F${D1}:$F${DL},'SDA_Proposed'!$A${D1}:$A${DL},{a},'SDA_Proposed'!$C${D1}:$C${DL},\"Impervious Non-Vehicular\")",
    a))
```

After:

```python
ws.cell(row=r, column=6, value=_guard(
    f"SUMIFS('SDA_Proposed'!$F${D1}:$F${DL},'SDA_Proposed'!$A${D1}:$A${DL},{a},'SDA_Proposed'!$C${D1}:$C${DL},\"Impervious Vehicular\")"
    f"+SUMIFS('SDA_Proposed'!$F${D1}:$F${DL},'SDA_Proposed'!$A${D1}:$A${DL},{a},'SDA_Proposed'!$C${D1}:$C${DL},\"Impervious Non-Vehicular\")"
    f"+SUMIFS('SDA_Proposed'!$F${D1}:$F${DL},'SDA_Proposed'!$A${D1}:$A${DL},{a},'SDA_Proposed'!$C${D1}:$C${DL},\"BMP\")",
    a))
```

Adds a third SUMIFS clause for `"BMP"` land use on the Outside-LOD column.

## Why the Rv Composite Stays Correct

`CORRECT_MEP_SUMMARY` col AP (Within-LOD Rv composite):

```
AP = (B×0.95 + C×0.25 + D×0) / E
```

With BMP folded into B, both numerator and denominator include BMP area at Rv=0.95. The resulting weighted-average Rv is identical to what you'd get from the per-land-use calculation on `SDA_Proposed` (Imp Veh × 0.95 + Imp Non-Veh × 0.95 + BMP × 0.95 + Comp × 0.25 + Nat × 0 → divided by the total area). No formula change needed for AP, AQ, J, or K.

## Non-Goals

- **Do not change** `SDA_Proposed` summary (BMP remains its own column — explicit user preference).
- **Do not change** `DOEE_SDA` Pre/Post Imp columns — DOEE's Compliance Calc keeps Impervious and BMP separate; this is the authoritative compliance sheet and we mirror it faithfully (CLAUDE.md hard rule).
- **Do not change** `EISA_DIRECT` runoff table (BMP already has its own row and is summed into TOTAL).
- **Do not change** PARAMS, Rv, CN, or depression storage values.

## Testing

Add to `tests/test_correct_mep_summary.py`:

1. **Row-level BMP folding (within LOD).** Build workbook, write to one SDA an impervious row and a BMP row (both within LOD, different HSG rows allowed). Open workbook with `data_only=False`, read col B formula at row 12 — assert it contains both `B{s}` and `E{s}` references.

2. **Row-level BMP folding (outside LOD).** Write BMP area in `SDA_Proposed` col F (Outside LOD) for the test SDA. Read col F formula at row 12 — assert it contains SUMIFS for `"BMP"` on `SDA_Proposed` col F.

3. **Numerical invariant.** Follow the existing LibreOffice-recalc pattern used in `tests/test_validation_penn_ave.py` (headless `soffice` recalc → reload with `openpyxl.load_workbook(..., data_only=True)`). Against the regenerated `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`, assert `CORRECT_MEP_SUMMARY!E45` ≈ sum of `SDA_Proposed` summary col F values and `CORRECT_MEP_SUMMARY!J45` ≈ sum of `SDA_Proposed` summary col G values (abs tol 1 SF / 1 CF).

Existing tests that will exercise the fix implicitly:

- `tests/test_correct_mep_summary.py` existing assertions on col B/F formulas must be updated to match the new formula shape.
- Any sample-based structure test comparing MEP totals against SDA totals.

## Downstream Re-sync

1. Regenerate fixtures:
   - `SW_Required_Provided_DOEE_EISA438.xlsx` (blank template)
   - `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`
   - `SW_Required_Provided_DOEE_EISA438_SAMPLE_Trail.xlsx`
   - Copies under `summary_calculator/tests/fixtures/`, `populator/tests/fixtures/`, `education/tests/fixtures/`
2. Rebuild browser-app dists so Pages deploy carries the fix:
   - `node summary_calculator/build.js`
   - `node populator/build.js`
   - `node education/build.js` (dual-base64 inlines both samples)
3. Run full test suites: `pytest tests/`, `npm test` in each of the three JS apps.

## Risk & Reversibility

- Scope is 2 formula strings in one builder; blast radius is contained to `CORRECT_MEP_SUMMARY`.
- Backward compatibility: the frozen fixture at `summary_calculator/tests/fixtures/minnesota-ave-pre-geometry.xlsx` is a pre-schema-change snapshot and uses the old MEP formulas; the backward-compat parser must continue to read it. The parser doesn't rely on these specific formulas, only on the sheet shape, so no parse change expected — verify via existing `backward-compat.test.mjs` run.
- Rollback: revert the single commit.
