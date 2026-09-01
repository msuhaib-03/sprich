const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('dolang_token')
}

// Reads the persisted auth store (zustand persist writes it under `dolang-auth`)
// without importing the client-only store module into this framework-agnostic
// helper. Used only to attribute request logs — never for auth decisions.
function getLoggedInUser(): { id: string; email: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('dolang-auth')
    if (!raw) return null
    const user = JSON.parse(raw)?.state?.user
    return user?.id ? { id: user.id, email: user.email } : null
  } catch {
    return null
  }
}

// Fire-and-forget beacon so Vercel logs capture "user X called endpoint Y".
// Must never throw or delay the real request.
function reportCall(path: string, method: string) {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return
  try {
    const user = getLoggedInUser()
    const payload = JSON.stringify({
      route: path,
      method,
      userId: user?.id ?? null,
      email: user?.email ?? null,
    })
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

export const api = {
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  get: <T>(path: string) => request<T>(path),
}
