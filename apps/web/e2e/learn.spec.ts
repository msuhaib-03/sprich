import { test, expect } from './fixtures/auth'

// This whole file depends on globalSetup having seeded the curriculum
// (content/curriculum/*.json via packages/db/src/seed.ts) into the test DB.
test.describe('learn', () => {
  test("chapter/lesson list renders for the user's level", async ({ onboardedPage }) => {
    await onboardedPage.goto('/learn')

    await expect(onboardedPage.getByRole('heading', { name: 'Your learning path' })).toBeVisible()
    await expect(onboardedPage.getByText('No lessons available')).toHaveCount(0)
    await expect(onboardedPage.locator('a[href^="/learn/"]').first()).toBeVisible()
  })

  test('clicking a lesson navigates to its player and renders content', async ({ onboardedPage }) => {
    await onboardedPage.goto('/learn')
    await onboardedPage.locator('a[href^="/learn/"]').first().click()

    await expect(onboardedPage).toHaveURL(/\/learn\/[^/]+$/)
    await expect(onboardedPage.getByRole('button', { name: 'Tell me more →' })).toBeVisible()
  })

  test('a nonexistent lesson id shows an in-place error, not a crash', async ({ onboardedPage }) => {
    await onboardedPage.goto('/learn/nonexistent-lesson-id-e2e')

    await expect(onboardedPage.getByRole('link', { name: /Back to lessons/i })).toBeVisible()
  })

  test('shows a loading skeleton before chapter content resolves', async ({ onboardedPage }) => {
    // On a fast local backend the real skeleton can render for under a
    // frame, making the assertion flaky — throttle the response so it's
    // reliably observable.
    await onboardedPage.route('**/lessons/chapters**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800))
      await route.continue()
    })

    await onboardedPage.goto('/learn')
    await expect(onboardedPage.locator('.animate-pulse').first()).toBeVisible()
    await expect(onboardedPage.getByRole('heading', { name: 'Your learning path' })).toBeVisible()
  })
})
