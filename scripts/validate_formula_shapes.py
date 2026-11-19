#!/usr/bin/env python3
"""Lexical shape check for canonical DOEE / TR-55 / EISA formulas.

For each canonical formula, we define an ordered list of "expected tokens"
(variables, coefficients, operator fragments) and assert each one appears
in our implementation source in that order.

This is a *lexical* check — not a symbolic equivalence proof. It catches
sign flips, coefficient typos, and missing variables without requiring
a CAS. It is tolerant to whitespace and comments but strict about missing
tokens and wrong order.

Formulas covered (per spec §6):

  1. SCS Runoff Depth (TR-55 Eq 2-3 / 2-4 / 2-5)
     Q = (P - Ia)**2 / (P + 0.8*S) ; S = 1000/CN - 10 ; Ia = 0.2*S

  2. Closed-form inverse CN (solve S from Q, P)
     S_adj = 5 * (P + 2Q - sqrt(Q*(4Q + 5P)))
     CN    = 1000 / (S_adj + 10)

  3. Bio Sv (three-layer)
     Sv = SA_bot*d_media*n_media
        + SA_bot*d_gravel*n_gravel
        + trapezoid_frustum(SA_top, SA_pond_top, d_pond)

  4. EISA Direct runoff depth
     max(0, P - depression_storage - horton_integral(f_max, f_min, k, 24))

  5. TR-55 unit peak discharge lookup
     log10(qu) = C0 + C1*log10(Tc) + C2*(log10(Tc))**2
     C0 / C1 / C2 linearly interpolated across Ia/P bins.

Usage:
  python scripts/validate_formula_shapes.py           # exits 0/1
  python scripts/validate_formula_shapes.py -v        # verbose, per-formula lines
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------------
# Canonical formula catalogue
# ---------------------------------------------------------------------------
#
# Each implementation entry carries:
#   file:                    repo-relative path to the source
#   symbol:                  regex / literal that locates the start of the body
#                            (e.g. 'export function tr55RunoffDepth' or
#                             'def tr55_runoff_depth')
#   end_pattern:             regex that marks the end of the body — defaults
#                            to the next line-start brace/dedent heuristic
#                            (`^}` for JS, `^def |^[A-Za-z]` for Python)
#   expected_tokens_in_order: list of substrings that must appear in order
#                            inside the body. Each substring is matched
#                            literally (regex escaped) and must appear in
#                            the body (whitespace and comments are tolerated,
#                            but the substring itself is matched verbatim).

CANONICAL_FORMULAS = [
    {
        'name': 'SCS Runoff Depth (TR-55 Eq 2-3 / 2-4 / 2-5)',
        'citation': 'USDA NRCS TR-55 (1986), Chapter 2, Eq 2-3, 2-4, 2-5',
        'implementations': [
            {
                'file': 'summary_calculator/src/calc.mjs',
                'symbol': r'export function tr55RunoffDepth\b',
                'end_pattern': r'^\}',
                'expected_tokens_in_order': [
                    'P', 'cn',
                    '1000 / cn', '- 10',
                    '0.2 * S',
                    '(P - Ia)', '** 2',
                    '(P - Ia + S)',
                ],
            },
            {
                'file': 'workbook/calculations.py',
                'symbol': r'def tr55_runoff_depth\b',
                'end_pattern': r'^def |^[A-Za-z]|^#',
                'expected_tokens_in_order': [
                    'P_in', 'cn',
                    '1000.0 / cn', '- 10.0',
                    '0.2 * S',
                    '(P_in - Ia)', '** 2',
                    '(P_in - Ia + S)',
                ],
            },
        ],
    },
    {
        'name': 'Closed-form inverse CN (solve S from Q and P)',
        'citation': (
            'DOEE Stormwater Management Guidebook, Appendix A §A.2 — '
            'inversion of TR-55 Eq 2-3 for S given Q, P.'
        ),
        'implementations': [
            {
                'file': 'summary_calculator/src/calc.mjs',
                'symbol': r'export function detentionBmpAdjustedCn\b',
                'end_pattern': r'^\}',
                'expected_tokens_in_order': [
                    'adjQIn', 'pIn',
                    '5 * (pIn + 2 * adjQIn',
                    'Math.sqrt',
                    'adjQIn * (4 * adjQIn + 5 * pIn)',
                    '1000 / (sAdj + 10)',
                ],
            },
        ],
    },
    {
        'name': 'Bio Sv (three-layer storage: media + gravel + pond)',
        'citation': (
            'DOEE Stormwater Management Guidebook Equation 3.5 / SWMP-BMP '
            "Calc Spreadsheet '3.6 Bioretention'!C73 (trapezoid-pond variant)."
        ),
        'implementations': [
            {
                'file': 'summary_calculator/src/calc.mjs',
                'symbol': r'export function bioSizingSv\b',
                'end_pattern': r'^\}',
                'expected_tokens_in_order': [
                    'saBot', 'saTop', 'saPondTop',
                    'dMedia', 'nMedia',
                    'dGravel', 'nGravel',
                    'dPond',
                    'saBot * (dMedia * nMedia + dGravel * nGravel)',
                    '0.5 * (saTop + saPondTop) * dPond',
                    'saBot * dPond',
                ],
            },
            # Python mirror: the workbook builder writes the Excel formula
            # `O*(R*S + U*Z) + P*AA` for column AC in `bmp.py`. That is an
            # equivalent of SA_bot*(d_media*n_media + d_gravel*n_gravel) +
            # SA_top*d_pond (vertical-wall / arithmetic-average branch). We
            # pin that Excel string's shape so renaming a column (which
            # would silently break the workbook) is caught.
            {
                'file': 'workbook/builders/bmp.py',
                'symbol': r'ac_formula\s*=',
                'end_pattern': r'^\s*styles\.calc_c|^\s*#',
                'expected_tokens_in_order': [
                    'O{r}', '*', '(', 'R{r}', '*', 'S{r}',
                    '+', 'U{r}', '*', 'Z{r}', ')',
                    '+', 'P{r}', '*', 'AA{r}',
                ],
            },
        ],
    },
    {
        'name': 'EISA Direct runoff depth (depression + Horton infiltration)',
        'citation': (
            'EPA EISA §438 Technical Guidance, Appendix C — depression + '
            '24-hr Horton infiltration loss model.'
        ),
        'implementations': [
            {
                'file': 'summary_calculator/src/calc.mjs',
                'symbol': r'export function eisaDirectRunoffDepth\b',
                'end_pattern': r'^\}',
                'expected_tokens_in_order': [
                    'landUse', 'hsg', 'P',
                    'IMPERVIOUS_LAND_USES',
                    'DEPRESSION_IMPERVIOUS',
                    "hsg === 'A'",
                    "hsg === 'B'",
                    'DEPRESSION_PERVIOUS',
                    'HORTON_INFIL_LOSS_B',
                    "hsg === 'C'",
                    'HORTON_INFIL_LOSS_C',
                    "hsg === 'D'",
                    'Math.max(0',
                ],
            },
            {
                'file': 'workbook/calculations.py',
                'symbol': r'def eisa_direct_runoff_depth',
                'end_pattern': r'^def |^[A-Za-z]|^#',
                'expected_tokens_in_order': [
                    'land_use', 'hsg', 'P_in',
                    'IMPERVIOUS_LAND_USES',
                    'DEPRESSION_IMPERVIOUS',
                    'hsg == "A"',
                    'hsg == "B"',
                    'DEPRESSION_PERVIOUS',
                    'HORTON_INFIL_LOSS_B',
                    'hsg == "C"',
                    'HORTON_INFIL_LOSS_C',
                    'hsg == "D"',
                    'max(0.0',
                ],
            },
        ],
    },
    {
        'name': 'TR-55 unit peak discharge lookup (log-polynomial + Ia/P interp)',
        'citation': (
            'USDA NRCS TR-55 (1986), Chapter 4 "Graphical Peak Discharge '
            'Method", Exhibit 4-II / Appendix F Table F-1.'
        ),
        'implementations': [
            {
                'file': 'summary_calculator/src/calc.mjs',
                'symbol': r'export function tr55UnitPeakDischarge',
                'end_pattern': r'^\}',
                'expected_tokens_in_order': [
                    'tcHr', 'iaOverP', 'paramsTr55',
                    'c0Lo', 'c1Lo', 'c2Lo',
                    'c0Hi', 'c1Hi', 'c2Hi',
                    '(iap - iapLo) / (iapHi - iapLo)',
                    'C0 = c0Lo + f * (c0Hi - c0Lo)',
                    'C1 = c1Lo + f * (c1Hi - c1Lo)',
                    'C2 = c2Lo + f * (c2Hi - c2Lo)',
                    'Math.log10(tcHr)',
                    'Math.pow(10, C0 + C1 * lt + C2 * lt * lt)',
                ],
            },
        ],
    },
]


# ---------------------------------------------------------------------------
# Body extraction + token scan
# ---------------------------------------------------------------------------

def extract_body(impl: dict) -> Optional[str]:
    """Return the source body for `impl`, or None if the symbol cannot be found.

    - Finds the first line matching impl['symbol'] (regex).
    - Reads lines until a line matches impl.get('end_pattern', '^$'), OR until
      a two-blank-line gap (defensive: unterminated blocks).
    - Returns the concatenated body text (includes the start line).
    """
    path = REPO_ROOT / impl['file']
    if not path.exists():
        return None

    text = path.read_text(encoding='utf-8')
    lines = text.splitlines()

    start_rx = re.compile(impl['symbol'])
    end_pat = impl.get('end_pattern', r'^$')
    end_rx = re.compile(end_pat)

    start_idx = None
    for i, line in enumerate(lines):
        if start_rx.search(line):
            start_idx = i
            break
    if start_idx is None:
        return None

    body_lines = [lines[start_idx]]
    for j in range(start_idx + 1, len(lines)):
        if end_rx.search(lines[j]):
            # Include the end line for JS `}` so tokens on that line (unlikely
            # but possible) aren't missed. For Python, end markers are the
            # *next* def, so we exclude.
            if end_pat == r'^\}':
                body_lines.append(lines[j])
            break
        body_lines.append(lines[j])
    return '\n'.join(body_lines)


def check_shape(impl: dict) -> list[str]:
    """Return a list of human-readable issues for `impl`, empty if clean."""
    body = extract_body(impl)
    issues: list[str] = []
    if body is None:
        issues.append(f"could not locate symbol {impl['symbol']!r} in "
                      f"{impl['file']}")
        return issues

    # Walk tokens in order. Each next token must appear at or after the
    # position where the previous token ended.
    cursor = 0
    expected = impl['expected_tokens_in_order']
    for i, tok in enumerate(expected):
        idx = body.find(tok, cursor)
        if idx < 0:
            # Was it present at all (just out of order)?
            earlier = body.find(tok)
            if earlier >= 0 and earlier < cursor:
                issues.append(
                    f"token {tok!r} appears OUT OF ORDER "
                    f"(found at offset {earlier}, expected at or after {cursor})"
                )
            else:
                issues.append(f"token {tok!r} MISSING from body")
            # Don't advance cursor — keep scanning remaining tokens from the
            # same position so one missing token doesn't cascade into N.
            continue
        cursor = idx + len(tok)
    return issues


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def print_report(all_issues: list[tuple]) -> None:
    print("\n" + "=" * 72)
    print("FORMULA SHAPE DRIFT DETECTED")
    print("=" * 72)
    for name, file, symbol, issues, citation in all_issues:
        print(f"\n[{name}]")
        print(f"  file:     {file}")
        print(f"  symbol:   {symbol}")
        print(f"  citation: {citation}")
        for issue in issues:
            print(f"  - {issue}")
    print("\n" + "=" * 72)
    print(f"Total drifted implementations: {len(all_issues)}")
    print("Fix the implementation so expected tokens appear in order, OR")
    print("update scripts/validate_formula_shapes.py:CANONICAL_FORMULAS if")
    print("the canonical formula itself changed (with source citation).")
    print("=" * 72)


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__.strip().splitlines()[0]
    )
    parser.add_argument('-v', '--verbose', action='store_true',
                        help="Print per-formula status and citation.")
    args = parser.parse_args(argv)

    all_issues: list[tuple] = []
    total_impls = 0

    for formula in CANONICAL_FORMULAS:
        if args.verbose:
            print(f"Checking: {formula['name']}")
            print(f"  citation: {formula['citation']}")
        for impl in formula['implementations']:
            total_impls += 1
            issues = check_shape(impl)
            if args.verbose:
                status = "OK" if not issues else f"DRIFT ({len(issues)})"
                print(f"  - {impl['file']} :: {impl['symbol']}  [{status}]")
            if issues:
                all_issues.append((
                    formula['name'],
                    impl['file'],
                    impl['symbol'],
                    issues,
                    formula['citation'],
                ))

    if all_issues:
        print_report(all_issues)
        return 1

    if args.verbose:
        print()
        print(f"All {len(CANONICAL_FORMULAS)} canonical formulas "
              f"({total_impls} implementations) match expected shapes.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
