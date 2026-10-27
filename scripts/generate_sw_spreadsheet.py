"""
Generate SW_Required_Provided_DOEE_EISA438.xlsx
6-sheet stormwater compliance calculator — DOEE + EISA Section 438

EISA methodology: SCS/TR-55 CN-based runoff, per EISA §438 sample calcs (2017)
  Q_a (in) = (P - 0.2*S)^2 / (P + 0.8*S)  where S = 1000/CN - 10
  4 land cover types x HSG A/B/C/D: Impervious | Woods | BMP/Pervious | Compact/Open Space
  Compliance: Net post-dev runoff = Prop Runoff - BMP Vol Inf <= Pre-dev (existing) runoff
  BMP Vol Inf = BMP_Area(SF) x MIN(P/12 ft, media_depth×eta_m + gravel_depth×eta_g)

DOEE methodology: SWRv = (P/12) x [0.95x(Imp+Veh+BMP) + 0.25xComp] x 43,560
  BMP Vol Retained = MIN(Vmax, Sv x Retention Value)
  Vmax = (1.7/12)*[0.25*CDA_comp + 0.95*(CDA_imp + BMP_area)] x 43,560

CDA lookup table (Sheet 3) is the key cross-sheet reference:
  CDA ID in 4-BMP DOEE  → auto-fills CDA Imp, CDA Comp, BMP Area (for Vmax)
  CDA ID in 5-BMP EISA  → auto-fills SDA ID and BMP footprint by HSG
"""

import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

wb = openpyxl.Workbook()

# ── Colors ────────────────────────────────────────────────────────────────────
BH  = "1F4E79"; BS  = "2E75B6"; BL  = "BDD7EE"   # DOEE dark / mid / light
GH  = "375623"; GS  = "538135"; GL  = "E2EFDA"   # EISA dark / mid / light
INP = "FFFFC7"; CALC= "DEEAF1"; GRY = "F2F2F2"; WHT = "FFFFFF"

def fill(c): return PatternFill("solid", fgColor=c)
def fnt(bold=False, white=False, sz=10):
    return Font(bold=bold, color="FFFFFF" if white else "000000", size=sz)
def bord():
    s = Side(style="thin", color="BFBFBF")
    return Border(left=s, right=s, top=s, bottom=s)
def ctr(): return Alignment(horizontal="center", vertical="center", wrap_text=True)
def lft(): return Alignment(horizontal="left",  vertical="center", wrap_text=True)

def hdr(ws, r, c, val, bg, bold=True, white=True, span=None):
    cell = ws.cell(row=r, column=c, value=val)
    cell.fill = fill(bg); cell.font = fnt(bold, white); cell.alignment = ctr(); cell.border = bord()
    if span:
        ws.merge_cells(start_row=r, start_column=c, end_row=r, end_column=span)
        for cc in range(c+1, span+1):
            ws.cell(row=r, column=cc).fill = fill(bg)

def inp(ws, r, c, val=None):
    cell = ws.cell(row=r, column=c, value=val)
    cell.fill = fill(INP); cell.font = fnt(); cell.alignment = ctr(); cell.border = bord()
    return cell

def calc_c(ws, r, c, formula):
    cell = ws.cell(row=r, column=c, value=formula)
    cell.fill = fill(CALC); cell.font = fnt(); cell.alignment = ctr(); cell.border = bord()
    return cell

def lbl(ws, r, c, val, bg=GRY, bold=False, span=None):
    cell = ws.cell(row=r, column=c, value=val)
    cell.fill = fill(bg); cell.font = fnt(bold); cell.alignment = lft(); cell.border = bord()
    if span:
        ws.merge_cells(start_row=r, start_column=c, end_row=r, end_column=span)
        for cc in range(c+1, span+1):
            ws.cell(row=r, column=cc).fill = fill(bg)
    return cell

def cw(ws, c, w): ws.column_dimensions[get_column_letter(c)].width = w
def cl(c): return get_column_letter(c)

def qa(P, cn):
    S = f"(1000/{cn}-10)"
    return f"MAX(0,IF({P}>0.2*{S},({P}-0.2*{S})^2/({P}+0.8*{S}),0))"

P5  = "'6-Parameters'!$B$8"    # EISA 95th pct storm depth (1.7")
P5B = "'6-Parameters'!$B$"     # prefix for Parameters cell refs
CDA_REF = "'3-CDA LandUse'!$A$4:$I$53"   # CDA lookup table range


# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 6 — PARAMETERS
# ═══════════════════════════════════════════════════════════════════════════════
ws5 = wb.active
ws5.title = "6-Parameters"
ws5.sheet_view.showGridLines = False
for i, w in enumerate([36, 12, 12, 12, 30], 1): cw(ws5, i, w)
hdr(ws5, 1, 1, "GENERAL PARAMETERS", BH, span=5)
ws5.row_dimensions[1].height = 26

def s5sec(r, t, bg): hdr(ws5, r, 1, t, bg, span=5)
def s5row(r, label, val, unit="", note=""):
    lbl(ws5, r, 1, label); inp(ws5, r, 2, val)
    lbl(ws5, r, 3, unit); lbl(ws5, r, 4, note, span=5)
    ws5.cell(row=r, column=5).fill = fill(GRY)

s5sec(3, "RAINFALL DEPTHS", BS)
s5row(4, "DOEE MLD design storm (P_MLD)",        1.2, "in", "21 DCMR §599 — Major Land Disturbing")
s5row(5, "DOEE MSI design storm (P_MSI)",        0.8, "in", "21 DCMR §599 — Major Substantial Improvement")
s5row(6, "DOEE MSI-AWDZ design storm (P_AWDZ)",  1.0, "in", "Anacostia Waterfront District Zone")
s5row(7, "DOEE Vmax storm depth",                1.7, "in", "BMP credit cap — max CDA contributing depth")
s5row(8, "EISA 95th percentile storm (DC)",      1.7, "in", "EPA Table 1 — Washington DC 24-hr 95th percentile")

s5sec(10, "SCS CURVE NUMBERS BY LAND COVER AND HYDROLOGIC SOIL GROUP  (TR-55; per EISA §438 sample comps)", GS)
ws5.row_dimensions[10].height = 22
for i, h in enumerate(["Land Cover / Condition", "HSG A", "HSG B", "HSG C", "HSG D"], 1):
    c_ = ws5.cell(row=11, column=i, value=h)
    c_.fill = fill(GL); c_.font = fnt(bold=True); c_.alignment = ctr(); c_.border = bord()

cn_table = [
    ("Impervious (paved, rooftop, compacted imperv)",   98, 98, 98, 98),
    ("Woods — good condition (forest, good cover)",     25, 55, 70, 77),
    ("BMP / Pervious (bioretention, bioswale — as grass good)", 39, 61, 74, 80),
    ("Compact/Open Space — good condition (grass, good lawn)",  39, 61, 74, 80),
    ("Compact/Open Space — fair condition (grass, fair)",       49, 69, 79, 84),
    ("Compact/Disturbed (construction grading)",                77, 85, 90, 92),
    ("Open water / wetland",                                    98, 98, 98, 98),
]
for i, row_data in enumerate(cn_table):
    r = 12 + i
    lbl(ws5, r, 1, row_data[0])
    for j, v in enumerate(row_data[1:], 2): inp(ws5, r, j, v)

s5sec(20, "SCS RUNOFF EQUATION", GS)
lbl(ws5, 21, 1,
    "Q_a (in) = (P - 0.2*S)^2 / (P + 0.8*S) where S = 1000/CN - 10.  If P <= 0.2*S then Q_a = 0.",
    span=5)
for c in range(2, 6): ws5.cell(row=21, column=c).fill = fill(GRY)
lbl(ws5, 22, 1,
    "Volume (ft3) = SUM [ Area_i(SF) x Q_a_i(in) ] / 12.  "
    "HSG-A Woods (CN=25: 0.2S=6.0>1.7) and HSG-B Woods (CN=55: 0.2S=1.64>1.7) "
    "produce ZERO runoff for P=1.7\" — include area but they contribute 0 ft3.  "
    "Ref: Rock Creek Park EISA §438 calcs, May 2017.",
    span=5)
for c in range(2, 6): ws5.cell(row=22, column=c).fill = fill(GRY)
ws5.row_dimensions[22].height = 36

