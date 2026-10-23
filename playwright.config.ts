import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// The cloud sandbox ships a pre-installed Chromium that may not match this Playwright build;
// use it when present instead of downloading. Elsewhere Playwright's own browser is used.
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium'
const launchOptions = existsSync(SANDBOX_CHROMIUM) ? { executablePath: SANDBOX_CHROMIUM } : {}

// Runs against the production build (vite preview), the same files here.now serves.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', launchOptions },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
})
