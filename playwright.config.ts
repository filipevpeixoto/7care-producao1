import { defineConfig } from '@playwright/test';

const port = process.env.PORT || '3064';
const baseURL = process.env.BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
      ]
    : [['html', { open: 'on-failure' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.CI
    ? undefined // CI inicia o servidor separadamente
    : {
        command: `PORT=${port} npm run dev`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: true,
        timeout: 30000,
      },
});
