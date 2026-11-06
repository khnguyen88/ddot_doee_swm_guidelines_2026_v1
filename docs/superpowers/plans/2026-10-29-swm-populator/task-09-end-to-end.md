# Task 09 — End-to-end populate test

**Goal:** Run the full `populateAll` on the Minnesota Ave fixture against all 5 bundled blanks and assert the aggregate behavior: 4 outputs + 1 skipped (RWH), each output is a valid XLSX, pipeline runs in under 2 seconds.

**Files:**
- Modify: `populator/tests/populate.test.mjs` (add end-to-end case)

---

- [ ] **Step 1: Append end-to-end test**

```js
import { target as generalRetention } from '../src/mappings/general-retention.mjs';
import { target as ddotMep }          from '../src/mappings/ddot-mep.mjs';
import { target as swdbProw }         from '../src/mappings/swdb-prow.mjs';
import { target as swmpBmpCalc }      from '../src/mappings/swmp-bmp-calc.mjs';
import { target as rwh }              from '../src/mappings/rainwater-harvesting.mjs';

const ALL_MAPPINGS = [generalRetention, ddotMep, swdbProw, swmpBmpCalc, rwh];

test('populateAll: 4 outputs + 1 skipped on Minnesota Ave', async () => {
  const start = Date.now();
  const blanks = {
    'general-retention':    await readFile(blankPath('general-retention.xlsx')),
    'ddot-mep':             await readFile(blankPath('ddot-mep.xlsx')),
    'swdb-prow':            await readFile(blankPath('swdb-prow.xlsx')),
    'swmp-bmp-calc':        await readFile(blankPath('swmp-bmp-calc.xlsm')),
    'rainwater-harvesting': await readFile(blankPath('rainwater-harvesting.xlsx')),
  };
  const results = await populateAll(wb, { mappings: ALL_MAPPINGS, blanks });
  const elapsedMs = Date.now() - start;

  assert.equal(results.outputs.length, 4, `expected 4 outputs, got ${results.outputs.length}`);
  assert.equal(results.skipped.length, 1);
  assert.equal(results.skipped[0].targetId, 'rainwater-harvesting');

  // Every output is a valid XLSX (JSZip can re-open).
  for (const out of results.outputs) {
    const bytes = Buffer.from(await out.blob.arrayBuffer());
    const zip = await JSZip.loadAsync(bytes);
    assert.ok(zip.file('xl/workbook.xml'), `${out.targetId} missing xl/workbook.xml`);
  }

  assert.ok(elapsedMs < 2000, `populate took ${elapsedMs}ms — should be <2s`);
});
```

- [ ] **Step 2: Run tests, expect pass**

```powershell
Set-Location C:\_AAA\WS_HH\ddot_doee_swm_guidelines_2026_v1\populator
node --test tests/populate.test.mjs
```

- [ ] **Step 3: Commit**

```bash
git add populator/tests/populate.test.mjs
git commit -m "populator: end-to-end test — 4 outputs + 1 skip on Minnesota Ave fixture"
```
