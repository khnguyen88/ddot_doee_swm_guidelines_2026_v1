// src/parse.mjs — XLSX → structured JS object. SheetJS workbook comes from caller.

const REQUIRED_SHEETS = ['PROJECT', 'SDA_Existing', 'SDA_Proposed',
                         'CDA_Existing', 'CDA_Proposed', 'BMP', 'PARAMS'];

const LEGACY_SHEETS = ['SDA', 'CDA'];

// Data scan starts at row 4. Rather than a hard-coded last row, we scan
// until EMPTY_ROW_SENTINEL consecutive fully-empty input rows have been
// seen AFTER at least one data row, allowing users to add arbitrary rows
// beyond the template's n_rows. Summary rollups moved off these sheets
// onto Area_Summary (see workbook/builders/area_summary.py), so there is
// no risk of colliding with an "SDA-1"/"CDA-1" summary label.
const DATA_FIRST_ROW = 4;
const EMPTY_ROW_SENTINEL = 5;
// Hard safety ceiling in case someone leaves styled-but-empty cells way
// below the data. Practically no real project reaches this.
const DATA_MAX_ROW = 10000;

function rejectLegacySchema(wb) {
  for (const name of LEGACY_SHEETS) {
    if (wb.SheetNames.includes(name) &&
        !wb.SheetNames.includes(`${name}_Existing`)) {
      throw new Error(
        `This workbook uses the old ${name} pre/post layout. ` +
        `Regenerate from the current blank template ` +
        `(SW_Required_Provided_DOEE_EISA438.xlsx).`);
    }
  }
}

function requireSheet(wb, name) {
  if (!wb.SheetNames.includes(name)) {
    throw new Error(`Missing sheet: ${name}`);
  }
  return wb.Sheets[name];
}

// Returns null when the sheet is absent so workbooks that pre-date a
// schema change still parse instead of throwing.
export function optionalSheet(wb, name) {
  if (!wb.SheetNames.includes(name)) return null;
  return wb.Sheets[name] ?? null;
}

