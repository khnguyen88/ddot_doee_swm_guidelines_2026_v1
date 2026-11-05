"""Generate a sample-populated workbook using Minnesota Ave data.

Pulls the first 10 drainage-area land-cover entries from the DDOT MEP
Worksheet 90% Phase Sample (Minnesota Ave Great Street Test Case) and
fills them into a fresh workbook so a reviewer can see all 18 sheets
flowing with realistic numbers.

Run with:

    python -m workbook.sample

Output file:

    SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx
"""
from __future__ import annotations
from pathlib import Path

from workbook.__main__ import build_workbook, PROJECT_ROOT


OUTPUT = PROJECT_ROOT / "SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx"


# ---------------------------------------------------------------------------
# Sample data derived from DDOT 90% Phase Sample (Minnesota Ave Great Street)
# ---------------------------------------------------------------------------
#
# Source: docs/doee_spreadsheet_calculators/DDOT MEP Worksheet 012019.xlsx
# Tab:    '90% Phase Sample'
# DAs:    First 10 (DDOT DA IDs 57, 58, 61, 68, 82, 86, 88, 89, 90, 91)
#
# Each sample SDA maps to a DDOT DA. HSG "A/D" and "Urban Land" are both
# mapped to "D" (conservative) since those aren't valid dropdown values.
# BMP dimensions are fabricated to be plausible given the DDOT Max Sv
# targets; exact Sv match is not required — the sample demonstrates data
# flow, not DDOT validation.

PROJECT = {
    "Name":            "Minnesota Ave Great Street Test Case",
    "Number":          "DTA-ZZZ",
    "MS4":             "MS4",
    "AWDZ":            "No",
    "DOEEReview":      "N/A (sample)",
    "TotalLOD":        222300,   # ~5.1 acres per DDOT
    "RainfallRetention": 1.2,     # DOEE SWRv — MLD trigger
    "RainfallEisa":      1.7,     # EISA 438 95th percentile
    "Trigger":         "MLD",
    "EISA":            "No",
}

# Each SDA carries explicit pre- and post-development land-cover inside the
# LOD plus an offsite (outside-LOD) component that stays unchanged.
#
# Rationale: a project triggers DOEE SWRv via disturbance ≥ 5,000 sf (MLD),
# not via cover change. For pedagogical clarity, this fixture models the
# pre-development condition as a plausible mixed-cover baseline (part road,
# part compacted shoulder, part natural strip) and the post-development
# condition as the as-built street surface — fully impervious vehicular
# plus a residual compacted shoulder. The total in-LOD area per SDA is
# preserved pre→post, so no new land is added; only the composition shifts.
#
# Tuple shape:
#   (sda_num, ddot_da,
#    (imp_in_pre,  comp_in_pre,  nat_in_pre),      # pre-development inside LOD
#    (imp_in_post, comp_in_post, nat_in_post),     # post-development inside LOD
#    (imp_out,     comp_out,     nat_out),         # outside LOD (unchanged)
#    hsg)
SDAS = [
    (1,  57, (2832, 1062, 3186), (6910,  170, 0), (1097,    0, 0), "D"),
    (2,  58, (3519, 1408, 2111), (6689,  349, 0), ( 745,    0, 0), "D"),
    (3,  61, (4176,  696, 2088), (6860,  100, 0), ( 120, 2083, 0), "D"),
    (4,  68, (2230, 1592, 2548), (5720,  650, 0), (3000,    0, 0), "D"),
    (5,  82, (4543, 2065, 1652), (6820, 1440, 0), (   0,  342, 0), "D"),
    (6,  86, (6077,  868, 1736), (8441,  240, 0), (   0,    0, 0), "D"),
    (7,  88, (2889,  963, 2569), (6117,  304, 0), (   0,    0, 0), "D"),
    (8,  89, (5955, 1787, 4168), (10685, 1225, 0), (  0,    0, 0), "D"),
    (9,  90, (4343, 1336, 1003), (6682,    0, 0), (   0,    0, 0), "D"),
    (10, 91, ( 839,  559, 1399), (2797,    0, 0), (   0, 1469, 0), "D"),
]

