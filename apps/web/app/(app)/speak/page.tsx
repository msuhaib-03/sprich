'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

// ─── Scenarios (match the backend SpeakingScenario enum) ─────────────────────

const SCENARIOS = [
  { id: 'introduce_yourself', icon: '👋', title: 'Introduce yourself', sub: 'Talk about who you are' },
  { id: 'job_interview', icon: '💼', title: 'Job interview', sub: 'Practice for a real Vorstellungsgespräch' },
  { id: 'train_station', icon: '🚉', title: 'At the train station', sub: 'Buy a ticket, ask about platforms' },
  { id: 'supermarket', icon: '🛒', title: 'Supermarket', sub: 'Shopping and small problems' },
  { id: 'doctors_appointment', icon: '🩺', title: "Doctor's appointment", sub: 'Describe symptoms, understand advice' },
  { id: 'neighbour_chat', icon: '🏠', title: 'Chat with a neighbour', sub: 'Everyday small talk' },
  { id: 'workplace_smalltalk', icon: '☕', title: 'Workplace small talk', sub: 'Coffee-break German' },
  { id: 'free_conversation', icon: '💬', title: 'Free conversation', sub: 'Talk about anything' },
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface TurnMeta {
  translation?: string
  corrections?: { original: string; corrected: string; explanation: string }[]
  vocabulary?: { german: string; english: string }[]
  encouragement?: string
}

// Per-message expandable panel (translation / explanation)
interface Panel {
  text?: string
  open: boolean
  loading?: boolean
}
interface Message {
  role: 'user' | 'assistant'
  content: string
  meta?: TurnMeta
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

// Fetch TTS audio (auth'd) and return a playable object URL, or null.
async function fetchAudio(text: string): Promise<string | null> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sprich_token') : null
    const res = await fetch(`${API_BASE}/speaking/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return null
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SpeakPage() {
  const { user } = useAuthStore()
  const [scenario, setScenario] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoplay, setAutoplay] = useState(true)
  const [ttsNote, setTtsNote] = useState('')
  const [listening, setListening] = useState(false)

  // Hidden-by-default translation + on-demand explanation, keyed by message index
  const [tPanels, setTPanels] = useState<Record<number, Panel>>({})
  const [ePanels, setEPanels] = useState<Record<number, Panel>>({})

  const endRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<unknown>(null)

  const scenarioMeta = SCENARIOS.find((s) => s.id === scenario)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Play a piece of German text through the server TTS.
  async function play(text: string) {
    const url = await fetchAudio(text)
    if (!url) {
      setTtsNote('Audio unavailable — is ELEVENLABS_API_KEY set on the API?')
      return
    }
    setTtsNote('')
    new Audio(url).play().catch(() => {})
  }

  async function sendTurn(userMessage: string, opts: { visible?: boolean } = { visible: true }) {
    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    const nextMessages = opts.visible
      ? [...messages, { role: 'user' as const, content: userMessage }]
      : messages
    if (opts.visible) setMessages(nextMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await api.post<{ response: string; meta: TurnMeta }>('/ai/speaking/turn', {
        scenario,
        userMessage,
        history,
        level: user?.level ?? 'A1',
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.response, meta: res.meta }])
      if (autoplay && res.response) play(res.response)
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '(Entschuldigung — something went wrong. Try again.)' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function startScenario(id: string) {
    setScenario(id)
    setMessages([])
    setTPanels({})
    setEPanels({})
    // Kick off: ask the AI to open the conversation in role. We pass the
    // scenario id explicitly since the state update may not have flushed yet.
    void sendTurnWith(id, 'Beginne das Gespräch. Bitte fang du an.')
  }

  // Variant that takes the scenario explicitly (state may not be flushed yet).
  async function sendTurnWith(scenarioId: string, userMessage: string) {
    setLoading(true)
    try {
      const res = await api.post<{ response: string; meta: TurnMeta }>('/ai/speaking/turn', {
        scenario: scenarioId,
        userMessage,
        history: [],
        level: user?.level ?? 'A1',
      })
      setMessages([{ role: 'assistant', content: res.response, meta: res.meta }])
      if (autoplay && res.response) play(res.response)
    } catch {
      setMessages([{ role: 'assistant', content: '(Could not start — please try again.)' }])
    } finally {
      setLoading(false)
    }
  }

  // ── Translation (hidden until requested) + sentence explanation ──

  async function toggleTranslation(i: number, m: Message) {
    const cur = tPanels[i]
    if (cur?.open) {
      setTPanels((p) => ({ ...p, [i]: { ...cur, open: false } }))
      return
    }
    if (cur?.text) {
      setTPanels((p) => ({ ...p, [i]: { ...cur, open: true } }))
      return
    }
    // The AI usually ships the translation in its meta — instant and free.
    const fromMeta = m.meta?.translation
    if (fromMeta) {
      setTPanels((p) => ({ ...p, [i]: { text: fromMeta, open: true } }))
      return
    }
    setTPanels((p) => ({ ...p, [i]: { open: true, loading: true } }))
    try {
      const res = await api.post<{ translation: string }>('/ai/translate', { text: m.content })
      setTPanels((p) => ({ ...p, [i]: { text: res.translation, open: true } }))
    } catch {
      setTPanels((p) => ({ ...p, [i]: { text: '(Could not translate right now.)', open: true } }))
    }
  }

  async function toggleExplain(i: number, m: Message) {
    const cur = ePanels[i]
    if (cur?.open) {
      setEPanels((p) => ({ ...p, [i]: { ...cur, open: false } }))
      return
    }
    if (cur?.text) {
      setEPanels((p) => ({ ...p, [i]: { ...cur, open: true } }))
      return
    }
    setEPanels((p) => ({ ...p, [i]: { open: true, loading: true } }))
    try {
      const res = await api.post<{ explanation: string }>('/ai/sentence/explain', {
        sentence: m.content,
        level: user?.level ?? 'A1',
      })
      setEPanels((p) => ({ ...p, [i]: { text: res.explanation, open: true } }))
    } catch {
      setEPanels((p) => ({ ...p, [i]: { text: '(Could not explain right now.)', open: true } }))
    }
  }

  // ── Voice input via the browser Web Speech API (optional) ──
  function toggleMic() {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    const SR = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
      | (new () => {
          lang: string
          interimResults: boolean
          onresult: (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void
          onend: () => void
          start: () => void
          stop: () => void
        })
      | undefined
    if (!SR) {
      setTtsNote('Voice input needs Chrome/Edge. You can type instead.')
      return
    }
    if (listening) {
      ;(recognitionRef.current as { stop: () => void } | null)?.stop()
      return
    }
    const rec = new SR()
    rec.lang = 'de-DE'
    rec.interimResults = false
    rec.onresult = (e) => setInput(e.results[0][0].transcript)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    setListening(true)
    rec.start()
  }

  const micSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // ── Scenario picker ──
  if (!scenario) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-[var(--faint)] text-sm mb-1">Speaking practice</p>
          <h1 className="text-3xl font-black">Talk to your AI partner</h1>
          <p className="text-[var(--muted)] mt-2">
            Pick a real-life situation. Speak or type — your partner replies in German, corrects you gently, and you can hear every reply out loud.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => startScenario(s.id)}
              className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gold)]/40 hover:bg-[var(--overlay)] transition-all text-left"
            >
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="text-[var(--faint)] text-sm">{s.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Conversation view ──
  return (
    <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <button
          onClick={() => { setScenario(null); setMessages([]); setTPanels({}); setEPanels({}) }}
          className="text-[var(--muted)] hover:text-[var(--text)] text-sm"
        >
          ← Scenarios
        </button>
        <div className="text-center">
          <p className="font-bold text-sm">{scenarioMeta?.icon} {scenarioMeta?.title}</p>
          <p className="text-[var(--faint)] text-xs">Level {user?.level ?? 'A1'}</p>
        </div>
        <button
          onClick={() => setAutoplay((a) => !a)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            autoplay
              ? 'border-[var(--gold)]/40 text-[var(--gold)]'
              : 'border-[var(--border)] text-[var(--faint)]'
          }`}
          title="Automatically play audio for replies"
        >
          🔊 Auto {autoplay ? 'on' : 'off'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === 'user'
                  ? 'bg-[var(--gold)]/15 border border-[var(--gold)]/25'
                  : 'bg-[var(--surface)] border border-[var(--border)]'
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>

              {m.role === 'assistant' && !m.content.startsWith('(') && (
                <>
                  <div className="mt-2 flex items-center gap-4">
                    <button
                      onClick={() => play(m.content)}
                      className="text-xs text-[var(--gold)] hover:opacity-80"
                    >
                      🔊 Play
                    </button>
                    <button
                      onClick={() => toggleTranslation(i, m)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      🌐 {tPanels[i]?.open ? 'Hide translation' : 'Translate'}
                    </button>
                    <button
                      onClick={() => toggleExplain(i, m)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      💡 {ePanels[i]?.open ? 'Hide' : 'Explain'}
                    </button>
                  </div>

                  {tPanels[i]?.open && (
                    <div className="mt-2 pl-3 border-l-2 border-[var(--gold)]/40">
                      {tPanels[i]?.loading ? (
                        <span className="text-xs text-[var(--faint)]">Translating…</span>
                      ) : (
                        <p className="text-sm text-[var(--muted)] italic">{tPanels[i]?.text}</p>
                      )}
                    </div>
                  )}

                  {ePanels[i]?.open && (
                    <div className="mt-2 pl-3 border-l-2 border-sky-400/40">
                      {ePanels[i]?.loading ? (
                        <span className="text-xs text-[var(--faint)]">Asking your tutor…</span>
                      ) : (
                        <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">
                          {ePanels[i]?.text}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Corrections + vocab + encouragement */}
              {m.meta?.corrections && m.meta.corrections.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                  {m.meta.corrections.map((c, j) => (
                    <div key={j} className="text-xs">
                      <span className="text-red-400 line-through">{c.original}</span>{' '}
                      <span className="text-emerald-400">{c.corrected}</span>
                      <p className="text-[var(--faint)] mt-0.5">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
              {m.meta?.vocabulary && m.meta.vocabulary.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.meta.vocabulary.map((v, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-[var(--overlay)] text-[var(--muted)]">
                      {v.german} — {v.english}
                    </span>
                  ))}
                </div>
              )}
              {m.meta?.encouragement && (
                <p className="mt-2 text-xs text-[var(--gold)]">💪 {m.meta.encouragement}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 bg-[var(--surface)] border border-[var(--border)]">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--faint)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--faint)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--faint)] animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {ttsNote && <p className="text-[var(--faint)] text-xs text-center pb-2">{ttsNote}</p>}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (input.trim() && !loading) sendTurn(input.trim()) }}
        className="flex items-center gap-2 pt-3 border-t border-[var(--border)]"
      >
        {micSupported && (
          <button
            type="button"
            onClick={toggleMic}
            className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
              listening
                ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse'
                : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
            }`}
            title="Speak (German)"
          >
            🎙️
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? 'Listening…' : 'Type your reply in German…'}
          className="flex-1 px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--gold)]/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 px-5 py-3 rounded-xl gold-gradient text-black font-bold text-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