s5sec(24, "DOEE RUNOFF COEFFICIENTS (Rv) FOR SWRv CALCULATION", BS)
for i, h in enumerate(["DOEE Land Use Category", "Rv", "Unit", "Notes", ""], 1):
    c_ = ws5.cell(row=25, column=i, value=h)
    c_.fill = fill(BL); c_.font = fnt(bold=True); c_.alignment = ctr(); c_.border = bord()
doee_rv = [
    ("Impervious (rooftop, pavement)",       0.95, "", "21 DCMR §599"),
    ("Impervious Vehicular",                 0.95, "", "50% retention req per 21 DCMR"),
    ("Compacted (landscaped/disturbed)",     0.25, "", "DOEE Guidebook §2.3"),
    ("Natural / Open Space",                 0.00, "", "Effectively zero for SWRv"),
    ("BMP Area (in CDA)",                    0.95, "", "Counted as impervious for Vmax calc"),
]
for i, (lc, rv, u, note) in enumerate(doee_rv):
    r = 26 + i
    lbl(ws5, r, 1, lc); inp(ws5, r, 2, rv); lbl(ws5, r, 3, u)
    lbl(ws5, r, 4, note, span=5); ws5.cell(row=r, column=5).fill = fill(GRY)

# ── BMP Void Ratios (rows 34-39, col B) — referenced by BMP EISA void ratio formulas ──
s5sec(32, "BMP MEDIA VOID RATIOS", BS)
for i, h in enumerate(["Material", "Void Ratio (eta)", "Unit", "Notes", ""], 1):
    c_ = ws5.cell(row=33, column=i, value=h)
    c_.fill = fill(BL); c_.font = fnt(bold=True); c_.alignment = ctr(); c_.border = bord()
void_data = [
    ("Bioretention filter media",      0.25, "", "DOEE Guidebook §3.6"),           # B34
    ("Gravel / stone reservoir",       0.40, "", "DOEE §3.6; EISA sample standard (Rock Creek)"),  # B35
    ("Perm. pave reservoir (fine)",    0.33, "", "Open-graded aggregate"),          # B36
    ("Porous asphalt gravel base",     0.40, "", "EISA: 0.5ft gravel x 0.40 = 0.20ft storage"),   # B37
    ("Green roof drainage layer",      0.90, "", "DOEE Guidebook §3.2"),            # B38
    ("Green roof growth media",        0.10, "", "Saturated water-holding capacity"),# B39
]
for i, (m, v, u, note) in enumerate(void_data):
    r = 34 + i
    lbl(ws5, r, 1, m); inp(ws5, r, 2, v); lbl(ws5, r, 3, u)
    lbl(ws5, r, 4, note, span=5); ws5.cell(row=r, column=5).fill = fill(GRY)

s5sec(41, "DOEE BMP RETENTION VALUES", BS)
for i, h in enumerate(["Code", "Ret. Value", "", "Description", "Notes"], 1):
    c_ = ws5.cell(row=42, column=i, value=h)
    c_.fill = fill(BL); c_.font = fnt(bold=True); c_.alignment = ctr(); c_.border = bord()
ret_vals = [
    ("B-1", 0.6, "", "Bioretention — no underdrain (partial)",  ""),
    ("B-2", 1.0, "", "Bioretention — full infiltration",         ""),
    ("G-1", 0.6, "", "Green Roof — extensive",                   "ET credit only"),
    ("G-2", 1.0, "", "Green Roof — intensive",                   ""),
    ("P-1", 1.0, "", "Perm. Pavement — full infiltration",       ""),
    ("P-2", 0.6, "", "Perm. Pavement — partial (underdrain)",   ""),
    ("P-3", 0.6, "", "Perm. Pavement — detained",                ""),
    ("R-1", 1.0, "", "Rainwater Harvesting",                     "Volume actually reused"),
    ("ISD", 0.5, "", "Impervious Surface Disconnection",          "50% credit"),
]
for i, (code, rv, _, desc, note) in enumerate(ret_vals):
    r = 43 + i
    lbl(ws5, r, 1, code, GRY, bold=True); inp(ws5, r, 2, rv); lbl(ws5, r, 3, "")
    lbl(ws5, r, 4, desc); lbl(ws5, r, 5, note)

s5sec(53, "EISA BMP STORAGE DESIGN DEFAULTS  (from EISA Technical Guidance + Rock Creek Park sample calcs)", GS)
for i, h in enumerate(["BMP Type", "Gravel Depth (ft)", "Void Ratio", "Storage = d x eta (ft)", "Notes"], 1):
    c_ = ws5.cell(row=54, column=i, value=h)
    c_.fill = fill(GL); c_.font = fnt(bold=True); c_.alignment = ctr(); c_.border = bord()
eisa_bmp_d = [
    ("Porous Asphalt / Perm. Pave",  0.5,  0.40, None, "Design depth=MIN(1.7/12=0.142,0.20)=0.142ft (storm-limited)"),
    ("Bioretention",                  0.25, 0.40, None, "Design depth=MIN(0.142,0.10)=0.10ft (STORAGE-LIMITED)"),
    ("Bioswale",                      0.25, 0.40, None, "Same as bioretention"),
    ("Green Roof",                    None, None, None, "Use 1-in effective per EISA guidance Appendix D"),
    ("Cistern",                       None, None, None, "Full cistern volume — demand-limited sizing"),
]
for i, (btype, gd, vr, _, note) in enumerate(eisa_bmp_d):
    r = 55 + i
    lbl(ws5, r, 1, btype); inp(ws5, r, 2, gd); inp(ws5, r, 3, vr)
    if gd and vr: calc_c(ws5, r, 4, f"=B{r}*C{r}")
    else: lbl(ws5, r, 4, "—")
    lbl(ws5, r, 5, note)

s5sec(61, "TREE PLANTING & PRESERVATION — STORMWATER CREDITS  (DOEE SWM Guidebook 2020 §3.14.5, Tables 3-52/3-53)", GS)
ws5.row_dimensions[61].height = 22
for i, h in enumerate(["Category", "Credit (CF/tree)", "Unit", "Notes", ""], 1):
    c_ = ws5.cell(row=62, column=i, value=h)
    c_.fill = fill(GL); c_.font = fnt(bold=True); c_.alignment = ctr(); c_.border = bord()
tree_credits = [
    ("Planted Small Tree  (mature canopy ≤40 ft spread)",  5,  "CF/tree", "Table 3-53 — new planting credit"),
    ("Planted Large Tree  (mature canopy >40 ft spread)", 10,  "CF/tree", "Table 3-53 — new planting credit"),
    ("Preserved Small Tree  (canopy ≤40 ft spread)",      10,  "CF/tree", "Table 3-52 — preservation credit"),
    ("Preserved Large Tree  (canopy >40 ft spread)",      20,  "CF/tree", "Table 3-52 — preservation credit"),
    ("Preserved Special Tree  (circumference 44–99.9 in)",30,  "CF/tree", "Table 3-52 — preservation credit"),
    ("Preserved Heritage Tree  (circumference ≥100 in)",  40,  "CF/tree", "Table 3-52 — preservation credit"),
]
for i, (cat, cred, unit, note) in enumerate(tree_credits):
    r = 63 + i   # B63=planted small … B68=preserved heritage
    lbl(ws5, r, 1, cat); inp(ws5, r, 2, cred); lbl(ws5, r, 3, unit)
    lbl(ws5, r, 4, note, span=5); ws5.cell(row=r, column=5).fill = fill(GRY)


# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 2 — SITE DRAINAGE AREA (SDA) LAND USE / SOIL BREAKDOWN
#
# 61 columns — layout:
# A-B(1-2)    : SDA name, trigger
# C(3)        : HSG (informational, DOEE context)
# D-I(4-9)   : WITHIN LOD DOEE: Imp, Veh, Comp, Natural, BMP (ac), Total Within (SF)
# J-N(10-14) : OUTSIDE LOD DOEE: Imp, Comp, Natural (ac), Total Outside (SF), Total SDA (SF)
# O-AA(15-27): EISA Existing — total SDA: Imp | Woods A/B/C/D | BMP A/B/C/D | Comp A/B/C/D
# AB-AN(28-40): EISA Proposed — same 13-col layout
# AO-BA(41-53): Trees (6 type×2 + total): Planted Small/Large, Preserved Small/Large/Special/Heritage
# BB-BG(54-59): DOEE calcs: P, Rv-in, SWRv-in, Rv-out, SWRv-out (info), Net SWRv after trees
# BH-BI(60-61): EISA: Pre-dev runoff, Prop-cond runoff (total SDA)
# ═══════════════════════════════════════════════════════════════════════════════
ws2 = wb.create_sheet("2-SDA LandUse")
ws2.sheet_view.showGridLines = False

