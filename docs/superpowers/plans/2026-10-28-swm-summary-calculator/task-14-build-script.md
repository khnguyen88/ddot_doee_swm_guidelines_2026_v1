# Task 14 — Build script (single-file dist)

**Goal:** `build.js` reads `summary-calculator-dev.html`, inlines `src/styles.css`, concatenates `src/*.mjs` into a single `<script type="module">` block, inlines `lib/sheetjs-bundle.js`, and writes `summary-calculator.html` — a single ~1 MB file that opens offline from `file://`.

**Files:**
- Create: `summary_calculator/build.js`

---

- [ ] **Step 1: Write `summary_calculator/build.js`**

```js
#!/usr/bin/env node
// build.js — produce summary-calculator.html (single-file dist).
//
// Inlines:
//   • lib/sheetjs-bundle.js       → classic <script> (sets window.XLSX)
//   • src/styles.css              → <style> block
//   • src/parse.mjs + calc.mjs + render.mjs + ui.mjs → single <script type="module">
//     (import/export statements between these files are rewritten into one combined module)

import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const paths = {
  dev:      join(__dirname, 'summary-calculator-dev.html'),
  styles:   join(__dirname, 'src',  'styles.css'),
  parse:    join(__dirname, 'src',  'parse.mjs'),
  calc:     join(__dirname, 'src',  'calc.mjs'),
  render:   join(__dirname, 'src',  'render.mjs'),
  ui:       join(__dirname, 'src',  'ui.mjs'),
  sheetjs:  join(__dirname, 'lib',  'sheetjs-bundle.js'),
  dist:     join(__dirname, 'summary-calculator.html'),
};

function stripRelativeImports(source) {
  // Remove `import ... from './other.mjs';` lines (we're concatenating).
  // Keep bare `export` keywords stripped off so symbols become top-level.
  return source
    .replace(/^\s*import[^;]*from\s*['"]\.\/[^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
}

async function main() {
  const [devHtml, stylesCss, parseJs, calcJs, renderJs, uiJs, sheetjsJs] = await Promise.all(
    ['dev', 'styles', 'parse', 'calc', 'render', 'ui', 'sheetjs'].map(k => readFile(paths[k], 'utf8')),
  );

  // Combined module body: calc first (no deps on parse/render), then render, then ui.
  const combinedModule = [
    '// ─ src/calc.mjs ─',   stripRelativeImports(calcJs),
    '// ─ src/parse.mjs ─',  stripRelativeImports(parseJs),
    '// ─ src/render.mjs ─', stripRelativeImports(renderJs),
    '// ─ src/ui.mjs ─',     stripRelativeImports(uiJs),
  ].join('\n\n');

  let out = devHtml;

  // 1) Inline styles.css.
  out = out.replace(
    /<link[^>]*href=["']\.\/src\/styles\.css["'][^>]*>/,
    `<style>\n${stylesCss}\n</style>`,
  );

  // 2) Inline SheetJS (classic script).
  out = out.replace(
    /<script[^>]*src=["']\.\/lib\/sheetjs-bundle\.js["'][^>]*><\/script>/,
    `<script>\n${sheetjsJs.replace(/\$/g, '$$$$')}\n</script>`,
  );

  // 3) Replace the module script tag with the combined module body.
  out = out.replace(
    /<script[^>]*type=["']module["'][^>]*src=["']\.\/src\/ui\.mjs["'][^>]*><\/script>/,
    `<script type="module">\n${combinedModule.replace(/\$/g, '$$$$')}\n</script>`,
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

```bash
cd summary_calculator
node build.js
```

Expected: `Built .../summary-calculator.html (~1000 KB)`.

- [ ] **Step 3: Open the dist directly from the filesystem**

Open `summary_calculator/summary-calculator.html` by double-clicking it in the file explorer (or `start summary_calculator/summary-calculator.html` on Windows, `open` on macOS). It should load from `file://` — no server, no network. Verify:

1. Empty state shows the dropzone.
2. Loading `SW_Required_Provided_DOEE_EISA438_SAMPLE_MinnesotaAve.xlsx` populates the sidebar.
3. Print preview still shows letter pages with Detention Summary in landscape.

If any step fails, the module rewriting in `stripRelativeImports` likely needs a fix — print the combined module and look for leftover `export` / `import` keywords.

- [ ] **Step 4: Commit**

```bash
git add summary_calculator/build.js summary_calculator/summary-calculator.html
git commit -m "summary-calculator: add build script and generated single-file dist"
```
