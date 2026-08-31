import { test, expect } from './fixtures/auth'

test.describe('leaderboard', () => {
  test('fresh onboarded user sees a rendered leaderboard and badges without error', async ({ onboardedPage }) => {
    await onboardedPage.goto('/leaderboard')

    await expect(onboardedPage.getByRole('heading', { name: "Who's learning hardest?" })).toBeVisible()
    await expect(onboardedPage.getByText('Could not load the leaderboard right now.')).toHaveCount(0)

    await expect(onboardedPage.getByRole('heading', { name: 'Your badges' })).toBeVisible()
    await expect(onboardedPage.getByText(/of \d+ earned/)).toBeVisible()
  })
})
