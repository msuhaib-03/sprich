export interface RequestLogEntry {
  userId?: string | null
  email?: string | null
  route: string
  method: string
  ip?: string | null
  userAgent?: string | null
  referer?: string | null
}

/**
 * Emits one structured line per request so Vercel's log stream shows which user
 * hit which route (and which hits were anonymous). Keep this as a single
 * `console.log` with a stable `[REQUEST]` prefix + JSON payload so the Vercel
 * log viewer / any drain can filter and parse it.
 */
export function logRequest(entry: RequestLogEntry) {
  console.log(
    '[REQUEST]',
    JSON.stringify({
      userId: entry.userId ?? 'anonymous',
      email: entry.email ?? null,
      route: entry.route,
      method: entry.method,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      referer: entry.referer ?? null,
      timestamp: new Date().toISOString(),
    }),
  )
}
