import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'https://barbote-app-production.up.railway.app',
    headless: true,
    screenshot: 'only-on-failure',
    executablePath: '/usr/bin/google-chrome',
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  },
});
