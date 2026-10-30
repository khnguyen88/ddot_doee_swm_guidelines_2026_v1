"""Generate a second sample-populated workbook — anonymous Multi-Use Trail.

Dimensions and land-cover values are adapted from the Stantec EISA Section 438
hand-worked example at docs/manual_guidance/EISA 438 sample comps.pdf. The
sample is deliberately UNNAMED (no site, agency, or ownership label) so it can
serve as a generic EISA 438 teaching artifact distinct from any production
project.

Why: Minnesota Ave is a DDOT PROW streetscape (10 SDAs, no EISA). This fixture
is a federal/park trail retrofit (1 SDA with 7 mixed-HSG land-cover rows, EISA
applies). The two samples together exercise both DOEE MLD and EISA 438
compliance pathways through the summary + education apps.

Run with:

    python -m workbook.sample_trail

Output file:

    SW_Required_Provided_DOEE_EISA438_SAMPLE_Trail.xlsx
"""
from __future__ import annotations
from pathlib import Path

from workbook.__main__ import build_workbook, PROJECT_ROOT


OUTPUT = PROJECT_ROOT / "SW_Required_Provided_DOEE_EISA438_SAMPLE_Trail.xlsx"


PROJECT = {
    "Name":            "Multi-Use Trail Test Case",
    "Number":          "DTA-TRL1",
    "MS4":             "Non-MS4",
    "AWDZ":            "No",
    "DOEEReview":      "N/A (sample)",
    "TotalLOD":        498179,      # 11.44 ac
    "Rainfall":        1.7,         # EISA 95th percentile for DC
    "Trigger":         "MLD",
    "EISA":            "Yes",       # Federal/park project — EISA applies
}


# Stone Stream has ONE SDA with multiple land-cover rows differentiated by HSG.
# Unlike Minnesota Ave (one HSG per SDA), this exercises mixed-HSG accounting.
#
# Pre-development total: 498,179 sf (natural grass + woods + existing impervious)
# Post-development total: 498,179 sf (expanded impervious + regraded grass)
#
# Pre-dev source: EISA 438 sample comps PDF p.2 (Rock Creek Park Multi-Use Trail)
# Post-dev source: EISA 438 sample comps PDF p.4
#
# One land cover's pre area had a 5,000 sf transcription discrepancy in the
# hand-drawn sample; adjusted here (Natural (Woods) HSG C: 100,778 → 105,778)
# so pre + post both sum to the stated LOD of 498,179 sf.
#
# Tuple shape (one row per SDA land-cover combination):
#   (sda_num, in_prow, land_use, hsg, pre_in, post_in, out)
SDA_ROWS = [
    # (sda, prow, land_use,                hsg, pre_in,  post_in, out)
    (1, "No", "Impervious Vehicular",       "D",  104523, 190243, 0),  # imp (any HSG)
    (1, "No", "Compacted (Open Space)",     "A",   28343,  36952, 0),  # grass A
    (1, "No", "Compacted (Open Space)",     "B",   56686,  73905, 0),  # grass B
    (1, "No", "Compacted (Open Space)",     "C",  151163, 197079, 0),  # grass C
    (1, "No", "Natural (Woods)",            "A",   18895,      0, 0),  # woods A (removed)
    (1, "No", "Natural (Woods)",            "B",   32791,      0, 0),  # woods B (removed)
    (1, "No", "Natural (Woods)",            "C",  105778,      0, 0),  # woods C (removed; +5000 fix)
]


# CDAs — one per structural BMP, sized to not cap retention credit.
# postIn is chosen so Max BMP Credit = postIn × 1.7 / 12 ≥ expected Sv.
#
# Tuple shape:
#   (cda_id, sda_id, land_use, hsg, post_in)
CDA_ROWS = [
    ("CDA-PA-A", "SDA-1", "Impervious Vehicular", "A", 60000),
    ("CDA-PA-B", "SDA-1", "Impervious Vehicular", "B", 90000),
    ("CDA-PA-C", "SDA-1", "Impervious Vehicular", "C", 200000),
    ("CDA-BR-B", "SDA-1", "Impervious Vehicular", "B",  12000),
    ("CDA-BR-C", "SDA-1", "Impervious Vehicular", "C",  30000),
    ("CDA-BS-B", "SDA-1", "Impervious Vehicular", "B",   8000),
]


