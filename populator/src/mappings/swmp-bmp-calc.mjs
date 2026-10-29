// src/mappings/swmp-bmp-calc.mjs
// Mapping for DOEE "SWMP-BMP Calc Spreadsheet" (xlsm with VBA macros).
// xlsx-surgical.mjs preserves xl/vbaProject.bin automatically.
//
// Each BMP-type tab is filled with the FIRST BMP of that type found in the
// parsed template. If additional BMPs of the same type exist, a warning is
// emitted naming the type and the total count; those BMPs are NOT written.
//
// Blank layout investigated against populator/blanks/swmp-bmp-calc.xlsm with
// openpyxl (keep_vba=True, data_only=False):
//
//   Sheet "3.5 Permeable Pavement" (input block rows 55–68):
//     C56 = Design Type dropdown  ("Enhanced" | "Underdrained Enhanced" | "Standard")
//     C57 = Ap / SA (ft²)
//     C58 = dp / d_reservoir (ft)  [also serves as underdrained total depth]
//     C59 = dsump (ft)  [Underdrained Enhanced only; left blank for plain Enhanced]
//     C60 = ŋr (porosity, default 0.4 — we do not overwrite; blank has it)
//     C61 = Ksat (ft/day) — site-specific, left blank for designer
//
//   Sheet "3.6 Bioretention" (input block rows 56–75):
//     C57 = Type dropdown  ("Enhanced" | "Enhanced with Underdrain" | "Standard")
//     C58 = SAtop (ft²)
//     C59 = SAbottom (ft²)
//     C61 = dmedia (ft)
//     C63 = dgravel (ft)
//     C66 = dponding (ft)
//     (C60/C62/C64/C65 are formula or default cells; not overwritten)
//
//   Sheet "3.9 O-2 Dry Swale" (input block rows 28–39):
//     C29 = SAtop (ft²)
//     C30 = SAbottom (ft²)
//     C32 = dmedia (ft)
//     C34 = dgravel (ft)
//     C36 = dponding (ft)
//     (No sub-type dropdown on this sheet)
//
//   Sheet "3.14 Tree Planting Preservation" (input block rows 36–43):
//     C37 = T-1 SMALL  → planted small trees
//     C38 = T-1 LARGE  → planted large trees
//     C39 = T-2 SMALL  → preserved small trees
//     C40 = T-2 LARGE  → preserved large trees
//     C41 = T-2 SPECIAL → preserved special trees
//     C42 = T-2 HERITAGE → preserved heritage trees
//     C43 is a SUM formula — not written.
//
// NOT populated (deferred — these BMP types are absent from the Minnesota Ave
// fixture's bmps array):
//   3.2  Green Roof
//   3.3  Rainwater Harvesting
//   3.4  Impervious Surface Disconnection
//   3.8  Infiltration
//   3.9  O-1 Grass Channel
//   3.9  O-3 Wet Swale
//   3.10, 3.11  SW Ponds + Wetlands
//
// Sub-type normalization (fixture subType → blank dropdown string):
//   Permeable Pavement:
//     "Enhanced"            → "Enhanced"
//     "Underdrained Enhanced" → "Underdrained Enhanced"
//     "Standard"            → "Standard"
//   Bioretention:
//     "Enhanced"            → "Enhanced"
//     "Enhanced w/ Underdrain" or "Enhanced with Underdrain" → "Enhanced with Underdrain"
//     "Standard"            → "Standard"

