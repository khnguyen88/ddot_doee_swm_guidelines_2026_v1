import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['browser-smoke.mjs', 'print-dimensions.mjs'],
  use: {
    headless: true,
  },
});
