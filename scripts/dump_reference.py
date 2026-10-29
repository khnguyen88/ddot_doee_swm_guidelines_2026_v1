"""Dump reference calculation values for the parity test.

Reads the Minnesota Ave sample workbook, re-runs every calculation through
`workbook.calculations`, and writes the results to the fixtures JSON file.

Run from repo root:

    python scripts/dump_reference.py
"""
from __future__ import annotations
import json
from pathlib import Path

import openpyxl

from workbook import calculations as calc


REPO_ROOT = Path(__file__).resolve().parent.parent
FIXTURE_XLSX = REPO_ROOT / "summary_calculator" / "tests" / "fixtures" / "minnesota-ave.xlsx"
FIXTURE_JSON = REPO_ROOT / "summary_calculator" / "tests" / "fixtures" / "minnesota-ave.reference.json"

# Detention storm depths (match PARAMS_Detention).
P_2YR = 3.14
P_15YR = 5.23

# Detention CNs (match PARAMS_DetentionCN).
DETENTION_CN = {"Natural": 70, "Compacted": 74, "Impervious": 98, "BMP": 98}


def _read_sdas(ws):
    """Return list of SDA dicts from the SDA sheet (one dict per data row)."""
    rows = []
    for r in range(4, ws.max_row + 1):
        sda_id = ws.cell(r, 1).value
        if not sda_id:
            break
        rows.append({
            "sda_id": sda_id,
            "land_use": ws.cell(r, 3).value,
            "hsg": ws.cell(r, 4).value or "D",
            "pre_in": ws.cell(r, 5).value or 0,
            "post_in": ws.cell(r, 7).value or 0,
        })
    return rows


def _swrv_per_sda(sdas, rainfall_in):
    """Compute SWRv_req per SDA (post-condition within LOD)."""
    totals = {}
    for row in sdas:
        area = row["post_in"]
        lu = row["land_use"]
        rv = calc.RV.get(lu, 0.0)
        totals.setdefault(row["sda_id"], 0.0)
        totals[row["sda_id"]] += area * rv * rainfall_in / 12.0
    return totals


def _composite_cn(rows_for_sda, condition):
    """Area-weighted CN using DOEE detention CNs."""
    totals = {"Natural": 0, "Compacted": 0, "Impervious": 0, "BMP": 0}
    area_key = "pre_in" if condition == "pre" else "post_in"
    for row in rows_for_sda:
        lu = row["land_use"]
        a = row[area_key]
        if lu == "Natural (Woods)":
            totals["Natural"] += a
        elif lu == "Compacted (Open Space)":
            totals["Compacted"] += a
        elif lu in ("Impervious Vehicular", "Impervious Non-Vehicular"):
            totals["Impervious"] += a
        elif lu == "BMP":
            totals["BMP"] += a
    total_area = sum(totals.values())
    if total_area == 0:
        return 0.0
    num = sum(totals[k] * DETENTION_CN[k] for k in totals)
    return num / total_area


def _scs_runoff(P, cn):
    if cn <= 0:
        return 0.0
    S = 1000.0 / cn - 10.0
    if P <= 0.2 * S:
        return 0.0
    return (P - 0.2 * S) ** 2 / (P + 0.8 * S)


def main() -> None:
    wb = openpyxl.load_workbook(FIXTURE_XLSX, data_only=False)
    project_ws = wb["PROJECT"]
    rainfall_in = project_ws.cell(9, 2).value

    sdas = _read_sdas(wb["SDA"])

    # Per-SDA SWRv required (post, within LOD).
    swrv_req = _swrv_per_sda(sdas, rainfall_in)

    # Site-level SWRv (sum of per-SDA, informational).
    site_swrv = sum(swrv_req.values())

    # EISA Direct — site-wide pre/post volumes.
    pre_rows = [(r["pre_in"], r["land_use"], r["hsg"]) for r in sdas]
    post_rows = [(r["post_in"], r["land_use"], r["hsg"]) for r in sdas]
    eisa_pre = calc.eisa_direct_total_volume_cf(pre_rows, 1.7)
    eisa_post = calc.eisa_direct_total_volume_cf(post_rows, 1.7)

    # Detention per SDA.
    by_sda = {}
    for row in sdas:
        by_sda.setdefault(row["sda_id"], []).append(row)
    detention = {}
    for sda_id, rows in by_sda.items():
        pre_cn = _composite_cn(rows, "pre")
        post_cn = _composite_cn(rows, "post")
        detention[sda_id] = {
            "pre_cn": pre_cn,
            "post_cn": post_cn,
            "p2_pre_q": _scs_runoff(P_2YR, pre_cn),
            "p2_post_q": _scs_runoff(P_2YR, post_cn),
            "p15_pre_q": _scs_runoff(P_15YR, pre_cn),
            "p15_post_q": _scs_runoff(P_15YR, post_cn),
        }

    out = {
        "source": "minnesota-ave.xlsx",
        "rainfall_in": rainfall_in,
        "swrv_req_cf_per_sda": {k: round(v, 4) for k, v in swrv_req.items()},
        "swrv_req_cf_site_total": round(site_swrv, 4),
        "eisa_direct": {
            "P_in": 1.7,
            "pre_cf": round(eisa_pre, 4),
            "post_cf": round(eisa_post, 4),
        },
        "detention_per_sda": {
            sda_id: {k: round(v, 4) for k, v in d.items()}
            for sda_id, d in detention.items()
        },
        "horton_loss_B_in": round(calc.HORTON_INFIL_LOSS_B, 6),
        "horton_loss_C_in": round(calc.HORTON_INFIL_LOSS_C, 6),
    }

    FIXTURE_JSON.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE_JSON.write_text(json.dumps(out, indent=2))
    print(f"Wrote {FIXTURE_JSON} ({len(json.dumps(out))} bytes)")


if __name__ == "__main__":
    main()
