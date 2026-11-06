# Task 01 — Scaffold

**Goal:** Create the `populator/` folder with Node manifest, vendored JSZip, copied SheetJS + parse.mjs from `summary_calculator/`, dev HTML skeleton, five DOEE blank XLSX files, and basic empty-state UI.

**Files:**
- Create: `populator/package.json`
- Create: `populator/lib/sheetjs-bundle.js` (copy from `summary_calculator/lib/`)
- Create: `populator/lib/jszip.min.js` (vendored, see Step 2)
- Create: `populator/src/parse.mjs` (copy from `summary_calculator/src/`)
- Create: `populator/src/styles.css`
- Create: `populator/src/ui.mjs` (minimal entry)
- Create: `populator/summary-populator-dev.html`
- Create: `populator/blanks/general-retention.xlsx`
- Create: `populator/blanks/ddot-mep.xlsx`
- Create: `populator/blanks/swdb-prow.xlsx`
- Create: `populator/blanks/swmp-bmp-calc.xlsm`
- Create: `populator/blanks/rainwater-harvesting.xlsx`
- Create: `populator/tests/fixtures/minnesota-ave.xlsx` (copy from `summary_calculator/tests/fixtures/`)

---

- [ ] **Step 1: Create folder tree and copy existing files**

PowerShell (from repo root):

```powershell
New-Item -ItemType Directory -Force populator/src/mappings, populator/lib, populator/blanks, populator/tests/fixtures, populator/tests/mappings | Out-Null
Copy-Item summary_calculator/lib/sheetjs-bundle.js populator/lib/
Copy-Item summary_calculator/src/parse.mjs populator/src/
Copy-Item summary_calculator/tests/fixtures/minnesota-ave.xlsx populator/tests/fixtures/

# Copy the 5 DOEE blanks into populator/blanks/ with cleaner filenames.
Copy-Item "docs/doee_spreadsheet_calculators/2020 General Retention Compliance Calculator 2-5-21.xlsx"       populator/blanks/general-retention.xlsx
Copy-Item "docs/doee_spreadsheet_calculators/DDOT MEP Worksheet 012019.xlsx"                                   populator/blanks/ddot-mep.xlsx
Copy-Item "docs/doee_spreadsheet_calculators/SWDB Template for PROW Information_SWMP July 2025 - final locked.xlsx" populator/blanks/swdb-prow.xlsx
Copy-Item "docs/doee_spreadsheet_calculators/2020 SWMP-BMP Calc Spreadsheet 11-30-2020.xlsm"                   populator/blanks/swmp-bmp-calc.xlsm
Copy-Item "docs/doee_spreadsheet_calculators/2019 Rainwater Harvesting Storage Volume Calculator 5-07-26.xlsx" populator/blanks/rainwater-harvesting.xlsx
```

- [ ] **Step 2: Vendor JSZip**

Download https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js to `populator/lib/jszip.min.js`. If offline, use the same approach as SheetJS was vendored — fetch once with a tool like `curl` or copy from another local project that uses JSZip.

PowerShell:
```powershell
Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" -OutFile populator/lib/jszip.min.js
```

Verify size is roughly 90-100 KB:
```powershell
(Get-Item populator/lib/jszip.min.js).Length
```

Expected: around 94,000 bytes. The CJS bundle exposes `JSZip` as a global when loaded via a classic `<script>` tag.

- [ ] **Step 3: Write `populator/package.json`**

```json
{
  "name": "swm-populator",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test tests/**/*.test.mjs",
    "smoke": "node --test tests/browser-smoke.mjs",
    "build": "node build.js"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0"
  }
}
```

- [ ] **Step 4: Write `populator/src/styles.css` (minimal shell palette)**

```css
:root {
  --bg: #0B1220;
  --panel: #121B2B;
  --panel-alt: #16202F;
  --border: #26374D;
  --text: #E7EEF6;
  --muted: #8FA3BF;
  --accent: #38C6B4;
  --accent-soft: rgba(56, 198, 180, 0.12);
  --fail: #E5484D;
  --warn: #E5B94D;
  --pass: #3DD68C;
  --font-ui: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, "Roboto Mono", monospace;
}

* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  background: var(--bg); color: var(--text);
  font-family: var(--font-ui); font-size: 14px; line-height: 1.45;
}

.app { max-width: 800px; margin: 40px auto; padding: 24px; }
.title { font-size: 18px; font-weight: 700; margin-bottom: 20px; }
.sub   { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-top: 4px; margin-bottom: 24px; }
.empty-state { color: var(--muted); font-size: 15px; text-align: center; margin-top: 15vh; }
.dropzone { margin-top: 20px; padding: 40px; border: 2px dashed var(--border); border-radius: 8px; cursor: pointer; }
.dropzone:hover { border-color: var(--accent); }
```

- [ ] **Step 5: Write `populator/src/ui.mjs` (minimal entry — logs the parsed workbook)**

```js
// src/ui.mjs — minimal scaffold entry. Will be rewritten in Task 10.
import { parseWorkbook } from './parse.mjs';

const main = document.getElementById('main');

function renderEmptyState() {
  main.innerHTML = `
    <div class="empty-state">
      <div>Load a filled DOEE EISA 438 template to begin.</div>
      <label class="dropzone">
        <input type="file" accept=".xlsx,.xlsm" hidden>
        <div>Click to choose an .xlsx file</div>
      </label>
    </div>`;
  main.querySelector('input[type=file]').addEventListener('change', onFileChosen);
}

async function onFileChosen(event) {
  const file = event.target.files[0];
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const wb = window.XLSX.read(bytes, { type: 'array' });
  const parsed = parseWorkbook(wb);
  console.log('Parsed:', parsed);
  console.log('JSZip available:', typeof window.JSZip);
}

renderEmptyState();
```

- [ ] **Step 6: Write `populator/summary-populator-dev.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SWM DOEE Populator</title>
  <link rel="stylesheet" href="./src/styles.css">
</head>
<body>
  <div class="app">
    <div class="title">SWM DOEE Populator</div>
    <div class="sub">Fills DOEE/DDOT submission workbooks from a filled template</div>
    <main id="main"></main>
  </div>
  <script src="./lib/sheetjs-bundle.js"></script>
  <script src="./lib/jszip.min.js"></script>
  <script type="module" src="./src/ui.mjs"></script>
</body>
</html>
```

- [ ] **Step 7: Verify dev HTML loads**

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/populator/summary-populator-dev.html`. Click the dropzone, pick `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`. Expected console output:
- `Parsed: {project: {...}, sdas: [...], cdas: [...], bmps: [...], params: {...}}`
- `JSZip available: function`

- [ ] **Step 8: Commit**

```bash
git add populator/
git commit -m "populator: scaffold folder with SheetJS, JSZip, parse.mjs copy, and 5 DOEE blanks"
```
