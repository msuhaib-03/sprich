const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

/**
 * Speak German text through the server TTS (ElevenLabs key stays server-side).
 * Returns false if audio is unavailable (missing key, quota, network).
 */
export async function playTts(text: string): Promise<boolean> {
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
    if (!res.ok) return false
    const url = URL.createObjectURL(await res.blob())
    await new Audio(url).play().catch(() => {})
    return true
  } catch {
    return false
  }
}
