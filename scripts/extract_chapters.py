"""
extract_chapters.py
Splits a PDF into per-chapter markdown files.

Usage:
    python scripts/extract_chapters.py ddot
    python scripts/extract_chapters.py doee
    python scripts/extract_chapters.py all
"""

import re
import sys
from pathlib import Path

import pypdf

ROOT = Path(__file__).parent.parent
DOCS = ROOT / "docs"
OUT_ROOT = ROOT / "summary" / "chapters"

# ---------------------------------------------------------------------------
# Document configs — explicit (slug, first_pdf_page) breakpoints.
# PDF page numbers were verified by probing actual page content.
# Each entry covers pages from its start up to (but not including) the next.
# ---------------------------------------------------------------------------

CONFIGS = {
    "ddot": {
        "pdf": DOCS / "2014-0421-DDOT Green Infrastructure Standards.pdf",
        "out_dir": OUT_ROOT / "ddot_gi",
        "title": "DDOT Green Infrastructure Standards (2014)",
        "source_rel": "docs/2014-0421-DDOT Green Infrastructure Standards.pdf",
        # (slug, first_pdf_page)
        "breaks": [
            ("00_front_matter",                    1),
            ("01_supplement_design_engineering",  12),
            ("02_supplement_standard_drawings",   43),
            ("03_supplement_standard_specs",     143),
            ("04_plant_list",                    160),
            ("05_maintenance_schedules",         193),
        ],
    },
    "doee": {
        "pdf": DOCS / "DOEE Stormwater Management Guidebook January 2020.pdf",
        "out_dir": OUT_ROOT / "doee_guidebook",
        "title": "DOEE Stormwater Management Guidebook (January 2020)",
        "source_rel": "docs/DOEE Stormwater Management Guidebook January 2020.pdf",
        "breaks": [
            ("00_front_matter",                  1),
            ("ch01_introduction",               27),
            ("ch02_minimum_control_req",        33),
            ("ch03_bmp_specifications",         57),
            ("ch04_selecting_locating_bmps",   291),
            ("ch05_administration",            305),
            ("ch06_offsite_retention",         355),
            ("ch07_stormwater_retention_credits", 361),
            ("appendix_a_compliance_calcs",    377),
            ("appendix_b_mep_prow",            417),
            ("appendix_c_practicable_process", 435),
            ("appendix_d_offsite_forms",       441),
            ("appendix_e_src_forms",           449),
            ("appendix_f_difficult_sites",     461),
            ("appendix_g_conveyance_design",   465),
            ("appendix_h_flow_control",        475),
            ("appendix_i_hydrology_methods",   477),
            ("appendix_j_rooftop_storage",     513),
            ("appendix_k_soil_compost",        517),
            ("appendix_l_bmp_maintenance",     523),
            ("appendix_m_bmp_inspection",      543),
            ("appendix_n_rainwater_treatment", 567),
            ("appendix_o_land_cover",          583),
            ("appendix_p_geotechnical",        587),
            ("appendix_q_stormwater_hotspots", 595),
            ("appendix_r_pollution_prevention",623),
            ("appendix_s_ipm",                 625),
            ("appendix_t_proprietary_practices",631),
            ("appendix_u_sand_filter_example", 637),
            ("appendix_v_bioretention_media",  645),
            ("appendix_w_sda_bmp_diagrams",    661),
            ("appendix_x_swmp_checklist",      697),
            ("appendix_y_definitions",         703),
        ],
    },
}

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

def clean_text(raw: str) -> str:
    lines = []
    for line in raw.splitlines():
        line = line.rstrip()
        if re.match(r"^\s*[•\s]*\d{0,4}\s*$", line):
            continue
        lines.append(line)
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def build_chapters(config: dict) -> list[dict]:
    reader = pypdf.PdfReader(str(config["pdf"]))
    total = len(reader.pages)
    breaks = config["breaks"]
    print(f"  Reading {total} pages from {config['pdf'].name} ...")

    # Build index: page_num (1-based) → slug
    page_to_slug: dict[int, str] = {}
    for i, (slug, start) in enumerate(breaks):
        end = breaks[i + 1][1] if i + 1 < len(breaks) else total + 1
        for p in range(start, end):
            page_to_slug[p] = slug

    # Group pages by slug in order
    chapter_order: list[str] = []
    chapters: dict[str, dict] = {}
    for pg_idx in range(total):
        pg_num = pg_idx + 1
        slug = page_to_slug.get(pg_num, breaks[-1][0])
        raw = reader.pages[pg_idx].extract_text() or ""
        text = clean_text(raw)
        if slug not in chapters:
            chapter_order.append(slug)
            chapters[slug] = {"slug": slug, "pages": [], "page_nums": []}
        chapters[slug]["pages"].append(text)
        chapters[slug]["page_nums"].append(pg_num)

    return [chapters[s] for s in chapter_order]


def chapter_to_markdown(chapter: dict, doc_config: dict) -> str:
    slug = chapter["slug"]
    pnums = chapter["page_nums"]
    page_range = f"{pnums[0]}–{pnums[-1]}" if len(pnums) > 1 else str(pnums[0])
    title_raw = slug.replace("_", " ").title()

    lines = [
        f"# {title_raw}",
        "",
        f"**Source:** `{doc_config['source_rel']}`  ",
        f"**Pages:** {page_range} (PDF page numbers)  ",
        f"**Parent document:** {doc_config['title']}",
        "",
        "---",
        "",
    ]
    body = "\n\n".join(p for p in chapter["pages"] if p.strip())
    lines.append(body)
    return "\n".join(lines)


def write_chapters(config_key: str) -> None:
    config = CONFIGS[config_key]
    out_dir: Path = config["out_dir"]
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nProcessing: {config['title']}")
    chapters = build_chapters(config)

    index_rows = []
    for ch in chapters:
        md = chapter_to_markdown(ch, config)
        filename = f"{ch['slug']}.md"
        filepath = out_dir / filename
        filepath.write_text(md, encoding="utf-8")
        pnums = ch["page_nums"]
        page_range = f"{pnums[0]}–{pnums[-1]}" if len(pnums) > 1 else str(pnums[0])
        size_kb = round(len(md.encode()) / 1024, 1)
        print(f"  {filename:60s}  pages {page_range:10s}  {size_kb:6.1f} KB")
        index_rows.append((ch["slug"], filename, page_range, size_kb))

    index_lines = [
        f"# Chapter Index — {config['title']}",
        "",
        f"**Source:** `{config['source_rel']}`  ",
        f"**Generated:** 2026-10-13",
        "",
        "| Slug | File | Pages (PDF) | Size |",
        "|------|------|-------------|------|",
    ]
    for slug, fname, pr, kb in index_rows:
        index_lines.append(f"| `{slug}` | [{fname}]({fname}) | {pr} | {kb} KB |")

    (out_dir / "INDEX.md").write_text("\n".join(index_lines) + "\n", encoding="utf-8")
    print(f"  Index -> {out_dir / 'INDEX.md'}")


def main():
    target = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    if target == "all":
        keys = list(CONFIGS.keys())
    elif target in CONFIGS:
        keys = [target]
    else:
        print(f"Unknown target '{target}'. Valid: {list(CONFIGS.keys())} or 'all'")
        sys.exit(1)
    for key in keys:
        write_chapters(key)
    print("\nDone.")


if __name__ == "__main__":
    main()
