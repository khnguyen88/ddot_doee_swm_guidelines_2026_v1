# SWM Summary Calculator

Letter-format printable calculation summaries for the DOEE/DDOT stormwater template.

## Usage

Open `summary-calculator.html` in any modern browser (works offline from `file://`). Click the dropzone and choose a filled `SW_Required_Provided_DOEE_EISA438.xlsx` template. The sidebar lists every page in the deck; click any entry to preview. Click **Print** (or Ctrl/Cmd+P) to send the full deck to the browser's print dialog with pages pre-sized for US Letter at 0.5″ margins.

## What's inside

- **Cover** — project info, table of contents
- **Site DA — Land Cover** — aggregated Pre vs Post
- **Site SWRv Required** — informational site total (compliance is per-SDA)
- **SDA / CDA Summary** — table of all SDAs and CDAs
- **One page per BMP** — step-by-step Sv → Rv → Max Credit cap
- **MEP Summary** — DDOT 4-step process
- **EISA §438** — Direct Determination pre vs post
- **Detention Summary** — landscape, filtered to SDAs where post Q > pre Q at the 2-yr or 15-yr storm
- **Site Compliance Roll-up** — SWRv_req vs Rv_provided per SDA + site total

## Development

The dev HTML uses ES modules via `<script type="module" src="./src/ui.mjs">`, which requires a local server (ESM over `file://` is blocked by browser CORS). Start one from the repo root:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/summary_calculator/summary-calculator-dev.html.

### Rebuild the single-file dist

```bash
node summary_calculator/build.js
```

### Run tests

```bash
cd summary_calculator
node --test tests/parse.test.mjs tests/calc.test.mjs tests/render.test.mjs tests/parity.test.mjs
```

### Regenerate reference JSON (when `workbook/calculations.py` changes)

```bash
python scripts/dump_reference.py
```

### Browser smoke + print dimensions (optional, Playwright)

```bash
cd summary_calculator
npm install
npx playwright install chromium
npx playwright test tests/browser-smoke.mjs tests/print-dimensions.mjs
```

## Architecture

| File | Responsibility |
|---|---|
| `src/parse.mjs` | XLSX → `{project, sdas, cdas, bmps, params}` |
| `src/calc.mjs` | Pure calc engine — ports `workbook/calculations.py`, adds BMP sizing and detention |
| `src/render.mjs` | Pure HTML-string renderers — one function per sheet type |
| `src/ui.mjs` | Browser-only wiring: file input, sidebar, print toggle |
| `src/styles.css` | UI shell palette + `cs-*` print classes + `@page` rules |
| `build.js` | Inlines CSS + modules + SheetJS into single-file dist |
| `lib/sheetjs-bundle.js` | Vendored, same version as `drainage-calculator` |

Design spec: `docs/superpowers/specs/2026-10-28-swm-summary-calculator-design.md`
