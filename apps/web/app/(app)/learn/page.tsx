'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

interface LessonSummary {
  id: string
  title: string
  subtitle: string
  type: string
  estimatedMinutes: number
  xpReward: number
  isPremium: boolean
}

interface Chapter {
  id: string
  number: number
  title: string
  description: string
  lessons: LessonSummary[]
}

interface ProgressEntry {
  lessonId: string
  score: number
}

const TYPE_ICON: Record<string, string> = {
  vocabulary: '🃏',
  grammar: '🧠',
  listening: '🎧',
  speaking: '🎙️',
  scenario: '🎭',
  review: '🔁',
  assessment: '📝',
}

export default function LearnPage() {
  const { user } = useAuthStore()
  const level = user?.level ?? 'A1'

  const [chapters, setChapters] = useState<Chapter[]>([])
  const [progress, setProgress] = useState<Record<string, ProgressEntry>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<Chapter[]>(`/lessons/chapters?level=${level}`),
      api.get<ProgressEntry[]>('/progress').catch(() => [] as ProgressEntry[]),
    ])
      .then(([chs, prog]) => {
        setChapters(chs)
        setProgress(Object.fromEntries(prog.map((p) => [p.lessonId, p])))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [level])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-[var(--faint)] text-sm mb-1">Level {level}</p>
        <h1 className="text-3xl font-black">Your learning path</h1>
        <p className="text-[var(--muted)] mt-2">Each lesson teaches the WHY, not just the what.</p>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-6">
          {error}
        </p>
      )}

      {chapters.length === 0 && !error && (
        <p className="text-[var(--faint)]">No lessons available for {level} yet. Coming soon.</p>
      )}

      <div className="space-y-8">
        {chapters.map((chapter) => {
          const completedCount = chapter.lessons.filter((l) => progress[l.id]).length
          return (
            <div key={chapter.id}>
              {/* Chapter header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/5 flex items-center justify-center text-[var(--gold)] font-bold text-sm">
                  {chapter.number}
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-lg leading-tight">{chapter.title}</h2>
                  <p className="text-[var(--faint)] text-xs">
                    {completedCount}/{chapter.lessons.length} complete
                  </p>
                </div>
              </div>

              <p className="text-[var(--muted)] text-sm mb-4 sm:pl-12">{chapter.description}</p>

              {/* Lessons */}
              <div className="space-y-2 sm:pl-12">
                {chapter.lessons.map((lesson) => {
                  const done = !!progress[lesson.id]
                  const locked = lesson.isPremium && !user?.isPremium
                  return (
                    <Link
                      key={lesson.id}
                      href={locked ? '/premium' : `/learn/${lesson.id}`}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        done
                          ? 'border-green-500/20 bg-green-500/5'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:border-[#d4a843]/40 hover:bg-[#d4a843]/5'
                      }`}
                    >
                      <span className="text-xl">{TYPE_ICON[lesson.type] ?? '📖'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          {lesson.title}
                          {locked && <span className="text-[var(--gold)] text-xs">✨ Premium</span>}
                        </p>
                        <p className="text-[var(--faint)] text-xs truncate">{lesson.subtitle}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {done ? (
                          <span className="text-green-400 text-sm">✓ {progress[lesson.id].score}%</span>
                        ) : (
                          <span className="text-[var(--faint)] text-xs">{lesson.estimatedMinutes}m · {lesson.xpReward} XP</span>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
