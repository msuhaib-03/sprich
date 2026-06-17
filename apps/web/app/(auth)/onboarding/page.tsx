'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'

// ─── Step data ───────────────────────────────────────────────────────────────

const PROFILES = [
  { value: 'complete_beginner', label: 'Complete beginner', sub: 'Never learned German before', icon: '🌱' },
  { value: 'bachelors_student', label: "Bachelor's student", sub: 'Currently studying or planning to', icon: '🎓' },
  { value: 'masters_student', label: "Master's student", sub: 'Graduate level, need German fast', icon: '📚' },
  { value: 'working_person', label: 'Working professional', sub: 'Limited time, need practical German', icon: '💼' },
]

const GOALS = [
  { value: 'get_job_germany', label: 'Get a job in Germany', sub: 'Work permit, interviews, workplace German', icon: '💰' },
  { value: 'study_germany', label: 'Study in Germany', sub: 'University admission, student life', icon: '🏫' },
  { value: 'citizenship', label: 'Get citizenship', sub: 'Visa, integration, B1 exam', icon: '🇩🇪' },
  { value: 'live_comfortably', label: 'Live comfortably', sub: 'Daily life, neighbours, shopping', icon: '🏠' },
  { value: 'fun_learning', label: 'Just curious', sub: 'Learning for the love of it', icon: '✨' },
]

const TIMES = [
  { value: 15, label: '15 min / day', sub: 'Light touch — better than nothing', icon: '⚡' },
  { value: 30, label: '30 min / day', sub: 'Recommended — steady progress', icon: '🎯', recommended: true },
  { value: 60, label: '1 hour / day', sub: 'Serious learner — fast results', icon: '🚀' },
  { value: 120, label: '2 hours / day', sub: 'Intensive — treat it like a course', icon: '🔥' },
]

// ─── Placement questions — disguised as a conversation, not a test ────────────

const PLACEMENT = [
  {
    q: 'How does this sentence sound to you?',
    context: '"Guten Morgen! Wie geht es Ihnen?"',
    options: [
      { label: 'I have no idea what this says', points: 0 },
      { label: 'I think it\'s a greeting of some kind', points: 1 },
      { label: 'Good morning! How are you? (formal)', points: 3 },
    ],
  },
  {
    q: 'Can you pick the correct article for "Buch" (book)?',
    context: null,
    options: [
      { label: 'der Buch', points: 0 },
      { label: 'das Buch', points: 3 },
      { label: 'die Buch', points: 0 },
    ],
  },
  {
    q: 'What does "Ich habe einen Hund" mean?',
    context: null,
    options: [
      { label: 'Not sure', points: 0 },
      { label: 'I have a dog', points: 3 },
      { label: 'He has a dog', points: 1 },
    ],
  },
  {
    q: 'Which sentence uses the Dative case?',
    context: null,
    options: [
      { label: 'I don\'t know what Dative is', points: 0 },
      { label: 'Ich gebe dem Mann das Buch', points: 3 },
      { label: 'Ich sehe den Mann', points: 1 },
    ],
  },
  {
    q: 'How comfortable are you speaking German out loud?',
    context: null,
    options: [
      { label: 'I\'ve never tried', points: 0 },
      { label: 'I can say a few phrases', points: 1 },
      { label: 'I can hold a basic conversation', points: 3 },
      { label: 'I\'m already conversational', points: 5 },
    ],
  },
]

