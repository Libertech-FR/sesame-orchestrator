import { defineConfig, devices } from '@playwright/test'

// Sur Alpine (musl), le Chromium téléchargé par Playwright (glibc) ne peut pas s'exécuter —
// utiliser Chromium du paquet système (variable PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, ex. make test).
const systemChromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    ...(systemChromiumPath ? { executablePath: systemChromiumPath } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'SESAME_HTTPS_ENABLED=false yarn start:dev --host localhost --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
})
