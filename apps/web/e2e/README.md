# E2E tests (Playwright)

## One-time setup

1. `npx playwright install chromium` (from `apps/web`) — downloads the browser binary.
2. Provision a **dedicated test database** on the same hosted Postgres provider used in `packages/db/.env` — a separate schema or database, not the dev one. `packages/db/src/seed.ts` wipes and recreates curriculum data (chapters/lessons/exercises/vocab) on every run, so this must never point at real/shared data.
3. Set `PLAYWRIGHT_TEST_DATABASE_URL` to that database's connection string (shell env var, or a local `.env.e2e` you source yourself — not committed).

`globalSetup` (`e2e/global-setup.ts`) refuses to run without `PLAYWRIGHT_TEST_DATABASE_URL` set, specifically so a missing/typo'd env var can't silently fall back to migrating/seeding the real dev database.

## Running

From `apps/web`:

```bash
npm run test:e2e         # headless run
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:report    # open the last HTML report
```

Or from the repo root: `npm run test:e2e` (via Turborepo).

## What happens on a run

- `playwright.config.ts` boots both `apps/api` and `apps/web` dev servers (`webServer`), then `globalSetup` runs `prisma migrate deploy` + the curriculum seed against `PLAYWRIGHT_TEST_DATABASE_URL`.
- **Caveat:** if you already have `npm run dev` running locally when you start the suite, Playwright reuses those existing processes (`reuseExistingServer`) instead of spawning new ones — meaning the already-running API keeps whatever `DATABASE_URL` it was originally started with, not the test one. Stop any local `npm run dev` before running `test:e2e` if you need a guaranteed test-DB run. CI always starts fresh (`reuseExistingServer` is disabled when `CI` is set).

## Optional env vars

- `PLAYWRIGHT_WEB_URL` (default `http://localhost:3000`)
- `PLAYWRIGHT_API_URL` (default `http://localhost:4000`)
