// src/mappings/ddot-mep.mjs
// Mapping for DDOT "MEP Worksheet" (2019-01 blank). The blank has three design
// phase tabs — 30% Phase, 65% Phase, 90% Phase — each a near-copy of the same
// template with a few extra columns at later phases. A user picks which phases
// to populate at run-time via `options.phases` (default: 30% only). Unselected
// phases are left as-is so the output doubles as a progress-tracking template.
//
// Blank layout investigated against populator/blanks/ddot-mep.xlsx with
// openpyxl, cross-referenced against the companion "<Phase> Sample" tabs that
// ship pre-filled with the Minnesota Ave Great Street test case.
//
// Project header row 1 — the label column shifts between phases, so the
// value cells differ:
//
//   30% Phase: D1=Project Name  J1=Project No.  U1=DOEE Plan Review No.
//   65% Phase: D1=Project Name  I1=Project No.  T1=DOEE Plan Review No.
//   90% Phase: D1=Project Name  I1=Project No.  T1=DOEE Plan Review No.
//
// E5 on all three phases = No. of Drainage Areas (user-entered integer).
// E4 on all phases is a formula pulling disturbance area from E45/43560.
//
// Per-DA table starts at row 12 (header rows 9/10/11). Rows 12-44 are data,
// row 45 is the DATOTAL row with SUM() formulas we must leave intact.
//
//   Common columns (all three phases):
//     A  Drainage Area ID              B  Impervious within LOD (SF)
//     C  Compacted within LOD (SF)     D  Natural within LOD (SF)
//     F  Impervious outside LOD (SF)   G  Compacted outside LOD (SF)
//     H  Natural outside LOD (SF)      L  Hydrologic Soil Group
//     N  # Small Trees preserved       P  # Large Trees preserved
//     R  # Special/Heritage Trees preserved
//     (E, I, J, K, O, Q, S, Y, Z are formula cells and are not written.)
//
//   30% Phase additionally has:
//     M  Hotspot Y/N        T  Land Conversion/BMP Opportunity Y/N
//     U  Describe obstacles
//
//   65% + 90% Phase additionally have (same column letters on both tabs):
//     M  Water Table OK? Y/N      N  Bedrock Elevation OK? Y/N
//     O  Infiltration Rate (in/hr) P  Hotspot Y/N
//     Q  # Small Trees   S  # Large Trees   U  # Special/Heritage Trees
//     W  Land Conversion within LOD (SF)   X  adjacent to LOD (SF)
//     Y  Bioretention Opportunity Within LOD (SF)   Z  adjacent (SF)
//     AA Permeable Pavement Opportunity Within LOD  AB adjacent (SF)
//     AC Total BMP CDA Within LOD (SF)    AD adjacent (SF)
//     AG Max Sv Bioretention (CF)   AH Max Sv Permeable Pavement (CF)
//     AI Max Sv Other (CF)
//     AJ # proposed Small Trees meeting soil vol requirement
//     AK # proposed Large Trees meeting soil vol requirement
//
// Only cells with a confident data source in the parsed workbook are written.
// Everything else (narratives, hotspot flags, obstacle descriptions, phase-5
// BMP sizing columns) is left blank for the designer to fill in. The fixture
// `tests/fixtures/minnesota-ave.xlsx` only carries land-cover + tree-count
// data, so the 65% / 90% phase outputs will match the 30% phase in content;
// adding phase-specific inputs is a future extension.

