import { test, expect } from './fixtures/auth'

// Selecting ANY scenario immediately fires a POST to /ai/speaking/turn (the
// AI's opening line) — apps/web/app/(app)/speak/page.tsx's startScenario()
// calls sendTurnWith() synchronously on click. So every test past the
// picker screen mocks this route rather than depending on a real,
// configured ANTHROPIC/GEMINI/GROQ key.
const MOCK_TURN_RESPONSE = {
  response: 'Hallo! Wie geht es dir?',
  meta: {
    translation: 'Hello! How are you?',
    corrections: [],
    vocabulary: [{ german: 'wie', english: 'how' }],
    encouragement: 'Great start!',
  },
}

test.describe('speak', () => {
  test('scenario picker renders without any network call', async ({ onboardedPage }) => {
    await onboardedPage.goto('/speak')

    await expect(onboardedPage.getByRole('heading', { name: 'Talk to your AI partner' })).toBeVisible()
    await expect(onboardedPage.getByRole('button', { name: /Introduce yourself/i })).toBeVisible()
    await expect(onboardedPage.getByRole('button', { name: /Job interview/i })).toBeVisible()
    await expect(onboardedPage.getByRole('button', { name: /Free conversation/i })).toBeVisible()
  })

  test('selecting a scenario and sending a message uses the mocked AI turn', async ({ onboardedPage }) => {
    await onboardedPage.route('**/ai/speaking/turn', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TURN_RESPONSE) })
    })

    await onboardedPage.goto('/speak')
    await onboardedPage.getByRole('button', { name: /Introduce yourself/i }).click()

    // Initial AI opening line (mocked).
    await expect(onboardedPage.getByText('Hallo! Wie geht es dir?').first()).toBeVisible()

    await onboardedPage.getByPlaceholder('Type your reply in German…').fill('Hallo, ich heiße Anna.')
    await onboardedPage.getByRole('button', { name: 'Send' }).click()

    await expect(onboardedPage.getByText('Hallo, ich heiße Anna.')).toBeVisible()
    await expect(onboardedPage.getByRole('button', { name: /Finish/i })).toBeVisible()
  })

  test('a failed AI turn degrades gracefully instead of crashing', async ({ onboardedPage }) => {
    await onboardedPage.route('**/ai/speaking/turn', async (route) => {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'boom' }) })
    })

    await onboardedPage.goto('/speak')
    await onboardedPage.getByRole('button', { name: /Introduce yourself/i }).click()

    await expect(onboardedPage.getByText(/Could not start/i)).toBeVisible()
  })
})
