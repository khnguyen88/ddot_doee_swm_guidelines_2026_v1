import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: /browser-smoke\.mjs/,
  timeout: 30000,
  use: { headless: true },
});
