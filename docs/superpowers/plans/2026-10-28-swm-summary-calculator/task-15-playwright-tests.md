# Task 15 — Playwright tests (smoke + print dimensions)

**Goal:** Two dev-time Playwright tests. Smoke test opens the dist, loads Minnesota Ave, and verifies every sidebar sheet renders without a banner. Print-dimensions test emits a PDF per sheet via Chromium and asserts the page count matches expectations (catches sheets that overflow onto a second physical page).

**Files:**
- Create: `summary_calculator/tests/browser-smoke.mjs`
- Create: `summary_calculator/tests/print-dimensions.mjs`

---

- [ ] **Step 1: Install Playwright**

```bash
cd summary_calculator
npm install
npx playwright install chromium
```

- [ ] **Step 2: Write `tests/browser-smoke.mjs`**

```js
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distUrl    = 'file://' + join(__dirname, '..', 'summary-calculator.html');
const fixturePath = join(__dirname, 'fixtures', 'minnesota-ave.xlsx');

test('smoke: all sidebar sheets render without error banner', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn', { timeout: 5000 });

  const navBtns = await page.$$('.nav-btn');
  expect(navBtns.length).toBeGreaterThan(5);

  for (let i = 0; i < navBtns.length; i++) {
    await navBtns[i].click();
    const errorBanner = await page.$('.banner.error');
    expect(errorBanner, `sheet #${i+1} rendered an error banner`).toBeNull();
    const sheet = await page.$('.main .calc-sheet');
    expect(sheet, `sheet #${i+1} did not render`).not.toBeNull();
  }
});

test('smoke: print-mode populates #printArea with every sheet', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn');
  const navCount = (await page.$$('.nav-btn')).length;
  const printCount = await page.evaluate(() => document.querySelectorAll('#printArea .calc-sheet').length);
  expect(printCount).toBe(navCount);
});
```

- [ ] **Step 3: Write `tests/print-dimensions.mjs`**

```js
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distUrl    = 'file://' + join(__dirname, '..', 'summary-calculator.html');
const fixturePath = join(__dirname, 'fixtures', 'minnesota-ave.xlsx');

test('print-dimensions: PDF has one physical page per .calc-sheet', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn');
  await page.evaluate(() => document.body.classList.add('print-mode'));
  const expectedPages = await page.evaluate(() =>
    document.querySelectorAll('#printArea .calc-sheet').length,
  );
  const pdfBytes = await page.pdf({ format: 'Letter', printBackground: true });
  const pdf = await PDFDocument.load(pdfBytes);
  // Allow +0 pages but flag +1 or more as overflow regressions.
  expect(pdf.getPageCount(), 'extra pages → a sheet overflowed')
    .toBe(expectedPages);
});
```

- [ ] **Step 4: Add `pdf-lib` to devDependencies**

Edit `summary_calculator/package.json`:

```json
{
  "devDependencies": {
    "playwright": "^1.47.0",
    "@playwright/test": "^1.47.0",
    "pdf-lib": "^1.17.1"
  }
}
```

Then run `npm install`.

- [ ] **Step 5: Run smoke tests**

```bash
cd summary_calculator
npx playwright test tests/browser-smoke.mjs tests/print-dimensions.mjs
```

Expected: both specs pass. If `print-dimensions` fails with a page-count mismatch, inspect the generated PDF (`npx playwright test --headed --debug`) and tighten the offending sheet's `max-height`/content.

- [ ] **Step 6: Commit**

```bash
git add summary_calculator/tests/browser-smoke.mjs summary_calculator/tests/print-dimensions.mjs summary_calculator/package.json summary_calculator/package-lock.json
git commit -m "summary-calculator: add Playwright smoke and print-dimensions tests"
```