# BMP opportunities per SDA, derived from DDOT sample columns Y (Bio opp),
# AA (PP opp), AG (Max Bio Sv), AH (Max PP Sv). Trees from AJ/AK (planted)
# and Q/S/U (preserved).
#
# (sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees_dict, geom_dict)
#
# trees_dict keys: plt_sm, plt_lg, pres_sm, pres_lg, pres_sp, pres_hr
# geom_dict keys for Bioretention: sa_pond_top, top_elev, overflow_elev, sidewalk_elev, curb_cut_elev
# geom_dict keys for Dry Swale:   length, width, inv_us, inv_ds, top_us, top_ds, h_cd, x_cd
BMPS = [
    # SDA-2 — Bio opp 210, PP opp 150
    (2, "BMP-02-A", "Bioretention", "Enhanced", 210, {},
     {"sa_pond_top": 294, "top_elev": 100.0, "overflow_elev": 100.5,
      "sidewalk_elev": 100.75, "curb_cut_elev": 100.3}),
    (2, "BMP-02-B", "Permeable Pavement", "Enhanced", 150, {}, {}),
    # SDA-3 — PP opp 1290
    (3, "BMP-03-A", "Permeable Pavement", "Enhanced", 1290, {}, {}),
    # SDA-4 — PP opp 930, 2 planted large trees
    (4, "BMP-04-A", "Permeable Pavement", "Enhanced", 930, {}, {}),
    (4, "BMP-04-T", "Planted Trees", "—", 0, {"plt_lg": 2}, {}),
    # SDA-5 — PP opp 1870, trees, NEW Dry Swale
    (5, "BMP-05-A", "Permeable Pavement", "Enhanced", 1870, {}, {}),
    (5, "BMP-05-S", "Dry Swale", "—", 400, {},
     {"length": 100, "width": 4, "inv_us": 100.0, "inv_ds": 98.0,
      "top_us": 102.0, "top_ds": 100.0, "h_cd": 1.0, "x_cd": 50}),
    (5, "BMP-05-T", "Planted Trees", "—", 0, {"plt_lg": 8, "pres_lg": 2}, {}),
    # SDA-6 — Bio opp 225, 2 planted large
    (6, "BMP-06-A", "Bioretention", "Enhanced", 225, {},
     {"sa_pond_top": 315, "top_elev": 100.0, "overflow_elev": 100.5,
      "sidewalk_elev": 100.75, "curb_cut_elev": 100.3}),
    (6, "BMP-06-T", "Planted Trees", "—", 0, {"plt_lg": 2}, {}),
    # SDA-7 — Bio opp 220, 1 planted large
    (7, "BMP-07-A", "Bioretention", "Enhanced", 220, {},
     {"sa_pond_top": 308, "top_elev": 100.0, "overflow_elev": 100.5,
      "sidewalk_elev": 100.75, "curb_cut_elev": 100.3}),
    (7, "BMP-07-T", "Planted Trees", "—", 0, {"plt_lg": 1}, {}),
    # SDA-8 — Bio opp 1000, 3 planted large
    (8, "BMP-08-A", "Bioretention", "Enhanced", 1000, {},
     {"sa_pond_top": 1400, "top_elev": 100.0, "overflow_elev": 100.5,
      "sidewalk_elev": 100.75, "curb_cut_elev": 100.3}),
    (8, "BMP-08-T", "Planted Trees", "—", 0, {"plt_lg": 3}, {}),
    # SDA-9 — 3 planted large (trees only)
    (9, "BMP-09-T", "Planted Trees", "—", 0, {"plt_lg": 3}, {}),
    # SDA-10 — 2 planted large (trees only)
    (10, "BMP-10-T", "Planted Trees", "—", 0, {"plt_lg": 2}, {}),
]

