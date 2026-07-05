'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

// ─── Types ─────────────────────────────────────────────────────────────────

interface VocabWord {
  id: string
  german: string
  english: string
  article: string | null
  gender: string | null
  plural: string | null
  exampleSentence: string
  exampleTranslation: string
  memoryHook: string | null
  level: string
  grammaticalCase: string | null
}

interface SRSCard {
  vocabId: string
  vocab: VocabWord
}

interface DictEntry {
  german: string
  english: string
  pos: string | null
  gender: string | null
  example: string | null
}

interface Stats {
  total: number
  due: number
  mastered: number
  learning: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// der = masculine (blue), die = feminine (rose), das = neuter (green)
function articleColor(article: string | null) {
  switch (article) {
    case 'der':
      return 'text-sky-400'
    case 'die':
      return 'text-rose-400'
    case 'das':
      return 'text-emerald-400'
    default:
      return 'text-[#888]'
  }
}

// SM-2 grade buttons → quality score
const GRADES = [
  { label: 'Again', sub: '< 1 min', quality: 1, cls: 'border-red-500/30 text-red-400 hover:bg-red-500/10' },
  { label: 'Hard', sub: 'tougher', quality: 3, cls: 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' },
  { label: 'Good', sub: 'got it', quality: 4, cls: 'border-sky-500/30 text-sky-400 hover:bg-sky-500/10' },
  { label: 'Easy', sub: 'too easy', quality: 5, cls: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function VocabularyPage() {
  const [tab, setTab] = useState<'review' | 'dictionary'>('review')
  const [stats, setStats] = useState<Stats | null>(null)
  const [wotd, setWotd] = useState<VocabWord | null>(null)

  // Review state
  const [queue, setQueue] = useState<SRSCard[]>([])
  const [revealed, setRevealed] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(true)
  const [reviewedCount, setReviewedCount] = useState(0)

  // Dictionary state
  const [search, setSearch] = useState('')
  const [dict, setDict] = useState<DictEntry[]>([])
  const [dictLoading, setDictLoading] = useState(false)

  const loadReview = useCallback(() => {
    setReviewLoading(true)
    Promise.all([
      api.get<SRSCard[]>('/vocabulary/review').catch(() => [] as SRSCard[]),
      api.get<Stats>('/vocabulary/stats').catch(() => null),
      api.get<VocabWord | null>('/vocabulary/word-of-the-day').catch(() => null),
    ])
      .then(([cards, s, w]) => {
        setQueue(cards)
        setStats(s)
        setWotd(w)
      })
      .finally(() => setReviewLoading(false))
  }, [])

  useEffect(() => {
    loadReview()
  }, [loadReview])

  // Debounced dictionary search
  useEffect(() => {
    if (tab !== 'dictionary') return
    setDictLoading(true)
    const t = setTimeout(() => {
      api
        .get<DictEntry[]>(`/vocabulary/dictionary?search=${encodeURIComponent(search)}`)
        .catch(() => [] as DictEntry[])
        .then((words) => setDict(words))
        .finally(() => setDictLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [tab, search])

  async function grade(quality: number) {
    const current = queue[0]
    if (!current) return
    // Optimistically advance — re-queue at the end if "Again".
    const rest = queue.slice(1)
    setQueue(quality < 3 ? [...rest, current] : rest)
    setRevealed(false)
    setReviewedCount((c) => c + 1)
    setStats((s) => (s && quality >= 3 ? { ...s, due: Math.max(0, s.due - 1) } : s))
    try {
      await api.post('/vocabulary/review', { vocabId: current.vocabId, quality })
    } catch {
      /* keep the optimistic UI; a failed write just means it stays due */
    }
  }

  const current = queue[0]

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-[#555] text-sm mb-1">Vocabulary</p>
        <h1 className="text-3xl font-black">Your words</h1>
        <p className="text-[#888] mt-2">Spaced repetition locks words into long-term memory.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Due today', value: stats?.due ?? 0, accent: true },
          { label: 'Learning', value: stats?.learning ?? 0, accent: false },
          { label: 'Mastered', value: stats?.mastered ?? 0, accent: false },
        ].map((s) => (
          <div
            key={s.label}
            className={`p-4 rounded-2xl border ${s.accent ? 'border-[#d4a843]/30 bg-[#d4a843]/5' : 'border-white/5 bg-[#111]'}`}
          >
            <p className="text-[#555] text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.accent ? 'gold-text' : 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Word of the day */}
      {wotd && (
        <div className="rounded-2xl border border-[#d4a843]/20 bg-gradient-to-br from-[#d4a843]/8 to-transparent p-5 mb-8">
          <p className="text-[#d4a843] text-xs uppercase tracking-wider mb-2 font-medium">✨ Word of the day</p>
          <p className="text-2xl font-black">
            {wotd.article && <span className={articleColor(wotd.article)}>{wotd.article} </span>}
            {wotd.german}
          </p>
          <p className="text-[#888] text-sm mt-1">{wotd.english}</p>
          <p className="text-[#666] text-sm mt-3 italic">
            &ldquo;{wotd.exampleSentence}&rdquo; — {wotd.exampleTranslation}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/5">
        {(['review', 'dictionary'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-[#d4a843] text-[#d4a843]' : 'border-transparent text-[#666] hover:text-white'
            }`}
          >
            {t === 'review' ? `Review${stats?.due ? ` · ${stats.due}` : ''}` : 'Dictionary'}
          </button>
        ))}
      </div>

      {/* ── Review tab ──────────────────────────────────────────── */}
      {tab === 'review' && (
        <div>
          {reviewLoading ? (
            <div className="flex justify-center py-16">
              <span className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !current ? (
            <div className="text-center py-16 rounded-2xl border border-white/5 bg-[#111]">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-bold text-lg">
                {reviewedCount > 0 ? 'All caught up!' : 'Nothing due right now'}
              </p>
              <p className="text-[#666] text-sm mt-2 max-w-xs mx-auto">
                {stats?.total
                  ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? '' : 's'}. Come back tomorrow for more.`
                  : 'Complete a lesson to start building your review deck.'}
              </p>
            </div>
          ) : (
            <div>
              {/* Flashcard */}
              <button
                onClick={() => setRevealed(true)}
                className="w-full text-left rounded-2xl border border-white/10 bg-[#111] p-8 min-h-[260px] flex flex-col justify-center transition-colors hover:border-white/20"
              >
                <p className="text-[#555] text-xs uppercase tracking-wider mb-4">
                  {current.vocab.level} · {current.vocab.grammaticalCase ?? 'vocabulary'}
                </p>
                <p className="text-4xl font-black mb-2">
                  {current.vocab.article && (
                    <span className={articleColor(current.vocab.article)}>{current.vocab.article} </span>
                  )}
                  {current.vocab.german}
                </p>
                {current.vocab.plural && (
                  <p className="text-[#555] text-sm">plural: die {current.vocab.plural}</p>
                )}

                {revealed ? (
                  <div className="mt-6 pt-6 border-t border-white/8">
                    <p className="text-2xl font-bold text-white">{current.vocab.english}</p>
                    <p className="text-[#888] text-sm mt-3 italic">
                      &ldquo;{current.vocab.exampleSentence}&rdquo;
                    </p>
                    <p className="text-[#555] text-sm">{current.vocab.exampleTranslation}</p>
                    {current.vocab.memoryHook && (
                      <p className="text-[#d4a843] text-sm mt-3">💡 {current.vocab.memoryHook}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[#444] text-sm mt-6">Tap to reveal the meaning</p>
                )}
              </button>

              {/* Grade buttons */}
              {revealed && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {GRADES.map((g) => (
                    <button
                      key={g.label}
                      onClick={() => grade(g.quality)}
                      className={`py-3 rounded-xl border bg-[#111] font-semibold text-sm transition-colors ${g.cls}`}
                    >
                      {g.label}
                      <span className="block text-[10px] text-[#555] font-normal mt-0.5">{g.sub}</span>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-center text-[#444] text-xs mt-4">
                {queue.length} card{queue.length === 1 ? '' : 's'} left in this session
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Dictionary tab ──────────────────────────────────────── */}
      {tab === 'dictionary' && (
        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search German or English…"
            className="w-full px-4 py-3 rounded-xl bg-[#111] border border-white/10 text-white placeholder:text-[#555] focus:border-[#d4a843]/40 focus:outline-none mb-4"
          />

          {dictLoading ? (
            <div className="flex justify-center py-10">
              <span className="w-5 h-5 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : dict.length === 0 ? (
            <p className="text-[#555] text-center py-10">
              {search.trim() ? 'No words found.' : 'Type to search the dictionary.'}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {dict.map((w, i) => {
                  const article = genderArticle(w.gender)
                  return (
                    <div
                      key={`${w.german}-${i}`}
                      className="flex items-start gap-4 p-4 rounded-xl border border-white/8 bg-[#111]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold">
                          {article && <span className={articleColor(article)}>{article} </span>}
                          {w.german}
                          <span className="text-[#888] font-normal"> — {w.english}</span>
                        </p>
                        {w.example && (
                          <p className="text-[#555] text-sm mt-1 italic truncate">
                            &ldquo;{w.example}&rdquo;
                          </p>
                        )}
                      </div>
                      {w.pos && (
                        <span className="shrink-0 text-[#444] text-xs italic mt-1">{w.pos}</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-[#444] text-xs text-center mt-6">
                Dictionary data from{' '}
                <a
                  href="https://freedict.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-[#888]"
                >
                  FreeDict
                </a>{' '}
                (GPL/AGPL&nbsp;v3)
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// der/die/das from grammatical gender, for noun entries.
function genderArticle(gender: string | null): string | null {
  switch (gender) {
    case 'masculine':
      return 'der'
    case 'feminine':
      return 'die'
    case 'neuter':
      return 'das'
    default:
      return null
  }
}
