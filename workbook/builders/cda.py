"""Build CDA sheets — pure-input sheets after the Area_Summary refactor.

Summary rollups + Area Match checks moved to `workbook.builders.area_summary`.
"""
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles
from workbook.builders.sda import (LAND_USES_EXISTING, LAND_USES_PROPOSED,
                                   DEFAULT_N_ROWS)


HEADERS = [
    "CDA_ID", "SDA_ID", "Land Use", "HSG",
    "Area Within LOD (SF)", "Area Outside LOD (SF)",
    "Rv", "Rainfall (in)",
    "SWRv Within (CF)", "SWRv Outside (CF)",
]


def _list_dv(formula1: str) -> DataValidation:
    return DataValidation(
        type="list", formula1=formula1, allow_blank=True,
        showErrorMessage=True, errorTitle="Invalid entry",
        error="Pick a value from the dropdown list.")


def _build_data_rows(ws, data_start: int, data_end: int) -> None:
    for r in range(data_start, data_end + 1):
        for c in range(1, 7):
            styles.inp(ws, r, c)
        styles.calc_c(ws, r, 7, f'=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")')
        styles.calc_c(ws, r, 8, "=PROJECT_Rainfall_Retention")
        styles.calc_c(ws, r, 9,  f"=IFERROR(E{r}*G{r}*H{r}/12,0)")
        styles.calc_c(ws, r, 10, f"=IFERROR(F{r}*G{r}*H{r}/12,0)")


def _add_dropdowns(ws, data_start: int, data_end: int, land_uses: list[str]) -> None:
    dv_sda = _list_dv("=SDA_IDs")
    ws.add_data_validation(dv_sda)
    dv_sda.sqref = f"B{data_start}:B{data_end}"

    dv_lu = _list_dv('"' + ",".join(land_uses) + '"')
    ws.add_data_validation(dv_lu)
    dv_lu.sqref = f"C{data_start}:C{data_end}"

    dv_hsg = _list_dv('"A,B,C,D"')
    ws.add_data_validation(dv_hsg)
    dv_hsg.sqref = f"D{data_start}:D{data_end}"


def build_cda_existing_sheet(wb: Workbook, n_rows: int = DEFAULT_N_ROWS) -> None:
    _build_cda_sheet(wb, "CDA_Existing",
                     "CDA_Existing — Pre-development makeup of contributing "
                     "drainage areas (audit trail — one row per CDA × Land Use × HSG)",
                     LAND_USES_EXISTING, n_rows)


def build_cda_proposed_sheet(wb: Workbook, n_rows: int = DEFAULT_N_ROWS) -> None:
    _build_cda_sheet(wb, "CDA_Proposed",
                     "CDA_Proposed — Proposed contributing drainage areas "
                     "(one row per CDA × Land Use × HSG)",
                     LAND_USES_PROPOSED, n_rows)


def _build_cda_sheet(wb: Workbook, sheet_name: str, banner: str,
                     land_uses: list[str], n_rows: int) -> None:
    ws = wb.create_sheet(sheet_name)
    ws.sheet_view.showGridLines = False

    widths = [14, 12, 24, 8, 14, 14, 8, 11, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, banner, styles.BH, span=10)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    _build_data_rows(ws, data_start, data_end)
    _add_dropdowns(ws, data_start, data_end, land_uses)
    styles.apply_bottom_divider(ws, data_end, 1, 10)