function colToLetters(col) {
  // 1 → 'A', 26 → 'Z', 27 → 'AA', 28 → 'AB', …
  let s = '';
  while (col > 0) {
    const r = (col - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

function cell(sheet, row, col) {
  const ref = `${colToLetters(col)}${row}`;
  const c = sheet[ref];
  return c == null ? null : c.v;
}

// PROJECT layout (from workbook/builders/project.py):
//   col A = labels; col B = values (rows 3-12):
//   3=name, 4=number, 5=ms4, 6=awdz, 7=doeeReview,
//   8=totalLod, 9=rainfallRetention, 10=rainfallEisa, 11=trigger, 12=eisa438Applies
function parseProject(sheet) {
  const retention = cell(sheet, 9, 2);
  const eisa = cell(sheet, 10, 2);
  if (retention == null || eisa == null) {
    throw new Error('Missing PROJECT!B9 (Retention) or !B10 (EISA)');
  }
  return {
    name: cell(sheet, 3, 2),
    number: cell(sheet, 4, 2),
    ms4: cell(sheet, 5, 2),
    awdz: cell(sheet, 6, 2),
    doeeReview: cell(sheet, 7, 2),
    totalLod: cell(sheet, 8, 2),
    rainfallRetention: retention,
    rainfallEisa: eisa,
    trigger: cell(sheet, 11, 2),
    eisa438Applies: cell(sheet, 12, 2),
  };
}

// SDA layout (10 cols A-J per split sheet):
//   A=sdaId, B=inProw, C=landUse, D=hsg,
//   E=areaIn (Area Within LOD), F=areaOut (Area Outside LOD),
//   G-J = formula cells (Rv, Rainfall, SWRv Within, SWRv Outside) — not parsed.
function parseSdaRow(sheet, row) {
  return {
    sdaId:   cell(sheet, row, 1),
    inProw:  cell(sheet, row, 2),
    landUse: cell(sheet, row, 3),
    hsg:     cell(sheet, row, 4),
    areaIn:  cell(sheet, row, 5),
    areaOut: cell(sheet, row, 6),
  };
}

function _isEmptyInputRow(row) {
  // An "empty" input row has NO value across all 6 user-input cols.
  // Checking all 6 (vs. just A/C) tolerates users who type areas before
  // picking a dropdown, and vice versa.
  return row.sdaId == null && row.inProw == null && row.landUse == null
      && row.hsg == null && row.areaIn == null && row.areaOut == null;
}

function _isEmptyCdaInputRow(row) {
  return row.cdaId == null && row.sdaId == null && row.landUse == null
      && row.hsg == null && row.areaIn == null && row.areaOut == null;
}

function _scanInputRows(sheet, parseRow, isEmpty) {
  // Scan from DATA_FIRST_ROW; stop after EMPTY_ROW_SENTINEL consecutive
  // empty rows seen AFTER at least one data row. Keeps non-empty rows
  // even if interleaved with 1-4 blank separator rows.
  const rows = [];
  let seenData = false;
  let emptyStreak = 0;
  for (let r = DATA_FIRST_ROW; r <= DATA_MAX_ROW; r++) {
    const row = parseRow(sheet, r);
    if (isEmpty(row)) {
      if (seenData) {
        emptyStreak++;
        if (emptyStreak >= EMPTY_ROW_SENTINEL) break;
      }
      continue;
    }
    seenData = true;
    emptyStreak = 0;
    rows.push(row);
  }
  return rows;
}

function parseSdaSheet(sheet) {
  return _scanInputRows(sheet, parseSdaRow, _isEmptyInputRow);
}

// CDA layout (10 cols A-J per split sheet):
//   A=cdaId, B=sdaId, C=landUse, D=hsg,
//   E=areaIn (Area Within LOD), F=areaOut (Area Outside LOD),
//   G-J = formula cells — not parsed.
function parseCdaRow(sheet, row) {
  return {
    cdaId:   cell(sheet, row, 1),
    sdaId:   cell(sheet, row, 2),
    landUse: cell(sheet, row, 3),
    hsg:     cell(sheet, row, 4),
    areaIn:  cell(sheet, row, 5),
    areaOut: cell(sheet, row, 6),
  };
}

function parseCdaSheet(sheet) {
  return _scanInputRows(sheet, parseCdaRow, _isEmptyCdaInputRow);
}

// BMP layout:
//   Old 66-col schema: headers row 3, data starts row 4.
//   New 81-col schema (commit 2a950f3): banners row 3, column labels row 4,
//     USER/AUTO/DROPDOWN legend row 5, data starts row 6.
//   Auto-detect by checking whether row 4 col A looks like a header label.
//   Conditional cols by BMP type (unchanged between schemas for parsed fields):
//     Permeable Pavement:   F=sa, G=dReservoir
//     Bioretention/DrySwale: N=saTop, O=saBot, Q=dMedia, S=dGravel, U=dPond
//     Planted/Preserve Trees: AB..AG = plantedSmall..preservedHeritage
//   Wet Swale (cols Y, Z) is not currently parsed — add here when needed.
function _detectBmpFirstRow(sheet) {
  // Row 4 col A is the BMP Name header on the new schema, or the first BMP
  // name on the old schema. Treat a string that looks like a label as the
  // header signal.
  const row4A = cell(sheet, 4, 1);
  if (typeof row4A === 'string' && row4A.trim().toLowerCase() === 'bmp name') {
    return 6;
  }
  return 4;
}
function parseBmp(sheet) {
  const rows = [];
  const firstRow = _detectBmpFirstRow(sheet);
  for (let r = firstRow; r <= DATA_MAX_ROW; r++) {
    const name = cell(sheet, r, 1);
    // BMPs are contiguous; first empty name = end of list.
    if (!name) break;
    const type = cell(sheet, r, 4);
    const row = {
      name,
      sdaId: cell(sheet, r, 2),
      cdaId: cell(sheet, r, 3),
      type,
      subType: cell(sheet, r, 5),
    };
    if (type === 'Permeable Pavement') {
      row.pp = {
        sa: cell(sheet, r, 6) || 0,
        dReservoir: cell(sheet, r, 7) || 0,
      };
    } else if (type === 'Bioretention') {
      row.bio = {
        saTop:        cell(sheet, r, 14) || 0,
        saBot:        cell(sheet, r, 15) || 0,
        dMedia:       cell(sheet, r, 17) || 0,
        dGravel:      cell(sheet, r, 19) || 0,
        dPond:        cell(sheet, r, 21) || 0,
        // NEW optional geometry — null if blank, not 0.
        saPondTop:    cell(sheet, r, 40),
        topElev:      cell(sheet, r, 41),
        overflowElev: cell(sheet, r, 42),
        sidewalkElev: cell(sheet, r, 43),
        curbCutElev:  cell(sheet, r, 44),
      };
    } else if (type === 'Dry Swale') {
      row.swale = {
        saTop:           cell(sheet, r, 14) || 0,
        saBot:           cell(sheet, r, 15) || 0,
        dMedia:          cell(sheet, r, 17) || 0,
        dGravel:         cell(sheet, r, 19) || 0,
        dPond:           cell(sheet, r, 21) || 0,
        // NEW optional channel geometry — null if blank.
        length:          cell(sheet, r, 46),
        bottomWidth:     cell(sheet, r, 47),
        invUs:           cell(sheet, r, 48),
        invDs:           cell(sheet, r, 49),
        topUs:           cell(sheet, r, 50),
        topDs:           cell(sheet, r, 51),
        checkDamHeight:  cell(sheet, r, 52),
        checkDamSpacing: cell(sheet, r, 53),
      };
    } else if (type === 'Planted Trees' || type === 'Preserve Trees') {
      row.trees = {
        plantedSmall: cell(sheet, r, 28) || 0,
        plantedLarge: cell(sheet, r, 29) || 0,
        preservedSmall: cell(sheet, r, 30) || 0,
        preservedLarge: cell(sheet, r, 31) || 0,
        preservedSpecial: cell(sheet, r, 32) || 0,
        preservedHeritage: cell(sheet, r, 33) || 0,
      };
    }
    rows.push(row);
  }
  return rows;
}

function parseParams(sheet) {
  // PARAMS layout (from workbook/builders/params.py):
  //   Rv table: rows 7-11 cols A-B
  //   CN table: rows 15-18 cols A-E (A=land use label, B-E = HSG A-D)
  //   BMP design: rows 36-42 cols A-G (A=type, B=subtype, F=ret multiplier)
  //   Tree credits: rows 46-51 cols A-C (A=code, C=credit CF)
  //   Detention storm depths: rows 55-57 cols A-B (A=label, B=inches)
  //   Detention CN defaults: rows 61-64 cols A-B (A=label, B=cn)

  const rv = {};
  for (let r = 7; r <= 11; r++) {
    const label = cell(sheet, r, 1);
    if (label) rv[label] = cell(sheet, r, 2);
  }

  const cn = {};
  for (let r = 15; r <= 18; r++) {
    const label = cell(sheet, r, 1);
    if (!label) continue;
    // The PARAMS table uses "Impervious" (collapsed). Fan out to both vehicular
    // and non-vehicular + BMP so lookups by SDA land use work directly.
    const row = {
      A: cell(sheet, r, 2),
      B: cell(sheet, r, 3),
      C: cell(sheet, r, 4),
      D: cell(sheet, r, 5),
    };
    if (label === 'Impervious') {
      cn['Impervious Vehicular'] = row;
      cn['Impervious Non-Vehicular'] = row;
    } else {
      cn[label] = row;
    }
  }

  const bmpDesign = {};
  for (let r = 36; r <= 42; r++) {
    const type = cell(sheet, r, 1);
    const subType = cell(sheet, r, 2);
    if (!type) continue;
    const key = `${type} / ${subType}`;
    bmpDesign[key] = {
      nMedia:      typeof cell(sheet, r, 3) === 'number' ? cell(sheet, r, 3) : null,
      nGravel:     typeof cell(sheet, r, 4) === 'number' ? cell(sheet, r, 4) : null,
      nReservoir:  typeof cell(sheet, r, 5) === 'number' ? cell(sheet, r, 5) : null,
      retMultiplier: cell(sheet, r, 6),
      maxDrawdownDays: cell(sheet, r, 7),
    };
  }

  const treeCredits = {};
  for (let r = 46; r <= 51; r++) {
    const code = cell(sheet, r, 1);
    if (code) treeCredits[code] = cell(sheet, r, 3);
  }

  const detention = {
    p2In: cell(sheet, 55, 2),
    p15In: cell(sheet, 56, 2),
    p100In: cell(sheet, 57, 2),
  };

  const detentionCn = {};
  for (let r = 61; r <= 64; r++) {
    const label = cell(sheet, r, 1);
    if (label) detentionCn[label] = cell(sheet, r, 2);
  }

  return { rv, cn, bmpDesign, treeCredits, detention, detentionCn };
}

/**
 * Parse a SheetJS workbook into the structured object every downstream module
 * consumes. The `bmps` array has a conditional shape — pp/bio/trees sub-objects
 * are only present for matching BMP types.
 *
 * SDA and CDA data are exposed as split existing/proposed arrays; each row has
 * `areaIn` (within LOD) and `areaOut` (outside LOD) rather than pre/post fields.
 *
 * @param {{SheetNames: string[], Sheets: Record<string, object>}} wb
 * @returns {{
 *   project: {name, number, ms4, awdz, doeeReview, totalLod,
 *             rainfallRetention, rainfallEisa, trigger, eisa438Applies},
 *   sdaExisting: Array<{sdaId, inProw, landUse, hsg, areaIn, areaOut}>,
 *   sdaProposed: Array<{sdaId, inProw, landUse, hsg, areaIn, areaOut}>,
 *   cdaExisting: Array<{cdaId, sdaId, landUse, hsg, areaIn, areaOut}>,
 *   cdaProposed: Array<{cdaId, sdaId, landUse, hsg, areaIn, areaOut}>,
 *   bmps:    Array<{name, sdaId, cdaId, type, subType,
 *                   pp?:    {sa, dReservoir},
 *                   bio?:   {saTop, saBot, dMedia, dGravel, dPond},
 *                   trees?: {plantedSmall, plantedLarge, preservedSmall, preservedLarge, preservedSpecial, preservedHeritage}}>,
 *   params:  {rv, cn, bmpDesign, treeCredits, detention: {p2In, p15In, p100In}, detentionCn}
 * }}
 * @throws if a legacy-schema workbook is detected, if a required sheet is missing,
 *         or if PROJECT!B9/B10 (Retention/EISA rainfall) are empty.
 */
// Merge the Existing + Proposed arrays into the pre-split {preIn, preOut,
// postIn, postOut} shape so downstream consumers (render.mjs, ui.mjs, calc)
// don't need rewiring for the schema change.
function _mergeSdaCompat(existing, proposed) {
  const key = (r) => `${r.sdaId}|${r.landUse}|${r.hsg || ''}`;
  const byKey = new Map();
  for (const r of existing) {
    byKey.set(key(r), {
      sdaId: r.sdaId, inProw: r.inProw, landUse: r.landUse, hsg: r.hsg,
      preIn: r.areaIn || 0, preOut: r.areaOut || 0, postIn: 0, postOut: 0,
    });
  }
  for (const r of proposed) {
    const k = key(r);
    const row = byKey.get(k) || {
      sdaId: r.sdaId, inProw: r.inProw, landUse: r.landUse, hsg: r.hsg,
      preIn: 0, preOut: 0, postIn: 0, postOut: 0,
    };
    row.postIn = r.areaIn || 0;
    row.postOut = r.areaOut || 0;
    byKey.set(k, row);
  }
  return [...byKey.values()];
}

function _mergeCdaCompat(existing, proposed) {
  const key = (r) => `${r.cdaId}|${r.landUse}|${r.hsg || ''}`;
  const byKey = new Map();
  for (const r of existing) {
    byKey.set(key(r), {
      cdaId: r.cdaId, sdaId: r.sdaId, landUse: r.landUse, hsg: r.hsg,
      preIn: r.areaIn || 0, preOut: r.areaOut || 0, postIn: 0, postOut: 0,
    });
  }
  for (const r of proposed) {
    const k = key(r);
    const row = byKey.get(k) || {
      cdaId: r.cdaId, sdaId: r.sdaId, landUse: r.landUse, hsg: r.hsg,
      preIn: 0, preOut: 0, postIn: 0, postOut: 0,
    };
    row.postIn = r.areaIn || 0;
    row.postOut = r.areaOut || 0;
    byKey.set(k, row);
  }
  return [...byKey.values()];
}

// TC_PATH layout (from workbook/builders/tc_path.py):
//   Header row 3; data rows 4..23 (20 paths max).
//   A=ID, B=Name, C=Tc direct (min),
//   D=Sheet n, E=Sheet L, F=Sheet P2, G=Sheet S,
//   I=Shallow surface, J=Shallow L, K=Shallow S,
//   M=Channel 1 L, N=Channel 1 V,
//   P=Channel 2 L, Q=Channel 2 V.
export function parseTcPath(sheet) {
  if (!sheet) return [];
  const rows = [];
  for (let r = 4; r <= 23; r++) {
    const pathId = cell(sheet, r, 1);
    const name   = cell(sheet, r, 2);
    const tcDirectMin = cell(sheet, r, 3);
    const sheetN = cell(sheet, r, 4);
    const sheetL = cell(sheet, r, 5);
    const sheetP = cell(sheet, r, 6);
    const sheetS = cell(sheet, r, 7);
    const shSurf = cell(sheet, r, 9);
    const shL    = cell(sheet, r, 10);
    const shS    = cell(sheet, r, 11);
    const c1L    = cell(sheet, r, 13);
    const c1V    = cell(sheet, r, 14);
    const c2L    = cell(sheet, r, 16);
    const c2V    = cell(sheet, r, 17);
    const empty = [pathId, name, tcDirectMin, sheetL, shL, c1L, c2L].every(v => v == null);
    if (empty) continue;
    const segments = [];
    if (sheetL != null) segments.push({ type: 'sheet', length: sheetL, slope: sheetS, n: sheetN, P2: sheetP });
    if (shL    != null) segments.push({ type: 'shallow', length: shL, slope: shS, surface: shSurf });
    if (c1L    != null) segments.push({ type: 'channel', length: c1L, velocity: c1V });
    if (c2L    != null) segments.push({ type: 'channel', length: c2L, velocity: c2V });
    rows.push({ pathId, name, tcDirectMin, segments });
  }
  return rows;
}

export function parseWorkbook(wb) {
  rejectLegacySchema(wb);
  for (const name of REQUIRED_SHEETS) requireSheet(wb, name);

  const project = parseProject(requireSheet(wb, 'PROJECT'));
  const sdaExisting = parseSdaSheet(requireSheet(wb, 'SDA_Existing'));
  const sdaProposed = parseSdaSheet(requireSheet(wb, 'SDA_Proposed'));
  const cdaExisting = parseCdaSheet(requireSheet(wb, 'CDA_Existing'));
  const cdaProposed = parseCdaSheet(requireSheet(wb, 'CDA_Proposed'));

  // rainfallIn alias — downstream rendering uses this name; it maps to the
  // retention target (SWRv storm), not the EISA depth.
  project.rainfallIn = project.rainfallRetention;

  return {
    project,
    sdaExisting,
    sdaProposed,
    cdaExisting,
    cdaProposed,
    sdas: _mergeSdaCompat(sdaExisting, sdaProposed),
    cdas: _mergeCdaCompat(cdaExisting, cdaProposed),
    bmps: parseBmp(requireSheet(wb, 'BMP')),
    params: parseParams(requireSheet(wb, 'PARAMS')),
    tcPaths: parseTcPath(optionalSheet(wb, 'TC_PATH')),
  };
}
