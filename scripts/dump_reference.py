"""Dump reference calculation values for the parity test.

Reads the Minnesota Ave sample workbook, re-runs every calculation through
`workbook.calculations`, and writes the results to the fixtures JSON file.

The sample uses the split schema: `SDA_Existing` holds pre-development areas
and `SDA_Proposed` holds post-development areas (columns A-J:
A=sdaId, B=inProw, C=landUse, D=hsg, E=areaIn, F=areaOut; G-J are formulas).
The old single `SDA` sheet no longer exists.

Run from repo root:

    python scripts/dump_reference.py
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

import openpyxl

REPO_ROOT = Path(__file__).resolve().parent.parent
# Allow `python scripts/dump_reference.py` to import the workbook package
# without requiring PYTHONPATH to be set.
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from workbook import calculations as calc


FIXTURE_XLSX = REPO_ROOT / "summary_calculator" / "tests" / "fixtures" / "minnesota-ave.xlsx"
FIXTURE_JSON = REPO_ROOT / "summary_calculator" / "tests" / "fixtures" / "minnesota-ave.reference.json"

# SWRv capture depth. This is a calc-logic baseline, NOT the fixture's
# retention target (PROJECT!B9 = 1.2" for this MLD project). parity.test.mjs
# computes SWRv at 1.7" against these reference values, so the dumper must use
# the same depth to keep the reference byte-stable.
RAINFALL_IN = 1.7

# Detention storm depths (match PARAMS_Detention).
P_2YR = 3.14
P_15YR = 5.23

# Detention CNs (match PARAMS_DetentionCN).
DETENTION_CN = {"Natural": 70, "Compacted": 74, "Impervious": 98, "BMP": 98}


def _read_sda_split(ws):
    """Read one split SDA sheet (Existing or Proposed) into area rows.

    Each split sheet carries a single set of areas (the "pre" areas live on
    SDA_Existing and the "post" areas on SDA_Proposed), so return one dict per
    populated row keyed by sda_id with its within-LOD area.

    Scan from row 4 and stop after five consecutive fully-empty input rows
    (columns A-F), matching the JS parser's sentinel. This skips the
    `SDA_Existing Summary (SUMIFS...)` block that sits below the data and has
    formula strings in its value columns.
    """
    rows = []
    seen_data = False
    empty_streak = 0
    for r in range(4, ws.max_row + 1):
        input_vals = [ws.cell(r, c).value for c in range(1, 7)]
        if all(v is None for v in input_vals):
            if seen_data:
                empty_streak += 1
                if empty_streak >= 5:
                    break
            continue
        seen_data = True
        empty_streak = 0
        sda_id = input_vals[0]
        if not sda_id:
            continue
        rows.append({
            "sda_id": sda_id,
            "land_use": input_vals[2],
            "hsg": input_vals[3] or "D",
            "area_in": input_vals[4] or 0,
        })
    return rows


def _swrv_per_sda(rows, rainfall_in):
    """Compute SWRv_req per SDA (post-condition within LOD)."""
    totals = {}
    for row in rows:
        area = row["area_in"]
        rv = calc.RV.get(row["land_use"], 0.0)
        totals.setdefault(row["sda_id"], 0.0)
        totals[row["sda_id"]] += area * rv * rainfall_in / 12.0
    return totals


def _composite_cn(rows):
    """Area-weighted CN using DOEE detention CNs."""
    totals = {"Natural": 0, "Compacted": 0, "Impervious": 0, "BMP": 0}
    for row in rows:
        lu = row["land_use"]
        a = row["area_in"]
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


# TR-55 / SCS CN runoff — delegated to the shared calc module so this dumper
# cannot silently drift from Task 07's parity ground truth.
_scs_runoff = calc.tr55_runoff_depth


def main() -> None:
    wb = openpyxl.load_workbook(FIXTURE_XLSX, data_only=False)

    existing = _read_sda_split(wb["SDA_Existing"])
    proposed = _read_sda_split(wb["SDA_Proposed"])

    # SDA id order: existing-sheet order first, then ids that appear only in
    # the proposed sheet. Matches the pre-split merged-row ordering so the
    # reference JSON stays byte-identical (CI enforces no drift).
    ordered_ids = []
    for row in existing + proposed:
        if row["sda_id"] not in ordered_ids:
            ordered_ids.append(row["sda_id"])

    # Per-SDA SWRv required (post, within LOD).
    swrv_req = {sid: 0.0 for sid in ordered_ids}
    for sid, value in _swrv_per_sda(proposed, RAINFALL_IN).items():
        swrv_req[sid] = value

    # Site-level SWRv (sum of per-SDA, informational).
    site_swrv = sum(swrv_req.values())

    # EISA Direct — site-wide pre/post volumes. Pre areas come from
    # SDA_Existing, post areas from SDA_Proposed.
    pre_rows = [(r["area_in"], r["land_use"], r["hsg"]) for r in existing]
    post_rows = [(r["area_in"], r["land_use"], r["hsg"]) for r in proposed]
    eisa_pre = calc.eisa_direct_total_volume_cf(pre_rows, 1.7)
    eisa_post = calc.eisa_direct_total_volume_cf(post_rows, 1.7)

    # Detention per SDA.
    pre_by_sda = {}
    for row in existing:
        pre_by_sda.setdefault(row["sda_id"], []).append(row)
    post_by_sda = {}
    for row in proposed:
        post_by_sda.setdefault(row["sda_id"], []).append(row)

    detention = {}
    for sda_id in ordered_ids:
        pre_cn = _composite_cn(pre_by_sda.get(sda_id, []))
        post_cn = _composite_cn(post_by_sda.get(sda_id, []))
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
        "rainfall_in": RAINFALL_IN,
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
    FIXTURE_JSON.write_text(json.dumps(out, indent=2) + "\n", newline="\n")
    print(f"Wrote {FIXTURE_JSON} ({FIXTURE_JSON.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
