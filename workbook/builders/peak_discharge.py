"""Build PEAK_DISCHARGE_SDA and PEAK_DISCHARGE_CDA sheets.

TR-55 Graphical Peak Discharge Method, SCS Type II rainfall distribution,
NOAA Atlas 14 DC rainfall.  Qp = qu × Am × Q × Fp (TR-55 Eq 4-1); Fp = 1.0.

qu via TR-55 Appendix F log-polynomial equation:
    log10(qu) = C0 + C1·log10(Tc) + C2·log10(Tc)²

Coefficients (C0,C1,C2) depend on Ia/P and are stored in PARAMS_TR55
(6 Ia/P bins: 0.10, 0.30, 0.35, 0.40, 0.45, 0.50).  Linear interpolation
between adjacent bins.

For Ia/P below the first bin (0.10), MATCH(...,1) returns #N/A, so the
IFERROR wrapper sets qu = 0.  The summary_calculator intentionally clamps
to the 0.10 curve instead, per TR-55 Exhibit 4-II (physically correct for
low Ia/P).  The DOEE spreadsheet remains the authoritative compliance
source; the summary_calculator result is a cross-check.
"""
from openpyxl import Workbook

from workbook import styles


SDA_FIRST = 4
SDA_LAST = 103
CDA_FIRST = 4
CDA_LAST = 103
BMP_FIRST = 6
BMP_LAST = 55

_TR55_N_BINS = 6

# Summary lives on Area_Summary (post Area_Summary refactor).
from workbook.builders import area_summary as _as
_AREA_SHEET = "Area_Summary"
_SDA_SUMMARY_FIRST = _as.SDA_FIRST_DATA_ROW   # 5
_CDA_SUMMARY_FIRST = _as.CDA_FIRST_DATA_ROW   # 28


def _qu_formula(tc_ref: str, iap_ref: str) -> str:
    """Return Excel formula for qu (csm/in) given Tc(hr) and Ia/P cell refs.

    Linearly interpolates (C0, C1, C2) between PARAMS_TR55 bracketing bins.
    MATCH type=1 gives the largest Ia/P ≤ our value; clamp to [1, N-1] so
    hi_idx = lo_idx+1 is always valid.
    """
    lo_idx = (
        f"MIN(MAX(MATCH({iap_ref},INDEX(PARAMS_TR55,0,1),1),1),{_TR55_N_BINS - 1})"
    )
    hi_idx = f"({lo_idx}+1)"
    iap_lo = f"INDEX(PARAMS_TR55,{lo_idx},1)"
    iap_hi = f"INDEX(PARAMS_TR55,{hi_idx},1)"
    frac = f"(({iap_ref}-{iap_lo})/({iap_hi}-{iap_lo}))"

    def coef(col: int) -> str:
        return (f"(INDEX(PARAMS_TR55,{lo_idx},{col})"
                f"+{frac}*(INDEX(PARAMS_TR55,{hi_idx},{col})"
                f"-INDEX(PARAMS_TR55,{lo_idx},{col})))")

    c0, c1, c2 = coef(2), coef(3), coef(4)
    return (f"IFERROR("
            f"10^({c0}+{c1}*LOG10({tc_ref})+{c2}*(LOG10({tc_ref}))^2)"
            f",0)")


def _scs_q(p_ref: str, s_ref: str) -> str:
    return (f"IF({p_ref}>0.2*{s_ref},"
            f"({p_ref}-0.2*{s_ref})^2/({p_ref}+0.8*{s_ref}),0)")


_HEADERS = [
    "SDA_ID",                     # A
    "DA total (SF)",               # B
    "DA (mi²)",                    # C
    "Pre CN",                      # D
    "Post CN",                     # E
    "S_pre (in)",                  # F
    "S_post (in)",                 # G
    "Tc (hr)",                     # H
    "2-yr Rain P₂ (in)",           # I
    "Ia/P 2-yr Pre",               # J
    "Ia/P 2-yr Post",              # K
    "qu 2-yr Pre (csm/in)",        # L
    "qu 2-yr Post (csm/in)",       # M
    "Q 2-yr Pre (in)",             # N
    "Q 2-yr Post (in)",            # O
    "Qp 2-yr Pre (cfs)",           # P
    "Qp 2-yr Post (cfs)",          # Q
    "15-yr Rain P₁₅ (in)",         # R
    "Ia/P 15-yr Pre",              # S
    "Ia/P 15-yr Post",             # T
    "qu 15-yr Pre",                # U
    "qu 15-yr Post",               # V
    "Q 15-yr Pre (in)",            # W
    "Q 15-yr Post (in)",           # X
    "Qp 15-yr Pre (cfs)",          # Y
    "Qp 15-yr Post (cfs)",         # Z
]


