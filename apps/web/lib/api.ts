const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('dolang_token')
}

// Fire-and-forget beacon so Vercel logs capture "user X called endpoint Y".
// Sends the bearer token (not a client-claimed id) — /api/log verifies it
// server-side and derives the identity from the signed payload. Must never
// throw or delay the real request.
function reportCall(path: string, method: string) {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return
  try {
    const payload = JSON.stringify({ route: path, method, token: getToken() })
    navigator.sendBeacon('/api/log', new Blob([payload], { type: 'application/json' }))
  } catch {
    // logging is best-effort
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  reportCall(path, (init.method ?? 'GET').toUpperCase())
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
