# Populator Follow-On — Investigation Report

**Date:** 2026-11-19
**Parent follow-on:** `docs/superpowers/specs/2026-11-06-summary-calculator-template-gaps-design.md` §8.1
> `populator` app spec — mappings into any DOEE/DDOT output workbook that has corresponding TC / peak / detention cells.

**Finding:** no new populator mappings needed. No official DOEE/DDOT workbook has input cells for the six summary-calculator features landed in the 2026-11-06 plan, and the one case that initially looked like it needed mapping (DOEE_DETENTION_BMP) is already fully handled by the existing BMP Sv mapping cascading through DOEE's own in-sheet formulas.

## 1. Scope of investigation

Scanned every official DOEE/DDOT output workbook for input cells that could receive the six new summary-calculator features:

| Official workbook                                                         | Has TC cells? | Peak Q cells? | Area_Summary cells? | Detention-BMP cells? | EISA Timestep cells? |
|---------------------------------------------------------------------------|---------------|----------------|----------------------|------------------------|-----------------------|
| `2020 General Retention Compliance Calculator 2-5-21.xlsx`                | **No**        | **No**         | No (derived)         | **Derived, see §3**    | No (EISA not covered) |
| `2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm`                           | No            | No             | No                   | No                     | No                    |
| `DDOT MEP Worksheet 012019.xlsx`                                           | No            | No             | No                   | No                     | No                    |
| `SWDB Template for PROW Information_SWMP July 2025 - final locked.xlsx`   | No            | No             | No                   | No                     | No                    |

Keyword scan used: "tc", "time of conc", "peak", "discharge", "q_", "2-yr", "15-yr", "qpre", "qpost", "adj cn", "adj q". Zero hits across all four files on all keywords. (Full command recorded in session history.)

## 2. Why each feature doesn't need a new mapping

**Area_Summary** — a derivation summary of per-SDA/CDA land cover. Everything it rolls up is already written per-row into `'1. Site Drainage Areas'!F:I` (pre) and `'1. Site Drainage Areas'!P:T` (post) by the existing general-retention mapping. DOEE's own SUMIF formulas in the same sheet (cols AP..AU) produce equivalent rollups.

**TC_PATH (Time of Concentration)** — Tc is an input to TR-55 peak-flow calcs. Neither the General Retention Calc's `3. Detention` sheet nor any other official DOEE/DDOT sheet exposes a Tc input. DOEE's detention trigger math uses the 2020 CN-based methodology (see §3), which does not take Tc.

**Peak Discharge (SDA + CDA)** — same as above. Peak flow is not an input to DOEE's compliance workflow. The populator's compliance targets don't compute or consume peak discharges.

**DOEE_DETENTION_BMP (2020 methodology)** — see §3. Already handled by existing mapping.

**EISA Direct Timestep** — there is no official DOEE workbook for EISA §438 compliance. EISA documentation is narrative + summary tables in the designer's SWMP; no spreadsheet to populate.

## 3. DOEE Detention-BMP: already works end-to-end

The 2020 methodology (BMP Sv credited against post-development runoff depth, producing an adjusted CN that gets compared to pre CN for the 2-yr / 15-yr storm trigger) is **fully baked into the General Retention Calc's `3. Detention` sheet**.

Chain:

1. **Populator writes BMP Sv per BMP** → `'2. BMP Data'!S{row}` (existing `general-retention.mjs` mapping, line 97).
2. **DOEE formula aggregates BMP Sv per SDA** → `'1. Site Drainage Areas'!AR{row} = SUMIF('2. BMP Data'!$C$7:$C$55, $D{row}, '2. BMP Data'!S$7:S$55)`.
3. **DOEE formula pulls per-SDA Sv into detention sheet** → `'3. Detention'!E{row} = '1. Site Drainage Areas'!AR{row+1}`.
4. **DOEE formula computes adjusted runoff** → `'3. Detention'!AB{row} = AA{row} - E{row}*12/D{row}` (this is our `detentionBmpAdjustedQ` formula verbatim).
5. **DOEE formula inverts to adjusted CN** → `'3. Detention'!AC{row} = VLOOKUP(AB{row}, ...)` (DOEE's internal inverse-CN table).
6. **DOEE formula flags detention trigger** → `'3. Detention'!AD{row} = IF(AC{row} <= Q{row}, "No", "Yes")` (2-yr); similar logic in AH/AI (15-yr) and AM (100-yr).

The populator's responsibility ends at step 1. Our existing `general-retention.mjs` already writes BMP Sv into `S{row}` via the `sv` derivation. End-to-end detention compliance flows automatically.

**Cross-check**: the summary calculator's `renderDoeeDetentionBmpSheet` page and the 2026-11-18 education `renderDoeeDetentionBmpEduPage` both compute the same adjusted CN in JS using identical formulas. The three paths — DOEE's workbook formulas, our JS engine, and our pedagogy — all converge on the same methodology. No populator work needed to connect them.

## 4. Action

- **Retire parent-plan §8.1 populator follow-on** — nothing to implement.
- **Update** `docs/superpowers/plans/2026-11-06-summary-calculator-template-gaps.md` §8 "Related follow-ons" to cite this investigation and mark the item resolved as "no mapping required".
- **Keep** the existing `general-retention.mjs` mapping as-is. It already carries everything downstream DOEE formulas need.

## 5. What would warrant revisiting

- **DOEE publishes a new workbook** that exposes Tc, peak Q, or EISA timestep inputs. (Current versions audited: General Retention 2020-05-04, SWMP-BMP 2020-11-30, DDOT MEP 2019-01, SWDB PROW 2025-07.)
- **DOEE adds EISA compliance** to one of the existing workbooks. The EISA technical guidance has lived outside DOEE's compliance spreadsheets since inception; no near-term signal of change.
- **The 2020 methodology gets superseded** by a Qp-based rule that requires pre/post peak flow inputs. The 2020 methodology's rationale (reducing projects that trigger separate detention because SWRv is already met) argues against reversion.

## 6. Verification

Confirmed on blanks at:
- `populator/blanks/general-retention.xlsx`
- `populator/blanks/ddot-mep.xlsx`
- `populator/blanks/swdb-prow.xlsx`
- `populator/blanks/rainwater-harvesting.xlsx`

And on the authoritative source copies in `docs/doee_spreadsheet_calculators/`:
- `2020 General Retention Compliance Calculator 2-5-21.xlsx`
- `DDOT MEP Worksheet 012019.xlsx`
- `SWDB Template for PROW Information_SWMP July 2025 - final locked.xlsx`
- `2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm`

Populator test suite remains green (`cd populator && npm test` → 69 tests pass).