# BMP sizing defaults (used for every structural BMP)
BIO_D_MEDIA  = 2.0     # ft
BIO_D_GRAVEL = 0.5     # ft
BIO_D_POND   = 0.5     # ft
PP_D_RESERVOIR = 1.0   # ft


# ---------------------------------------------------------------------------
# Populate helpers
# ---------------------------------------------------------------------------
def _fill_project(ws) -> None:
    """Overwrite PROJECT sheet value cells (rows 3-12, col B) with sample data."""
    row_values = {
        3:  PROJECT["Name"],
        4:  PROJECT["Number"],
        5:  PROJECT["MS4"],
        6:  PROJECT["AWDZ"],
        7:  PROJECT["DOEEReview"],
        8:  PROJECT["TotalLOD"],
        9:  PROJECT["RainfallRetention"],
        10: PROJECT["RainfallEisa"],
        11: PROJECT["Trigger"],
        12: PROJECT["EISA"],
    }
    for row, val in row_values.items():
        ws.cell(row=row, column=2).value = val


def _fill_sda_existing(ws) -> None:
    """Write pre-development SDA rows to SDA_Existing (6 input cols A-F)."""
    row = 4
    for sda_num, _ddot, pre_in, _post_in, out, hsg in SDAS:
        sda_id = f"SDA-{sda_num}"
        covers = [
            ("Impervious Vehicular",   None, pre_in[0], out[0]),
            ("Compacted (Open Space)", hsg,  pre_in[1], out[1]),
            ("Natural (Woods)",        hsg,  pre_in[2], out[2]),
        ]
        for land_use, use_hsg, area_in, area_out in covers:
            if not (area_in or area_out):
                continue
            ws.cell(row=row, column=1).value = sda_id
            ws.cell(row=row, column=2).value = "Yes"
            ws.cell(row=row, column=3).value = land_use
            if use_hsg:
                ws.cell(row=row, column=4).value = use_hsg
            ws.cell(row=row, column=5).value = area_in
            ws.cell(row=row, column=6).value = area_out
            row += 1


def _fill_sda_proposed(ws) -> None:
    """Write post-development SDA rows to SDA_Proposed (6 input cols A-F)."""
    row = 4
    for sda_num, _ddot, _pre_in, post_in, out, hsg in SDAS:
        sda_id = f"SDA-{sda_num}"
        covers = [
            ("Impervious Vehicular",   None, post_in[0], out[0]),
            ("Compacted (Open Space)", hsg,  post_in[1], out[1]),
            ("Natural (Woods)",        hsg,  post_in[2], out[2]),
        ]
        for land_use, use_hsg, area_in, area_out in covers:
            if not (area_in or area_out):
                continue
            ws.cell(row=row, column=1).value = sda_id
            ws.cell(row=row, column=2).value = "Yes"
            ws.cell(row=row, column=3).value = land_use
            if use_hsg:
                ws.cell(row=row, column=4).value = use_hsg
            ws.cell(row=row, column=5).value = area_in
            ws.cell(row=row, column=6).value = area_out
            row += 1


def _fill_cda_impl(ws) -> None:
    row = 4
    sda_imp = {s[0]: s[3][0] for s in SDAS}
    cda_idx = 0
    for sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees, geom in BMPS:
        if bmp_type in ("Planted Trees", "Preserve Trees"):
            continue
        cda_idx += 1
        n_structural = sum(
            1 for b in BMPS
            if b[0] == sda_num and b[2] not in ("Planted Trees", "Preserve Trees")
        )
        cda_id = f"CDA-{sda_num}" if n_structural == 1 else f"CDA-{sda_num}-{cda_idx}"
        cda_area = min(sda_imp.get(sda_num, 0), int(surface_sf * 3))
        ws.cell(row=row, column=1).value = cda_id
        ws.cell(row=row, column=2).value = f"SDA-{sda_num}"
        ws.cell(row=row, column=3).value = "Impervious Vehicular"
        ws.cell(row=row, column=5).value = cda_area       # Area Within LOD (was col 7 Post Within)
        row += 1


