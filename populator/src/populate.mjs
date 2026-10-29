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
function rowsForTable(table, parsed) {
  const arr = parsed[table.source];
  if (!Array.isArray(arr)) throw new Error(`Mapping table source "${table.source}" is not an array`);
  // Allow a filter function.
  if (typeof table.filter === 'function') return arr.filter(table.filter);
  return arr;
}

export async function applyMapping(mapping, parsedOrWb, blankBytes) {
  // Accept either a SheetJS workbook or an already-parsed object.
  const parsed = parsedOrWb?.SheetNames ? parseWorkbook(parsedOrWb) : parsedOrWb;

  const xlsx = await openXlsx(blankBytes);

  // Signature check — all signatureSheets must exist in the blank.
  for (const req of (mapping.signatureSheets ?? [])) {
    if (!(req in xlsx.sheetMap)) {
      throw new Error(`Mapping ${mapping.id}: signature mismatch — missing sheet "${req}"`);
    }
  }

  const warnings = [];

  // Static cells.
  const bySheet = {};
  for (const cell of (mapping.staticCells ?? [])) {
    const value = resolveFrom(cell.from, parsed, null, mapping);
    if (value == null) {
      warnings.push({ ref: `${cell.sheet}!${cell.ref}`, reason: `source "${cell.from}" is null` });
      continue;
    }
    (bySheet[cell.sheet] ??= []).push({ ref: cell.ref, value });
  }

  // Tables.
  for (const table of (mapping.tables ?? [])) {
    const rows = rowsForTable(table, parsed);
    rows.forEach((row, i) => {
      const rowNum = table.firstDataRow + i;
      for (const col of table.columns) {
        const value = resolveFrom(col.from, parsed, row, mapping);
        if (value == null) continue;
        (bySheet[table.sheet] ??= []).push({ ref: `${col.col}${rowNum}`, value });
      }
    });
  }

  // Apply all cells grouped by sheet (one DOM pass per sheet).
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
      const result = await applyMapping(mapping, parsed, blankBytes);
      outputs.push(result);
    } catch (err) {
      skipped.push({ targetId: mapping.id, reason: err.message });
    }
  }

  return { outputs, skipped };
}
