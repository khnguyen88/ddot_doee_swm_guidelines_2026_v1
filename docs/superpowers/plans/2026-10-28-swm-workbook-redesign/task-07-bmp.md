# Task 07: BMP Sheet

**Depends on:** 05, 06. **Blocks:** 08, 09, 10, 11.

## Context

BMP is the biggest sheet — one row per BMP, with full SWMP-BMP Calc parameter columns for every BMP type. Columns that don't apply to the selected BMP type are left unfilled (user doesn't enter data there). All formulas use IFERROR so blank BMP rows don't produce #N/A errors.

Columns are grouped into zones:
- **ID columns** (A-E): BMP Name, SDA_ID, CDA_ID, BMP Type, Sub-Type
- **Permeable Pavement** (F-M): surface area, reservoir depth, sump depth, Ksat, fill time, void ratio, Sv, drawdown check
- **Bio/Dry Swale** (N-X): top/bot/avg area, media depth/porosity, gravel depth/porosity, sump depth, ponding depth, Ksat, Sv, drawdown, Sv_infil
- **Wet Swale** (Y-AA): pool volume, ED volume, Sv
- **Tree counts** (AB-AH): 6 tree types + total credit
- **Outputs** (AI-AM): Retention Multiplier, Rv Uncapped, Max BMP Credit, Rv Applied, Capped flag

Total: 39 columns.

### Data rows: 4..53. SDA compliance summary below.

### Key formulas (row r)

- **G Sv (PP):** `=IFERROR(IF(OR(D{r}="Permeable Pavement"),F{r}*G{r}*L{r},0),0)` — wait, SA × dₚ × n_reservoir; column positions are: F=SA, G=dₚ, I=sump_depth, L=void_ratio_from_params...

Rather than mapping all 39 cells here, use this convention: **the builder's test asserts formula substrings** (e.g., "`VLOOKUP(D{r}&E{r},PARAMS_BMP`") rather than exact strings. This keeps the test robust while verifying the key logic.

### BMP VLOOKUP key

The PARAMS_BMP table has columns: BMP Type | Sub-Type | n_media | n_gravel | n_reservoir | Ret.Mult | Max Drawdown. The lookup key is `BMP Type + Sub-Type` concatenated. Builder constructs an `IFS(D=…,E=…)` cascade for each needed param:

```
=IFS(
  AND(D{r}="Permeable Pavement",E{r}="Enhanced"), <value>,
  AND(D{r}="Permeable Pavement",E{r}="Underdrained Enhanced"), <value>,
  ...
)
```

Simpler: concatenate key and MATCH into PARAMS_BMP row:

```
=INDEX(PARAMS_BMP,MATCH(D{r}&"|"&E{r},INDEX(PARAMS_BMP,0,1)&"|"&INDEX(PARAMS_BMP,0,2),0),<col>)
```

But array formulas are brittle in openpyxl. Easier: use an auxiliary helper column, OR use nested IFs. For this plan: use `IFERROR(INDEX/MATCH(1/((PARAMS_BMP_type=D{r})*(PARAMS_BMP_subtype=E{r})),…),0)` style, OR fall back to explicit `IFS(AND(...),...)`.

**Decision:** emit explicit `IFS(AND(D{r}=t, E{r}=s), …)` cascades. 7 BMP sub-types, so 7-arm IFS. Verbose but readable and openpyxl-friendly.

### Column index map (for reference during implementation)

