import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distUrl    = 'file://' + join(__dirname, '..', 'summary-populator.html');
const fixturePath = join(__dirname, 'fixtures', 'minnesota-ave.xlsx');

test('smoke: load template, populate, download ZIP', async ({ page }) => {
  await page.goto(distUrl);
  // The file input is visually hidden inside a <label> (display:none), so force is required.
  await page.setInputFiles('#templateInput', fixturePath, { force: true });
  await page.waitForSelector('.file-input-label.loaded');
  await page.click('#populateBtn');
  await page.waitForSelector('.result-row', { timeout: 10000 });
  const okRows   = await page.$$('.result-row.ok');
  const warnRows = await page.$$('.result-row.warn');
  const skipRows = await page.$$('.result-row.skip');
  expect(okRows.length + warnRows.length).toBeGreaterThanOrEqual(3);
  expect(skipRows.length).toBeGreaterThanOrEqual(1);

  // ZIP download triggers.
  const downloadPromise = page.waitForEvent('download');
  await page.click('#zipBtn');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('swmp-package.zip');
});

test('smoke: override blank with mismatched signature shows error', async ({ page }) => {
  await page.goto(distUrl);
  // The file input is visually hidden inside a <label> (display:none), so force is required.
  await page.setInputFiles('#templateInput', fixturePath, { force: true });
  await page.waitForSelector('.file-input-label.loaded');

  // Click the Override button on the first blank row and feed it the TEMPLATE
  // XLSX (wrong signature — doesn't have the Compliance Check Summary sheet).
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('.blank-row[data-target-id="general-retention"] .override-btn'),
  ]);
  await fileChooser.setFiles(fixturePath);
  await page.waitForSelector('.blank-row.error');
  const status = await page.textContent('.blank-row.error .status');
  expect(status).toMatch(/missing/i);
});
