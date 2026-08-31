import { test, expect } from './fixtures/auth'

const WEB_URL = process.env.PLAYWRIGHT_WEB_URL ?? 'http://localhost:3000'

test.describe('premium', () => {
  test('non-premium user sees the pricing view', async ({ onboardedPage }) => {
    await onboardedPage.goto('/premium')

    await expect(onboardedPage.getByRole('heading', { name: 'Unlock the full journey' })).toBeVisible()
    // Billing cycle defaults to 'annual' (apps/web/app/(app)/premium/page.tsx),
    // so $79/yr is what a first-time visitor actually sees, not $9.99/mo.
    await expect(onboardedPage.getByText('$79')).toBeVisible()
    await expect(onboardedPage.getByRole('button', { name: /Upgrade to Premium/i })).toBeVisible()
  })

  test('upgrade CTA redirects to the mocked checkout URL', async ({ onboardedPage }) => {
    // apps/web/app/(app)/premium/page.tsx does `window.location.href = res.url`
    // on success — point the mock at a same-origin URL so the test doesn't
    // navigate out to (fake) real Stripe infrastructure.
    const mockCheckoutUrl = `${WEB_URL}/premium?checkout=mock`
    await onboardedPage.route('**/subscriptions/checkout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: mockCheckoutUrl }),
      })
    })

    await onboardedPage.goto('/premium')
    await onboardedPage.getByRole('button', { name: /Upgrade to Premium/i }).click()

    await onboardedPage.waitForURL(/checkout=mock/)
  })
})
