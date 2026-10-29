// src/mappings/swdb-prow.mjs
// Mapping for DOEE "SWDB Template for PROW Information" (July 2025 blank).
//
// Blank layout investigated against populator/blanks/swdb-prow.xlsx with
// SheetJS (Node.js); full sheet list:
//   Instructions, Drainage Areas, Drainage Areas (Import), BMPs, BMPs (Import),
//   Watersheds, BMP Types, Saved Values, Proprietary Practice
//
// The "(Import)" tabs auto-populate via Excel formulas that mirror the user
// input tabs — DO NOT write into them. Only "Drainage Areas" and "BMPs" are
// touched.
//
// === Sheet "Drainage Areas" (ref A1:Q503) ===
//   Row 1: (empty / merged title)
//   Row 2: section headings
//     C2="Post Project Land Cover (square feet)"
//     H2="Pre Project Land Cover (square feet)"
//     M2="Complete these columns only if conditions are not consistent..."
//   Row 3: column headers
//     B3="Drainage Area Number"
//     Post-Construction:
//       C3="Natural"  D3="Compacted"  E3="Impervious"  F3="BMP"  G3="Vehicular Access Area"
//     Pre-Construction:
//       H3="Natural"  I3="Compacted"  J3="Impervious"  K3="BMP"  L3="Vehicular Access Area"
//     Conditional:
//       M3="Is the Drainage Area in the AWDZ?"  N3="Is the Drainage Area in the CSS?"
//       O3="Major Drainage Area"  P3="Minor Drainage Area"
//   Row 4+: data rows (up to ~500 in the blank)
//
// NOTE: Column A is present in the sheet ref but holds no header. Column B
// (Drainage Area Number) is an AUTO-FORMULA: `IF(SUM(C4:L4)>0, 1, "")`. The
// blank auto-fills the sequential DA number based on whether any land cover
// cell in C..L is non-zero. DO NOT write to column B — it will be overwritten
// by the formula as soon as Excel recalculates. Write C..L (land cover) and B
// auto-populates. Rows 4..503 are the usable data slots.
//
// === Sheet "BMPs" (ref A1:AC503) ===
//   Row 2: section headings
//     L2="Post Project Contributing Drainage Area (square feet)"
//     Q2="Pre Project Contributing Drainage Area (square feet)"
//     V2="Enter as applicable for BMPs"
//   Row 3: column headers
//     B3="BMP ID Number"     (auto-formula = C-D, do NOT write here)
//     C3="Drainage Area Number"
//     D3="BMP Number"        (suffix letter within SDA, e.g. "A", "T")
//     E3="X Coordinate"      (leave blank v1)
//     F3="Y Coordinate"      (leave blank v1)
//     G3="Latitude"          (leave blank v1)
//     H3="Longtitude"        (leave blank v1 — typo is in the blank itself)
//     I3="BMP Name (optional)"
//     J3="BMP Group"         (dropdown from 'BMP Types'!A column)
//     K3="BMP type"          (dropdown from 'BMP Types'!B-K row matching group)
//     Post CDA land cover:
//       L3="Natural"  M3="Compacted"  N3="Impervious"  O3="BMP"  P3="Vehicular Access Area"
//     Pre CDA land cover:
//       Q3="Natural"  R3="Compacted"  S3="Impervious"  T3="BMP"  U3="Vehicular Access Area"
//     V3="BMP storage volume (cubic feet)"
//     W3="Disconnection Receiving area (square feet)"
//     X3="Is the BMP an enhanced practice with an underdrain?"
//     Y3="Infiltration Sump Storage Volume (cubic feet)"
//     Z3="Name of proprietary practice"
//     AA3="Describe proprietary practice"
//     AB3="Number of trees"
//   Row 4+: data rows (up to ~500)
//
// === BMP Group / Type vocabulary (from 'BMP Types' sheet) ===
//   "Green Roof"                 → Extensive green roof | Intensive green roof
//   "Rainwater Harvesting"       → Rainwater harvesting
//   "Impervious Surface Disconnection" → (4 sub-types)
//   "Permeable Pavement"         → Porous asphalt - Enhanced | Porous asphalt - Standard |
//                                   Pervious concrete - Enhanced | Pervious concrete - Standard |
//                                   Permeable pavers - Enhanced | Permeable pavers - Standard
//   "Bioretention"               → Traditional bioretention - Enhanced |
//                                   Traditional bioretention - Standard |
//                                   Streetscape bioretention - Enhanced |
//                                   Engineered tree pits - Enhanced |
//                                   Residential rain gardens - Enhanced |
//                                   Streetscape bioretention - Standard |
//                                   Engineered treepits - Standard |
//                                   Stormwater planters - Enhanced |
//                                   Stormwater planters - Standard |
//                                   Residential rain gardens - Standard
//   "Filtering System"           → Non-structural sand filter | ... (3 more)
//   "Infiltration"               → Infiltration trench | Infiltration basin
//   "Open Channel"               → Grass channel | Grass channel - amended soils |
//                                   Dry swale | Wet Swale
//   "Ponds"                      → (3 sub-types)
//   "Wetlands"                   → (2 sub-types)
//   "Storage"                    → (4 sub-types)
//   "Proprietary Practice"       → Proprietary practice
//   "Tree Planting and Preservation" →
//       Tree planting - Average spread > 40 feet |
//       Tree planting - Average spread < 40 feet |
//       Tree preservation - Average spread > 40 feet |
//       Tree preservation - Average spread <40 feet |
//       Tree preservation - Heritage Trees |
//       Tree preservation - Special
//
// Vocabulary translation notes:
//   • parsed `type="Bioretention"` maps to Group "Bioretention".
//     subType "Enhanced" → "Traditional bioretention - Enhanced"
//     subType "Standard" → "Traditional bioretention - Standard"
//     Streetscape / Engineered / Planter variants not in fixture; mapped to
//     standard group default ("Traditional bioretention - Standard") as
//     fallback when subType is not recognised.
//   • parsed `type="Permeable Pavement"` maps to Group "Permeable Pavement".
//     subType "Enhanced"             → "Porous asphalt - Enhanced"  (PROW default)
//     subType "Standard"             → "Porous asphalt - Standard"
//     subType "Underdrained Enhanced"→ "Porous asphalt - Enhanced"
//   • parsed `type="Dry Swale"` → Group "Open Channel", Type "Dry swale"
//   • parsed `type="Wet Swale"` → Group "Open Channel", Type "Wet Swale"
//   • parsed `type="Grass Channel"` → Group "Open Channel", Type "Grass channel"
//   • parsed `type="Green Roof"`    → Group "Green Roof", Type "Extensive green roof"
//   • parsed `type="Rainwater Harvesting"` → Group "Rainwater Harvesting",
//                                            Type "Rainwater harvesting"
//   • parsed `type="Filtering System"`     → Group "Filtering System",
//                                            Type "Non-structural sand filter"
//   • parsed `type="Infiltration"`         → Group "Infiltration",
//                                            Type "Infiltration trench"
//   • parsed `type="Planted Trees"` → Group "Tree Planting and Preservation"
//     spread key not stored in parser; default to < 40 ft type
//     ("Tree planting - Average spread < 40 feet")
//   • parsed `type="Preserve Trees"` → Group "Tree Planting and Preservation"
//     default to "Tree preservation - Average spread <40 feet"
//
// No project-level header cells were found on the "Drainage Areas" or "BMPs"
// sheets — the SWDB template does not ask for project name/number in those
// tabs. staticCells array is therefore empty.
//
// Signature sheets pick up likely template drift indicators.

