import { execSync } from 'node:child_process'
import path from 'node:path'

// Runs once after the suite (regardless of pass/fail, as long as
// global-setup.ts itself succeeded). Deletes the users this run created —
// see packages/db/src/cleanup-test-users.ts — so repeated runs don't
// accumulate rows in the test database. Shells out to packages/db rather
// than importing @prisma/client directly, same as global-setup.ts, since
// apps/web doesn't otherwise depend on it.
export default async function globalTeardown() {
  const testDatabaseUrl = process.env.PLAYWRIGHT_TEST_DATABASE_URL
  if (!testDatabaseUrl) return // global-setup.ts already refused to run without it

  const dbPackageDir = path.resolve(__dirname, '..', '..', '..', 'packages', 'db')
  const env = { ...process.env, DATABASE_URL: testDatabaseUrl }

  execSync('npm run db:cleanup-test-users', { cwd: dbPackageDir, env, stdio: 'inherit' })
}
