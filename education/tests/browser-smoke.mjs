import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distUrl = 'file://' + join(__dirname, '..', 'education.html');

test('smoke: empty state renders the dropzone', async ({ page }) => {
  await page.goto(distUrl);
  await page.waitForSelector('.dropzone', { timeout: 5000 });
  const display = await page.$eval('.dropzone', (el) => getComputedStyle(el).display);
  expect(display).toBe('block');
});
