import type { APIRequestContext } from '@playwright/test'

// apps/web/lib/api.ts is browser-only (guards on `window`/localStorage), so
// E2E setup calls go straight to the API with Playwright's own request
// context instead of reusing it.
const API_BASE = `${process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000'}/api/v1`

export interface E2EUser {
  id: string
  email: string
  name: string
  level: string
  profile: string | null
  goal: string | null
  dailyMinutes: number
  streak: number
  xp: number
  isPremium: boolean
}

export interface RegisteredUser {
  accessToken: string
  user: E2EUser
  // The plaintext password used at registration — only the hash is ever
  // persisted server-side, so tests that need to drive the login UI (rather
  // than just seeding a token) have to carry this from registration time.
  password: string
}

let counter = 0

// Unique across parallel workers (separate processes -> distinct pid) and
// across sequential calls within one worker (counter), even if Date.now()
// collides at millisecond resolution.
export function uniqueEmail(prefix = 'e2e') {
  counter += 1
  return `${prefix}-${Date.now()}-${process.pid}-${counter}@dolang.test`
}

async function assertOk(res: { ok: () => boolean; status: () => number; text: () => Promise<string> }, label: string) {
  if (!res.ok()) {
    throw new Error(`${label} failed: ${res.status()} ${await res.text()}`)
  }
}

export async function registerUser(
  request: APIRequestContext,
  overrides: Partial<{ email: string; name: string; password: string }> = {},
): Promise<RegisteredUser> {
  const data = {
    email: overrides.email ?? uniqueEmail(),
    name: overrides.name ?? 'E2E Test User',
    password: overrides.password ?? 'password123',
  }
  const res = await request.post(`${API_BASE}/auth/register`, { data })
  await assertOk(res, 'registerUser')
  const body = await res.json()
  return { ...body, password: data.password }
}

// GermanLevel/UserProfile/UserGoal enum values from packages/db/prisma/schema.prisma.
export async function completeOnboarding(
  request: APIRequestContext,
  accessToken: string,
  overrides: Partial<{ level: string; profile: string; goal: string; dailyMinutes: number }> = {},
): Promise<E2EUser> {
  const data = {
    level: overrides.level ?? 'A1',
    profile: overrides.profile ?? 'complete_beginner',
    goal: overrides.goal ?? 'fun_learning',
    dailyMinutes: overrides.dailyMinutes ?? 30,
  }
  const res = await request.patch(`${API_BASE}/users/onboarding`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data,
  })
  await assertOk(res, 'completeOnboarding')
  return res.json()
}

export async function getMe(request: APIRequestContext, accessToken: string): Promise<E2EUser> {
  const res = await request.get(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  await assertOk(res, 'getMe')
  return res.json()
}
