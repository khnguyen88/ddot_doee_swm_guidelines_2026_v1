import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const distUrl = 'file://' + join(__dirname, '..', 'summary-calculator.html');
const fixture = join(__dirname, 'fixtures', 'minnesota-ave.xlsx');
test('_measure', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixture);
  await page.waitForSelector('.nav-btn');
  await page.evaluate(() => document.body.classList.add('print-mode'));
  const heights = await page.evaluate(() => {
    const sheets = Array.from(document.querySelectorAll('#printArea .calc-sheet'));
    return sheets.map((s, i) => ({ idx: i, title: s.querySelector('.cs-title')?.textContent || '', h: s.scrollHeight }));
  });
  writeFileSync('heights.txt', heights.map(h => `#${h.idx} h=${h.h}px — ${h.title}`).join('\n'));
  expect(heights.length).toBeGreaterThan(0);
});
