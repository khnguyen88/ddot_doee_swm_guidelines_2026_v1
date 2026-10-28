"""Apply number formats across all sheets after builders have run.

Goal: readable, bounded-precision cells. Everything rounds to the nearest
whole number or the nearest 10th in display, with a few exceptions where
2 decimals are meaningful (Rv coefficients, porosities, Ksat defaults).

Format conventions:
    "#,##0"   — whole number with thousands separator (areas SF, volumes CF, counts)
    "0.0"     — one decimal (depths ft, infiltration rate in/hr, rainfall in)
    "0.00"    — two decimals (Rv coefficients, porosities, Ksat ft/day)
    "0%"      — percent (already set where used; left alone)
"""
from __future__ import annotations
from openpyxl import Workbook
from openpyxl.worksheet.worksheet import Worksheet


INT_FMT = "#,##0"
D1_FMT  = "0.0"
D2_FMT  = "0.00"


# ---------------------------------------------------------------------------
# Per-sheet rules
# ---------------------------------------------------------------------------
# Each rule is (col_or_range, format_str). Rules apply to all rows from
# row_first to the sheet's max_row (inclusive). Header rows (fixed small
# text cells) are not affected because they don't hold numeric values.
#
# Column ranges are inclusive, 1-based.

def _r(start: int, end: int):
    return range(start, end + 1)


