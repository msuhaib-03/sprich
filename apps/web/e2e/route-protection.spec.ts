import { test, expect } from './fixtures/auth'

const PROTECTED_ROUTES = ['/dashboard', '/learn', '/speak', '/vocabulary', '/progress', '/leaderboard', '/premium']

test.describe('route protection', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`unauthenticated visit to ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login$/)
    })
  }

  test('an already-authenticated user visiting /login still sees the login form', async ({ onboardedPage }) => {
    // apps/web/app/(auth)/login/page.tsx doesn't check auth state on mount —
    // this is existing behavior, not a redirect to assert/fix.
    await onboardedPage.goto('/login')
    await expect(onboardedPage.getByTestId('login-email')).toBeVisible()
    await expect(onboardedPage).toHaveURL(/\/login$/)
  })

  test('an already-authenticated user visiting /signup still sees the signup form', async ({ onboardedPage }) => {
    await onboardedPage.goto('/signup')
    await expect(onboardedPage.getByTestId('signup-email')).toBeVisible()
    await expect(onboardedPage).toHaveURL(/\/signup$/)
  })

  test('reloading a protected route with a valid session does not bounce to /login', async ({ onboardedPage }) => {
    // Regression guard for the hydration race in apps/web/app/(app)/layout.tsx:
    // it waits for zustand's persist hydration before deciding whether to
    // redirect, and briefly shows a spinner with no content in between.
    await onboardedPage.goto('/dashboard')
    await expect(onboardedPage.getByText('Current level')).toBeVisible()

    await onboardedPage.reload()

    await expect(onboardedPage).toHaveURL(/\/dashboard$/)
    await expect(onboardedPage.getByText('Current level')).toBeVisible()
  })
})
