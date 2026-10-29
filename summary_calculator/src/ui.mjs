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
