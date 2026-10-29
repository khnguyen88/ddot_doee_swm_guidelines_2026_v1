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

  const navCount = (await page.$$('.nav-btn')).length;
  expect(navCount).toBeGreaterThan(5);

  // Re-query nav button each iteration — renderSidebar() replaces .nav-btn
  // DOM nodes whenever the active page changes, so cached handles go stale.
  for (let i = 0; i < navCount; i++) {
    await page.locator('.nav-btn').nth(i).click();
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
