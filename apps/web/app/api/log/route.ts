import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { logRequest } from '@/lib/log'

// node:crypto isn't available on the edge runtime.
export const runtime = 'nodejs'

const SESSION_COOKIE = 'dolang_session'

/**
 * Client-side beacon sink. `apps/web/lib/api.ts` fires a `navigator.sendBeacon`
 * here for every call it makes to the API — those calls go browser -> API
 * directly and never touch Vercel, so this handler is how they show up in
 * Vercel's logs (with the acting user, or "anonymous").
 *
 * Identity is NOT taken from the client body: it comes from the `dolang_session`
 * cookie, which the browser sends with this same-origin beacon
 * (Domain=.dolang.website). This handler verifies the JWT signature against
 * JWT_SECRET before trusting `sub`/`email`. A missing, malformed, expired, or
 * tampered cookie logs as anonymous. The cookie value is never logged.
 */

let warnedNoSecret = false

// Minimal HS256 verify — matches @nestjs/jwt signing with a string secret.
function verifyJwt(token: string): { sub?: string; email?: string } | null {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (!warnedNoSecret) {
      warnedNoSecret = true
      console.warn('[REQUEST] JWT_SECRET is not set — every request will log as anonymous')
    }
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts

  const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  const got = Buffer.from(signature)
  const want = Buffer.from(expected)
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) return null
    return claims
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let body: { route?: string; method?: string } = {}
  try {
    body = await req.json()
  } catch {
    // sendBeacon can deliver an empty/truncated body on page unload — log anyway.
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const claims = token ? verifyJwt(token) : null

  logRequest({
    userId: claims?.sub ?? null,
    email: claims?.email ?? null,
    route: body.route ?? 'unknown',
    method: body.method ?? 'UNKNOWN',
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: req.headers.get('user-agent'),
    referer: req.headers.get('referer'),
  })

  return NextResponse.json({ ok: true })
}
