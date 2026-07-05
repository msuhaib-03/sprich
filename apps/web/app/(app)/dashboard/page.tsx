'use client'

import { useAuthStore } from '@/store/auth'
import Link from 'next/link'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function goalLabel(goal: string | null) {
  const map: Record<string, string> = {
    get_job_germany: 'Get a job in Germany',
    study_germany: 'Study in Germany',
    citizenship: 'Get citizenship',
    live_comfortably: 'Live comfortably',
    fun_learning: 'Learning for fun',
  }
  return goal ? (map[goal] ?? goal) : 'Not set'
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 17) return 'Guten Tag'
  return 'Guten Abend'
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const level = user?.level ?? 'A1'
  const levelIndex = LEVELS.indexOf(level)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-10">
        <p className="text-[var(--faint)] text-sm mb-1">{greeting()},</p>
        <h1 className="text-3xl font-black">{user?.name?.split(' ')[0] ?? 'Learner'} 👋</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Current level', value: level, sub: 'German level', accent: true },
          { label: 'Streak', value: `${user?.streak ?? 0}`, sub: 'days in a row', accent: false },
          { label: 'XP earned', value: `${user?.xp ?? 0}`, sub: 'total experience', accent: false },
          { label: 'Daily goal', value: `${user?.dailyMinutes ?? 30}m`, sub: 'per day', accent: false },
        ].map((stat) => (
          <div key={stat.label} className={`p-5 rounded-2xl border ${stat.accent ? 'border-[#d4a843]/30 bg-[#d4a843]/5' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
            <p className="text-[var(--faint)] text-xs mb-2">{stat.label}</p>
            <p className={`text-2xl font-black ${stat.accent ? 'gold-text' : 'text-[var(--text)]'}`}>{stat.value}</p>
            <p className="text-[var(--faint-2)] text-xs mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Today's lesson CTA */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[var(--faint)] text-xs uppercase tracking-wider mb-1 font-medium">Today&apos;s lesson</p>
          <h2 className="text-xl font-bold mb-1">
            {level === 'A1' ? 'Gender — Der, Die, Das' : `${level} — Continue learning`}
          </h2>
          <p className="text-[var(--faint)] text-sm">~10 min · 50 XP · {level}</p>
        </div>
        <Link
          href="/learn"
          className="shrink-0 px-6 py-3 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90"
        >
          Start →
        </Link>
      </div>

      {/* Level roadmap */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6">
        <p className="text-[var(--faint)] text-xs uppercase tracking-wider mb-5 font-medium">Your roadmap</p>
        <div className="flex items-center gap-2 flex-wrap">
          {LEVELS.map((l, i) => {
            const done = i < levelIndex
            const current = i === levelIndex
            return (
              <div key={l} className="flex items-center gap-2">
                <div className={`px-4 py-2 rounded-xl font-bold text-sm border ${
                  current
                    ? 'gold-gradient text-black border-transparent'
                    : done
                    ? 'border-green-500/30 bg-green-500/5 text-green-400'
                    : 'border-[var(--border)] text-[var(--faint-2)]'
                }`}>
                  {done && <span className="mr-1">✓</span>}{l}
                </div>
                {i < 5 && <span className="text-[var(--faint-2)] text-xs">───</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { href: '/speak', icon: '🎙️', title: 'Speaking practice', sub: 'AI conversation partner' },
          { href: '/vocabulary', icon: '🃏', title: 'Vocabulary review', sub: 'Cards due today' },
          { href: '/progress', icon: '📊', title: 'My progress', sub: 'Weekly stats & reports' },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <div className="text-2xl mb-3">{card.icon}</div>
            <p className="font-semibold text-sm">{card.title}</p>
            <p className="text-[var(--faint)] text-xs mt-1">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Goal reminder */}
      <div className="mt-6 px-4 py-3 rounded-xl border border-[var(--border)] flex items-center gap-3">
        <span className="text-lg">🎯</span>
        <p className="text-[var(--faint)] text-sm">
          Goal: <span className="text-[var(--muted)]">{goalLabel(user?.goal ?? null)}</span>
        </p>
      </div>
    </div>
  )
}
