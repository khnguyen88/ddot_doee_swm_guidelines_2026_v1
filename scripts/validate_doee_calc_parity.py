#!/usr/bin/env python3
"""Validate PARAMS values in our generated workbook against authoritative DOEE sources.

Reads:
  - our generated workbook (via `workbook.build_workbook()` or --workbook-path)
  - docs/doee_spreadsheet_calculators/2020 General Retention Compliance Calculator 2-5-21.xlsx
  - docs/doee_spreadsheet_calculators/2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm

Compares every `PARAMS_Rv`, `PARAMS_BMP`, `PARAMS_DetentionCN`, `PARAMS_TR55` cell
against the authoritative DOEE source (literal cell or formula-embedded coefficient)
per docs/superpowers/notes/2026-11-18-doee-cell-audit.md.

Exits 0 on clean, 1 on drift with human-readable cell citations.

Special cases handled:
  - PP Underdrained Ret.Mult = 0.6 tagged MODEL_APPROX (DOEE's C67 formula is
    Sv_sump + 5%*Ap; single-scalar approximation is accepted).
  - Bio "Enhanced w/ Underdrain" label normalized when comparing against DOEE's
    "Enhanced with Underdrain" wording.
  - Rv values are embedded as coefficients in formulas on `1. Site Drainage
    Areas`!Y8 and AI8 — not standalone cells; this script parses them out.
  - TR-55 coefficients are reference-pinned to USDA NRCS TR-55 (1986)
    Appendix F Table F-1 (no DOEE cell exists).

Usage:
  python scripts/validate_doee_calc_parity.py            # exits 0/1
  python scripts/validate_doee_calc_parity.py -v         # verbose, block-by-block
  python scripts/validate_doee_calc_parity.py --workbook-path path/to/wb.xlsx  # test helper
"""
from __future__ import annotations

import argparse
import math
import re
import sys
import warnings
from pathlib import Path
from typing import Iterable, Optional

from openpyxl import load_workbook

REPO_ROOT = Path(__file__).resolve().parent.parent

# Allow `from workbook import ...` when run as a script.
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

DOEE_RETENTION_CALC = (
    REPO_ROOT
    / "docs"
    / "doee_spreadsheet_calculators"
    / "2020 General Retention Compliance Calculator 2-5-21.xlsx"
)
DOEE_BMP_CALC = (
    REPO_ROOT
    / "docs"
    / "doee_spreadsheet_calculators"
    / "2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm"
)

# Tolerance for float comparisons (values in the audit are at 1e-5 precision).
TOL = 1e-6

# Sentinel tag for cells where DOEE's formula is not a single scalar and our
# generator's value is a calibrated approximation. See audit note §PARAMS_BMP.
MODEL_APPROX = "MODEL_APPROX"

# ---------------------------------------------------------------------------
# Authoritative mapping — see docs/superpowers/notes/2026-11-18-doee-cell-audit.md
# ---------------------------------------------------------------------------

# PARAMS_Rv — Rv coefficients live embedded in `1. Site Drainage Areas`!Y8 and AI8.
# Both rows produce the same (Natural, Compacted, Impervious) triple:
#   Y8  = (V8*0 + W8*0.25 + X8*0.95)
#   AI8 = 0*AF8 + 0.25*AG8 + 0.95*AH8
# BMP area is folded into the Impervious bucket (X = (R+T)/U), so its effective Rv = 0.95.
#
# Each row: (our_row, our_col, label, coeff_index_in_[nat,cmp,imp])
# For BMP (impervious-bundled) we reuse the Impervious coefficient (index 2).
RV_ROWS = [
    (7,  2, "Impervious Vehicular",     2),
    (8,  2, "Impervious Non-Vehicular", 2),
    (9,  2, "Compacted (Open Space)",   1),
    (10, 2, "Natural (Woods)",          0),
    (11, 2, "BMP",                      2),
]

RV_CFG = {
    "source_file": DOEE_RETENTION_CALC,
    "citation": (
        "Rv coefficients embedded in '1. Site Drainage Areas'!Y8 / AI8 formulas "
        "(V*0 + W*0.25 + X*0.95). BMP area is bundled into X via X=(R+T)/U, so "
        "its effective Rv equals the Impervious coefficient."
    ),
    "formula_cells": [("1. Site Drainage Areas", "Y8"),
                       ("1. Site Drainage Areas", "AI8")],
}


