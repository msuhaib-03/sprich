import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * TEMPORARY DIAGNOSTIC — paired with apps/web/app/(auth)/callback/page.tsx.
 *
 * The OAuth callback page beacons safe stage markers here so the full Google
 * sign-in sequence is visible in Vercel logs (the browser console isn't
 * reachable on iPhone). It never receives — and must never log — the OAuth
 * code, the access token, or any secret. Remove once the callback issue is
 * root-caused.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>
  } catch {
    // beacons can arrive empty on unload
  }

  // Defence in depth: drop any key that *is* a credential even if the client is
  // changed later. Boolean markers like `hasToken` / `tokenPersisted` are kept.
  const SENSITIVE = /^(access_?token|refresh_?token|token|secret|code|authorization|password|jwt)$/i
  const safe = Object.fromEntries(
    Object.entries(body).filter(([k]) => !SENSITIVE.test(k)),
  )

  console.log(
    '[OAUTH_CALLBACK]',
    JSON.stringify({
      ...safe,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      at: new Date().toISOString(),
    }),
  )

  return NextResponse.json({ ok: true })
}
