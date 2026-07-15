'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Row {
  rank: number
  name: string
  level: string
  xp: number
  streak: number
  isMe?: boolean
}

interface Leaderboard {
  top: Row[]
  me: Row
}

interface Badge {
  id: string
  icon: string
  title: string
  description: string
  earned: boolean
  progress: { current: number; target: number }
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [board, setBoard] = useState<Leaderboard | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<Leaderboard>('/progress/leaderboard').catch(() => null),
      api.get<Badge[]>('/progress/badges').catch(() => [] as Badge[]),
    ])
      .then(([b, bd]) => {
        setBoard(b)
        setBadges(bd)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const podium = board?.top.slice(0, 3) ?? []
  const rest = board?.top.slice(3) ?? []
  const meInTop = board?.top.some((r) => r.isMe) ?? false
  const earnedCount = badges.filter((b) => b.earned).length

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-[var(--faint)] text-sm mb-1">Leaderboard</p>
        <h1 className="text-3xl font-black">Who&apos;s learning hardest?</h1>
        <p className="text-[var(--muted)] mt-2">
          Earn XP from lessons, reviews, and speaking sessions to climb.
        </p>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {podium.map((r, i) => (
            <div
              key={r.rank}
              className={`text-center p-5 rounded-2xl border ${
                r.isMe
                  ? 'border-[#d4a843]/50 bg-[#d4a843]/10'
                  : i === 0
                    ? 'border-[#d4a843]/30 bg-[#d4a843]/5'
                    : 'border-[var(--border)] bg-[var(--surface)]'
              } ${i === 0 ? 'sm:-translate-y-2' : ''}`}
            >
              <div className="text-3xl mb-2">{MEDALS[i]}</div>
              <p className="font-bold text-sm truncate">{r.name}{r.isMe ? ' (you)' : ''}</p>
              <p className="gold-text font-black text-xl mt-1">{r.xp.toLocaleString()}</p>
              <p className="text-[var(--faint)] text-xs">XP · {r.level} · {r.streak}🔥</p>
            </div>
          ))}
        </div>
      )}

      {/* Ranks 4+ */}
      {rest.length > 0 && (
        <div className="space-y-2 mb-4">
          {rest.map((r) => (
            <div
              key={r.rank}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${
                r.isMe
                  ? 'border-[#d4a843]/50 bg-[#d4a843]/10'
                  : 'border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              <span className="w-8 text-center font-black text-[var(--faint)]">{r.rank}</span>
              <span className="flex-1 font-semibold text-sm truncate">
                {r.name}
                {r.isMe && <span className="text-[var(--gold)]"> (you)</span>}
              </span>
              <span className="text-[var(--faint)] text-xs">{r.level}</span>
              <span className="text-[var(--faint)] text-xs">{r.streak}🔥</span>
              <span className="gold-text font-bold text-sm w-20 text-right">
                {r.xp.toLocaleString()} XP
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Your rank, pinned if outside the visible top */}
      {board && !meInTop && (
        <>
          <p className="text-center text-[var(--faint-2)] text-xs mb-2">⋯</p>
          <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[#d4a843]/50 bg-[#d4a843]/10 mb-4">
            <span className="w-8 text-center font-black text-[var(--gold)]">{board.me.rank}</span>
            <span className="flex-1 font-semibold text-sm truncate">
              {board.me.name} <span className="text-[var(--gold)]">(you)</span>
            </span>
            <span className="text-[var(--faint)] text-xs">{board.me.level}</span>
            <span className="text-[var(--faint)] text-xs">{board.me.streak}🔥</span>
            <span className="gold-text font-bold text-sm w-20 text-right">
              {board.me.xp.toLocaleString()} XP
            </span>
          </div>
        </>
      )}

      {!board && (
        <p className="text-[var(--muted)] text-sm mb-4">Could not load the leaderboard right now.</p>
      )}

      {/* Badges */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black">Your badges</h2>
          <p className="text-[var(--faint)] text-sm">
            {earnedCount} of {badges.length} earned
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {badges.map((b) => {
            const pct = Math.round((b.progress.current / b.progress.target) * 100)
            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border transition-colors ${
                  b.earned
                    ? 'border-[#d4a843]/40 bg-gradient-to-br from-[#d4a843]/10 to-transparent'
                    : 'border-[var(--border)] bg-[var(--surface)] opacity-70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-2xl ${b.earned ? '' : 'grayscale'}`}>{b.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${b.earned ? 'gold-text' : ''}`}>{b.title}</p>
                    <p className="text-[var(--faint)] text-xs mt-0.5 leading-snug">{b.description}</p>
                  </div>
                  {b.earned && <span className="text-emerald-400 text-sm shrink-0">✓</span>}
                </div>
                {!b.earned && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-[var(--track)] overflow-hidden">
                      <div className="h-full gold-gradient" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[var(--faint-2)] text-[10px] mt-1 text-right">
                      {b.progress.current}/{b.progress.target}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