| Idx | Letter | Content | Zone |
|---|---|---|---|
| 1 | A | BMP Name | ID |
| 2 | B | SDA_ID | ID |
| 3 | C | CDA_ID | ID |
| 4 | D | BMP Type | ID |
| 5 | E | Sub-Type | ID |
| 6 | F | PP Surface Area Aₚ (SF) | PP input |
| 7 | G | PP Reservoir Depth dₚ (ft) | PP input |
| 8 | H | PP Sump Depth d_sump (ft) | PP input |
| 9 | I | PP Ksat (ft/day) | PP input |
| 10 | J | PP n_reservoir (auto from PARAMS) | PP calc |
| 11 | K | PP Sv (CF) = F×G×J | PP calc |
| 12 | L | PP Drawdown (days) = G/I | PP calc |
| 13 | M | PP Drawdown ≤ 2? | PP check |
| 14 | N | Bio SA_top (SF) | Bio input |
| 15 | O | Bio SA_bot (SF) | Bio input |
| 16 | P | Bio SA_avg = (N+O)/2 | Bio calc |
| 17 | Q | Bio d_media (ft) | Bio input |
| 18 | R | Bio n_media (auto) | Bio calc |
| 19 | S | Bio d_gravel (ft) | Bio input |
| 20 | T | Bio n_gravel (auto) | Bio calc |
| 21 | U | Bio d_pond (ft) | Bio input |
| 22 | V | Bio Ksat (ft/day) | Bio input |
| 23 | W | Bio Sv (CF) = P×(Q×R + S×T + U) | Bio calc |
| 24 | X | Bio Drawdown (days) = (Q+S)/V | Bio check |
| 25 | Y | Wet Swale Pool Volume (CF) | WS input |
| 26 | Z | Wet Swale ED Volume (CF) | WS input |
| 27 | AA | Wet Swale Sv = Y+Z | WS calc |
| 28 | AB | # Planted Small | Tree |
| 29 | AC | # Planted Large | Tree |
| 30 | AD | # Preserved Small | Tree |
| 31 | AE | # Preserved Large | Tree |
| 32 | AF | # Preserved Special | Tree |
| 33 | AG | # Preserved Heritage | Tree |
| 34 | AH | Tree Rv Total (CF) | Tree calc |
| 35 | AI | Sv Total (K + W + AA) | Output |
| 36 | AJ | Retention Multiplier (auto) | Output |
| 37 | AK | Rv Uncapped (CF) = AI × AJ + AH | Output |
| 38 | AL | Max BMP Credit (CF) — lookup CDA | Output |
| 39 | AM | Rv Applied (CF) = MIN(AK, AL) | Output |

## Files

- Create: `workbook/builders/bmp.py`
- Create: `tests/test_bmp.py`

## Steps

- [ ] **Step 1: Write failing test**

Create `tests/test_bmp.py`:

