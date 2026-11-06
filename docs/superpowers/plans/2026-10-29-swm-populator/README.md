# SWM DOEE Populator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone single-file HTML webpage (`populator/summary-populator.html`) that reads the filled DOEE EISA 438 template and populates five official DOEE/DDOT submission workbooks via JSZip + XML surgical edits, preserving charts, macros, protection, and formatting.

**Architecture:** Vanilla ES modules in `populator/src/*.mjs`, concatenated by `build.js` into a single-file dist. Reads XLSX with SheetJS, writes with JSZip + DOMParser surgical edit so charts/VBA/protection ride through unchanged. Opens offline from `file://`.

**Tech Stack:** Vanilla ES modules (no bundler), SheetJS (reused from summary_calculator), JSZip (new vendored), Node 20+ test runner, Playwright (dev-time only), openpyxl (fidelity cross-check in CI).

**Spec:** `docs/superpowers/specs/2026-10-29-swm-populator-design.md`

**Independence from Webpage A:** `src/parse.mjs` is copied from `summary_calculator/src/parse.mjs`, not shared. The two dists ship independently.

---

## File Structure

```
ddot_doee_swm_guidelines_2026_v1/
├── populator/
│   ├── src/
│   │   ├── parse.mjs             # Copy from summary_calculator — XLSX → structured JS object
│   │   ├── xlsx-surgical.mjs     # JSZip + XML DOM primitives: openXlsx, setCell, setCells, saveXlsx
│   │   ├── mappings/
│   │   │   ├── general-retention.mjs
│   │   │   ├── ddot-mep.mjs
│   │   │   ├── swdb-prow.mjs
│   │   │   ├── swmp-bmp-calc.mjs
│   │   │   └── rainwater-harvesting.mjs
│   │   ├── populate.mjs          # Orchestrator: parse → apply mappings → return Blobs
│   │   ├── ui.mjs                # Browser wiring: upload, override, run, download ZIP + individual
│   │   └── styles.css
│   ├── summary-populator-dev.html
│   ├── summary-populator.html    # Dist (single file, ~2 MB with inlined blanks)
│   ├── build.js
│   ├── lib/
│   │   ├── sheetjs-bundle.js     # Reused
│   │   └── jszip.min.js          # New vendored
│   ├── blanks/                   # 5 untouched DOEE/DDOT files
│   │   ├── general-retention.xlsx
│   │   ├── ddot-mep.xlsx
│   │   ├── swdb-prow.xlsx
│   │   ├── swmp-bmp-calc.xlsm
│   │   └── rainwater-harvesting.xlsx
│   ├── package.json
│   ├── README.md
│   └── tests/
│       ├── fixtures/minnesota-ave.xlsx
│       ├── xlsx-surgical.test.mjs
│       ├── mappings/              # one test per mapping file
│       ├── populate.test.mjs
│       └── browser-smoke.mjs      # Playwright
└── .github/workflows/
    └── populator.yml              # Node tests on path-triggered push
```

## Dev loop

- `node populator/build.js` — rebuild dist
- `node --test populator/tests/**/*.test.mjs` — all unit tests
- `npx playwright test populator/tests/browser-smoke.mjs` — browser smoke
- Dev server: `python -m http.server 8000`, then `http://localhost:8000/populator/summary-populator-dev.html`

## Task Index

| # | Task | Deliverable |
|---|---|---|
| 01 | [Scaffold](task-01-scaffold.md) | Folder, `package.json`, vendored JSZip, copied SheetJS + parse.mjs, dev HTML, 5 blanks committed to `blanks/` |
| 02 | [xlsx-surgical module](task-02-xlsx-surgical.md) | `openXlsx`, `setCell`, `setCells`, `saveXlsx` + fidelity tests (charts, VBA, protection, zero-cell-write byte stability) |
| 03 | [Populate orchestrator](task-03-populate-orchestrator.md) | `populate.mjs`: mapping loader + signature check + static/table/derivation resolver. Returns `{outputs, warnings, skipped}` |
| 04 | [Mapping — General Retention](task-04-mapping-general-retention.md) | `mappings/general-retention.mjs` + mapping test |
| 05 | [Mapping — DDOT MEP](task-05-mapping-ddot-mep.md) | `mappings/ddot-mep.mjs` + mapping test (user-selected phases) |
| 06 | [Mapping — SWDB PROW](task-06-mapping-swdb-prow.md) | `mappings/swdb-prow.mjs` + mapping test |
| 07 | [Mapping — SWMP-BMP Calc](task-07-mapping-swmp-bmp-calc.md) | `mappings/swmp-bmp-calc.mjs` + mapping test (first-BMP-per-type behavior) |
| 08 | [Mapping — Rainwater Harvesting](task-08-mapping-rainwater-harvesting.md) | `mappings/rainwater-harvesting.mjs` + mapping test (skip-if-no-RWH behavior) |
| 09 | [End-to-end populate test](task-09-end-to-end.md) | `populate.test.mjs` — full pipeline on Minnesota Ave fixture; all 5 targets exercised |
| 10 | [UI shell](task-10-ui-shell.md) | `ui.mjs`: Stage 1 (load) + Stage 2 (populate), override rows, ZIP + per-file download, keyboard |
| 11 | [Build script → dist](task-11-build-script.md) | `build.js` concatenates CSS + modules + SheetJS + JSZip + 5 base64 blanks into single-file dist |
| 12 | [Playwright + CI + README](task-12-playwright-ci-readme.md) | `browser-smoke.mjs`, `.github/workflows/populator.yml`, `populator/README.md`, repo README row |

## Conventions

- **TDD.** Each task writes failing test first.
- **Commits** follow project convention from `.claude/CLAUDE.md`: plain language, no AI references.
- **One commit per task** unless a task explicitly says otherwise.
- **Units:** CF for volumes, SF for areas, inches for depths (matches `workbook/calculations.py`).
- **Mapping test fidelity:** golden-cell assertions (~10-15 per mapping file) — assert the populated XLSX contains the expected value at specific `(sheet, ref)` locations.
