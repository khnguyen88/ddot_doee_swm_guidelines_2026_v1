# Task 01 — Scaffold

**Goal:** Create the `summary_calculator/` folder with a minimal working skeleton: Node package manifest, vendored SheetJS, dev HTML that loads SheetJS and logs the parsed workbook to the console. This gives us a target to point every subsequent task at.

**Files:**
- Create: `summary_calculator/package.json`
- Create: `summary_calculator/lib/sheetjs-bundle.js` (copied from `C:\_AAA\WS_HH\SD-HH-calculator-vc-v1\drainage-calculator\lib\sheetjs-bundle.js`)
- Create: `summary_calculator/summary-calculator-dev.html`
- Create: `summary_calculator/src/ui.mjs`
- Create: `summary_calculator/src/styles.css`
- Create: `summary_calculator/tests/.gitkeep`

---

- [ ] **Step 1: Create folder structure and copy SheetJS**

```bash
mkdir -p summary_calculator/src summary_calculator/lib summary_calculator/tests/fixtures
cp "/c/_AAA/WS_HH/SD-HH-calculator-vc-v1/drainage-calculator/lib/sheetjs-bundle.js" summary_calculator/lib/
```

(Use the PowerShell equivalent on Windows: `New-Item -ItemType Directory -Force summary_calculator/src, summary_calculator/lib, summary_calculator/tests/fixtures; Copy-Item C:\_AAA\WS_HH\SD-HH-calculator-vc-v1\drainage-calculator\lib\sheetjs-bundle.js summary_calculator\lib\`)

- [ ] **Step 2: Write `summary_calculator/package.json`**

```json
{
  "name": "swm-summary-calculator",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "smoke": "node --test tests/browser-smoke.mjs tests/print-dimensions.mjs",
    "build": "node build.js"
  },
  "devDependencies": {
    "playwright": "^1.47.0"
  }
}
```

- [ ] **Step 3: Write `summary_calculator/src/styles.css` with the UI shell palette**

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
  --font-ui: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, "Roboto Mono", monospace;
}

* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 14px;
  line-height: 1.45;
}

.app { display: grid; grid-template-columns: 236px 1fr; min-height: 100vh; }
.sidebar { background: var(--panel); border-right: 1px solid var(--border); padding: 20px 14px; overflow-y: auto; }
.main { padding: 24px 32px; overflow-y: auto; }
.empty-state { color: var(--muted); font-size: 15px; text-align: center; margin-top: 20vh; }
.dropzone { margin-top: 20px; padding: 40px; border: 2px dashed var(--border); border-radius: 8px; cursor: pointer; }
.dropzone:hover { border-color: var(--accent); }
```

- [ ] **Step 4: Write `summary_calculator/src/ui.mjs` — minimal entry point**

```js
// src/ui.mjs — browser-only entry point.
// Imports SheetJS from a sibling <script> tag that exposes window.XLSX.

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
  const workbook = window.XLSX.read(bytes, { type: 'array' });
  console.log('Loaded workbook:', workbook.SheetNames);
}

renderEmptyState();
```

- [ ] **Step 5: Write `summary_calculator/summary-calculator-dev.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SWM Summary Calculator</title>
  <link rel="stylesheet" href="./src/styles.css">
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div style="font-weight:700; font-size:14.5px;">SWM Summary</div>
      <div style="font-size:10.5px; color:var(--muted); text-transform:uppercase; margin-top:2px;">Calculator</div>
    </aside>
    <main id="main" class="main"></main>
  </div>
  <!-- SheetJS exposes window.XLSX -->
  <script src="./lib/sheetjs-bundle.js"></script>
  <script type="module" src="./src/ui.mjs"></script>
</body>
</html>
```

- [ ] **Step 6: Create `.gitkeep` so tests folder is tracked**

```bash
touch summary_calculator/tests/.gitkeep
```

- [ ] **Step 7: Verify dev HTML loads**

Start a local server:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/summary_calculator/summary-calculator-dev.html`. Expected: empty-state dropzone visible. Click it, choose any `.xlsx` file (use `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx`), open the browser console. Expected: `Loaded workbook: [ 'PROJECT', 'PARAMS', 'SDA', 'CDA', 'BMP', ... ]`.

- [ ] **Step 8: Commit**

```bash
git add summary_calculator/
git commit -m "summary-calculator: scaffold folder with SheetJS and empty-state dropzone"
```
