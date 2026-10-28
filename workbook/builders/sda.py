"""Build the SDA sheet — relational land-use table with Rv/SWRv formulas."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


LAND_USES = [
    "Impervious Vehicular",
    "Impervious Non-Vehicular",
    "Compacted (Open Space)",
    "Natural (Woods)",
    "BMP",
]

HEADERS = [
    "SDA_ID", "In PROW?", "Land Use", "HSG",
    "Pre Within LOD (SF)", "Pre Outside LOD (SF)",
    "Post Within LOD (SF)", "Post Outside LOD (SF)",
    "Rv", "Rainfall (in)",
    "Pre SWRv Within (CF)", "Pre SWRv Outside (CF)",
    "Post SWRv Within (CF)", "Post SWRv Outside (CF)",
]

N_SUMMARY_ROWS = 10


def build_sda_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("SDA")
    ws.sheet_view.showGridLines = False

    widths = [12, 10, 24, 8, 14, 14, 14, 14, 8, 11, 14, 14, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, "SDA — Site Drainage Areas (one row per SDA × Land Use × HSG)",
               styles.BH, span=14)
    ws.row_dimensions[1].height = 24

    # Header row at row 3.
    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    for r in range(data_start, data_end + 1):
        for c in range(1, 9):
            styles.inp(ws, r, c)
        styles.calc_c(ws, r, 9,  f'=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")')
        styles.calc_c(ws, r, 10, f'=IF(B{r}="Yes",0,PROJECT_Rainfall)')
        styles.calc_c(ws, r, 11, f"=IFERROR(E{r}*I{r}*J{r}/12,0)")
        styles.calc_c(ws, r, 12, f"=IFERROR(F{r}*I{r}*J{r}/12,0)")
        styles.calc_c(ws, r, 13, f"=IFERROR(G{r}*I{r}*J{r}/12,0)")
        styles.calc_c(ws, r, 14, f"=IFERROR(H{r}*I{r}*J{r}/12,0)")

    # Data validations.
    dv_prow = DataValidation(type="list", formula1='"Yes,No"',
                             allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_prow)
    dv_prow.sqref = f"B{data_start}:B{data_end}"

    dv_lu = DataValidation(type="list", formula1='"' + ",".join(LAND_USES) + '"',
                           allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_lu)
    dv_lu.sqref = f"C{data_start}:C{data_end}"

    dv_hsg = DataValidation(type="list", formula1='"A,B,C,D"',
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_hsg)
    dv_hsg.sqref = f"D{data_start}:D{data_end}"

    # ── Summary block ──
    summary_header_row = data_end + 3  # one blank, one spacer, then header
    styles.hdr(ws, summary_header_row, 1,
               "SDA Summary (SUMIFS aggregation per SDA_ID)",
               styles.BH, span=14)

    sum_headers = [
        "SDA_ID",
        "Pre Imp Total (SF)", "Pre Comp Total (SF)",
        "Pre Nat Total (SF)", "Pre BMP Total (SF)",
        "Post Imp Total (SF)", "Post Comp Total (SF)",
        "Post Nat Total (SF)", "Post BMP Total (SF)",
        "Post SWRv Required (CF)",
    ]
    sum_row = summary_header_row + 1
    for i, h in enumerate(sum_headers, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1
    sum_data_end   = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        sda_id = f"SDA-{i+1}"
        styles.lbl(ws, r, 1, sda_id, styles.BL, bold=True)

        imp_pre = (
            f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Vehicular")'
            f'+SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Non-Vehicular")'
        )
        styles.calc_c(ws, r, 2, imp_pre)

        for col, lu in [(3, "Compacted (Open Space)"), (4, "Natural (Woods)"), (5, "BMP")]:
            f = (
                f'=SUMIFS($E${data_start}:$E${data_end},$A${data_start}:$A${data_end},A{r},'
                f'$C${data_start}:$C${data_end},"{lu}")'
            )
            styles.calc_c(ws, r, col, f)

        imp_post = (
            f'=SUMIFS($G${data_start}:$G${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Vehicular")'
            f'+SUMIFS($G${data_start}:$G${data_end},$A${data_start}:$A${data_end},A{r},'
            f'$C${data_start}:$C${data_end},"Impervious Non-Vehicular")'
        )
        styles.calc_c(ws, r, 6, imp_post)

        for col, lu in [(7, "Compacted (Open Space)"), (8, "Natural (Woods)"), (9, "BMP")]:
            f = (
                f'=SUMIFS($G${data_start}:$G${data_end},$A${data_start}:$A${data_end},A{r},'
                f'$C${data_start}:$C${data_end},"{lu}")'
            )
            styles.calc_c(ws, r, col, f)

        swrv_req = (
            f'=SUMIFS($M${data_start}:$M${data_end},'
            f'$A${data_start}:$A${data_end},A{r})'
        )
        styles.calc_c(ws, r, 10, swrv_req)

    # Named range for SDA_IDs (used by CDA/BMP dropdowns).
    wb.defined_names.add(DefinedName(
        "SDA_IDs",
        attr_text=f"'SDA'!$A${sum_data_start}:$A${sum_data_end}",
    ))

    # Thick separator above summary block — visually distinguishes data from summary.
    styles.apply_top_divider(ws, summary_header_row, 1, 14)
    # Thick bottom separator under summary data for closure.
    styles.apply_bottom_divider(ws, sum_data_end, 1, 10)
