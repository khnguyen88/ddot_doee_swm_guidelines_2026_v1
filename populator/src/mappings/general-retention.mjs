// src/mappings/general-retention.mjs
// Mapping for DOEE "General Retention Compliance Calculator" (May 4, 2020 blank).
//
// Blank layout investigated against populator/blanks/general-retention.xlsx:
//   Sheet "1. Site Drainage Areas":
//     Project header inputs on row 4:
//       A4 = SWMP Number, B4 = Site Name, C4 = AWDZ (Yes/No),
//       D4 = MS4/CSS classification.
//     Per-SDA table starts at row 9 (rows 9..25 available):
//       D = SDA Number (integer)      E = In PROW? (Yes/No)
//       Pre-Construction (MLD/PROW)   F = Natural G = Compacted H = Impervious I = BMP
//       Pre-Construction (MSI)        K = Natural L = Compacted M = Impervious N = BMP
//       Post-Construction             P = Natural Q = Compacted R = Impervious
//                                     S = Vehicular Access Area  T = BMP
//
//   Sheet "2. BMP Data":
//     Per-BMP table starts at row 7 (rows 7..24 available):
//       B = BMP ID (auto = CONCATENATE(C,"-",D))
//       C = SDA Number (integer)      D = BMP Number in SDA
//       E = BMP Name (optional)       F = BMP Group (dropdown from 'BMP Types'!A)
//       G = Disconnection Area        H = Sump Storage Volume (PP Enhanced w/ UD)
//       I = Number of trees
//       J-M = CDA Pre-Construction Land Cover (Natural/Compacted/Impervious/BMP)
//       N = Vehicular Access Area in CDA
//       S = Storage Volume Provided by BMP (Sv, CF) — user entry
//
//   Sheet "3. Detention":
//     Per-SDA table starts at row 8 (rows 8..24 available). Columns B-F, H, J, L
//     are auto-formulas pulled from "1. Site Drainage Areas". The user-editable
//     CN inputs are:
//       G = Natural CN   I = Compacted CN   K = Impervious CN   M = BMP CN
//     The blank has no 2yr/15yr Q columns on this sheet — detention compliance
//     flows out of these CNs via the Weighted CN (N) and S (O) cells, which the
//     blank computes with formulas we must preserve.
//
// Signature sheets picked to detect template drift.