# BMPs — aggregated by type + HSG tributary from PDF pp.5-6
# Total facility areas:
#   Porous Asphalt A: 21,964 sf  →  1 PP BMP
#   Porous Asphalt B: 34,051 sf
#   Porous Asphalt C: 71,188 sf
#   Bioretention B:      804 sf  →  1 Bio BMP
#   Bioretention C:    2,329 sf
#   Bio-Swale B:         500 sf  →  1 Dry Swale BMP (exercises wedge geometry)
#
# Dimensions chosen per DOEE §3.5 / §3.6 / §3.9 (Enhanced sub-type defaults).
#
# Tuple shape: (sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees_dict, geom_dict, cda_id)
BMPS = [
    (1, "SW-PA-A", "Permeable Pavement", "Enhanced", 21964, {}, {}, "CDA-PA-A"),
    (1, "SW-PA-B", "Permeable Pavement", "Enhanced", 34051, {}, {}, "CDA-PA-B"),
    (1, "SW-PA-C", "Permeable Pavement", "Enhanced", 71188, {}, {}, "CDA-PA-C"),
    (1, "SW-BR-B", "Bioretention",       "Enhanced",   804, {},
     {"sa_pond_top": 1125, "top_elev": 100.0, "overflow_elev": 100.5,
      "sidewalk_elev": 100.75, "curb_cut_elev": 100.3}, "CDA-BR-B"),
    (1, "SW-BR-C", "Bioretention",       "Enhanced",  2329, {},
     {"sa_pond_top": 3260, "top_elev": 100.0, "overflow_elev": 100.5,
      "sidewalk_elev": 100.75, "curb_cut_elev": 100.3}, "CDA-BR-C"),
    # Dry Swale exercises the new channel geometry + check-dam wedge pond math.
    (1, "SW-BS-B", "Dry Swale",          "—",         500, {},
     {"length": 125, "width": 4, "inv_us": 100.0, "inv_ds": 97.5,
      "top_us": 102.0, "top_ds": 99.5, "h_cd": 1.0, "x_cd": 50}, "CDA-BS-B"),
]


BIO_D_MEDIA  = 2.0     # ft
BIO_D_GRAVEL = 0.5     # ft
BIO_D_POND   = 0.5     # ft
PP_D_RESERVOIR = 1.0   # ft


def _fill_project(ws) -> None:
    row_values = {
        3:  PROJECT["Name"],      4:  PROJECT["Number"],
        5:  PROJECT["MS4"],       6:  PROJECT["AWDZ"],
        7:  PROJECT["DOEEReview"], 8: PROJECT["TotalLOD"],
        9:  PROJECT["Rainfall"],  10: PROJECT["Trigger"],
        11: PROJECT["EISA"],
    }
    for row, val in row_values.items():
        ws.cell(row=row, column=2).value = val


def _fill_sda(ws) -> None:
    """Write Stone Stream's 7 SDA land-cover rows."""
    row = 4
    for sda_num, in_prow, land_use, hsg, pre_in, post_in, out in SDA_ROWS:
        ws.cell(row=row, column=1).value = f"SDA-{sda_num}"
        ws.cell(row=row, column=2).value = in_prow
        ws.cell(row=row, column=3).value = land_use
        # Impervious doesn't carry an HSG value in the schema; leave blank.
        if land_use not in ("Impervious Vehicular", "Impervious Non-Vehicular"):
            ws.cell(row=row, column=4).value = hsg
        ws.cell(row=row, column=5).value = pre_in       # Pre within LOD
        ws.cell(row=row, column=6).value = out          # Pre outside LOD
        ws.cell(row=row, column=7).value = post_in      # Post within LOD
        ws.cell(row=row, column=8).value = out          # Post outside LOD
        row += 1


def _fill_cda(ws) -> None:
    """Write Stone Stream's 6 CDAs — one per structural BMP."""
    row = 4
    for cda_id, sda_id, land_use, hsg, post_in in CDA_ROWS:
        ws.cell(row=row, column=1).value = cda_id
        ws.cell(row=row, column=2).value = sda_id
        ws.cell(row=row, column=3).value = land_use
        ws.cell(row=row, column=4).value = hsg
        ws.cell(row=row, column=5).value = 0            # pre_in (not tracked)
        ws.cell(row=row, column=6).value = 0            # pre_out
        ws.cell(row=row, column=7).value = post_in
        ws.cell(row=row, column=8).value = 0            # post_out
        row += 1


