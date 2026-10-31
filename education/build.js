#!/usr/bin/env node
import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const paths = {
  dev:         join(__dirname, 'education-dev.html'),
  styles:      join(__dirname, 'src',  'styles.css'),
  parse:       join(__dirname, 'src',  'parse.mjs'),
  calc:        join(__dirname, 'src',  'calc.mjs'),
  aggregate:   join(__dirname, 'src',  'aggregate.mjs'),
  tr16:        join(__dirname, 'src',  'tr16-exhibit.mjs'),
  narrative:   join(__dirname, 'src',  'narrative.mjs'),
  renderEdu:   join(__dirname, 'src',  'render-edu.mjs'),
  ui:          join(__dirname, 'src',  'ui.mjs'),
  sheetjs:     join(__dirname, 'lib',  'sheetjs-bundle.js'),
  dist:        join(__dirname, 'education.html'),
};
paths.demoFixture      = join(__dirname, 'tests', 'fixtures', 'minnesota-ave.xlsx');
paths.demoFixtureTrail = join(__dirname, 'tests', 'fixtures', 'trail.xlsx');

function stripRelativeImports(source) {
  return source
    // Strip multi-line import { ... } from './...'; blocks first.
    .replace(/^\s*import\s*\{[^}]*\}\s*from\s*['"]\.\/[^'"]+['"];?\s*$/gms, '')
    // Strip single-line imports (import X from './...').
    .replace(/^\s*import[^;]*from\s*['"]\.\/[^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
}

// Remove duplicate `const esc = ...` declarations that arise from concatenating
// modules that each define the same helper. Strips the entire multi-line block
// for each second-or-later occurrence. We only target `esc` because it is the
// only helper defined in multiple concatenated modules (narrative + render-edu + ui).
function deduplicateEsc(source) {
  let first = true;
  // Match `const esc = (s) => ...` through its trailing semicolon (3–5 lines).
  // [^\n]* matches each continued line; the block ends at the first ; on its own continuation.
  return source.replace(
    /^const esc\s*=\s*\([^)]*\)[^\n]*\n(?:[^\n]*\n)*?[^\n]*;$/gm,
    (match) => {
      if (first) { first = false; return match; }
      return '// (esc already declared above)';
    },
  );
}

async function readIfExists(path) {
  try { return await readFile(path, 'utf8'); }
  catch (e) {
    if (e.code === 'ENOENT') return '// (not yet created)';
    throw e;
  }
}

async function main() {
  const [devHtml, stylesCss, parseJs, calcJs, aggregateJs, tr16Js, narrativeJs, renderEduJs, uiJs, sheetjsJs, demoBytes, demoBytesTrail] =
    await Promise.all([
      readFile(paths.dev,              'utf8'),
      readFile(paths.styles,           'utf8'),
      readFile(paths.parse,            'utf8'),
      readFile(paths.calc,             'utf8'),
      readFile(paths.aggregate,        'utf8'),
      readIfExists(paths.tr16),
      readIfExists(paths.narrative),
      readIfExists(paths.renderEdu),
      readFile(paths.ui,               'utf8'),
      readFile(paths.sheetjs,          'utf8'),
      readFile(paths.demoFixture),
      readFile(paths.demoFixtureTrail),
    ]);
  const demoB64      = demoBytes.toString('base64');
  const demoB64Trail = demoBytesTrail.toString('base64');

  const combinedModule = deduplicateEsc([
    `const DEMO_XLSX_B64 = ${JSON.stringify(demoB64)};`,
    `const DEMO_XLSX_TRAIL_B64 = ${JSON.stringify(demoB64Trail)};`,
    '// ─ src/calc.mjs ─',          stripRelativeImports(calcJs),
    '// ─ src/parse.mjs ─',         stripRelativeImports(parseJs),
    '// ─ src/aggregate.mjs ─',     stripRelativeImports(aggregateJs),
    '// ─ src/tr16-exhibit.mjs ─',  stripRelativeImports(tr16Js),
    '// ─ src/narrative.mjs ─',     stripRelativeImports(narrativeJs),
    '// ─ src/render-edu.mjs ─',    stripRelativeImports(renderEduJs),
    '// ─ src/ui.mjs ─',            stripRelativeImports(uiJs),
  ].join('\n\n'));

  let out = devHtml;
  out = out.replace(
    /<link[^>]*href=["']\.\/src\/styles\.css["'][^>]*>/,
    `<style>\n${stylesCss}\n</style>`,
  );
  out = out.replace(
    /<script[^>]*src=["']\.\/lib\/sheetjs-bundle\.js["'][^>]*><\/script>/,
    `<script>\n${sheetjsJs.replace(/\$/g, '$$$$')}\n</script>`,
  );
  out = out.replace(
    /<script[^>]*type=["']module["'][^>]*src=["']\.\/src\/ui\.mjs["'][^>]*><\/script>/,
    `<script type="module">\n${combinedModule.replace(/\$/g, '$$$$')}\n</script>`,
  );

  await writeFile(paths.dist, out);
  const { size } = await stat(paths.dist);
  console.log(`Built ${paths.dist} (${(size / 1024).toFixed(0)} KB)`);
}

main().catch(err => { console.error(err); process.exit(1); });
