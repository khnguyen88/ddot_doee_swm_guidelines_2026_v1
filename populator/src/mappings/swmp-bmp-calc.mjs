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

  // build(parsed) generates fanOut entries dynamically — one per BMP.
  // The orchestrator detects fanOut[] and emits N outputs from one blank.
  build(parsed, _options) {
    const warnings = [];
    const fanOut = [];

    const typeToSheet = {
      'Permeable Pavement': '3.5 Permeable Pavement',
      'Bioretention':       '3.6 Bioretention',
      'Dry Swale':          '3.9 O-2 Dry Swale',
      'Planted Trees':      '3.14 Tree Planting Preservation',
      'Preserve Trees':     '3.14 Tree Planting Preservation',
    };

    const sanitize = (name) =>
      String(name || 'unnamed').replace(/[\/\\:*?"<>|]/g, '_');

    const usedFilenames = new Set();
    const uniqueFilename = (base) => {
      let name = base;
      let i = 2;
      while (usedFilenames.has(name)) name = base.replace(/\.xlsm$/, `-${i++}.xlsm`);
      usedFilenames.add(name);
      return name;
    };

    for (const bmp of (parsed.bmps ?? [])) {
      const sheet = typeToSheet[bmp.type];
      if (!sheet) continue;

      const cells = [];
      if (bmp.type === 'Permeable Pavement') {
        if (!bmp.pp) { warnings.push(`${bmp.name}: missing pp sub-object; skipped.`); continue; }
        cells.push(
          { sheet, ref: 'C56', value: _ppSubType(bmp.subType) },
          { sheet, ref: 'C57', value: bmp.pp.sa },
          { sheet, ref: 'C58', value: bmp.pp.dReservoir },
        );
      } else if (bmp.type === 'Bioretention') {
        if (!bmp.bio) { warnings.push(`${bmp.name}: missing bio sub-object; skipped.`); continue; }
        cells.push(
          { sheet, ref: 'C57', value: _bioSubType(bmp.subType) },
          { sheet, ref: 'C58', value: bmp.bio.saTop },
          { sheet, ref: 'C59', value: bmp.bio.saBot },
          { sheet, ref: 'C61', value: bmp.bio.dMedia },
          { sheet, ref: 'C63', value: bmp.bio.dGravel },
          { sheet, ref: 'C66', value: bmp.bio.dPond },
        );
      } else if (bmp.type === 'Dry Swale') {
        if (!bmp.bio) { warnings.push(`${bmp.name}: missing bio sub-object; skipped.`); continue; }
        cells.push(
          { sheet, ref: 'C29', value: bmp.bio.saTop },
          { sheet, ref: 'C30', value: bmp.bio.saBot },
          { sheet, ref: 'C32', value: bmp.bio.dMedia },
          { sheet, ref: 'C34', value: bmp.bio.dGravel },
          { sheet, ref: 'C36', value: bmp.bio.dPond },
        );
      } else if (bmp.type === 'Planted Trees' || bmp.type === 'Preserve Trees') {
        if (!bmp.trees) { warnings.push(`${bmp.name}: missing trees sub-object; skipped.`); continue; }
        const t = bmp.trees;
        if (t.plantedSmall)      cells.push({ sheet, ref: 'C37', value: t.plantedSmall });
        if (t.plantedLarge)      cells.push({ sheet, ref: 'C38', value: t.plantedLarge });
        if (t.preservedSmall)    cells.push({ sheet, ref: 'C39', value: t.preservedSmall });
        if (t.preservedLarge)    cells.push({ sheet, ref: 'C40', value: t.preservedLarge });
        if (t.preservedSpecial)  cells.push({ sheet, ref: 'C41', value: t.preservedSpecial });
        if (t.preservedHeritage) cells.push({ sheet, ref: 'C42', value: t.preservedHeritage });
      }

      if (cells.length === 0) continue;

      const base = `SWMP-BMP Calc Spreadsheet - ${sanitize(bmp.name)}.xlsm`;
      fanOut.push({ filename: uniqueFilename(base), cells });
    }

    return { staticCells: [], tables: [], warnings, fanOut };
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
