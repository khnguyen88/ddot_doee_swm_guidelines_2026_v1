"""Build the PROJECT sheet — project header + named ranges."""
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


FIELDS = [
    (3,  "Project Name",                       "PROJECT_Name",       None),
    (4,  "Project Number",                     "PROJECT_Number",     None),
    (5,  "MS4 / CSS",                          "PROJECT_MS4",        '"MS4,CSS"'),
    (6,  "In AWDZ?",                           "PROJECT_AWDZ",       '"Yes,No"'),
    (7,  "DOEE Plan Review No.",               "PROJECT_DOEEReview", None),
    (8,  "Total LOD Area (SF)",                "PROJECT_TotalLOD",   None),
    (9,  "95th Percentile Storm Depth (in)",   "PROJECT_Rainfall",   None),
    (10, "Trigger Type",                       "PROJECT_Trigger",    '"MLD,MSI,PROW"'),
    (11, "EISA Section 438 Applies?",          "PROJECT_EISA",       '"Yes,No"'),
]


def build_project_sheet(wb: Workbook) -> None:
    ws = wb.create_sheet("PROJECT")
    ws.sheet_view.showGridLines = False

    styles.cw(ws, 1, 40)
    styles.cw(ws, 2, 32)

    styles.hdr(ws, 1, 1, "PROJECT — Project Header (enter once)",
               styles.BH, span=2)
    ws.row_dimensions[1].height = 24

    for row, label, _name, dv_formula in FIELDS:
        styles.lbl(ws, row, 1, label, styles.GRY, bold=True)
        default = 1.7 if row == 9 else None
        styles.inp(ws, row, 2, default)
        if row == 9:
            ws.cell(row=row, column=2).number_format = "0.0"
        if dv_formula:
            dv = DataValidation(type="list", formula1=dv_formula,
                                allow_blank=True, showDropDown=False)
            ws.add_data_validation(dv)
            dv.sqref = f"B{row}"

    for row, _label, name, _dv in FIELDS:
        wb.defined_names.add(DefinedName(name, attr_text=f"'PROJECT'!$B${row}"))
