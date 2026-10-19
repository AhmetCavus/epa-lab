import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  globalSetup: './tests/preview-server.ts',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1366, height: 768 },
    trace: 'retain-on-failure',
  },
});