export const target = {
  id: 'swmp-bmp-calc',
  filename: 'SWMP-BMP Calc Spreadsheet.xlsm',
  blankVersion: '2020-11-25',
  // Only assert the sheets present in the Minnesota Ave BMP set (PP, Bio, Trees).
  // 3.9 O-2 Dry Swale exists in the blank but no Dry Swale BMPs are in the fixture.
  signatureSheets: [
    '3.5 Permeable Pavement',
    '3.6 Bioretention',
    '3.14 Tree Planting Preservation',
  ],

  // build(parsed) generates staticCells dynamically based on the parsed BMPs.
  // The orchestrator shallow-merges the returned object over this target before
  // applying, so tables: [] is explicit (no table writes for this workbook).
  build(parsed, _options) {
    const staticCells = [];
    const warnings = [];

    // Group BMPs by type, preserving parse order (first-seen = first written).
    const bmpsByType = {};
    for (const bmp of (parsed.bmps ?? [])) {
      (bmpsByType[bmp.type] ??= []).push(bmp);
    }

    // Map parsed BMP types to the sheet they populate.
    // Planted Trees and Preserve Trees share the same sheet; if both types
    // appear, they each emit cells independently on the same sheet (additive
    // counts). Only the first BMP within each type gets written; a warning fires
    // if there are more than one BMP per type.
    const typeToSheet = {
      'Permeable Pavement': '3.5 Permeable Pavement',
      'Bioretention':       '3.6 Bioretention',
      'Dry Swale':          '3.9 O-2 Dry Swale',
      'Planted Trees':      '3.14 Tree Planting Preservation',
      'Preserve Trees':     '3.14 Tree Planting Preservation',
    };

    for (const [type, bmps] of Object.entries(bmpsByType)) {
      const sheet = typeToSheet[type];
      if (!sheet) continue;  // unsupported type — silently skip

      const first = bmps[0];

      if (bmps.length > 1) {
        warnings.push(
          `${type}: filled only ${first.name}; template has ${bmps.length} ${type} BMPs.`,
        );
      }

      if (type === 'Permeable Pavement') {
        if (!first.pp) continue;  // guard: pp sub-object must be present
        staticCells.push(
          { sheet, ref: 'C56', value: _ppSubType(first.subType) },
          { sheet, ref: 'C57', value: first.pp.sa },
          { sheet, ref: 'C58', value: first.pp.dReservoir },
        );
      } else if (type === 'Bioretention') {
        if (!first.bio) continue;
        staticCells.push(
          { sheet, ref: 'C57', value: _bioSubType(first.subType) },
          { sheet, ref: 'C58', value: first.bio.saTop },
          { sheet, ref: 'C59', value: first.bio.saBot },
          { sheet, ref: 'C61', value: first.bio.dMedia },
          { sheet, ref: 'C63', value: first.bio.dGravel },
          { sheet, ref: 'C66', value: first.bio.dPond },
        );
      } else if (type === 'Dry Swale') {
        if (!first.bio) continue;
        staticCells.push(
          { sheet, ref: 'C29', value: first.bio.saTop },
          { sheet, ref: 'C30', value: first.bio.saBot },
          { sheet, ref: 'C32', value: first.bio.dMedia },
          { sheet, ref: 'C34', value: first.bio.dGravel },
          { sheet, ref: 'C36', value: first.bio.dPond },
        );
      } else if (type === 'Planted Trees' || type === 'Preserve Trees') {
        if (!first.trees) continue;
        const t = first.trees;
        // Only push non-zero counts so formula cells with zero stay blank.
        if (t.plantedSmall)    staticCells.push({ sheet, ref: 'C37', value: t.plantedSmall });
        if (t.plantedLarge)    staticCells.push({ sheet, ref: 'C38', value: t.plantedLarge });
        if (t.preservedSmall)  staticCells.push({ sheet, ref: 'C39', value: t.preservedSmall });
        if (t.preservedLarge)  staticCells.push({ sheet, ref: 'C40', value: t.preservedLarge });
        if (t.preservedSpecial)   staticCells.push({ sheet, ref: 'C41', value: t.preservedSpecial });
        if (t.preservedHeritage)  staticCells.push({ sheet, ref: 'C42', value: t.preservedHeritage });
      }
    }

    return { staticCells, tables: [], warnings };
  },
};

// -------- Sub-type normalization helpers --------

// Map fixture subType string to the 3.5 Permeable Pavement Design Type dropdown.
function _ppSubType(subType) {
  if (!subType) return null;
  const s = String(subType);
  if (s === 'Standard') return 'Standard';
  if (s === 'Underdrained Enhanced') return 'Underdrained Enhanced';
  // "Enhanced" and any unrecognized value → plain "Enhanced"
  return 'Enhanced';
}

// Map fixture subType string to the 3.6 Bioretention Type dropdown.
function _bioSubType(subType) {
  if (!subType) return null;
  const s = String(subType);
  if (s === 'Standard') return 'Standard';
  if (s === 'Enhanced with Underdrain' || s === 'Enhanced w/ Underdrain') {
    return 'Enhanced with Underdrain';
  }
  // "Enhanced" and any unrecognized value → plain "Enhanced"
  return 'Enhanced';
}
