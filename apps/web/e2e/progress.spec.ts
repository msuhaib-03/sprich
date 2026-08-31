import { test, expect } from './fixtures/auth'

test.describe('progress', () => {
  test('fresh onboarded user sees the summary without an error state', async ({ onboardedPage }) => {
    await onboardedPage.goto('/progress')

    await expect(onboardedPage.getByRole('heading', { name: 'Your journey so far' })).toBeVisible()

    // Static labels present regardless of the exact (unconfirmed) response
    // shape's numeric values — a fresh user still gets a fallback-safe summary.
    await expect(onboardedPage.getByText('Streak')).toBeVisible()
    await expect(onboardedPage.getByText('Total XP')).toBeVisible()
    await expect(onboardedPage.getByText('Lessons done')).toBeVisible()
    await expect(onboardedPage.getByText('Avg score')).toBeVisible()

    await expect(onboardedPage.getByText('Could not load your progress')).toHaveCount(0)
  })
})
