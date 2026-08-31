import { test, expect } from './fixtures/auth'

test.describe('dashboard', () => {
  test('onboarded user sees their level, streak, and XP', async ({ onboardedPage, onboardedUser }) => {
    await onboardedPage.goto('/dashboard')

    // Pure client-store read (no API call) — should render immediately.
    // The level roadmap section further down also renders the level as
    // plain text (e.g. a lone "A1" badge), so the stat value needs a
    // testid rather than getByText to avoid a strict-mode multi-match.
    await expect(onboardedPage.getByText('Current level')).toBeVisible()
    await expect(onboardedPage.getByTestId('stat-level')).toHaveText(onboardedUser.user.level)
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
