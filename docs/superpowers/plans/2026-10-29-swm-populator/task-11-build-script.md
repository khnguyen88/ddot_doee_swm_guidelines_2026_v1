# Task 11 — Build script (single-file dist with inlined blanks)

**Goal:** `build.js` reads dev HTML, inlines CSS, concatenates ES modules, inlines SheetJS + JSZip, and converts each of the 5 blank XLSX files to base64 data URLs so the dist works offline from `file://`.

**Files:**
- Create: `populator/build.js`

---

- [ ] **Step 1: Write `build.js`**

```js
#!/usr/bin/env node
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

function stripRelativeImports(src) {
  return src
    .replace(/^\s*import[^;]*from\s*['"]\.\/[^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import[^;]*from\s*['"]\.\.\/[^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
}

async function toDataUrl(path, mimeType) {
  const bytes = await readFile(path);
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

  // Combined module body: calc engines first, then orchestrator, mappings, ui.
  const combinedModule = [
    '// ─ src/parse.mjs ─',
    stripRelativeImports(parseJs),
    '// ─ src/xlsx-surgical.mjs ─',
    stripRelativeImports(xlsxJs),
    '// ─ src/populate.mjs ─',
    stripRelativeImports(populateJs),
    ...mappingJs.flatMap((m, i) => [
      `// ─ src/mappings/${['general-retention','ddot-mep','swdb-prow','swmp-bmp-calc','rainwater-harvesting'][i]}.mjs ─`,
      stripRelativeImports(m).replace(/export const target = /g, `const target_${i} = `),
    ]),
    `const ALL_MAPPINGS = [target_0, target_1, target_2, target_3, target_4];`,
    '// ─ src/ui.mjs ─',
    stripRelativeImports(uiJs).replace(/const ALL_MAPPINGS = \[[^\]]+\];?/g, ''),
  ].join('\n\n');

  // Convert blanks to data URLs so ui.mjs's fetch(BUNDLED_BLANK_URLS[id]) works offline.
  const blankEntries = await Promise.all(Object.entries(paths.blanks).map(async ([id, p]) => {
    const mime = p.endsWith('.xlsm')
      ? 'application/vnd.ms-excel.sheet.macroEnabled.12'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return [id, await toDataUrl(p, mime)];
  }));
  const bundledBlanksJs = `const __BUNDLED_BLANKS = ${JSON.stringify(Object.fromEntries(blankEntries))};`;

  // Patch ui.mjs's BUNDLED_BLANK_URLS to use the inlined data URLs.
  const finalModule = combinedModule.replace(
    /const BUNDLED_BLANK_URLS = \{[^}]+\};/,
    `const BUNDLED_BLANK_URLS = __BUNDLED_BLANKS;`
  );

  let out = devHtml;
  out = out.replace(
    /<link[^>]*href=["']\.\/src\/styles\.css["'][^>]*>/,
    `<style>\n${stylesCss}\n</style>`,
  );
  out = out.replace(
    /<script[^>]*src=["']\.\/lib\/sheetjs-bundle\.js["'][^>]*><\/script>/,
    `<script>\n${sheetjs.replace(/\$/g, '$$$$')}\n</script>`,
  );
  out = out.replace(
    /<script[^>]*src=["']\.\/lib\/jszip\.min\.js["'][^>]*><\/script>/,
    `<script>\n${jszip.replace(/\$/g, '$$$$')}\n</script>`,
  );
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
```

- [ ] **Step 2: Run build**

```powershell
Set-Location C:\_AAA\WS_HH\ddot_doee_swm_guidelines_2026_v1\populator
node build.js
```

Expected: `Built .../summary-populator.html (~2000 KB)` (bundled DOEE blanks add ~1.5 MB total as base64).

- [ ] **Step 3: Open dist directly from the filesystem**

Open `populator/summary-populator.html` by double-clicking. Verify empty-state loads, upload the Minnesota Ave sample, Populate, download works — all without a server.

- [ ] **Step 4: Commit**

```bash
git add populator/build.js populator/summary-populator.html
git commit -m "populator: build script that inlines CSS, modules, SheetJS, JSZip, and 5 blanks as data URLs"
```
