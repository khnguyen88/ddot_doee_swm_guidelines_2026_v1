#!/usr/bin/env node
// build.js — produce summary-populator.html (single-file offline dist).
//
// Inlines (in order):
//   • lib/sheetjs-bundle.js       → classic <script> (sets window.XLSX)
//   • lib/jszip.min.js            → classic <script> (sets window.JSZip)
//   • src/styles.css              → <style> block
//   • src/parse.mjs
//     src/xlsx-surgical.mjs
//     src/populate.mjs
//     src/mappings/*.mjs  (each export const target → const target_N)
//     const ALL_MAPPINGS = [target_0..target_4];
//     src/ui.mjs          (its ALL_MAPPINGS line stripped; BUNDLED_BLANK_URLS patched)
//     → single <script type="module">
//   • 5 blank xlsx/xlsm files    → base64 data URLs patched into BUNDLED_BLANK_URLS

import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SRC = join(__dirname, 'src');
const paths = {
  dev:      join(__dirname, 'summary-populator-dev.html'),
  styles:   join(SRC,  'styles.css'),
  parse:    join(SRC,  'parse.mjs'),
  xlsx:     join(SRC,  'xlsx-surgical.mjs'),
  populate: join(SRC,  'populate.mjs'),
  ui:       join(SRC,  'ui.mjs'),
  mappings: [
    join(SRC, 'mappings', 'general-retention.mjs'),
    join(SRC, 'mappings', 'ddot-mep.mjs'),
    join(SRC, 'mappings', 'swdb-prow.mjs'),
    join(SRC, 'mappings', 'swmp-bmp-calc.mjs'),
    join(SRC, 'mappings', 'rainwater-harvesting.mjs'),
  ],
  sheetjs:  join(__dirname, 'lib',  'sheetjs-bundle.js'),
  jszip:    join(__dirname, 'lib',  'jszip.min.js'),
  blanks: {
    'general-retention':    join(__dirname, 'blanks', 'general-retention.xlsx'),
    'ddot-mep':             join(__dirname, 'blanks', 'ddot-mep.xlsx'),
    'swdb-prow':            join(__dirname, 'blanks', 'swdb-prow.xlsx'),
    'swmp-bmp-calc':        join(__dirname, 'blanks', 'swmp-bmp-calc.xlsm'),
    'rainwater-harvesting': join(__dirname, 'blanks', 'rainwater-harvesting.xlsx'),
  },
  dist:     join(__dirname, 'summary-populator.html'),
};