# Column widths (61 cols)
cw2 = (
    [14, 9, 7]            # A-C: SDA name, trigger, HSG
  + [8, 8, 8, 8, 8, 10]  # D-I: within LOD DOEE (5 land uses + total SF)
  + [8, 8, 8, 10, 10]    # J-N: outside LOD DOEE (3 land uses + total + total SDA)
  + [9] + [8]*4 + [8]*4 + [8]*4   # O-AA: EISA existing (13)
  + [9] + [8]*4 + [8]*4 + [8]*4   # AB-AN: EISA proposed (13)
  + [8, 9]*6 + [11]       # AO-BA: trees (6 pairs count+credit + total)
  + [8, 8, 12, 8, 12, 12] # BB-BG: DOEE calcs
  + [12, 12]               # BH-BI: EISA runoff
)
for i, w in enumerate(cw2, 1): cw(ws2, i, w)

# ── Row 1: Title ──────────────────────────────────────────────────────────────
hdr(ws2, 1, 1,
    "SITE DRAINAGE AREA (SDA) — LAND USE, HSG & TREE CREDITS"
    "  [SDA may include areas WITHIN and OUTSIDE the LOD that drain to a common outfall]",
    BH, span=61)
ws2.row_dimensions[1].height = 26

# ── Row 2: Section group headers ──────────────────────────────────────────────
TPH = "375623"   # tree section header (dark green = GH)
hdr(ws2, 2,  1, "Site DA (SDA)",                                          BH,  span=3)
hdr(ws2, 2,  4, "WITHIN LOD — DOEE Land Use (acres + total SF)",          BS,  span=9)
hdr(ws2, 2, 10, "OUTSIDE LOD — DOEE Land Use  (offsite contributing area)", BH, span=14)
hdr(ws2, 2, 15, "EISA Existing Conditions — Total SDA (SF)",              GS,  span=27)
hdr(ws2, 2, 28, "EISA Proposed Conditions — Total SDA (SF)",              GS,  span=40)
hdr(ws2, 2, 41, "Tree Planting & Preservation (within LOD) — SWv Credits (CF)", TPH, span=53)
hdr(ws2, 2, 54, "DOEE SWRv Calculations",                                 BS,  span=59)
hdr(ws2, 2, 60, "EISA Runoff (Total SDA)",                                GS,  span=61)
ws2.row_dimensions[2].height = 26

# ── Row 3: Sub-group headers ──────────────────────────────────────────────────
for c in range(1, 4):  hdr(ws2, 3, c, "", BH)
for c in range(4, 10): hdr(ws2, 3, c, "", BS)
for c in range(10, 15): hdr(ws2, 3, c, "", BH)
hdr(ws2, 3, 15, "Ex Imp",                              GH, span=15)
hdr(ws2, 3, 16, "Ex Woods  (HSG A/B/C/D)",             GS, span=19)
hdr(ws2, 3, 20, "Ex BMP / Pervious  (HSG A/B/C/D)",    GS, span=23)
hdr(ws2, 3, 24, "Ex Comp / Open  (HSG A/B/C/D)",       GS, span=27)
hdr(ws2, 3, 28, "Prop Imp",                             GH, span=28)
hdr(ws2, 3, 29, "Prop Woods  (HSG A/B/C/D)",            GS, span=32)
hdr(ws2, 3, 33, "Prop BMP / Pervious  (HSG A/B/C/D)",  GS, span=36)
hdr(ws2, 3, 37, "Prop Comp / Open  (HSG A/B/C/D)",     GS, span=40)
hdr(ws2, 3, 41, "Planted Trees",                        TPH, span=44)
hdr(ws2, 3, 45, "Preserved Trees",                      TPH, span=52)
hdr(ws2, 3, 53, "Total\nTree Credit",                   TPH)
for c in range(54, 60): hdr(ws2, 3, c, "", BS)
for c in range(60, 62): hdr(ws2, 3, c, "", GS)
ws2.row_dimensions[3].height = 26

# ── Row 4: Column labels ──────────────────────────────────────────────────────
c4_labels = [
    # A-C
    "SDA Name", "DOEE\nTrigger", "HSG",
    # D-I: Within LOD
    "Imp\nWithin LOD\n(ac)", "Veh Imp\nWithin LOD\n(ac)", "Comp\nWithin LOD\n(ac)",
    "Natural\nWithin LOD\n(ac)", "BMP\nWithin LOD\n(ac)", "Total\nWithin LOD\n(SF)",
    # J-N: Outside LOD
    "Imp\nOutside LOD\n(ac)", "Comp\nOutside LOD\n(ac)", "Natural\nOutside LOD\n(ac)",
    "Total\nOutside LOD\n(SF)", "Total SDA\n(SF)",
    # O-AA: EISA Existing (13)
    "Ex Imp\n(SF)",
    "Ex Woods\nHSG-A", "Ex Woods\nHSG-B", "Ex Woods\nHSG-C", "Ex Woods\nHSG-D",
    "Ex BMP\nHSG-A",   "Ex BMP\nHSG-B",   "Ex BMP\nHSG-C",   "Ex BMP\nHSG-D",
    "Ex Comp\nHSG-A",  "Ex Comp\nHSG-B",  "Ex Comp\nHSG-C",  "Ex Comp\nHSG-D",
    # AB-AN: EISA Proposed (13)
    "Prop Imp\n(SF)",
    "Prop Woods\nHSG-A", "Prop Woods\nHSG-B", "Prop Woods\nHSG-C", "Prop Woods\nHSG-D",
    "Prop BMP\nHSG-A",   "Prop BMP\nHSG-B",   "Prop BMP\nHSG-C",   "Prop BMP\nHSG-D",
    "Prop Comp\nHSG-A",  "Prop Comp\nHSG-B",  "Prop Comp\nHSG-C",  "Prop Comp\nHSG-D",
    # AO-BA: Trees (13)
    "# Small\nPlanted", "Small Plant\nCredit (CF)",
    "# Large\nPlanted", "Large Plant\nCredit (CF)",
    "# Small\nPreserved", "Small Pres\nCredit (CF)",
    "# Large\nPreserved", "Large Pres\nCredit (CF)",
    "# Special\nPreserved", "Special Pres\nCredit (CF)",
    "# Heritage\nPreserved", "Heritage Pres\nCredit (CF)",
    "Total Tree\nSWv Credit\n(CF)",
    # BB-BG: DOEE calcs (6)
    "DOEE P\n(in)", "Rv\nWithin LOD",
    "SWRv\nWithin LOD\n(ft3)",
    "Rv\nOutside LOD", "SWRv Outside\nLOD (ft3)\n[info only]",
    "Net SWRv\nAfter Trees\n(ft3)",
    # BH-BI: EISA (2)
    "EISA Pre-dev\nRunoff (ft3)", "EISA Prop Cond\nRunoff (ft3)",
]
# Column background mapping
_bg4 = {}
for ci in range(1, 4):   _bg4[ci] = BL
for ci in range(4, 10):  _bg4[ci] = BL
for ci in range(10, 15): _bg4[ci] = BL
for ci in range(15, 28): _bg4[ci] = GL
for ci in range(28, 41): _bg4[ci] = GL
for ci in range(41, 54): _bg4[ci] = "E2EFDA"   # GL-ish for trees
for ci in range(54, 60): _bg4[ci] = BL
for ci in range(60, 62): _bg4[ci] = GL

for i, h in enumerate(c4_labels):
    ci = i + 1
    hdr(ws2, 4, ci, h, _bg4[ci], white=False)
ws2.row_dimensions[4].height = 46

# ── Row 5: CN defaults ────────────────────────────────────────────────────────
lbl(ws2, 5, 1, "CURVE NUMBERS (CN) — edit per project soil survey:", GRY, bold=True, span=14)
for c in range(2, 15): ws2.cell(row=5, column=c).fill = fill(GRY)

lbl(ws2, 5, 15, "CN=98\n(fixed)", GL)
ws2.cell(row=5, column=15).alignment = ctr()
for cn_val, ci in zip([25, 55, 70, 77], range(16, 20)):    # P-S Woods
    cell = inp(ws2, 5, ci, cn_val); cell.font = fnt(bold=True)
