"""Build the CDA sheet — contributing drainage areas, one per BMP."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles
from workbook.builders.sda import LAND_USES


HEADERS = [
    "CDA_ID", "SDA_ID", "Land Use", "HSG",
    "Within LOD (SF)", "Outside LOD (SF)",
    "Rv", "CDA SWRv Within (CF)", "CDA SWRv Outside (CF)",
]

N_SUMMARY_ROWS = 10


def build_cda_sheet(wb: Workbook, n_rows: int = 50) -> None:
    ws = wb.create_sheet("CDA")
    ws.sheet_view.showGridLines = False

    widths = [14, 12, 24, 8, 14, 14, 8, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
               "CDA — Contributing Drainage Areas (one row per CDA × Land Use × HSG)",
               styles.BH, span=9)
    ws.row_dimensions[1].height = 24

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    for r in range(data_start, data_end + 1):
        for c in range(1, 7):
            styles.inp(ws, r, c)
        styles.calc_c(ws, r, 7, f'=IFERROR(VLOOKUP(C{r},PARAMS_Rv,2,FALSE),"")')
        styles.calc_c(ws, r, 8, f"=IFERROR(E{r}*G{r}*PROJECT_Rainfall/12,0)")
        styles.calc_c(ws, r, 9, f"=IFERROR(F{r}*G{r}*PROJECT_Rainfall/12,0)")

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
    sum_header_row = data_end + 3
    styles.hdr(ws, sum_header_row, 1,
               "CDA Summary — Max BMP Credit per CDA (DOEE 1.7\" cap)",
               styles.BH, span=9)
    sum_hdrs = ["CDA_ID", "SDA_ID", "Total CDA Within LOD (SF)",
                "Max BMP Credit (CF)"]
    sum_row = sum_header_row + 1
    for i, h in enumerate(sum_hdrs, 1):
        styles.hdr(ws, sum_row, i, h, styles.BS)

    sum_data_start = sum_row + 1
    sum_data_end   = sum_data_start + N_SUMMARY_ROWS - 1

    for i in range(N_SUMMARY_ROWS):
        r = sum_data_start + i
        styles.lbl(ws, r, 1, f"CDA-{i+1}", styles.BL, bold=True)
        styles.calc_c(ws, r, 2,
                      f'=IFERROR(INDEX($B${data_start}:$B${data_end},'
                      f'MATCH(A{r},$A${data_start}:$A${data_end},0)),"")')
        styles.calc_c(ws, r, 3,
                      f'=SUMIFS($E${data_start}:$E${data_end},'
                      f'$A${data_start}:$A${data_end},A{r})')
        styles.calc_c(ws, r, 4, f"=C{r}*1.7/12")

    wb.defined_names.add(DefinedName(
        "CDA_IDs",
        attr_text=f"'CDA'!$A${sum_data_start}:$A${sum_data_end}",
    ))

    # Thick separator above summary block + closure line below data.
    styles.apply_top_divider(ws, sum_header_row, 1, 9)
    styles.apply_bottom_divider(ws, sum_data_end, 1, 4)
