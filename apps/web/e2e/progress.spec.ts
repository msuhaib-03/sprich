import { test, expect } from './fixtures/auth'

test.describe('progress', () => {
  test('fresh onboarded user sees the summary without an error state', async ({ onboardedPage }) => {
    await onboardedPage.goto('/progress')

    await expect(onboardedPage.getByRole('heading', { name: 'Your journey so far' })).toBeVisible()

    // Static labels present regardless of the exact (unconfirmed) response
    // shape's numeric values — a fresh user still gets a fallback-safe summary.
    // exact: true avoids a false substring match against the page's own
    // subtitle ("Real progress you can feel — not just streaks.").
    await expect(onboardedPage.getByText('Streak', { exact: true })).toBeVisible()
    await expect(onboardedPage.getByText('Total XP', { exact: true })).toBeVisible()
    await expect(onboardedPage.getByText('Lessons done', { exact: true })).toBeVisible()
    await expect(onboardedPage.getByText('Avg score', { exact: true })).toBeVisible()

    await expect(onboardedPage.getByText('Could not load your progress')).toHaveCount(0)
  })
})