// Strips relative import/export lines from a concatenated module source.
// The export keyword is stripped from function/const declarations so they
// become top-level names accessible to the combined module scope.
function stripRelativeImports(src) {
  return src
    .replace(/^\s*import[^;]*from\s*['"]\.\/[^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import[^;]*from\s*['"]\.\.\/[^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
}

// For mapping files: rename `export const target =` → `const target_N =` FIRST,
// then strip any remaining import/export lines. The rename must precede
// stripRelativeImports because that function would otherwise drop the `export `
// prefix and leave a plain `const target =` (all 5 with the same name → conflict).
function stripMappingFile(src, index) {
  const renamed = src.replace(/export const target = /, `const target_${index} = `);
  return stripRelativeImports(renamed);
}

async function toDataUrl(filePath, mimeType) {
  const bytes = await readFile(filePath);
  const b64 = bytes.toString('base64');
  return `data:${mimeType};base64,${b64}`;
}

async function main() {
  const [devHtml, stylesCss, parseJs, xlsxJs, populateJs, uiJs, sheetjs, jszip, ...mappingJs] =
    await Promise.all([
      readFile(paths.dev,      'utf8'),
      readFile(paths.styles,   'utf8'),
      readFile(paths.parse,    'utf8'),
      readFile(paths.xlsx,     'utf8'),
      readFile(paths.populate, 'utf8'),
      readFile(paths.ui,       'utf8'),
      readFile(paths.sheetjs,  'utf8'),
      readFile(paths.jszip,    'utf8'),
      ...paths.mappings.map(p => readFile(p, 'utf8')),
    ]);

  const MAPPING_NAMES = [
    'general-retention',
    'ddot-mep',
    'swdb-prow',
    'swmp-bmp-calc',
    'rainwater-harvesting',
  ];

  // Combined module body: calc engines first, then orchestrator, mappings, ui.
  const combinedModule = [
    '// ─ src/parse.mjs ─',
    stripRelativeImports(parseJs),
    '// ─ src/xlsx-surgical.mjs ─',
    stripRelativeImports(xlsxJs),
    '// ─ src/populate.mjs ─',
    stripRelativeImports(populateJs),
    ...mappingJs.flatMap((m, i) => [
      `// ─ src/mappings/${MAPPING_NAMES[i]}.mjs ─`,
      stripMappingFile(m, i),
    ]),
    `const ALL_MAPPINGS = [target_0, target_1, target_2, target_3, target_4];`,
    '// ─ src/ui.mjs ─',
    // Strip the ALL_MAPPINGS declaration from ui.mjs — it is replaced by the
    // generated line above that references the renamed target_N constants.
    stripRelativeImports(uiJs).replace(/const ALL_MAPPINGS = \[[^\]]+\];?/g, ''),
  ].join('\n\n');

  // Convert blank workbooks to base64 data URLs so fetch(BUNDLED_BLANK_URLS[id])
  // works from file:// without a server.
  const blankEntries = await Promise.all(
    Object.entries(paths.blanks).map(async ([id, filePath]) => {
      const mime = filePath.endsWith('.xlsm')
        ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      return [id, await toDataUrl(filePath, mime)];
    }),
  );
  const bundledBlanksJs = `const __BUNDLED_BLANKS = ${JSON.stringify(Object.fromEntries(blankEntries))};`;

  // Patch ui.mjs's BUNDLED_BLANK_URLS object to point at the inlined data URLs.
  const finalModule = combinedModule.replace(
    /const BUNDLED_BLANK_URLS = \{[^}]+\};/,
    `const BUNDLED_BLANK_URLS = __BUNDLED_BLANKS;`,
  );

  let out = devHtml;

  // 1) Inline styles.css.
  out = out.replace(
    /<link[^>]*href=["']\.\/src\/styles\.css["'][^>]*>/,
    `<style>\n${stylesCss}\n</style>`,
  );

  // 2) Inline SheetJS (classic script — sets window.XLSX).
  //    Dollar-sign escaping: String.replace interprets $$ as a literal $ in the
  //    replacement; sheetjs/jszip content may contain $ so we double each one.
  out = out.replace(
    /<script[^>]*src=["']\.\/lib\/sheetjs-bundle\.js["'][^>]*><\/script>/,
    `<script>\n${sheetjs.replace(/\$/g, '$$$$')}\n</script>`,
  );

  // 3) Inline JSZip (classic script — sets window.JSZip).
  out = out.replace(
    /<script[^>]*src=["']\.\/lib\/jszip\.min\.js["'][^>]*><\/script>/,
    `<script>\n${jszip.replace(/\$/g, '$$$$')}\n</script>`,
  );

  // 4) Replace the module <script> tag with the full inlined module.
  //    Prepend the __BUNDLED_BLANKS data URLs so they're defined before ui.mjs code runs.
  out = out.replace(
    /<script[^>]*type=["']module["'][^>]*src=["']\.\/src\/ui\.mjs["'][^>]*><\/script>/,
    `<script type="module">\n${bundledBlanksJs}\n${finalModule.replace(/\$/g, '$$$$')}\n</script>`,
  );

  await writeFile(paths.dist, out);
  const { size } = await stat(paths.dist);
  console.log(`Built ${paths.dist} (${(size / 1024).toFixed(0)} KB)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