export const target = {
  id: 'ddot-mep',
  filename: 'DDOT MEP Worksheet.xlsx',
  blankVersion: '2019-01',
  signatureSheets: ['30% Phase', '65% Phase', '90% Phase'],

  // Dynamically generate the staticCells / tables based on user-selected
  // phases. The orchestrator's applyMapping() calls build(options) if present
  // and merges the result over the mapping before applying.
  build(_parsed, options) {
    const phases = options?.phases ?? ['30% Phase'];
    const staticCells = [];
    const tables = [];

    for (const phase of phases) {
      const header = _headerRefs(phase);
      if (!header) continue;  // unknown phase name — silently skip

      // -------- Project header --------
      staticCells.push(
        { sheet: phase, ref: header.name,   from: 'project.name' },
        { sheet: phase, ref: header.number, from: 'project.number' },
        { sheet: phase, ref: header.review, from: 'project.doeeReview' },
        // E5 = No. of Drainage Areas
        { sheet: phase, ref: 'E5',          from: '*derive:numDrainageAreas' },
      );

      // -------- Per-DA table (rows 12..44) --------
      // Common columns for every phase.
      const columns = [
        { col: 'A', from: '*derive:daId' },
        { col: 'B', from: '*derive:impWithinLod' },
        { col: 'C', from: '*derive:compactedWithinLod' },
        { col: 'D', from: '*derive:naturalWithinLod' },
        { col: 'F', from: '*derive:impOutsideLod' },
        { col: 'G', from: '*derive:compactedOutsideLod' },
        { col: 'H', from: '*derive:naturalOutsideLod' },
        { col: 'L', from: '*derive:hsg' },
      ];

      // Tree-count columns move between phases.
      if (phase === '30% Phase') {
        columns.push(
          { col: 'N', from: '*derive:smallTreesPreserved' },
          { col: 'P', from: '*derive:largeTreesPreserved' },
          { col: 'R', from: '*derive:specialHeritageTreesPreserved' },
        );
      } else {
        // 65% / 90% Phase: trees shift one column right (M/N/O/P hold the
        // infiltration-check Y/N and in/hr values that only matter at 65%+).
        columns.push(
          { col: 'Q', from: '*derive:smallTreesPreserved' },
          { col: 'S', from: '*derive:largeTreesPreserved' },
          { col: 'U', from: '*derive:specialHeritageTreesPreserved' },
        );
      }

      tables.push({
        sheet: phase,
        firstDataRow: 12,
        source: _uniqueSdaRows,
        columns,
      });
    }

    return { staticCells, tables };
  },

  derivations: {
    // --------- Project header ---------
    numDrainageAreas: (_row, p) => _uniqueSdaRows(p).length,

    // --------- Per-DA row ---------
    // Use the sdaId stripped to a plain integer so the sheet matches the way
    // DDOT labels its DAs (e.g. "SDA-1" → 1). If the id is non-numeric fall
    // back to the raw string so unusual ids like "EX-61" still land in col A.
    daId:                              (row) => _daId(row.sdaId),
    hsg:                               (row, p) => _firstHsg(p.sdas, row.sdaId),

    impWithinLod:        (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Impervious Vehicular', 'Impervious Non-Vehicular'], 'postIn'),
    compactedWithinLod:  (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Compacted (Open Space)'], 'postIn'),
    naturalWithinLod:    (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Natural (Woods)'], 'postIn'),

    impOutsideLod:       (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Impervious Vehicular', 'Impervious Non-Vehicular'], 'postOut'),
    compactedOutsideLod: (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Compacted (Open Space)'], 'postOut'),
    naturalOutsideLod:   (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Natural (Woods)'], 'postOut'),

    smallTreesPreserved:           (row, p) => _sumTreesForSda(p, row.sdaId, 'preservedSmall'),
    largeTreesPreserved:           (row, p) => _sumTreesForSda(p, row.sdaId, 'preservedLarge'),
    specialHeritageTreesPreserved: (row, p) => _sumTreesForSdaMulti(p, row.sdaId, ['preservedSpecial', 'preservedHeritage']),
  },
};

// -------- Helpers --------

// Map a phase name to its project-header value cells. The 30% Phase layout
// shifts a column right of the 65/90 layout, so the refs differ.
function _headerRefs(phase) {
  switch (phase) {
    case '30% Phase': return { name: 'D1', number: 'J1', review: 'U1' };
    case '65% Phase': return { name: 'D1', number: 'I1', review: 'T1' };
    case '90% Phase': return { name: 'D1', number: 'I1', review: 'T1' };
    default:          return null;
  }
}

// "SDA-7" → 7, "EX-61" → "EX-61" (keep as-is so the DA tag survives in col A).
function _daId(sdaId) {
  if (sdaId == null) return null;
  const s = String(sdaId);
  const m = /^SDA-(\d+)$/.exec(s);
  if (m) return Number(m[1]);
  // Pure integer id → number.
  if (/^\d+$/.test(s)) return Number(s);
  return s;
}

function _sdaInt(sdaId) {
  if (sdaId == null) return 0;
  const m = /(\d+)/.exec(String(sdaId));
  return m ? Number(m[1]) : 0;
}

// First HSG tag seen for a given SDA (all rows in an SDA share the same soil).
function _firstHsg(sdas, sdaId) {
  const first = sdas.find(s => s.sdaId === sdaId);
  return first ? first.hsg : null;
}

// Sum one of the SDA land-cover fields (preIn/preOut/postIn/postOut) across
// all rows matching an sdaId + land-use list.
function _sumSdaByLandUse(sdas, sdaId, landUses, key) {
  const set = new Set(landUses);
  const total = sdas
    .filter(s => s.sdaId === sdaId && set.has(s.landUse))
    .reduce((n, s) => n + (s[key] || 0), 0);
  // Return null (not 0) so the orchestrator skips the write and preserves
  // the blank's empty cell — the SUM formula on row 45 reads blank as 0.
  return total === 0 ? null : total;
}

// Sum one tree-count field across every BMP sitting in a given SDA.
function _sumTreesForSda(parsed, sdaId, treeKey) {
  const total = (parsed.bmps || [])
    .filter(b => b.sdaId === sdaId && b.trees)
    .reduce((n, b) => n + (b.trees[treeKey] || 0), 0);
  return total === 0 ? null : total;
}

function _sumTreesForSdaMulti(parsed, sdaId, treeKeys) {
  const total = (parsed.bmps || [])
    .filter(b => b.sdaId === sdaId && b.trees)
    .reduce((n, b) => n + treeKeys.reduce((m, k) => m + (b.trees[k] || 0), 0), 0);
  return total === 0 ? null : total;
}

// Reduce the parsed SDAs to one entry per unique sdaId, sorted numerically so
// SDA-1 → row 12, SDA-2 → row 13, …. Mirrors general-retention.mjs.
function _uniqueSdaRows(parsed) {
  const seen = new Set();
  const uniq = [];
  for (const s of parsed.sdas) {
    if (seen.has(s.sdaId)) continue;
    seen.add(s.sdaId);
    uniq.push(s);
  }
  uniq.sort((a, b) => (_sdaInt(a.sdaId)) - (_sdaInt(b.sdaId)));
  return uniq;
}
