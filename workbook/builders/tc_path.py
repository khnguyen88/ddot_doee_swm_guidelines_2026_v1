"""Build the TC_PATH sheet — per-SDA/CDA time of concentration.

User may either enter Tc directly (col C, in minutes) or fill the 4-segment
path (sheet flow + shallow concentrated + 2 channel segments).  A direct
value overrides the computed sum.  Floor: Tc final >= 0.1 hr (6 min) per
TR-55 and DOEE convention.
"""
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation

from workbook import styles


HEADERS = [
    "ID",                        # A
    "Name / Description",        # B
    "Tc direct (min)",           # C
    "Sheet n",                   # D
    "Sheet L (ft, ≤100)",        # E
    "Sheet P₂ (in)",             # F
    "Sheet S (ft/ft)",           # G
    "Tt_sheet (hr)",             # H
    "Shallow surface",           # I
    "Shallow L (ft)",            # J
    "Shallow S (ft/ft)",         # K
    "Tt_shallow (hr)",           # L
    "Channel 1 L (ft)",          # M
    "Channel 1 V (ft/s)",        # N
    "Tt_ch1 (hr)",               # O
    "Channel 2 L (ft)",          # P
    "Channel 2 V (ft/s)",        # Q
    "Tt_ch2 (hr)",               # R
    "Tc computed (hr)",          # S
    "Tc final (hr)",             # T
    "Tc final (min)",            # U
]


def build_tc_path_sheet(wb: Workbook, n_rows: int = 20) -> None:
    ws = wb.create_sheet("TC_PATH")
    ws.sheet_view.showGridLines = False

    widths = [12, 18, 14, 10, 14, 12, 14, 14, 14, 14, 14, 14,
              14, 14, 14, 14, 14, 14, 14, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1,
        "TC_PATH — Time of Concentration by SDA / CDA (TR-55 Method)",
        styles.BH, span=21)
    ws.row_dimensions[1].height = 24

    styles.lbl(ws, 2, 1,
        "Enter Tc directly in col C (minutes) OR fill the segment path "
        "(sheet flow + shallow + 2 channel segments). Direct value wins. "
        "Minimum Tc = 0.1 hr (6 min).",
        styles.WARN, span=21)
    ws.row_dimensions[2].height = 32

    for i, h in enumerate(HEADERS, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 36

    data_start = 4
    data_end = data_start + n_rows - 1

    for r in range(data_start, data_end + 1):
        # USER: A, B, C (direct Tc override)
        styles.inp(ws, r, 1)
        styles.inp(ws, r, 2)
        styles.inp(ws, r, 3)

        # Sheet flow segment — USER
        for c in range(4, 8):   # D, E, F, G
            styles.inp(ws, r, c)

        # H: Tt_sheet = 0.007 * (n*L)^0.8 / (P2^0.5 * S^0.4)
        styles.calc_c(ws, r, 8,
            f'=IFERROR(0.007*((D{r}*E{r})^0.8)/((F{r}^0.5)*(G{r}^0.4)),0)')

        # I: shallow surface — DROPDOWN (data validation applied below)
        styles.inp(ws, r, 9)
        # J, K USER
        styles.inp(ws, r, 10)
        styles.inp(ws, r, 11)

        # L: Tt_shallow = L / (V * 3600), V = 20.3282*sqrt(S) paved,
        #                                     16.1345*sqrt(S) unpaved
        styles.calc_c(ws, r, 12,
            f'=IFERROR('
            f'IF(OR(J{r}="",K{r}="",I{r}=""),0,'
            f'J{r}/(IF(I{r}="paved",20.3282,16.1345)*SQRT(K{r})*3600)'
            f'),0)')

        # Channel 1 USER inputs + Tt_ch1
        styles.inp(ws, r, 13)
        styles.inp(ws, r, 14)
        styles.calc_c(ws, r, 15,
            f'=IFERROR(IF(OR(M{r}="",N{r}="",N{r}=0),0,M{r}/(N{r}*3600)),0)')

        # Channel 2 USER inputs + Tt_ch2
        styles.inp(ws, r, 16)
        styles.inp(ws, r, 17)
        styles.calc_c(ws, r, 18,
            f'=IFERROR(IF(OR(P{r}="",Q{r}="",Q{r}=0),0,P{r}/(Q{r}*3600)),0)')

        # S: Tc computed = H + L + O + R
        styles.calc_c(ws, r, 19,
            f'=IFERROR(H{r}+L{r}+O{r}+R{r},0)')

        # T: Tc final (hr) — direct overrides computed; floor 0.1 hr
        styles.calc_c(ws, r, 20,
            f'=IFERROR(IF(C{r}="",MAX(S{r},0.1),MAX(C{r}/60,0.1)),0.1)')

        # U: Tc final (min) = T * 60
        styles.calc_c(ws, r, 21, f'=T{r}*60')

    # Shallow surface dropdown on col I
    dv_surf = DataValidation(type="list", formula1='"paved,unpaved"',
                              allow_blank=True, showDropDown=False)
    ws.add_data_validation(dv_surf)
    dv_surf.sqref = f"I{data_start}:I{data_end}"
