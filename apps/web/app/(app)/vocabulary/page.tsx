'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { playTts } from '@/lib/tts'

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
      return 'text-[var(--muted)]'
  }
}

// The sounds that trip up every German beginner — ä/ö/ü (umlauts), ß (eszett,
// the "Greek beta" letter = sharp ss), and the key letter combinations.
const SOUNDS: { symbol: string; name: string; how: string; example: string; meaning: string }[] = [
  { symbol: 'ä', name: 'a-umlaut', how: 'Like the "e" in "bed" (short) or the "ai" in "air" (long).', example: 'Mädchen', meaning: 'girl' },
  { symbol: 'ö', name: 'o-umlaut', how: 'Say "ay" as in "day", hold your tongue there, then round your lips into an O.', example: 'schön', meaning: 'beautiful' },
  { symbol: 'ü', name: 'u-umlaut', how: 'Say "ee", keep your tongue there, then round your lips tightly like whistling.', example: 'fünf', meaning: 'five' },
  { symbol: 'ß', name: 'eszett (sharp S)', how: 'Looks like a Greek beta (β) — but it is simply a sharp, hissed "ss" sound.', example: 'heißen', meaning: 'to be called' },
  { symbol: 'sch', name: '', how: 'Exactly like English "sh" in "shoe".', example: 'Schule', meaning: 'school' },
  { symbol: 'ch (after a, o, u)', name: 'hard ch', how: 'A throaty "kh" from the back of the mouth, like Scottish "loch".', example: 'Buch', meaning: 'book' },
  { symbol: 'ch (after e, i)', name: 'soft ch', how: 'A soft hiss at the front of the mouth, like whispering "hue".', example: 'ich', meaning: 'I' },
  { symbol: 'ei', name: '', how: 'Like English "eye". (Rule: say the SECOND letter\'s English name.)', example: 'nein', meaning: 'no' },
  { symbol: 'ie', name: '', how: 'A long "ee" as in "see". (Same rule: say the second letter.)', example: 'Liebe', meaning: 'love' },
  { symbol: 'eu / äu', name: '', how: 'Like "oy" in "boy".', example: 'Deutsch', meaning: 'German' },
  { symbol: 'w', name: '', how: 'Like English "v" — Wasser sounds like "vasser".', example: 'Wasser', meaning: 'water' },
  { symbol: 'v', name: '', how: 'Usually like English "f" — Vater sounds like "fahter".', example: 'Vater', meaning: 'father' },
  { symbol: 'z', name: '', how: 'Like "ts" in "cats" — even at the start of a word.', example: 'Zeit', meaning: 'time' },
  { symbol: 'j', name: '', how: 'Like English "y" in "yes".', example: 'ja', meaning: 'yes' },
  { symbol: 'r', name: '', how: 'A soft gargle from the back of the throat (not the English r).', example: 'rot', meaning: 'red' },
]

