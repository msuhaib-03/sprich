import type { CookieOptions, Response } from 'express'
import type { ConfigService } from '@nestjs/config'

/**
 * The one place the session cookie is defined. Holds the signed JWT; the
 * frontend never reads it (HttpOnly).
 *
 * Host-only (no `Domain`): the web app reaches the API through a same-origin
 * proxy (`dolang.website/api/v1/*` → this service), so the browser attributes
 * this cookie to `dolang.website` itself. First-party + `SameSite=Lax` is what
 * iOS Safari reliably keeps — a cross-subdomain cookie set via fetch() does not
 * survive there.
 */
export const SESSION_COOKIE = 'dolang_session'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function baseOptions(config: ConfigService): CookieOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  }
}

export function setSessionCookie(res: Response, token: string, config: ConfigService) {
  res.cookie(SESSION_COOKIE, token, { ...baseOptions(config), maxAge: SEVEN_DAYS_MS })
}

export function clearSessionCookie(res: Response, config: ConfigService) {
  // Options (minus maxAge) must match the set call or the browser keeps the cookie.
  const { maxAge: _maxAge, ...opts } = { ...baseOptions(config) }
  res.clearCookie(SESSION_COOKIE, opts)
}
