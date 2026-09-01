import { NextRequest, NextResponse } from 'next/server'
import { logRequest } from '@/lib/log'

/**
 * Client-side beacon sink. `apps/web/lib/api.ts` fires a `navigator.sendBeacon`
 * here for every call it makes to the NestJS API — those calls go browser -> API
 * directly and never touch Vercel, so this handler is how they show up in
 * Vercel's logs (with the acting user, or "anonymous").
 *
 * `userId` / `email` are client-asserted: the real auth check still happens on
 * the NestJS API. This endpoint is observability only, so it never rejects.
 */
export async function POST(req: NextRequest) {
  let body: {
    route?: string
    method?: string
    userId?: string | null
    email?: string | null
  } = {}

  try {
    body = await req.json()
  } catch {
    // sendBeacon can deliver an empty/truncated body on page unload — log anyway.
  }

  logRequest({
    userId: body.userId,
    email: body.email,
    route: body.route ?? 'unknown',
    method: body.method ?? 'UNKNOWN',
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: req.headers.get('user-agent'),
    referer: req.headers.get('referer'),
  })

  return NextResponse.json({ ok: true })
}