def _fill_cda_existing(ws) -> None:
    """Write pre-makeup CDA rows to CDA_Existing (same cda_area as proposed, so Area Match stays OK)."""
    _fill_cda_impl(ws)


def _fill_cda_proposed(ws) -> None:
    """Write post CDA rows to CDA_Proposed (6 input cols A-F)."""
    _fill_cda_impl(ws)


def _fill_bmp(ws) -> None:
    """Write BMP rows (names, types, dimensions, tree counts) using the new
    81-col schema.  Data rows start at row 6 (header is rows 1-5).

    Columns:
        A  BMP Name
        B  SDA_ID
        C  CDA_ID
        D  BMP Type
        E  Sub-Type
        F  PP Surface Area
        G  PP Reservoir Depth
        I  PP Ksat (auto-formula — don't overwrite)
        N  Bio SA_top (user)
        O  Bio SA_bot (AUTO ← CDA SUMIFS — don't overwrite)
        Q  Bio d_topsoil
        R  Bio d_media
        T  Bio d_choker
        U  Bio d_gravel
        V  Bio Underdrain Y/N
        AA Bio d_pond
        AB Bio Ksat (auto-formula — don't overwrite)
        AH-AM # Planted/Preserved trees (6 cols)
        AW Bio surface elev, AY 15-yr head, AZ sidewalk, BA curb-cut, BE cleanouts
        BF-BV Swale supplemental geometry
    """
    row = 6                          # new data range starts at row 6
    structural_count = {}
    for sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees, geom in BMPS:
        ws.cell(row=row, column=1).value = bmp_name
        ws.cell(row=row, column=2).value = f"SDA-{sda_num}"

        if bmp_type in ("Planted Trees", "Preserve Trees"):
            ws.cell(row=row, column=4).value = bmp_type
            ws.cell(row=row, column=5).value = "—"
            # Tree counts in new schema: AH-AM = cols 34-39
            ws.cell(row=row, column=34).value = trees.get("plt_sm", 0)
            ws.cell(row=row, column=35).value = trees.get("plt_lg", 0)
            ws.cell(row=row, column=36).value = trees.get("pres_sm", 0)
            ws.cell(row=row, column=37).value = trees.get("pres_lg", 0)
            ws.cell(row=row, column=38).value = trees.get("pres_sp", 0)
            ws.cell(row=row, column=39).value = trees.get("pres_hr", 0)
            row += 1
            continue

        # Structural BMP — attach a CDA
        structural_count[sda_num] = structural_count.get(sda_num, 0) + 1
        n_structural_in_sda = sum(
            1 for b in BMPS
            if b[0] == sda_num and b[2] not in ("Planted Trees", "Preserve Trees")
        )
        cda_id = (f"CDA-{sda_num}" if n_structural_in_sda == 1
                  else f"CDA-{sda_num}-{structural_count[sda_num]}")
        ws.cell(row=row, column=3).value = cda_id
        ws.cell(row=row, column=4).value = bmp_type
        ws.cell(row=row, column=5).value = sub_type

        if bmp_type == "Permeable Pavement":
            ws.cell(row=row, column=6).value = surface_sf      # F — Aₚ
            ws.cell(row=row, column=7).value = PP_D_RESERVOIR  # G — dₚ
            # Col I (Ksat): auto-formula, do not overwrite.
        elif bmp_type == "Bioretention":
            ws.cell(row=row, column=14).value = surface_sf     # N — SA_top
            # O (SA_bot) is AUTO ← CDA SUMIFS — do not overwrite.
            ws.cell(row=row, column=17).value = 0.25           # Q — d_topsoil
            ws.cell(row=row, column=18).value = BIO_D_MEDIA    # R — d_media
            ws.cell(row=row, column=20).value = 0.25           # T — d_choker
            ws.cell(row=row, column=21).value = BIO_D_GRAVEL   # U — d_gravel
            ws.cell(row=row, column=22).value = "N"            # V — Underdrain
            ws.cell(row=row, column=27).value = BIO_D_POND     # AA — d_pond
            # AB (Ksat): auto-formula, do not overwrite.
        elif bmp_type == "Dry Swale":
            ws.cell(row=row, column=14).value = geom.get("width", 4) * 1  # N — SA_top
            # O (SA_bot) is AUTO ← CDA SUMIFS — do not overwrite.
            ws.cell(row=row, column=17).value = 0.167          # Q — d_topsoil
            ws.cell(row=row, column=18).value = BIO_D_MEDIA    # R — d_media
            ws.cell(row=row, column=20).value = 0.25           # T — d_choker
            ws.cell(row=row, column=21).value = BIO_D_GRAVEL   # U — d_gravel
            ws.cell(row=row, column=27).value = geom.get("h_cd", 1.0)  # AA — d_pond
            # Swale supplemental geometry (BF-BV area, cols 58-74)
            ws.cell(row=row, column=58).value = geom["length"]   # BF — L_s
            ws.cell(row=row, column=59).value = geom["width"]    # BG — w_s
            ws.cell(row=row, column=60).value = 3                # BH — side slope 3:1
            ws.cell(row=row, column=69).value = geom["inv_us"]   # BQ — inv US
            ws.cell(row=row, column=70).value = geom["inv_ds"]   # BR — inv DS
            # BK-BL top-of-grade US/DS:
            ws.cell(row=row, column=63).value = geom["top_us"]
            ws.cell(row=row, column=64).value = geom["top_ds"]
            ws.cell(row=row, column=73).value = geom["h_cd"]     # BU — H_cd
            ws.cell(row=row, column=74).value = geom["x_cd"]     # BV — X_cd
            ws.cell(row=row, column=75).value = 1                # BW — cleanouts

        # Bio supplemental geometry (AW-BE area, cols 49-57).
        if bmp_type == "Bioretention" and geom:
            if "top_elev" in geom:
                ws.cell(row=row, column=49).value = geom["top_elev"]      # AW — surface elev
            if "overflow_elev" in geom:
                # ponding elev is AUTO (AX = AW + d_pond) — but we expose the
                # user-intended 15-yr head of 0.25 ft here as a default:
                ws.cell(row=row, column=51).value = 0.25                   # AY — 15-yr head
            if "sidewalk_elev" in geom:
                ws.cell(row=row, column=52).value = geom["sidewalk_elev"]  # AZ — sidewalk
            if "curb_cut_elev" in geom:
                ws.cell(row=row, column=53).value = geom["curb_cut_elev"]  # BA — curb-cut
            ws.cell(row=row, column=57).value = 1                          # BE — cleanouts

        row += 1


def _fill_mep_summary(ws) -> None:
    """Set Water Table OK, Bedrock OK, Hotspot Found cells on CORRECT_MEP_SUMMARY.

    These are the Step 2/3 user-judgment cells (M, N, P) on data rows 12-21.
    O (Infiltration Rate) is an auto-formula — do not overwrite.
    """
    for i in range(10):
        r = 12 + i
        ws.cell(row=r, column=13).value = "Yes"   # Water Table OK?
        ws.cell(row=r, column=14).value = "Yes"   # Bedrock OK?
        ws.cell(row=r, column=16).value = "No"    # Hotspot Concern Found?


def build_sample() -> Path:
    """Build the sample workbook and save to OUTPUT. Return the written path."""
    wb = build_workbook()
    _fill_project(wb["PROJECT"])
    _fill_sda_existing(wb["SDA_Existing"])
    _fill_sda_proposed(wb["SDA_Proposed"])
    _fill_cda_existing(wb["CDA_Existing"])
    _fill_cda_proposed(wb["CDA_Proposed"])
    _fill_bmp(wb["BMP"])
    _fill_mep_summary(wb["CORRECT_MEP_SUMMARY"])
    wb.save(OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    out = build_sample()
    print(f"Saved sample: {out}")