export const target = {
  id: 'swdb-prow',
  filename: 'SWDB Template for PROW Information.xlsx',
  blankVersion: '2025-07',
  signatureSheets: ['Drainage Areas', 'BMPs'],

  // No project-level header cells on these sheets.
  staticCells: [],

  tables: [
    // -------- Per-SDA land cover ("Drainage Areas") --------
    {
      sheet: 'Drainage Areas',
      firstDataRow: 4,
      source: _uniqueSdaRows,
      columns: [
        // B = Drainage Area Number is an AUTO-FORMULA — do NOT write.
        //   Formula: IF(SUM(C4:L4)>0, 1, "") auto-fills a sequential integer
        //   when any land cover cell in C..L is non-zero. Writing C..L is enough.
        // Post-Construction land cover
        { col: 'C', from: '*derive:postNaturalSf' },
        { col: 'D', from: '*derive:postCompactedSf' },
        { col: 'E', from: '*derive:postImperviousSf' },
        { col: 'F', from: '*derive:postBmpSf' },
        { col: 'G', from: '*derive:postVehicularSf' },
        // Pre-Construction land cover
        { col: 'H', from: '*derive:preNaturalSf' },
        { col: 'I', from: '*derive:preCompactedSf' },
        { col: 'J', from: '*derive:preImperviousSf' },
        { col: 'K', from: '*derive:preBmpSf' },
        { col: 'L', from: '*derive:preVehicularSf' },
        // Conditional columns (AWDZ, CSS) — from parsed SDA row
        { col: 'M', from: '*derive:awdz' },
        { col: 'N', from: '*derive:css' },
        // O = Major Drainage Area, P = Minor Drainage Area — left blank v1;
        // watershed assignment is not stored in the parsed template.
      ],
    },

    // -------- Per-BMP data ("BMPs") --------
    {
      sheet: 'BMPs',
      firstDataRow: 4,
      source: 'bmps',
      columns: [
        // B = BMP ID Number is an auto-formula in the blank — do NOT write.
        // C = Drainage Area Number (integer extracted from sdaId)
        { col: 'C', from: '*derive:bmpSdaNumber' },
        // D = BMP Number (suffix letter within SDA, e.g. "A", "T")
        { col: 'D', from: '*derive:bmpNumberInSda' },
        // E-H = coordinates — left blank v1 (GPS/GIS info not in parsed template)
        // I = BMP Name (optional)
        { col: 'I', from: 'name' },
        // J = BMP Group, K = BMP type (SWDB dropdown vocabulary)
        { col: 'J', from: '*derive:bmpGroup' },
        { col: 'K', from: '*derive:bmpType' },
        // Post CDA land cover
        { col: 'L', from: '*derive:cdaPostNaturalSf' },
        { col: 'M', from: '*derive:cdaPostCompactedSf' },
        { col: 'N', from: '*derive:cdaPostImperviousSf' },
        { col: 'O', from: '*derive:cdaPostBmpSf' },
        { col: 'P', from: '*derive:cdaPostVehicularSf' },
        // Pre CDA land cover
        { col: 'Q', from: '*derive:cdaPreNaturalSf' },
        { col: 'R', from: '*derive:cdaPreCompactedSf' },
        { col: 'S', from: '*derive:cdaPreImperviousSf' },
        { col: 'T', from: '*derive:cdaPreBmpSf' },
        { col: 'U', from: '*derive:cdaPreVehicularSf' },
        // V = BMP storage volume (CF) — Sv
        { col: 'V', from: '*derive:sv' },
        // W = Disconnection area — left blank v1
        // X = Enhanced w/ underdrain? — left blank v1 (could derive from subType)
        // Y = Infiltration sump — left blank v1
        // Z, AA = Proprietary — left blank v1
        // AB = Number of trees
        { col: 'AB', from: '*derive:treeCount' },
      ],
    },
  ],

  derivations: {
    // -------- SDA table --------
    // sdaNumber not needed — column B is an auto-formula in the blank.
    awdz:               (row) => row.awdz ?? null,   // not stored in SDA rows; null → skip
    css:                (row) => row.css  ?? null,   // not stored in SDA rows; null → skip

    // Post-Construction land cover
    postNaturalSf:      (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Natural (Woods)'], 'postIn'),
    postCompactedSf:    (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Compacted (Open Space)'], 'postIn'),
    // SWDB "Impervious" column = Non-Vehicular only (vehicular goes in its own column G)
    postImperviousSf:   (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Impervious Non-Vehicular'], 'postIn'),
    postBmpSf:          (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['BMP'], 'postIn'),
    postVehicularSf:    (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Impervious Vehicular'], 'postIn'),

    // Pre-Construction land cover
    preNaturalSf:       (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Natural (Woods)'], 'preIn'),
    preCompactedSf:     (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Compacted (Open Space)'], 'preIn'),
    preImperviousSf:    (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Impervious Non-Vehicular'], 'preIn'),
    preBmpSf:           (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['BMP'], 'preIn'),
    preVehicularSf:     (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Impervious Vehicular'], 'preIn'),

    // -------- BMP table --------
    bmpSdaNumber:       (bmp) => _sdaInt(bmp.sdaId),
    bmpNumberInSda:     (bmp) => _bmpSuffix(bmp.name),
    bmpGroup:           (bmp) => _bmpGroup(bmp),
    bmpType:            (bmp) => _bmpType(bmp),
    treeCount:          (bmp) => _bmpTreeCount(bmp),

    // Post CDA land cover (what drains to this BMP, post-construction)
    cdaPostNaturalSf:    (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Natural (Woods)'], 'postIn'),
    cdaPostCompactedSf:  (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Compacted (Open Space)'], 'postIn'),
    cdaPostImperviousSf: (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Impervious Non-Vehicular'], 'postIn'),
    cdaPostBmpSf:        (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['BMP'], 'postIn'),
    cdaPostVehicularSf:  (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Impervious Vehicular'], 'postIn'),

    // Pre CDA land cover
    cdaPreNaturalSf:    (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Natural (Woods)'], 'preIn'),
    cdaPreCompactedSf:  (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Compacted (Open Space)'], 'preIn'),
    cdaPreImperviousSf: (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Impervious Non-Vehicular'], 'preIn'),
    cdaPreBmpSf:        (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['BMP'], 'preIn'),
    cdaPreVehicularSf:  (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Impervious Vehicular'], 'preIn'),

    // Storage volume (Sv, CF)
    sv:                 (bmp, p) => _computeSv(bmp, p),
  },
};

// ────────────────── Helpers ──────────────────

// Strip "SDA-" prefix → integer. "SDA-7" → 7, "7" → 7.
function _sdaInt(sdaId) {
  if (sdaId == null) return null;
  const m = /(\d+)/.exec(String(sdaId));
  return m ? Number(m[1]) : null;
}

// Extract the BMP suffix within an SDA: "BMP-02-A" → "A", "BMP-10-T" → "T".
function _bmpSuffix(name) {
  if (!name) return null;
  const m = /-([A-Za-z0-9]+)$/.exec(String(name));
  return m ? m[1] : name;
}

// Map parsed BMP type+subType to the SWDB "BMP Group" dropdown (column J).
// Vocabulary source: 'BMP Types'!A column in swdb-prow.xlsx.
function _bmpGroup(bmp) {
  const type = bmp.type;
  if (!type) return null;
  if (type === 'Bioretention')           return 'Bioretention';
  if (type === 'Permeable Pavement')     return 'Permeable Pavement';
  if (type === 'Dry Swale')              return 'Open Channel';
  if (type === 'Wet Swale')              return 'Open Channel';
  if (type === 'Grass Channel')          return 'Open Channel';
  if (type === 'Filtering System')       return 'Filtering System';
  if (type === 'Infiltration')           return 'Infiltration';
  if (type === 'Green Roof')             return 'Green Roof';
  if (type === 'Rainwater Harvesting')   return 'Rainwater Harvesting';
  if (type === 'Planted Trees' || type === 'Preserve Trees') {
    return 'Tree Planting and Preservation';
  }
  return type;  // pass through unknown types unchanged
}

// Map parsed BMP type+subType to the SWDB "BMP type" dropdown (column K).
// Vocabulary source: 'BMP Types'!B-K columns in swdb-prow.xlsx.
// Decision notes:
//   • Permeable Pavement Enhanced defaults to "Porous asphalt - Enhanced" — most
//     common PROW material; no material sub-field in the parsed template v1.
//   • Tree spread (> 40 ft vs < 40 ft) is not stored; default to < 40 ft.
function _bmpType(bmp) {
  const type = bmp.type;
  const sub  = bmp.subType;
  if (!type) return null;

  if (type === 'Bioretention') {
    if (sub === 'Enhanced') return 'Traditional bioretention - Enhanced';
    if (sub === 'Standard') return 'Traditional bioretention - Standard';
    return 'Traditional bioretention - Standard';
  }
  if (type === 'Permeable Pavement') {
    if (sub === 'Standard')             return 'Porous asphalt - Standard';
    if (sub === 'Enhanced')             return 'Porous asphalt - Enhanced';
    if (sub === 'Underdrained Enhanced') return 'Porous asphalt - Enhanced';
    return 'Porous asphalt - Standard';
  }
  if (type === 'Dry Swale')            return 'Dry swale';
  if (type === 'Wet Swale')            return 'Wet Swale';
  if (type === 'Grass Channel')        return 'Grass channel';
  if (type === 'Filtering System')     return 'Non-structural sand filter';
  if (type === 'Infiltration')         return 'Infiltration trench';
  if (type === 'Green Roof')           return 'Extensive green roof';
  if (type === 'Rainwater Harvesting') return 'Rainwater harvesting';
  if (type === 'Planted Trees') {
    // No spread data in parser v1 — default to < 40 ft.
    return 'Tree planting - Average spread < 40 feet';
  }
  if (type === 'Preserve Trees') {
    return 'Tree preservation - Average spread <40 feet';
  }
  return null;
}

// Count all tree classes for a BMP row.
function _bmpTreeCount(bmp) {
  if (!bmp.trees) return null;
  const t = bmp.trees;
  const total = (t.plantedSmall || 0) + (t.plantedLarge || 0) +
                (t.preservedSmall || 0) + (t.preservedLarge || 0) +
                (t.preservedSpecial || 0) + (t.preservedHeritage || 0);
  return total > 0 ? total : null;
}

// Sum a parsed SDA land-cover field (preIn/preOut/postIn/postOut) across all
// rows matching sdaId + any of the given landUse strings.
function _sumSdaByLandUse(sdas, sdaId, landUses, key) {
  const set = new Set(landUses);
  const total = sdas
    .filter(s => s.sdaId === sdaId && set.has(s.landUse))
    .reduce((n, s) => n + (s[key] || 0), 0);
  // Return null (not 0) so the orchestrator skips the write and the blank's
  // cell stays empty (looks cleaner and avoids overwriting formula cells).
  return total === 0 ? null : total;
}

// Sum a parsed CDA land-cover field across rows matching cdaId + landUses.
function _sumCdaByLandUse(cdas, cdaId, landUses, key) {
  if (!cdaId) return null;
  const set = new Set(landUses);
  const total = cdas
    .filter(c => c.cdaId === cdaId && set.has(c.landUse))
    .reduce((n, c) => n + (c[key] || 0), 0);
  return total === 0 ? null : total;
}

// Compute Sv (storage volume provided, CF).
// Permeable Pavement: Sv = SA × d_reservoir × n_reservoir
// Bioretention / Dry Swale: Sv = SA_bot × (d_media·n_media + d_gravel·n_gravel + d_pond)
// Other types: null (not applicable or sized via tree-count logic).
function _computeSv(bmp, parsed) {
  const design = parsed.params?.bmpDesign || {};
  if (bmp.type === 'Permeable Pavement' && bmp.pp) {
    const key = `Permeable Pavement / ${bmp.subType}`;
    const d = design[key] || { nReservoir: 0.40 };
    const n = typeof d.nReservoir === 'number' ? d.nReservoir : 0.40;
    return bmp.pp.sa * bmp.pp.dReservoir * n;
  }
  if ((bmp.type === 'Bioretention' || bmp.type === 'Dry Swale') && bmp.bio) {
    const key = `${bmp.type} / ${bmp.subType}`;
    const d = design[key] || { nMedia: 0.40, nGravel: 0.40 };
    const nMedia  = typeof d.nMedia  === 'number' ? d.nMedia  : 0.40;
    const nGravel = typeof d.nGravel === 'number' ? d.nGravel : 0.40;
    return bmp.bio.saBot * (bmp.bio.dMedia * nMedia + bmp.bio.dGravel * nGravel + bmp.bio.dPond);
  }
  return null;
}

// Reduce parsed.sdas to one entry per unique sdaId, sorted numerically.
// SDA-1 → row 4, SDA-2 → row 5, …
function _uniqueSdaRows(parsed) {
  const seen = new Set();
  const uniq = [];
  for (const s of parsed.sdas) {
    if (seen.has(s.sdaId)) continue;
    seen.add(s.sdaId);
    uniq.push(s);
  }
  uniq.sort((a, b) => (_sdaInt(a.sdaId) ?? 0) - (_sdaInt(b.sdaId) ?? 0));
  return uniq;
}