```python
import pytest
import openpyxl

from workbook.builders import params, project, sda, cda, bmp


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_sheet(w, n_rows=50)
    cda.build_cda_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    return w


def test_bmp_sheet_exists(wb):
    assert "BMP" in wb.sheetnames


def test_bmp_sheet_has_39_columns(wb):
    ws = wb["BMP"]
    # Header row at row 3 should have 39 non-None cells
    headers = [ws.cell(row=3, column=c).value for c in range(1, 40)]
    assert all(h is not None for h in headers), f"Missing headers: {headers}"


def test_bmp_type_dropdown(wb):
    ws = wb["BMP"]
    dvs = ws.data_validations.dataValidation
    type_dv = None
    for dv in dvs:
        if "D4" in str(dv.sqref):
            type_dv = dv
            break
    assert type_dv is not None
    for t in ["Permeable Pavement", "Bioretention", "Dry Swale", "Wet Swale"]:
        assert t in type_dv.formula1


def test_sda_cda_dropdowns_use_named_ranges(wb):
    ws = wb["BMP"]
    dvs = ws.data_validations.dataValidation
    sqref_formulas = [(str(dv.sqref), dv.formula1) for dv in dvs]
    assert any("B4" in s and "SDA_IDs" in f for s, f in sqref_formulas)
    assert any("C4" in s and "CDA_IDs" in f for s, f in sqref_formulas)


def test_pp_sv_formula(wb):
    ws = wb["BMP"]
    # K4 = PP Sv = F4 * G4 * J4
    f_val = ws.cell(row=4, column=11).value
    assert "F4" in f_val and "G4" in f_val and "J4" in f_val


def test_bio_sv_formula(wb):
    ws = wb["BMP"]
    # W4 = P4 * (Q4*R4 + S4*T4 + U4)
    f_val = ws.cell(row=4, column=23).value
    for sub in ["P4", "Q4", "R4", "S4", "T4", "U4"]:
        assert sub in f_val


def test_tree_rv_total_formula(wb):
    ws = wb["BMP"]
    # AH4 (col 34) = sum of (count × credit) — expect references to PARAMS_Trees or hardcoded credits
    f_val = ws.cell(row=4, column=34).value
    # 6 tree counts in AB:AG
    for col_letter in ["AB4", "AC4", "AD4", "AE4", "AF4", "AG4"]:
        assert col_letter in f_val


def test_retention_multiplier_lookup(wb):
    ws = wb["BMP"]
    # AJ4 (col 36) — retention multiplier from PARAMS by BMP Type + Sub-Type
    f_val = ws.cell(row=4, column=36).value
    assert "D4" in f_val
    assert "E4" in f_val
    assert "IFS" in f_val or "VLOOKUP" in f_val or "INDEX" in f_val


def test_rv_applied_is_min_capped(wb):
    ws = wb["BMP"]
    # AM4 (col 39) = MIN(AK4, AL4)
    f_val = ws.cell(row=4, column=39).value
    assert "MIN" in f_val
    assert "AK4" in f_val
    assert "AL4" in f_val


def test_max_bmp_credit_lookup_from_cda(wb):
    ws = wb["BMP"]
    # AL4 (col 38) — lookup CDA_ID in CDA summary to get Max BMP Credit
    f_val = ws.cell(row=4, column=38).value
    assert "C4" in f_val
    # References CDA sheet column D (Max BMP Credit) via VLOOKUP or INDEX/MATCH
    assert ("CDA" in f_val) or ("VLOOKUP" in f_val) or ("INDEX" in f_val)


def test_sda_compliance_summary_block(wb):
    ws = wb["BMP"]
    # Look for a "Compliance" or "SDA Compliance" header somewhere after row 53
    found = False
    for r in range(54, 100):
        v = ws.cell(row=r, column=1).value
        if v and ("Compliance" in str(v) or "SDA" in str(v)):
            found = True
            break
    assert found
```

- [ ] **Step 2: Run test — expect failure**

```bash
pytest tests/test_bmp.py -v
```

- [ ] **Step 3: Write `workbook/builders/bmp.py`**

