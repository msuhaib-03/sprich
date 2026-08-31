import { test as base } from '@playwright/test'
import type { Page } from '@playwright/test'
import { registerUser, completeOnboarding, getMe, type E2EUser, type RegisteredUser } from '../utils/api-client'

// Must match the exact shape apps/web/store/auth.ts's zustand `persist`
// middleware writes — verified empirically against zustand@5.0.14's default
// storage (`{state: {...}, version: 0}`), not assumed from docs.
const TOKEN_KEY = 'dolang_token'
const AUTH_KEY = 'dolang-auth'

// Seeds localStorage before any navigation (addInitScript runs on every
// subsequent document, including reloads), so apps/web/app/(app)/layout.tsx's
// hydration check finds a logged-in user immediately instead of showing its
// spinner-then-redirect-to-/login path.
async function seedAuthState(page: Page, accessToken: string, user: E2EUser) {
  await page.addInitScript(
    ({ tokenKey, authKey, accessToken, user }) => {
      window.localStorage.setItem(tokenKey, accessToken)
      window.localStorage.setItem(authKey, JSON.stringify({ state: { token: accessToken, user }, version: 0 }))
    },
    { tokenKey: TOKEN_KEY, authKey: AUTH_KEY, accessToken, user },
  )
}

type AuthFixtures = {
  // A fresh user, registered via the API but NOT onboarded — for exercising
  // the onboarding wizard UI itself.
  newUser: RegisteredUser
  // Same, with localStorage pre-seeded so the page loads already logged in
  // (still routes into /onboarding on protected routes, per app behavior).
  newUserPage: Page

  // A fresh user, registered AND onboarded via the API (no UI involved) —
  // the default for specs that just need "a logged-in, ready-to-use user".
  onboardedUser: RegisteredUser
  onboardedPage: Page
}

// Each fixture gets its own unique user (unique email per registerUser call)
// so tests stay isolated from each other's progress/leaderboard data — this
// is why we don't use Playwright's shared `storageState` file here.
export const test = base.extend<AuthFixtures>({
  newUser: async ({ request }, use) => {
    const registered = await registerUser(request)
    await use(registered)
  },

  newUserPage: async ({ page, newUser }, use) => {
    await seedAuthState(page, newUser.accessToken, newUser.user)
    await use(page)
  },

  onboardedUser: async ({ request }, use) => {
    const { accessToken, password } = await registerUser(request)
    await completeOnboarding(request, accessToken)
    const user = await getMe(request, accessToken)
    await use({ accessToken, user, password })
  },

  onboardedPage: async ({ page, onboardedUser }, use) => {
    await seedAuthState(page, onboardedUser.accessToken, onboardedUser.user)
    await use(page)
  },
})

export { expect } from '@playwright/test'
