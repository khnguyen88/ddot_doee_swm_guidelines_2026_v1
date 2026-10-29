export default {
  testDir: './tests',
  testMatch: ['**/browser-smoke.mjs'],
  use: { headless: true },
  timeout: 30000,
};
