// src/xlsx-surgical.mjs — JSZip + XML DOM primitives for surgical XLSX edits.
// Loaded under two environments:
//   browser: window.JSZip is set by lib/jszip.min.js; DOMParser is global.
//   node tests: globalThis.JSZip is set by the test harness; a minimal DOMParser
//     shim is lazy-loaded via @xmldom/xmldom if not present.

const getJSZip = () => globalThis.JSZip || window.JSZip;

async function getDomParser() {
  if (typeof globalThis.DOMParser !== 'undefined') {
    return { DOMParser: globalThis.DOMParser, XMLSerializer: globalThis.XMLSerializer };
  }
  // Node fallback — zero deps if we build a minimal parser.
  // For this project we use a lightweight regex-based cell editor (see editSheetXml below)
  // and fall back to full DOM only if needed. For now assume browser DOMParser.
  throw new Error('DOMParser not available — run in a browser or add @xmldom/xmldom');
}

// A1-ref parse / unparse.
export function colToLetters(col) {
  let s = '';
  while (col > 0) {
    const r = (col - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}
export function parseRef(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`Bad cell ref: ${ref}`);
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]) };
}

// XML escaping for shared-strings values.
const xmlEscape = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// Build a regex that matches a single <c r="REF" ...> element without crossing
// into any neighbouring cell. The attribute block [^/>]* refuses `/` and `>`,
// so the engine can't walk past a self-closing cell `<c r="X"/>` and keep going.
function cellRegex(ref) {
  return new RegExp(
    `<c\\s+[^/>]*r="${ref}"[^/>]*(?:/>|>[\\s\\S]*?</c>)`
  );
}

export async function openXlsx(bytes) {
  const JSZip = getJSZip();
  const zip = await JSZip.loadAsync(bytes);

  // Build sheetName → path map from xl/workbook.xml + xl/_rels/workbook.xml.rels.
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');

  const sheetMap = {};
  // <sheet name="X" sheetId="N" r:id="rIdK"/>
  const sheetRe = /<sheet\s+[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?>/g;
  let m;
  while ((m = sheetRe.exec(wbXml)) !== null) {
    const [, name, rid] = m;
    // Resolve rid → Target via the rels file.
    const relRe = new RegExp(`<Relationship\\s+[^>]*Id="${rid}"[^>]*Target="([^"]+)"`);
    const relMatch = relRe.exec(relsXml);
    if (relMatch) {
      let target = relMatch[1];
      // Normalise against the workbook base (xl/).  Workbook rels Targets are
      // typically relative like "worksheets/sheet1.xml".
      if (target.startsWith('/')) {
        target = target.replace(/^\//, '');
      } else if (!target.startsWith('xl/')) {
        target = 'xl/' + target;
      }
      sheetMap[name] = target;
    }
  }

  // Load shared strings (may not exist on a brand-new workbook).
  let sstXml = null;
  let sstPresent = false;
  if (zip.file('xl/sharedStrings.xml')) {
    sstXml = await zip.file('xl/sharedStrings.xml').async('string');
    sstPresent = true;
  }
  const sst = parseSst(sstXml);

  // Eagerly load each sheet's XML so synchronous readCell/setCell works
  // without requiring the caller to await an extra load step.  Sheets are
  // typically only a handful of files and the parse step is cheap.
  const sheetXml = {};
  for (const [name, path] of Object.entries(sheetMap)) {
    const file = zip.file(path);
    if (file) sheetXml[name] = await file.async('string');
  }

  return {
    zip,
    sheetMap,
    sst,
    sstPresent,
    sstDirty: false,
    // Per-sheet mutable XML strings; preloaded above.
    sheetXml,
    // Which sheets have been modified since open; only those are written back.
    sheetDirty: new Set(),
  };
}

function parseSst(xml) {
  if (!xml) return { strings: [], index: new Map() };
  const strings = [];
  const index = new Map();
  // <si><t ...>...</t></si>  OR  <si><r>...<t>...</t>...</r></si>
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml)) !== null) {
    // Simple extraction — concatenate all <t> contents inside this si.
    const inner = m[1];
    const parts = [];
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let tm;
    while ((tm = tRe.exec(inner)) !== null) parts.push(tm[1]);
    const text = parts.join('')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
    const idx = strings.length;
    strings.push(text);
    index.set(text, idx);
  }
  return { strings, index };
}

