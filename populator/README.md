# SWM DOEE Populator

Fills DOEE/DDOT submission workbooks from a filled DOEE EISA 438 template using surgical XML edits that preserve charts, VBA macros, protection, and formatting.

## Usage

Open `summary-populator.html` in any modern browser (works offline from `file://`). Upload the filled template, optionally override any of the bundled blank DOEE files, pick which DDOT MEP phases to populate, click Populate. Download individual files or the whole SWMP package as a ZIP.

## Targets

| File | Status |
|---|---|
| General Retention Compliance Calculator | Full |
| DDOT MEP Worksheet | Full (user-selected phases) |
| SWDB PROW Import Template | Full |
| SWMP-BMP Calc Spreadsheet (`.xlsm`) | First BMP per type (warns on additional) |
| Rainwater Harvesting Calculator | Skipped unless template has RWH BMPs |

## Development

```bash
# Dev server (ES modules require http://)
python -m http.server 8000
# Open http://localhost:8000/populator/summary-populator-dev.html

# Rebuild single-file dist
node populator/build.js

# Run tests
cd populator
node --test tests/**/*.test.mjs

# Playwright smoke
npx playwright test tests/browser-smoke.mjs
```

## Architecture

| File | Responsibility |
|---|---|
| `src/parse.mjs` | XLSX → `{project, sdas, cdas, bmps, params}` (copy of summary_calculator) |
| `src/xlsx-surgical.mjs` | JSZip + XML DOM primitives: `openXlsx`, `setCell`, `setCells`, `saveXlsx` |
| `src/mappings/*.mjs` | Declarative cell maps — one file per target |
| `src/populate.mjs` | Orchestrator — walks mappings, applies cells, returns Blobs |
| `src/ui.mjs` | Browser wiring — two-stage flow, overrides, ZIP download |
| `src/styles.css` | Dark-theme shell |
| `build.js` | Inlines CSS + modules + SheetJS + JSZip + 5 blanks (base64) into dist |

Design spec: `docs/superpowers/specs/2026-10-29-swm-populator-design.md`
