import { test, expect } from './fixtures/auth'

test.describe('vocabulary', () => {
  test('fresh user sees empty review state, word of the day, and zero stats', async ({ onboardedPage }) => {
    await onboardedPage.goto('/vocabulary')

    await expect(onboardedPage.getByRole('heading', { name: 'Your words' })).toBeVisible()

    // Zero-state stats — no lessons completed yet, so no SRS deck.
    await expect(onboardedPage.getByText('Due today')).toBeVisible()
    await expect(onboardedPage.getByText('Learning')).toBeVisible()
    await expect(onboardedPage.getByText('Mastered')).toBeVisible()

    // Word of the day is independent of the user's deck — always safe.
    await expect(onboardedPage.getByText('Word of the day')).toBeVisible()

    // Empty review queue, no crash.
    await expect(onboardedPage.getByText('Nothing due right now')).toBeVisible()
  })

  test('dictionary tab renders its empty state before a search', async ({ onboardedPage }) => {
    await onboardedPage.goto('/vocabulary')
    await onboardedPage.getByRole('button', { name: 'Dictionary' }).click()

    await expect(onboardedPage.getByText('Type to search the dictionary.')).toBeVisible()
  })
})
