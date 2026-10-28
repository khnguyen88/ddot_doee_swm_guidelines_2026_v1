"""Entry point for SW_Required_Provided_DOEE_EISA438.xlsx generator.

Builds a 12-sheet DOEE + EISA Section 438 compliance workbook. See
docs/superpowers/plans/2026-10-28-swm-workbook-redesign/README.md.

Run:
    python generate_workbook.py
"""
from pathlib import Path
import openpyxl

from workbook.builders import (
    params, project, sda, cda, bmp, correct_mep_summary,
    eisa_direct, eisa_tr55, doee,
)


OUTPUT = Path(__file__).parent / "SW_Required_Provided_DOEE_EISA438.xlsx"


def build_workbook() -> openpyxl.Workbook:
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

    return wb


def main() -> Path:
    wb = build_workbook()
    wb.save(OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    out = main()
    print(f"Saved: {out}")
