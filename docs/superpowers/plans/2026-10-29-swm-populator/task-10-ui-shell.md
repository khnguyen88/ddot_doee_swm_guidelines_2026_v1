# Task 10 — UI shell

**Goal:** Rewrite `src/ui.mjs` as a two-stage browser flow (Load → Populate) with override rows, per-target status, ZIP download, keyboard shortcuts.

**Files:**
- Modify: `populator/src/ui.mjs` (full rewrite from the Task 01 scaffold)
- Modify: `populator/src/styles.css` (append sidebar/row/panel styles)
- Modify: `populator/summary-populator-dev.html` (add `<div id="stage">`)

---

- [ ] **Step 1: Append CSS to `src/styles.css`**

```css
/* ── Two-stage flow ─────────────────────────────────────────────────────── */
.stage { display: flex; flex-direction: column; gap: 20px; }
.card {
  background: var(--panel); border: 1px solid var(--border);
  border-radius: 8px; padding: 20px;
}
.card-title { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 12px; }

.file-input-wrap { position: relative; }
.file-input-label {
  display: block; padding: 14px 16px; border: 1px dashed var(--border);
  border-radius: 6px; cursor: pointer; color: var(--muted);
}
.file-input-label.loaded { color: var(--accent); border-color: var(--accent); border-style: solid; }
.file-input-label:hover  { border-color: var(--accent); }
.file-input-label input  { display: none; }

.blank-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 6px; background: var(--panel-alt);
  margin-bottom: 6px;
}
.blank-row .label  { flex: 1; font-size: 13px; }
.blank-row .status { font-size: 11px; color: var(--muted); }
.blank-row .override-btn {
  all: unset; cursor: pointer; padding: 4px 10px; border-radius: 4px;
  background: var(--accent-soft); color: var(--accent); font-size: 12px;
}
.blank-row.override .status { color: var(--accent); }
.blank-row.error   .status { color: var(--fail); }

.phases { display: flex; gap: 14px; }
.phases label { font-size: 13px; cursor: pointer; }

.btn-primary {
  all: unset; cursor: pointer; padding: 10px 20px; border-radius: 6px;
  background: var(--accent); color: #0B1220; font-weight: 700; text-align: center;
}
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-secondary {
  all: unset; cursor: pointer; padding: 8px 16px; border-radius: 6px;
  background: transparent; color: var(--muted); border: 1px solid var(--border);
}

.result-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 6px; background: var(--panel-alt);
  margin-bottom: 6px;
}
.result-row .mark { width: 20px; }
.result-row.ok   .mark { color: var(--pass); }
.result-row.warn .mark { color: var(--warn); }
.result-row.skip .mark { color: var(--muted); }
.result-row .label  { flex: 1; }
.result-row .size   { font-size: 11px; color: var(--muted); font-family: var(--font-mono); }
.result-row .dl-btn {
  all: unset; cursor: pointer; padding: 4px 10px; border-radius: 4px;
  background: var(--accent-soft); color: var(--accent); font-size: 12px;
}
.result-row .reason { font-size: 12px; color: var(--warn); margin-top: 4px; }

.banner { padding: 10px 14px; margin: 10px 0; border-radius: 6px; font-size: 13px; }
.banner.error { background: rgba(229, 72, 77, 0.1); border: 1px solid var(--fail); color: #FCA5A5; }
```

- [ ] **Step 2: Update `summary-populator-dev.html` body**

```html
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
```

(Already the right shape from Task 01 — no change needed.)

- [ ] **Step 3: Rewrite `src/ui.mjs`**