def _area_sumifs(area_col: str, id_cell: str, lu: str,
                 sheet: str, first: int, last: int) -> str:
    """SUMIFS fragment aggregating area_col by id (SDA or CDA, matched on col A)
    and land-use filter (col C)."""
    return (
        f"SUMIFS('{sheet}'!${area_col}${first}:${area_col}${last},"
        f"'{sheet}'!$A${first}:$A${last},{id_cell},"
        f"'{sheet}'!$C${first}:$C${last},\"{lu}\")"
    )


def _cn_composite(id_cell: str, sheet: str, first: int, last: int) -> str:
    """Area-weighted CN composite for the given SDA/CDA sheet."""
    nat  = _area_sumifs("E", id_cell, "Natural (Woods)", sheet, first, last)
    comp = _area_sumifs("E", id_cell, "Compacted (Open Space)", sheet, first, last)
    imp  = (_area_sumifs("E", id_cell, "Impervious Vehicular", sheet, first, last)
            + "+" + _area_sumifs("E", id_cell, "Impervious Non-Vehicular", sheet, first, last))
    bmp_ = _area_sumifs("E", id_cell, "BMP", sheet, first, last)
    total = f"({nat}+{comp}+{imp}+{bmp_})"
    num = (f"({nat}*INDEX(PARAMS_DetentionCN,1,2)"
           f"+{comp}*INDEX(PARAMS_DetentionCN,2,2)"
           f"+({imp})*INDEX(PARAMS_DetentionCN,3,2)"
           f"+{bmp_}*INDEX(PARAMS_DetentionCN,4,2))")
    return f"IFERROR({num}/{total},0)"


def _write_peak_row(ws, r: int, *,
                    id_ref_formula: str,
                    da_sf_formula: str,
                    pre_cn_formula: str,
                    post_cn_formula: str,
                    tc_vlookup_range: str) -> None:
    """Populate columns A-Z of a peak-discharge data row."""
    # A: ID
    styles.calc_c(ws, r, 1, f"={id_ref_formula}")

    # B: DA total SF
    styles.calc_c(ws, r, 2, da_sf_formula)

    # C: DA mi² = B / 27878400
    styles.calc_c(ws, r, 3, f"=IFERROR(B{r}/27878400,0)")

    # D-E: Pre CN, Post CN
    styles.calc_c(ws, r, 4, pre_cn_formula)
    styles.calc_c(ws, r, 5, post_cn_formula)

    # F-G: S_pre, S_post
    styles.calc_c(ws, r, 6, f"=IFERROR(1000/D{r}-10,0)")
    styles.calc_c(ws, r, 7, f"=IFERROR(1000/E{r}-10,0)")

    # H: Tc from TC_PATH (fallback 0.1 hr)
    styles.calc_c(ws, r, 8,
        f"=IFERROR(VLOOKUP(A{r},{tc_vlookup_range},20,FALSE),0.1)")

    def write_storm(rain_col: int, params_row: int,
                     iap_pre_col: int, iap_post_col: int,
                     qu_pre_col: int, qu_post_col: int,
                     q_pre_col: int, q_post_col: int,
                     qp_pre_col: int, qp_post_col: int) -> None:
        # Rain (PARAMS_Detention row params_row col 2)
        styles.calc_c(ws, r, rain_col, f"=INDEX(PARAMS_Detention,{params_row},2)")
        rain_ref = f"{styles.cl(rain_col)}{r}"

        # Ia/P = 0.2 * S / P
        styles.calc_c(ws, r, iap_pre_col,
            f"=IFERROR(0.2*F{r}/{rain_ref},0)")
        styles.calc_c(ws, r, iap_post_col,
            f"=IFERROR(0.2*G{r}/{rain_ref},0)")

        # qu via TR-55 log-poly
        styles.calc_c(ws, r, qu_pre_col,
            f"={_qu_formula(f'H{r}', f'{styles.cl(iap_pre_col)}{r}')}")
        styles.calc_c(ws, r, qu_post_col,
            f"={_qu_formula(f'H{r}', f'{styles.cl(iap_post_col)}{r}')}")

        # Q (SCS runoff)
        styles.calc_c(ws, r, q_pre_col,
            f"=IFERROR({_scs_q(rain_ref, f'F{r}')},0)")
        styles.calc_c(ws, r, q_post_col,
            f"=IFERROR({_scs_q(rain_ref, f'G{r}')},0)")

        # Qp = qu * Am * Q (Fp = 1)
        styles.calc_c(ws, r, qp_pre_col,
            f"=IFERROR({styles.cl(qu_pre_col)}{r}*C{r}*{styles.cl(q_pre_col)}{r},0)")
        styles.calc_c(ws, r, qp_post_col,
            f"=IFERROR({styles.cl(qu_post_col)}{r}*C{r}*{styles.cl(q_post_col)}{r},0)")

    # 2-yr block (I-Q)
    write_storm(9, 1, 10, 11, 12, 13, 14, 15, 16, 17)
    # 15-yr block (R-Z)
    write_storm(18, 2, 19, 20, 21, 22, 23, 24, 25, 26)


