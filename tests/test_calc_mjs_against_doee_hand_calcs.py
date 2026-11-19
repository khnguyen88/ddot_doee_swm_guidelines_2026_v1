"""Verify summary_calculator/src/calc.mjs matches published DOEE/TR-55/EISA
hand-worked examples.

Cases drawn from docs/superpowers/notes/2026-11-18-hand-calc-audit.md.
Spawns Node 20+ to execute the JS function and compares to the hand-computed
expected value within the tolerance each source cites.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent


HAND_CALCS = [
    {
        'name': 'Anacostia Offices SWRv (Guidebook App A §A.3 Design Ex. 1)',
        'source': 'docs/DOEE Stormwater Management Guidebook January 2020.pdf, Appendix A §A.3',
        'module': 'summary_calculator/src/calc.mjs',
        'function': 'swrvVolume',
        'args': [
            {'impVeh': 30000, 'impNonVeh': 0, 'comp': 2000, 'natural': 8000, 'bmp': 0},
            1.2,
        ],
        'expected': 2900,
        'atol': 1,
    },
    {
        'name': '1150 50th Pl NE MSI SWRv (DOEE Training Presentation 02 Ex. 1)',
        'source': 'DOEE Training Presentation 02 "SWRv Calculations", Example 1',
        'module': 'summary_calculator/src/calc.mjs',
        'function': 'swrvVolume',
        'args': [
            {'impVeh': 37250, 'impNonVeh': 0, 'comp': 0, 'natural': 0, 'bmp': 0},
            0.8,
        ],
        'expected': 2359,
        'atol': 1,
    },
    # Example 3 is a two-call sum; handled by a dedicated non-parametric test below.
    # TR-16 Exhibit 2-7A tabulates runoff depths to two decimal places. Our
    # JS uses the closed-form SCS equation. The two agree to within ~0.015″
    # for CNs ≥ 55 at P=1.7″, with the largest divergence at low CNs where
    # table rounding dominates (CN 61: JS 0.026, table 0.04). Tolerance set
    # to ±0.02 — catches real drift of ≥0.02″ while absorbing known
    # closed-form vs. two-decimal-table rounding noise.
    {
        'name': 'TR-16 Exhibit 2-7A runoff depth, CN=98, P=1.7',
        'source': 'NRCS TR-16 Exhibit 2-7A (CN 98 row), also Stantec p.2 for P=1.7',
        'module': 'summary_calculator/src/calc.mjs',
        'function': 'tr55RunoffDepth',
        'args': [1.7, 98],
        'expected': 1.48,
        'atol': 0.02,
    },
    {
        'name': 'TR-16 Exhibit 2-7A runoff depth, CN=74, P=1.7',
        'source': 'NRCS TR-16 Exhibit 2-7A (CN 74 row)',
        'module': 'summary_calculator/src/calc.mjs',
        'function': 'tr55RunoffDepth',
        'args': [1.7, 74],
        'expected': 0.21,
        'atol': 0.02,
    },
    {
        'name': 'TR-16 Exhibit 2-7A runoff depth, CN=70, P=1.7',
        'source': 'NRCS TR-16 Exhibit 2-7A (CN 70 row)',
        'module': 'summary_calculator/src/calc.mjs',
        'function': 'tr55RunoffDepth',
        'args': [1.7, 70],
        'expected': 0.14,
        'atol': 0.02,
    },
    {
        'name': 'TR-16 Exhibit 2-7A runoff depth, CN=61, P=1.7',
        'source': 'NRCS TR-16 Exhibit 2-7A (CN 61 row)',
        'module': 'summary_calculator/src/calc.mjs',
        'function': 'tr55RunoffDepth',
        'args': [1.7, 61],
        'expected': 0.04,
        'atol': 0.02,
    },
    {
        'name': 'Rock Creek Trail predevelopment EISA TR-55 volume',
        'source': 'Stantec hand-calc, docs/manual_guidance/EISA 438 sample comps.pdf p.3',
        'module': 'summary_calculator/src/calc.mjs',
        'function': 'tr55TotalVolumeCf',
        'args': [
            [
                [104523, 'Impervious Vehicular',   'C'],
                [56686,  'Compacted (Open Space)', 'B'],
                [151163, 'Compacted (Open Space)', 'C'],
                [100728, 'Natural (Woods)',        'C'],
            ],
            1.7,
        ],
        # Stantec's total is computed from Exhibit 2-7A table lookups (rounded
        # to 0.01″ per CN). Our JS uses the closed-form SCS equation. The
        # per-row deltas accumulate to ~30 cf on this 404,100-sf drainage
        # area. ±50 cf still catches real drift (e.g., an Rv/CN typo would
        # shift any single row by hundreds of cf).
        'expected': 16901,
        'atol': 50,
    },
    {
        'name': 'Rock Creek Trail proposed-condition EISA TR-55 volume',
        'source': 'Stantec hand-calc, docs/manual_guidance/EISA 438 sample comps.pdf p.4',
        'module': 'summary_calculator/src/calc.mjs',
        'function': 'tr55TotalVolumeCf',
        'args': [
            [
                [190243, 'Impervious Vehicular',   'C'],
                [73905,  'Compacted (Open Space)', 'B'],
                [197029, 'Compacted (Open Space)', 'C'],
            ],
            1.7,
        ],
        # Same table-vs-closed-form divergence as the pre case.
        'expected': 27159,
        'atol': 50,
    },
    {
        'name': 'Anacostia Offices Bioretention Sv (Guidebook App A §A.3 Step 5.2)',
        'source': 'docs/DOEE Stormwater Management Guidebook January 2020.pdf, Appendix A §A.3 Step 5.2',
        'module': 'summary_calculator/src/calc.mjs',
        'function': 'bioSizingSv',
        # saBot, saTop, saPondTop, dMedia, nMedia, dGravel, nGravel, dPond
        # saPondTop = 2·SA_avg − SA_top = 2·907 − 1000 = 814
        'args': [814, 1000, 814, 1.5, 0.25, 0.75, 0.40, 0.5],
        'expected': 1003,
        'atol': 2,
    },
]


def _run_node(module_rel: str, function: str, args: list) -> float:
    """Spawn Node 20+ and run the named export. Returns a scalar."""
    # Node ESM: dynamic import of a relative .mjs; extract .value if it's a trace object.
    rel = module_rel.replace('\\', '/')
    script = (
        f"import('./{rel}').then(m => {{"
        f"  const r = m.{function}(...{json.dumps(args)});"
        f"  const scalar = (typeof r === 'object' && r !== null && 'value' in r) ? r.value : r;"
        f"  process.stdout.write(JSON.stringify(scalar));"
        f"}}).catch(e => {{ process.stderr.write(e && e.stack || String(e)); process.exit(1); }});"
    )
    result = subprocess.run(
        ['node', '--input-type=module', '-e', script],
        cwd=str(REPO_ROOT), capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Node error:\n{result.stderr}")
    out = result.stdout.strip()
    if not out:
        raise RuntimeError(f"Node returned empty output. stderr={result.stderr}")
    return json.loads(out)


@pytest.mark.parametrize('case', HAND_CALCS, ids=lambda c: c['name'])
def test_calc_mjs_matches_hand_calc(case):
    got = _run_node(case['module'], case['function'], case['args'])
    assert got is not None, f"{case['name']}: Node returned null"
    delta = abs(got - case['expected'])
    assert delta <= case['atol'], (
        f"{case['name']}:\n"
        f"  JS produced = {got}\n"
        f"  DOEE hand   = {case['expected']} (±{case['atol']})\n"
        f"  delta       = {delta}\n"
        f"  source      = {case['source']}"
    )


def test_calc_mjs_1207_h_st_mixed_mld_msi_swrv():
    """DOEE Training Presentation 02 Example 2: 1207 H St NE — split calc.

    The project triggers MSI on the renovated 4,225 sf (P=0.8) and MLD on the
    new 18,995 sf (P=1.2); DOEE's workflow sums the two sub-SWRvs.
    Expected combined total: 2,072 cf (±1).
    """
    v_msi = _run_node(
        'summary_calculator/src/calc.mjs',
        'swrvVolume',
        [{'impVeh': 4225, 'impNonVeh': 0, 'comp': 0, 'natural': 0, 'bmp': 0}, 0.8],
    )
    v_mld = _run_node(
        'summary_calculator/src/calc.mjs',
        'swrvVolume',
        [{'impVeh': 18995, 'impNonVeh': 0, 'comp': 0, 'natural': 0, 'bmp': 0}, 1.2],
    )
    total = v_msi + v_mld
    delta = abs(total - 2072)
    assert delta <= 1, (
        f"1207 H St NE mixed MSI+MLD SWRv:\n"
        f"  MSI leg = {v_msi}\n"
        f"  MLD leg = {v_mld}\n"
        f"  sum     = {total} (expected 2,072 ±1)\n"
        f"  source  = DOEE Training Presentation 02 Example 2"
    )
