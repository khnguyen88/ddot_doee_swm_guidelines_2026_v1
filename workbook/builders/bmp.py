"""Build the BMP sheet — one row per BMP, all parameter columns, auto outputs."""
from openpyxl import Workbook
from openpyxl.styles import Side, Border
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles

# Columns that mark the right edge of each BMP zone (1-based column numbers).
# Updated for the 81-col layout:
# ID (A-E=5), PP (F-M=13), Bio/Dry Swale (N-AD=30), Wet Swale (AE-AG=33),
# Trees (AH-AN=40), Outputs (AO-AT=46), Checks (AU-AV=48),
# Supplemental Bio (AW-BE=57), Supplemental Swale (BF-BZ=78), Swale Pond (CA-CC=81)
_ZONE_DIVIDER_COLS = (5, 13, 30, 33, 40, 46, 48, 57, 78, 81)

_MEDIUM_RIGHT = Side(style="medium", color="000000")

# CDA data table range (used by Ksat HSG lookup formulas)
CDA_D1 = 4
CDA_DL = 103   # must match DEFAULT_N_ROWS in sda.py (data rows 4..n_rows+3)

# Area_Summary CDA section anchors — kept in sync with
# workbook.builders.area_summary module constants. BMP's Max-BMP-Credit and
# SA:CDA% formulas look up by CDA_ID into this range.
from workbook.builders import area_summary as _as
AREA_SHEET      = "Area_Summary"
AREA_CDA_FIRST  = _as.CDA_FIRST_DATA_ROW   # 28
AREA_CDA_LAST   = _as.CDA_LAST_DATA_ROW    # 47


def _cda_dominant_hsg_formula(cda_cell: str) -> str:
    """Build an Excel formula returning the most conservative HSG present in
    the CDA referenced by `cda_cell` (e.g. "C4").

    Picks D > C > B > A so lined/clay soils are preferred when multiple HSGs
    coexist. Uses nested IF (not IFS) for Excel 2016 compatibility.
    """
    def _sumifs(hsg: str) -> str:
        return (
            f"SUMIFS('CDA_Proposed'!$E${CDA_D1}:$E${CDA_DL},"
            f"'CDA_Proposed'!$A${CDA_D1}:$A${CDA_DL},{cda_cell},"
            f"'CDA_Proposed'!$D${CDA_D1}:$D${CDA_DL},\"{hsg}\")"
        )
    return (
        f'IF({_sumifs("D")}>0,"D",'
        f'IF({_sumifs("C")}>0,"C",'
        f'IF({_sumifs("B")}>0,"B",'
        f'IF({_sumifs("A")}>0,"A",""))))'
    )


BMP_TYPES = [
    "Permeable Pavement",
    "Bioretention",
    "Dry Swale",
    "Wet Swale",
    "Planted Trees",
    "Preserve Trees",
]

# (BMP Type, Sub-Type) → PARAMS_BMP row index (1-based within named range).
# PARAMS_BMP covers rows 36-42 on PARAMS sheet (7 BMP sub-type rows).
BMP_PARAM_ROWS = [
    ("Permeable Pavement", "Enhanced",                1),
    ("Permeable Pavement", "Underdrained Enhanced",   2),
    ("Bioretention",       "Standard",                3),
    ("Bioretention",       "Enhanced",                4),
    ("Bioretention",       "Enhanced w/ Underdrain",  5),
    ("Dry Swale",          "—",                       6),
    ("Wet Swale",          "—",                       7),
]

# ---------------------------------------------------------------------------
# Row 3 zone banners — (start_col, end_col, text)
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Row 4 column headers — 81 entries (cols A through CC)
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# Row 5 INPUT/AUTO tags — 81 entries (same order as HEADERS)
# ---------------------------------------------------------------------------
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
assert len(ROW5_TAGS) == 81, f"Expected 81 tags, got {len(ROW5_TAGS)}"


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
    y_formula = f'=IF(V{r}="Y",MAX(0,U{r}-X{r}-W{r}/12),U{r})'
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