// SM-2 grade buttons → quality score
const GRADES = [
  { label: 'Again', sub: '< 1 min', quality: 1, cls: 'border-red-500/30 text-red-400 hover:bg-red-500/10' },
  { label: 'Hard', sub: 'tougher', quality: 3, cls: 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' },
  { label: 'Good', sub: 'got it', quality: 4, cls: 'border-sky-500/30 text-sky-400 hover:bg-sky-500/10' },
  { label: 'Easy', sub: 'too easy', quality: 5, cls: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function VocabularyPage() {
  const [tab, setTab] = useState<'review' | 'dictionary' | 'sounds'>('review')
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

  // "Added to deck" tracking (by a german|english key) + WOTD flag
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [wotdAdded, setWotdAdded] = useState(false)

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

  async function addWotdToDeck() {
    if (!wotd || wotdAdded) return
    setWotdAdded(true)
    setStats((s) => (s ? { ...s, total: s.total + 1 } : s))
    try {
      await api.post('/vocabulary/deck/word', { vocabId: wotd.id })
    } catch {
      setWotdAdded(false)
    }
  }

  async function addDictToDeck(w: DictEntry) {
    const key = `${w.german}|${w.english}`
    if (added.has(key)) return
    setAdded((prev) => new Set(prev).add(key))
    setStats((s) => (s ? { ...s, total: s.total + 1 } : s))
    try {
      await api.post('/vocabulary/deck/dictionary', {
        german: w.german,
        english: w.english,
        gender: w.gender ?? undefined,
        example: w.example ?? undefined,
      })
    } catch {
      setAdded((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const current = queue[0]

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-[var(--faint)] text-sm mb-1">Vocabulary</p>
        <h1 className="text-3xl font-black">Your words</h1>
        <p className="text-[var(--muted)] mt-2">Spaced repetition locks words into long-term memory.</p>
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
            className={`p-4 rounded-2xl border ${s.accent ? 'border-[#d4a843]/30 bg-[#d4a843]/5' : 'border-[var(--border)] bg-[var(--surface)]'}`}
          >
            <p className="text-[var(--faint)] text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.accent ? 'gold-text' : 'text-[var(--text)]'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Word of the day */}
      {wotd && (
        <div className="rounded-2xl border border-[#d4a843]/20 bg-gradient-to-br from-[#d4a843]/8 to-transparent p-5 mb-8">
          <p className="text-[var(--gold)] text-xs uppercase tracking-wider mb-2 font-medium">✨ Word of the day</p>
          <p className="text-2xl font-black flex items-center gap-3">
            <span>
              {wotd.article && <span className={articleColor(wotd.article)}>{wotd.article} </span>}
              {wotd.german}
            </span>
            <button
              onClick={() => playTts(`${wotd.article ?? ''} ${wotd.german}. ${wotd.exampleSentence}`)}
              className="text-base text-[var(--gold)] hover:opacity-80"
              title="Hear it spoken"
            >
              🔊
            </button>
          </p>
          <p className="text-[var(--muted)] text-sm mt-1">{wotd.english}</p>
          <p className="text-[var(--faint)] text-sm mt-3 italic">
            &ldquo;{wotd.exampleSentence}&rdquo; — {wotd.exampleTranslation}
          </p>
          <button
            onClick={addWotdToDeck}
            disabled={wotdAdded}
            className={`mt-4 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              wotdAdded
                ? 'text-emerald-400 cursor-default'
                : 'border border-[#d4a843]/40 text-[var(--gold)] hover:bg-[#d4a843]/10'
            }`}
          >
            {wotdAdded ? '✓ Added to your deck' : '+ Add to my review deck'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
        {(['review', 'dictionary', 'sounds'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-[#d4a843] text-[var(--gold)]' : 'border-transparent text-[var(--faint)] hover:text-[var(--text)]'
            }`}
          >
            {t === 'review'
              ? `Review${stats?.due ? ` · ${stats.due}` : ''}`
              : t === 'dictionary'
                ? 'Dictionary'
                : 'Sounds 🔊'}
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
            <div className="text-center py-16 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-bold text-lg">
                {reviewedCount > 0 ? 'All caught up!' : 'Nothing due right now'}
              </p>
              <p className="text-[var(--faint)] text-sm mt-2 max-w-xs mx-auto">
                {stats?.total
                  ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? '' : 's'}. Come back tomorrow for more.`
                  : 'Complete a lesson to start building your review deck.'}
              </p>
            </div>
          ) : (
            <div>
              {/* Flashcard (div, not button — it contains the 🔊 button) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setRevealed(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setRevealed(true) }}
                className="w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 min-h-[260px] flex flex-col justify-center transition-colors hover:border-[var(--border-strong)] cursor-pointer"
              >
                <p className="text-[var(--faint)] text-xs uppercase tracking-wider mb-4">
                  {current.vocab.level} · {current.vocab.grammaticalCase ?? 'vocabulary'}
                </p>
                <p className="text-4xl font-black mb-2 flex items-center gap-3">
                  <span>
                    {current.vocab.article && (
                      <span className={articleColor(current.vocab.article)}>{current.vocab.article} </span>
                    )}
                    {current.vocab.german}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      playTts(`${current.vocab.article ?? ''} ${current.vocab.german}`)
                    }}
                    className="text-lg text-[var(--gold)] hover:opacity-80"
                    title="Hear the word"
                  >
                    🔊
                  </button>
                </p>
                {current.vocab.plural && (
                  <p className="text-[var(--faint)] text-sm">plural: die {current.vocab.plural}</p>
                )}

                {revealed ? (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <p className="text-2xl font-bold text-[var(--text)]">{current.vocab.english}</p>
                    <p className="text-[var(--muted)] text-sm mt-3 italic">
                      &ldquo;{current.vocab.exampleSentence}&rdquo;
                    </p>
                    <p className="text-[var(--faint)] text-sm">{current.vocab.exampleTranslation}</p>
                    {current.vocab.memoryHook && (
                      <p className="text-[var(--gold)] text-sm mt-3">💡 {current.vocab.memoryHook}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[var(--faint-2)] text-sm mt-6">Tap to reveal the meaning</p>
                )}
              </div>

              {/* Grade buttons */}
              {revealed && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {GRADES.map((g) => (
                    <button
                      key={g.label}
                      onClick={() => grade(g.quality)}
                      className={`py-3 rounded-xl border bg-[var(--surface)] font-semibold text-sm transition-colors ${g.cls}`}
                    >
                      {g.label}
                      <span className="block text-[10px] text-[var(--faint)] font-normal mt-0.5">{g.sub}</span>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-center text-[var(--faint-2)] text-xs mt-4">
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
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[#d4a843]/40 focus:outline-none mb-4"
          />

          {dictLoading ? (
            <div className="flex justify-center py-10">
              <span className="w-5 h-5 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : dict.length === 0 ? (
            <p className="text-[var(--faint)] text-center py-10">
              {search.trim() ? 'No words found.' : 'Type to search the dictionary.'}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {dict.map((w, i) => {
                  const article = genderArticle(w.gender)
                  const isAdded = added.has(`${w.german}|${w.english}`)
                  return (
                    <div
                      key={`${w.german}|${w.english}|${i}`}
                      className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold">
                          {article && <span className={articleColor(article)}>{article} </span>}
                          {w.german}
                          <span className="text-[var(--muted)] font-normal"> — {w.english}</span>
                        </p>
                        {w.example && (
                          <p className="text-[var(--faint)] text-sm mt-1 italic truncate">
                            &ldquo;{w.example}&rdquo;
                          </p>
                        )}
                      </div>
                      {w.pos && (
                        <span className="shrink-0 text-[var(--faint-2)] text-xs italic mt-1">{w.pos}</span>
                      )}
                      <button
                        onClick={() => playTts(w.german)}
                        title="Hear it"
                        className="shrink-0 w-8 h-8 rounded-lg text-sm border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                      >
                        🔊
                      </button>
                      <button
                        onClick={() => addDictToDeck(w)}
                        disabled={isAdded}
                        title={isAdded ? 'In your deck' : 'Add to review deck'}
                        className={`shrink-0 w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                          isAdded
                            ? 'text-emerald-400 cursor-default'
                            : 'border border-[#d4a843]/40 text-[var(--gold)] hover:bg-[#d4a843]/10'
                        }`}
                      >
                        {isAdded ? '✓' : '+'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <p className="text-[var(--faint-2)] text-xs text-center mt-6">
                Dictionary data from{' '}
                <a
                  href="https://freedict.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-[var(--muted)]"
                >
                  FreeDict
                </a>{' '}
                (GPL/AGPL&nbsp;v3)
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Sounds tab: how to pronounce the tricky German letters ── */}
      {tab === 'sounds' && (
        <div>
          <p className="text-[var(--muted)] text-sm mb-6">
            German spelling is far more consistent than English — learn these once and you can
            pronounce almost any word you read. Tap <span className="text-[var(--gold)]">🔊</span> to
            hear each example spoken by a native-style voice.
          </p>
          <div className="space-y-2">
            {SOUNDS.map((s) => (
              <div
                key={s.symbol}
                className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
              >
                <div className="shrink-0 w-24">
                  <p className="text-xl font-black gold-text leading-tight">{s.symbol}</p>
                  {s.name && <p className="text-[var(--faint)] text-[10px] mt-0.5">{s.name}</p>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-soft)]">{s.how}</p>
                  <p className="text-[var(--faint)] text-xs mt-1">
                    <span className="font-semibold text-[var(--muted)]">{s.example}</span> — {s.meaning}
                  </p>
                </div>
                <button
                  onClick={() => playTts(s.example)}
                  title={`Hear "${s.example}"`}
                  className="shrink-0 w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                >
                  🔊
                </button>
              </div>
            ))}
          </div>
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
