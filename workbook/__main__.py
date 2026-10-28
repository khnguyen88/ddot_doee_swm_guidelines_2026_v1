"""Entry point for the SWM compliance workbook generator.

Builds a 12-sheet DOEE + EISA Section 438 compliance workbook at the project
root. Run with:

    python -m workbook

The output path can be overridden via the SWM_WORKBOOK_OUT environment
variable or by calling `main(output_path)` from another script.
"""
from __future__ import annotations
import os
from pathlib import Path

import openpyxl

from workbook.builders import (
    params, project, sda, cda, bmp, correct_mep_summary,
    eisa_direct, eisa_tr55, doee,
)
from workbook.formats import apply_number_formats


# Project root = parent of the `workbook/` package.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = PROJECT_ROOT / "SW_Required_Provided_DOEE_EISA438.xlsx"


def build_workbook() -> openpyxl.Workbook:
    """Construct the full 12-sheet workbook and return it (unsaved)."""
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # Order of construction = order shown in Excel.
    project.build_project_sheet(wb)
    params.build_params_sheet(wb)
    sda.build_sda_sheet(wb, n_rows=50)
    cda.build_cda_sheet(wb, n_rows=50)
    bmp.build_bmp_sheet(wb, n_rows=50)
    correct_mep_summary.build_correct_mep_summary(wb)
    eisa_direct.build_eisa_direct(wb)
    eisa_tr55.build_eisa_tr55(wb)
    doee.build_doee_sda(wb)
    doee.build_doee_bmp_data(wb)
    doee.build_doee_detention(wb)
    doee.build_doee_compliance(wb)

    # Final pass — apply number formats across all sheets.
    apply_number_formats(wb)

    return wb


def main(output_path: Path | None = None) -> Path:
    """Build the workbook and save it. Returns the written path."""
    if output_path is None:
        env_path = os.environ.get("SWM_WORKBOOK_OUT")
        output_path = Path(env_path) if env_path else DEFAULT_OUTPUT
    wb = build_workbook()
    wb.save(output_path)
    return output_path


if __name__ == "__main__":
    out = main()
    print(f"Saved: {out}")