function sstGetOrAdd(sst, s) {
  if (sst.index.has(s)) return sst.index.get(s);
  const idx = sst.strings.length;
  sst.strings.push(s);
  sst.index.set(s, idx);
  return idx;
}

// Edit a single cell within the sheet's XML string. Returns { xml, sstTouched }.
function editSheetXml(sheetXml, ref, value, sst) {
  const { row } = parseRef(ref);

  let sstTouched = false;

  // Determine the cell element we want to produce.
  let cellXml;
  if (value === null || value === undefined) {
    cellXml = `<c r="${ref}"/>`;
  } else if (typeof value === 'number') {
    cellXml = `<c r="${ref}" t="n"><v>${value}</v></c>`;
  } else if (typeof value === 'boolean') {
    cellXml = `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  } else {
    const idx = sstGetOrAdd(sst, String(value));
    sstTouched = true;
    cellXml = `<c r="${ref}" t="s"><v>${idx}</v></c>`;
  }

  // Does the cell already exist?
  const cellRe = cellRegex(ref);
  const existingMatch = cellRe.exec(sheetXml);
  if (existingMatch) {
    const existing = existingMatch[0];
    // Check for formula cell — contains <f> element.
    if (/<f[^>]*>/.test(existing)) {
      console.warn(`xlsx-surgical: skipping formula cell ${ref} to preserve formula`);
      return { xml: sheetXml, sstTouched: false };
    }
    // Preserve style attribute if present on the existing cell.
    const styleMatch = /\bs="(\d+)"/.exec(existing);
    if (styleMatch) {
      cellXml = cellXml.replace(/^<c /, `<c s="${styleMatch[1]}" `);
    }
    return { xml: sheetXml.replace(cellRe, cellXml), sstTouched };
  }

  // Cell doesn't exist. Insert it into the right <row>.
  const rowRe = new RegExp(`(<row\\s+[^>]*r="${row}"[^>]*>)([\\s\\S]*?)(</row>)`);
  if (rowRe.test(sheetXml)) {
    const newXml = sheetXml.replace(rowRe, (_, open, inner, close) => {
      // Insert cell in column order.
      const { col: newCol } = parseRef(ref);
      const existingCells = [];
      const existingCellRe = /<c\s+[^/>]*r="([A-Z]+\d+)"[^/>]*(?:\/>|>[\s\S]*?<\/c>)/g;
      let em;
      while ((em = existingCellRe.exec(inner)) !== null) {
        existingCells.push({ col: parseRef(em[1]).col, xml: em[0] });
      }
      existingCells.push({ col: newCol, xml: cellXml });
      existingCells.sort((a, b) => a.col - b.col);
      return open + existingCells.map(c => c.xml).join('') + close;
    });
    return { xml: newXml, sstTouched };
  }

  // Row doesn't exist either — insert a new <row> inside <sheetData>.
  const sheetDataRe = /(<sheetData[^>]*>)([\s\S]*?)(<\/sheetData>)/;
  if (!sheetDataRe.test(sheetXml)) {
    console.warn(`xlsx-surgical: sheet has no <sheetData> element, skipping ${ref}`);
    return { xml: sheetXml, sstTouched: false };
  }
  const newXml = sheetXml.replace(sheetDataRe, (_, open, inner, close) => {
    const existingRows = [];
    const rowReAll = /<row\s+[^>]*r="(\d+)"[^>]*>[\s\S]*?<\/row>/g;
    let rm;
    while ((rm = rowReAll.exec(inner)) !== null) {
      existingRows.push({ row: Number(rm[1]), xml: rm[0] });
    }
    const newRow = `<row r="${row}">${cellXml}</row>`;
    existingRows.push({ row, xml: newRow });
    existingRows.sort((a, b) => a.row - b.row);
    return open + existingRows.map(r => r.xml).join('') + close;
  });
  return { xml: newXml, sstTouched };
}

// Edit multiple cells on one sheet.
function editSheetXmlBatch(sheetXml, entries, sst) {
  let xml = sheetXml;
  let sstTouched = false;
  for (const { ref, value } of entries) {
    const r = editSheetXml(xml, ref, value, sst);
    xml = r.xml;
    sstTouched = sstTouched || r.sstTouched;
  }
  return { xml, sstTouched };
}

export function setCell(xlsx, sheetName, ref, value) {
  const xml = xlsx.sheetXml[sheetName];
  if (xml === undefined) throw new Error(`Sheet not loaded: ${sheetName}`);
  const r = editSheetXml(xml, ref, value, xlsx.sst);
  xlsx.sheetXml[sheetName] = r.xml;
  xlsx.sheetDirty.add(sheetName);
  if (r.sstTouched) xlsx.sstDirty = true;
}

export function setCells(xlsx, sheetName, entries) {
  const xml = xlsx.sheetXml[sheetName];
  if (xml === undefined) throw new Error(`Sheet not loaded: ${sheetName}`);
  const r = editSheetXmlBatch(xml, entries, xlsx.sst);
  xlsx.sheetXml[sheetName] = r.xml;
  xlsx.sheetDirty.add(sheetName);
  if (r.sstTouched) xlsx.sstDirty = true;
}

// Read a cell's current value. Useful for tests and for reading formula results.
export function readCell(xlsx, sheetName, ref) {
  const xml = xlsx.sheetXml[sheetName];
  if (xml === undefined) {
    throw new Error(`readCell: sheet ${sheetName} not loaded.`);
  }
  const cellRe = cellRegex(ref);
  const m = cellRe.exec(xml);
  if (!m) return null;
  const matched = m[0];
  // Self-closing (no <v>) — the cell is blank.
  if (matched.endsWith('/>')) return null;
  // Extract inner content between the opening tag's `>` and `</c>`.
  const openEnd = matched.indexOf('>') + 1;
  const inner = matched.slice(openEnd, matched.length - '</c>'.length);
  // Pull <v>...</v>
  const vMatch = /<v[^>]*>([\s\S]*?)<\/v>/.exec(inner);
  if (!vMatch) return null;
  const raw = vMatch[1];
  // Determine type from the <c t="..."> attribute.
  const cellOpen = matched.slice(0, openEnd);
  const tMatch = /\bt="([^"]+)"/.exec(cellOpen);
  const t = tMatch ? tMatch[1] : 'n';
  if (t === 's') return xlsx.sst.strings[Number(raw)];
  if (t === 'b') return raw === '1';
  if (t === 'n') return Number(raw);
  if (t === 'str') return raw;  // formula string result
  return raw;  // inline string / other
}

export async function saveXlsx(xlsx) {
  // Write back any mutated sheet XMLs.
  for (const sheetName of xlsx.sheetDirty) {
    const xml = xlsx.sheetXml[sheetName];
    const path = xlsx.sheetMap[sheetName];
    xlsx.zip.file(path, xml);
  }
  // Only rewrite shared-strings if we actually added/changed entries.
  if (xlsx.sstDirty || (xlsx.sstPresent && xlsx.sheetDirty.size > 0 && false)) {
    const sstXml = buildSstXml(xlsx.sst);
    xlsx.zip.file('xl/sharedStrings.xml', sstXml);
  }

  const out = await xlsx.zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return out;
}

function buildSstXml(sst) {
  const uniqueCount = sst.strings.length;
  const count = uniqueCount;  // not tracking total duplicate uses
  const sis = sst.strings.map(s => `<si><t xml:space="preserve">${xmlEscape(s)}</t></si>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${count}" uniqueCount="${uniqueCount}">` +
    sis +
    `</sst>`;
}
