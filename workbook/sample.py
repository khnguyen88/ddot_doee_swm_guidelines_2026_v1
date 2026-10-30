"""Generate a sample-populated workbook using Minnesota Ave data.

Pulls the first 10 drainage-area land-cover entries from the DDOT MEP
Worksheet 90% Phase Sample (Minnesota Ave Great Street Test Case) and
fills them into a fresh workbook so a reviewer can see all 12 sheets
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
    "Rainfall":        1.7,       # EISA / DOEE Vmax storm
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
# (sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees_dict)
#
# trees_dict keys: plt_sm, plt_lg, pres_sm, pres_lg, pres_sp, pres_hr
BMPS = [
    # SDA-2 DDOT 58 — Bio opp 210, PP opp 150
    (2, "BMP-02-A", "Bioretention", "Enhanced",         210, {}),
    (2, "BMP-02-B", "Permeable Pavement", "Enhanced",   150, {}),
    # SDA-3 DDOT 61 — PP opp 1290
    (3, "BMP-03-A", "Permeable Pavement", "Enhanced",  1290, {}),
    # SDA-4 DDOT 68 — PP opp 930, 2 planted large trees
    (4, "BMP-04-A", "Permeable Pavement", "Enhanced",   930, {}),
    (4, "BMP-04-T", "Planted Trees",       "—",            0, {"plt_lg": 2}),
    # SDA-5 DDOT 82 — PP opp 1870, 2 preserved large + 8 planted large
    (5, "BMP-05-A", "Permeable Pavement", "Enhanced",  1870, {}),
    (5, "BMP-05-T", "Planted Trees",       "—",            0, {"plt_lg": 8, "pres_lg": 2}),
    # SDA-6 DDOT 86 — Bio opp 225, 2 planted large
    (6, "BMP-06-A", "Bioretention", "Enhanced",         225, {}),
    (6, "BMP-06-T", "Planted Trees",       "—",            0, {"plt_lg": 2}),
    # SDA-7 DDOT 88 — Bio opp 220, 1 planted large
    (7, "BMP-07-A", "Bioretention", "Enhanced",         220, {}),
    (7, "BMP-07-T", "Planted Trees",       "—",            0, {"plt_lg": 1}),
    # SDA-8 DDOT 89 — Bio opp 1000, 3 planted large
    (8, "BMP-08-A", "Bioretention", "Enhanced",        1000, {}),
    (8, "BMP-08-T", "Planted Trees",       "—",            0, {"plt_lg": 3}),
    # SDA-9 DDOT 90 — 3 planted large (trees only)
    (9, "BMP-09-T", "Planted Trees",       "—",            0, {"plt_lg": 3}),
    # SDA-10 DDOT 91 — 2 planted large (trees only)
    (10, "BMP-10-T", "Planted Trees",      "—",            0, {"plt_lg": 2}),
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
    """Overwrite PROJECT sheet value cells (rows 3-11, col B) with sample data."""
    row_values = {
        3:  PROJECT["Name"],
        4:  PROJECT["Number"],
        5:  PROJECT["MS4"],
        6:  PROJECT["AWDZ"],
        7:  PROJECT["DOEEReview"],
        8:  PROJECT["TotalLOD"],
        9:  PROJECT["Rainfall"],
        10: PROJECT["Trigger"],
        11: PROJECT["EISA"],
    }
    for row, val in row_values.items():
        ws.cell(row=row, column=2).value = val


def _fill_sda(ws) -> None:
    """Write SDA data rows for each sample SDA.

    One row per (SDA, land-use) combination where any pre_in, post_in, or
    out area is non-zero. Pre and post values go into separate columns so
    the fixture carries a real pre→post delta.
    """
    row = 4   # SDA data table starts at row 4
    for sda_num, _ddot, pre_in, post_in, out, hsg in SDAS:
        sda_id = f"SDA-{sda_num}"
        # (land_use, HSG-or-None, pre_in, post_in, out)
        covers = [
            ("Impervious Vehicular",   None, pre_in[0], post_in[0], out[0]),
            ("Compacted (Open Space)", hsg,  pre_in[1], post_in[1], out[1]),
            ("Natural (Woods)",        hsg,  pre_in[2], post_in[2], out[2]),
        ]
        for land_use, use_hsg, pin, pout, outside in covers:
            if not (pin or pout or outside):
                continue
            ws.cell(row=row, column=1).value = sda_id
            ws.cell(row=row, column=2).value = "Yes"
            ws.cell(row=row, column=3).value = land_use
            if use_hsg:
                ws.cell(row=row, column=4).value = use_hsg
            ws.cell(row=row, column=5).value = pin        # Pre within LOD
            ws.cell(row=row, column=6).value = outside    # Pre outside LOD (unchanged)
            ws.cell(row=row, column=7).value = pout       # Post within LOD
            ws.cell(row=row, column=8).value = outside    # Post outside LOD (unchanged)
            row += 1


def _fill_cda(ws) -> None:
    """One CDA row per structural BMP (CDA matches BMP's SDA land cover)."""
    row = 4
    # Map sda_num → post-development impervious SF inside LOD (from SDAS).
    # Tuple shape is (sda_num, ddot, pre_in, post_in, out, hsg); post_in[0] = post imp.
    sda_imp = {
        s[0]: s[3][0] for s in SDAS
    }
    cda_idx = 0
    for sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees in BMPS:
        # Only structural BMPs need a CDA; tree BMPs don't
        if bmp_type in ("Planted Trees", "Preserve Trees"):
            continue
        cda_idx += 1
        cda_id = f"CDA-{sda_num}" if sum(1 for b in BMPS if b[0] == sda_num and b[2] not in ("Planted Trees","Preserve Trees")) == 1 else f"CDA-{sda_num}-{cda_idx}"
        ws.cell(row=row, column=1).value = cda_id
        ws.cell(row=row, column=2).value = f"SDA-{sda_num}"
        ws.cell(row=row, column=3).value = "Impervious Vehicular"
        # CDA area in LOD = BMP's share of SDA impervious. Approximate: 2x BMP SA
        # (BMPs typically treat 2-5x their footprint).
        cda_area = min(sda_imp.get(sda_num, 0), int(surface_sf * 3))
        ws.cell(row=row, column=7).value = cda_area  # Post Within LOD
        row += 1


def _fill_bmp(ws) -> None:
    """Write BMP rows (names, types, dimensions, tree counts).

    Columns per BMP sheet layout:
        A  BMP Name
        B  SDA_ID
        C  CDA_ID
        D  BMP Type
        E  Sub-Type
        F  PP Surface Area
        G  PP Reservoir Depth
        I  PP Ksat (auto-formula — don't overwrite)
        N  Bio SA_top
        O  Bio SA_bot
        Q  Bio d_media
        S  Bio d_gravel
        U  Bio d_pond
        V  Bio Ksat (auto-formula — don't overwrite)
        AB # Planted Small
        AC # Planted Large
        AD # Preserved Small
        AE # Preserved Large
        AF # Preserved Special
        AG # Preserved Heritage
    """
    row = 4
    structural_count = {}  # sda_num → running count of structural BMPs
    for sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees in BMPS:
        ws.cell(row=row, column=1).value = bmp_name
        ws.cell(row=row, column=2).value = f"SDA-{sda_num}"

        if bmp_type in ("Planted Trees", "Preserve Trees"):
            # Trees — no CDA required; leave col C blank
            ws.cell(row=row, column=4).value = bmp_type
            ws.cell(row=row, column=5).value = "—"
            ws.cell(row=row, column=28).value = trees.get("plt_sm", 0)
            ws.cell(row=row, column=29).value = trees.get("plt_lg", 0)
            ws.cell(row=row, column=30).value = trees.get("pres_sm", 0)
            ws.cell(row=row, column=31).value = trees.get("pres_lg", 0)
            ws.cell(row=row, column=32).value = trees.get("pres_sp", 0)
            ws.cell(row=row, column=33).value = trees.get("pres_hr", 0)
            row += 1
            continue

        # Structural BMP — attach a CDA
        structural_count[sda_num] = structural_count.get(sda_num, 0) + 1
        n_structural_in_sda = sum(
            1 for b in BMPS
            if b[0] == sda_num and b[2] not in ("Planted Trees", "Preserve Trees")
        )
        if n_structural_in_sda == 1:
            cda_id = f"CDA-{sda_num}"
        else:
            cda_id = f"CDA-{sda_num}-{structural_count[sda_num]}"
        ws.cell(row=row, column=3).value = cda_id
        ws.cell(row=row, column=4).value = bmp_type
        ws.cell(row=row, column=5).value = sub_type

        if bmp_type == "Permeable Pavement":
            ws.cell(row=row, column=6).value = surface_sf      # Aₚ
            ws.cell(row=row, column=7).value = PP_D_RESERVOIR  # dₚ
            # Col I (Ksat) is an auto-formula per Task 32 — do NOT overwrite
        elif bmp_type in ("Bioretention", "Dry Swale"):
            ws.cell(row=row, column=14).value = surface_sf     # SA_top (N)
            ws.cell(row=row, column=15).value = surface_sf     # SA_bot (O) — simple default
            ws.cell(row=row, column=17).value = BIO_D_MEDIA    # d_media (Q)
            ws.cell(row=row, column=19).value = BIO_D_GRAVEL   # d_gravel (S)
            ws.cell(row=row, column=21).value = BIO_D_POND     # d_pond (U)
            # Col V (Ksat) is an auto-formula per Task 32 — do NOT overwrite

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
    _fill_sda(wb["SDA"])
    _fill_cda(wb["CDA"])
    _fill_bmp(wb["BMP"])
    _fill_mep_summary(wb["CORRECT_MEP_SUMMARY"])
    wb.save(OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    out = build_sample()
    print(f"Saved sample: {out}")