export const target = {
  id: 'general-retention',
  filename: 'General Retention Compliance Calculator.xlsx',
  blankVersion: '2020-05-04',
  signatureSheets: [
    'Compliance Check Summary',
    '1. Site Drainage Areas',
    '2. BMP Data',
    '3. Detention',
  ],

  // -------- Project header on "1. Site Drainage Areas" --------
  staticCells: [
    { sheet: '1. Site Drainage Areas', ref: 'A4', from: 'project.number' },
    { sheet: '1. Site Drainage Areas', ref: 'B4', from: 'project.name' },
    { sheet: '1. Site Drainage Areas', ref: 'C4', from: 'project.awdz' },
    { sheet: '1. Site Drainage Areas', ref: 'D4', from: 'project.ms4' },
  ],

  tables: [
    // ---------------- Per-SDA land cover ----------------
    {
      sheet: '1. Site Drainage Areas',
      firstDataRow: 9,
      source: _uniqueSdaRows,  // function source — see populate.mjs rowsForTable
      columns: [
        { col: 'D', from: '*derive:sdaNumber' },
        { col: 'E', from: '*derive:inProw' },
        // Pre-Construction (MLD/PROW)
        { col: 'F', from: '*derive:preNaturalSf' },
        { col: 'G', from: '*derive:preCompactedSf' },
        { col: 'H', from: '*derive:preImperviousSf' },
        { col: 'I', from: '*derive:preBmpSf' },
        // Post-Construction
        { col: 'P', from: '*derive:postNaturalSf' },
        { col: 'Q', from: '*derive:postCompactedSf' },
        { col: 'R', from: '*derive:postImperviousNonVehSf' },
        { col: 'S', from: '*derive:postVehicularSf' },
        { col: 'T', from: '*derive:postBmpSf' },
      ],
    },

    // ---------------- Per-BMP data ----------------
    {
      sheet: '2. BMP Data',
      firstDataRow: 7,
      source: 'bmps',
      columns: [
        { col: 'C', from: '*derive:bmpSdaNumber' },
        { col: 'D', from: '*derive:bmpNumberInSda' },
        { col: 'E', from: 'name' },
        { col: 'F', from: '*derive:bmpGroup' },
        { col: 'I', from: '*derive:bmpTreeCount' },
        // CDA land cover (within LOD) addressed by this BMP
        { col: 'J', from: '*derive:cdaNaturalSf' },
        { col: 'K', from: '*derive:cdaCompactedSf' },
        { col: 'L', from: '*derive:cdaImperviousSf' },
        { col: 'M', from: '*derive:cdaBmpSf' },
        // Storage volume provided by this BMP
        { col: 'S', from: '*derive:sv' },
      ],
    },

    // ---------------- Per-SDA detention CNs ----------------
    // The blank already drops default CN values (70/74/98/98) into G/I/K/M via
    // simple formulas. We overwrite those with the parameter-driven values so
    // that any project-specific adjustments carry through.
    {
      sheet: '3. Detention',
      firstDataRow: 8,
      source: _uniqueSdaRows,
      columns: [
        { col: 'G', from: '*derive:detentionNaturalCn' },
        { col: 'I', from: '*derive:detentionCompactedCn' },
        { col: 'K', from: '*derive:detentionImperviousCn' },
        { col: 'M', from: '*derive:detentionBmpCn' },
      ],
    },
  ],

  derivations: {
    // ---------- SDA table ----------
    sdaNumber:               (row) => _sdaInt(row.sdaId),
    inProw:                  (row) => row.inProw,

    preNaturalSf:            (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Natural (Woods)'], 'preIn'),
    preCompactedSf:          (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Compacted (Open Space)'], 'preIn'),
    preImperviousSf:         (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Impervious Vehicular', 'Impervious Non-Vehicular'], 'preIn'),
    preBmpSf:                (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['BMP'], 'preIn'),

    postNaturalSf:           (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Natural (Woods)'], 'postIn'),
    postCompactedSf:         (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Compacted (Open Space)'], 'postIn'),
    // Post impervious NON-vehicular only (vehicular goes in its own column)
    postImperviousNonVehSf:  (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Impervious Non-Vehicular'], 'postIn'),
    postVehicularSf:         (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['Impervious Vehicular'], 'postIn'),
    postBmpSf:               (row, p) => _sumSdaByLandUse(p.sdas, row.sdaId, ['BMP'], 'postIn'),

    // ---------- BMP table ----------
    bmpSdaNumber:            (bmp) => _sdaInt(bmp.sdaId),
    bmpNumberInSda:          (bmp) => _bmpSuffix(bmp.name),
    bmpGroup:                (bmp) => _bmpGroup(bmp),
    bmpTreeCount:            (bmp) => _bmpTreeCount(bmp),

    cdaNaturalSf:            (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Natural (Woods)']),
    cdaCompactedSf:          (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Compacted (Open Space)']),
    cdaImperviousSf:         (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['Impervious Vehicular', 'Impervious Non-Vehicular']),
    cdaBmpSf:                (bmp, p) => _sumCdaByLandUse(p.cdas, bmp.cdaId, ['BMP']),

    sv:                      (bmp, p) => _computeSv(bmp, p),

    // ---------- Detention CNs ----------
    detentionNaturalCn:      (_row, p) => p.params.detentionCn?.Natural ?? 70,
    detentionCompactedCn:    (_row, p) => p.params.detentionCn?.Compacted ?? 74,
    detentionImperviousCn:   (_row, p) => p.params.detentionCn?.Impervious ?? 98,
    detentionBmpCn:          (_row, p) => p.params.detentionCn?.BMP ?? 98,
  },
};

// ---------------- Helpers ----------------

// Strip "SDA-" prefix and return an integer.  "SDA-7" → 7, "7" → 7.
function _sdaInt(sdaId) {
  if (sdaId == null) return null;
  const m = /(\d+)/.exec(String(sdaId));
  return m ? Number(m[1]) : null;
}

// Extract the BMP suffix within an SDA from a canonical BMP name like
// "BMP-02-A" → "A", "BMP-10-T" → "T".
function _bmpSuffix(name) {
  if (!name) return null;
  const m = /-([A-Za-z0-9]+)$/.exec(String(name));
  return m ? m[1] : name;
}

// Compute the dropdown-friendly "BMP Group" string (matches 'BMP Types'!A).
// Fixture uses `type` ∈ {Bioretention, Permeable Pavement, Dry Swale, Planted Trees, Preserve Trees}
// and `subType` ∈ {Standard, Enhanced, Underdrained Enhanced, '—', ...}.
function _bmpGroup(bmp) {
  const type = bmp.type;
  const sub = bmp.subType;
  if (!type) return null;
  if (type === 'Bioretention') {
    if (sub === 'Standard') return 'Bioretention - Standard';
    return 'Bioretention - Enhanced';
  }
  if (type === 'Permeable Pavement') {
    if (sub === 'Standard') return 'Permeable Pavement - Standard';
    if (sub === 'Underdrained Enhanced') return 'Permeable Pavement - Enhanced w/ Underdrain';
    return 'Permeable Pavement - Enhanced w/o Underdrain';
  }
  if (type === 'Dry Swale')             return 'Dry Swale';
  if (type === 'Wet Swale')             return 'Wet Swale';
  if (type === 'Grass Channel')         return 'Grass Channel';
  if (type === 'Filtering System')      return 'Filtering System';
  if (type === 'Infiltration')          return 'Infiltration';
  if (type === 'Green Roof')            return 'Green Roof';
  if (type === 'Rainwater Harvesting')  return 'Rainwater Harvesting';
  // Tree BMPs — one BMP row may represent multiple tree classes; map by
  // whichever tree class is present (prefer the single most common one when
  // a row only reports one class).
  if (type === 'Planted Trees' || type === 'Preserve Trees') {
    const t = bmp.trees || {};
    if ((t.plantedSmall || 0) > 0)     return 'Tree Planting - Small Tree';
    if ((t.plantedLarge || 0) > 0)     return 'Tree Planting - Large Tree';
    if ((t.preservedHeritage || 0) > 0) return 'Tree Preservation - Heritage Tree';
    if ((t.preservedSpecial || 0) > 0)  return 'Tree Preservation - Special Tree';
    if ((t.preservedLarge || 0) > 0)    return 'Tree Preservation - Large Tree';
    if ((t.preservedSmall || 0) > 0)    return 'Tree Preservation - Small Tree';
    return type === 'Planted Trees' ? 'Tree Planting - Small Tree' : 'Tree Preservation - Small Tree';
  }
  return type;
}

function _bmpTreeCount(bmp) {
  if (!bmp.trees) return null;
  const t = bmp.trees;
  return (t.plantedSmall || 0) + (t.plantedLarge || 0) +
         (t.preservedSmall || 0) + (t.preservedLarge || 0) +
         (t.preservedSpecial || 0) + (t.preservedHeritage || 0);
}

// Sum a parsed SDA field across all rows matching an sdaId + landUse list.
function _sumSdaByLandUse(sdas, sdaId, landUses, key) {
  const set = new Set(landUses);
  return sdas
    .filter(s => s.sdaId === sdaId && set.has(s.landUse))
    .reduce((n, s) => n + (s[key] || 0), 0);
}

// Sum a parsed CDA's withinLodSf across rows matching cdaId + landUse list.
function _sumCdaByLandUse(cdas, cdaId, landUses) {
  if (!cdaId) return 0;
  const set = new Set(landUses);
  return cdas
    .filter(c => c.cdaId === cdaId && set.has(c.landUse))
    .reduce((n, c) => n + (c.withinLodSf || 0), 0);
}

// Compute Sv (storage volume provided by this BMP, in CF).
// Permeable Pavement:  Sv = SA × d_reservoir × n_reservoir
// Bioretention/DrySwale: Sv = SA_bot × (d_media·n_media + d_gravel·n_gravel + d_pond)
// Tree BMPs and other practices: null (sized elsewhere via Group + tree count).
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
    const nMedia = typeof d.nMedia === 'number' ? d.nMedia : 0.40;
    const nGravel = typeof d.nGravel === 'number' ? d.nGravel : 0.40;
    return bmp.bio.saBot * (bmp.bio.dMedia * nMedia + bmp.bio.dGravel * nGravel + bmp.bio.dPond);
  }
  return null;
}

// Return the parsed SDAs reduced to one entry per unique sdaId, preserving
// first-seen order (important: SDA #1 → row 9, SDA #2 → row 10, …).
function _uniqueSdaRows(parsed) {
  const seen = new Set();
  const uniq = [];
  for (const s of parsed.sdas) {
    if (seen.has(s.sdaId)) continue;
    seen.add(s.sdaId);
    uniq.push(s);
  }
  // Stable sort by numeric sdaId so SDA-1 is always first, SDA-10 is after SDA-9.
  uniq.sort((a, b) => (_sdaInt(a.sdaId) ?? 0) - (_sdaInt(b.sdaId) ?? 0));
  return uniq;
}
