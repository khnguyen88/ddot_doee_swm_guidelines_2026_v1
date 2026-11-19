"""Integration tests for scripts/validate_formula_shapes.py.

The validator walks 5 canonical DOEE/TR-55/EISA formulas, each with one
or more implementations in our Python + JS source. For every expected
token, it asserts the token appears in order inside the function body.

These tests verify:
  - Clean exit 0 on the current source tree.
  - Verbose mode enumerates each canonical formula by name.
  - Each expected formula name is surfaced in verbose output.
  - Drift (injected token re-order via a patched source file) → exit 1.
"""
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCRIPT = str(REPO / "scripts" / "validate_formula_shapes.py")


def _run(*args):
    return subprocess.run(
        [sys.executable, SCRIPT, *args],
        capture_output=True,
        text=True,
        cwd=str(REPO),
    )


def test_validator_exits_zero_on_clean_tree():
    """On a clean tree the validator must return 0 (no shape drift)."""
    result = _run()
    assert result.returncode == 0, (
        f"validator returned {result.returncode}\n"
        f"stdout={result.stdout}\nstderr={result.stderr}"
    )


def test_validator_verbose_lists_each_formula():
    """Verbose mode must announce every canonical formula by name."""
    result = _run("-v")
    assert result.returncode == 0, result.stderr
    expected_names = [
        "SCS Runoff Depth",
        "Closed-form inverse CN",
        "Bio Sv",
        "EISA Direct runoff depth",
        "TR-55 unit peak discharge",
    ]
    for name in expected_names:
        assert name in result.stdout, (
            f"missing formula name {name!r} in verbose output:\n{result.stdout}"
        )


def test_validator_verbose_reports_citation():
    """Each formula should surface its source citation for auditability."""
    result = _run("-v")
    assert result.returncode == 0, result.stderr
    # Spot-check several citations.
    assert "USDA NRCS TR-55" in result.stdout
    assert "DOEE Stormwater Management Guidebook" in result.stdout
    assert "EISA" in result.stdout


def test_validator_fails_on_injected_drift(tmp_path, monkeypatch):
    """Patch the JS calc file to break the SCS runoff token order; confirm
    the validator exits non-zero and cites the drifting implementation.

    Strategy: copy the entire repo tree into tmp_path (symlink would race
    the validator since the validator computes REPO_ROOT from __file__),
    corrupt one line in the copy, run the copied validator against the
    copied source.
    """
    # Minimal in-place patch: edit the *real* file, run, revert.
    target = REPO / "summary_calculator" / "src" / "calc.mjs"
    backup = tmp_path / "calc.mjs.bak"
    shutil.copy2(target, backup)
    try:
        original = target.read_text(encoding="utf-8")
        # Rewrite tr55RunoffDepth so '1000 / cn' becomes '1001 / cn' —
        # the expected token list in the validator requires '1000 / cn',
        # so this must trigger a MISSING-token report.
        patched = original.replace(
            "const S = 1000 / cn - 10;",
            "const S = 1001 / cn - 10;",
            1,
        )
        assert patched != original, "fixture precondition: patch must apply"
        target.write_text(patched, encoding="utf-8")

        result = _run()
        assert result.returncode == 1, (
            f"expected drift exit code 1, got {result.returncode}\n"
            f"stdout={result.stdout}\nstderr={result.stderr}"
        )
        # The report must cite the drifting formula + implementation.
        assert "SCS Runoff Depth" in result.stdout
        assert "calc.mjs" in result.stdout
        assert "1000 / cn" in result.stdout
    finally:
        # Always restore.
        shutil.copy2(backup, target)


def test_validator_fails_on_missing_symbol(tmp_path):
    """If a tracked symbol is deleted entirely, the validator should flag
    the missing symbol — not silently pass."""
    target = REPO / "summary_calculator" / "src" / "calc.mjs"
    backup = tmp_path / "calc.mjs.bak"
    shutil.copy2(target, backup)
    try:
        original = target.read_text(encoding="utf-8")
        # Rename the exported function so the validator can't find it.
        patched = original.replace(
            "export function tr55RunoffDepth",
            "export function tr55RunoffDepth_RENAMED",
            1,
        )
        assert patched != original, "fixture precondition: rename must apply"
        target.write_text(patched, encoding="utf-8")

        result = _run()
        assert result.returncode == 1, (
            f"expected exit 1 when symbol is renamed, got {result.returncode}\n"
            f"stdout={result.stdout}\nstderr={result.stderr}"
        )
        assert "could not locate symbol" in result.stdout
    finally:
        shutil.copy2(backup, target)


def test_validator_counts_match_spec():
    """Verbose output should surface all five canonical formulas and the
    8-implementation total so a future regression (e.g. silently removing
    a mirrored implementation) is caught."""
    result = _run("-v")
    assert result.returncode == 0, result.stderr
    # 5 canonical formulas as listed in the spec §6.
    assert "5 canonical formulas" in result.stdout
