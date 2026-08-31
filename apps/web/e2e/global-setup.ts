import { execSync } from 'node:child_process'
import path from 'node:path'

// Runs once before the suite. Migrates + seeds curriculum into the TEST
// database only — never the dev DB. packages/db/src/seed.ts wipes and
// recreates chapters/lessons/exercises/vocab on every run, so this must
// never point at a database with real data.
export default async function globalSetup() {
  const testDatabaseUrl = process.env.PLAYWRIGHT_TEST_DATABASE_URL

  if (!testDatabaseUrl) {
    throw new Error(
      'PLAYWRIGHT_TEST_DATABASE_URL is not set.\n' +
        "Refusing to run — without it, this would migrate/seed against apps/api/.env's own\n" +
        'DATABASE_URL (the real dev database), and the curriculum seed wipes + recreates\n' +
        'chapters/lessons/exercises/vocab. See apps/web/e2e/README.md for one-time setup.',
    )
  }

  const dbPackageDir = path.resolve(__dirname, '..', '..', '..', 'packages', 'db')
  const env = { ...process.env, DATABASE_URL: testDatabaseUrl }

  execSync('npm run db:deploy', { cwd: dbPackageDir, env, stdio: 'inherit' })
  execSync('npm run db:seed', { cwd: dbPackageDir, env, stdio: 'inherit' })
}
