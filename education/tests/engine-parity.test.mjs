import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

for (const name of ['calc', 'aggregate', 'parse']) {
  test(`engine-parity: ${name}.mjs byte-identical with summary_calculator`, async () => {
    const summary = await readFile(join(ROOT, 'summary_calculator', 'src', `${name}.mjs`), 'utf8');
    const edu     = await readFile(join(ROOT, 'education',          'src', `${name}.mjs`), 'utf8');
    assert.equal(edu, summary,
      `${name}.mjs diverges — run \`bash scripts/sync-education-engines.sh\``);
  });
}