for cn_val, ci in zip([39, 61, 74, 80], range(20, 24)):    # T-W BMP
    cell = inp(ws2, 5, ci, cn_val); cell.font = fnt(bold=True)
for cn_val, ci in zip([49, 69, 79, 84], range(24, 28)):    # X-AA Comp
    cell = inp(ws2, 5, ci, cn_val); cell.font = fnt(bold=True)

lbl(ws2, 5, 28, "CN=98\n(fixed)", GL)                      # AB Prop Imp
ws2.cell(row=5, column=28).alignment = ctr()
for prop_ci, ex_ci in zip(range(29, 41), range(16, 28)):   # AC-AN mirror P-AA
    calc_c(ws2, 5, prop_ci, f"={cl(ex_ci)}5")

for c in range(41, 54): lbl(ws2, 5, c, "—", GL)
for c in range(54, 62): lbl(ws2, 5, c, "↑ inputs", GRY)
ws2.row_dimensions[5].height = 26

# ── Rows 6-20: Data rows ──────────────────────────────────────────────────────
PAR = "'6-Parameters'"
for r in range(6, 21):
    # A-B: name, trigger
    inp(ws2, r, 1); inp(ws2, r, 2)
    # C: HSG (input)
    inp(ws2, r, 3)
    # D-H: within LOD DOEE inputs
    for c in range(4, 9): inp(ws2, r, c)
    # I: Total within LOD (SF)
    calc_c(ws2, r, 9,  f"=IFERROR((D{r}+E{r}+F{r}+G{r}+H{r})*43560,0)")
    # J-L: outside LOD DOEE inputs
    for c in range(10, 13): inp(ws2, r, c)
    # M: Total outside LOD (SF)
    calc_c(ws2, r, 13, f"=IFERROR((J{r}+K{r}+L{r})*43560,0)")
    # N: Total SDA (SF)
    calc_c(ws2, r, 14, f"=IFERROR(I{r}+M{r},0)")
    # O-AA: EISA existing inputs (15-27)
    for c in range(15, 28): inp(ws2, r, c)
    # AB-AN: EISA proposed inputs (28-40)
    for c in range(28, 41): inp(ws2, r, c)

    # AO, AQ, AS, AU, AW, AY: tree count inputs (41,43,45,47,49,51)
    for c in [41, 43, 45, 47, 49, 51]: inp(ws2, r, c)

    # AP, AR, AT, AV, AX, AZ: tree credit calcs (42,44,46,48,50,52)
    for col_i, param_row in [(42,63),(44,64),(46,65),(48,66),(50,67),(52,68)]:
        count_col = col_i - 1
        calc_c(ws2, r, col_i,
               f"=IFERROR({cl(count_col)}{r}*{PAR}!$B${param_row},0)")

    # BA (53): total tree credit
    calc_c(ws2, r, 53, f"=IFERROR(AP{r}+AR{r}+AT{r}+AV{r}+AX{r}+AZ{r},0)")
    ws2.cell(row=r, column=53).font = fnt(bold=True)

    # BB (54): DOEE P
    calc_c(ws2, r, 54,
        f'=IFERROR(IFS(B{r}="MLD",{PAR}!$B$4,'
        f'B{r}="MSI",{PAR}!$B$5,'
        f'B{r}="MSI-AWDZ",{PAR}!$B$6,'
        f'TRUE,""),"")')

    # BC (55): Rv Within LOD
    calc_c(ws2, r, 55,
        f'=IFERROR(IF((D{r}+E{r}+F{r}+G{r}+H{r})=0,"",'
        f'(0.95*(D{r}+E{r}+H{r})+0.25*F{r})/(D{r}+E{r}+F{r}+G{r}+H{r})),"")')
    ws2.cell(row=r, column=55).number_format = "0.000"

    # BD (56): SWRv Within LOD (ft3)
    calc_c(ws2, r, 56,
        f'=IFERROR(IF(B{r}="","",BB{r}/12*(0.95*(D{r}+E{r}+H{r})+0.25*F{r})*43560),"")')

    # BE (57): Rv Outside LOD
    calc_c(ws2, r, 57,
        f'=IFERROR(IF((J{r}+K{r}+L{r})=0,"",'
        f'(0.95*J{r}+0.25*K{r})/(J{r}+K{r}+L{r})),"")')
    ws2.cell(row=r, column=57).number_format = "0.000"

    # BF (58): SWRv Outside LOD (ft3) — informational
    calc_c(ws2, r, 58,
        f'=IFERROR(IF((J{r}+K{r}+L{r})=0,"",BB{r}/12*(0.95*J{r}+0.25*K{r})*43560),"")')

    # BG (59): Net SWRv after tree credit
    calc_c(ws2, r, 59,
        f'=IFERROR(IF(BD{r}="","",MAX(0,BD{r}-BA{r})),"")')
    ws2.cell(row=r, column=59).font = fnt(bold=True)

    # BH (60): EISA Pre-dev runoff
    P = P5
    ex_terms = [f"O{r}*{qa(P,'98')}"]
    for ci in range(16, 28):   # P(16)–AA(27): Woods/BMP/Comp per HSG
        ex_terms.append(f"{cl(ci)}{r}*{qa(P,f'${cl(ci)}$5')}")
    calc_c(ws2, r, 60, f"=IFERROR(({'+'.join(ex_terms)})/12,0)")

    # BI (61): EISA Prop cond runoff
    pr_terms = [f"AB{r}*{qa(P,'98')}"]
    for ci in range(29, 41):   # AC(29)–AN(40)
        pr_terms.append(f"{cl(ci)}{r}*{qa(P,f'${cl(ci)}$5')}")
    calc_c(ws2, r, 61, f"=IFERROR(({'+'.join(pr_terms)})/12,0)")

# ── Row 21: Site totals ───────────────────────────────────────────────────────
r_t2 = 21
hdr(ws2, r_t2, 1, "SITE TOTALS", BH, span=3)

def _tot(ws, r, ci, bg, bold_white=True):
    calc_c(ws, r, ci, f"=SUM({cl(ci)}6:{cl(ci)}20)")
    ws.cell(row=r, column=ci).fill = fill(bg)
    ws.cell(row=r, column=ci).font = fnt(bold=True, white=bold_white)

for ci in range(4, 10):  _tot(ws2, r_t2, ci, BS)   # within LOD DOEE
for ci in range(10, 15): _tot(ws2, r_t2, ci, BH)   # outside LOD DOEE
for ci in range(15, 28): _tot(ws2, r_t2, ci, GS)   # EISA ex
for ci in range(28, 41): _tot(ws2, r_t2, ci, GS)   # EISA prop
for ci in [41,43,45,47,49,51]:                       # tree counts
    _tot(ws2, r_t2, ci, TPH)
for ci in [42,44,46,48,50,52,53]:                    # tree credits
    _tot(ws2, r_t2, ci, TPH)
for ci in [56, 58, 59]: _tot(ws2, r_t2, ci, BS)    # SWRv calcs
for ci in [60, 61]:      _tot(ws2, r_t2, ci, GS)   # EISA runoff

# ── Data validations ──────────────────────────────────────────────────────────
dv_trig = DataValidation(type="list", formula1='"MLD,MSI,MSI-AWDZ"',
                         allow_blank=True, showDropDown=False)
ws2.add_data_validation(dv_trig); dv_trig.sqref = "B6:B20"

dv_hsg = DataValidation(type="list", formula1='"A,B,C,D,Urban"',
                        allow_blank=True, showDropDown=False)
ws2.add_data_validation(dv_hsg); dv_hsg.sqref = "C6:C20"

