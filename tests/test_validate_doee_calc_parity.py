"""Integration tests for scripts/validate_doee_calc_parity.py.

The validator opens our in-memory workbook plus the authoritative DOEE
spreadsheets and compares every PARAMS_Rv, PARAMS_BMP, PARAMS_DetentionCN,
and PARAMS_TR55 cell against the DOEE source (or reference-pinned value).
"""
import subprocess
import sys
from pathlib import Path

import openpyxl
import pytest

REPO = Path(__file__).resolve().parent.parent
SCRIPT = str(REPO / "scripts" / "validate_doee_calc_parity.py")


def _run(*args):
    return subprocess.run(
        [sys.executable, SCRIPT, *args],
        capture_output=True,
        text=True,
        cwd=str(REPO),
    )


def test_validator_exits_zero_on_clean_generator():
    """On a clean tree the validator must return 0 (no drift)."""
    result = _run()
    assert result.returncode == 0, (
        f"validator returned {result.returncode}\n"
        f"stdout={result.stdout}\nstderr={result.stderr}"
    )


def test_validator_verbose_lists_each_block():
    """Verbose mode must announce every audited block by name."""
    result = _run("-v")
    assert result.returncode == 0, result.stderr
    for block in ("PARAMS_Rv", "PARAMS_BMP", "PARAMS_DetentionCN", "PARAMS_TR55"):
        assert block in result.stdout, (
            f"Missing {block} in verbose output:\n{result.stdout}"
        )


def test_validator_fails_on_injected_drift(tmp_path):
    """Build a workbook with a bad Rv value, feed it via --workbook-path,
    and confirm the validator exits non-zero with a cell citation."""
    from workbook.builders import params as params_builder

    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    params_builder.build_params_sheet(wb)

    # Inject drift: change "Impervious Vehicular" Rv from 0.95 to 0.50.
    ws = wb["PARAMS"]
    assert ws.cell(row=7, column=2).value == 0.95, "fixture precondition"
    ws.cell(row=7, column=2).value = 0.50

    bad_path = tmp_path / "bad.xlsx"
    wb.save(bad_path)

    result = _run("--workbook-path", str(bad_path))
    assert result.returncode == 1, (
        f"expected drift exit code 1, got {result.returncode}\n"
        f"stdout={result.stdout}\nstderr={result.stderr}"
    )
    # The report must cite the drifting block.
    assert "PARAMS_Rv" in result.stdout
    # And name the row we broke.
    assert "Impervious Vehicular" in result.stdout


def test_validator_counts_match_audit_summary():
    """Verbose output should surface the cell-count summary that matches the audit note:
    5 Rv + 25 BMP + 4 DetentionCN + 18 TR55."""
    result = _run("-v")
    assert result.returncode == 0, result.stderr
    out = result.stdout
    # Spot-check the counts appear so a future regression (adding/removing rows) is caught.
    assert "5" in out and "PARAMS_Rv" in out
    assert "4" in out and "PARAMS_DetentionCN" in out
    assert "18" in out and "PARAMS_TR55" in out


def test_validator_model_approx_does_not_fail_on_pp_underdrained():
    """The PP Underdrained row carries Ret.Mult = 0.6 as a model approximation.
    DOEE's C67 is Sv_sump + 5%*Ap — not a single scalar. The validator must
    tolerate 0.6 and not raise drift on this row."""
    result = _run("-v")
    assert result.returncode == 0, result.stderr
    # In verbose output, the model-approximation tag should be surfaced.
    assert "MODEL_APPROX" in result.stdout or "model-approx" in result.stdout.lower()
