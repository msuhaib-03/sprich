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

// Returned by POST /speaking/sessions when a practice session is finished
interface SessionResult {
  overallScore: number
  grammarScore: number
  vocabularyScore: number
  fluencyScore: number
  wordsPerMinute: number
  aiFeedback: string
  xpEarned: number
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

  // Mic recording → server STT (Groq Whisper)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Live input-level meter — lets the user SEE whether the mic hears them.
  const [micLevel, setMicLevel] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const meterRafRef = useRef(0)
  const peakLevelRef = useRef(0)

  // Session end → scores + feedback
  const [finishing, setFinishing] = useState(false)
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)
  const sessionStartRef = useRef<number>(Date.now())

  // Hidden-by-default translation + on-demand explanation, keyed by message index
  const [tPanels, setTPanels] = useState<Record<number, Panel>>({})
  const [ePanels, setEPanels] = useState<Record<number, Panel>>({})

  const endRef = useRef<HTMLDivElement>(null)

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
    setSessionResult(null)
    sessionStartRef.current = Date.now()
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

  // ── Voice input: record with MediaRecorder, transcribe on the server via
  // Groq Whisper. (The browser Web Speech API streams audio to Google and
  // fails silently on many setups — this path is reliable everywhere.) ──
  async function toggleMic() {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // autoGainControl boosts quiet laptop mics; the others clean up noise.
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      // Volume meter: sample the stream so the user sees their voice register.
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(analyser)
      const samples = new Uint8Array(analyser.fftSize)
      peakLevelRef.current = 0
      const tick = () => {
        analyser.getByteTimeDomainData(samples)
        let sum = 0
        for (let i = 0; i < samples.length; i++) {
          const v = (samples[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / samples.length)
        peakLevelRef.current = Math.max(peakLevelRef.current, rms)
        setMicLevel(rms)
        meterRafRef.current = requestAnimationFrame(tick)
      }
      tick()
      audioCtxRef.current = ctx

      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        cancelAnimationFrame(meterRafRef.current)
        audioCtxRef.current?.close().catch(() => {})
        audioCtxRef.current = null
        setMicLevel(0)
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        // If the whole take never rose above the noise floor, the OS is
        // feeding us a silent/wrong input device — don't even send it.
        if (peakLevelRef.current < 0.01) {
          setTtsNote(
            'Your microphone recorded only silence. Windows is likely using the wrong input device — check Settings → System → Sound → Input, pick your real mic, and watch its test bar move while you speak.',
          )
          return
        }
        if (blob.size < 1000) {
          setTtsNote('Recording too short — tap the mic, speak, then tap ⏹.')
          return
        }
        setTranscribing(true)
        try {
          const form = new FormData()
          form.append('audio', blob, 'speech.webm')
          const token = localStorage.getItem('sprich_token')
          const res = await fetch(`${API_BASE}/speaking/stt`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
          })
          if (!res.ok) throw new Error()
          const data = (await res.json()) as { text?: string }
          if (data.text) {
            setInput(data.text)
            setTtsNote('')
          } else {
            setTtsNote(
              "Didn't catch any speech — speak closer to the mic, and check the green bar moves while you talk.",
            )
          }
        } catch {
          setTtsNote('Could not transcribe — check the API terminal for details.')
        } finally {
          setTranscribing(false)
        }
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
      setTtsNote('')
    } catch {
      setTtsNote('Microphone blocked — allow mic access for this site in your browser.')
    }
  }

  // ── Finish the session: save, score, award XP ──
  async function finishSession() {
    if (!scenario || finishing) return
    setFinishing(true)
    try {
      const res = await api.post<SessionResult>('/speaking/sessions', {
        scenario,
        messages: messages
          .filter((m) => !m.content.startsWith('('))
          .map((m) => ({ role: m.role, content: m.content })),
        durationSeconds: Math.max(0, Math.round((Date.now() - sessionStartRef.current) / 1000)),
        level: user?.level ?? 'A1',
      })
      setSessionResult(res)
    } catch {
      setTtsNote('Could not save the session — please try again.')
    } finally {
      setFinishing(false)
    }
  }

  // ── Session summary (after Finish) ──
  if (sessionResult) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-3xl font-black mb-2">Session complete!</h1>
        <p className="text-[var(--muted)] mb-8">
          {scenarioMeta?.icon} {scenarioMeta?.title} · <span className="gold-text font-bold">+{sessionResult.xpEarned} XP</span>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Overall', value: sessionResult.overallScore, accent: true },
            { label: 'Grammar', value: sessionResult.grammarScore },
            { label: 'Vocabulary', value: sessionResult.vocabularyScore },
            { label: 'Fluency', value: sessionResult.fluencyScore },
          ].map((s) => (
            <div
              key={s.label}
              className={`p-4 rounded-2xl border ${s.accent ? 'border-[#d4a843]/30 bg-[#d4a843]/5' : 'border-[var(--border)] bg-[var(--surface)]'}`}
            >
              <p className={`text-2xl font-black ${s.accent ? 'gold-text' : 'text-[var(--text)]'}`}>{s.value}</p>
              <p className="text-[var(--faint)] text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#d4a843]/20 bg-gradient-to-br from-[#d4a843]/8 to-transparent p-5 mb-8 text-left">
          <p className="text-[var(--gold)] text-xs uppercase tracking-wider mb-2 font-medium">🤖 Coach feedback</p>
          <p className="text-sm leading-relaxed">{sessionResult.aiFeedback}</p>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { const s = scenario!; startScenario(s) }}
            className="px-5 py-3 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90"
          >
            Practice again
          </button>
          <button
            onClick={() => { setSessionResult(null); setScenario(null); setMessages([]); setTPanels({}); setEPanels({}) }}
            className="px-5 py-3 rounded-xl border border-[var(--border)] text-sm font-semibold hover:bg-[var(--overlay)]"
          >
            All scenarios
          </button>
        </div>
      </div>
    )
  }

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
        <div className="flex items-center gap-2">
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
          {messages.some((m) => m.role === 'user') && (
            <button
              onClick={finishSession}
              disabled={finishing}
              className="text-xs px-3 py-1.5 rounded-lg gold-gradient text-black font-bold disabled:opacity-50"
              title="End the session — get your scores and XP"
            >
              {finishing ? 'Scoring…' : '✓ Finish'}
            </button>
          )}
        </div>
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

      {recording && (
        <div className="flex items-center gap-3 pb-2">
          <span className="text-xs font-bold text-red-400 animate-pulse">● REC</span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--track)] overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-[width] duration-75"
              style={{ width: `${Math.min(100, micLevel * 400)}%` }}
            />
          </div>
          <span className="text-xs text-[var(--faint)]">speak — this bar should move</span>
        </div>
      )}

      {ttsNote && <p className="text-[var(--faint)] text-xs text-center pb-2">{ttsNote}</p>}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (input.trim() && !loading) sendTurn(input.trim()) }}
        className="flex items-center gap-2 pt-3 border-t border-[var(--border)]"
      >
        <button
          type="button"
          onClick={toggleMic}
          disabled={transcribing}
          className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
            recording
              ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse'
              : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-50'
          }`}
          title={recording ? 'Tap to stop recording' : 'Record your reply (German)'}
        >
          {transcribing ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : recording ? (
            '⏹'
          ) : (
            '🎙️'
          )}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            recording
              ? 'Recording — speak German, tap ⏹ when done…'
              : transcribing
                ? 'Transcribing…'
                : 'Type your reply in German…'
          }
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