# ── Footer notes ──────────────────────────────────────────────────────────────
notes2 = [
    "Site DA (SDA) = all land draining to a common outfall. May include areas WITHIN the LOD (regulated disturbed area) and OUTSIDE the LOD (offsite contributing area).",
    "DOEE SWRv is calculated on WITHIN LOD area only (the regulated area). Outside LOD SWRv (col BF) is informational — for project BMP sizing context.",
    "EISA Pre-dev / Prop-cond runoff (cols BH-BI) uses TOTAL SDA area (within + outside LOD) per SCS/TR-55 watershed accounting.",
    "Tree credits per DOEE SWM Guidebook 2020 §3.14.5 Tables 3-52/3-53. Planted trees earn less credit than preserved trees. Edit rates in 6-Parameters rows 63–68.",
    "HSG col C is for overall context. Detailed EISA HSG breakdown is entered in Existing/Proposed columns (O-AN). CN defaults in row 5 — adjust per soil borings.",
    "CDA ⊂ SDA: BMPs in Sheet 4 draw their CDA from both within and outside LOD portions. Enter CDA areas in Sheet 3 to reflect the actual contributing watershed.",
]
for i, note in enumerate(notes2):
    r = 22 + i
    ws2.row_dimensions[r].height = 14
    ws2.merge_cells(start_row=r, start_column=1, end_row=r, end_column=61)
    c_ = ws2.cell(row=r, column=1, value=note)
    c_.fill = fill(WHT); c_.alignment = lft(); c_.border = bord()
    for c in range(2, 62):
        ws2.cell(row=r, column=c).fill = fill(WHT)
        ws2.cell(row=r, column=c).border = bord()


# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 3 — BMP (CONTRIBUTING) DA (CDA) LAND USE
#
# Central lookup table keyed by CDA ID.
# BMP DOEE (Sheet 4) looks up H=CDA Imp, I=CDA Comp, J=BMP Area (for Vmax).
# BMP EISA (Sheet 5) looks up C=SDA ID and E-H=BMP footprint area by HSG.
#
# Columns (9 total):
# A = CDA ID/NAME (key)      B = SDA ID/NAME (parent)
# C = DOEE CDA Imp (ac)      D = DOEE CDA Comp (ac)    E = DOEE BMP Area in CDA (ac)
# F = EISA BMP Area HSG-A (SF)  G = HSG-B  H = HSG-C   I = HSG-D
# ═══════════════════════════════════════════════════════════════════════════════
ws_cda = wb.create_sheet("3-CDA LandUse")
ws_cda.sheet_view.showGridLines = False
for i, w in enumerate([18, 16, 14, 14, 14, 12, 12, 12, 12], 1): cw(ws_cda, i, w)

hdr(ws_cda, 1, 1, "BMP CONTRIBUTING DRAINAGE AREA (CDA) — LAND USE  [CDA ⊂ SDA — one CDA per BMP, bounded by drainage to that BMP]", BH, span=9)
ws_cda.row_dimensions[1].height = 24

hdr(ws_cda, 2, 1, "CDA ⊂ SDA  (CDA lies within its parent SDA)", BS, span=2)
hdr(ws_cda, 2, 3, "DOEE CDA Land Use  (acres) — drives Vmax in BMP DOEE", BS, span=5)
hdr(ws_cda, 2, 6, "EISA BMP Footprint by HSG (SF) — drives Vol Inf in BMP EISA", GS, span=9)
ws_cda.row_dimensions[2].height = 26

for i, h in enumerate([
    "CDA ID / NAME\n(key — must match BMP sheets exactly)",
    "SDA ID / NAME\n(parent Site DA)",
    "CDA Imp\n(ac)",
    "CDA Comp\n(ac)",
    "BMP Area\nin CDA (ac)",
    "BMP Area\nHSG-A (SF)",
    "BMP Area\nHSG-B (SF)",
    "BMP Area\nHSG-C (SF)",
    "BMP Area\nHSG-D (SF)",
], 1):
    bg = GS if i >= 6 else BL
    hdr(ws_cda, 3, i, h, bg, white=(bg == GS))
ws_cda.row_dimensions[3].height = 44

for r in range(4, 54):
    for c in range(1, 10): inp(ws_cda, r, c)

r_tc = 54
hdr(ws_cda, r_tc, 1, "TOTALS", BH, span=2)
for c in range(3, 10):
    calc_c(ws_cda, r_tc, c, f"=SUM({cl(c)}4:{cl(c)}53)")
    ws_cda.cell(row=r_tc, column=c).fill = fill(BS if c <= 5 else GS)
    ws_cda.cell(row=r_tc, column=c).font = fnt(bold=True, white=True)

for i, note in enumerate([
    "CDA = the specific sub-area within the SDA that drains to ONE BMP. CDAs follow topographic/grading boundaries within the site. Sum of all CDA areas ≤ SDA total area (remainder drains to outfall untreated).",
    "For ROW projects: SDA = ROW boundary. CDAs are inlets/catch basins/green infrastructure drainage areas within that ROW strip. Offsite flow is excluded from both SDA and CDA.",
    "CDA ID must match exactly what is entered in 4-BMP DOEE col C and 5-BMP EISA col B — case-sensitive. The CDA ID is the key that auto-populates both BMP sheets via VLOOKUP.",
    "DOEE: CDA Imp/Comp/BMP Area drive Vmax = (1.7/12)*[0.25*Comp + 0.95*(Imp+BMP_area)]*43,560. Vmax caps the BMP credit for the volume retained within this CDA.",
    "EISA: BMP footprint by HSG (cols F-I) auto-populates 5-BMP EISA cols E-H. For a BMP spanning multiple HSG zones (rare), split its footprint area across the applicable HSG columns.",
    "Multiple BMPs may share a CDA (e.g., series BMPs). Each BMP row references the same CDA ID and receives the same Vmax — but each BMP's Sv and Vol Ret are calculated separately.",
]):
    r = 55 + i; ws_cda.row_dimensions[r].height = 14
    ws_cda.merge_cells(start_row=r, start_column=1, end_row=r, end_column=9)
    c_ = ws_cda.cell(row=r, column=1, value=note)
    c_.fill = fill(WHT); c_.alignment = lft(); c_.border = bord()
    for c in range(2, 10): ws_cda.cell(row=r, column=c).fill = fill(WHT); ws_cda.cell(row=r, column=c).border = bord()


# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 4 — BMP PROVIDED (DOEE)
# Cols A-W (23 cols):
# A=BMP Name, B=SDA, C=CDA (key→lookup), D=Notes
# E=BMP Type, F=SA_bot(SF), G=SA_top(SF)
# H=CDA_Imp(ac) [VLOOKUP], I=CDA_Comp(ac) [VLOOKUP], J=BMP_area_CDA(ac) [VLOOKUP]
# K=Ponding(in), L=Media(in), M=eta_media, N=Stone(in), O=eta_stone
# P=Cistern(gal), Q=DrainLayer(in), R=eta_DL
# S=Sv(ft3), T=Vmax(ft3), U=RetVal, V=VolRet(ft3), W=VolRet(gal)
# ═══════════════════════════════════════════════════════════════════════════════
ws3 = wb.create_sheet("4-BMP DOEE")
ws3.sheet_view.showGridLines = False
for i, w in enumerate([16,7,10,16, 7,9,9, 11,11,11, 8,8,7,8,7, 9,8,7, 10,10,7,13,13], 1): cw(ws3, i, w)
hdr(ws3, 1, 1, "BMP STORAGE PROVIDED — DOEE COMPLIANCE", BH, span=23)
ws3.row_dimensions[1].height = 22

for i, h in enumerate([
    "BMP Name","SDA","CDA\n(key)","Notes",
    "BMP Type","SA Bot\n(SF)","SA Top\n(SF)",
    "CDA Imp\n(ac)","CDA Comp\n(ac)","BMP Area\nCDA (ac)",
    "Ponding\n(in)","Media\n(in)","eta\nmedia","Stone\n(in)","eta\nstone",
    "Cistern\n(gal)","Drain\nLayer (in)","eta DL",
    "Sv\n(ft3)","Vmax\n(ft3)","Ret.\nValue","Vol Ret.\n(ft3)","Vol Ret.\n(gal)"
], 1):
    if i in (8, 9, 10):   # CDA lookup cols — calc styling in header
        bg = BS
    elif i >= 19:
        bg = BH
    else:
        bg = BL
    hdr(ws3, 2, i, h, bg, white=(bg in (BH, BS)))
ws3.row_dimensions[2].height = 40

dv3 = DataValidation(type="list", formula1='"B-1,B-2,G-1,G-2,P-1,P-2,P-3,R-1,ISD,T-P,T-V"',
                     allow_blank=True, showDropDown=False)
ws3.add_data_validation(dv3); dv3.sqref = "E3:E52"

