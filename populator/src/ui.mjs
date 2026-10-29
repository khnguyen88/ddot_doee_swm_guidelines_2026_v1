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
        ${outputs.map((o, idx) => `
          <div class="result-row ${o.warnings?.length ? 'warn' : 'ok'}">
            <div class="mark">${o.warnings?.length ? '⚠' : '✓'}</div>
            <div class="label">
              ${o.filename}
              ${(o.warnings ?? []).map(w => `<div class="reason">${w}</div>`).join('')}
            </div>
            <div class="size">${(o.blob.size / 1024).toFixed(0)} KB</div>
            <button class="dl-btn" data-idx="${idx}">Download</button>
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
      const output = outputs[parseInt(btn.dataset.idx, 10)];
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