def _write_peak_sheet(ws, headers: list[str], title: str, note: str) -> None:
    """Common setup (widths/title/note/headers) for both peak sheets."""
    widths = [12, 12, 12, 10, 10, 12, 12, 10,
              12, 12, 12, 14, 14, 12, 12, 14, 14,
              12, 12, 12, 14, 14, 12, 12, 14, 14]
    for i, w in enumerate(widths, 1):
        styles.cw(ws, i, w)

    styles.hdr(ws, 1, 1, title, styles.BH, span=26)
    ws.row_dimensions[1].height = 24

    styles.lbl(ws, 2, 1, note, styles.WARN, span=26)
    ws.row_dimensions[2].height = 32

    for i, h in enumerate(headers, 1):
        styles.hdr(ws, 3, i, h, styles.BS)
    ws.row_dimensions[3].height = 42


def build_peak_discharge_sda(wb: Workbook) -> None:
    ws = wb.create_sheet("PEAK_DISCHARGE_SDA")
    ws.sheet_view.showGridLines = False

    _write_peak_sheet(ws, _HEADERS,
        "PEAK_DISCHARGE_SDA — TR-55 Graphical Method (SCS Type II, NOAA 14)",
        "Qp = qu × Am(mi²) × Q(in) × Fp (TR-55 Eq 4-1). Fp = 1.0. "
        "Tc looked up from TC_PATH by SDA_ID (fallback 0.1 hr).")

    for i in range(10):
        r = 4 + i
        sda_sum_row = _SDA_SUMMARY_FIRST + i
        sda_cell = f"A{r}"

        _write_peak_row(ws, r,
            id_ref_formula=f"'{_AREA_SHEET}'!A{sda_sum_row}",
            da_sf_formula=(
                f"=IFERROR("
                f"{_area_sumifs('E', sda_cell, 'Natural (Woods)', 'SDA_Proposed', SDA_FIRST, SDA_LAST)}"
                f"+{_area_sumifs('E', sda_cell, 'Compacted (Open Space)', 'SDA_Proposed', SDA_FIRST, SDA_LAST)}"
                f"+{_area_sumifs('E', sda_cell, 'Impervious Vehicular', 'SDA_Proposed', SDA_FIRST, SDA_LAST)}"
                f"+{_area_sumifs('E', sda_cell, 'Impervious Non-Vehicular', 'SDA_Proposed', SDA_FIRST, SDA_LAST)}"
                f"+{_area_sumifs('E', sda_cell, 'BMP', 'SDA_Proposed', SDA_FIRST, SDA_LAST)}"
                f",0)"
            ),
            pre_cn_formula=f"={_cn_composite(sda_cell, 'SDA_Existing', SDA_FIRST, SDA_LAST)}",
            post_cn_formula=f"={_cn_composite(sda_cell, 'SDA_Proposed', SDA_FIRST, SDA_LAST)}",
            tc_vlookup_range="'TC_PATH'!$A$4:$T$23",
        )


def build_peak_discharge_cda(wb: Workbook) -> None:
    ws = wb.create_sheet("PEAK_DISCHARGE_CDA")
    ws.sheet_view.showGridLines = False

    cda_headers = list(_HEADERS)
    cda_headers[0] = "CDA_ID"

    _write_peak_sheet(ws, cda_headers,
        "PEAK_DISCHARGE_CDA — TR-55 Graphical Method per CDA",
        "Qp = qu × Am(mi²) × Q(in) × Fp (TR-55 Eq 4-1). Fp = 1.0. "
        "Tc looked up from TC_PATH by CDA_ID (fallback 0.1 hr).")

    for i in range(10):
        r = 4 + i
        cda_sum_row = _CDA_SUMMARY_FIRST + i
        cda_cell = f"A{r}"

        _write_peak_row(ws, r,
            id_ref_formula=f"'{_AREA_SHEET}'!A{cda_sum_row}",
            da_sf_formula=(
                f"=IFERROR("
                f"{_area_sumifs('E', cda_cell, 'Natural (Woods)', 'CDA_Proposed', CDA_FIRST, CDA_LAST)}"
                f"+{_area_sumifs('E', cda_cell, 'Compacted (Open Space)', 'CDA_Proposed', CDA_FIRST, CDA_LAST)}"
                f"+{_area_sumifs('E', cda_cell, 'Impervious Vehicular', 'CDA_Proposed', CDA_FIRST, CDA_LAST)}"
                f"+{_area_sumifs('E', cda_cell, 'Impervious Non-Vehicular', 'CDA_Proposed', CDA_FIRST, CDA_LAST)}"
                f"+{_area_sumifs('E', cda_cell, 'BMP', 'CDA_Proposed', CDA_FIRST, CDA_LAST)}"
                f",0)"
            ),
            pre_cn_formula=f"={_cn_composite(cda_cell, 'CDA_Existing', CDA_FIRST, CDA_LAST)}",
            post_cn_formula=f"={_cn_composite(cda_cell, 'CDA_Proposed', CDA_FIRST, CDA_LAST)}",
            tc_vlookup_range="'TC_PATH'!$A$4:$T$23",
        )
