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
  // Chromium's print engine inserts a trailing blank page when the deck
  // contains a mix of portrait and landscape sheets (orientation-switch
  // artifact; `page-break-after: auto` on :last-child doesn't suppress it).
  // Detention is the only landscape sheet, so expect at most ONE extra
  // trailing blank. +2 or more means a sheet legitimately overflowed.
  const hasLandscape = await page.evaluate(() =>
    document.querySelectorAll('#printArea .calc-sheet.landscape').length > 0,
  );
  const tolerance = hasLandscape ? 1 : 0;
  expect(pdf.getPageCount(), `expected ≤ ${expectedPages + tolerance} pages, got ${pdf.getPageCount()} (sheet count = ${expectedPages})`)
    .toBeLessThanOrEqual(expectedPages + tolerance);
  expect(pdf.getPageCount(), 'PDF has fewer pages than sheets — something is being merged')
    .toBeGreaterThanOrEqual(expectedPages);
});