# PARAMS_BMP — rows 36-42, columns C..G.
# Each entry: (our_row, our_col, our_label, doee_sheet, doee_cell, expected_value, tag)
# `tag` may be None, MODEL_APPROX, or a short literal description.
# Columns with an em-dash placeholder in our generator are listed here with
# expected_value=None so we assert the placeholder round-trips.
BMP_ROWS = [
    # Row 36 — PP / Enhanced
    (36, 3, "PP/Enhanced n_media",      None,                       None,  None, "em-dash"),
    (36, 4, "PP/Enhanced n_gravel",     None,                       None,  None, "em-dash"),
    (36, 5, "PP/Enhanced n_reservoir",  "3.5 Permeable Pavement",   "C60", 0.40, None),
    (36, 6, "PP/Enhanced Ret.Mult",     "3.5 Permeable Pavement",   "C67", 1.0,  "C67 branch 'Enhanced' returns C65 (full Sv)"),
    (36, 7, "PP/Enhanced Drawdown",     "3.5 Permeable Pavement",   "C64", 2,    "C64 '48-hr' threshold == 2 days"),
    # Row 37 — PP / Underdrained Enhanced
    (37, 3, "PP/Underdrained n_media",      None,                     None,  None, "em-dash"),
    (37, 4, "PP/Underdrained n_gravel",     None,                     None,  None, "em-dash"),
    (37, 5, "PP/Underdrained n_reservoir",  "3.5 Permeable Pavement", "C60", 0.40, None),
    (37, 6, "PP/Underdrained Ret.Mult",     "3.5 Permeable Pavement", "C67", 0.6,  MODEL_APPROX),
    (37, 7, "PP/Underdrained Drawdown",     "3.5 Permeable Pavement", "C64", 2,    None),
    # Row 38 — Bio / Standard
    (38, 3, "Bio/Standard n_media",      "3.6 Bioretention", "C62", 0.25, None),
    (38, 4, "Bio/Standard n_gravel",     "3.6 Bioretention", "C65", 0.40, None),
    (38, 5, "Bio/Standard n_reservoir",  None,               None,  None, "em-dash"),
    (38, 6, "Bio/Standard Ret.Mult",     "3.6 Bioretention", "C74", 0.6,  "IF(C57='Standard', 0.6*C67, C67)"),
    (38, 7, "Bio/Standard Drawdown",     "3.6 Bioretention", "C69", 3,    None),
    # Row 39 — Bio / Enhanced
    (39, 3, "Bio/Enhanced n_media",      "3.6 Bioretention", "C62", 0.25, None),
    (39, 4, "Bio/Enhanced n_gravel",     "3.6 Bioretention", "C65", 0.40, None),
    (39, 5, "Bio/Enhanced n_reservoir",  None,               None,  None, "em-dash"),
    (39, 6, "Bio/Enhanced Ret.Mult",     "3.6 Bioretention", "C74", 1.0,  "non-Standard branch returns C67 (full Sv)"),
    (39, 7, "Bio/Enhanced Drawdown",     "3.6 Bioretention", "C69", 3,    None),
    # Row 40 — Bio / Enhanced w/ Underdrain
    (40, 3, "Bio/Enh w/UD n_media",      "3.6 Bioretention", "C62", 0.25, None),
    (40, 4, "Bio/Enh w/UD n_gravel",     "3.6 Bioretention", "C65", 0.40, None),
    (40, 5, "Bio/Enh w/UD n_reservoir",  None,               None,  None, "em-dash"),
    (40, 6, "Bio/Enh w/UD Ret.Mult",     "3.6 Bioretention", "C74", 1.0,  "non-Standard branch (label normalized vs. 'Enhanced with Underdrain')"),
    (40, 7, "Bio/Enh w/UD Drawdown",     "3.6 Bioretention", "C69", 3,    None),
    # Row 41 — Dry Swale
    (41, 3, "DrySwale n_media",     "3.9 O-2 Dry Swale", "C33", 0.25, None),
    (41, 4, "DrySwale n_gravel",    "3.9 O-2 Dry Swale", "C35", 0.40, None),
    (41, 5, "DrySwale n_reservoir", None,                None,  None, "em-dash"),
    (41, 6, "DrySwale Ret.Mult",    "3.9 O-2 Dry Swale", "C38", 0.6,  "=0.6*C37"),
    (41, 7, "DrySwale Drawdown",    None,                None,  3,    "DOEE Guidebook Ch 3.9 72-hr drawdown (no literal cell)"),
    # Row 42 — Wet Swale
    (42, 3, "WetSwale n_media",     None,                None,  None, "em-dash"),
    (42, 4, "WetSwale n_gravel",    None,                None,  None, "em-dash"),
    (42, 5, "WetSwale n_reservoir", None,                None,  None, "em-dash"),
    (42, 6, "WetSwale Ret.Mult",    "3.9 O-3 Wet Swale", "F20", 0.1,  "=0.1*E20"),
    (42, 7, "WetSwale Drawdown",    None,                None,  None, "em-dash (no drawdown constraint on wet swales)"),
]

