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
