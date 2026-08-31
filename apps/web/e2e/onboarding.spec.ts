import { test, expect } from './fixtures/auth'

// All five placement-quiz questions answered with their lowest-scoring
// option (each worth 0 points) deterministically lands on A1 detection
// ("Score <= 3: A1" in apps/web/app/(auth)/onboarding/page.tsx).
const A1_QUIZ_ANSWERS = [
  'I have no idea what this says',
  'der Buch',
  'Not sure',
  "I don't know what Dative is",
  "I've never tried",
]

// All five answered with their highest-scoring option sums to 17 points,
// landing on B2 detection ("Score > 15: B2") — used to exercise the
// "start from A1 instead" alternate path.
const B2_QUIZ_ANSWERS = [
  'Good morning! How are you? (formal)',
  'das Buch',
  'I have a dog',
  'Ich gebe dem Mann das Buch',
  "I'm already conversational",
]

async function answerQuiz(page: import('@playwright/test').Page, answers: string[]) {
  for (const answer of answers) {
    await page.getByRole('button', { name: answer, exact: true }).click()
  }
}

test.describe('onboarding', () => {
  test('full happy path (profile -> goal -> time -> quiz -> A1) lands on dashboard', async ({ newUserPage }) => {
    await newUserPage.goto('/onboarding')

    await expect(newUserPage.getByText('Step 1 of 4')).toBeVisible()
    await newUserPage.getByRole('button', { name: /Complete beginner/i }).click()

    await expect(newUserPage.getByText('Step 2 of 4')).toBeVisible()
    await newUserPage.getByRole('button', { name: /Just curious/i }).click()

    await expect(newUserPage.getByText('Step 3 of 4')).toBeVisible()
    await newUserPage.getByRole('button', { name: /30 min \/ day/i }).click()

    await expect(newUserPage.getByText('Quick check · 1 of 5')).toBeVisible()
    await answerQuiz(newUserPage, A1_QUIZ_ANSWERS)

    await expect(newUserPage.getByText("You're at A1")).toBeVisible()
    await newUserPage.getByRole('button', { name: /Start at A1/i }).click()

    await expect(newUserPage).toHaveURL(/\/dashboard$/)
  })

  test('"start from A1 instead" alternate button still completes onboarding', async ({ newUserPage }) => {
    await newUserPage.goto('/onboarding')

    await newUserPage.getByRole('button', { name: /Complete beginner/i }).click()
    await newUserPage.getByRole('button', { name: /Just curious/i }).click()
    await newUserPage.getByRole('button', { name: /30 min \/ day/i }).click()
    await answerQuiz(newUserPage, B2_QUIZ_ANSWERS)

    await expect(newUserPage.getByText("You're at B2")).toBeVisible()
    await newUserPage.getByRole('button', { name: /Actually, start from A1/i }).click()

    await expect(newUserPage).toHaveURL(/\/dashboard$/)
  })
})
