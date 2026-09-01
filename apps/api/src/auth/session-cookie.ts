import type { CookieOptions, Response } from 'express'
import type { ConfigService } from '@nestjs/config'

/**
 * The one place the session cookie is defined. Holds the signed JWT; the
 * frontend never reads it (HttpOnly). `SameSite=Lax` is enough because the web
 * app and the API are the same site (both under `dolang.website`) — the only
 * cross-site entry is the Google redirect, a top-level GET that Lax allows.
 */
export const SESSION_COOKIE = 'dolang_session'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function baseOptions(config: ConfigService): CookieOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production'
  // e.g. ".dolang.website" so the cookie is shared between dolang.website and
  // api.dolang.website. Unset in local dev (host-only cookie on localhost).
  const domain = config.get<string>('COOKIE_DOMAIN') || undefined
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    path: '/',
  }
}

export function setSessionCookie(res: Response, token: string, config: ConfigService) {
  res.cookie(SESSION_COOKIE, token, { ...baseOptions(config), maxAge: SEVEN_DAYS_MS })
}

export function clearSessionCookie(res: Response, config: ConfigService) {
  // Domain/path must match the set call or the browser keeps the cookie.
  const { maxAge: _maxAge, ...opts } = { ...baseOptions(config) }
  res.clearCookie(SESSION_COOKIE, opts)
}
