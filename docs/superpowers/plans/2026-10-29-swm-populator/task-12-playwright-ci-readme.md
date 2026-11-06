# Task 12 — Playwright smoke + CI + README

**Goal:** Playwright browser-smoke test for the dist, GitHub Actions workflow, tool-level README, and repo README row.

**Files:**
- Create: `populator/tests/browser-smoke.mjs`
- Create: `populator/playwright.config.mjs`
- Create: `.github/workflows/populator.yml`
- Create: `populator/README.md`
- Modify: `README.md` (add populator row to Tools table)

---

- [ ] **Step 1: Install Playwright**

```powershell
Set-Location C:\_AAA\WS_HH\ddot_doee_swm_guidelines_2026_v1\populator
npm install
npx playwright install chromium
```

- [ ] **Step 2: Write `populator/playwright.config.mjs`**

```js
export default {
  testDir: './tests',
  testMatch: ['**/browser-smoke.mjs'],
  use: { headless: true },
  timeout: 30000,
};
```

- [ ] **Step 3: Write `populator/tests/browser-smoke.mjs`**

```js
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distUrl    = 'file://' + join(__dirname, '..', 'summary-populator.html');
const fixturePath = join(__dirname, 'fixtures', 'minnesota-ave.xlsx');

test('smoke: load template, populate, download ZIP', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('#templateInput', fixturePath);
  await page.waitForSelector('.file-input-label.loaded');
  await page.click('#populateBtn');
  await page.waitForSelector('.result-row', { timeout: 10000 });
  const okRows   = await page.$$('.result-row.ok');
  const warnRows = await page.$$('.result-row.warn');
  const skipRows = await page.$$('.result-row.skip');
  expect(okRows.length + warnRows.length).toBeGreaterThanOrEqual(3);
  expect(skipRows.length).toBeGreaterThanOrEqual(1);

  // ZIP download triggers.
  const downloadPromise = page.waitForEvent('download');
  await page.click('#zipBtn');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('swmp-package.zip');
});

test('smoke: override blank with mismatched signature shows error', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('#templateInput', fixturePath);
  await page.waitForSelector('.file-input-label.loaded');

  // Click the Override button on the first blank row and feed it the TEMPLATE
  // XLSX (wrong signature — doesn't have the Compliance Check Summary sheet).
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('.blank-row[data-target-id="general-retention"] .override-btn'),
  ]);
  await fileChooser.setFiles(fixturePath);
  await page.waitForSelector('.blank-row.error');
  const status = await page.textContent('.blank-row.error .status');
  expect(status).toMatch(/missing/i);
});
```

- [ ] **Step 4: Write `.github/workflows/populator.yml`**

```yaml
name: populator

on:
  push:
    paths:
      - 'populator/**'
      - 'docs/doee_spreadsheet_calculators/**'
      - 'summary_calculator/src/parse.mjs'  # populator copies it
  pull_request:
    paths:
      - 'populator/**'
      - 'docs/doee_spreadsheet_calculators/**'
      - 'summary_calculator/src/parse.mjs'

jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install deps
        working-directory: populator
        run: npm install --ignore-scripts
      - name: Run unit tests
        working-directory: populator
        run: node --test tests/xlsx-surgical.test.mjs tests/populate.test.mjs tests/mappings/*.test.mjs
```

- [ ] **Step 5: Write `populator/README.md`**

```markdown
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
```

- [ ] **Step 6: Add populator row to top-level `README.md`**

In the Tools table (added by Webpage A), add after the Summary Calculator row:

```markdown
| SWM DOEE Populator | Fills DOEE/DDOT submission workbooks from a filled template, preserving charts, macros, and protection | [HTML](populator/summary-populator.html) |
```

- [ ] **Step 7: Final test sweep**

```powershell
Set-Location C:\_AAA\WS_HH\ddot_doee_swm_guidelines_2026_v1\populator
node --test tests/**/*.test.mjs
```

Expected: all unit + mapping + populate tests pass.

```powershell
npx playwright test tests/browser-smoke.mjs
```

Expected: both smoke specs pass.

- [ ] **Step 8: Commit**

```bash
git add .github/workflows/populator.yml populator/tests/browser-smoke.mjs populator/playwright.config.mjs populator/README.md README.md
git commit -m "populator: Playwright smoke, CI workflow, and documentation"
```