def _fill_bmp(ws) -> None:
    """Write Stone Stream's 6 BMPs with geometry fields where applicable."""
    row = 4
    for sda_num, bmp_name, bmp_type, sub_type, surface_sf, trees, geom, cda_id in BMPS:
        ws.cell(row=row, column=1).value = bmp_name
        ws.cell(row=row, column=2).value = f"SDA-{sda_num}"
        ws.cell(row=row, column=3).value = cda_id
        ws.cell(row=row, column=4).value = bmp_type
        ws.cell(row=row, column=5).value = sub_type

        # ── Permeable Pavement block (F-H = cols 6-8) ──
        if bmp_type == "Permeable Pavement":
            ws.cell(row=row, column=6).value = surface_sf             # Ap
            ws.cell(row=row, column=7).value = PP_D_RESERVOIR         # dp
        # ── Bioretention block (N,O = cols 14-15; Q,S,U = cols 17,19,21) ──
        if bmp_type == "Bioretention":
            ws.cell(row=row, column=14).value = surface_sf            # SA_top
            ws.cell(row=row, column=15).value = surface_sf            # SA_bot (planter — vertical walls)
            ws.cell(row=row, column=17).value = BIO_D_MEDIA
            ws.cell(row=row, column=19).value = BIO_D_GRAVEL
            ws.cell(row=row, column=21).value = BIO_D_POND
            # Bio geometry extension (AN-AR = cols 40-44)
            if "sa_pond_top" in geom:
                ws.cell(row=row, column=40).value = geom["sa_pond_top"]
            if "top_elev" in geom:
                ws.cell(row=row, column=41).value = geom["top_elev"]
            if "overflow_elev" in geom:
                ws.cell(row=row, column=42).value = geom["overflow_elev"]
            if "sidewalk_elev" in geom:
                ws.cell(row=row, column=43).value = geom["sidewalk_elev"]
            if "curb_cut_elev" in geom:
                ws.cell(row=row, column=44).value = geom["curb_cut_elev"]
        # ── Dry Swale block ──
        # Uses the same N/O/Q/S/U cells as Bio for subsurface + geometry at AT-BA (46-53).
        if bmp_type == "Dry Swale":
            ws.cell(row=row, column=14).value = geom.get("width", 4)                     # SA_top (narrow at surface)
            ws.cell(row=row, column=15).value = geom["length"] * geom["width"]           # SA_bot = L × w
            ws.cell(row=row, column=17).value = BIO_D_MEDIA
            ws.cell(row=row, column=19).value = BIO_D_GRAVEL
            ws.cell(row=row, column=21).value = geom["h_cd"]                             # d_pond fallback
            ws.cell(row=row, column=46).value = geom["length"]
            ws.cell(row=row, column=47).value = geom["width"]
            ws.cell(row=row, column=48).value = geom["inv_us"]
            ws.cell(row=row, column=49).value = geom["inv_ds"]
            ws.cell(row=row, column=50).value = geom["top_us"]
            ws.cell(row=row, column=51).value = geom["top_ds"]
            ws.cell(row=row, column=52).value = geom["h_cd"]
            ws.cell(row=row, column=53).value = geom["x_cd"]
        # Tree BMPs — not used in Stone Stream.
        if bmp_type in ("Planted Trees", "Preserve Trees"):
            ws.cell(row=row, column=28).value = trees.get("plt_sm", 0)
            ws.cell(row=row, column=29).value = trees.get("plt_lg", 0)
            ws.cell(row=row, column=30).value = trees.get("pres_sm", 0)
            ws.cell(row=row, column=31).value = trees.get("pres_lg", 0)
            ws.cell(row=row, column=32).value = trees.get("pres_sp", 0)
            ws.cell(row=row, column=33).value = trees.get("pres_hr", 0)
        row += 1


def _fill_mep_summary(ws) -> None:
    """Stone Stream is non-PROW; MEP doesn't apply, so no cells needed.

    (Rows exist in the sheet but all remain blank; the MEP summary page in the
    summary + education apps will show "No PROW SDAs — MEP does not apply".)
    """
    # Intentionally empty.
    pass


def build_sample() -> Path:
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
