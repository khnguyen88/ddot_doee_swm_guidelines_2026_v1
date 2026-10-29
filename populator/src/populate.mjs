// src/populate.mjs — orchestrator over mapping definitions.
// Input: parsed template (from parse.mjs) + per-target blank bytes.
// Output: { outputs: [{targetId, filename, blob}], warnings: [], skipped: [{targetId, reason}] }.

import { parseWorkbook } from './parse.mjs';
import { openXlsx, setCells, saveXlsx } from './xlsx-surgical.mjs';

// Resolve a mapping `from` string against the parsed template + current row context.
// Supports:
//   'project.name'              → parsed.project.name
//   'sdaId'                     → row.sdaId  (within a table context)
//   '*derive:preNaturalSf'      → mapping.derivations.preNaturalSf(row, parsed)
function resolveFrom(from, parsed, row, mapping) {
  if (from.startsWith('*derive:')) {
    const name = from.slice('*derive:'.length);
    const fn = mapping.derivations?.[name];
    if (!fn) throw new Error(`Mapping ${mapping.id}: unknown derivation "${name}"`);
    return fn(row, parsed);
  }
  const path = from.split('.');
  let v = row ?? parsed;
  for (const key of path) {
    if (v == null) return null;
    v = v[key];
  }
  // Fallback: if not found on row, try parsed (support both `from: 'sdaId'` and `from: 'project.name'`).
  if (v === undefined && row != null) {
    v = parsed;
    for (const key of path) {
      if (v == null) return null;
      v = v[key];
    }
  }
  return v ?? null;
}

// Collect source rows for a table.
//
// `table.source` may be either:
//   • a string key that resolves to an array on the parsed object
//       (e.g. 'bmps' → parsed.bmps), OR
//   • a function `(parsed) => Array` for sources that aren't simple fields
//       (e.g. a per-SDA grouping that collapses duplicate land-use rows).
function rowsForTable(table, parsed) {
  let arr;
  if (typeof table.source === 'function') {
    arr = table.source(parsed);
  } else {
    arr = parsed[table.source];
  }
  if (!Array.isArray(arr)) {
    const label = typeof table.source === 'function' ? '<fn>' : table.source;
    throw new Error(`Mapping table source "${label}" is not an array`);
  }
  // Allow a filter function.
  if (typeof table.filter === 'function') return arr.filter(table.filter);
  return arr;
}

export async function applyMapping(mapping, parsedOrWb, blankBytes, options = {}) {
  // Accept either a SheetJS workbook or an already-parsed object.
  const parsed = parsedOrWb?.SheetNames ? parseWorkbook(parsedOrWb) : parsedOrWb;

  // If the mapping has a build(parsed, options) hook, let it generate
  // staticCells / tables / warnings dynamically.
  //   - DDOT MEP uses build(parsed, options) to select phases via options.
  //   - SWMP-BMP Calc uses build(parsed) to emit one fanOut entry per BMP of
  //     a supported type; the orchestrator fan-out loop produces one output
  //     file per entry.
  // The hook's return is shallow-merged over the mapping so static definitions
  // can coexist with built ones.
  let effective = mapping;
  const buildWarnings = [];
  if (typeof mapping.build === 'function') {
    const built = mapping.build(parsed, options) || {};
    effective = { ...mapping, ...built };
    if (Array.isArray(built.warnings)) buildWarnings.push(...built.warnings);
  }

  const xlsx = await openXlsx(blankBytes);

  // Signature check — all signatureSheets must exist in the blank.
  for (const req of (effective.signatureSheets ?? [])) {
    if (!(req in xlsx.sheetMap)) {
      throw new Error(`Mapping ${mapping.id}: signature mismatch — missing sheet "${req}"`);
    }
  }

  const warnings = [...buildWarnings];

  // Fan-out path: effective.fanOut is an array of {filename, cells}.
  // Reuse the already-opened `xlsx` for entry 0; clone the blank bytes for 1..N.
  if (Array.isArray(effective.fanOut) && effective.fanOut.length > 0) {
    const outputs = [];
    for (let i = 0; i < effective.fanOut.length; i++) {
      const entry = effective.fanOut[i];
      const workbook = i === 0 ? xlsx : await openXlsx(new Uint8Array(blankBytes));
      const bySheet = {};
      for (const c of entry.cells) {
        if (c.value == null) continue;
        (bySheet[c.sheet] ??= []).push({ ref: c.ref, value: c.value });
      }
      for (const [sheet, entries] of Object.entries(bySheet)) {
        await setCells(workbook, sheet, entries);
      }
      const blob = await saveXlsx(workbook);
      outputs.push({ filename: entry.filename, blob });
    }
    return { targetId: mapping.id, outputs, warnings };
  }

  // Single-output path (unchanged).
  const bySheet = {};
  for (const cell of (effective.staticCells ?? [])) {
    let value;
    if ('value' in cell) {
      value = cell.value;
    } else {
      value = resolveFrom(cell.from, parsed, null, effective);
    }
    if (value == null) {
      const src = 'value' in cell ? `literal ${JSON.stringify(cell.value)}` : `source "${cell.from}"`;
      warnings.push({ ref: `${cell.sheet}!${cell.ref}`, reason: `${src} is null` });
      continue;
    }
    (bySheet[cell.sheet] ??= []).push({ ref: cell.ref, value });
  }

  for (const table of (effective.tables ?? [])) {
    const rows = rowsForTable(table, parsed);
    rows.forEach((row, i) => {
      const rowNum = table.firstDataRow + i;
      for (const col of table.columns) {
        const value = resolveFrom(col.from, parsed, row, effective);
        if (value == null) continue;
        (bySheet[table.sheet] ??= []).push({ ref: `${col.col}${rowNum}`, value });
      }
    });
  }

  for (const [sheet, entries] of Object.entries(bySheet)) {
    await setCells(xlsx, sheet, entries);
  }

  const blob = await saveXlsx(xlsx);
  return { targetId: mapping.id, filename: mapping.filename, blob, warnings };
}

export async function populateAll(wbOrParsed, { mappings, blanks, options = {} }) {
  const parsed = wbOrParsed?.SheetNames ? parseWorkbook(wbOrParsed) : wbOrParsed;

  const outputs = [];
  const skipped = [];

  for (const mapping of mappings) {
    // Per-mapping skip predicate (e.g., Rainwater Harvesting skips if no RWH BMPs).
    if (typeof mapping.skipIf === 'function') {
      const reason = mapping.skipIf(parsed, options);
      if (reason) {
        skipped.push({ targetId: mapping.id, reason });
        continue;
      }
    }
    const blankBytes = blanks[mapping.id];
    if (!blankBytes) {
      skipped.push({ targetId: mapping.id, reason: 'no blank provided' });
      continue;
    }
    try {
      const result = await applyMapping(mapping, parsed, blankBytes, options);
      if (Array.isArray(result.outputs)) {
        for (const o of result.outputs) {
          outputs.push({ targetId: result.targetId, filename: o.filename, blob: o.blob, warnings: result.warnings });
        }
      } else {
        outputs.push(result);
      }
    } catch (err) {
      skipped.push({ targetId: mapping.id, reason: err.message });
    }
  }

  return { outputs, skipped };
}
