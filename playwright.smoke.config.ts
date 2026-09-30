import { defineConfig, devices } from '@playwright/test'

// Smoke tests voor automatische updates. Staat bewust los van een eventuele
// bestaande playwright.config.ts, zodat die ongemoeid blijft.
// Lokaal draaien: npm run build && npm run test:smoke

const PORT = Number(process.env.PORT ?? 3000)

export default defineConfig({
  testDir: './tests/smoke',
  outputDir: process.env.PW_SMOKE_OUTPUT ?? 'test-results/smoke',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start',
    url: `http://localhost:${PORT}/admin`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: String(PORT) },
  },
})