```js
// src/ui.mjs — two-stage browser UI for the populator.
import { parseWorkbook } from './parse.mjs';
import { populateAll }   from './populate.mjs';
import { target as generalRetention }   from './mappings/general-retention.mjs';
import { target as ddotMep }            from './mappings/ddot-mep.mjs';
import { target as swdbProw }           from './mappings/swdb-prow.mjs';
import { target as swmpBmpCalc }        from './mappings/swmp-bmp-calc.mjs';
import { target as rainwaterHarvesting } from './mappings/rainwater-harvesting.mjs';

const ALL_MAPPINGS = [generalRetention, ddotMep, swdbProw, swmpBmpCalc, rainwaterHarvesting];

const main = document.getElementById('main');

// Bundled blank URLs — build.js replaces these with inlined base64 data URLs for dist.
const BUNDLED_BLANK_URLS = {
  'general-retention':    './blanks/general-retention.xlsx',
  'ddot-mep':             './blanks/ddot-mep.xlsx',
  'swdb-prow':            './blanks/swdb-prow.xlsx',
  'swmp-bmp-calc':        './blanks/swmp-bmp-calc.xlsm',
  'rainwater-harvesting': './blanks/rainwater-harvesting.xlsx',
};

const state = {
  parsed: null,
  templateFilename: null,
  overrides: {},         // targetId → { bytes, filename, error? }
  phases: ['30% Phase'], // DDOT MEP phases
  stage: 'load',         // 'load' | 'populate' | 'done'
  results: null,         // populateAll output
};

function render() {
  if (state.stage === 'load')     renderLoad();
  else if (state.stage === 'done') renderDone();
}

function renderLoad() {
  const canPopulate = !!state.parsed;
  main.innerHTML = `
    <div class="stage">
      <div class="card">
        <div class="card-title">① Filled Template</div>
        <label class="file-input-label ${state.parsed ? 'loaded' : ''}">
          <input type="file" accept=".xlsx,.xlsm" id="templateInput">
          <span>${state.templateFilename || 'Click to upload SW_Required_Provided_DOEE_EISA438...xlsx'}</span>
        </label>
      </div>

      <div class="card">
        <div class="card-title">② DOEE Blanks (optional override)</div>
        ${ALL_MAPPINGS.map(m => renderBlankRow(m)).join('')}
      </div>

      <div class="card">
        <div class="card-title">③ DDOT MEP Phases</div>
        <div class="phases">
          ${['30% Phase', '65% Phase', '90% Phase'].map(p => `
            <label><input type="checkbox" value="${p}" ${state.phases.includes(p) ? 'checked' : ''}> ${p}</label>
          `).join('')}
        </div>
      </div>

      <button class="btn-primary" id="populateBtn" ${canPopulate ? '' : 'disabled'}>Populate</button>
    </div>
  `;

  document.getElementById('templateInput').addEventListener('change', onTemplateChosen);
  document.getElementById('populateBtn').addEventListener('click', doPopulate);
  for (const cb of main.querySelectorAll('.phases input')) {
    cb.addEventListener('change', (e) => {
      if (e.target.checked) state.phases.push(e.target.value);
      else state.phases = state.phases.filter(p => p !== e.target.value);
    });
  }
  for (const row of main.querySelectorAll('.blank-row')) {
    const id = row.dataset.targetId;
    row.querySelector('.override-btn').addEventListener('click', () => pickOverride(id));
  }
}

function renderBlankRow(mapping) {
  const override = state.overrides[mapping.id];
  const cls = override?.error ? 'error' : (override ? 'override' : '');
  const statusText = override?.error
    ? override.error
    : (override ? `override: ${override.filename}` : `bundled ${mapping.blankVersion}`);
  return `
    <div class="blank-row ${cls}" data-target-id="${mapping.id}">
      <div class="label">${mapping.filename}</div>
      <div class="status">${statusText}</div>
      <button class="override-btn">Override</button>
    </div>
  `;
}

async function onTemplateChosen(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const wb = window.XLSX.read(bytes, { type: 'array' });
    state.parsed = parseWorkbook(wb);
    state.templateFilename = file.name;
    render();
  } catch (err) {
    main.insertAdjacentHTML('afterbegin', `<div class="banner error">Parse error: ${err.message}</div>`);
  }
}

async function pickOverride(targetId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xlsm';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Signature check — load with SheetJS, verify sheet names.
    const mapping = ALL_MAPPINGS.find(m => m.id === targetId);
    const wb = window.XLSX.read(bytes, { type: 'array' });
    const missing = (mapping.signatureSheets ?? []).filter(s => !wb.SheetNames.includes(s));
    if (missing.length) {
      state.overrides[targetId] = { bytes, filename: file.name, error: `missing sheets: ${missing.join(', ')}` };
    } else {
      state.overrides[targetId] = { bytes, filename: file.name };
    }
    render();
  });
  input.click();
}

async function doPopulate() {
  const blanks = {};
  for (const mapping of ALL_MAPPINGS) {
    const override = state.overrides[mapping.id];
    if (override && !override.error) {
      blanks[mapping.id] = override.bytes;
    } else {
      // Fetch bundled blank (works offline because build.js inlines as data: URLs).
      const res = await fetch(BUNDLED_BLANK_URLS[mapping.id]);
      const buf = await res.arrayBuffer();
      blanks[mapping.id] = new Uint8Array(buf);
    }
  }
  state.results = await populateAll(state.parsed, {
    mappings: ALL_MAPPINGS,
    blanks,
    options: { phases: state.phases },
  });
  state.stage = 'done';
  render();
}

function renderDone() {
  const { outputs, skipped } = state.results;
  const total = outputs.length + skipped.length;
  main.innerHTML = `
    <div class="stage">
      <div class="card">
        <div class="card-title">Populated ${outputs.length} of ${total} files</div>
        ${outputs.map(o => `
          <div class="result-row ${o.warnings?.length ? 'warn' : 'ok'}">
            <div class="mark">${o.warnings?.length ? '⚠' : '✓'}</div>
            <div class="label">
              ${o.filename}
              ${(o.warnings ?? []).map(w => `<div class="reason">${w}</div>`).join('')}
            </div>
            <div class="size">${(o.blob.size / 1024).toFixed(0)} KB</div>
            <button class="dl-btn" data-id="${o.targetId}">Download</button>
          </div>
        `).join('')}
        ${skipped.map(s => `
          <div class="result-row skip">
            <div class="mark">⊘</div>
            <div class="label">${ALL_MAPPINGS.find(m => m.id === s.targetId)?.filename}</div>
            <div class="size">skipped</div>
          </div>
          <div class="reason">${s.reason}</div>
        `).join('')}
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-primary" id="zipBtn">Download all as ZIP</button>
        <button class="btn-secondary" id="resetBtn">Start over</button>
      </div>
    </div>
  `;

  for (const btn of main.querySelectorAll('.dl-btn')) {
    btn.addEventListener('click', () => {
      const output = outputs.find(o => o.targetId === btn.dataset.id);
      downloadBlob(output.blob, output.filename);
    });
  }
  document.getElementById('zipBtn').addEventListener('click', downloadZip);
  document.getElementById('resetBtn').addEventListener('click', () => {
    state.parsed = null;
    state.templateFilename = null;
    state.overrides = {};
    state.phases = ['30% Phase'];
    state.stage = 'load';
    state.results = null;
    render();
  });
}

async function downloadZip() {
  const zip = new window.JSZip();
  for (const o of state.results.outputs) {
    zip.file(o.filename, o.blob);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, 'swmp-package.zip');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && state.stage === 'load' && state.parsed) doPopulate();
  if (ev.key === 'Escape' && state.stage === 'done') main.querySelector('#resetBtn').click();
});

render();
```

- [ ] **Step 4: Manual verification**

```powershell
python -m http.server 8000
```

Open `http://localhost:8000/populator/summary-populator-dev.html`. Upload the Minnesota Ave sample, click Populate, verify:
- 4 result rows (General Retention, DDOT MEP, SWDB PROW, SWMP-BMP Calc) + 1 skipped (Rainwater Harvesting).
- SWMP-BMP Calc shows a warning about additional BMPs.
- Clicking Download on any row produces an .xlsx file.
- Clicking "Download all as ZIP" produces `swmp-package.zip` containing the 4 files.
- Esc returns to Stage 1.

- [ ] **Step 5: Commit**

```bash
git add populator/src/ui.mjs populator/src/styles.css
git commit -m "populator: two-stage UI (load → populate), overrides, ZIP + per-file download"
```