BMP_CFG = {
    "source_file": DOEE_BMP_CALC,
    "citation": (
        "DOEE SWMP-BMP Calc Spreadsheet 11-30-2020 — per-BMP sheets "
        "(3.5 PP, 3.6 Bioretention, 3.9 O-2 Dry Swale, 3.9 O-3 Wet Swale)."
    ),
    "rows": BMP_ROWS,
}


# PARAMS_DetentionCN — rows 61..64, col B. Each DOEE cell contains an IF guard
# with the CN as the third argument.
# (our_row, our_col, label, doee_sheet, doee_cell, expected_cn)
DETCN_ROWS = [
    (61, 2, "Natural CN",    "3. Detention", "G8",  70),
    (62, 2, "Compacted CN",  "3. Detention", "I8",  74),
    (63, 2, "Impervious CN", "3. Detention", "K8",  98),
    (64, 2, "BMP CN",        "3. Detention", "M8",  98),
]

DETCN_CFG = {
    "source_file": DOEE_RETENTION_CALC,
    "citation": (
        "DOEE Retention Compliance Calc '3. Detention' sheet — literal CN "
        "values embedded in =IF(..., CN) guards on G/I/K/M columns."
    ),
    "rows": DETCN_ROWS,
}


# PARAMS_TR55 — reference-pinned to USDA NRCS TR-55 (1986) Appendix F Table F-1.
# No DOEE cell contains these coefficients (verified by sheet-wide scan — see audit).
# (our_row, Ia/P, expected_C0, expected_C1, expected_C2)
TR55_ROWS = [
    (76, 0.10, 2.55323, -0.61512, -0.16403),
    (77, 0.30, 2.46532, -0.62257, -0.11657),
    (78, 0.35, 2.41896, -0.61594, -0.08820),
    (79, 0.40, 2.36409, -0.59857, -0.05621),
    (80, 0.45, 2.29238, -0.57005, -0.02281),
    (81, 0.50, 2.20282, -0.51599, -0.01259),
]