_SHEET_RULES = {
    "SDA": {
        "row_first": 4,
        "cols": [
            (_r(5, 8),  INT_FMT),   # E-H  areas within/outside LOD (pre+post)
            (9,         D2_FMT),    # I    Rv coefficient
            (10,        D1_FMT),    # J    rainfall depth (in)
            (_r(11,14), INT_FMT),   # K-N  SWRv CF (pre+post within/outside)
            # Summary block rows share these columns — same formats apply.
        ],
    },
    "CDA": {
        "row_first": 4,
        "cols": [
            (_r(5, 6),  INT_FMT),   # E-F  within/outside LOD (SF)
            (7,         D2_FMT),    # G    Rv coefficient
            (_r(8, 9),  INT_FMT),   # H-I  CDA SWRv CF
            # Summary cols: C=Total CDA SF, D=Max BMP Credit CF — overlap at C/D
            (3,         INT_FMT),   # C    Total CDA Within LOD (summary)
            (4,         INT_FMT),   # D    Max BMP Credit CF (summary)
        ],
    },
    "BMP": {
        "row_first": 4,
        "cols": [
            # PP zone
            (6,         INT_FMT),   # F  PP SA
            (7,         D1_FMT),    # G  PP reservoir depth (ft)
            (8,         D1_FMT),    # H  PP sump depth
            (9,         D2_FMT),    # I  PP Ksat
            (10,        D2_FMT),    # J  PP n_reservoir
            (11,        INT_FMT),   # K  PP Sv (CF)
            (12,        D1_FMT),    # L  PP Drawdown (days)
            # Bio zone
            (_r(14,16), INT_FMT),   # N-P  Bio SA_top, SA_bot, SA_avg
            (17,        D1_FMT),    # Q  d_media (ft)
            (18,        D2_FMT),    # R  n_media
            (19,        D1_FMT),    # S  d_gravel (ft)
            (20,        D2_FMT),    # T  n_gravel
            (21,        D1_FMT),    # U  d_pond (ft)
            (22,        D2_FMT),    # V  Bio Ksat
            (23,        INT_FMT),   # W  Bio Sv (CF)
            (24,        D1_FMT),    # X  Bio Drawdown
            # Wet Swale zone
            (_r(25,27), INT_FMT),   # Y-AA  pool, ED, Sv
            # Trees
            (_r(28,33), "0"),       # AB-AG  tree counts (plain integer)
            (34,        INT_FMT),   # AH  Tree Rv Total (CF)
            # Output zone
            (35,        INT_FMT),   # AI  Sv Total
            (36,        D2_FMT),    # AJ  Retention Multiplier
            (_r(37,39), INT_FMT),   # AK-AM  Rv Uncapped, Max Credit, Rv Applied
        ],
    },
    "CORRECT_MEP_SUMMARY": {
        "row_first": 12,
        "cols": [
            (_r(2, 9),  INT_FMT),   # B-I  land cover + total SF
            (_r(10,11), INT_FMT),   # J-K  SWRv CF
            # L (HSG) is text — no format needed
            (15,        D2_FMT),    # O  infiltration rate (in/hr)
            # Tree block
            (17,        "0"),       # Q  # preserved small
            (18,        INT_FMT),   # R  small tree credit CF
            (19,        "0"),       # S  # preserved large
            (20,        INT_FMT),   # T  large tree credit CF
            (21,        "0"),       # U  # special+heritage
            (22,        INT_FMT),   # V  special/heritage credit CF
            # Opportunity + CDA block
            (_r(23,30), INT_FMT),   # W-AD  SF
            (_r(31,32), INT_FMT),   # AE-AF ceiling runoff CF
            (_r(33,35), INT_FMT),   # AG-AI max Sv CF
            (36,        "0"),       # AJ  # planted small
            (37,        "0"),       # AK  # planted large
            (_r(38,39), INT_FMT),   # AL-AM total Sv + overage CF
            # Rv columns
            (42,        D2_FMT),    # AP  Rv within LOD
            (43,        D2_FMT),    # AQ  Rv outside LOD
        ],
        "extra_cells": [
            # Project header value cells (rows 3-5)
            ("E4", D2_FMT),   # Disturbance Area (ac.) — 2 decimals
            ("E5", "0"),       # No. of Drainage Areas — integer
            ("J3", INT_FMT),   # Regulated Retention Volume
            ("J4", INT_FMT),   # Volume Retained
            ("J5", INT_FMT),   # Difference
        ],
    },
    "EISA_DIRECT": {
        "row_first": 4,
        "cols": [
            (3,         INT_FMT),   # C  Area (SF)
            (_r(4, 5),  D2_FMT),    # D-E  Runoff depth (in)  HSG B/C
            (_r(6, 7),  INT_FMT),   # F-G  Volume (CF)
            (2,         INT_FMT),   # B  Compliance block CF values
        ],
    },
    "EISA_TR55": {
        "row_first": 4,
        "cols": [
            (3,         "0"),       # C  CN (integer)
            (4,         INT_FMT),   # D  Area SF
            (5,         D2_FMT),    # E  Q (in)
            (6,         INT_FMT),   # F  Volume CF
            (2,         INT_FMT),   # B  Compliance block
        ],
    },
    "DOEE_SDA": {
        "row_first": 4,
        "cols": [
            (_r(3,11),  INT_FMT),   # C-K  land cover SF
            (12,        INT_FMT),   # L  SWRv Required CF
        ],
    },
    "DOEE_BMP_DATA": {
        "row_first": 4,
        "cols": [
            (3,         "0"),       # C  BMP # (count)
            (_r(6, 9),  INT_FMT),   # F-I  CDA land cover SF
            (_r(10,11), INT_FMT),   # J-K  Sv, Rv applied CF
        ],
    },
    "DOEE_DETENTION": {
        "row_first": 4,
        "cols": [
            (_r(2, 3),  D1_FMT),    # B-C  CN (one decimal is fine)
            (_r(4, 5),  D2_FMT),    # D-E  2-yr Q (in)
            (_r(7, 8),  D2_FMT),    # G-H  15-yr Q (in)
        ],
    },
    "DOEE_COMPLIANCE": {
        "row_first": 4,
        "cols": [
            (_r(2, 3),  INT_FMT),   # B-C  SWRv / Rv CF
            # D (%) already set to 0% elsewhere — don't override
        ],
    },
}


def _apply_rules(ws: Worksheet, row_first: int, cols_rules, extra_cells=None):
    row_last = ws.max_row
    for cols, fmt in cols_rules:
        col_iter = cols if hasattr(cols, "__iter__") else [cols]
        for col in col_iter:
            for r in range(row_first, row_last + 1):
                cell = ws.cell(row=r, column=col)
                # Preserve explicit formats like "0%" that were set intentionally.
                if cell.number_format == "0%":
                    continue
                cell.number_format = fmt
    if extra_cells:
        for addr, fmt in extra_cells:
            ws[addr].number_format = fmt


def apply_number_formats(wb: Workbook) -> None:
    """Walk each sheet in _SHEET_RULES and apply number formats."""
    for sheet_name, spec in _SHEET_RULES.items():
        if sheet_name not in wb.sheetnames:
            continue
        ws = wb[sheet_name]
        _apply_rules(
            ws,
            spec["row_first"],
            spec["cols"],
            extra_cells=spec.get("extra_cells"),
        )
