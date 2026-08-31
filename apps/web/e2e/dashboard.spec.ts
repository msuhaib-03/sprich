import { test, expect } from './fixtures/auth'

test.describe('dashboard', () => {
  test('onboarded user sees their level, streak, and XP', async ({ onboardedPage, onboardedUser }) => {
    await onboardedPage.goto('/dashboard')

    // Pure client-store read (no API call) — should render immediately.
    await expect(onboardedPage.getByText('Current level')).toBeVisible()
    await expect(onboardedPage.getByText(onboardedUser.user.level, { exact: true })).toBeVisible()
    await expect(onboardedPage.getByText('Streak')).toBeVisible()
    await expect(onboardedPage.getByText('XP earned')).toBeVisible()
  })

  test('sidebar nav links are all present', async ({ onboardedPage }) => {
    await onboardedPage.goto('/dashboard')

    for (const route of ['dashboard', 'learn', 'speak', 'vocabulary', 'progress', 'leaderboard', 'premium']) {
      await expect(onboardedPage.getByTestId(`nav-${route}`)).toBeVisible()
    }
  })
})