for r in range(3, 53):
    for c in range(1, 8): inp(ws3, r, c)   # A-G: name, SDA, CDA, notes, type, SA_bot, SA_top
    # H, I, J: auto-filled from CDA sheet via CDA ID in col C
    calc_c(ws3, r, 8,  f'=IFERROR(VLOOKUP(C{r},{CDA_REF},3,0),0)')   # H: CDA Imp (ac)
    calc_c(ws3, r, 9,  f'=IFERROR(VLOOKUP(C{r},{CDA_REF},4,0),0)')   # I: CDA Comp (ac)
    calc_c(ws3, r, 10, f'=IFERROR(VLOOKUP(C{r},{CDA_REF},5,0),0)')   # J: BMP Area CDA (ac)
    for c in range(11, 19): inp(ws3, r, c)  # K-R: BMP geometry / media inputs
    PAR3 = "'6-Parameters'"
    calc_c(ws3, r, 19,
        f'=IFERROR(IFS('
        f'OR(E{r}="B-1",E{r}="B-2"),F{r}*(L{r}/12*M{r}+N{r}/12*O{r})+(F{r}+G{r})/2*(K{r}/12),'
        f'OR(E{r}="G-1",E{r}="G-2"),F{r}*(L{r}*M{r}+Q{r}*R{r})/12,'
        f'OR(E{r}="P-1",E{r}="P-2",E{r}="P-3"),F{r}*(N{r}/12*O{r}),'
        f'E{r}="R-1",P{r}/7.48,'
        f'E{r}="ISD",0,'
        f'E{r}="T-P",F{r}*{PAR3}!$B$63+G{r}*{PAR3}!$B$64,'
        f'E{r}="T-V",F{r}*{PAR3}!$B$65+G{r}*{PAR3}!$B$66+K{r}*{PAR3}!$B$67+L{r}*{PAR3}!$B$68,'
        f'TRUE,0),0)')
    calc_c(ws3, r, 20,
        f"=IFERROR(('6-Parameters'!$B$7/12)*(0.25*I{r}+0.95*(H{r}+J{r}))*43560,0)")
    calc_c(ws3, r, 21,
        f'=IFERROR(IFS(E{r}="B-1",0.6,E{r}="B-2",1.0,E{r}="G-1",0.6,E{r}="G-2",1.0,'
        f'E{r}="P-1",1.0,E{r}="P-2",0.6,E{r}="P-3",0.6,E{r}="R-1",1.0,E{r}="ISD",0.5,'
        f'E{r}="T-P",1.0,E{r}="T-V",1.0,TRUE,0),0)')
    calc_c(ws3, r, 22, f'=IFERROR(IF(E{r}="","",MIN(T{r},S{r}*U{r})),0)')
    calc_c(ws3, r, 23, f'=IFERROR(IF(V{r}=0,"",V{r}*7.48),"")')

r_t3 = 53
hdr(ws3, r_t3, 1, "TOTALS", BH, span=18)
for c in [19, 20, 22, 23]:
    calc_c(ws3, r_t3, c, f"=SUM({cl(c)}3:{cl(c)}52)")
    ws3.cell(row=r_t3, column=c).fill = fill(BS); ws3.cell(row=r_t3, column=c).font = fnt(bold=True, white=True)
ws3.cell(row=r_t3, column=21).fill = fill(BS)

for i, note in enumerate([
    "BMP CODES: B-1=Bioret no underdrain (0.6), B-2=Bioret full infil (1.0), G-1=GrRoof ext (0.6), G-2=GrRoof int (1.0)",
    "P-1=PermPave full (1.0), P-2=PermPave partial (0.6), P-3=PermPave detained (0.6), R-1=RWH (1.0), ISD=ImpDisconn (0.5)",
    "T-P=Tree Planting (F=#small planted, G=#large planted, Ret=1.0). T-V=Tree Preservation (F=#small, G=#large, K=#special, L=#heritage preserved). Credits from 6-Parameters B63-B68.",
    "CDA cols H/I/J auto-fill from Sheet 3 (3-CDA LandUse) via CDA ID in col C. Enter CDA ID exactly as in the CDA sheet.",
    "Sv(Bioret) = SA_bot*(d_media/12*eta + d_stone/12*eta_s) + avg(SA_bot,SA_top)*(d_pond/12)",
    "Vmax = (1.7/12)*[0.25*CDA_comp(ac)+0.95*(CDA_imp(ac)+BMP_ac)]*43,560  |  Vol Ret = MIN(Vmax, Sv*RetVal)"
]):
    r = 54 + i; ws3.row_dimensions[r].height = 14
    ws3.merge_cells(start_row=r, start_column=1, end_row=r, end_column=23)
    c_ = ws3.cell(row=r, column=1, value=note)
    c_.fill = fill(WHT); c_.alignment = lft(); c_.border = bord()
    for c in range(2, 24): ws3.cell(row=r, column=c).fill = fill(WHT); ws3.cell(row=r, column=c).border = bord()


# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 5 — BMP PROVIDED (EISA Section 438)
#
# Column layout (18 cols):
# A = BMP Name / ID
# B = CDA ID/NAME (key → VLOOKUP to CDA sheet)
# C = SDA ID/NAME [VLOOKUP col 2]            D = BMP Type (input, dropdown)
# E = BMP Area HSG-A (SF) [VLOOKUP col 6]    F = HSG-B [col 7]
# G = HSG-C [col 8]                          H = HSG-D [col 9]
# I = Total BMP Area (SF) = SUM(E:H)
# J = Media/Filter Depth (ft) [input]        K = Media Void Ratio [from 6-Parameters by BMP type]
# L = Gravel/Stone Depth (ft) [input]        M = Gravel Void Ratio [from 6-Parameters by BMP type]
# N = Avail. Storage Depth = J*K + L*M       O = P 95th Pct Depth (ft)
# P = Design Depth = MIN(N, O)               Q = Vol Inf (ft3) = I × P
# R = Vol Inf (gal)
# ═══════════════════════════════════════════════════════════════════════════════
ws4 = wb.create_sheet("5-BMP EISA438")
ws4.sheet_view.showGridLines = False
for i, w in enumerate([16,14,14,18, 10,10,10,10,12, 12,10,12,10, 14,12,14, 14,14], 1): cw(ws4, i, w)
hdr(ws4, 1, 1, "BMP STORAGE PROVIDED — EISA SECTION 438 COMPLIANCE", GH, span=18)
ws4.row_dimensions[1].height = 22

hdr(ws4, 2, 1,  "BMP Info",                                   GS, span=4)
hdr(ws4, 2, 5,  "BMP Area by HSG (SF) — auto from CDA sheet", GS, span=9)
hdr(ws4, 2, 10, "Storage Design",                              GH, span=16)
hdr(ws4, 2, 17, "Vol Infiltrated",                             GH, span=18)
ws4.row_dimensions[2].height = 26

for i, h in enumerate([
    "BMP Name / ID",
    "CDA ID/NAME\n(key)",
    "SDA ID/NAME\n(from CDA)",
    "BMP Type",
    "Area\nHSG-A (SF)",
    "Area\nHSG-B (SF)",
    "Area\nHSG-C (SF)",
    "Area\nHSG-D (SF)",
    "Total BMP\nArea (SF)",
    "Media/Filter\nDepth (ft)",
    "Media\nVoid Ratio",
    "Gravel/Stone\nDepth (ft)",
    "Gravel\nVoid Ratio",
    "Avail. Storage\nDepth (ft)",
    "P 95th Pct\nDepth (ft)",
    "Design Depth\n(ft) = MIN(N,O)",
    "Vol Inf\n(ft3) = I×P",
    "Vol Inf\n(gal)",
], 1):
    bg = GH if i >= 14 else GS
    hdr(ws4, 3, i, h, bg, white=True)
ws4.row_dimensions[3].height = 44

dv4 = DataValidation(type="list",
    formula1='"Porous Asphalt,Porous Concrete,Permeable Paver,Bioretention,Bioswale,Green Roof,Cistern"',
    allow_blank=True, showDropDown=False)
ws4.add_data_validation(dv4); dv4.sqref = "D4:D53"

# Void ratio lookups from 6-Parameters col B:
#   B34=Bioret filter media (0.25)  B35=Gravel/stone reservoir (0.40)
#   B36=Perm pave reservoir fine (0.33)  B37=Porous asphalt gravel (0.40)
#   B38=Green roof drainage layer (0.90) B39=Green roof growth media (0.10)
def media_eta_f(r):
    return (f'=IFERROR(IF(D{r}="","",IFS('
            f'OR(D{r}="Bioretention",D{r}="Bioswale"),{P5B}34,'
            f'D{r}="Green Roof",{P5B}39,'
            f'TRUE,0)),"" )')
