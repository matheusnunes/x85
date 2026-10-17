import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e', timeout: 60_000,
  webServer: { command: 'npm run build && npm run preview', port: 4173, reuseExistingServer: true, timeout: 120_000 },
  use: { baseURL: 'http://localhost:4173/' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
    { name: 'iphone-landscape', use: { ...devices['iPhone 14 landscape'] } },
    { name: 'iphone-portrait', use: { ...devices['iPhone 14'] } },
    { name: 'pixel', use: { ...devices['Pixel 7'] } },
  ],
});
