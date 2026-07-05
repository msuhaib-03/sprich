const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

// In-memory cache: replaying the same text in a session never re-hits the API.
// Capped FIFO so long conversations don't hold unbounded audio blobs.
const memoryCache = new Map<string, string>()
const MAX_CACHED = 100

function remember(text: string, url: string) {
  if (memoryCache.size >= MAX_CACHED) {
    const oldest = memoryCache.keys().next().value
    if (oldest !== undefined) {
      const evicted = memoryCache.get(oldest)
      memoryCache.delete(oldest)
      if (evicted) URL.revokeObjectURL(evicted)
    }
  }
  memoryCache.set(text, url)
}

/**
 * Fetch a playable object URL for German text via the server TTS
 * (ElevenLabs key stays server-side; server disk-caches by text+voice).
 * Returns null if audio is unavailable (missing key, quota, network).
 */
export async function getTtsUrl(text: string): Promise<string | null> {
  const hit = memoryCache.get(text)
  if (hit) return hit
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sprich_token') : null
    const res = await fetch(`${BASE}/speaking/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return null
    const url = URL.createObjectURL(await res.blob())
    remember(text, url)
    return url
  } catch {
    return null
  }
}

/** Speak German text out loud. Returns false if audio is unavailable. */
export async function playTts(text: string): Promise<boolean> {
  const url = await getTtsUrl(text)
  if (!url) return false
  await new Audio(url).play().catch(() => {})
  return true
}