function scoreToLevel(score: number): string {
  if (score <= 3) return 'A1'
  if (score <= 7) return 'A1'
  if (score <= 11) return 'A2'
  if (score <= 15) return 'B1'
  return 'B2'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()

  const [step, setStep] = useState(0) // 0=profile 1=goal 2=time 3=placement 4=result
  const [profile, setProfile] = useState('')
  const [goal, setGoal] = useState('')
  const [dailyMinutes, setDailyMinutes] = useState(30)
  const [placementIndex, setPlacementIndex] = useState(0)
  const [placementScore, setPlacementScore] = useState(0)
  const [detectedLevel, setDetectedLevel] = useState('')
  const [saving, setSaving] = useState(false)

  const totalSteps = 5

  function progress() {
    if (step === 3) return ((3 + placementIndex / PLACEMENT.length) / totalSteps) * 100
    return (step / totalSteps) * 100
  }

  function handlePlacementAnswer(points: number) {
    const newScore = placementScore + points
    if (placementIndex < PLACEMENT.length - 1) {
      setPlacementScore(newScore)
      setPlacementIndex(placementIndex + 1)
    } else {
      const level = scoreToLevel(newScore + points)
      setDetectedLevel(level)
      setPlacementScore(newScore + points)
      setStep(4)
    }
  }

  async function handleFinish(confirmedLevel: string) {
    setSaving(true)
    try {
      const updated = await api.patch('/users/onboarding', {
        level: confirmedLevel,
        profile,
        goal,
        dailyMinutes,
      })
      setUser({ ...user!, ...(updated as object) })
      router.push('/dashboard')
    } catch {
      router.push('/dashboard')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">

      {/* Progress bar */}
      <div className="h-1 bg-[#1a1a1a]">
        <div
          className="h-full gold-gradient transition-all duration-500"
          style={{ width: `${progress()}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          {/* ── Step 0: Who are you ─────────────────────────────────── */}
          {step === 0 && (
            <div>
              <p className="text-[#555] text-sm mb-2">Step 1 of 4</p>
              <h1 className="text-2xl font-bold mb-2">Who are you?</h1>
              <p className="text-[#888] mb-8">We&apos;ll adapt everything to fit your life.</p>
              <div className="grid gap-3">
                {PROFILES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { setProfile(p.value); setStep(1) }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-[#111] hover:border-[#d4a843]/40 hover:bg-[#d4a843]/5 transition-all text-left group"
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <p className="font-semibold group-hover:text-white">{p.label}</p>
                      <p className="text-[#555] text-sm">{p.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: What's your goal ─────────────────────────────── */}
          {step === 1 && (
            <div>
              <p className="text-[#555] text-sm mb-2">Step 2 of 4</p>
              <h1 className="text-2xl font-bold mb-2">What&apos;s your goal?</h1>
              <p className="text-[#888] mb-8">Your lessons will focus on vocabulary that actually matters to you.</p>
              <div className="grid gap-3">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => { setGoal(g.value); setStep(2) }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-[#111] hover:border-[#d4a843]/40 hover:bg-[#d4a843]/5 transition-all text-left group"
                  >
                    <span className="text-2xl">{g.icon}</span>
                    <div>
                      <p className="font-semibold group-hover:text-white">{g.label}</p>
                      <p className="text-[#555] text-sm">{g.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Daily time ───────────────────────────────────── */}
          {step === 2 && (
            <div>
              <p className="text-[#555] text-sm mb-2">Step 3 of 4</p>
              <h1 className="text-2xl font-bold mb-2">How much time daily?</h1>
              <p className="text-[#888] mb-8">Be honest — consistency beats intensity every time.</p>
              <div className="grid gap-3">
                {TIMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setDailyMinutes(t.value); setStep(3) }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-[#111] hover:border-[#d4a843]/40 hover:bg-[#d4a843]/5 transition-all text-left group relative"
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <p className="font-semibold group-hover:text-white">{t.label}</p>
                      <p className="text-[#555] text-sm">{t.sub}</p>
                    </div>
                    {t.recommended && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded-full gold-gradient text-black font-semibold">
                        Recommended
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Placement ────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <p className="text-[#555] text-sm mb-2">
                Quick check · {placementIndex + 1} of {PLACEMENT.length}
              </p>
              <h1 className="text-2xl font-bold mb-2">Let&apos;s find your level</h1>
              <p className="text-[#888] mb-8">
                Not a test — just helping us place you correctly. No wrong answers here.
              </p>

              <div className="rounded-xl border border-white/10 bg-[#111] p-6 mb-6">
                <p className="font-semibold text-lg mb-2">{PLACEMENT[placementIndex].q}</p>
                {PLACEMENT[placementIndex].context && (
                  <p className="text-[#d4a843] font-mono text-base mb-4">
                    {PLACEMENT[placementIndex].context}
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                {PLACEMENT[placementIndex].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handlePlacementAnswer(opt.points)}
                    className="p-4 rounded-xl border border-white/8 bg-[#111] hover:border-[#d4a843]/40 hover:bg-[#d4a843]/5 transition-all text-left font-medium"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Result + roadmap reveal ─────────────────────── */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full gold-gradient flex items-center justify-center text-3xl mx-auto mb-6">
                🎯
              </div>

              <h1 className="text-3xl font-black mb-2">
                You&apos;re at <span className="gold-text">{detectedLevel}</span>
              </h1>
              <p className="text-[#888] mb-8 max-w-sm mx-auto">
                Based on your answers. You can adjust this anytime — we just want to start you in the right place.
              </p>

              {/* Roadmap */}
              <div className="rounded-xl border border-white/10 bg-[#111] p-6 mb-6 text-left">
                <p className="text-[#555] text-xs uppercase tracking-wider mb-4 font-medium">Your personal roadmap</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l, i) => {
                    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
                    const current = levels.indexOf(detectedLevel)
                    const isUnlocked = i <= current
                    const isCurrent = l === detectedLevel
                    return (
                      <div key={l} className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                          isCurrent
                            ? 'gold-gradient text-black border-transparent'
                            : isUnlocked
                            ? 'border-green-500/30 text-green-400 bg-green-500/5'
                            : 'border-white/8 text-[#444]'
                        }`}>
                          {l}
                        </span>
                        {i < 5 && <span className="text-[#333]">→</span>}
                      </div>
                    )
                  })}
                </div>
                <p className="text-[#555] text-xs mt-4">
                  Daily goal: <span className="text-white">{dailyMinutes} min</span> ·
                  Starting: <span className="text-white">{detectedLevel}</span>
                </p>
              </div>

              {/* Confirm or adjust */}
              <div className="flex flex-col gap-3">
                <Button onClick={() => handleFinish(detectedLevel)} loading={saving} className="w-full">
                  Start at {detectedLevel} — let&apos;s go →
                </Button>
                {detectedLevel !== 'A1' && (
                  <Button variant="outline" onClick={() => handleFinish('A1')} className="w-full">
                    Actually, start from A1 (full beginner)
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
