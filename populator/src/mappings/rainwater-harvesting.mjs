// src/mappings/rainwater-harvesting.mjs
// Mapping for DOEE "Rainwater Harvesting Storage Volume Calculator" (v3.1, May 7, 2026).
//
// Blank layout investigated against populator/blanks/rainwater-harvesting.xlsx
// with openpyxl (data_only=False):
//
//   Sheets: Instructions, Input, Storage Volume Results (in ft3),
//           Storage Volume Results (in gal), JC, TS, TS Monthly,
//           P" storm, Rainfall data_1999 to 3-2019.
//
//   Sheet "Input":
//     A1 = static title (baked into the blank — not a user field)
//     L4 = Storm Event (inches) — pre-filled to 1.7 (yellow input cell)
//     L7 = Impervious cover in CDA (SF) — green user-entry cell
//     L9 = Compacted cover in CDA (SF) — green user-entry cell
//     L15 = Retention Volume from upstream BMP(s) (CF)
//     L17 = Overflow Volume from 1.7" storm from upstream BMP(s) (CF)
//
//   There are NO project name / project number header fields in this blank.
//   All cistern-sizing inputs (CDA area, demand by category, filter efficiency)
//   are site-specific values not carried by the template workbook.
//
// Behavior:
//   - skipIf: if parsed.bmps has NO BMP of type "Rainwater Harvesting", the
//     mapping is skipped entirely and no output file is emitted.
//   - When invoked (RWH BMP present), the blank is emitted as-is with no cell
//     writes (staticCells is empty). The user must open the file and fill
//     L7, L9, and all demand / cistern inputs manually.

export const target = {
  id: 'rainwater-harvesting',
  filename: 'Rainwater Harvesting Storage Volume Calculator.xlsx',
  blankVersion: '2026-05-07',
  signatureSheets: ['Input'],

  // Skip this target entirely when no Rainwater Harvesting BMP is present.
  skipIf(parsed) {
    const hasRwh = (parsed.bmps ?? []).some(b => b.type === 'Rainwater Harvesting');
    return hasRwh ? null : 'No Rainwater Harvesting BMPs in template.';
  },

  // The blank has no project header cells to auto-populate. All cistern
  // inputs are site-specific and must be entered manually.
  staticCells: [],
  tables: [],
  derivations: {},
};
