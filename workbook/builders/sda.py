"""Build SDA sheets — one for existing conditions, one for proposed."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


LAND_USES_EXISTING = [
    "Impervious Vehicular",
    "Impervious Non-Vehicular",
    "Compacted (Open Space)",
    "Natural (Woods)",
]

LAND_USES_PROPOSED = LAND_USES_EXISTING + ["BMP"]

HEADERS = [
    "SDA_ID", "In PROW?", "Land Use", "HSG",
    "Area Within LOD (SF)", "Area Outside LOD (SF)",
    "Rv", "Rainfall (in)",
    "SWRv Within (CF)", "SWRv Outside (CF)",
]

N_SUMMARY_ROWS = 10


def _list_dv(formula1: str) -> DataValidation:
    return DataValidation(
        type="list", formula1=formula1, allow_blank=True,
        showErrorMessage=True, errorTitle="Invalid entry",
        error="Pick a value from the dropdown list.")


def _build_data_rows(ws, data_start: int, data_end: int) -> None:
    for r in range(data_start, data_end + 1):
        for c in range(1, 7):  # A-F are user inputs
            styles.inp(ws, r, c)
        styles.calc_c(ws, r, 7, f'=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")')
        styles.calc_c(ws, r, 8, "=PROJECT_Rainfall_Retention")
        styles.calc_c(ws, r, 9,  f"=IFERROR(E{r}*G{r}*H{r}/12,0)")
        styles.calc_c(ws, r, 10, f"=IFERROR(F{r}*G{r}*H{r}/12,0)")


def _add_dropdowns(ws, data_start: int, data_end: int, land_uses: list[str]) -> None:
    dv_prow = _list_dv('"Yes,No"')
    ws.add_data_validation(dv_prow)
    dv_prow.sqref = f"B{data_start}:B{data_end}"

    dv_lu = _list_dv('"' + ",".join(land_uses) + '"')
    ws.add_data_validation(dv_lu)
    dv_lu.sqref = f"C{data_start}:C{data_end}"

    dv_hsg = _list_dv('"A,B,C,D"')
    ws.add_data_validation(dv_hsg)
    dv_hsg.sqref = f"D{data_start}:D{data_end}"


def build_sda_existing_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("SDA_Existing")
    ws.sheet_view.showGridLines = False

    widths = [12, 10, 24, 8, 14, 14, 8, 11, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "SDA_Existing — Existing Site Drainage Areas (one row per SDA × Land Use × HSG)",
               styles.BH, span=10)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    _build_data_rows(ws, data_start, data_end)
    _add_dropdowns(ws, data_start, data_end, LAND_USES_EXISTING)

    # Summary block.
    summary_header_row = data_end + 3   # e.g. 56
    styles.hdr(ws, summary_header_row, 1,
               "SDA_Existing Summary (SUMIFS aggregation per SDA_ID)",
               styles.BH, span=10)
    sum_hdrs = ["SDA_ID", "Imp Total (SF)", "Comp Total (SF)",
                "Nat Total (SF)", "Pre Total Within (SF)"]
    sum_row = summary_header_row + 1    # 57
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1        # 58
    sum_data_end = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        styles.lbl(ws, r, 1, f"SDA-{i+1}", styles.BL, bold=True)
        # Imp = Impervious Vehicular + Non-Vehicular SUMIFS on E (within LOD)
        imp = (
            f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Vehicular")'
            f'+SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Non-Vehicular")'
        )
        styles.calc_c(ws, r, 2, imp)
        for col, lu in [(3, "Compacted (Open Space)"), (4, "Natural (Woods)")]:
            f = (
                f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
                f'$C${data_start}:$C${data_end},"{lu}")'
            )
            styles.calc_c(ws, r, col, f)
        styles.calc_c(ws, r, 5, f"=B{r}+C{r}+D{r}")

    styles.apply_top_divider(ws, summary_header_row, 1, 10)
    styles.apply_bottom_divider(ws, sum_data_end, 1, 5)


def build_sda_proposed_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("SDA_Proposed")
    ws.sheet_view.showGridLines = False

    widths = [12, 10, 24, 8, 14, 14, 8, 11, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "SDA_Proposed — Proposed Site Drainage Areas (one row per SDA × Land Use × HSG)",
               styles.BH, span=10)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    _build_data_rows(ws, data_start, data_end)
    _add_dropdowns(ws, data_start, data_end, LAND_USES_PROPOSED)

    # Summary block (8 columns, including BMP + SWRv Required + Area Match).
    summary_header_row = data_end + 3    # 56
    styles.hdr(ws, summary_header_row, 1,
               "SDA_Proposed Summary (SUMIFS aggregation per SDA_ID)",
               styles.BH, span=10)
    sum_hdrs = [
        "SDA_ID", "Imp Total (SF)", "Comp Total (SF)",
        "Nat Total (SF)", "BMP Total (SF)",
        "Post Total Within (SF)", "SWRv Required (CF)", "Area Match?",
    ]
    sum_row = summary_header_row + 1     # 57
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1         # 58
    sum_data_end = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        styles.lbl(ws, r, 1, f"SDA-{i+1}", styles.BL, bold=True)

        imp = (
            f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Vehicular")'
            f'+SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Non-Vehicular")'
        )
        styles.calc_c(ws, r, 2, imp)
        for col, lu in [(3, "Compacted (Open Space)"), (4, "Natural (Woods)"), (5, "BMP")]:
            f = (
                f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
                f'$C${data_start}:$C${data_end},"{lu}")'
            )
            styles.calc_c(ws, r, col, f)

        styles.calc_c(ws, r, 6, f"=B{r}+C{r}+D{r}+E{r}")
        swrv_req = (
            f'=SUMIFS($I${data_start}:$I${data_end},'
            f'$A${data_start}:$A${data_end},A{r})'
        )
        styles.calc_c(ws, r, 7, swrv_req)

        # Area Match? — cross-sheet to SDA_Existing's "Pre Total Within (SF)"
        # at the same summary row index (col E on Existing summary).
        area_match = (
            f'=IF(ABS(F{r}-'
            f"'SDA_Existing'!E{r})<=1,\"OK\",\"⚠ MISMATCH\")"
        )
        styles.calc_c(ws, r, 8, area_match)

    wb.defined_names.add(DefinedName(
        "SDA_IDs",
        attr_text=f"'SDA_Proposed'!$A${sum_data_start}:$A${sum_data_end}",
    ))

    styles.apply_top_divider(ws, summary_header_row, 1, 10)
    styles.apply_bottom_divider(ws, sum_data_end, 1, 8)