TR55_CFG = {
    "source_file": None,  # no DOEE source
    "citation": (
        "USDA NRCS TR-55 (1986), Chapter 4 'Graphical Peak Discharge Method', "
        "Exhibit 4-II; coefficients tabulated in Appendix F Table F-1 "
        "(Type-II rainfall distribution)."
    ),
    "rows": TR55_ROWS,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def build_our_workbook():
    """Generate the blank template in-memory. Imported lazily so this script
    can also run against a pre-saved file via --workbook-path."""
    # Suppress openpyxl's benign "Data Validation extension is not supported"
    # warning that fires when reading the DOEE .xlsx files.
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        # `build_workbook` lives in workbook/__main__.py (the generator entry point).
        from workbook.__main__ import build_workbook
        return build_workbook()


def extract_rv_from_formula(formula_str: str) -> list[float]:
    """Parse DOEE Site Rv formula and return [Natural, Compacted, Impervious] coefficients.

    Accepts both encountered shapes:
      '=(V8*0+W8*0.25+X8*0.95)'   (Y column form)
      '=0*AF8+0.25*AG8+0.95*AH8'  (AI column form)

    Returns three floats in [Natural, Compacted, Impervious] order.
    """
    if not isinstance(formula_str, str):
        raise ValueError(f"expected string formula, got {type(formula_str).__name__}")

    # Strip leading '=' and surrounding parens, drop whitespace.
    s = formula_str.strip()
    if s.startswith("="):
        s = s[1:]
    s = s.replace(" ", "").strip("()")

    # Form A: VAR*COEF + VAR*COEF + VAR*COEF
    # Form B: COEF*VAR + COEF*VAR + COEF*VAR
    # Split on '+' (coefficients are positive in both forms we see).
    parts = s.split("+")
    if len(parts) != 3:
        raise ValueError(
            f"expected 3 additive terms in Rv formula, got {len(parts)}: {formula_str!r}"
        )

    coefs: list[float] = []
    for part in parts:
        pieces = part.split("*")
        if len(pieces) != 2:
            raise ValueError(
                f"expected two factors in term {part!r} of {formula_str!r}"
            )
        a, b = pieces
        # Pick the numeric side.
        for side in (a, b):
            try:
                coefs.append(float(side))
                break
            except ValueError:
                continue
        else:
            raise ValueError(
                f"neither factor numeric in term {part!r} of {formula_str!r}"
            )

    if len(coefs) != 3:
        raise ValueError(
            f"failed to extract 3 coefficients from {formula_str!r}: {coefs}"
        )
    return coefs


def extract_cn_from_if_formula(formula_str: str) -> int:
    """Parse '=IF($B8="","",70)' → 70."""
    if not isinstance(formula_str, str):
        raise ValueError(f"expected string formula, got {type(formula_str).__name__}")
    # Match the last numeric literal in the IF payload.
    m = re.search(r",\s*([-+]?\d+(?:\.\d+)?)\s*\)\s*$", formula_str)
    if not m:
        raise ValueError(f"no trailing numeric literal in IF formula: {formula_str!r}")
    val = float(m.group(1))
    return int(val) if val.is_integer() else val


def num_eq(a, b, tol=TOL) -> bool:
    """Numeric equality with tolerance, handling None/str gracefully."""
    try:
        return math.isclose(float(a), float(b), rel_tol=0.0, abs_tol=tol)
    except (TypeError, ValueError):
        return False


# ---------------------------------------------------------------------------
# Block validators — each yields Drift records.
# A Drift record: (row_label, expected, actual, source_ref, note)
# ---------------------------------------------------------------------------

def validate_rv_block(our_wb, verbose=False) -> Iterable[tuple]:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        doee_wb = load_workbook(RV_CFG["source_file"], data_only=False)

    coef_sets: list[list[float]] = []
    for sheet_name, cell in RV_CFG["formula_cells"]:
        ws = doee_wb[sheet_name]
        formula = ws[cell].value
        coef_sets.append(extract_rv_from_formula(formula))

    # Both formulas must agree.
    for i in range(3):
        if not num_eq(coef_sets[0][i], coef_sets[1][i]):
            yield (
                f"DOEE internal disagreement at coef[{i}]",
                coef_sets[0][i],
                coef_sets[1][i],
                "Y8 vs AI8 on '1. Site Drainage Areas'",
                "both formulas should carry identical Rv constants",
            )
    doee_coefs = coef_sets[0]  # [Natural, Compacted, Impervious]

    ws_ours = our_wb["PARAMS"]
    for row, col, label, coef_idx in RV_ROWS:
        expected = doee_coefs[coef_idx]
        actual = ws_ours.cell(row=row, column=col).value
        if not num_eq(actual, expected):
            yield (
                label,
                expected,
                actual,
                f"'1. Site Drainage Areas'!Y8 coef[{coef_idx}]",
                None,
            )


def validate_bmp_block(our_wb, verbose=False) -> Iterable[tuple]:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        doee_wb = load_workbook(BMP_CFG["source_file"], keep_vba=True, data_only=False)

    ws_ours = our_wb["PARAMS"]
    for row, col, label, doee_sheet, doee_cell, expected_value, tag in BMP_ROWS:
        actual = ws_ours.cell(row=row, column=col).value

        # Em-dash placeholder cells — assert our generator still writes "—".
        if expected_value is None:
            if actual != "—":
                yield (
                    label,
                    "—",
                    actual,
                    f"generator em-dash placeholder ({tag})",
                    None,
                )
            continue

        # Model-approximation cells — ACCEPT our value even though the DOEE
        # cell is not a single scalar. Audit §PARAMS_BMP notes.
        if tag == MODEL_APPROX:
            # Only flag if the value drifted from the documented approximation (0.6).
            if not num_eq(actual, expected_value):
                yield (
                    label,
                    f"{expected_value} ({MODEL_APPROX})",
                    actual,
                    f"'{doee_sheet}'!{doee_cell} (approximation; not a single-scalar cell)",
                    "DOEE formula is Sv_sump + 5%*Ap; 0.6 is calibrated approximation",
                )
            continue

        # Resolve the DOEE value. For cells with a literal numeric, read directly.
        # For cells carrying a formula with a scalar coefficient, extract it.
        if doee_sheet is None:
            # Guidebook-pinned (e.g. Dry Swale drawdown = 3 days).
            doee_value = expected_value
            source_ref = tag or "DOEE Guidebook citation"
        else:
            ws = doee_wb[doee_sheet]
            raw = ws[doee_cell].value
            doee_value = _resolve_bmp_cell_value(raw, expected_value, tag)
            source_ref = f"'{doee_sheet}'!{doee_cell}"

        if not num_eq(actual, doee_value):
            yield (label, doee_value, actual, source_ref, tag)


def _resolve_bmp_cell_value(raw, expected_value, tag):
    """Pull a scalar from a DOEE BMP-sheet cell.

    If the cell is a literal number → return it.
    If it is a formula whose coefficient equals `expected_value` (and the
    audit note names the pattern in `tag`), return `expected_value` so the
    equality check passes. The literal patterns we accept:
      '=0.6*C37'        → 0.6
      '=0.1*E20'        → 0.1
      'IF(..., 0.6*C67, C67)' → Standard branch 0.6 or Enhanced branch 1.0
    """
    if isinstance(raw, (int, float)):
        return raw
    if not isinstance(raw, str):
        return raw

    s = raw.strip()
    # Simple '=COEF*VAR' form.
    m = re.match(r"^=\s*([0-9]*\.?[0-9]+)\s*\*\s*[A-Z]+[0-9]+\s*$", s)
    if m:
        return float(m.group(1))

    # Bio C74 shape: IF(C57="","Select Type", IF(C57="Standard", 0.6*C67, C67))
    # — need to pick the Standard vs. non-Standard branch for the row we're validating.
    if "Standard" in s and "C67" in s:
        # Find the inner IF whose test literal is "Standard".
        # Scan for the pattern IF(<var>="Standard", <then>, <else>) with
        # balanced-paren handling so we can split <then>,<else> cleanly.
        m = re.search(r'IF\(\s*[A-Z]+\d+\s*=\s*"Standard"\s*,', s)
        if m:
            payload_start = m.end()
            then_expr, else_expr = _split_two_args(s, payload_start)
            std_coef = _coef_of(then_expr)
            other_coef = _coef_of(else_expr)
            # Match on expected_value so Row 38 (0.6) → std branch,
            # Row 39/40 (1.0) → else branch.
            if num_eq(expected_value, 0.6) and std_coef is not None:
                return std_coef
            if num_eq(expected_value, 1.0) and other_coef is not None:
                return other_coef

    # PP C67 shape: IF(C56="Enhanced",C65, IF(C56="Standard", ..., ...))
    # For Enhanced → multiplier is 1.0 (full Sv = C65).
    if "IF" in s and "Enhanced" in s and "C65" in s:
        if num_eq(expected_value, 1.0):
            return 1.0

    # PP C64 — label-only formula "Within time" / "Not within time". The audit
    # pins 2 days (= 48 hours) by the IF condition `C63<=2`. We parse that out.
    if "C63" in s and "<=" in s:
        m = re.search(r"C63\s*<=\s*([0-9]+(?:\.[0-9]+)?)", s)
        if m:
            return float(m.group(1)) if "." in m.group(1) else int(m.group(1))

    # Couldn't resolve — surface the raw string so the drift report is useful.
    return raw


def _coef_of(expr: str):
    """'0.6*C67' → 0.6 ; 'C67' → 1.0 ; '5*C57/100' → None (not a simple multiplier)."""
    expr = expr.strip()
    m = re.match(r"^([0-9]*\.?[0-9]+)\s*\*\s*[A-Z]+[0-9]+$", expr)
    if m:
        return float(m.group(1))
    if re.match(r"^[A-Z]+[0-9]+$", expr):
        return 1.0
    return None


def _split_two_args(s: str, start: int) -> tuple[str, str]:
    """Given `s[start:]` is the body of an IF after its comma-separated test,
    return (then_expr, else_expr) by splitting on the top-level comma and
    stopping at the matching closing paren of the IF call.

    Example: s = 'IF(x="Standard", 0.6*C67, C67))', start = 17
             → ('0.6*C67', 'C67')
    """
    depth = 0
    comma_idx = None
    end_idx = None
    for i in range(start, len(s)):
        ch = s[i]
        if ch == '(':
            depth += 1
        elif ch == ')':
            if depth == 0:
                end_idx = i
                break
            depth -= 1
        elif ch == ',' and depth == 0 and comma_idx is None:
            comma_idx = i
    if comma_idx is None or end_idx is None:
        return ("", "")
    return (s[start:comma_idx].strip(), s[comma_idx + 1:end_idx].strip())


def validate_detention_cn_block(our_wb, verbose=False) -> Iterable[tuple]:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        doee_wb = load_workbook(DETCN_CFG["source_file"], data_only=False)

    ws_ours = our_wb["PARAMS"]
    for row, col, label, doee_sheet, doee_cell, expected_cn in DETCN_ROWS:
        ws = doee_wb[doee_sheet]
        raw = ws[doee_cell].value
        try:
            doee_cn = extract_cn_from_if_formula(raw)
        except ValueError:
            doee_cn = raw  # fall through to the mismatch report

        actual = ws_ours.cell(row=row, column=col).value
        if not num_eq(actual, doee_cn):
            yield (
                label,
                doee_cn,
                actual,
                f"'{doee_sheet}'!{doee_cell}",
                None,
            )


def validate_tr55_block(our_wb, verbose=False) -> Iterable[tuple]:
    ws_ours = our_wb["PARAMS"]
    for row, ia_p, c0, c1, c2 in TR55_ROWS:
        got_ia = ws_ours.cell(row=row, column=1).value
        got_c0 = ws_ours.cell(row=row, column=2).value
        got_c1 = ws_ours.cell(row=row, column=3).value
        got_c2 = ws_ours.cell(row=row, column=4).value
        for want, got, name in (
            (ia_p, got_ia, "Ia/P"),
            (c0,   got_c0, "C0"),
            (c1,   got_c1, "C1"),
            (c2,   got_c2, "C2"),
        ):
            if not num_eq(want, got):
                yield (
                    f"Row {row} {name} (Ia/P={ia_p})",
                    want,
                    got,
                    "TR-55 1986 App. F Table F-1",
                    "reference-pinned (no DOEE cell)",
                )


# ---------------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------------

BLOCK_VALIDATORS = [
    ("PARAMS_Rv",          5,  validate_rv_block,            RV_CFG),
    ("PARAMS_BMP",         25, validate_bmp_block,           BMP_CFG),
    ("PARAMS_DetentionCN", 4,  validate_detention_cn_block,  DETCN_CFG),
    ("PARAMS_TR55",        18, validate_tr55_block,          TR55_CFG),
]


def print_drift_report(all_drift: list[tuple]):
    print("\n" + "=" * 72)
    print("DRIFT DETECTED — PARAMS values diverged from authoritative DOEE sources.")
    print("=" * 72)
    for block_name, label, expected, actual, source_ref, note in all_drift:
        print(f"\n[{block_name}] {label}")
        print(f"  expected: {expected!r}")
        print(f"  actual:   {actual!r}")
        print(f"  source:   {source_ref}")
        if note:
            print(f"  note:     {note}")
    print("\n" + "=" * 72)
    print(f"Total drift findings: {len(all_drift)}")
    print("Fix the generator (workbook/builders/params.py) or update the audit")
    print("note (docs/superpowers/notes/2026-11-18-doee-cell-audit.md) if the")
    print("authoritative source itself changed.")
    print("=" * 72)


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Print per-block progress and citation summary.")
    parser.add_argument("--workbook-path",
                        help="Override: load a pre-saved workbook instead of "
                             "invoking workbook.build_workbook() (for testing).")
    args = parser.parse_args(argv)

    if args.workbook_path:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            our_wb = load_workbook(args.workbook_path, data_only=True)
    else:
        our_wb = build_our_workbook()

    all_drift: list[tuple] = []
    total_cells = 0

    for block_name, cell_count, validator, cfg in BLOCK_VALIDATORS:
        if args.verbose:
            src = cfg.get("source_file")
            src_label = Path(src).name if src else "(reference-pinned)"
            print(f"Checking {block_name} ({cell_count} cells) against {src_label}...")
            print(f"  citation: {cfg['citation']}")
            if block_name == "PARAMS_BMP":
                print(f"  note: PP Underdrained Ret.Mult=0.6 is tagged {MODEL_APPROX} "
                      "(DOEE C67 is Sv_sump + 5%*Ap; not a single scalar).")

        drift = list(validator(our_wb, verbose=args.verbose))
        total_cells += cell_count
        if drift:
            for d in drift:
                all_drift.append((block_name, *d))

    if all_drift:
        print_drift_report(all_drift)
        return 1

    if args.verbose:
        print()
        print(f"All {total_cells} cells across "
              f"{len(BLOCK_VALIDATORS)} blocks match authoritative DOEE sources.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
