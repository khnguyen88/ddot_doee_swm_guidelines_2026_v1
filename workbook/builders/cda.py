"""Build the CDA sheet — contributing drainage areas with pre/post land cover.

Mirrors the SDA sheet's area-column pattern: Pre Within/Outside LOD + Post
Within/Outside LOD. Downstream calcs (BMP sizing, DOEE_BMP_DATA, MEP summary)
use the Post columns. Pre columns are retained for future record-keeping
exports and audit history.
"""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles
from workbook.builders.sda import LAND_USES


HEADERS = [
    "CDA_ID", "SDA_ID", "Land Use", "HSG",
    "Pre Within LOD (SF)", "Pre Outside LOD (SF)",
    "Post Within LOD (SF)", "Post Outside LOD (SF)",
    "Rv",
    "Pre CDA SWRv Within (CF)", "Pre CDA SWRv Outside (CF)",
    "Post CDA SWRv Within (CF)", "Post CDA SWRv Outside (CF)",
]

N_SUMMARY_ROWS = 10


def build_cda_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("CDA")
    ws.sheet_view.showGridLines = False

    widths = [14, 12, 24, 8, 14, 14, 14, 14, 8, 14, 14, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "CDA — Contributing Drainage Areas (one row per CDA × Land Use × HSG)",
               styles.BH, span=13)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    for r in range(data_start, data_end + 1):
        # Inputs: A..H (CDA_ID, SDA_ID, Land Use, HSG, Pre In, Pre Out, Post In, Post Out).
        for c in range(1, 9):
            styles.inp(ws, r, c)
        # I: Rv VLOOKUP.
        styles.calc_c(ws, r, 9, f'=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")')
        # J-M: SWRv Within/Outside for Pre (E,F) and Post (G,H).
        styles.calc_c(ws, r, 10, f"=IFERROR(E{r}*I{r}*PROJECT_Rainfall/12,0)")
        styles.calc_c(ws, r, 11, f"=IFERROR(F{r}*I{r}*PROJECT_Rainfall/12,0)")
        styles.calc_c(ws, r, 12, f"=IFERROR(G{r}*I{r}*PROJECT_Rainfall/12,0)")
        styles.calc_c(ws, r, 13, f"=IFERROR(H{r}*I{r}*PROJECT_Rainfall/12,0)")

    dv_sda = DataValidation(type="list", formula1="=SDA_IDs",
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_sda)
    dv_sda.sqref = f"B{data_start}:B{data_end}"

    dv_lu = DataValidation(type="list", formula1='"' + ",".join(LAND_USES) + '"',
                           allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_lu)
    dv_lu.sqref = f"C{data_start}:C{data_end}"

    dv_hsg = DataValidation(type="list", formula1='"A,B,C,D"',
                            allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_hsg)
    dv_hsg.sqref = f"D{data_start}:D{data_end}"

    # ── Summary block ──
    # Row layout (with n_rows=50, data_end=53):
    #   data_end + 2  (55) = banner title (merged, BH)
    #   data_end + 3  (56) = sub-headers (BS, individual cols)
    #   data_end + 4  (57) = blank spacer
    #   data_end + 5  (58) = first data row (CDA-1) → sum_data_start
    #   ...            (67) = last data row (CDA-10) → sum_data_end
    sum_banner_row = data_end + 2
    sum_header_row = data_end + 3
    styles.hdr(ws, sum_banner_row, 1,
               "CDA Summary — Max BMP Credit per CDA (DOEE 1.7\" cap)",
               styles.BH, span=13)
    sum_hdrs = [
        "CDA_ID", "SDA_ID",
        "Total CDA Within LOD (SF) (post)",
        "Max BMP Credit (CF)",
        "Pre Total Within LOD (SF)",
        "Area Match?",
    ]
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_header_row, i, h, styles.BS)

    sum_data_start = sum_header_row + 2
    sum_data_end = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        styles.lbl(ws, r, 1, f"CDA-{i+1}", styles.BL, bold=True)
        styles.calc_c(ws, r, 2,
                      f'=IFERROR(INDEX($B${data_start}:$B${data_end},'
                      f'MATCH(A{r},$A${data_start}:$A${data_end},0)),"")')
        # Col C: Post Within LOD aggregate — SUMIFS on col G (not E).
        styles.calc_c(ws, r, 3,
                      f'=SUMIFS($G${data_start}:$G${data_end},'
                      f'$A${data_start}:$A${data_end},A{r})')
        # Col D: Max BMP Credit.
        styles.calc_c(ws, r, 4, f"=C{r}*1.7/12")
        # Col E: Pre Within LOD aggregate — SUMIFS on col E.
        styles.calc_c(ws, r, 5,
                      f'=SUMIFS($E${data_start}:$E${data_end},'
                      f'$A${data_start}:$A${data_end},A{r})')
        # Col F: Area match — pre vs post Within LOD, ±1 SF tolerance.
        styles.calc_c(ws, r, 6, f'=IF(ABS(E{r}-C{r})<=1,"OK","⚠ MISMATCH")')

    wb.defined_names.add(DefinedName(
        "CDA_IDs",
        attr_text=f"'CDA'!$A${sum_data_start}:$A${sum_data_end}",
    ))

    styles.apply_top_divider(ws, sum_banner_row, 1, 13)
    styles.apply_bottom_divider(ws, sum_data_end, 1, 6)
