import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:3065';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
