import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distUrl    = 'file://' + join(__dirname, '..', 'education.html');
const fixturePath = join(__dirname, 'fixtures', 'minnesota-ave.xlsx');

test('smoke: empty state dropzone renders as a block', async ({ page }) => {
  await page.goto(distUrl);
  await page.waitForSelector('.dropzone');
  const display = await page.$eval('.dropzone', (el) => getComputedStyle(el).display);
  expect(display).toBe('block');
});

test('smoke: load fixture, iterate every sidebar page without error', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn', { timeout: 10000 });

  const navCount = (await page.$$('.nav-btn')).length;
  expect(navCount).toBeGreaterThanOrEqual(20);

  for (let i = 0; i < navCount; i++) {
    await page.locator('.nav-btn').nth(i).click();
    const errorBanner = await page.$('.banner.error');
    expect(errorBanner, `sheet #${i+1} rendered an error banner`).toBeNull();
    const sheet = await page.$('.main .calc-sheet');
    expect(sheet, `sheet #${i+1} did not render`).not.toBeNull();
  }
});

test('smoke: print-mode populates printArea with every sheet', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn');
  const navCount = (await page.$$('.nav-btn')).length;
  const printCount = await page.evaluate(
    () => document.querySelectorAll('#printArea .calc-sheet').length,
  );
  expect(printCount).toBe(navCount);
});

test('smoke: EISA Three-Method Comparison shows all three methods', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn');
  const target = page.locator('.nav-btn', { hasText: 'Three-Method Comparison' });
  await target.click();
  const sheet = page.locator('.main .calc-sheet');
  await expect(sheet).toContainText('Direct Determination');
  await expect(sheet).toContainText('TR-55');
  await expect(sheet).toContainText('TR-16');
  await expect(sheet).toContainText('BMP');
});

test('smoke: EISA TR-16 Lookup shows highlighted P=1.7″ cell', async ({ page }) => {
  await page.goto(distUrl);
  await page.setInputFiles('input[type=file]', fixturePath);
  await page.waitForSelector('.nav-btn');
  await page.locator('.nav-btn', { hasText: 'TR-16 Lookup' }).click();
  const highlighted = await page.$('.main .tr16-highlight');
  expect(highlighted).not.toBeNull();
});
