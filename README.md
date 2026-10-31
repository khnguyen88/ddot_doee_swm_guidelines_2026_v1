# ddot_doee_swm_guidelines_2026_v1

Reference documents and summaries for DC stormwater management guidelines (DOEE/DDOT), compiled for the 2026 project cycle.

## 🌐 Live apps (GitHub Pages)

Open any of the three apps directly in a browser — no install, works offline once loaded:

| App | Live link | What it does |
|---|---|---|
| **Summary Calculator** | [📄 Open](https://khnguyen88.github.io/ddot_doee_swm_guidelines_2026_v1/summary-calculator.html) | Loads a filled template → produces a print-ready DOEE submission deck |
| **Populator** | [📝 Open](https://khnguyen88.github.io/ddot_doee_swm_guidelines_2026_v1/populator.html) | Loads a filled template → populates all official DOEE/DDOT submission workbooks |
| **Education** | [🎓 Open](https://khnguyen88.github.io/ddot_doee_swm_guidelines_2026_v1/education.html) | Pedagogical walkthrough with step-by-step arithmetic for every page (2 bundled demos: Minnesota Ave + Multi-Use Trail/EISA 438) |

Landing page with all three + reference downloads: [`khnguyen88.github.io/ddot_doee_swm_guidelines_2026_v1`](https://khnguyen88.github.io/ddot_doee_swm_guidelines_2026_v1/)

## Getting Started

Three artifacts cover the full SWMP compliance workflow — a project workbook plus two offline webapps. **No install needed to use them.**

### 1. Compliance Template — `SW_Required_Provided_DOEE_EISA438.xlsx`

The master project workbook. Fill in project info, drainage areas, BMPs, and land cover; formulas handle the rest.

- **Blank:** [`SW_Required_Provided_DOEE_EISA438.xlsx`](SW_Required_Provided_DOEE_EISA438.xlsx)
- **Filled examples:**
  - [`SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`](SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx) — DDOT PROW streetscape (10 SDAs, DOEE MLD, mixed BMPs)
  - [`SW_Required_Provided_DOEE_EISA438_SAMPLE_Trail.xlsx`](SW_Required_Provided_DOEE_EISA438_SAMPLE_Trail.xlsx) — Multi-Use Trail retrofit (1 SDA mixed-HSG, EISA 438 applies)

**Open the blank in Excel.** It has 13 sheets:

| Group | Sheets | What to do |
|---|---|---|
| **Project header** | `PROJECT` | Fill in project name/number, LOD area, rainfall (default 1.7"), trigger (MLD/MSI/PROW), and EISA §438 applicability |
| **Reference** | `PARAMS` | Don't edit — Rv coefficients, CN table, detention storm depths |
| **Land cover inputs** | `SDA`, `CDA` | Enter one row per drainage area × land use × HSG. Both sheets carry **Pre** and **Post** area columns (Within + Outside LOD). SDA and CDA summary blocks flag `⚠ MISMATCH` if pre-area and post-area totals disagree |
| **BMP inputs** | `BMP` | Enter one row per BMP (name, parent SDA/CDA, type, dimensions). Ksat and max-credit auto-fill from CDA land cover |
| **Auto-calculated outputs** (don't edit) | `CORRECT_MEP_SUMMARY`, `EISA_DIRECT`, `EISA_TR55`, `DOEE_SDA`, `DOEE_BMP_DATA`, `DOEE_DETENTION` (SDA-keyed), `DOEE_DETENTION_BMP` (CDA-keyed, per BMP), `DOEE_COMPLIANCE` | Mirrors of the DOEE compliance calc sheets. All formulas auto-update from your SDA/CDA/BMP entries |

The two detention sheets carry a note on row 2 reminding you that CN composites and runoff depths use Within-LOD land cover per DOEE convention — project-specific exceptions (offsite inflow, retrofit along existing ROW) require manual adjustment.

### 2. Summary Calculator — `summary_calculator/summary-calculator.html`

Reads the filled template and produces letter-format printable pages for DOEE submission.

**To use:**
1. Open [`summary_calculator/summary-calculator.html`](summary_calculator/summary-calculator.html) by double-clicking (any modern browser, works offline from `file://`)
2. Click the dropzone, select your filled `SW_Required_Provided_DOEE_EISA438.xlsx`
3. The sidebar lists each page — click to preview
4. Click **Print** (or Ctrl/Cmd+P) → each page is sized for US Letter at 0.5" margins

Pages generated: Cover, Site DA Land Cover, Site SWRv Required, SDA/CDA Summary (with Pre + Post land cover columns), one page per BMP, MEP Summary (DDOT 4-step), EISA §438 Direct Determination, Detention Summary, and Site Compliance Roll-up.

### 3. Populator — `populator/summary-populator.html`

Reads the filled template and auto-populates the five official DOEE/DDOT submission workbooks. Preserves charts, VBA macros, cell protection, and formatting via surgical XML edits.

**To use:**
1. Open [`populator/summary-populator.html`](populator/summary-populator.html) by double-clicking (works offline from `file://`)
2. Upload your filled template
3. (Optional) Override any bundled DOEE blank with a newer version if DOEE has released one
4. Check the DDOT MEP phases you want populated (30% / 65% / 90%)
5. Click **Populate** → download individual files, or **Download all as ZIP**

Targets filled:

| Workbook | Behavior |
|---|---|
| General Retention Compliance Calculator | Full — project header + per-SDA + per-BMP |
| DDOT MEP Worksheet | Full — user-selected phases |
| SWDB PROW Import Template | Full — Drainage Areas + BMPs sheets (`.xlsx` with sheet protection; written at XML level) |
| SWMP-BMP Calc Spreadsheet (`.xlsm`) | **One output file per BMP** (fan-out). Each clone of the DOEE blank gets only its one BMP's cells populated on its type-specific sheet (3.5 PP / 3.6 Bio / 3.9 O-2 Dry Swale / 3.14 Trees). VBA preserved per clone |
| Rainwater Harvesting Calculator | Skipped unless the template has an RWH BMP |

### Rebuilding the template or webapps (developers only)

```bash
# Install Python deps
pip install -r requirements.txt

# Rebuild the blank template + both samples
python -m workbook
python -m workbook.sample                 # Minnesota Ave
python -m workbook.sample_trail           # Multi-Use Trail (EISA 438)

# Sync education engines (byte-identical calc/aggregate/parse from summary_calculator)
bash scripts/sync-education-engines.sh

# Rebuild the three webapp dists
node summary_calculator/build.js
node populator/build.js
node education/build.js

# Run tests
pytest tests/                                                  # workbook builders
cd summary_calculator && node --test tests/*.test.mjs && cd ..
cd populator          && node --test tests/**/*.test.mjs && cd ..
cd education          && node --test tests/*.test.mjs && cd ..
```

End users never need to run any of the above — just open the HTML files.

## Reference Documents

| Document | Description | Local | Online |
|---|---|---|---|
| DOEE Stormwater Management Guidebook (Jan 2020) | Primary design guidebook — BMP specs, SWRv calculations, retention/detention requirements | [PDF](docs/DOEE%20Stormwater%20Management%20Guidebook%20January%202020.pdf) | [doee.dc.gov](https://doee.dc.gov/swguidebook) |
| 21 DCMR Chapter 5 (Nov 2025) | DC Municipal Regulations governing stormwater management | [PDF](docs/21%20DCMR%20Chapter%205_11_14_2025.pdf) | [doee.dc.gov](https://doee.dc.gov/swregs) · [elaws](http://dcrules.elaws.us/dcmr/t21_ch21-5) |
| Stormwater Management Plan 2022 | DOEE Stormwater Management Plan, 2022 update | [PDF](docs/Stormwater%20Management%20Plan%202022.pdf) | [doee.dc.gov](https://doee.dc.gov/sites/default/files/dc/sites/ddoe/release_content/attachments/DRAFT%20Stormwater%20Management%20Plan%202022%20-%20Final%20Draft.pdf) |
| Final SWMP (Jan 2016) | Earlier Stormwater Management Plan for historical reference | [PDF](docs/Final%20SWMP%201-15-16.pdf) | [doee.dc.gov](https://doee.dc.gov/sites/default/files/dc/sites/ddoe/publication/attachments/Final%20SWMP%201-15-16.pdf) |
| 2014 DDOT Green Infrastructure Standards | DDOT design standards for green infrastructure in the public right-of-way | [PDF](docs/2014-Final%20DDOT%20Green%20Infrastructure%20Standards.pdf) | [ddot.dc.gov](https://ddot.dc.gov/sites/default/files/dc/sites/ddot/publication/attachments/2014-Final%20DDOT%20Green%20Infrastructure%20Standards.pdf) |
| EISA Section 438 Technical Guidance (Dec 2009) | EPA guidance on stormwater runoff requirements for federal projects — 95th percentile storm, GI/LID tools, 9 case studies | [PDF](docs/eisa-438.pdf) | [epa.gov](https://www.epa.gov/sites/default/files/2015-10/documents/eisa_section_438_technical_guidance.pdf) |

## DOEE Training Presentations

Full training series: [doee.dc.gov/publication/training-documents-stormwater-management-rule-and-guidebook](https://doee.dc.gov/publication/training-documents-stormwater-management-rule-and-guidebook)

| # | Topic | Local | Slides | Video | Summary |
|---|---|---|---|---|---|
| 01 | Stormwater Management Requirements | [PPTX](docs/doee%20presentation/01_Stormwater%20Management%20Requirements.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r341/e6/v0) | [YouTube](https://www.youtube.com/watch?v=2mVToCh2Yis) | [Summary](summary/doee_presentation/01_Stormwater_Management_Requirements.md) |
| 02 | SWRv Calculations | [PPTX](docs/doee%20presentation/02_SWRv%20Calculations.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r342/e6/v0) | [YouTube](https://www.youtube.com/watch?v=KSmJJqvisk4) | [Summary](summary/doee_presentation/02_SWRv_Calculations.md) |
| 03 | SDAs & CDAs | [PPTX](docs/doee%20presentation/03_SDAs%20%26%20CDAs.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r343/e6/v0) | [YouTube](https://www.youtube.com/watch?v=WEZtohhdPVI) | [Summary](summary/doee_presentation/03_SDAs_and_CDAs.md) |
| 04 | BMP Spec 3.2 — Green Roofs | [PPTX](docs/doee%20presentation/04_BMP%20Specifications_3.2%20Green%20Roofs.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r344/e6/v0) | [YouTube](https://www.youtube.com/watch?v=4nmuVYG8_zs) | [Summary](summary/doee_presentation/04_BMP_Green_Roofs.md) |
| 05 | BMP Spec 3.3 — Rainwater Harvesting | [PPTX](docs/doee%20presentation/05_BMP%20Specifications_3.3%20Rainwater%20Harvesting.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r345/e6/v0) | [YouTube](https://www.youtube.com/watch?v=3MAVuB9BmE0) | [Summary](summary/doee_presentation/05_BMP_Rainwater_Harvesting.md) |
| 06 | BMP Spec 3.4 — Impervious Surface Disconnection | [PPTX](docs/doee%20presentation/06_BMP%20Specifications_3.4%20Impervious%20Surface%20Disconnection.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r346/e6/v0) | [YouTube](https://www.youtube.com/watch?v=NxsBfBJup04) | [Summary](summary/doee_presentation/06_BMP_Impervious_Surface_Disconnection.md) |
| 07 | BMP Spec 3.5 — Permeable Pavement | [PPTX](docs/doee%20presentation/07_BMP%20Specifications_3.5%20Permeable%20Pavement.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r347/e6/v0) | [YouTube](https://www.youtube.com/watch?v=s_cX2s9o32I) | [Summary](summary/doee_presentation/07_BMP_Permeable_Pavement.md) |
| 08 | BMP Spec 3.6 — Bioretention | [PPTX](docs/doee%20presentation/08_BMP%20Specifications_3.6%20Bioretention.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r348/e6/v0) | [YouTube](https://www.youtube.com/watch?v=ejLMVDf_g6w) | [Summary](summary/doee_presentation/08_BMP_Bioretention.md) |
| 09 | BMP Spec — All Others (3.7–3.14) | [PPTX](docs/doee%20presentation/09_BMP%20Specifications_All%20others.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r349/e6/v0) | [YouTube](https://www.youtube.com/watch?v=_3JZwsb9jWY) | [Summary](summary/doee_presentation/09_BMP_All_Others.md) |
| 10 | Detention Requirements | [PPTX](docs/doee%20presentation/10_Detention%20Requirements.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r350/e6/v0) | [YouTube](https://www.youtube.com/watch?v=h80xvYCUzq8) | [Summary](summary/doee_presentation/10_Detention_Requirements.md) |
| 11 | Reconstruction of Existing PROW | [PPTX](docs/doee%20presentation/11_Reconstruction%20of%20Existing%20PROW.pptx) | [Online](https://octo.quickbase.com/up/bjezqk3qc/a/r351/e6/v0) | [YouTube](https://www.youtube.com/watch?v=USlwoC4ULiU) | [Summary](summary/doee_presentation/11_Reconstruction_Existing_PROW.md) |

## DOEE Spreadsheet Calculators

Official DOEE/DDOT calculation tools required for SWMP submissions.

| File | Description | Local | Summary |
|---|---|---|---|
| 2020 General Retention Compliance Calculator | Primary SWMP compliance tool — SWRv by SDA, BMP credits, detention check | [XLSX](docs/doee_spreadsheet_calculators/2020%20General%20Retention%20Compliance%20Calculator%202-5-21.xlsx) | [Summary](summary/doee_spreadsheet_calculators/General_Retention_Compliance_Calculator.md) |
| 2020 SWMP-BMP Calc Spreadsheet | BMP storage volume (Sv) and retention volume (Rv) calculator per BMP type | [XLSM](docs/doee_spreadsheet_calculators/2020%20SWMP-BMP%20Calc%20Spreadsheet%2011-30-2020.xlsm) | [Summary](summary/doee_spreadsheet_calculators/SWMP_BMP_Calc_Spreadsheet.md) |
| 2019 Rainwater Harvesting Storage Volume Calculator | Cistern sizing via 20-year daily demand simulation | [XLSX](docs/doee_spreadsheet_calculators/2019%20Rainwater%20Harvesting%20Storage%20Volume%20Calculator%205-07-26.xlsx) | [Summary](summary/doee_spreadsheet_calculators/Rainwater_Harvesting_Storage_Volume_Calculator.md) |
| DDOT MEP Worksheet | PROW Maximum Extent Practicable documentation — 4-step, 3-phase process | [XLSX](docs/doee_spreadsheet_calculators/DDOT%20MEP%20Worksheet%20012019.xlsx) | [Summary](summary/doee_spreadsheet_calculators/DDOT_MEP_Worksheet.md) |
| SWDB Template for PROW Information (July 2025) | DOEE Stormwater Database submission form for PROW projects | [XLSX](docs/doee_spreadsheet_calculators/SWDB%20Template%20for%20PROW%20Information_SWMP%20July%202025%20-%20final%20locked.xlsx) | [Summary](summary/doee_spreadsheet_calculators/SWDB_Template_PROW.md) |

### 4. Education — `education/education.html`

Pedagogical walkthrough of the full DOEE / EISA 438 compliance process. Every page shows the equation, the substitution with actual project values, and the arithmetic result. Bundled demos for both samples (Minnesota Ave + Multi-Use Trail).

**To use:** open [`education/education.html`](education/education.html), click a demo button (or load your own filled template). The deck covers Compliance Landscape, Project Triggers, SWRv per SDA, each BMP sizing, MEP, **EISA 438 in all three methods** (Direct, TR-55, TR-16 Exhibit 2-7A lookup), Three-Method Comparison with "Why they diverge" narrative, Detention, Site Compliance, plus the full TR-16 exhibit as an appendix.

## Tools

| Tool | Description | Local | Live |
|---|---|---|---|
| SWM Summary Calculator | Letter-format printable calculation summaries from a filled DOEE EISA 438 template | [HTML](summary_calculator/summary-calculator.html) | [Pages](https://khnguyen88.github.io/ddot_doee_swm_guidelines_2026_v1/summary-calculator.html) |
| SWM DOEE Populator | Fills DOEE/DDOT submission workbooks from a filled template, preserving charts, macros, and protection | [HTML](populator/summary-populator.html) | [Pages](https://khnguyen88.github.io/ddot_doee_swm_guidelines_2026_v1/populator.html) |
| SWM Education | Pedagogical walkthrough with step-by-step arithmetic for every compliance calculation | [HTML](education/education.html) | [Pages](https://khnguyen88.github.io/ddot_doee_swm_guidelines_2026_v1/education.html) |

## Analysis & Working Documents

| Document | Description |
|---|---|
| [SWM Sizing from Docs](summary/SWM_sizing_from_docs.md) | Sizing requirements extracted from reference documents |
| [SWM Sizing from Research](summary/SWM_sizing_from_research.md) | Sizing requirements from supplemental research |
| [SWM Design Example](summary/SWM_design_example.md) | Design example with scenario calculations and BMP comparison |
| [MEP PROW — Existing vs Proposed](summary/MEP_PROW_existing_vs_proposed.md) | Comparison of existing vs proposed conditions for PROW MEP |
| [MSI — Major Substantial Improvement](summary/MSI_Major_Substantial_Improvement.md) | Definition, cost/size trigger thresholds, SWRv requirements, and comparison to MLD — cited from 21 DCMR § 599 and Guidebook |
| [EISA Section 438 Summary](summary/eisa-438.md) | Summary of federal stormwater requirements under EISA §438, with DC-specific worked calculation example (1.7" 95th %ile, 2.5-acre federal redevelopment) |