def _populate_outputs(ws, r: int) -> None:
    """Populate Wet Swale (AE-AG), Trees (AH-AN), Outputs (AO-AT) for row r."""
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

    # ── AR: Max BMP Credit — VLOOKUP into Area_Summary CDA section col E ──
    # Area_Summary CDA section: A=CDA_ID … E=Max BMP Credit (CF).
    # Rows CDA_FIRST_DATA_ROW..CDA_LAST_DATA_ROW = 28..47 (N_SUMMARY_ROWS=20).
    styles.calc_c(ws, r, 44,
        f"=IFERROR(VLOOKUP(C{r},"
        f"'{AREA_SHEET}'!$A${AREA_CDA_FIRST}:$E${AREA_CDA_LAST},5,FALSE),0)")
    ws.cell(row=r, column=44).fill = styles.fill(styles.CDA_TINT)

    # ── AS: Rv Applied = IF(AR=0, AQ, MIN(AQ, AR)) ──
    styles.calc_c(ws, r, 45,
        f"=IFERROR(IF(AR{r}=0,AQ{r},MIN(AQ{r},AR{r})),0)")

    # ── AT: Rv Reservoir = Y * Z * O (EISA-only credit) ──
    styles.calc_c(ws, r, 46, f"=IFERROR(Y{r}*Z{r}*O{r},0)")


