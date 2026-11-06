# Workbook Template Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the DOEE EISA 438 workbook template per the 2026-11-05 design spec: new BMP schema (81 cols, underdrain-aware, swale method toggle, SA:CDA checks), full 2020 DOEE detention methodology, new TR-55 peak discharge + Tc path sheets, Correct MEP HSG list.

**Architecture:** Phase A — Python workbook generator only. All work in `workbook/builders/*.py` plus the `workbook/sample*.py` fixture scripts. Tests live under `tests/`. Browser apps (parse.mjs, populator, education) are deferred to a follow-up plan.

**Tech Stack:** Python 3.11, openpyxl, pytest. Excel 2016 compat for all formulas (no IFS, no TEXTJOIN).

**Spec:** `docs/superpowers/specs/2026-11-05-workbook-template-overhaul-design.md`

**Reference Excel samples** (temporary stage copies; delete after plan complete):
- `docs/temp/modified_template_wip_sample_BMP_TAB.xlsx` — user's WIP BMP tab with the 81-col layout, underdrain fields, reservoir gravel formula. Carried verbatim per Task 3-9.
- `docs/temp/bmp_calc_sample_for_swalepond_sizing.xlsx` — old PB-9 bio + swale sizing calculator. Source of "Actual" swale method (uncapped wedge) in Task 9 and of the SA:CDA 3-10% target used in `PARAMS_BMPSizingRules` (Task 1).

---

### Task 1: Extend PARAMS sheet — 100-yr storm, PARAMS_TR55, PARAMS_BMPSizingRules

**Files:**
- Modify: `workbook/builders/params.py`
- Test: `tests/test_params.py`

- [ ] **Step 1: Write failing tests for new named ranges**

Add to `tests/test_params.py`:

```python
def test_params_detention_has_100yr_row(wb):
    ws = wb["PARAMS"]
    # 100-year row expected at row 57 (after 2-year row 55, 15-year row 56)
    assert ws.cell(row=57, column=1).value == "100-year"
    assert ws.cell(row=57, column=2).value == 8.34


def test_params_tr55_named_range_defined(wb):
    assert "PARAMS_TR55" in [n.name for n in wb.defined_names.definedName]


def test_params_tr55_has_six_iap_rows(wb):
    ws = wb["PARAMS"]
    # TR-55 block at rows 74-80: header row 74, col headers 75, data 76-81
    iap_values = [ws.cell(row=76 + i, column=1).value for i in range(6)]
    assert iap_values == [0.10, 0.30, 0.35, 0.40, 0.45, 0.50]


def test_params_tr55_coefficients_at_iap_0_30(wb):
    ws = wb["PARAMS"]
    # Row 77 = Ia/P 0.30; C0 col 2, C1 col 3, C2 col 4
    assert ws.cell(row=77, column=2).value == pytest.approx(2.46532, abs=1e-5)
    assert ws.cell(row=77, column=3).value == pytest.approx(-0.62257, abs=1e-5)
    assert ws.cell(row=77, column=4).value == pytest.approx(-0.11657, abs=1e-5)


def test_params_bmp_sizing_rules_named_range_defined(wb):
    assert "PARAMS_BMPSizingRules" in [n.name for n in wb.defined_names.definedName]


def test_params_bmp_sizing_rules_rows(wb):
    ws = wb["PARAMS"]
    # Sizing rules block at rows 83-92: header row 83, col headers 84, data 85-91 (7 sub-types)
    subtype_labels = [ws.cell(row=85 + i, column=1).value for i in range(7)]
    assert "Bio Standard" in subtype_labels
    assert "Dry Swale" in subtype_labels
    # Bio Standard row: SA:CDA min=0.03, max=0.10, min_pond=0.5, min_media=1.5,
    # min_gravel=1.0, min_freeboard=0.25, max_slope=None, min_cleanouts=1
    bio_std_row = 85
    assert ws.cell(row=bio_std_row, column=2).value == 0.03  # SA:CDA min
    assert ws.cell(row=bio_std_row, column=3).value == 0.10  # SA:CDA max
    assert ws.cell(row=bio_std_row, column=4).value == 0.5   # min ponding
    assert ws.cell(row=bio_std_row, column=5).value == 1.5   # min media
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_params.py -v -k "100yr or tr55 or sizing_rules"`
Expected: FAIL (all new tests — 100-year row doesn't exist, PARAMS_TR55 undefined, etc.)

- [ ] **Step 3: Extend params.py**

In `workbook/builders/params.py`, replace the Detention block starting at line 128 with a 3-row version including 100-year. Then append TR-55 and SizingRules sections after Ksat (currently ending at row 71). Starting at row 73:

```python
    # ── Section 7: Detention storm depths (extended with 100-year) ──
    styles.hdr(ws, 53, 1, "Detention Storm Depths (DC, from NRCS TR-55)",
               styles.BS, span=7)
    for i, h in enumerate(["Storm", "Depth (in)"], 1):
        styles.lbl(ws, 54, i, h, styles.BL, bold=True)
    for i, (name, d) in enumerate([("2-year", 3.14), ("15-year", 5.23), ("100-year", 8.34)]):
        r = 55 + i
        styles.lbl(ws, r, 1, name)
        styles.lbl(ws, r, 2, d, styles.GRY)

    # ... (existing Detention CN + Ksat sections unchanged — rows 59-71) ...

    # ── Section 10: TR-55 Type II Unit Peak Discharge Coefficients ──
    styles.hdr(ws, 74, 1, "TR-55 Type II qu Coefficients (log10 eq)", styles.BS, span=7)
    for i, h in enumerate(["Ia/P", "C0", "C1", "C2"], 1):
        styles.lbl(ws, 75, i, h, styles.BL, bold=True)
    tr55_rows = [
        (0.10, 2.55323, -0.61512, -0.16403),
        (0.30, 2.46532, -0.62257, -0.11657),
        (0.35, 2.41896, -0.61594, -0.08820),
        (0.40, 2.36409, -0.59857, -0.05621),
        (0.45, 2.29238, -0.57005, -0.02281),
        (0.50, 2.20282, -0.51599, -0.01259),
    ]
    for i, row in enumerate(tr55_rows):
        r = 76 + i
        for j, v in enumerate(row):
            styles.lbl(ws, r, j + 1, v, styles.GRY)

    # ── Section 11: BMP Sizing Rules ──
    styles.hdr(ws, 83, 1, "BMP Sizing Rules (SA:CDA, min depths, freeboard, slope)",
               styles.BS, span=9)
    for i, h in enumerate([
        "Sub-type", "SA:CDA min", "SA:CDA max", "Min pond (ft)",
        "Min media (ft)", "Min gravel (ft)", "Min freeboard (ft)",
        "Max slope", "Min cleanouts",
    ], 1):
        styles.lbl(ws, 84, i, h, styles.BL, bold=True)
    sizing_rows = [
        ("Bio Standard",               0.03, 0.10, 0.5,  1.5, 1.0, 0.25, None, 1),
        ("Bio Enhanced",               0.03, 0.10, 0.5,  2.0, 1.0, 0.25, None, 1),
        ("Bio Enhanced w/ Underdrain", 0.03, 0.10, 0.5,  2.0, 1.0, 0.25, None, 1),
        ("Dry Swale",                  0.03, 0.10, 0.167, 1.5, 1.0, 0.25, 0.04, 1),
        ("PP Enhanced",                None, None, None, None, 1.0, None, None, None),
        ("PP Underdrained",            None, None, None, None, 1.0, None, None, None),
        ("Wet Swale",                  None, None, None, None, None, None, None, None),
    ]
    for i, row in enumerate(sizing_rows):
        r = 85 + i
        for j, v in enumerate(row):
            if v is None:
                styles.locked(ws, r, j + 1, "—")
            else:
                styles.lbl(ws, r, j + 1, v, styles.GRY)
```

Update `_add_named_ranges`:

```python
    ranges = {
        # ... existing entries ...
        "PARAMS_Detention":       "'PARAMS'!$A$55:$B$57",   # extended for 100-yr
        "PARAMS_TR55":            "'PARAMS'!$A$76:$D$81",
        "PARAMS_BMPSizingRules":  "'PARAMS'!$A$85:$I$91",
    }
```

Add the new section header rows 74 and 83 to `section_header_rows` tuple for the top-divider pass.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_params.py -v`
Expected: PASS (all params tests, old + new)

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/params.py tests/test_params.py
git commit -m "params: add 100-yr storm, TR-55 coefficients, BMP sizing rules"
```

---

### Task 2: Add new fill color tokens + sub-header helper to styles

**Files:**
- Modify: `workbook/styles.py`
- Test: `tests/test_styles.py`

- [ ] **Step 1: Write failing test**

Add to `tests/test_styles.py`:

```python
from workbook import styles


def test_new_color_tokens_defined():
    # New tints for BMP row-5 sub-header tags
    assert styles.CDA_TINT  == "FCE4D6"   # orange-ish, AUTO ← CDA
    assert styles.PARAMS_TINT == "E2EFDA" # pale green, AUTO ← PARAMS (reuse GL)
    assert styles.DROPDOWN_TINT == "FFE699"  # amber, DROPDOWN
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_styles.py::test_new_color_tokens_defined -v`
Expected: FAIL (AttributeError on `styles.CDA_TINT`)

- [ ] **Step 3: Add color constants**

In `workbook/styles.py`, add below `FAIL = "F8CBAD"` line:

```python
# BMP row-5 sub-header tag tints (source-of-input markers)
CDA_TINT      = "FCE4D6"   # AUTO ← CDA
PARAMS_TINT   = "E2EFDA"   # AUTO ← PARAMS (same as GL)
DROPDOWN_TINT = "FFE699"   # DROPDOWN cells
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_styles.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add workbook/styles.py tests/test_styles.py
git commit -m "styles: add BMP row-5 tag color tints"
```

---

### Task 3: BMP sheet — new 81-col schema skeleton (header rows, zones, legend)

**Files:**
- Modify: `workbook/builders/bmp.py`
- Test: `tests/test_bmp_schema.py` (new)

- [ ] **Step 1: Write failing schema tests**

Create `tests/test_bmp_schema.py`:

```python
"""BMP sheet structural tests — 81 cols, 5-row header, zone banners, row-5 tags."""
import pytest
import openpyxl

from workbook.builders import params, project, sda, cda, bmp


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    return w


def test_bmp_has_81_cols(wb):
    ws = wb["BMP"]
    # Column CC (col 81) should have a header at row 4
    assert ws.cell(row=4, column=81).value is not None


def test_bmp_zone_banners_at_row_3(wb):
    ws = wb["BMP"]
    # Row 3 cells at start of each zone must contain the zone label
    assert "ID" in (ws.cell(row=3, column=1).value or "")  # A3: ID
    assert "Permeable Pavement" in (ws.cell(row=3, column=6).value or "")
    assert "Bioretention" in (ws.cell(row=3, column=14).value or "") or \
           "Bio" in (ws.cell(row=3, column=14).value or "")
    assert "Tree" in (ws.cell(row=3, column=34).value or "")
    assert "Output" in (ws.cell(row=3, column=41).value or "") or \
           "Storage" in (ws.cell(row=3, column=41).value or "")
    assert "Check" in (ws.cell(row=3, column=47).value or "") or \
           "Sizing" in (ws.cell(row=3, column=47).value or "")
    assert "Bioretention" in (ws.cell(row=3, column=49).value or "") or \
           "Supplemental" in (ws.cell(row=3, column=49).value or "")
    assert "Swale" in (ws.cell(row=3, column=58).value or "")


def test_bmp_row_5_has_input_auto_tags(wb):
    ws = wb["BMP"]
    # Row 5 is sub-header tag row; must have "USER" or "AUTO" tags
    tag_a = ws.cell(row=5, column=1).value  # BMP Name column
    assert tag_a in ("USER", "AUTO", "AUTO ← CDA", "AUTO ← PARAMS",
                     "AUTO + USER OK", "DROPDOWN")


def test_bmp_data_starts_at_row_6(wb):
    ws = wb["BMP"]
    # Row 6 col 11 (PP Sv, K6) should contain a formula referencing row 6
    k6 = ws.cell(row=6, column=11).value
    assert k6 is not None
    assert isinstance(k6, str) and k6.startswith("=")
    # Formula should reference F6, G6, J6 (same row)
    assert "F6" in k6 and "G6" in k6 and "J6" in k6


def test_bmp_data_ends_at_row_55(wb):
    ws = wb["BMP"]
    # Row 55 (last data row) should have a formula; row 56 should be blank or
    # start of summary header
    k55 = ws.cell(row=55, column=11).value
    assert isinstance(k55, str) and k55.startswith("=")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_bmp_schema.py -v`
Expected: FAIL — 81 cols not reached, row 5 tags absent, data still starts row 4.

- [ ] **Step 3: Rewrite bmp.py skeleton**

Replace `workbook/builders/bmp.py` zone definitions and `build_bmp_sheet` body. Key changes (full replacement; keep `_cda_dominant_hsg_formula`, `_ifs_bmp_param`, `_apply_zone_dividers`, `BMP_TYPES`, `BMP_PARAM_ROWS` helpers from existing file):

```python
# Zone divider end-column indices (updated for 81-col layout)
_ZONE_DIVIDER_COLS = (5, 13, 30, 33, 40, 46, 48, 57, 78, 81)

# CDA data range (unchanged)
CDA_D1 = 4
CDA_DL = 53

# Row 3 zone banners
ZONE_BANNERS = [
    (1,  5,  "ID"),
    (6,  13, "Permeable Pavement Storage Details"),
    (14, 30, "Bioretention / Bioswale Storage Details"),
    (31, 33, "Wet Swale"),
    (34, 40, "Tree Planting and Tree Preservation"),
    (41, 46, "Storage Volume Information (Outputs)"),
    (47, 48, "Sizing Checks"),
    (49, 57, "Supplemental Bioretention Info"),
    (58, 78, "Supplemental Swale Info"),
    (79, 81, "Swale Pond Method + Sv"),
]

# Row 4 headers, 81 entries A..CC
HEADERS = [
    # A-E: ID (5)
    "BMP Name", "SDA_ID", "CDA_ID", "BMP Type", "Sub-Type",
    # F-M: Permeable Pavement (8)
    "PP SA Aₚ (SF)", "PP dp (ft)", "PP d_sump (ft)", "PP Ksat (ft/d)",
    "PP n_reservoir", "PP Sv (CF)", "PP Drawdown (d)", "PP ≤ 2d?",
    # N-AD: Bio/Dry Swale stack (17)
    "SA top (SF)", "SA bot (SF)", "SA avg (SF)",
    "d_topsoil (ft)", "d_media (ft)", "n_media",
    "d_choker (ft)", "d_gravel (ft)",
    "Underdrain", "UD Ø (in)", "UD headspace (ft)",
    "d_grv below UD (ft)", "n_gravel", "d_pond (ft)",
    "Ksat (ft/d)", "Bio Sv (CF)", "Drawdown (d)",
    # AE-AG: Wet Swale (3)
    "WS Pool Vol (CF)", "WS ED Vol (CF)", "WS Sv (CF)",
    # AH-AN: Trees (7)
    "# Planted Small", "# Planted Large",
    "# Preserved Small", "# Preserved Large",
    "# Preserved Special", "# Preserved Heritage",
    "Tree Rv Total (CF)",
    # AO-AT: Outputs (6)
    "Sv Total (CF)", "Ret. Multiplier", "Rv Uncapped (CF)",
    "Max BMP Credit (CF)", "Rv Applied (CF)", "Rv Reservoir (CF)",
    # AU-AV: Checks (2)
    "SA:CDA %", "Sizing Check",
    # AW-BE: Supplemental Bioretention (9)
    "Bio surface elev (ft)", "Bio ponding elev (ft)",
    "15-yr head (ft)", "Min sidewalk elev (ft)",
    "Min curb-cut elev (ft)", "UD invert (ft)",
    "Bottom invert (ft)", "Freeboard (ft)",
    "# obs wells / cleanouts",
    # BF-BZ: Supplemental Swale (21)
    "Swale L_s (ft)", "Swale w_s (ft)", "Side slope (H:V)",
    "Top-bank US (ft)", "Top-bank DS (ft)",
    "Top-grade US (ft)", "Top-grade DS (ft)",
    "Curb-cut US (ft)", "Curb-cut DS (ft)",
    "Sidewalk US (ft)", "Sidewalk DS (ft)",
    "Invert US (ft)", "Invert DS (ft)",
    "UD invert (ft)", "15-yr head (ft)",
    "H_cd (ft)", "X_cd (ft)",
    "# obs wells / cleanouts",
    "Slope S (ft/ft)", "N_cd", "Freeboard (ft)",
    # CA-CC: Swale Method + Sv (3)
    "Swale Method", "Sv DOEE (CF)", "Sv Actual (CF)",
]
assert len(HEADERS) == 81, f"Expected 81 headers, got {len(HEADERS)}"


# Row 5 INPUT/AUTO tags, 81 entries (same order as HEADERS)
ROW5_TAGS = [
    # A-E
    "USER", "DROPDOWN", "DROPDOWN", "DROPDOWN", "DROPDOWN",
    # F-M (PP)
    "USER", "USER", "USER", "AUTO + USER OK", "AUTO ← PARAMS", "AUTO", "AUTO", "AUTO",
    # N-AD (Bio/Swale stack)
    "USER", "AUTO ← CDA", "AUTO",
    "USER", "USER", "AUTO ← PARAMS",
    "USER", "USER",
    "DROPDOWN", "USER", "USER",
    "AUTO", "AUTO ← PARAMS", "USER",
    "AUTO + USER OK", "AUTO", "AUTO",
    # AE-AG (Wet Swale)
    "USER", "USER", "AUTO",
    # AH-AN (Trees)
    "USER", "USER", "USER", "USER", "USER", "USER", "AUTO",
    # AO-AT (Outputs)
    "AUTO", "AUTO ← PARAMS", "AUTO", "AUTO ← CDA", "AUTO", "AUTO",
    # AU-AV (Checks)
    "AUTO", "AUTO",
    # AW-BE (Bio Supp)
    "USER", "AUTO", "USER", "USER", "USER", "AUTO", "AUTO", "AUTO", "USER",
    # BF-BZ (Swale Supp)
    "USER", "USER", "USER",
    "USER", "USER", "USER", "USER",
    "USER", "USER", "USER", "USER",
    "USER", "USER",
    "USER", "USER",
    "USER", "USER",
    "USER",
    "AUTO", "AUTO", "AUTO",
    # CA-CC (Swale method + Sv)
    "DROPDOWN", "AUTO", "AUTO",
]
assert len(ROW5_TAGS) == 81


TAG_FILL = {
    "USER":            "INP",            # yellow
    "AUTO":            "CALC",           # blue
    "AUTO ← CDA":      "CDA_TINT",       # orange
    "AUTO ← PARAMS":   "PARAMS_TINT",    # pale green
    "AUTO + USER OK":  "INP",            # yellow (overridable default)
    "DROPDOWN":        "DROPDOWN_TINT",  # amber
}


def _apply_sub_header_tag(ws, row: int, col: int, tag: str) -> None:
    fill_attr = TAG_FILL[tag]
    cell = ws.cell(row=row, column=col, value=tag)
    cell.fill = styles.fill(getattr(styles, fill_attr))
    cell.font = styles.fnt(bold=True, sz=8)
    cell.alignment = styles.ctr()
    cell.border = styles.bord()
```

Then in `build_bmp_sheet(wb, n_rows=50)`:

```python
def build_bmp_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("BMP")
    ws.sheet_view.showGridLines = False

    # Column widths: default 12, wider for first 5 and output label cols
    for i in range(1, 82):
        styles.cw(ws, i, 12)
    styles.cw(ws, 1,  18)   # BMP Name
    styles.cw(ws, 4,  20)   # BMP Type
    styles.cw(ws, 5,  22)   # Sub-Type
    styles.cw(ws, 48, 24)   # Sizing Check (wider for text output)

    # Row 1: title banner (spans all 81 cols)
    styles.hdr(ws, 1, 1,
               "BMP — Best Management Practices (sizing + retention credits)",
               styles.BH, span=81)
    ws.row_dimensions[1].height = 24

    # Row 2: legend bar (text-only, single wide cell)
    legend_text = (
        "LEGEND  —  [■ yellow] USER INPUT   "
        "[■ blue] AUTO-CALC   "
        "[■ orange] AUTO ← CDA   "
        "[■ pale green] AUTO ← PARAMS   "
        "[▼ amber] DROPDOWN"
    )
    styles.lbl(ws, 2, 1, legend_text, styles.WARN, span=81)
    ws.row_dimensions[2].height = 22

    # Row 3: zone banners
    for start, end, text in ZONE_BANNERS:
        styles.hdr(ws, 3, start, text, styles.BS, span=end)
    ws.row_dimensions[3].height = 22

    # Row 4: column headers
    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 4, i, h, styles.BL, white=False)
    ws.row_dimensions[4].height = 42

    # Row 5: INPUT/AUTO tags
    for i, tag in enumerate(ROW5_TAGS, 1):
        _apply_sub_header_tag(ws, 5, i, tag)
    ws.row_dimensions[5].height = 16

    # Data rows 6 to 55
    data_start = 6
    data_end = data_start + n_rows - 1   # 55

    # TODO: formulas populated in subsequent tasks (Tasks 4-9)
    # For now, just place blank input cells so row 6 and 55 have at least
    # one non-None cell for the schema tests to see shape.
    for r in range(data_start, data_end + 1):
        for c in range(1, 82):
            styles.inp(ws, r, c)
        # Placeholder PP Sv formula at col 11 so test_bmp_data_starts_at_row_6 sees it
        styles.calc_c(ws, r, 11, f"=IFERROR(F{r}*G{r}*J{r},0)")

    # Zone dividers on header rows and data rows
    _apply_zone_dividers(ws, 3, data_end)
```

Note: this task only lays the skeleton. Formulas are filled in Tasks 4-9. The placeholder PP Sv on col 11 is enough for the schema test.

Delete the old `HEADERS` list and `build_bmp_sheet` body; keep the helper functions (`_cda_dominant_hsg_formula`, `_ifs_bmp_param`, `_apply_zone_dividers`) at module scope.

- [ ] **Step 4: Run tests to verify schema passes**

Run: `pytest tests/test_bmp_schema.py -v`
Expected: PASS all 5 schema tests.

Also run: `pytest tests/test_bmp.py -v`
Expected: Most will FAIL because they still assume 39-col row-4 schema. That's expected — they get updated in Tasks 4-9 as formulas land. Leave failing for now.

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/bmp.py tests/test_bmp_schema.py
git commit -m "bmp: rewrite sheet skeleton to 81 cols with 5-row header + zone banners"
```

---

### Task 4: BMP formulas — PP + Bio/Swale stack (cols F-AD)

**Files:**
- Modify: `workbook/builders/bmp.py`
- Modify: `tests/test_bmp.py` (update row refs 4→6, add WIP-formula tests)

- [ ] **Step 1: Write failing tests for new stack formulas**

Add to `tests/test_bmp.py` (or create new `tests/test_bmp_stack.py`):

```python
def test_bio_sa_bot_auto_pulled_from_cda(wb):
    # Col O = SA_bot, should SUMIFS from CDA_Proposed by SDA_ID + CDA_ID + "BMP"
    ws = wb["BMP"]
    o6 = ws.cell(row=6, column=15).value
    assert o6.startswith("=")
    assert "CDA_Proposed" in o6
    assert '"BMP"' in o6
    assert "B6" in o6 and "C6" in o6


def test_bio_reservoir_portion_formula(wb):
    # Col Y (col 25) = reservoir gravel depth under underdrain
    # = IF(V="Y", MAX(0, U - X - W/12), U)
    ws = wb["BMP"]
    y6 = ws.cell(row=6, column=25).value
    assert y6.startswith("=")
    assert 'V6="Y"' in y6 or "V6=\"Y\"" in y6
    for ref in ["U6", "X6", "W6"]:
        assert ref in y6


def test_bio_sv_uses_wip_formula(wb):
    # Col AC (col 29) = Bio Sv = O*(R*S + U*Z) + P*AA
    ws = wb["BMP"]
    ac6 = ws.cell(row=6, column=29).value
    for ref in ["O6", "R6", "S6", "U6", "Z6", "P6", "AA6"]:
        assert ref in ac6


def test_bio_ksat_enhanced_sub_types(wb):
    # Col AB (col 28) = Bio Ksat, Enhanced + Enhanced w/ Underdrain → VLOOKUP, else 0
    ws = wb["BMP"]
    ab6 = ws.cell(row=6, column=28).value
    assert "Enhanced" in ab6
    assert "Enhanced w/ Underdrain" in ab6
    assert "PARAMS_Ksat" in ab6
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_bmp.py -v -k "sa_bot or reservoir or wip_formula or ksat_enhanced"`
Expected: FAIL (formulas don't exist yet in the skeleton).

- [ ] **Step 3: Implement PP + Bio stack formulas**

In `build_bmp_sheet`, replace the data-row placeholder loop with the real formula population. Write a dedicated `_populate_pp_bio_stack(ws, r)` helper. All column indices use the new 81-col layout:

```python
def _populate_pp_bio_stack(ws, r: int) -> None:
    """Populate PP (F-M) and Bio/Swale stack (N-AD) for row r."""
    # ── A-E: ID input cells ──
    for c in range(1, 6):
        styles.inp(ws, r, c)

    # ── F-H: PP SA, dp, sump — USER ──
    for c in range(6, 9):
        styles.inp(ws, r, c)

    # ── I: PP Ksat — AUTO + USER OK (default from HSG, overridable) ──
    pp_ksat = (
        f"=IFERROR("
        f"IF(OR(E{r}=\"Enhanced\",E{r}=\"Underdrained Enhanced\"),"
        f"VLOOKUP({_cda_dominant_hsg_formula(f'C{r}')},PARAMS_Ksat,2,FALSE),"
        f"0),0)"
    )
    styles.inp(ws, r, 9)
    ws.cell(row=r, column=9).value = pp_ksat

    # ── J: PP n_reservoir ← PARAMS_BMP col 5 ──
    styles.calc_c(ws, r, 10, _ifs_bmp_param(f"D{r}", f"E{r}", 5))

    # ── K: PP Sv = F*G*J ──
    styles.calc_c(ws, r, 11, f"=IFERROR(F{r}*G{r}*J{r},0)")

    # ── L: PP Drawdown = G/I ──
    styles.calc_c(ws, r, 12, f'=IFERROR(IF(I{r}=0,"",G{r}/I{r}),"")')

    # ── M: PP Drawdown ≤ 2? ──
    styles.calc_c(ws, r, 13,
        f'=IFERROR(IF(L{r}="","",IF(L{r}<=2,"✓","✗")),"")')

    # ── N: SA top — USER ──
    styles.inp(ws, r, 14)

    # ── O: SA bot — AUTO ← CDA (SUMIFS by SDA + CDA + "BMP") ──
    o_formula = (
        f"=SUMIFS('CDA_Proposed'!$E${CDA_D1}:$E${CDA_DL},"
        f"'CDA_Proposed'!$C${CDA_D1}:$C${CDA_DL},\"BMP\","
        f"'CDA_Proposed'!$B${CDA_D1}:$B${CDA_DL},B{r},"
        f"'CDA_Proposed'!$A${CDA_D1}:$A${CDA_DL},C{r})"
    )
    styles.calc_c(ws, r, 15, o_formula)
    ws.cell(row=r, column=15).fill = styles.fill(styles.CDA_TINT)

    # ── P: SA avg = (N+O)/2 ──
    styles.calc_c(ws, r, 16, f"=IFERROR((N{r}+O{r})/2,0)")

    # ── Q: d_topsoil — USER ──
    styles.inp(ws, r, 17)

    # ── R: d_media — USER ──
    styles.inp(ws, r, 18)

    # ── S: n_media ← PARAMS_BMP col 3 ──
    styles.calc_c(ws, r, 19, _ifs_bmp_param(f"D{r}", f"E{r}", 3))

    # ── T: d_choker — USER ──
    styles.inp(ws, r, 20)

    # ── U: d_gravel — USER ──
    styles.inp(ws, r, 21)

    # ── V: Underdrain (Y/N) — DROPDOWN (handled by data validation later) ──
    styles.inp(ws, r, 22)

    # ── W: UD size (in) — USER ──
    styles.inp(ws, r, 23)

    # ── X: UD headspace (ft) — USER ──
    styles.inp(ws, r, 24)

    # ── Y: Reservoir Portion of Gravel = IF(V="Y", MAX(0, U-X-W/12), U) ──
    y_formula = (
        f'=IF(V{r}="Y",MAX(0,U{r}-X{r}-W{r}/12),U{r})'
    )
    styles.calc_c(ws, r, 25, y_formula)

    # ── Z: n_gravel ← PARAMS_BMP col 4 ──
    styles.calc_c(ws, r, 26, _ifs_bmp_param(f"D{r}", f"E{r}", 4))

    # ── AA: d_pond — USER ──
    styles.inp(ws, r, 27)

    # ── AB: Bio Ksat — AUTO + USER OK (Enhanced + Enhanced w/ UD → VLOOKUP) ──
    bio_ksat = (
        f"=IFERROR("
        f"IF(OR(E{r}=\"Enhanced\",E{r}=\"Enhanced w/ Underdrain\"),"
        f"VLOOKUP({_cda_dominant_hsg_formula(f'C{r}')},PARAMS_Ksat,2,FALSE),"
        f"0),0)"
    )
    styles.inp(ws, r, 28)
    ws.cell(row=r, column=28).value = bio_ksat

    # ── AC: Bio Sv (WIP formula) = O*(R*S + U*Z) + P*AA ──
    ac_formula = f"=IFERROR(O{r}*(R{r}*S{r}+U{r}*Z{r})+P{r}*AA{r},0)"
    styles.calc_c(ws, r, 29, ac_formula)

    # ── AD: Drawdown = (R + U) / AB ──
    styles.calc_c(ws, r, 30,
        f'=IFERROR(IF(AB{r}=0,"",(R{r}+U{r})/AB{r}),"")')
```

Call it from the data loop in `build_bmp_sheet`:

```python
    for r in range(data_start, data_end + 1):
        _populate_pp_bio_stack(ws, r)
```

Also add data validations for col V (Underdrain Y/N):

```python
    # Data Validation for col V (Underdrain)
    dv_ud = DataValidation(type="list", formula1='"Y,N"',
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_ud)
    dv_ud.sqref = f"V{data_start}:V{data_end}"
```

Keep the existing SDA_ID (col B), CDA_ID (col C), BMP Type (col D) dropdowns from the skeleton; add a new Sub-Type dropdown (col E):

```python
    # BMP Sub-Type dropdown (col E)
    sub_types = [sub for (_t, sub, _idx) in BMP_PARAM_ROWS]
    dv_sub = DataValidation(
        type="list",
        formula1='"' + ",".join(set(sub_types)) + '"',
        allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_sub)
    dv_sub.sqref = f"E{data_start}:E{data_end}"
```

- [ ] **Step 4: Run tests and verify passes**

Run: `pytest tests/test_bmp.py tests/test_bmp_schema.py -v`
Expected: Task 4 tests PASS. Older test_bmp.py tests that reference `W4`, `K4` row-4 cells will still FAIL — those get updated in Step 5 below.

Update existing `test_bmp.py` row references from row 4 to row 6, and column-letter references to match the new 81-col layout. The key old → new column mappings:

- Old K (PP Sv, col 11) → still col 11, row 6
- Old W (Bio Sv, col 23) → new AC (col 29), row 6
- Old AH (Tree Rv Total, col 34) → new AN (col 40), row 6
- Old AI (Sv Total, col 35) → new AO (col 41), row 6
- Old AJ (Ret. Multiplier, col 36) → new AP (col 42), row 6
- Old AM (Rv Applied, col 39) → new AS (col 45), row 6

Edit `tests/test_bmp.py` test functions accordingly. For example `test_bio_sv_formula` becomes:

```python
def test_bio_sv_formula(wb):
    ws = wb["BMP"]
    # AC6 = O*(R*S + U*Z) + P*AA (WIP formula)
    f_val = ws.cell(row=6, column=29).value
    for sub in ["O6", "R6", "S6", "U6", "Z6", "P6", "AA6"]:
        assert sub in f_val
```

Run again: `pytest tests/test_bmp.py tests/test_bmp_schema.py -v`
Expected: PASS all.

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/bmp.py tests/test_bmp.py tests/test_bmp_schema.py
git commit -m "bmp: PP + Bio stack formulas, WIP Bio Sv, reservoir portion, SA_bot auto-pull"
```

---

### Task 5: BMP formulas — Wet Swale, Trees, Outputs (cols AE-AT)

**Files:**
- Modify: `workbook/builders/bmp.py`
- Test: `tests/test_bmp_outputs.py` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/test_bmp_outputs.py`:

```python
import pytest
import openpyxl
from workbook.builders import params, project, sda, cda, bmp


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    for name, builder in [
        ("params", params.build_params_sheet),
        ("project", project.build_project_sheet),
    ]:
        builder(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    return w


def test_wet_swale_sv_formula(wb):
    # AG6 (col 33) = AE6 + AF6
    f = wb["BMP"].cell(row=6, column=33).value
    assert "AE6" in f and "AF6" in f


def test_tree_rv_total_references_all_six_counts(wb):
    # AN6 (col 40)
    f = wb["BMP"].cell(row=6, column=40).value
    for col in ["AH6", "AI6", "AJ6", "AK6", "AL6", "AM6"]:
        assert col in f


def test_sv_total_adds_pp_bio_ws_and_swale_wedge(wb):
    # AO6 = K + AC + AG + IF(D="Dry Swale", IF(CA="Actual", CC, CB), 0)
    f = wb["BMP"].cell(row=6, column=41).value
    for ref in ["K6", "AC6", "AG6", "CA6", "CB6", "CC6"]:
        assert ref in f
    assert "Dry Swale" in f


def test_rv_reservoir_formula_uses_y_z_o(wb):
    # AT6 (col 46) = Y * Z * O
    f = wb["BMP"].cell(row=6, column=46).value
    assert "Y6" in f and "Z6" in f and "O6" in f


def test_rv_applied_caps_by_max_credit(wb):
    # AS6 (col 45) = IF(AR=0, AQ, MIN(AQ, AR))
    f = wb["BMP"].cell(row=6, column=45).value
    for ref in ["AQ6", "AR6"]:
        assert ref in f
    assert "MIN" in f
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_bmp_outputs.py -v`
Expected: FAIL — AE-AT formulas not yet populated.

- [ ] **Step 3: Add outputs formulas**

Extend `_populate_pp_bio_stack` to also cover AE-AT, or add a new helper `_populate_outputs(ws, r)`:

```python
def _populate_outputs(ws, r: int) -> None:
    """Populate Wet Swale (AE-AG), Trees (AH-AN), Outputs (AO-AT)."""
    # ── AE-AF: WS Pool, ED — USER ──
    styles.inp(ws, r, 31)
    styles.inp(ws, r, 32)

    # ── AG: WS Sv = AE + AF ──
    styles.calc_c(ws, r, 33, f"=IFERROR(AE{r}+AF{r},0)")

    # ── AH-AM: Tree counts — USER ──
    for c in range(34, 40):
        styles.inp(ws, r, c)

    # ── AN: Tree Rv Total = Σ count × PARAMS_Trees credit ──
    tree_formula = (
        f"=IFERROR("
        f"AH{r}*INDEX(PARAMS_Trees,1,3)"
        f"+AI{r}*INDEX(PARAMS_Trees,2,3)"
        f"+AJ{r}*INDEX(PARAMS_Trees,3,3)"
        f"+AK{r}*INDEX(PARAMS_Trees,4,3)"
        f"+AL{r}*INDEX(PARAMS_Trees,5,3)"
        f"+AM{r}*INDEX(PARAMS_Trees,6,3),0)"
    )
    styles.calc_c(ws, r, 40, tree_formula)

    # ── AO: Sv Total = K + AC + AG + IF(D="Dry Swale", IF(CA="Actual", CC, CB), 0) ──
    ao_formula = (
        f'=IFERROR(K{r}+AC{r}+AG{r}'
        f'+IF(D{r}="Dry Swale",IF(CA{r}="Actual",CC{r},CB{r}),0),0)'
    )
    styles.calc_c(ws, r, 41, ao_formula)

    # ── AP: Retention Multiplier ← PARAMS_BMP col 6 ──
    styles.calc_c(ws, r, 42, _ifs_bmp_param(f"D{r}", f"E{r}", 6))
    ws.cell(row=r, column=42).fill = styles.fill(styles.PARAMS_TINT)

    # ── AQ: Rv Uncapped = AO*AP + AN ──
    styles.calc_c(ws, r, 43, f"=IFERROR(AO{r}*AP{r}+AN{r},0)")

    # ── AR: Max BMP Credit — VLOOKUP into CDA_Proposed summary col D ──
    # CDA_Proposed summary rows 58-67 (10 CDAs max)
    styles.calc_c(ws, r, 44,
        f"=IFERROR(VLOOKUP(C{r},'CDA_Proposed'!$A$58:$D$67,4,FALSE),0)")
    ws.cell(row=r, column=44).fill = styles.fill(styles.CDA_TINT)

    # ── AS: Rv Applied = IF(AR=0, AQ, MIN(AQ, AR)) ──
    styles.calc_c(ws, r, 45,
        f"=IFERROR(IF(AR{r}=0,AQ{r},MIN(AQ{r},AR{r})),0)")

    # ── AT: Rv Reservoir = Y * Z * O (EISA-only credit) ──
    styles.calc_c(ws, r, 46, f"=IFERROR(Y{r}*Z{r}*O{r},0)")
```

Call from the data loop:

```python
    for r in range(data_start, data_end + 1):
        _populate_pp_bio_stack(ws, r)
        _populate_outputs(ws, r)
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest tests/test_bmp_outputs.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/bmp.py tests/test_bmp_outputs.py
git commit -m "bmp: Wet Swale, Trees, Outputs incl. Rv Reservoir for EISA"
```

---

### Task 6: BMP formulas — SA:CDA % + Sizing Check cascade (cols AU-AV)

**Files:**
- Modify: `workbook/builders/bmp.py`
- Test: `tests/test_bmp_sizing_check.py` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/test_bmp_sizing_check.py`:

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
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    return w


def test_sa_cda_pct_formula(wb):
    # AU6 (col 47) = SA_top / Total CDA (from CDA_Proposed summary col C)
    f = wb["BMP"].cell(row=6, column=47).value
    assert f.startswith("=")
    assert "N6" in f                # SA_top
    assert "CDA_Proposed" in f      # pulls total CDA from summary block
    assert "C6" in f                # CDA_ID lookup key


def test_sizing_check_formula_branches_by_bmp_type(wb):
    # AV6 (col 48) = Sizing Check — must reference BMP Type (D6) and branch
    f = wb["BMP"].cell(row=6, column=48).value
    assert "Bioretention" in f
    assert "Dry Swale" in f
    assert "D6" in f


def test_sizing_check_references_params_sizing_rules(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    assert "PARAMS_BMPSizingRules" in f


def test_sizing_check_checks_freeboard_bio(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    # Bio freeboard col BD (col 56)
    assert "BD6" in f


def test_sizing_check_checks_freeboard_swale(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    # Swale freeboard col BZ (col 78)
    assert "BZ6" in f


def test_sizing_check_checks_dam_matches_pond_depth(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    # Dry Swale check: ABS(BU - AA) <= 0.01
    assert "BU6" in f and "AA6" in f


def test_sizing_check_checks_cleanouts(wb):
    f = wb["BMP"].cell(row=6, column=48).value
    # Bio cleanouts col BE (col 57), swale cleanouts col BW (col 75)
    assert "BE6" in f or "BW6" in f
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_bmp_sizing_check.py -v`
Expected: FAIL — cols 47-48 are still blank input cells from skeleton.

- [ ] **Step 3: Implement SA:CDA % + Sizing Check**

Add to `bmp.py`:

```python
def _sa_cda_pct_formula(r: int) -> str:
    """SA:CDA % = N (SA_top) / Total CDA (SF).
    Total CDA pulled from CDA_Proposed summary col C via VLOOKUP by CDA_ID."""
    return (
        f"=IFERROR(N{r}/VLOOKUP(C{r},'CDA_Proposed'!$A$58:$C$67,3,FALSE),0)"
    )


def _sizing_check_formula(r: int) -> str:
    """Build the sizing-check cascade for row r.

    Returns first failing rule string, or '✓' if all pass.
    Uses PARAMS_BMPSizingRules via sub-type INDEX lookups.
    Nested IF cascade keeps Excel 2016 compat.
    """
    # Sub-type → PARAMS_BMPSizingRules row index (1-based within the named range)
    # Row 1: Bio Standard, 2: Bio Enhanced, 3: Bio Enhanced w/ UD,
    # Row 4: Dry Swale, 5: PP Enhanced, 6: PP Underdrained, 7: Wet Swale
    # Build lookup row by (BMP Type + Sub-Type):
    #   Bioretention Standard → 1
    #   Bioretention Enhanced → 2
    #   Bioretention Enhanced w/ Underdrain → 3
    #   Dry Swale — → 4
    #   Permeable Pavement Enhanced → 5
    #   Permeable Pavement Underdrained Enhanced → 6
    #   Wet Swale — → 7
    row_lookup = (
        f'IFERROR('
        f'IF(AND(D{r}="Bioretention",E{r}="Standard"),1,'
        f'IF(AND(D{r}="Bioretention",E{r}="Enhanced"),2,'
        f'IF(AND(D{r}="Bioretention",E{r}="Enhanced w/ Underdrain"),3,'
        f'IF(D{r}="Dry Swale",4,'
        f'IF(AND(D{r}="Permeable Pavement",E{r}="Enhanced"),5,'
        f'IF(AND(D{r}="Permeable Pavement",E{r}="Underdrained Enhanced"),6,'
        f'IF(D{r}="Wet Swale",7,0)))))))'
        f',0)'
    )

    # Helper: INDEX into PARAMS_BMPSizingRules by sub-type row, column
    def rule(col: int) -> str:
        return f'INDEX(PARAMS_BMPSizingRules,{row_lookup},{col})'

    sa_cda_min = rule(2)
    sa_cda_max = rule(3)
    min_pond   = rule(4)
    min_media  = rule(5)
    min_gravel = rule(6)
    min_fb     = rule(7)
    max_slope  = rule(8)
    min_cln    = rule(9)

    # Bio checks: pond, media, gravel, freeboard (BD6), cleanouts (BE6)
    bio_check = (
        f'IF(AU{r}<{sa_cda_min},"✗ SA:CDA below min",'
        f'IF(AU{r}>{sa_cda_max},"✗ SA:CDA above max",'
        f'IF(AA{r}<{min_pond},"✗ d_pond < min",'
        f'IF(R{r}<{min_media},"✗ d_media < min",'
        f'IF(U{r}<{min_gravel},"✗ d_gravel < min",'
        f'IF(BD{r}<{min_fb},"✗ Freeboard < 3 in",'
        f'IF(BE{r}<{min_cln},"⚠ No cleanout/obs well","✓")))))))'
    )

    # Dry Swale: SA:CDA, H_cd≈d_pond, media, gravel, freeboard (BZ6), cleanouts (BW6), slope
    swale_check = (
        f'IF(AU{r}<{sa_cda_min},"✗ SA:CDA below min",'
        f'IF(AU{r}>{sa_cda_max},"✗ SA:CDA above max",'
        f'IF(ABS(BU{r}-AA{r})>0.01,"✗ H_cd ≠ d_pond",'
        f'IF(R{r}<{min_media},"✗ d_media < min",'
        f'IF(U{r}<{min_gravel},"✗ d_gravel < min",'
        f'IF(BZ{r}<{min_fb},"✗ Freeboard < 3 in",'
        f'IF(BW{r}<{min_cln},"⚠ No cleanout/obs well",'
        f'IF(BX{r}>{max_slope},"⚠ Slope > max","✓"))))))))'
    )

    # PP: drawdown (L6) and min gravel (U6 ≥ 1.0)
    pp_check = (
        f'IF(L{r}>2,"✗ Drawdown > 2 d",'
        f'IF(U{r}<{min_gravel},"✗ d_gravel < 1 ft","✓"))'
    )

    # Top-level: pick branch by BMP Type; Wet Swale and Trees → "—"
    top = (
        f'=IFERROR('
        f'IF(D{r}="","",'
        f'IF(D{r}="Bioretention",{bio_check},'
        f'IF(D{r}="Dry Swale",{swale_check},'
        f'IF(D{r}="Permeable Pavement",{pp_check},"—"))))'
        f',"—")'
    )
    return top
```

Call from data loop:

```python
    for r in range(data_start, data_end + 1):
        _populate_pp_bio_stack(ws, r)
        _populate_outputs(ws, r)
        # AU (col 47): SA:CDA %
        styles.calc_c(ws, r, 47, _sa_cda_pct_formula(r))
        ws.cell(row=r, column=47).number_format = "0.0%"
        # AV (col 48): Sizing Check
        styles.calc_c(ws, r, 48, _sizing_check_formula(r))
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest tests/test_bmp_sizing_check.py -v`
Expected: PASS all 7 tests.

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/bmp.py tests/test_bmp_sizing_check.py
git commit -m "bmp: SA:CDA % and Sizing Check validation cascade"
```

---

### Task 7: BMP formulas — Supplemental Bioretention (cols AW-BE)

**Files:**
- Modify: `workbook/builders/bmp.py`
- Test: `tests/test_bmp_bio_supp.py` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/test_bmp_bio_supp.py`:

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
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    return w


def test_bio_pond_elev_auto(wb):
    # AX6 (col 50) = AW + d_pond (AA)
    f = wb["BMP"].cell(row=6, column=50).value
    assert "AW6" in f and "AA6" in f


def test_bio_ud_invert_formula(wb):
    # BB6 (col 54) = AW - Q - R - T - X - W/12
    f = wb["BMP"].cell(row=6, column=54).value
    for ref in ["AW6", "Q6", "R6", "T6", "X6", "W6"]:
        assert ref in f


def test_bio_bottom_invert_formula(wb):
    # BC6 (col 55) = AW - Q - R - T - U
    f = wb["BMP"].cell(row=6, column=55).value
    for ref in ["AW6", "Q6", "R6", "T6", "U6"]:
        assert ref in f


def test_bio_freeboard_formula(wb):
    # BD6 (col 56) = MIN(sidewalk, curb-cut) - (pond_elev + 15-yr head)
    f = wb["BMP"].cell(row=6, column=56).value
    for ref in ["AZ6", "BA6", "AX6", "AY6"]:
        assert ref in f
    assert "MIN" in f


def test_bio_cleanouts_input_cell(wb):
    # BE6 (col 57) is USER input (no formula, blank cell with inp style)
    cell = wb["BMP"].cell(row=6, column=57)
    # inp cells have yellow fill
    from workbook import styles
    assert str(cell.fill.fgColor.rgb).endswith(styles.INP)
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_bmp_bio_supp.py -v`
Expected: FAIL (AW-BE still blank inp cells from skeleton).

- [ ] **Step 3: Implement bio supplemental formulas**

Add helper to `bmp.py`:

```python
def _populate_bio_supp(ws, r: int) -> None:
    """Populate Supplemental Bioretention zone (AW-BE)."""
    # AW: surface elev — USER
    styles.inp(ws, r, 49)

    # AX: ponding elev = AW + d_pond(AA)
    styles.calc_c(ws, r, 50,
        f'=IFERROR(AW{r}+AA{r},"")')

    # AY: 15-yr head assumed — USER
    styles.inp(ws, r, 51)

    # AZ: min sidewalk elev — USER
    styles.inp(ws, r, 52)

    # BA: min curb-cut elev — USER
    styles.inp(ws, r, 53)

    # BB: UD invert = AW - Q - R - T - X - W/12
    styles.calc_c(ws, r, 54,
        f'=IFERROR(IF(V{r}="Y",AW{r}-Q{r}-R{r}-T{r}-X{r}-W{r}/12,""),"")')

    # BC: bottom invert = AW - Q - R - T - U
    styles.calc_c(ws, r, 55,
        f'=IFERROR(AW{r}-Q{r}-R{r}-T{r}-U{r},"")')

    # BD: Freeboard = MIN(sidewalk, curb-cut) - (pond_elev + 15-yr head)
    # Only meaningful when Bioretention + containment present
    styles.calc_c(ws, r, 56,
        f'=IFERROR('
        f'IF(D{r}<>"Bioretention","",'
        f'IF(OR(AX{r}="",AW{r}=""),"",'
        f'MIN(IF(AZ{r}="",9E9,AZ{r}),IF(BA{r}="",9E9,BA{r}))'
        f'-(AX{r}+IF(AY{r}="",0,AY{r}))'
        f')),"")')

    # BE: # obs wells / cleanouts — USER
    styles.inp(ws, r, 57)
```

Call from the data loop (immediately after `_populate_outputs` etc.):

```python
        _populate_bio_supp(ws, r)
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest tests/test_bmp_bio_supp.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/bmp.py tests/test_bmp_bio_supp.py
git commit -m "bmp: Supplemental Bioretention zone (AW-BE) with cleanouts"
```

---

### Task 8: BMP formulas — Supplemental Swale (cols BF-BZ)

**Files:**
- Modify: `workbook/builders/bmp.py`
- Test: `tests/test_bmp_swale_supp.py` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/test_bmp_swale_supp.py`:

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
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    return w


def test_swale_slope_formula(wb):
    # BX6 (col 76) = (BQ - BR) / BF
    f = wb["BMP"].cell(row=6, column=76).value
    for ref in ["BQ6", "BR6", "BF6"]:
        assert ref in f


def test_swale_ncd_formula(wb):
    # BY6 (col 77) = FLOOR(BF / BV, 1)
    f = wb["BMP"].cell(row=6, column=77).value
    assert "BF6" in f and "BV6" in f
    assert "FLOOR" in f


def test_swale_freeboard_references_all_8_elevs(wb):
    # BZ6 (col 78) MIN across top-bank US/DS, grade US/DS, curb US/DS, sidewalk US/DS
    f = wb["BMP"].cell(row=6, column=78).value
    for ref in ["BI6", "BJ6", "BK6", "BL6", "BM6", "BN6", "BO6", "BP6"]:
        assert ref in f
    assert "MIN" in f


def test_swale_freeboard_deducts_inv_head_damheight(wb):
    f = wb["BMP"].cell(row=6, column=78).value
    for ref in ["BQ6", "BU6", "BT6"]:   # inv US, H_cd, 15-yr head
        assert ref in f
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_bmp_swale_supp.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement swale supplemental**

Add helper to `bmp.py`:

```python
def _populate_swale_supp(ws, r: int) -> None:
    """Populate Supplemental Swale zone (BF-BZ)."""
    # BF: L_s — USER
    styles.inp(ws, r, 58)
    # BG: w_s — USER
    styles.inp(ws, r, 59)
    # BH: side slope (H:V) — USER
    styles.inp(ws, r, 60)
    # BI-BJ: top-of-bank US/DS — USER
    styles.inp(ws, r, 61)
    styles.inp(ws, r, 62)
    # BK-BL: top-of-grade US/DS — USER
    styles.inp(ws, r, 63)
    styles.inp(ws, r, 64)
    # BM-BN: curb-cut US/DS — USER
    styles.inp(ws, r, 65)
    styles.inp(ws, r, 66)
    # BO-BP: sidewalk US/DS — USER
    styles.inp(ws, r, 67)
    styles.inp(ws, r, 68)
    # BQ-BR: invert US/DS — USER
    styles.inp(ws, r, 69)
    styles.inp(ws, r, 70)
    # BS: UD invert — USER
    styles.inp(ws, r, 71)
    # BT: 15-yr head — USER
    styles.inp(ws, r, 72)
    # BU: H_cd — USER
    styles.inp(ws, r, 73)
    # BV: X_cd — USER
    styles.inp(ws, r, 74)
    # BW: # obs wells / cleanouts — USER
    styles.inp(ws, r, 75)

    # BX: Slope S = (inv_US - inv_DS) / L_s
    styles.calc_c(ws, r, 76,
        f'=IFERROR(IF(OR(D{r}<>"Dry Swale",BF{r}="",BQ{r}="",BR{r}=""),"",'
        f'(BQ{r}-BR{r})/BF{r}),"")')

    # BY: N_cd = FLOOR(L_s / X_cd, 1)
    styles.calc_c(ws, r, 77,
        f'=IFERROR(IF(OR(D{r}<>"Dry Swale",BF{r}="",BV{r}="",BV{r}=0),"",'
        f'FLOOR(BF{r}/BV{r},1)),"")')

    # BZ: Freeboard = MIN(all 8 top elevs) - (inv_US + H_cd + 15-yr head)
    min_tops = (
        f'MIN('
        f'IF(BI{r}="",9E9,BI{r}),IF(BJ{r}="",9E9,BJ{r}),'
        f'IF(BK{r}="",9E9,BK{r}),IF(BL{r}="",9E9,BL{r}),'
        f'IF(BM{r}="",9E9,BM{r}),IF(BN{r}="",9E9,BN{r}),'
        f'IF(BO{r}="",9E9,BO{r}),IF(BP{r}="",9E9,BP{r})'
        f')'
    )
    styles.calc_c(ws, r, 78,
        f'=IFERROR(IF(D{r}<>"Dry Swale","",'
        f'{min_tops}-(BQ{r}+BU{r}+IF(BT{r}="",0,BT{r}))'
        f'),"")')
```

Call from loop:

```python
        _populate_swale_supp(ws, r)
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest tests/test_bmp_swale_supp.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/bmp.py tests/test_bmp_swale_supp.py
git commit -m "bmp: Supplemental Swale (BF-BZ) with elevs at both ends, freeboard, cleanouts"
```

---

### Task 9: BMP formulas — Swale Method + Sv DOEE/Actual (cols CA-CC)

**Files:**
- Modify: `workbook/builders/bmp.py`
- Test: `tests/test_bmp_swale_methods.py` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/test_bmp_swale_methods.py`:

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
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    return w


def test_swale_method_dropdown_exists(wb):
    ws = wb["BMP"]
    dvs = ws.data_validations.dataValidation
    found = False
    for dv in dvs:
        if "CA6" in str(dv.sqref) and "DOEE" in dv.formula1 and "Actual" in dv.formula1:
            found = True
            break
    assert found, "Swale Method dropdown not found on col CA"


def test_sv_doee_capped_wedge(wb):
    # CB6 (col 80) = N_cd × 0.5 × MIN(X_cd, H_cd/S) × H_cd × w_s
    # BY=N_cd, BV=X_cd, BU=H_cd, BX=S, BG=w_s
    f = wb["BMP"].cell(row=6, column=80).value
    for ref in ["BY6", "BV6", "BU6", "BX6", "BG6"]:
        assert ref in f
    assert "MIN" in f


def test_sv_actual_uncapped_wedge(wb):
    # CC6 (col 81) = N_cd × 0.5 × (H_cd/S) × H_cd × w_s   (NO MIN cap)
    f = wb["BMP"].cell(row=6, column=81).value
    for ref in ["BY6", "BU6", "BX6", "BG6"]:
        assert ref in f
    # Should NOT contain MIN (no cap)
    assert "MIN" not in f


def test_default_swale_method_is_doee(wb):
    # First data row (row 6) col CA (col 79) should have default value "DOEE"
    ws = wb["BMP"]
    v = ws.cell(row=6, column=79).value
    assert v == "DOEE"
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_bmp_swale_methods.py -v`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add helper to `bmp.py`:

```python
def _populate_swale_method(ws, r: int) -> None:
    """Populate Swale Method + Sv DOEE + Sv Actual (CA-CC)."""
    # CA: Swale Method — DROPDOWN, default "DOEE"
    styles.inp(ws, r, 79, val="DOEE")
    ws.cell(row=r, column=79).fill = styles.fill(styles.DROPDOWN_TINT)

    # CB: Sv DOEE (capped wedge) = N_cd × 0.5 × MIN(X_cd, H_cd/S) × H_cd × w_s
    styles.calc_c(ws, r, 80,
        f'=IFERROR(IF(D{r}<>"Dry Swale","",'
        f'IF(OR(BY{r}="",BX{r}="",BX{r}=0,BU{r}="",BV{r}="",BG{r}=""),"",'
        f'BY{r}*0.5*MIN(BV{r},BU{r}/BX{r})*BU{r}*BG{r})),"")')

    # CC: Sv Actual (uncapped wedge) = N_cd × 0.5 × (H_cd/S) × H_cd × w_s
    styles.calc_c(ws, r, 81,
        f'=IFERROR(IF(D{r}<>"Dry Swale","",'
        f'IF(OR(BY{r}="",BX{r}="",BX{r}=0,BU{r}="",BG{r}=""),"",'
        f'BY{r}*0.5*(BU{r}/BX{r})*BU{r}*BG{r})),"")')
```

Call from loop:

```python
        _populate_swale_method(ws, r)
```

Also add the Swale Method data validation after the data-row loop:

```python
    dv_method = DataValidation(type="list", formula1='"DOEE,Actual"',
                                allow_blank=False, showDropDown=False)
    ws.add_data_validation(dv_method)
    dv_method.sqref = f"CA{data_start}:CA{data_end}"
```

- [ ] **Step 4: Run all BMP tests to confirm full sheet works end-to-end**

Run: `pytest tests/test_bmp_swale_methods.py tests/test_bmp.py tests/test_bmp_schema.py tests/test_bmp_outputs.py tests/test_bmp_sizing_check.py tests/test_bmp_bio_supp.py tests/test_bmp_swale_supp.py -v`
Expected: PASS all.

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/bmp.py tests/test_bmp_swale_methods.py
git commit -m "bmp: Swale Method toggle + Sv DOEE (capped) + Sv Actual (uncapped)"
```

---

### Task 10: EISA sheets — underdrain-aware swap + row range shift

**Files:**
- Modify: `workbook/builders/eisa_direct.py`
- Modify: `workbook/builders/eisa_tr55.py`
- Test: `tests/test_eisa_underdrain_swap.py` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/test_eisa_underdrain_swap.py`:

```python
import pytest
from workbook.__main__ import build_workbook


@pytest.fixture(scope="module")
def wb():
    return build_workbook()


def test_eisa_direct_bmp_formula_is_sumproduct(wb):
    """EISA_DIRECT's 'Volume Infiltrated in BMPs' must use SUMPRODUCT to swap
    AT (Rv Reservoir) for V=Y rows and AS (Rv Applied) for V=N rows."""
    ws = wb["EISA_DIRECT"]
    # The cell has moved slightly since row 2 shifted; find it by content.
    found = False
    for row in range(1, ws.max_row + 1):
        label = ws.cell(row=row, column=1).value or ""
        if "Volume Infiltrated in BMPs" in label:
            f = ws.cell(row=row, column=2).value
            assert "SUMPRODUCT" in f, f"got {f}"
            assert "$V$6:$V$55" in f
            assert "$AT$6:$AT$55" in f
            assert "$AS$6:$AS$55" in f
            found = True
            break
    assert found, "'Volume Infiltrated in BMPs' row not found on EISA_DIRECT"


def test_eisa_tr55_bmp_formula_is_sumproduct(wb):
    """Same for EISA_TR55."""
    ws = wb["EISA_TR55"]
    found = False
    for row in range(1, ws.max_row + 1):
        label = ws.cell(row=row, column=1).value or ""
        if "Volume Infiltrated in BMPs" in label or "BMPs" in label:
            f = ws.cell(row=row, column=2).value or ""
            if "SUMPRODUCT" in str(f):
                assert "$V$6:$V$55" in f
                assert "$AT$6:$AT$55" in f
                found = True
                break
    assert found, "SUMPRODUCT swap not found on EISA_TR55"
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_eisa_underdrain_swap.py -v`
Expected: FAIL.

- [ ] **Step 3: Patch eisa_direct.py**

In `workbook/builders/eisa_direct.py`, update top-of-file constants and swap the `bmp_formula`:

```python
# Data range constants — shifted to new BMP schema (data rows 6-55)
SDA_FIRST = 4
SDA_LAST = 53
BMP_FIRST = 6
BMP_LAST = 55
```

Replace the current `bmp_formula`:

```python
    styles.lbl(ws, r, 1, "Volume Infiltrated in BMPs (CF)", styles.GRY)
    bmp_formula = (
        f"=SUMPRODUCT("
        f"('BMP'!$V${BMP_FIRST}:$V${BMP_LAST}=\"Y\")*'BMP'!$AT${BMP_FIRST}:$AT${BMP_LAST}"
        f"+('BMP'!$V${BMP_FIRST}:$V${BMP_LAST}<>\"Y\")*'BMP'!$AS${BMP_FIRST}:$AS${BMP_LAST}"
        f")"
    )
    styles.calc_c(ws, r, 2, bmp_formula)
    styles.calc_c(ws, r, 3, bmp_formula)
```

Also add a note on row 2 (replace or supplement existing content):

```python
    styles.lbl(ws, 2, 1,
        "Underdrain-equipped BMPs (V=Y on BMP sheet) credit only the gravel "
        "reservoir BELOW the underdrain pipe for EISA 438 (infiltration-only). "
        "DOEE SWRv path credits the full Rv Applied.",
        styles.WARN)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=7)
    ws.row_dimensions[2].height = 36
```

Shift the "Row 3: Project References section" to row 4 to make room:

```python
    r = 4   # was 3
    styles.hdr(ws, r, 1, "Project References", styles.GS, span=7)
```

- [ ] **Step 4: Patch eisa_tr55.py the same way**

Read `workbook/builders/eisa_tr55.py` first to find its `bmp_formula` and constants, then apply the same two edits:
1. `BMP_FIRST = 6`, `BMP_LAST = 55`
2. `bmp_formula` → SUMPRODUCT form above
3. Add row-2 note (mirror the EISA_DIRECT note)

- [ ] **Step 5: Run tests + commit**

Run: `pytest tests/test_eisa_underdrain_swap.py tests/test_eisa_direct.py tests/test_eisa_tr55.py -v`
Expected: PASS new test; existing eisa tests may need row-reference updates — fix inline.

```bash
git add workbook/builders/eisa_direct.py workbook/builders/eisa_tr55.py tests/test_eisa_underdrain_swap.py tests/test_eisa_direct.py tests/test_eisa_tr55.py
git commit -m "eisa: swap AT (Rv Reservoir) for V=Y BMP rows; shift BMP range to 6-55"
```

---

### Task 11: Correct MEP — HSG list in col L + BMP row range shift

**Files:**
- Modify: `workbook/builders/correct_mep_summary.py`
- Test: `tests/test_correct_mep_hsg.py` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/test_correct_mep_hsg.py`:

```python
import pytest
from workbook.__main__ import build_workbook


@pytest.fixture(scope="module")
def wb():
    return build_workbook()


def test_mep_col_l_concatenates_present_hsgs(wb):
    """Col L row 12 must build a comma-list of present HSGs via nested IFs."""
    ws = wb["CORRECT_MEP_SUMMARY"]
    f = ws.cell(row=12, column=12).value
    # Must mention all 4 HSG letters and use LEFT + concat pattern
    for letter in ["A", "B", "C", "D"]:
        assert f'"{letter}, "' in f or f'"{letter},"' in f
    assert "LEFT" in f or "SUBSTITUTE" in f


def test_mep_col_o_still_conservative_dominant(wb):
    """Col O (Infiltration Rate) must remain nested-IF on D>C>B>A."""
    ws = wb["CORRECT_MEP_SUMMARY"]
    f = ws.cell(row=12, column=15).value
    # Must branch on L="A"/"B"/"C"/"D" and map to 2.5/0.3/0.1/0.05
    for rate in ["2.5", "0.3", "0.1", "0.05"]:
        assert rate in f


def test_mep_bmp_refs_use_row_6_55(wb):
    """Correct MEP BMP SUMIFS must reference BMP rows 6-55 (not 4-53)."""
    ws = wb["CORRECT_MEP_SUMMARY"]
    # Col Q (17) row 12 — # Preserved Small from BMP col AD (now shifted)
    f = ws.cell(row=12, column=17).value
    assert "$6:" in f or "$6" in f  # row 6 start
    assert "$55" in f  # row 55 end
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_correct_mep_hsg.py -v`
Expected: FAIL.

- [ ] **Step 3: Patch correct_mep_summary.py**

Update top-of-file constants:

```python
# BMP data range shifted per new 81-col schema (data rows 6-55)
BMP_D1 = 6
BMP_DL = 55
```

Replace the col-L (`column=12`) HSG assignment in `_write_da_rows`. The new formula builds a concatenated list:

```python
        # L — List of ALL HSGs present in this SDA (comma-separated).
        # Uses nested IF + concat + LEFT(.., LEN-2) to strip trailing ", ".
        def _sum_by_hsg(hsg: str) -> str:
            return (f"SUMIFS('SDA_Proposed'!$E${D1}:$E${DL},"
                    f"'SDA_Proposed'!$A${D1}:$A${DL},{a},"
                    f"'SDA_Proposed'!$D${D1}:$D${DL},\"{hsg}\")")
        concat_expr = (
            f'IF({_sum_by_hsg("A")}>0,"A, ","")'
            f'&IF({_sum_by_hsg("B")}>0,"B, ","")'
            f'&IF({_sum_by_hsg("C")}>0,"C, ","")'
            f'&IF({_sum_by_hsg("D")}>0,"D, ","")'
        )
        ws.cell(row=r, column=12, value=_guard(
            f'IFERROR(LEFT({concat_expr},LEN({concat_expr})-2),"")',
            a))
```

Col O (`column=15`) stays as-is — the conservative-dominant cascade. Note: col L is now a letter-list ("A, B, C") not a single letter, so col O's IF cascade on `L{r}="A"` won't match. **Rewrite col O to use the dominant lookup directly**:

```python
        # O — Infiltration rate from the MOST CONSERVATIVE HSG present
        # (D > C > B > A). Col L shows all HSGs; col O uses the dominant.
        hsg_dom = (
            f'IF({_sum_by_hsg("D")}>0,"D",'
            f'IF({_sum_by_hsg("C")}>0,"C",'
            f'IF({_sum_by_hsg("B")}>0,"B",'
            f'IF({_sum_by_hsg("A")}>0,"A",""))))'
        )
        ws.cell(row=r, column=15, value=_guard(
            f'IF({hsg_dom}="A",2.5,'
            f'IF({hsg_dom}="B",0.3,'
            f'IF({hsg_dom}="C",0.1,'
            f'IF({hsg_dom}="D",0.05,""))))', a))
```

Also update the row-2 note (append the "col O is conservative" sentence).

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest tests/test_correct_mep_hsg.py tests/test_correct_mep_summary.py -v`
Expected: PASS new + old tests. Fix any row-ref breakage in old tests.

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/correct_mep_summary.py tests/test_correct_mep_hsg.py tests/test_correct_mep_summary.py
git commit -m "correct_mep: col L lists all HSGs; col O stays on conservative-dominant; BMP range 6-55"
```

---

### Task 12: DOEE Detention (SDA level) — 2020 Compliance Calc rewrite

**Files:**
- Modify: `workbook/builders/doee.py`
- Test: `tests/test_doee_detention_2020.py` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/test_doee_detention_2020.py`:

```python
import pytest
from workbook.__main__ import build_workbook


@pytest.fixture(scope="module")
def wb():
    return build_workbook()


def test_detention_has_100yr_columns(wb):
    """Col R-V are 100-yr rain, Pre Q, Post Q, Adj Q, Adj CN."""
    ws = wb["DOEE_DETENTION"]
    headers = {c: ws.cell(row=3, column=c).value for c in range(1, 23)}
    assert "100" in (headers[18] or "")  # R
    assert "100" in (headers[19] or "")  # S (100-yr Pre Q)


def test_detention_bmp_sv_total_sums_bmp_ao(wb):
    """Col E (BMP Sv total) must sum BMP col AO (41) over data rows 6-55."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=5).value
    assert "'BMP'!$AO$6:$AO$55" in f or "AO" in f
    assert "A4" in f  # SDA_ID filter


def test_detention_pre_q_scs_formula(wb):
    """Col G (2-yr Pre Q) = SCS runoff (P - 0.2S)^2 / (P + 0.8S)."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=7).value
    assert "0.2" in f and "0.8" in f
    # Pre S formula uses B4 (Pre CN)
    assert "B4" in f


def test_detention_adj_q_subtracts_bmp_sv(wb):
    """Col I (2-yr Adj Q) = MAX(0, Post Q - BMP Sv × 12 / DA_SF)."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=9).value
    # Refs H (Post Q no BMP), E (BMP Sv), D (DA SF)
    for ref in ["H4", "E4", "D4"]:
        assert ref in f


def test_detention_adj_cn_closed_form(wb):
    """Col J (2-yr Adj CN) uses closed-form S_adj = 5·(P + 2Q − √(Q·(4Q+5P)))."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=10).value
    assert "SQRT" in f or "^0.5" in f
    assert "1000" in f  # CN = 1000/(S+10)


def test_detention_2yr_trigger_against_70(wb):
    """Col K (2-yr Det Req'd?) triggers when Adj CN > 70."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=11).value
    assert "70" in f
    assert "J4" in f


def test_detention_15yr_trigger_against_pre_cn(wb):
    """Col Q (15-yr Det Req'd?) triggers when Adj CN > Pre CN."""
    ws = wb["DOEE_DETENTION"]
    f = ws.cell(row=4, column=17).value
    assert "P4" in f and "B4" in f
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_doee_detention_2020.py -v`
Expected: FAIL.

- [ ] **Step 3: Rewrite `build_doee_detention` in doee.py**

Replace the entire `build_doee_detention` function. Add shared closed-form helpers at module scope:

```python
# ── 2020 DOEE detention helpers ──
#
# SCS runoff eq:   Q = (P - 0.2S)² / (P + 0.8S)
# Closed-form inverse (positive root, used for adjusted CN after BMP storage):
#   S_adj = 5·(P + 2Q − √(Q·(4Q + 5P)))
#   CN_adj = 1000 / (S_adj + 10)

def _scs_runoff_formula(p_expr: str, s_expr: str) -> str:
    """Return Excel formula for SCS runoff Q(P,S)."""
    return (f"IF({p_expr}>0.2*{s_expr},"
            f"({p_expr}-0.2*{s_expr})^2/({p_expr}+0.8*{s_expr}),0)")


def _adjusted_cn_formula(q_expr: str, p_expr: str) -> str:
    """Return Excel formula for CN back-computed from adjusted runoff Q and storm P.

    S_adj = 5·(P + 2Q − √(Q·(4Q + 5P)))
    CN_adj = 1000 / (S_adj + 10)
    Returns 0 when Q=0 (sufficient storage).
    """
    s_adj = f"5*({p_expr}+2*{q_expr}-SQRT({q_expr}*(4*{q_expr}+5*{p_expr})))"
    return f"IF({q_expr}<=0,0,1000/({s_adj}+10))"


def build_doee_detention(wb: Workbook) -> None:
    """Add DOEE_DETENTION — one row per SDA, full 2020 Compliance Calc methodology.

    Columns A-V (22 cols):
      A  SDA Number
      B  Pre CN
      C  Post CN (no BMP)
      D  DA total (SF)
      E  BMP Sv total (CF)
      F  2-yr rain (in)
      G  2-yr Pre Q (in)
      H  2-yr Post Q no BMP (in)
      I  2-yr Adj Q (in)
      J  2-yr Adj CN
      K  2-yr Det Req'd?    (trigger: Adj CN > 70)
      L  15-yr rain (in)
      M-Q 15-yr block (Pre Q, Post Q, Adj Q, Adj CN, Det Req'd?)  (trigger: Adj CN > Pre CN)
      R  100-yr rain (in)
      S-V 100-yr block (Pre Q, Post Q, Adj Q, Adj CN)             (reported only)
    """
    ws = wb.create_sheet("DOEE_DETENTION")
    ws.sheet_view.showGridLines = False

    widths = [12, 10, 10, 12, 14, 10, 12, 12, 12, 10, 12,
              10, 12, 12, 12, 10, 12,
              10, 12, 12, 12, 10]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "DOEE_DETENTION — 2020 Compliance Calc Methodology",
               styles.BH, span=22)
    ws.row_dimensions[1].height = 24

    styles.lbl(ws, 2, 1, DETENTION_USER_NOTE, styles.BL, bold=False)
    ws.cell(row=2, column=1).alignment = openpyxl.styles.Alignment(
        wrap_text=True, vertical="top")
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=22)
    ws.row_dimensions[2].height = 48

    headers = [
        "SDA Number", "Pre CN", "Post CN (no BMP)", "DA (SF)", "BMP Sv (CF)",
        "2-yr Rain (in)", "2-yr Pre Q (in)", "2-yr Post Q (in)", "2-yr Adj Q (in)",
        "2-yr Adj CN", "2-yr Det Req'd?",
        "15-yr Rain (in)", "15-yr Pre Q (in)", "15-yr Post Q (in)", "15-yr Adj Q (in)",
        "15-yr Adj CN", "15-yr Det Req'd?",
        "100-yr Rain (in)", "100-yr Pre Q (in)", "100-yr Post Q (in)", "100-yr Adj Q (in)",
        "100-yr Adj CN",
    ]
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 42

    for i in range(10):
        r = 4 + i
        sr = r   # DOEE_SDA row is 4+i too

        # A: SDA Number
        styles.calc_c(ws, r, 1, f"='DOEE_SDA'!A{sr}")

        # B: Pre CN (composite from DOEE_SDA cols C-F pre-dev areas)
        pre_nat  = f"'DOEE_SDA'!C{sr}"
        pre_comp = f"'DOEE_SDA'!D{sr}"
        pre_imp  = f"'DOEE_SDA'!E{sr}"
        pre_bmp  = f"'DOEE_SDA'!F{sr}"
        pre_area = f"({pre_nat}+{pre_comp}+{pre_imp}+{pre_bmp})"
        pre_num  = (f"({pre_nat}*INDEX(PARAMS_DetentionCN,1,2)"
                    f"+{pre_comp}*INDEX(PARAMS_DetentionCN,2,2)"
                    f"+{pre_imp}*INDEX(PARAMS_DetentionCN,3,2)"
                    f"+{pre_bmp}*INDEX(PARAMS_DetentionCN,4,2))")
        styles.calc_c(ws, r, 2, f"=IFERROR({pre_num}/{pre_area},0)")

        # C: Post CN (from DOEE_SDA cols G-J)
        post_nat  = f"'DOEE_SDA'!G{sr}"
        post_comp = f"'DOEE_SDA'!H{sr}"
        post_imp  = f"'DOEE_SDA'!I{sr}"
        post_bmp  = f"'DOEE_SDA'!J{sr}"
        post_area = f"({post_nat}+{post_comp}+{post_imp}+{post_bmp})"
        post_num  = (f"({post_nat}*INDEX(PARAMS_DetentionCN,1,2)"
                     f"+{post_comp}*INDEX(PARAMS_DetentionCN,2,2)"
                     f"+{post_imp}*INDEX(PARAMS_DetentionCN,3,2)"
                     f"+{post_bmp}*INDEX(PARAMS_DetentionCN,4,2))")
        styles.calc_c(ws, r, 3, f"=IFERROR({post_num}/{post_area},0)")

        # D: DA total SF = post_area (within-LOD total)
        styles.calc_c(ws, r, 4, f"={post_area}")

        # E: BMP Sv total — SUMIFS BMP AO (Sv Total) by SDA_ID
        styles.calc_c(ws, r, 5,
            f"=SUMIFS('BMP'!$AO${BMP_FIRST}:$AO${BMP_LAST},"
            f"'BMP'!$B${BMP_FIRST}:$B${BMP_LAST},A{r})")

        s_pre  = f"(1000/B{r}-10)"
        s_post = f"(1000/C{r}-10)"

        # Each storm block
        for storm_idx, (rain_col, pre_q_col, post_q_col, adj_q_col,
                        adj_cn_col, req_col, params_row) in enumerate([
            (6, 7, 8, 9, 10, 11, 1),      # 2-yr
            (12, 13, 14, 15, 16, 17, 2),  # 15-yr
            (18, 19, 20, 21, 22, None, 3),  # 100-yr (no Det Req'd?)
        ]):
            # Rain depth from PARAMS_Detention row params_row col 2
            p_expr = f"INDEX(PARAMS_Detention,{params_row},2)"
            styles.calc_c(ws, r, rain_col, f"={p_expr}")
            # Use cell ref now that it's placed
            p_ref = f"{styles.cl(rain_col)}{r}"

            # Pre Q
            styles.calc_c(ws, r, pre_q_col,
                f"=IFERROR({_scs_runoff_formula(p_ref, s_pre)},0)")
            # Post Q (no BMP)
            styles.calc_c(ws, r, post_q_col,
                f"=IFERROR({_scs_runoff_formula(p_ref, s_post)},0)")
            # Adj Q = MAX(0, Post Q − BMP_Sv × 12 / DA_SF)
            post_q_ref = f"{styles.cl(post_q_col)}{r}"
            styles.calc_c(ws, r, adj_q_col,
                f"=IFERROR(MAX(0,{post_q_ref}-E{r}*12/D{r}),{post_q_ref})")
            # Adj CN (back-computed via closed-form)
            adj_q_ref = f"{styles.cl(adj_q_col)}{r}"
            styles.calc_c(ws, r, adj_cn_col,
                f"=IFERROR({_adjusted_cn_formula(adj_q_ref, p_ref)},0)")

            # Det Req'd? (skipped for 100-yr)
            if req_col is None:
                continue
            adj_cn_ref = f"{styles.cl(adj_cn_col)}{r}"
            if storm_idx == 0:   # 2-yr: trigger when Adj CN > 70 (Natural)
                styles.calc_c(ws, r, req_col,
                    f'=IF({adj_cn_ref}>70,"Yes","No")')
            else:                # 15-yr: trigger when Adj CN > Pre CN
                styles.calc_c(ws, r, req_col,
                    f'=IF({adj_cn_ref}>B{r},"Yes","No")')
```

Update the top of `doee.py`:

```python
BMP_FIRST = 6
BMP_LAST = 55
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest tests/test_doee_detention_2020.py tests/test_doee.py -v`
Expected: PASS new; fix old if any row-ref breakage.

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/doee.py tests/test_doee_detention_2020.py tests/test_doee.py
git commit -m "doee: rewrite DOEE_DETENTION per 2020 Compliance Calc (Pre/Post/Adj CN, 2+15+100-yr)"
```

---

### Task 13: DOEE Detention (BMP/CDA level) + DOEE_COMPLIANCE wiring

**Files:**
- Modify: `workbook/builders/doee.py`
- Modify: `tests/test_doee.py`

- [ ] **Step 1: Write failing tests**

Append to `tests/test_doee_detention_2020.py`:

```python
def test_detention_bmp_has_100yr(wb):
    ws = wb["DOEE_DETENTION_BMP"]
    # Header count expands; row 3 col ~18 should have 100-yr rain
    headers = [ws.cell(row=3, column=c).value for c in range(1, 25)]
    assert any("100" in (h or "") for h in headers)


def test_detention_bmp_uses_cda_areas(wb):
    """CDA-level: Pre CN from CDA_Existing, Post from CDA_Proposed."""
    ws = wb["DOEE_DETENTION_BMP"]
    # Find the Pre CN column (typically col D or E)
    for c in range(1, 20):
        h = ws.cell(row=3, column=c).value or ""
        if "Pre CN" in h:
            f = ws.cell(row=4, column=c).value
            assert "CDA_Existing" in f
            break


def test_doee_compliance_detention_flag_checks_k_and_q(wb):
    """DOEE_COMPLIANCE col F must check both 2-yr (K) and 15-yr (Q) triggers."""
    ws = wb["DOEE_COMPLIANCE"]
    f = ws.cell(row=4, column=6).value
    assert "K4" in f and "Q4" in f
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_doee_detention_2020.py -v`
Expected: FAIL.

- [ ] **Step 3: Rewrite `build_doee_detention_bmp` + update `build_doee_compliance`**

In `doee.py`, replace `build_doee_detention_bmp` to mirror the SDA structure but use CDA_Existing / CDA_Proposed area pulls and add the 100-yr block. Use the same `_scs_runoff_formula` and `_adjusted_cn_formula` helpers:

```python
def build_doee_detention_bmp(wb: Workbook) -> None:
    """DOEE_DETENTION_BMP — per-CDA detention using 2020 methodology.

    Columns A-X (24 cols):
      A  CDA Number
      B  BMP Name   (reverse-lookup from BMP by CDA_ID)
      C  SDA Number (from CDA_Proposed summary)
      D  Pre CN  (from CDA_Existing composite)
      E  Post CN (from CDA_Proposed composite)
      F  DA (SF)  (from CDA_Proposed summary col C)
      G  BMP Sv (CF) (SUMIFS BMP AO by CDA_ID)
      H  2-yr rain
      I-M  2-yr Pre Q, Post Q, Adj Q, Adj CN, Det Req'd?
      N  15-yr rain
      O-S  15-yr block
      T  100-yr rain
      U-X  100-yr block (no Det Req'd?)
    """
    # [full implementation — same pattern as SDA version but with CDA SUMIFS]
```

Key differences from SDA version:
- Replace `'DOEE_SDA'!C{sr}` type refs with CDA SUMIFS on `CDA_Existing` and `CDA_Proposed` filtered by CDA_ID in col A.
- Add col B (BMP Name reverse lookup) and col C (SDA Number).
- 2-yr and 15-yr trigger logic same as SDA version.

Update `build_doee_compliance` col F:

```python
        # Col F: Detention Required?
        styles.calc_c(ws, r, 6,
            f'=IF(OR(\'DOEE_DETENTION\'!K{sr}="Yes",'
            f'\'DOEE_DETENTION\'!Q{sr}="Yes"),"Yes","No")')
```

(Column letters now K and Q instead of F and I since the new detention schema has more cols.)

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest tests/test_doee_detention_2020.py tests/test_doee.py -v`
Expected: PASS all.

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/doee.py tests/test_doee_detention_2020.py
git commit -m "doee: rewrite DOEE_DETENTION_BMP (CDA-level) + wire DOEE_COMPLIANCE to new detention cols"
```

---

### Task 14: TC_PATH sheet builder

**Files:**
- Create: `workbook/builders/tc_path.py`
- Test: `tests/test_tc_path.py` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/test_tc_path.py`:

```python
import pytest
import openpyxl
from workbook.builders import params, tc_path


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    tc_path.build_tc_path_sheet(w, n_rows=20)
    return w


def test_tc_path_sheet_exists(wb):
    assert "TC_PATH" in wb.sheetnames


def test_tc_path_has_21_cols(wb):
    ws = wb["TC_PATH"]
    headers = [ws.cell(row=3, column=c).value for c in range(1, 22)]
    assert headers[0] == "ID"
    assert headers[2] == "Tc direct (min)"
    assert headers[20] == "Tc final (min)"


def test_tt_sheet_formula(wb):
    # Col H = 0.007 * (n*L)^0.8 / (P2^0.5 * S^0.4)
    f = wb["TC_PATH"].cell(row=4, column=8).value
    assert "0.007" in f
    assert "D4" in f and "E4" in f and "F4" in f and "G4" in f
    assert "0.8" in f and "0.4" in f


def test_tt_shallow_paved_and_unpaved(wb):
    # Col L = L/(V*3600), V = 20.3282*sqrt(S) paved, 16.1345*sqrt(S) unpaved
    f = wb["TC_PATH"].cell(row=4, column=12).value
    assert "20.3282" in f and "16.1345" in f
    assert "I4" in f   # paved/unpaved
    assert "J4" in f and "K4" in f   # L and S


def test_tc_computed_sums_all_segments(wb):
    # Col S = H + L + O + R (blanks treated as 0)
    f = wb["TC_PATH"].cell(row=4, column=19).value
    for ref in ["H4", "L4", "O4", "R4"]:
        assert ref in f


def test_tc_final_direct_overrides_computed(wb):
    # Col T: IF(C blank, MAX(S, 0.1), MAX(C/60, 0.1))
    f = wb["TC_PATH"].cell(row=4, column=20).value
    assert "C4" in f and "S4" in f
    assert "0.1" in f  # floor
    assert "/60" in f  # min → hr conversion


def test_shallow_surface_dropdown(wb):
    ws = wb["TC_PATH"]
    dvs = ws.data_validations.dataValidation
    found = False
    for dv in dvs:
        if "I4" in str(dv.sqref) and "paved" in dv.formula1.lower():
            found = True
    assert found
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_tc_path.py -v`
Expected: FAIL (module doesn't exist).

- [ ] **Step 3: Create `workbook/builders/tc_path.py`**

```python
"""Build the TC_PATH sheet — per-SDA/CDA time of concentration.

User may either enter Tc directly (col C) or fill the 4-segment path
(sheet flow + shallow concentrated + 2 channel segments). Direct override wins.
Floor applied: Tc final ≥ 0.1 hr (6 min) per TR-55 and DOEE convention.
"""
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


HEADERS = [
    "ID",                        # A
    "Name / Description",        # B
    "Tc direct (min)",           # C
    "Sheet n",                   # D
    "Sheet L (ft, ≤100)",        # E
    "Sheet P₂ (in)",             # F
    "Sheet S (ft/ft)",           # G
    "Tt_sheet (hr)",             # H
    "Shallow surface",           # I
    "Shallow L (ft)",            # J
    "Shallow S (ft/ft)",         # K
    "Tt_shallow (hr)",           # L
    "Channel 1 L (ft)",          # M
    "Channel 1 V (ft/s)",        # N
    "Tt_ch1 (hr)",               # O
    "Channel 2 L (ft)",          # P
    "Channel 2 V (ft/s)",        # Q
    "Tt_ch2 (hr)",               # R
    "Tc computed (hr)",          # S
    "Tc final (hr)",             # T
    "Tc final (min)",            # U
]


def build_tc_path_sheet(wb: Workbook, n_rows: int = 20) -> None:
    ws = wb.create_sheet("TC_PATH")
    ws.sheet_view.showGridLines = False

    widths = [12, 18, 14, 10, 14, 12, 14, 14, 14, 14, 14, 14,
              14, 14, 14, 14, 14, 14, 14, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
        "TC_PATH — Time of Concentration by SDA / CDA (TR-55 Method)",
        styles.BH, span=21)
    ws.row_dimensions[1].height = 24

    styles.lbl(ws, 2, 1,
        "Enter Tc directly in col C OR fill the segment path "
        "(sheet flow + shallow + 2 channel segments). Direct value wins. "
        "Minimum Tc = 0.1 hr (6 min).",
        styles.WARN, span=21)
    ws.row_dimensions[2].height = 32

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    for r in range(data_start, data_end + 1):
        # USER: A, B, C (direct Tc)
        styles.inp(ws, r, 1)
        styles.inp(ws, r, 2)
        styles.inp(ws, r, 3)

        # Sheet flow segment — USER
        for c in range(4, 8):   # D, E, F, G
            styles.inp(ws, r, c)

        # H: Tt_sheet = 0.007 * (n*L)^0.8 / (P2^0.5 * S^0.4)
        styles.calc_c(ws, r, 8,
            f'=IFERROR(0.007*((D{r}*E{r})^0.8)/((F{r}^0.5)*(G{r}^0.4)),0)')

        # I: shallow surface — DROPDOWN
        styles.inp(ws, r, 9)
        # J, K USER
        styles.inp(ws, r, 10)
        styles.inp(ws, r, 11)

        # L: Tt_shallow = L / (V*3600), V depends on surface
        styles.calc_c(ws, r, 12,
            f'=IFERROR('
            f'IF(OR(J{r}="",K{r}="",I{r}=""),0,'
            f'J{r}/(IF(I{r}="paved",20.3282,16.1345)*SQRT(K{r})*3600)'
            f'),0)')

        # Channel 1 USER inputs
        styles.inp(ws, r, 13)
        styles.inp(ws, r, 14)
        styles.calc_c(ws, r, 15,
            f'=IFERROR(IF(OR(M{r}="",N{r}="",N{r}=0),0,M{r}/(N{r}*3600)),0)')

        # Channel 2 USER inputs (optional)
        styles.inp(ws, r, 16)
        styles.inp(ws, r, 17)
        styles.calc_c(ws, r, 18,
            f'=IFERROR(IF(OR(P{r}="",Q{r}="",Q{r}=0),0,P{r}/(Q{r}*3600)),0)')

        # S: Tc computed = H + L + O + R
        styles.calc_c(ws, r, 19,
            f'=IFERROR(H{r}+L{r}+O{r}+R{r},0)')

        # T: Tc final (hr) — direct overrides computed; floor 0.1 hr
        styles.calc_c(ws, r, 20,
            f'=IFERROR(IF(C{r}="",MAX(S{r},0.1),MAX(C{r}/60,0.1)),0.1)')

        # U: Tc final (min) = T * 60
        styles.calc_c(ws, r, 21, f'=T{r}*60')

    # Shallow surface dropdown on col I
    dv_surf = DataValidation(type="list", formula1='"paved,unpaved"',
                              allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_surf)
    dv_surf.sqref = f"I{data_start}:I{data_end}"
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest tests/test_tc_path.py -v`
Expected: PASS all 7 tests.

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/tc_path.py tests/test_tc_path.py
git commit -m "tc_path: new sheet for Tc with direct override or 4-segment TR-55 path"
```

---

### Task 15: PEAK_DISCHARGE_SDA + PEAK_DISCHARGE_CDA builders

**Files:**
- Create: `workbook/builders/peak_discharge.py`
- Test: `tests/test_peak_discharge.py` (new)

- [ ] **Step 1: Write failing tests**

Create `tests/test_peak_discharge.py`:

```python
import pytest
import openpyxl
from workbook.builders import params, project, sda, cda, bmp, tc_path, peak_discharge


@pytest.fixture
def wb():
    w = openpyxl.Workbook()
    w.remove(w.active)
    params.build_params_sheet(w)
    project.build_project_sheet(w)
    sda.build_sda_existing_sheet(w, n_rows=50)
    sda.build_sda_proposed_sheet(w, n_rows=50)
    cda.build_cda_existing_sheet(w, n_rows=50)
    cda.build_cda_proposed_sheet(w, n_rows=50)
    bmp.build_bmp_sheet(w, n_rows=50)
    tc_path.build_tc_path_sheet(w, n_rows=20)
    peak_discharge.build_peak_discharge_sda(w)
    peak_discharge.build_peak_discharge_cda(w)
    return w


def test_both_peak_sheets_exist(wb):
    assert "PEAK_DISCHARGE_SDA" in wb.sheetnames
    assert "PEAK_DISCHARGE_CDA" in wb.sheetnames


def test_peak_sda_has_26_cols(wb):
    headers = [wb["PEAK_DISCHARGE_SDA"].cell(row=3, column=c).value
               for c in range(1, 27)]
    assert all(h is not None for h in headers)
    assert "DA (mi²)" in headers[2]


def test_peak_sda_da_sq_mi(wb):
    # Col C = DA(SF) / 27878400
    f = wb["PEAK_DISCHARGE_SDA"].cell(row=4, column=3).value
    assert "27878400" in f or "27,878,400" in f.replace(",", "")


def test_peak_sda_tc_lookup_fallback(wb):
    # Col H = IFERROR(VLOOKUP(A, TC_PATH!A:T, 20, FALSE), 0.1)
    f = wb["PEAK_DISCHARGE_SDA"].cell(row=4, column=8).value
    assert "TC_PATH" in f
    assert "0.1" in f
    assert "IFERROR" in f


def test_peak_sda_iap_formula(wb):
    # Col J = 0.2 * S_pre / P2
    f = wb["PEAK_DISCHARGE_SDA"].cell(row=4, column=10).value
    assert "0.2" in f
    assert "F4" in f  # S_pre
    assert "I4" in f  # 2-yr rain


def test_peak_sda_qu_uses_tr55_eq(wb):
    # Col L = 10^(C0 + C1*log10(Tc) + C2*log10(Tc)^2) with PARAMS_TR55 interp
    f = wb["PEAK_DISCHARGE_SDA"].cell(row=4, column=12).value
    assert "PARAMS_TR55" in f
    assert "LOG10" in f or "LOG(" in f
    assert "10^" in f


def test_peak_sda_qp_formula(wb):
    # Col P = qu * Am * Q * Fp (=1)
    f = wb["PEAK_DISCHARGE_SDA"].cell(row=4, column=16).value
    assert "L4" in f and "C4" in f and "N4" in f


def test_peak_cda_sums_areas_from_cda_proposed(wb):
    # Col B (DA total SF) must SUMIFS from CDA_Proposed by CDA_ID
    f = wb["PEAK_DISCHARGE_CDA"].cell(row=4, column=2).value
    assert "CDA_Proposed" in f
    assert "A4" in f   # CDA_ID lookup
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_peak_discharge.py -v`
Expected: FAIL (module doesn't exist).

- [ ] **Step 3: Create `workbook/builders/peak_discharge.py`**

```python
"""Build PEAK_DISCHARGE_SDA and PEAK_DISCHARGE_CDA sheets.

TR-55 Graphical Peak Discharge Method, SCS Type II rainfall distribution,
NOAA Atlas 14 DC rainfall. Qp = qu × Am × Q × Fp (TR-55 Eq 4-1).

qu computed via TR-55 Appendix F log-polynomial equation:
    log10(qu) = C0 + C1·log10(Tc) + C2·log10(Tc)²

Coefficients (C0,C1,C2) depend on Ia/P and are stored in PARAMS_TR55
(6 Ia/P bins: 0.10, 0.30, 0.35, 0.40, 0.45, 0.50). Linear interpolation
between adjacent bins; clamp to [0.10, 0.50].
"""
from openpyxl import Workbook

from workbook import styles


SDA_FIRST = 4
SDA_LAST = 53
CDA_FIRST = 4
CDA_LAST = 53
BMP_FIRST = 6
BMP_LAST = 55

# PARAMS_TR55 named range covers 6 rows × 4 cols: Ia/P, C0, C1, C2
_TR55_N_BINS = 6


def _qu_formula(tc_ref: str, iap_ref: str) -> str:
    """Return Excel formula for qu (csm/in) given Tc(hr) and Ia/P cell refs.

    Linearly interpolates (C0, C1, C2) between PARAMS_TR55 bracketing bins.
    MATCH with type=1 gives the index of the largest Ia/P ≤ our value; clamp
    to [1, _TR55_N_BINS-1] so we always have a valid hi bin = lo+1.
    """
    # lo_idx = MIN(MAX(MATCH(iap, PARAMS_TR55[,1], 1), 1), N-1)
    lo_idx = (
        f"MIN(MAX(MATCH({iap_ref},INDEX(PARAMS_TR55,0,1),1),1),{_TR55_N_BINS - 1})"
    )
    hi_idx = f"({lo_idx}+1)"
    iap_lo = f"INDEX(PARAMS_TR55,{lo_idx},1)"
    iap_hi = f"INDEX(PARAMS_TR55,{hi_idx},1)"
    frac = f"(({iap_ref}-{iap_lo})/({iap_hi}-{iap_lo}))"

    def coef(col: int) -> str:
        return (f"(INDEX(PARAMS_TR55,{lo_idx},{col})"
                f"+{frac}*(INDEX(PARAMS_TR55,{hi_idx},{col})"
                f"-INDEX(PARAMS_TR55,{lo_idx},{col})))")

    c0, c1, c2 = coef(2), coef(3), coef(4)
    return (f"IFERROR("
            f"10^({c0}+{c1}*LOG10({tc_ref})+{c2}*(LOG10({tc_ref}))^2)"
            f",0)")


def _scs_q(p_ref: str, s_ref: str) -> str:
    return (f"IF({p_ref}>0.2*{s_ref},"
            f"({p_ref}-0.2*{s_ref})^2/({p_ref}+0.8*{s_ref}),0)")


_SDA_SUMMARY_FIRST = 58   # mirrors convention in doee.py / correct_mep


def _area_sumifs_sda(area_col: str, sda_cell: str, lu: str,
                     sheet: str) -> str:
    return (
        f"SUMIFS('{sheet}'!${area_col}${SDA_FIRST}:${area_col}${SDA_LAST},"
        f"'{sheet}'!$A${SDA_FIRST}:$A${SDA_LAST},{sda_cell},"
        f"'{sheet}'!$C${SDA_FIRST}:$C${SDA_LAST},\"{lu}\")"
    )


def _cn_composite_sda(sda_cell: str, sheet: str) -> str:
    nat  = _area_sumifs_sda("E", sda_cell, "Natural (Woods)", sheet)
    comp = _area_sumifs_sda("E", sda_cell, "Compacted (Open Space)", sheet)
    imp  = (_area_sumifs_sda("E", sda_cell, "Impervious Vehicular", sheet)
            + "+" + _area_sumifs_sda("E", sda_cell, "Impervious Non-Vehicular", sheet))
    bmp_ = _area_sumifs_sda("E", sda_cell, "BMP", sheet)
    total = f"({nat}+{comp}+{imp}+{bmp_})"
    num = (f"({nat}*INDEX(PARAMS_DetentionCN,1,2)"
           f"+{comp}*INDEX(PARAMS_DetentionCN,2,2)"
           f"+({imp})*INDEX(PARAMS_DetentionCN,3,2)"
           f"+{bmp_}*INDEX(PARAMS_DetentionCN,4,2))")
    return f"IFERROR({num}/{total},0)"


_HEADERS = [
    "SDA_ID",                     # A
    "DA total (SF)",               # B
    "DA (mi²)",                    # C
    "Pre CN",                      # D
    "Post CN",                     # E
    "S_pre (in)",                  # F
    "S_post (in)",                 # G
    "Tc (hr)",                     # H
    "2-yr Rain P₂ (in)",           # I
    "Ia/P 2-yr Pre",               # J
    "Ia/P 2-yr Post",              # K
    "qu 2-yr Pre (csm/in)",        # L
    "qu 2-yr Post (csm/in)",       # M
    "Q 2-yr Pre (in)",             # N
    "Q 2-yr Post (in)",            # O
    "Qp 2-yr Pre (cfs)",           # P
    "Qp 2-yr Post (cfs)",          # Q
    "15-yr Rain P₁₅ (in)",         # R
    "Ia/P 15-yr Pre",              # S
    "Ia/P 15-yr Post",             # T
    "qu 15-yr Pre",                # U
    "qu 15-yr Post",               # V
    "Q 15-yr Pre (in)",            # W
    "Q 15-yr Post (in)",           # X
    "Qp 15-yr Pre (cfs)",          # Y
    "Qp 15-yr Post (cfs)",         # Z
]


def _write_peak_row(ws, r: int, *,
                    sda_or_cda_ref: str,
                    da_sf_formula: str,
                    pre_cn_formula: str,
                    post_cn_formula: str) -> None:
    """Populate columns A-Z of a peak-discharge data row.

    `sda_or_cda_ref` is the formula fragment for the ID used by TC_PATH VLOOKUP.
    """
    # A: ID
    styles.calc_c(ws, r, 1, f"={sda_or_cda_ref}")

    # B: DA total SF
    styles.calc_c(ws, r, 2, da_sf_formula)

    # C: DA mi² = B / 27878400
    styles.calc_c(ws, r, 3, f"=IFERROR(B{r}/27878400,0)")

    # D-E: Pre CN, Post CN
    styles.calc_c(ws, r, 4, pre_cn_formula)
    styles.calc_c(ws, r, 5, post_cn_formula)

    # F-G: S_pre, S_post
    styles.calc_c(ws, r, 6, f"=IFERROR(1000/D{r}-10,0)")
    styles.calc_c(ws, r, 7, f"=IFERROR(1000/E{r}-10,0)")

    # H: Tc from TC_PATH (fallback 0.1 hr)
    styles.calc_c(ws, r, 8,
        f"=IFERROR(VLOOKUP(A{r},'TC_PATH'!$A$4:$T$23,20,FALSE),0.1)")

    # Per-storm cell writers
    def write_storm(rain_col: int, params_row: int,
                     iap_pre_col: int, iap_post_col: int,
                     qu_pre_col: int, qu_post_col: int,
                     q_pre_col: int, q_post_col: int,
                     qp_pre_col: int, qp_post_col: int) -> None:
        # Rain (PARAMS_Detention row params_row col 2)
        styles.calc_c(ws, r, rain_col, f"=INDEX(PARAMS_Detention,{params_row},2)")
        rain_ref = f"{styles.cl(rain_col)}{r}"

        # Ia/P = 0.2 * S / P
        styles.calc_c(ws, r, iap_pre_col,
            f"=IFERROR(0.2*F{r}/{rain_ref},0)")
        styles.calc_c(ws, r, iap_post_col,
            f"=IFERROR(0.2*G{r}/{rain_ref},0)")

        # qu via TR-55 eq
        styles.calc_c(ws, r, qu_pre_col,
            f"={_qu_formula(f'H{r}', f'{styles.cl(iap_pre_col)}{r}')}")
        styles.calc_c(ws, r, qu_post_col,
            f"={_qu_formula(f'H{r}', f'{styles.cl(iap_post_col)}{r}')}")

        # Q (SCS runoff)
        styles.calc_c(ws, r, q_pre_col,
            f"=IFERROR({_scs_q(rain_ref, f'F{r}')},0)")
        styles.calc_c(ws, r, q_post_col,
            f"=IFERROR({_scs_q(rain_ref, f'G{r}')},0)")

        # Qp = qu * Am * Q (Fp = 1)
        styles.calc_c(ws, r, qp_pre_col,
            f"=IFERROR({styles.cl(qu_pre_col)}{r}*C{r}*{styles.cl(q_pre_col)}{r},0)")
        styles.calc_c(ws, r, qp_post_col,
            f"=IFERROR({styles.cl(qu_post_col)}{r}*C{r}*{styles.cl(q_post_col)}{r},0)")

    # 2-yr block I-Q
    write_storm(9, 1, 10, 11, 12, 13, 14, 15, 16, 17)
    # 15-yr block R-Z
    write_storm(18, 2, 19, 20, 21, 22, 23, 24, 25, 26)


def build_peak_discharge_sda(wb: Workbook) -> None:
    ws = wb.create_sheet("PEAK_DISCHARGE_SDA")
    ws.sheet_view.showGridLines = False
    for i, w in enumerate([12, 12, 12, 10, 10, 12, 12, 10,
                             12, 12, 12, 14, 14, 12, 12, 14, 14,
                             12, 12, 12, 14, 14, 12, 12, 14, 14], 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
        "PEAK_DISCHARGE_SDA — TR-55 Graphical Method (SCS Type II, NOAA 14)",
        styles.BH, span=26)
    ws.row_dimensions[1].height = 24

    styles.lbl(ws, 2, 1,
        "Qp = qu × Am(mi²) × Q(in) × Fp (TR-55 Eq 4-1). Fp = 1.0. "
        "Tc looked up from TC_PATH by SDA_ID (fallback 0.1 hr).",
        styles.WARN, span=26)
    ws.row_dimensions[2].height = 32

    for i, h in enumerate(_HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 42

    for i in range(10):
        r = 4 + i
        sda_sum_row = _SDA_SUMMARY_FIRST + i
        sda_cell = f"A{r}"  # refers to col A of current row

        _write_peak_row(ws, r,
            sda_or_cda_ref=f"'SDA_Proposed'!A{sda_sum_row}",
            da_sf_formula=(
                f"=IFERROR("
                f"{_area_sumifs_sda('E', sda_cell, 'Natural (Woods)', 'SDA_Proposed')}"
                f"+{_area_sumifs_sda('E', sda_cell, 'Compacted (Open Space)', 'SDA_Proposed')}"
                f"+{_area_sumifs_sda('E', sda_cell, 'Impervious Vehicular', 'SDA_Proposed')}"
                f"+{_area_sumifs_sda('E', sda_cell, 'Impervious Non-Vehicular', 'SDA_Proposed')}"
                f"+{_area_sumifs_sda('E', sda_cell, 'BMP', 'SDA_Proposed')}"
                f",0)"
            ),
            pre_cn_formula=f"={_cn_composite_sda(sda_cell, 'SDA_Existing')}",
            post_cn_formula=f"={_cn_composite_sda(sda_cell, 'SDA_Proposed')}",
        )


def build_peak_discharge_cda(wb: Workbook) -> None:
    ws = wb.create_sheet("PEAK_DISCHARGE_CDA")
    ws.sheet_view.showGridLines = False
    for i, w in enumerate([12, 12, 12, 10, 10, 12, 12, 10,
                             12, 12, 12, 14, 14, 12, 12, 14, 14,
                             12, 12, 12, 14, 14, 12, 12, 14, 14], 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
        "PEAK_DISCHARGE_CDA — TR-55 Graphical Method per CDA",
        styles.BH, span=26)
    ws.row_dimensions[1].height = 24

    # Note copy of SDA note
    styles.lbl(ws, 2, 1,
        "Qp = qu × Am(mi²) × Q(in) × Fp (TR-55 Eq 4-1). Fp = 1.0. "
        "Tc looked up from TC_PATH by CDA_ID (fallback 0.1 hr).",
        styles.WARN, span=26)
    ws.row_dimensions[2].height = 32

    # Replace col A header for CDA context
    headers = list(_HEADERS)
    headers[0] = "CDA_ID"
    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 42

    CDA_SUMMARY_FIRST = 58
    for i in range(10):
        r = 4 + i
        cda_sum_row = CDA_SUMMARY_FIRST + i
        cda_cell = f"A{r}"

        def _area_cda(area_col: str, lu: str, sheet: str) -> str:
            return (
                f"SUMIFS('{sheet}'!${area_col}${CDA_FIRST}:${area_col}${CDA_LAST},"
                f"'{sheet}'!$A${CDA_FIRST}:$A${CDA_LAST},{cda_cell},"
                f"'{sheet}'!$C${CDA_FIRST}:$C${CDA_LAST},\"{lu}\")"
            )

        def _cn_composite_cda(sheet: str) -> str:
            nat  = _area_cda("E", "Natural (Woods)", sheet)
            comp = _area_cda("E", "Compacted (Open Space)", sheet)
            imp  = (_area_cda("E", "Impervious Vehicular", sheet) + "+"
                    + _area_cda("E", "Impervious Non-Vehicular", sheet))
            bmp_ = _area_cda("E", "BMP", sheet)
            total = f"({nat}+{comp}+{imp}+{bmp_})"
            num = (f"({nat}*INDEX(PARAMS_DetentionCN,1,2)"
                   f"+{comp}*INDEX(PARAMS_DetentionCN,2,2)"
                   f"+({imp})*INDEX(PARAMS_DetentionCN,3,2)"
                   f"+{bmp_}*INDEX(PARAMS_DetentionCN,4,2))")
            return f"IFERROR({num}/{total},0)"

        _write_peak_row(ws, r,
            sda_or_cda_ref=f"'CDA_Proposed'!A{cda_sum_row}",
            da_sf_formula=(
                f"=IFERROR("
                f"{_area_cda('E', 'Natural (Woods)', 'CDA_Proposed')}"
                f"+{_area_cda('E', 'Compacted (Open Space)', 'CDA_Proposed')}"
                f"+{_area_cda('E', 'Impervious Vehicular', 'CDA_Proposed')}"
                f"+{_area_cda('E', 'Impervious Non-Vehicular', 'CDA_Proposed')}"
                f"+{_area_cda('E', 'BMP', 'CDA_Proposed')}"
                f",0)"
            ),
            pre_cn_formula=f"={_cn_composite_cda('CDA_Existing')}",
            post_cn_formula=f"={_cn_composite_cda('CDA_Proposed')}",
        )
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest tests/test_peak_discharge.py -v`
Expected: PASS all 8 tests.

- [ ] **Step 5: Commit**

```bash
git add workbook/builders/peak_discharge.py tests/test_peak_discharge.py
git commit -m "peak_discharge: TR-55 graphical peak discharge for SDA and CDA (2-yr + 15-yr, Pre/Post)"
```

---

### Task 16: Wire new builders into `__main__.py` and update samples

**Files:**
- Modify: `workbook/__main__.py`
- Modify: `workbook/sample.py`
- Modify: `workbook/sample_trail.py`

- [ ] **Step 1: Write failing test for wiring**

Create `tests/test_structure.py` additions (or add to existing `test_structure.py`):

```python
def test_tc_path_and_peak_sheets_in_workbook():
    from workbook.__main__ import build_workbook
    wb = build_workbook()
    for name in ["TC_PATH", "PEAK_DISCHARGE_SDA", "PEAK_DISCHARGE_CDA"]:
        assert name in wb.sheetnames
```

- [ ] **Step 2: Run to verify fail**

Run: `pytest tests/test_structure.py::test_tc_path_and_peak_sheets_in_workbook -v`
Expected: FAIL (sheets not built in __main__.py yet).

- [ ] **Step 3: Update `workbook/__main__.py`**

Add imports and build calls:

```python
from workbook.builders import (
    params, project, sda, cda, bmp, correct_mep_summary,
    eisa_direct, eisa_tr55, doee, tc_path, peak_discharge,
)


def build_workbook() -> openpyxl.Workbook:
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    project.build_project_sheet(wb)
    params.build_params_sheet(wb)
    sda.build_sda_existing_sheet(wb, n_rows=50)
    sda.build_sda_proposed_sheet(wb, n_rows=50)
    cda.build_cda_existing_sheet(wb, n_rows=50)
    cda.build_cda_proposed_sheet(wb, n_rows=50)
    bmp.build_bmp_sheet(wb, n_rows=50)
    tc_path.build_tc_path_sheet(wb, n_rows=20)             # NEW
    peak_discharge.build_peak_discharge_sda(wb)             # NEW
    peak_discharge.build_peak_discharge_cda(wb)             # NEW
    correct_mep_summary.build_correct_mep_summary(wb)
    eisa_direct.build_eisa_direct(wb)
    eisa_tr55.build_eisa_tr55(wb)
    doee.build_doee_sda(wb)
    doee.build_doee_bmp_data(wb)
    doee.build_doee_detention(wb)
    doee.build_doee_detention_bmp(wb)
    doee.build_doee_compliance(wb)

    apply_number_formats(wb)
    return wb
```

- [ ] **Step 4: Update `workbook/sample.py` and `workbook/sample_trail.py`**

Open each file and add realistic values for all new user-input cells on BMP, TC_PATH, and whatever other new input cells arose. Key fields to populate per BMP row (Minnesota Ave, Bioretention Enhanced with underdrain):

```python
# BMP sheet row additions (adapt to each sample's existing BMP rows)
ws_bmp = wb["BMP"]
# Row 6 — bio row example
ws_bmp["Q6"] = 0.25     # d_topsoil (ft)
ws_bmp["T6"] = 0.25     # d_choker (ft)
ws_bmp["V6"] = "Y"      # Underdrain
ws_bmp["W6"] = 6        # UD size (in)
ws_bmp["X6"] = 0.25     # UD headspace (ft)
ws_bmp["AW6"] = 98.0    # Bio surface elev
ws_bmp["AY6"] = 0.25    # 15-yr head assumed
ws_bmp["AZ6"] = 100.0   # min sidewalk
ws_bmp["BA6"] = 99.0    # min curb-cut
ws_bmp["BE6"] = 1       # # obs wells/cleanouts

# Row for Dry Swale (adjust row # per sample)
# ws_bmp["BF8"] = 225    # L_s
# ws_bmp["BG8"] = 4      # w_s
# ws_bmp["BH8"] = 3      # side slope 3:1
# ... (top-grade, curb-cut, sidewalk US/DS; inverts; H_cd; X_cd; # cleanouts; 15-yr head)

# TC_PATH sheet: one row per SDA/CDA with realistic Tc path
ws_tc = wb["TC_PATH"]
ws_tc["A4"] = "SDA-1"
ws_tc["B4"] = "Minnesota Ave mainline"
# Option A: direct Tc override (simpler)
ws_tc["C4"] = 10        # 10 minutes direct
# Option B: fill segments — leave C4 blank and fill D-R
# (pick ONE approach per sample row)
```

Mirror pattern for `sample_trail.py` with no-underdrain, trail-appropriate values.

- [ ] **Step 5: Run full suite + commit**

Run: `pytest tests/ -v`
Expected: PASS all.

```bash
git add workbook/__main__.py workbook/sample.py workbook/sample_trail.py tests/test_structure.py
git commit -m "wire new TC_PATH + PEAK_DISCHARGE builders; populate samples with new BMP/TC fields"
```

---

### Task 17: Regenerate fixtures and full-suite validation

**Files:**
- Regenerate: `fixtures/SW_Required_Provided_DOEE_EISA438*.xlsx`

- [ ] **Step 1: Regenerate blank template**

Run:

```bash
python -m workbook
```

Expected: writes `SW_Required_Provided_DOEE_EISA438.xlsx` to project root.

- [ ] **Step 2: Regenerate samples**

Run:

```bash
python -m workbook sample
python -m workbook sample_trail
```

(Or whatever CLI entry point exists for the sample scripts — check `workbook/__main__.py` or each sample module.)

Expected: writes `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx` and `..._SAMPLE_Trail.xlsx`.

- [ ] **Step 3: Move regenerated fixtures into `fixtures/`**

If the `fixtures/` directory convention requires moving files from project root:

```bash
mv SW_Required_Provided_DOEE_EISA438*.xlsx fixtures/
```

(Skip if the sample scripts already write directly to `fixtures/`.)

- [ ] **Step 4: Open each fixture in Excel to sanity-check**

- Verify BMP sheet has 81 cols with zone banners, legend row, row-5 tags
- Verify sample row has formula cells computing (no #REF, #NAME errors)
- Verify PEAK_DISCHARGE_SDA row 4 shows numeric Qp values for sample SDA
- Verify DOEE_DETENTION row 4 shows Pre CN, Post CN, Adj CN populated

- [ ] **Step 5: Full test suite + commit**

Run: `pytest tests/ -v`
Expected: ALL tests pass.

```bash
git add fixtures/
git commit -m "regenerate fixtures: blank template + Minnesota Ave + Trail samples with new schema"
```

---

## Self-review checklist

- [x] Spec section 1 (BMP sheet items 1,3,4,5) — covered by Tasks 3-9
- [x] Spec section 2 (EISA sheets item 1) — Task 10
- [x] Spec section 3 (Correct MEP item 2) — Task 11
- [x] Spec section 4 (DOEE Detention item 8) — Tasks 12-13
- [x] Spec section 5 (TR-55 Peak Discharge + TC_PATH item 6) — Tasks 14-15
- [x] Spec section 6 (tests + fixtures) — Tasks 1-17 each include tests; Task 17 regenerates fixtures
- [x] Spec section 7 (Phase B/C deferred) — documented in spec, no tasks needed
- [x] PARAMS extensions — Task 1
- [x] Styles tints — Task 2
- [x] Wiring + samples — Task 16