def gravel_eta_f(r):
    return (f'=IFERROR(IF(D{r}="","",IFS('
            f'OR(D{r}="Porous Asphalt",D{r}="Porous Concrete"),{P5B}37,'
            f'D{r}="Permeable Paver",{P5B}36,'
            f'OR(D{r}="Bioretention",D{r}="Bioswale"),{P5B}35,'
            f'D{r}="Green Roof",{P5B}38,'
            f'TRUE,0)),"" )')

for r in range(4, 54):
    inp(ws4, r, 1)                   # A: BMP name
    inp(ws4, r, 2)                   # B: CDA ID (key)
    # C: SDA ID — VLOOKUP via CDA ID
    calc_c(ws4, r, 3,  f'=IFERROR(VLOOKUP(B{r},{CDA_REF},2,0),"")')
    inp(ws4, r, 4)                   # D: BMP Type (dropdown)
    # E-H: BMP area by HSG — VLOOKUP via CDA ID (return 0 if blank/not found)
    for col_i, cda_col in [(5,6),(6,7),(7,8),(8,9)]:
        calc_c(ws4, r, col_i, f'=IFERROR(VLOOKUP(B{r},{CDA_REF},{cda_col},0),0)')
    # I: total BMP area
    calc_c(ws4, r, 9,  f'=IFERROR(IF(SUM(E{r}:H{r})=0,"",SUM(E{r}:H{r})),"")')
    inp(ws4, r, 10)                  # J: media/filter depth (input)
    calc_c(ws4, r, 11, media_eta_f(r))   # K: media void ratio (from params)
    inp(ws4, r, 12)                  # L: gravel/stone depth (input)
    calc_c(ws4, r, 13, gravel_eta_f(r))  # M: gravel void ratio (from params)
    calc_c(ws4, r, 14, f'=IFERROR(IF(D{r}="","",J{r}*K{r}+L{r}*M{r}),"")')  # N: avail storage
    calc_c(ws4, r, 15, f"={P5}/12")   # O: P 95th pct depth (ft)
    calc_c(ws4, r, 16, f'=IFERROR(IF(N{r}="","",MIN(N{r},O{r})),"")')  # P: design depth
    calc_c(ws4, r, 17, f'=IFERROR(IF(I{r}="","",I{r}*P{r}),"")')       # Q: vol inf (ft3)
    calc_c(ws4, r, 18, f'=IFERROR(IF(Q{r}="","",Q{r}*7.48),"")')       # R: vol inf (gal)

r_t4 = 54
hdr(ws4, r_t4, 1, "TOTALS", GH, span=16)
for c in range(2, 17): ws4.cell(row=r_t4, column=c).fill = fill(GH)
for c in [17, 18]:
    calc_c(ws4, r_t4, c, f"=IFERROR(SUM({cl(c)}4:{cl(c)}53),0)")
    ws4.cell(row=r_t4, column=c).fill = fill(GS)
    ws4.cell(row=r_t4, column=c).font = fnt(bold=True, white=True)

for i, note in enumerate([
    "EISA §438 compliance: Net post-dev runoff (Sheet 2 col AN) - Total BMP Vol Inf (col Q total) <= Pre-dev runoff (Sheet 2 col AM). NO detention credit.",
    "CDA ID (col B) drives VLOOKUP: SDA (col C) and BMP footprint by HSG (cols E-H) auto-fill from 3-CDA LandUse. Depths J & L remain per-BMP inputs.",
    "Void ratios (cols K, M) auto-fill from 6-Parameters based on BMP Type. Change Parameters values to update defaults project-wide.",
    "Vol Inf = Total_BMP_Area(SF) × Design_Depth(ft). Design_Depth = MIN(P_95pct/12, Media_d×eta_m + Gravel_d×eta_g).",
    "Porous asphalt: gravel 0.5ft×0.40=0.20ft; P_DC/12=0.1417ft → Design=0.1417ft (storm-limited). Bioretention: gravel 0.25ft×0.40=0.10ft → STORAGE-LIMITED.",
    "Reference: Rock Creek Park Multi-Use Trail EISA §438 sample calcs, May 2017."
]):
    r = 55 + i; ws4.row_dimensions[r].height = 14
    ws4.merge_cells(start_row=r, start_column=1, end_row=r, end_column=18)
    c_ = ws4.cell(row=r, column=1, value=note)
    c_.fill = fill(WHT); c_.alignment = lft(); c_.border = bord()
    for c in range(2, 19): ws4.cell(row=r, column=c).fill = fill(WHT); ws4.cell(row=r, column=c).border = bord()


# ═══════════════════════════════════════════════════════════════════════════════
# SHEET 1 — SUMMARY  (9 columns A-I, DDOT MEP-style auto-populating dashboard)
#
# DOEE refs in Sheet 2:  col 53=BA (tree credit), col 56=BD (SWRv within LOD),
#                         col 59=BG (net SWRv after trees), col 2=B (trigger)
# EISA refs in Sheet 2:  col 60=BH (pre-dev), col 61=BI (prop cond)
# ═══════════════════════════════════════════════════════════════════════════════
ws1 = wb.create_sheet("1-Summary", 0)
ws1.sheet_view.showGridLines = False
for i, w in enumerate([22, 11, 13, 12, 14, 14, 12, 10, 12], 1): cw(ws1, i, w)
NC = 9   # number of columns

ws1.row_dimensions[1].height = 40
ws1.merge_cells(f"A1:{cl(NC)}1")
ws1.cell(row=1, column=1, value="STORMWATER MANAGEMENT — REQUIRED vs. PROVIDED SUMMARY")
ws1.cell(row=1, column=1).fill = fill(BH)
ws1.cell(row=1, column=1).font = Font(bold=True, color="FFFFFF", size=14)
ws1.cell(row=1, column=1).alignment = ctr()
for c in range(2, NC+1): ws1.cell(row=1, column=c).fill = fill(BH)

hdr(ws1, 2, 1, "Project Information", BS, span=NC)
for i, label in enumerate(["Project Name","Project Number","Date","Prepared By",
                            "Project Location","DOEE Plan Review No.","Regulatory Notes"]):
    r = 3 + i; ws1.row_dimensions[r].height = 17
    lbl(ws1, r, 1, label, GRY, bold=True)
    ws1.merge_cells(start_row=r, start_column=2, end_row=r, end_column=NC)
    c_ = ws1.cell(row=r, column=2)
    c_.fill = fill(INP); c_.alignment = lft(); c_.border = bord()
    for c in range(3, NC+1):
        ws1.cell(row=r, column=c).fill = fill(INP)
        ws1.cell(row=r, column=c).border = bord()

# ── DOEE Summary Table ────────────────────────────────────────────────────────
# Cols: A=Site DA, B=Trigger, C=SWRv Within LOD, D=Tree SWv Credit,
#       E=Net SWRv Req'd, F=BMP Vol Retained, G=Surplus/Deficit, H=% Provided, I=Status
r0 = 11
hdr(ws1, r0, 1,
    "DOEE STORMWATER RETENTION REQUIREMENT  "
    "[SWRv Within LOD → Tree Credit → Net Required vs. BMP Vol Retained]",
    BH, span=NC)
ws1.row_dimensions[r0].height = 26

doee_hdrs = ["Site DA", "DOEE\nTrigger", "SWRv Within\nLOD (ft3)",
             "Tree SWv\nCredit (ft3)", "Net SWRv\nRequired (ft3)",
             "BMP Vol\nRetained (ft3)", "Surplus /\nDeficit (ft3)",
             "% Provided", "Status"]
for ci, h in enumerate(doee_hdrs, 1):
    hdr(ws1, r0+1, ci, h, BS)
ws1.row_dimensions[r0+1].height = 40

