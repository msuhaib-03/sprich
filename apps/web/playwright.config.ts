import { defineConfig, devices } from '@playwright/test'

const WEB_URL = process.env.PLAYWRIGHT_WEB_URL ?? 'http://localhost:3000'
const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000'

// Overrides the API's DATABASE_URL for the spawned dev-server process only.
// dotenv (used by @nestjs/config) never overwrites a var that's already set
// in process.env, so passing this via webServer.env safely wins over
// apps/api/.env's own DATABASE_URL. See e2e/README.md.
const testDbEnv: Record<string, string> = process.env.PLAYWRIGHT_TEST_DATABASE_URL
  ? { DATABASE_URL: process.env.PLAYWRIGHT_TEST_DATABASE_URL }
  : {}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },

  // Chromium only for this first suite — keeps the feedback loop fast;
  // cross-browser coverage can be added later if it earns its cost.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Boots both apps for the run. Locally, if `npm run dev` is already up at
  // the repo root, these are reused as-is (reuseExistingServer) — but note
  // that means the ALREADY-RUNNING api process keeps whatever DATABASE_URL
  // it originally started with, not testDbEnv below. For a guaranteed
  // test-DB run, stop any local `npm run dev` first. CI always starts fresh.
  webServer: [
    {
      command: 'npm run dev -w @dolang/api',
      cwd: '../..',
      url: `${API_URL}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: testDbEnv,
    },
    {
      command: 'npm run dev -w @dolang/web',
      cwd: '../..',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
