const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1'

// Fire-and-forget beacon so Vercel logs capture "user X called endpoint Y".
// Identity is resolved server-side in /api/log from the HttpOnly `dolang_session`
// cookie, which rides this same-origin beacon automatically — nothing sensitive
// is in the body. Must never throw or delay the real request.
function reportCall(path: string, method: string) {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return
  try {
    const payload = JSON.stringify({ route: path, method })
    navigator.sendBeacon('/api/log', new Blob([payload], { type: 'application/json' }))
  } catch {
    // logging is best-effort
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  reportCall(path, (init.method ?? 'GET').toUpperCase())
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    // Send/receive the session cookie. Web app and API are the same site
    // (dolang.website / api.dolang.website), so this is a first-party cookie.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(err.message ?? 'Request failed')
  }
  return res.json()
}

// `init` lets callers pass an AbortSignal for a per-request timeout.
export const api = {
  post: <T>(path: string, body: unknown, init: RequestInit = {}) =>
    request<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, init: RequestInit = {}) =>
    request<T>(path, { ...init, method: 'PATCH', body: JSON.stringify(body) }),
  get: <T>(path: string, init: RequestInit = {}) => request<T>(path, init),
}