for i in range(10):
    r = r0 + 2 + i
    ws1.row_dimensions[r].height = 18
    sda_ref = f"'2-SDA LandUse'!A{6+i}"
    calc_c(ws1, r, 1, f"={sda_ref}")                             # A: SDA name
    calc_c(ws1, r, 2, f"='2-SDA LandUse'!B{6+i}")               # B: trigger (col 2)
    calc_c(ws1, r, 3, f"=IFERROR('2-SDA LandUse'!BD{6+i},\"\")")# C: SWRv within LOD (col 56=BD)
    calc_c(ws1, r, 4, f"=IFERROR('2-SDA LandUse'!BA{6+i},0)")   # D: tree credit (col 53=BA)
    calc_c(ws1, r, 5, f'=IFERROR(IF(C{r}="","",MAX(0,C{r}-D{r})),"")') # E: net SWRv
    calc_c(ws1, r, 6,                                             # F: BMP Vol Retained
        f"=IFERROR(SUMIF('4-BMP DOEE'!$B$3:$B$52,{sda_ref},'4-BMP DOEE'!$V$3:$V$52),0)")
    calc_c(ws1, r, 7, f'=IFERROR(IF(E{r}="","",F{r}-E{r}),"")') # G: surplus/deficit
    calc_c(ws1, r, 8, f'=IFERROR(IF(E{r}=0,"",F{r}/E{r}),"")') # H: %
    ws1.cell(row=r, column=8).number_format = "0%"
    calc_c(ws1, r, 9, f'=IFERROR(IF(E{r}="","",IF(G{r}>=0,"PASS","DEFICIT")),"—")')

r_dt = r0 + 12
ws1.row_dimensions[r_dt].height = 22
hdr(ws1, r_dt, 1, "SITE TOTAL", BS, span=2)
ws1.cell(row=r_dt, column=2).fill = fill(BS)
for c in [3, 4, 6]:
    calc_c(ws1, r_dt, c, f"=SUM({cl(c)}{r0+2}:{cl(c)}{r0+11})")
    ws1.cell(row=r_dt, column=c).fill = fill(BS)
    ws1.cell(row=r_dt, column=c).font = fnt(bold=True, white=True)
calc_c(ws1, r_dt, 5, f"=MAX(0,C{r_dt}-D{r_dt})")
calc_c(ws1, r_dt, 7, f"=F{r_dt}-E{r_dt}")
calc_c(ws1, r_dt, 8, f'=IFERROR(F{r_dt}/E{r_dt},"")')
ws1.cell(row=r_dt, column=8).number_format = "0%"
calc_c(ws1, r_dt, 9, f'=IF(G{r_dt}>=0,"PASS","DEFICIT")')
for c in [5, 7, 8, 9]:
    ws1.cell(row=r_dt, column=c).fill = fill(BS)
    ws1.cell(row=r_dt, column=c).font = fnt(bold=True, white=True)

# ── EISA Summary Table ────────────────────────────────────────────────────────
# Cols: A=Site DA, B=Pre-dev, C=Prop Cond, D=BMP Vol Inf, E=Net Post-dev,
#       F=Surplus/Deficit, G=Status, H-I blank
r1 = r_dt + 2
hdr(ws1, r1, 1,
    "EISA SECTION 438 — NET RUNOFF COMPLIANCE  [Net Post-dev (Prop − BMP Inf) ≤ Pre-dev]",
    GH, span=NC)
ws1.row_dimensions[r1].height = 26

eisa_hdrs = ["Site DA", "Pre-dev\nRunoff (ft3)", "Prop Cond\nRunoff (ft3)",
             "BMP Vol Inf\n(ft3)", "Net Post-dev\nRunoff (ft3)",
             "Surplus /\nDeficit (ft3)", "Status", "", ""]
for ci, h in enumerate(eisa_hdrs, 1):
    hdr(ws1, r1+1, ci, h, GS)
ws1.row_dimensions[r1+1].height = 40

for i in range(10):
    r = r1 + 2 + i
    ws1.row_dimensions[r].height = 18
    sda_ref = f"'2-SDA LandUse'!A{6+i}"
    calc_c(ws1, r, 1, f"={sda_ref}")
    calc_c(ws1, r, 2, f"=IFERROR('2-SDA LandUse'!BH{6+i},\"\")")  # pre-dev (col 60=BH)
    calc_c(ws1, r, 3, f"=IFERROR('2-SDA LandUse'!BI{6+i},\"\")")  # prop cond (col 61=BI)
    calc_c(ws1, r, 4,
        f"=IFERROR(SUMIF('5-BMP EISA438'!$C$4:$C$53,{sda_ref},'5-BMP EISA438'!$Q$4:$Q$53),0)")
    calc_c(ws1, r, 5, f'=IFERROR(IF(B{r}="","",C{r}-D{r}),"")') # net post-dev
    calc_c(ws1, r, 6, f'=IFERROR(IF(B{r}="","",B{r}-E{r}),"")') # surplus/deficit
    calc_c(ws1, r, 7,
        f'=IFERROR(IF(B{r}="","",IF(E{r}<=B{r},"PASS","DEFICIT")),"—")')
    for c in [8, 9]:
        ws1.cell(row=r, column=c).fill = fill(WHT)
        ws1.cell(row=r, column=c).border = bord()

r_et = r1 + 12
ws1.row_dimensions[r_et].height = 22
hdr(ws1, r_et, 1, "SITE TOTAL", GS, span=1)
for c in [2, 3, 4]:
    calc_c(ws1, r_et, c, f"=SUM({cl(c)}{r1+2}:{cl(c)}{r1+11})")
    ws1.cell(row=r_et, column=c).fill = fill(GS)
    ws1.cell(row=r_et, column=c).font = fnt(bold=True, white=True)
calc_c(ws1, r_et, 5, f"=C{r_et}-D{r_et}")
calc_c(ws1, r_et, 6, f"=B{r_et}-E{r_et}")
calc_c(ws1, r_et, 7, f'=IF(E{r_et}<=B{r_et},"PASS","DEFICIT")')
for c in [5, 6, 7]:
    ws1.cell(row=r_et, column=c).fill = fill(GS)
    ws1.cell(row=r_et, column=c).font = fnt(bold=True, white=True)
for c in [8, 9]:
    ws1.cell(row=r_et, column=c).fill = fill(GS)

# ── Key Notes ─────────────────────────────────────────────────────────────────
r2 = r_et + 2
hdr(ws1, r2, 1, "KEY NOTES", BH, span=NC)
for i, note in enumerate([
    "DOEE: SWRv=(P/12)×[0.95×(Imp+Veh+BMP)+0.25×Comp]×43,560. Applies to WITHIN LOD (regulated) area only. Tree credits per DOEE SWM Guidebook §3.14.5 reduce Net SWRv Required.",
    "Tree Credits: Planted small=5 CF, large=10 CF; Preserved small=10, large=20, special=30, heritage=40 CF per tree (Tables 3-52/3-53). Edit in 6-Parameters rows 63–68.",
    "EISA §438: SCS/TR-55 CN method, 4 land types × HSG A-D. Compliance = Net post-dev (Prop runoff − BMP Inf) ≤ Pre-dev runoff. EISA uses total SDA (within + outside LOD).",
    "EISA BMP credit: Area × MIN(P/12 ft, media_d×eta_m + gravel_d×eta_g). Ref: Rock Creek Park EISA §438 calcs (2017).",
    "Hierarchy: SDA (Sheet 2, LOD→outfall) > CDA (Sheet 3, sub-area draining to one BMP) > BMP (Sheets 4-5). CDA may include offsite area; enter in Sheet 3.",
    "Both DOEE and EISA apply simultaneously to DC federal projects. EISA 1.7\" > DOEE MLD 1.2\" — EISA-compliant design typically satisfies DOEE retention.",
    "PROW/MEP: DOEE MEP process applies to public ROW. EISA §438 applies only to federal facility footprint >5,000 SF impervious. Confirm with project sponsor.",
]):
    r = r2 + 1 + i
    ws1.row_dimensions[r].height = 15
    ws1.merge_cells(start_row=r, start_column=1, end_row=r, end_column=NC)
    c_ = ws1.cell(row=r, column=1, value=note)
    c_.fill = fill(WHT); c_.alignment = lft(); c_.border = bord()
    for c in range(2, NC+1):
        ws1.cell(row=r, column=c).fill = fill(WHT)
        ws1.cell(row=r, column=c).border = bord()

# ── Reorder tabs to match numbered sheet names ─────────────────────────────────
desired = ["1-Summary", "2-SDA LandUse", "3-CDA LandUse", "4-BMP DOEE", "5-BMP EISA438", "6-Parameters"]
for idx, name in enumerate(desired):
    current = wb.sheetnames.index(name)
    if current != idx:
        wb.move_sheet(name, offset=idx - current)

# ── Save ──────────────────────────────────────────────────────────────────────
out_path = r"C:\_AAA\WS_HH\ddot_doee_swm_guidelines_2026_v1\SW_Required_Provided_DOEE_EISA438.xlsx"
wb.save(out_path)
print(f"Saved: {out_path}")
