import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e', timeout: 60_000,
  // A dedicated port (4173 is vite's default and is often taken by other projects' previews) and always a fresh
  // build: reusing a running server could test a stale bundle.
  webServer: { command: 'npm run build && npm run preview', port: 4317, reuseExistingServer: false, timeout: 120_000 },
  use: { baseURL: 'http://localhost:4317/' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
    { name: 'iphone-landscape', use: { ...devices['iPhone 14 landscape'] } },
    { name: 'iphone-portrait', use: { ...devices['iPhone 14'] } },
    { name: 'pixel', use: { ...devices['Pixel 7'] } },
  ],
});