def _sa_cda_pct_formula(r: int) -> str:
    """SA:CDA % = N (SA_top) / Total CDA Post (SF).
    Pulls the Post Total from Area_Summary CDA section col D via VLOOKUP."""
    return (
        f"=IFERROR(N{r}/VLOOKUP(C{r},"
        f"'{AREA_SHEET}'!$A${AREA_CDA_FIRST}:$D${AREA_CDA_LAST},4,FALSE),0)"
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

    # Bio checks: SA:CDA, pond, media, gravel, freeboard (BD), cleanouts (BE)
    bio_check = (
        f'IF(AU{r}<{sa_cda_min},"✗ SA:CDA below min",'
        f'IF(AU{r}>{sa_cda_max},"✗ SA:CDA above max",'
        f'IF(AA{r}<{min_pond},"✗ d_pond < min",'
        f'IF(R{r}<{min_media},"✗ d_media < min",'
        f'IF(U{r}<{min_gravel},"✗ d_gravel < min",'
        f'IF(BD{r}<{min_fb},"✗ Freeboard < 3 in",'
        f'IF(BE{r}<{min_cln},"⚠ No cleanout/obs well","✓")))))))'
    )

    # Dry Swale: SA:CDA, H_cd≈d_pond, media, gravel, freeboard (BZ), cleanouts (BW), slope
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

    # PP: drawdown (L) and min gravel (U ≥ 1.0)
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


def _populate_bio_supp(ws, r: int) -> None:
    """Populate Supplemental Bioretention zone (AW-BE)."""
    # AW: surface elev — USER
    styles.inp(ws, r, 49)

    # AX: ponding elev = AW + d_pond(AA)
    styles.calc_c(ws, r, 50, f'=IFERROR(AW{r}+AA{r},"")')

    # AY: 15-yr head assumed — USER
    styles.inp(ws, r, 51)

    # AZ: min sidewalk elev — USER
    styles.inp(ws, r, 52)

    # BA: min curb-cut elev — USER
    styles.inp(ws, r, 53)

    # BB: UD invert = AW - Q - R - T - X - W/12 (only when underdrain present)
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


def _populate_swale_method(ws, r: int) -> None:
    """Populate Swale Method + Sv DOEE + Sv Actual (CA-CC).

    CA defaults to "DOEE" (capped wedge, conservative per DOEE spec); setting
    it to "Actual" uses CC's uncapped wedge instead.  CB and CC are both
    always computed; the Sv Total formula in col AO picks between them.
    """
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


def _apply_zone_dividers(ws, row_first: int, row_last: int) -> None:
    """Apply a medium right border to zone-dividing columns for the given row range."""
    for col in _ZONE_DIVIDER_COLS:
        for row in range(row_first, row_last + 1):
            cell = ws.cell(row=row, column=col)
            cell.border = Border(
                left=cell.border.left,
                top=cell.border.top,
                bottom=cell.border.bottom,
                right=_MEDIUM_RIGHT,
            )


def _ifs_bmp_param(cell_type: str, cell_sub: str, param_col: int) -> str:
    """Emit a 7-arm IFS formula pulling param_col from PARAMS_BMP.

    Each arm checks AND(D{r}="Type", E{r}="SubType") and returns
    INDEX(PARAMS_BMP, row_idx, param_col).  A final TRUE arm returns
    an empty string so blank BMP rows show nothing.

    Wrapped in IFERROR to suppress any residual errors on blank rows.
    """
    # Build a nested IF cascade (not IFS) for compatibility with Excel 2016
    # and earlier, which trigger #NAME? on IFS.
    result = '""'   # innermost fallback — matches old TRUE,"" arm
    for bmp_type, sub_type, idx in reversed(BMP_PARAM_ROWS):
        condition = f'AND({cell_type}="{bmp_type}",{cell_sub}="{sub_type}")'
        value = f"INDEX(PARAMS_BMP,{idx},{param_col})"
        result = f'IF({condition},{value},{result})'
    return f'=IFERROR({result},"")'


def build_bmp_sheet(wb: Workbook, n_rows: int = 50) -> None:
    """Add the BMP sheet to *wb*.

    Layout:
      Row 1: title banner (spans all 81 cols)
      Row 2: legend bar (text-only, single wide cell)
      Row 3: zone banners
      Row 4: column headers (81 cols)
      Row 5: INPUT/AUTO tags
      Rows 6..(5+n_rows): one BMP per row — placeholder inputs for now
                          (formulas populated in Tasks 4-9)
    """
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

    for r in range(data_start, data_end + 1):
        _populate_pp_bio_stack(ws, r)
        _populate_outputs(ws, r)
        # AU (col 47): SA:CDA %
        styles.calc_c(ws, r, 47, _sa_cda_pct_formula(r))
        ws.cell(row=r, column=47).number_format = "0.0%"
        # AV (col 48): Sizing Check
        styles.calc_c(ws, r, 48, _sizing_check_formula(r))
        # AW-BE (49-57): Supplemental Bioretention
        _populate_bio_supp(ws, r)
        # BF-BZ (58-78): Supplemental Swale
        _populate_swale_supp(ws, r)
        # CA-CC (79-81): Swale Method + Sv DOEE + Sv Actual
        _populate_swale_method(ws, r)

    # ── Data Validations ──
    # SDA_ID column B — named range SDA_IDs
    dv_sda = DataValidation(type="list", formula1="=SDA_IDs",
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_sda)
    dv_sda.sqref = f"B{data_start}:B{data_end}"

    # CDA_ID column C — named range CDA_IDs
    dv_cda = DataValidation(type="list", formula1="=CDA_IDs",
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_cda)
    dv_cda.sqref = f"C{data_start}:C{data_end}"

    # BMP Type column D — explicit list (6 types)
    dv_type = DataValidation(
        type="list",
        formula1='"' + ",".join(BMP_TYPES) + '"',
        allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_type)
    dv_type.sqref = f"D{data_start}:D{data_end}"

    # Sub-Type column E — DROPDOWN (unique sub-types from PARAMS_BMP rows)
    sub_types = [sub for (_t, sub, _idx) in BMP_PARAM_ROWS]
    # Preserve order while deduping
    seen = set()
    unique_subs = []
    for s in sub_types:
        if s not in seen:
            seen.add(s)
            unique_subs.append(s)
    dv_sub = DataValidation(
        type="list",
        formula1='"' + ",".join(unique_subs) + '"',
        allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_sub)
    dv_sub.sqref = f"E{data_start}:E{data_end}"

    # Underdrain Y/N — col V
    dv_ud = DataValidation(type="list", formula1='"Y,N"',
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_ud)
    dv_ud.sqref = f"V{data_start}:V{data_end}"

    # Swale Method — col CA
    dv_method = DataValidation(type="list", formula1='"DOEE,Actual"',
                                allow_blank=False, showDropDown=False)
    ws.add_data_validation(dv_method)
    dv_method.sqref = f"CA{data_start}:CA{data_end}"

    # Zone dividers on header rows and data rows
    _apply_zone_dividers(ws, 3, data_end)