```python
"""Build the BMP sheet — one row per BMP, all parameter columns, auto outputs."""
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


BMP_TYPES = ["Permeable Pavement", "Bioretention", "Dry Swale", "Wet Swale",
             "Planted Trees", "Preserve Trees"]

# BMP (Type, Sub-Type) → PARAMS_BMP row index (1-based within the named range).
BMP_PARAM_ROWS = [
    ("Permeable Pavement", "Enhanced",               1),
    ("Permeable Pavement", "Underdrained Enhanced",  2),
    ("Bioretention",       "Standard",               3),
    ("Bioretention",       "Enhanced",               4),
    ("Bioretention",       "Enhanced w/ Underdrain", 5),
    ("Dry Swale",          "—",                      6),
    ("Wet Swale",          "—",                      7),
]

HEADERS = [
    # ID (1-5)
    "BMP Name", "SDA_ID", "CDA_ID", "BMP Type", "Sub-Type",
    # PP (6-13)
    "PP Surface Area Aₚ (SF)", "PP Reservoir dₚ (ft)",
    "PP Sump d_sump (ft)", "PP Ksat (ft/day)",
    "PP n_reservoir", "PP Sv (CF)", "PP Drawdown (days)", "PP Drawdown ≤ 2?",
    # Bio/Dry Swale (14-24)
    "Bio SA_top (SF)", "Bio SA_bot (SF)", "Bio SA_avg (SF)",
    "Bio d_media (ft)", "Bio n_media", "Bio d_gravel (ft)", "Bio n_gravel",
    "Bio d_pond (ft)", "Bio Ksat (ft/day)",
    "Bio Sv (CF)", "Bio Drawdown (days)",
    # Wet Swale (25-27)
    "WS Pool Vol (CF)", "WS ED Vol (CF)", "WS Sv (CF)",
    # Trees (28-34)
    "# Planted Small", "# Planted Large",
    "# Preserved Small", "# Preserved Large",
    "# Preserved Special", "# Preserved Heritage", "Tree Rv Total (CF)",
    # Outputs (35-39)
    "Sv Total (CF)", "Ret. Multiplier", "Rv Uncapped (CF)",
    "Max BMP Credit (CF)", "Rv Applied (CF)",
]


def _ifs_bmp_param(cell_type: str, cell_sub: str, param_col: int) -> str:
    """Return an IFS formula pulling `param_col` from PARAMS_BMP for the given (type, sub-type)."""
    arms = []
    for t, s, idx in BMP_PARAM_ROWS:
        condition = f'AND({cell_type}="{t}",{cell_sub}="{s}")'
        value = f"INDEX(PARAMS_BMP,{idx},{param_col})"
        arms.append(f"{condition},{value}")
    arms.append("TRUE,\"\"")
    return "=IFERROR(IFS(" + ",".join(arms) + "),\"\")"


def build_bmp_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("BMP")
    ws.sheet_view.showGridLines = False

    for i in range(1, 40):
        styles.cw(ws, i, 12)

    styles.hdr(ws, 1, 1, "BMP — Best Management Practices (sizing + retention credits)",
               styles.BH, span=39)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 48

    data_start = 4
    data_end = data_start + n_rows - 1

    for r in range(data_start, data_end + 1):
        # ID columns A-E (input)
        for c in range(1, 6):
            styles.inp(ws, r, c)
        # PP input columns F-I
        for c in range(6, 10):
            styles.inp(ws, r, c)
        # PP n_reservoir (col 10 / J) — from PARAMS, col 5 in PARAMS_BMP (n_reservoir)
        styles.calc_c(ws, r, 10, _ifs_bmp_param(f"D{r}", f"E{r}", 5))
        # PP Sv (col 11 / K) = F × G × J
        styles.calc_c(ws, r, 11, f'=IFERROR(F{r}*G{r}*J{r},0)')
        # PP Drawdown (col 12 / L) = G / I
        styles.calc_c(ws, r, 12, f'=IFERROR(IF(I{r}=0,"",G{r}/I{r}),"")')
        # PP Drawdown check (col 13 / M)
        styles.calc_c(ws, r, 13, f'=IFERROR(IF(L{r}="","",IF(L{r}<=2,"✓","✗")),"")')

        # Bio input columns N, O (14, 15)
        for c in (14, 15):
            styles.inp(ws, r, c)
        # Bio SA_avg (P, 16) = (N+O)/2
        styles.calc_c(ws, r, 16, f'=IFERROR((N{r}+O{r})/2,0)')
        # Bio d_media (Q, 17) input
        styles.inp(ws, r, 17)
        # Bio n_media (R, 18) from PARAMS, col 3
        styles.calc_c(ws, r, 18, _ifs_bmp_param(f"D{r}", f"E{r}", 3))
        # Bio d_gravel (S, 19) input
        styles.inp(ws, r, 19)
        # Bio n_gravel (T, 20) from PARAMS, col 4
        styles.calc_c(ws, r, 20, _ifs_bmp_param(f"D{r}", f"E{r}", 4))
        # Bio d_pond (U, 21) input
        styles.inp(ws, r, 21)
        # Bio Ksat (V, 22) input
        styles.inp(ws, r, 22)
        # Bio Sv (W, 23) = P × (Q*R + S*T + U)
        styles.calc_c(ws, r, 23, f'=IFERROR(P{r}*(Q{r}*R{r}+S{r}*T{r}+U{r}),0)')
        # Bio Drawdown (X, 24) = (Q+S)/V
        styles.calc_c(ws, r, 24, f'=IFERROR(IF(V{r}=0,"",(Q{r}+S{r})/V{r}),"")')

        # Wet Swale Pool, ED (Y 25, Z 26) input
        styles.inp(ws, r, 25)
        styles.inp(ws, r, 26)
        # Wet Swale Sv (AA 27)
        styles.calc_c(ws, r, 27, f'=IFERROR(Y{r}+Z{r},0)')

        # Tree counts AB-AG (28-33) input
        for c in range(28, 34):
            styles.inp(ws, r, c)
        # Tree Rv Total (AH, 34) = Σ count × credit; credits from PARAMS_Trees col 3 rows 1-6
        tree_formula = (
            f'=IFERROR('
            f'AB{r}*INDEX(PARAMS_Trees,1,3)'
            f'+AC{r}*INDEX(PARAMS_Trees,2,3)'
            f'+AD{r}*INDEX(PARAMS_Trees,3,3)'
            f'+AE{r}*INDEX(PARAMS_Trees,4,3)'
            f'+AF{r}*INDEX(PARAMS_Trees,5,3)'
            f'+AG{r}*INDEX(PARAMS_Trees,6,3)'
            f',0)'
        )
        styles.calc_c(ws, r, 34, tree_formula)

        # Sv Total (AI, 35) = K + W + AA
        styles.calc_c(ws, r, 35, f'=IFERROR(K{r}+W{r}+AA{r},0)')
        # Retention Multiplier (AJ, 36) from PARAMS col 6
        styles.calc_c(ws, r, 36, _ifs_bmp_param(f"D{r}", f"E{r}", 6))
        # Rv Uncapped (AK, 37) = AI × AJ + AH
        styles.calc_c(ws, r, 37, f'=IFERROR(AI{r}*AJ{r}+AH{r},0)')
        # Max BMP Credit (AL, 38) — VLOOKUP CDA_ID in CDA summary; CDA summary col D holds credit.
        # CDA summary data rows: start at (CDA data_end + 5), 10 rows.
        # For simplicity: use VLOOKUP against the full CDA sheet column A (summary + data).
        # We assume CDA summary CDA-1..CDA-10 are at known rows — reference by named range would be cleaner.
        styles.calc_c(ws, r, 38,
            f'=IFERROR(VLOOKUP(C{r},\'CDA\'!$A$57:$D$66,4,FALSE),0)')
        # Rv Applied (AM, 39) = MIN(AK, AL) with cap flag
        styles.calc_c(ws, r, 39, f'=IFERROR(IF(AL{r}=0,AK{r},MIN(AK{r},AL{r})),0)')

    # Data validations.
    dv_sda = DataValidation(type="list", formula1="=SDA_IDs",
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_sda)
    dv_sda.sqref = f"B{data_start}:B{data_end}"

    dv_cda = DataValidation(type="list", formula1="=CDA_IDs",
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_cda)
    dv_cda.sqref = f"C{data_start}:C{data_end}"

    dv_type = DataValidation(type="list", formula1='"' + ",".join(BMP_TYPES) + '"',
                             allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_type)
    dv_type.sqref = f"D{data_start}:D{data_end}"

    # ── SDA Compliance Summary ──
    sum_header = data_end + 3
    styles.hdr(ws, sum_header, 1,
               "SDA Compliance Summary — Σ Rv Applied vs. SWRv Required per SDA",
               styles.BH, span=5)
    sum_hdrs = ["SDA_ID", "SWRv Required (CF)", "Rv Provided (CF)",
                "Surplus / Deficit (CF)", "Status"]
    sum_row = sum_header + 1
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    for i in range(10):
        r = sum_row + 1 + i
        styles.calc_c(ws, r, 1, f"='SDA'!A{57+i}")  # mirrors SDA summary rows
        styles.calc_c(ws, r, 2, f"='SDA'!J{57+i}")   # SWRv Required
        styles.calc_c(ws, r, 3,
            f'=SUMIFS($AM${data_start}:$AM${data_end},$B${data_start}:$B${data_end},A{r})')
        styles.calc_c(ws, r, 4, f'=IFERROR(C{r}-B{r},"")')
        styles.calc_c(ws, r, 5, f'=IFERROR(IF(B{r}=0,"—",IF(D{r}>=0,"✓","✗")),"")')
```

- [ ] **Step 4: Run test — expect pass**

```bash
pytest tests/test_bmp.py -v
```

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/bmp.py tests/test_bmp.py
git commit -m "swm-workbook: add BMP sheet with per-type Sv/Rv formulas and compliance summary"
```
