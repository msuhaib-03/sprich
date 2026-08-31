import { test, expect } from './fixtures/auth'
import { uniqueEmail } from './utils/api-client'

test.describe('auth', () => {
  test('signup happy path redirects a brand-new user to onboarding', async ({ page }) => {
    await page.goto('/signup')
    await page.getByTestId('signup-name').fill('New E2E User')
    await page.getByTestId('signup-email').fill(uniqueEmail('signup'))
    await page.getByTestId('signup-password').fill('password123')
    await page.getByTestId('signup-submit').click()

    await expect(page).toHaveURL(/\/onboarding$/)
  })

  test('signup with an already-registered email shows an error', async ({ page, onboardedUser }) => {
    await page.goto('/signup')
    await page.getByTestId('signup-name').fill('Duplicate Email User')
    await page.getByTestId('signup-email').fill(onboardedUser.user.email)
    await page.getByTestId('signup-password').fill('password123')
    await page.getByTestId('signup-submit').click()

    await expect(page.getByTestId('signup-error')).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('login with valid credentials redirects an onboarded user to the dashboard', async ({
    page,
    onboardedUser,
  }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill(onboardedUser.user.email)
    await page.getByTestId('login-password').fill(onboardedUser.password)
    await page.getByTestId('login-submit').click()

    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('login with invalid credentials shows an error and stays on the page', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill(uniqueEmail('nonexistent'))
    await page.getByTestId('login-password').fill('wrong-password')
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('login-error')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('logout clears session and redirects to login', async ({ onboardedPage }) => {
    await onboardedPage.goto('/dashboard')
    await onboardedPage.getByRole('button', { name: 'Log out' }).click()

    await expect(onboardedPage).toHaveURL(/\/login$/)
    const token = await onboardedPage.evaluate(() => window.localStorage.getItem('dolang_token'))
    expect(token).toBeNull()
  })
})
