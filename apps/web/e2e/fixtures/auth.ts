import { test as base } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  registerUser,
  completeOnboarding,
  getMe,
  API_BASE,
  type RegisteredUser,
} from '../utils/api-client'

// Logs the browser context in by calling the API through `page.request`, which
// shares its cookie jar with `page` — so the `dolang_session` cookie set by
// /auth/login is present on the very next navigation, no localStorage seeding.
async function loginPage(page: Page, email: string, password: string) {
  const res = await page.request.post(`${API_BASE}/auth/login`, { data: { email, password } })
  if (!res.ok()) {
    throw new Error(`fixture loginPage failed: ${res.status()} ${await res.text()}`)
  }
}

type AuthFixtures = {
  // A fresh user, registered via the API but NOT onboarded — for exercising
  // the onboarding wizard UI itself.
  newUser: RegisteredUser
  // Same, with the browser context already logged in (still routes into
  // /onboarding on protected routes, per app behavior).
  newUserPage: Page

  // A fresh user, registered AND onboarded via the API (no UI involved) —
  // the default for specs that just need "a logged-in, ready-to-use user".
  onboardedUser: RegisteredUser
  onboardedPage: Page
}

// Each fixture gets its own unique user (unique email per registerUser call)
// so tests stay isolated from each other's progress/leaderboard data.
export const test = base.extend<AuthFixtures>({
  newUser: async ({ request }, use) => {
    await use(await registerUser(request))
  },

  newUserPage: async ({ page, newUser }, use) => {
    await loginPage(page, newUser.user.email, newUser.password)
    await use(page)
  },

  onboardedUser: async ({ request }, use) => {
    const { password } = await registerUser(request)
    await completeOnboarding(request)
    const user = await getMe(request)
    await use({ user, password })
  },

  onboardedPage: async ({ page, onboardedUser }, use) => {
    await loginPage(page, onboardedUser.user.email, onboardedUser.password)
    await use(page)
  },
})

export { expect } from '@playwright/test'
