'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Summary {
  name: string
  level: string
  streak: number
  longestStreak: number
  xp: number
  dailyMinutes: number
  totalCompleted: number
  completedAtLevel: number
  totalLessonsAtLevel: number
  completionPct: number
  avgScore: number
  vocab: { total: number; mastered: number }
  speaking: {
    sessions: number
    avgScore: number
    last: { scenario: string; overallScore: number; createdAt: string } | null
  }
  weeklyActivity: { label: string; count: number }[]
  recent: { title: string; score: number; completedAt: string }[]
}

export default function ProgressPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState('')
  const [insightLoading, setInsightLoading] = useState(false)

  useEffect(() => {
    api
      .get<Summary>('/progress/summary')
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [])

  async function generateInsight() {
    setInsightLoading(true)
    try {
      const res = await api.post<{ message: string }>('/progress/weekly-report', {})
      setInsight(res.message)
    } catch {
      setInsight('Could not generate an insight right now — please try again later.')
    } finally {
      setInsightLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-[var(--muted)]">Could not load your progress. Please try again.</p>
      </div>
    )
  }

  const maxCount = Math.max(1, ...summary.weeklyActivity.map((d) => d.count))
  const masteryPct =
    summary.vocab.total > 0 ? Math.round((summary.vocab.mastered / summary.vocab.total) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-[var(--faint)] text-sm mb-1">Progress</p>
        <h1 className="text-3xl font-black">Your journey so far</h1>
        <p className="text-[var(--muted)] mt-2">Real progress you can feel — not just streaks.</p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Streak', value: `${summary.streak}🔥`, sub: `best: ${summary.longestStreak}`, accent: true },
          { label: 'Total XP', value: summary.xp, sub: 'experience' },
          { label: 'Lessons done', value: summary.totalCompleted, sub: 'all-time' },
          { label: 'Avg score', value: `${summary.avgScore}%`, sub: 'accuracy' },
        ].map((s) => (
          <div
            key={s.label}
            className={`p-5 rounded-2xl border ${s.accent ? 'border-[#d4a843]/30 bg-[#d4a843]/5' : 'border-[var(--border)] bg-[var(--surface)]'}`}
          >
            <p className="text-[var(--faint)] text-xs mb-2">{s.label}</p>
            <p className={`text-2xl font-black ${s.accent ? 'gold-text' : 'text-[var(--text)]'}`}>{s.value}</p>
            <p className="text-[var(--faint-2)] text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Level completion */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[var(--faint)] text-xs uppercase tracking-wider font-medium">
            Level {summary.level} completion
          </p>
          <p className="text-sm font-bold gold-text">{summary.completionPct}%</p>
        </div>
        <div className="h-3 rounded-full bg-[var(--track)] overflow-hidden">
          <div
            className="h-full gold-gradient transition-all duration-700"
            style={{ width: `${summary.completionPct}%` }}
          />
        </div>
        <p className="text-[var(--faint)] text-xs mt-2">
          {summary.completedAtLevel} of {summary.totalLessonsAtLevel} lessons in {summary.level}
        </p>
      </div>

      {/* Weekly activity */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6">
        <p className="text-[var(--faint)] text-xs uppercase tracking-wider mb-5 font-medium">Last 7 days</p>
        <div className="flex items-end justify-between gap-2 h-32">
          {summary.weeklyActivity.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
              <div className="w-full flex items-end justify-center h-full">
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ${d.count > 0 ? 'gold-gradient' : 'bg-[var(--track)]'}`}
                  style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '8px' : '4px' }}
                  title={`${d.count} lesson${d.count === 1 ? '' : 's'}`}
                />
              </div>
              <span className="text-[var(--faint)] text-xs">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vocabulary mastery */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[var(--faint)] text-xs uppercase tracking-wider font-medium">Vocabulary mastery</p>
          <p className="text-sm font-bold text-emerald-400">
            {summary.vocab.mastered}/{summary.vocab.total}
          </p>
        </div>
        <div className="h-3 rounded-full bg-[var(--track)] overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${masteryPct}%` }}
          />
        </div>
        <p className="text-[var(--faint)] text-xs mt-2">
          {summary.vocab.total === 0
            ? 'Complete lessons to start building your vocabulary deck.'
            : `${summary.vocab.mastered} words locked into long-term memory`}
        </p>
      </div>

      {/* Speaking practice */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[var(--faint)] text-xs uppercase tracking-wider font-medium">Speaking practice</p>
          {summary.speaking.sessions > 0 && (
            <p className="text-sm font-bold gold-text">avg {summary.speaking.avgScore}</p>
          )}
        </div>
        {summary.speaking.sessions === 0 ? (
          <p className="text-[var(--muted)] text-sm">
            No sessions yet —{' '}
            <Link href="/speak" className="text-[var(--gold)] underline hover:opacity-80">
              start your first conversation
            </Link>
            . Even five minutes counts.
          </p>
        ) : (
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className="text-2xl font-black">{summary.speaking.sessions}</p>
              <p className="text-[var(--faint)] text-xs">session{summary.speaking.sessions === 1 ? '' : 's'}</p>
            </div>
            <div>
              <p className="text-2xl font-black">{summary.speaking.avgScore}</p>
              <p className="text-[var(--faint)] text-xs">avg score</p>
            </div>
            {summary.speaking.last && (
              <div className="min-w-0">
                <p className="text-sm font-semibold capitalize truncate">
                  {summary.speaking.last.scenario.replace(/_/g, ' ')}
                </p>
                <p className="text-[var(--faint)] text-xs">
                  last session · scored {summary.speaking.last.overallScore}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI insight */}
      <div className="rounded-2xl border border-[#d4a843]/20 bg-gradient-to-br from-[#d4a843]/8 to-transparent p-6 mb-6">
        <p className="text-[var(--gold)] text-xs uppercase tracking-wider mb-3 font-medium">🤖 Smart coach insight</p>
        {insight ? (
          <p className="text-[var(--text)] leading-relaxed">{insight}</p>
        ) : (
          <p className="text-[var(--muted)] text-sm mb-4">
            Get a personalized read on your week from your AI coach.
          </p>
        )}
        <button
          onClick={generateInsight}
          disabled={insightLoading}
          className="mt-4 px-5 py-2.5 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {insightLoading && (
            <span className="w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
          )}
          {insight ? 'Regenerate' : 'Generate insight'}
        </button>
      </div>

      {/* Recent lessons */}
      {summary.recent.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="text-[var(--faint)] text-xs uppercase tracking-wider mb-4 font-medium">Recently completed</p>
          <div className="space-y-3">
            {summary.recent.map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <span className="text-green-400 text-sm shrink-0 ml-4">✓ {r.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
