'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
} from 'lucide-react'
import { api } from '@/lib/api'
import { playTts } from '@/lib/tts'
import { splitGermanNoun, stripLeadingArticle } from '@/lib/vocab'
import { Skeleton } from '@/components/ui/skeleton'

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

// A full deck entry (from GET /vocabulary/deck) — carries the SRS progress
// fields the "your words" browser renders.
interface DeckCard {
  vocabId: string
  repetitions: number
  nextReview: string
  vocab: VocabWord
}

// repetitions needed before a card counts as "mastered" (mirrors the API).
const MASTERED_REPS = 5

type DeckView = 'all' | 'due' | 'learning' | 'mastered'

// "Next review in …" — coarse, learner-friendly.
function relativeReview(ms: number): string {
  if (ms <= 0) return 'now'
  const days = Math.round(ms / 86_400_000)
  if (days >= 1) return days === 1 ? 'tomorrow' : `in ${days} days`
  const hours = Math.round(ms / 3_600_000)
  if (hours >= 1) return hours === 1 ? 'in 1 hour' : `in ${hours} hours`
  return 'shortly'
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

// Gender color code (see CLAUDE.md): der = masculine (blue), die = feminine
// (pink), das = neuter (green). Keep this identical everywhere gender is taught.
function articleColor(article: string | null) {
  switch (article) {
    case 'der':
      return 'text-blue-400'
    case 'die':
      return 'text-pink-400'
    case 'das':
      return 'text-green-400'
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

  // Dictionary "added to deck" tracking: german|english key -> the created
  // VocabWord id (needed to remove it again). "pending" while the POST is in
  // flight. Plus the WOTD flag.
  const [added, setAdded] = useState<Map<string, string>>(new Map())
  const [wotdAdded, setWotdAdded] = useState(false)

  // "Your words" browser — opened by tapping a stat card. `deckView` null means
  // it's closed; otherwise it's the active filter. The deck is fetched once and
  // filtered client-side so the segmented control switches instantly.
  const [deckView, setDeckView] = useState<DeckView | null>(null)
  const [deck, setDeck] = useState<DeckCard[] | null>(null)
  const [deckLoading, setDeckLoading] = useState(false)
  const [deckNow, setDeckNow] = useState(0)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

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

  // Optimistic stat nudge. A just-added/removed card is always "learning"
  // (never mastered), so `total` and `learning` move together.
  const nudgeStats = (dTotal: number, dDue = 0) =>
    setStats((s) =>
      s
        ? {
            ...s,
            total: Math.max(0, s.total + dTotal),
            learning: Math.max(0, s.learning + dTotal),
            due: Math.max(0, s.due + dDue),
          }
        : s,
    )

  async function addWotdToDeck() {
    if (!wotd || wotdAdded) return
    setWotdAdded(true)
    nudgeStats(1)
    try {
      await api.post('/vocabulary/deck/word', { vocabId: wotd.id })
    } catch {
      setWotdAdded(false)
      nudgeStats(-1)
    }
  }

  async function removeWotdFromDeck() {
    if (!wotd || !wotdAdded) return
    setWotdAdded(false)
    nudgeStats(-1)
    try {
      await api.post('/vocabulary/deck/remove', { vocabId: wotd.id })
    } catch {
      setWotdAdded(true)
      nudgeStats(1)
    }
  }

  async function addDictToDeck(w: DictEntry) {
    const key = `${w.german}|${w.english}`
    if (added.has(key)) return
    setAdded((prev) => new Map(prev).set(key, 'pending'))
    nudgeStats(1)
    try {
      const res = await api.post<{ vocabId: string }>('/vocabulary/deck/dictionary', {
        german: w.german,
        english: w.english,
        gender: w.gender ?? undefined,
        example: w.example ?? undefined,
      })
      setAdded((prev) => new Map(prev).set(key, res.vocabId))
    } catch {
      setAdded((prev) => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      nudgeStats(-1)
    }
  }

  async function removeDictFromDeck(w: DictEntry) {
    const key = `${w.german}|${w.english}`
    const vocabId = added.get(key)
    if (!vocabId || vocabId === 'pending') return
    setAdded((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
    nudgeStats(-1)
    try {
      await api.post('/vocabulary/deck/remove', { vocabId })
    } catch {
      setAdded((prev) => new Map(prev).set(key, vocabId))
      nudgeStats(1)
    }
  }

  const current = queue[0]

  async function removeCurrentFromDeck() {
    if (!current) return
    const dropped = current
    setQueue((q) => q.slice(1))
    setRevealed(false)
    nudgeStats(-1, -1)
    try {
      await api.post('/vocabulary/deck/remove', { vocabId: dropped.vocabId })
    } catch {
      setQueue((q) => [dropped, ...q])
      nudgeStats(1, 1)
    }
  }

  // ── "Your words" browser ──────────────────────────────────────────────────

  function openDeck(view: DeckView) {
    setDeckView(view)
    setExpandedCard(null)
    setDeckNow(new Date().getTime())
    if (deck === null && !deckLoading) {
      setDeckLoading(true)
      api
        .get<DeckCard[]>('/vocabulary/deck')
        .then(setDeck)
        .catch(() => setDeck([]))
        .finally(() => setDeckLoading(false))
    }
  }

  async function removeFromDeckBrowser(card: DeckCard) {
    const prev = deck
    setDeck((d) => d?.filter((c) => c.vocabId !== card.vocabId) ?? d)
    setQueue((q) => q.filter((c) => c.vocabId !== card.vocabId))
    try {
      await api.post('/vocabulary/deck/remove', { vocabId: card.vocabId })
      // Counts span all three stats here (learning vs mastered), so resync
      // from the server rather than guess.
      api.get<Stats>('/vocabulary/stats').then(setStats).catch(() => {})
    } catch {
      setDeck(prev)
    }
  }

  // `deckNow` is stamped when the browser opens (see openDeck) — good enough
  // for the day/hour-grained "next review in …" labels, and keeps Date.now()
  // out of render.
  const deckCounts = {
    all: deck?.length ?? 0,
    due: deck?.filter((c) => new Date(c.nextReview).getTime() <= deckNow).length ?? 0,
    learning: deck?.filter((c) => c.repetitions < MASTERED_REPS).length ?? 0,
    mastered: deck?.filter((c) => c.repetitions >= MASTERED_REPS).length ?? 0,
  }
  const deckFiltered = (deck ?? []).filter((c) => {
    if (deckView === 'mastered') return c.repetitions >= MASTERED_REPS
    if (deckView === 'due') return new Date(c.nextReview).getTime() <= deckNow
    if (deckView === 'learning') return c.repetitions < MASTERED_REPS
    return true
  })

  // Split "das Kino" + article "das" into { article, noun } so the article
  // isn't printed (or spoken) twice. See lib/vocab.ts.
  const wotdParts = wotd ? splitGermanNoun(wotd.article, wotd.german) : null
  const currentParts = current
    ? splitGermanNoun(current.vocab.article, current.vocab.german)
    : null

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-[var(--faint)] text-sm mb-1">Vocabulary</p>
        <h1 className="text-3xl font-black">Your words</h1>
        <p className="text-[var(--muted)] mt-2">Spaced repetition locks words into long-term memory.</p>
      </div>

      {/* Stats — each is a button that opens the "your words" browser filtered
          to it. The indicator only lights up while its count is non-zero
          (gold for "Due today", blue for "Learning", green check for
          "Mastered"); an empty deck reads as calm grey. */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        {(() => {
          const due = stats?.due ?? 0
          const learning = stats?.learning ?? 0
          const mastered = stats?.mastered ?? 0
          return [
            {
              label: 'Due today',
              view: 'due' as DeckView,
              value: due,
              box: due > 0 ? 'border-[#d4a843]/40 bg-[#d4a843]/5' : 'border-[var(--border)] bg-[var(--surface)]',
              value_cls: due > 0 ? 'gold-text' : 'text-[var(--text)]',
              indicator: (
                <span
                  className={`w-2 h-2 rounded-full ${due > 0 ? 'bg-[var(--gold)]' : 'bg-[var(--faint-2)]'}`}
                />
              ),
            },
            {
              label: 'Learning',
              view: 'learning' as DeckView,
              value: learning,
              box: 'border-[var(--border)] bg-[var(--surface)]',
              value_cls: 'text-[var(--text)]',
              indicator: (
                <span
                  className={`w-2 h-2 rounded-full ${learning > 0 ? 'bg-sky-400' : 'bg-[var(--faint-2)]'}`}
                />
              ),
            },
            {
              label: 'Mastered',
              view: 'mastered' as DeckView,
              value: mastered,
              box: 'border-[var(--border)] bg-[var(--surface)]',
              value_cls: 'text-[var(--text)]',
              indicator: (
                <Check
                  size={13}
                  strokeWidth={3}
                  className={mastered > 0 ? 'text-emerald-400' : 'text-[var(--faint-2)]'}
                />
              ),
            },
          ]
        })().map((s) => (
          <button
            key={s.label}
            onClick={() => openDeck(s.view)}
            className={`group relative text-left p-4 rounded-2xl border transition-colors hover:border-[var(--border-strong)] active:scale-[0.99] ${s.box}`}
          >
            <ChevronRight
              size={14}
              className="absolute top-3.5 right-3 text-[var(--faint-2)] group-hover:text-[var(--muted)] transition-colors"
            />
            <p className="flex items-center gap-1.5 text-[var(--faint)] text-xs mb-1">
              {s.indicator}
              {s.label}
            </p>
            <p className={`text-2xl font-black ${s.value_cls}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Word of the day — two columns from md up: the word + meaning on the
          left, audio and the deck toggle pinned right (stacked on mobile). */}
      {wotd && (
        <div className="rounded-2xl border border-[#d4a843]/20 bg-gradient-to-br from-[#d4a843]/8 to-transparent p-5 mb-8 md:flex md:items-start md:gap-6">
          <div className="md:flex-1 md:min-w-0">
            <p className="text-[var(--gold)] text-xs uppercase tracking-wider mb-2 font-medium">
              ✨ Word of the day
            </p>
            <p className="text-2xl font-black">
              {wotdParts?.article && (
                <span className={articleColor(wotdParts.article)}>{wotdParts.article} </span>
              )}
              {wotdParts?.noun}
            </p>
            <p className="text-[var(--muted)] text-sm mt-1">{wotd.english}</p>
            <p className="text-[var(--faint)] text-sm mt-3 italic">
              &ldquo;{wotd.exampleSentence}&rdquo; — {wotd.exampleTranslation}
            </p>
          </div>

          <div className="mt-4 md:mt-0 md:w-44 md:shrink-0 flex flex-col gap-2">
            <button
              onClick={() =>
                playTts(
                  `${wotdParts?.article ?? ''} ${wotdParts?.noun ?? ''}. ${wotd.exampleSentence}`,
                )
              }
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors"
            >
              🔊 Listen
            </button>

            {wotdAdded ? (
              <button
                onClick={removeWotdFromDeck}
                title="Remove from your review deck"
                className="group inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold border transition-colors border-emerald-500/40 text-emerald-400 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10 focus-visible:border-red-500/40 focus-visible:text-red-400 focus-visible:bg-red-500/10 focus-visible:outline-none"
              >
                <span className="group-hover:hidden group-focus-visible:hidden">✓ Added to deck</span>
                <span className="hidden group-hover:inline group-focus-visible:inline">
                  × Remove from deck
                </span>
              </button>
            ) : (
              <button
                onClick={addWotdToDeck}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold border border-[#d4a843]/40 text-[var(--gold)] hover:bg-[#d4a843]/10 transition-colors"
              >
                + Add to review deck
              </button>
            )}
          </div>
        </div>
      )}

      {deckView !== null ? (
        /* ── "Your words" browser (opened from a stat card) ─────────── */
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setDeckView(null)}
              aria-label="Back to review"
              className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--overlay)] active:scale-95 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl font-black leading-tight">Your words</h2>
              <p className="text-[var(--faint)] text-xs">
                {deckLoading
                  ? 'loading…'
                  : `${deckFiltered.length} ${deckFiltered.length === 1 ? 'word' : 'words'}`}
              </p>
            </div>
          </div>

          <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-4">
            {(['all', 'due', 'learning', 'mastered'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setDeckView(f)
                  setExpandedCard(null)
                }}
                className={`flex-1 px-1.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  deckView === f
                    ? 'bg-[var(--overlay)] text-[var(--text)]'
                    : 'text-[var(--faint)] hover:text-[var(--text)]'
                }`}
              >
                {f}
                <span className="ml-1 text-[var(--faint-2)]">{deckCounts[f]}</span>
              </button>
            ))}
          </div>

          {deckLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : deckFiltered.length === 0 ? (
            <div className="text-center py-14 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="text-3xl mb-2">
                {deckView === 'mastered' ? '🏆' : deckView === 'due' ? '☕' : '🌱'}
              </div>
              <p className="font-bold">
                {deckView === 'mastered'
                  ? 'No mastered words yet'
                  : deckView === 'due'
                    ? 'Nothing due right now'
                    : deckView === 'learning'
                      ? 'No words in progress'
                      : 'Your deck is empty'}
              </p>
              <p className="text-[var(--faint)] text-sm mt-1.5 max-w-xs mx-auto">
                {deckView === 'mastered'
                  ? 'Keep reviewing — words land here after five clean recalls.'
                  : deckView === 'due'
                    ? 'Come back later, or browse the other filters.'
                    : 'Add words from the dictionary or finish a lesson to start.'}
              </p>
              {deckView !== 'due' && (
                <button
                  onClick={() => {
                    setDeckView(null)
                    setTab('dictionary')
                  }}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--border)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text)] transition-colors"
                >
                  Browse the dictionary →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {deckFiltered.map((card) => {
                const { article, noun } = splitGermanNoun(card.vocab.article, card.vocab.german)
                const mastered = card.repetitions >= MASTERED_REPS
                const dueMs = new Date(card.nextReview).getTime() - deckNow
                const open = expandedCard === card.vocabId
                const reps = Math.min(Math.max(card.repetitions, 0), MASTERED_REPS)
                return (
                  <div
                    key={card.vocabId}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedCard(open ? null : card.vocabId)}
                      className="w-full text-left p-4 flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">
                          {article && <span className={articleColor(article)}>{article} </span>}
                          {noun}
                          <span className="text-[var(--muted)] font-normal"> — {card.vocab.english}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="flex gap-1" aria-hidden>
                            {[0, 1, 2, 3, 4].map((i) => (
                              <span
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  i < reps
                                    ? mastered
                                      ? 'bg-emerald-400'
                                      : 'bg-[var(--gold)]'
                                    : 'bg-[var(--faint-2)]'
                                }`}
                              />
                            ))}
                          </span>
                          <span
                            className={`text-xs ${
                              mastered
                                ? 'text-emerald-400'
                                : dueMs <= 0
                                  ? 'text-[var(--gold)]'
                                  : 'text-[var(--faint)]'
                            }`}
                          >
                            {mastered
                              ? 'Mastered'
                              : dueMs <= 0
                                ? 'Due now'
                                : `Next review ${relativeReview(dueMs)}`}
                          </span>
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 mt-1 text-[var(--faint)] transition-transform ${
                          open ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {open && (
                      <div className="px-4 pb-4 space-y-2">
                        {card.vocab.plural && (
                          <p className="text-[var(--faint)] text-sm">
                            plural: die {stripLeadingArticle(card.vocab.plural)}
                          </p>
                        )}
                        {card.vocab.exampleSentence && (
                          <p className="text-[var(--muted)] text-sm italic">
                            &ldquo;{card.vocab.exampleSentence}&rdquo;
                          </p>
                        )}
                        {card.vocab.exampleTranslation && (
                          <p className="text-[var(--faint)] text-sm">
                            {card.vocab.exampleTranslation}
                          </p>
                        )}
                        {card.vocab.memoryHook && (
                          <p className="text-[var(--gold)] text-sm">💡 {card.vocab.memoryHook}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => playTts(`${article ?? ''} ${noun}`)}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition-colors"
                          >
                            🔊 Listen
                          </button>
                          <button
                            onClick={() => removeFromDeckBrowser(card)}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--faint)] hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
       <>
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
            <div>
              <Skeleton className="w-full min-h-[260px] rounded-2xl" />
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ) : !current ? (
            <div className="text-center py-16 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              {stats?.total ? (
                <>
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="font-bold text-lg">
                    {reviewedCount > 0 ? 'All caught up!' : 'Nothing due right now'}
                  </p>
                  <p className="text-[var(--faint)] text-sm mt-2 max-w-xs mx-auto">
                    {`You reviewed ${reviewedCount} card${reviewedCount === 1 ? '' : 's'}. Come back tomorrow for more.`}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">🌱</div>
                  <p className="font-bold text-lg">Your review deck is empty</p>
                  <p className="text-[var(--faint)] text-sm mt-2 max-w-xs mx-auto">
                    Finish a lesson, or add a few words yourself to get spaced repetition going.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {wotd && !wotdAdded && (
                      <button
                        onClick={addWotdToDeck}
                        className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#d4a843]/40 text-[var(--gold)] hover:bg-[#d4a843]/10 transition-colors"
                      >
                        + Add today&rsquo;s word
                      </button>
                    )}
                    <button
                      onClick={() => setTab('dictionary')}
                      className="px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--border)] text-[var(--text-soft)] hover:border-[var(--border-strong)] hover:text-[var(--text)] transition-colors"
                    >
                      Browse the dictionary →
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div>
              {/* Flashcard (div, not button — it contains the 🔊 + manage buttons) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setRevealed(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setRevealed(true) }}
                className="relative w-full text-left rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 pr-14 min-h-[260px] flex flex-col justify-center transition-colors hover:border-[var(--border-strong)] cursor-pointer"
              >
                {/* Top-right: drop this card from the deck. */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeCurrentFromDeck()
                  }}
                  title="Remove from your review deck"
                  aria-label="Remove from your review deck"
                  className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-lg text-[var(--faint)] hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-colors"
                >
                  <BookmarkCheck size={18} />
                </button>

                <p className="text-[var(--faint)] text-xs uppercase tracking-wider mb-4">
                  {current.vocab.level} · {current.vocab.grammaticalCase ?? 'vocabulary'}
                </p>
                <p className="text-4xl font-black mb-2 flex items-center gap-3">
                  <span>
                    {currentParts?.article && (
                      <span className={articleColor(currentParts.article)}>
                        {currentParts.article}{' '}
                      </span>
                    )}
                    {currentParts?.noun}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      playTts(`${currentParts?.article ?? ''} ${currentParts?.noun ?? ''}`)
                    }}
                    className="text-lg text-[var(--gold)] hover:opacity-80"
                    title="Hear the word"
                  >
                    🔊
                  </button>
                </p>
                {current.vocab.plural && (
                  <p className="text-[var(--faint)] text-sm">
                    plural: die {stripLeadingArticle(current.vocab.plural)}
                  </p>
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setRevealed(true)
                    }}
                    className="mt-6 self-start inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-strong)] bg-[var(--overlay)] text-[var(--text-soft)] text-sm font-medium hover:bg-[var(--surface-hover)] hover:text-[var(--text)] active:scale-[0.98] transition-colors"
                  >
                    <Eye size={15} />
                    Tap to reveal the meaning
                  </button>
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
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : dict.length === 0 ? (
            <p className="text-[var(--faint)] text-center py-10">
              {search.trim() ? 'No words found.' : 'Type to search the dictionary.'}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {dict.map((w, i) => {
                  const { article, noun } = splitGermanNoun(genderArticle(w.gender), w.german)
                  const isAdded = added.has(`${w.german}|${w.english}`)
                  return (
                    <div
                      key={`${w.german}|${w.english}|${i}`}
                      className="relative flex items-start gap-3 p-4 pr-14 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold">
                          {article && <span className={articleColor(article)}>{article} </span>}
                          {noun}
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

                      {/* Top-right: add to / remove from the review deck. */}
                      <button
                        onClick={() => (isAdded ? removeDictFromDeck(w) : addDictToDeck(w))}
                        title={isAdded ? 'Remove from your review deck' : 'Add to review deck'}
                        aria-label={isAdded ? 'Remove from your review deck' : 'Add to review deck'}
                        className={`absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-lg transition-colors active:scale-95 ${
                          isAdded
                            ? 'text-emerald-400 hover:text-red-400 hover:bg-red-500/10'
                            : 'text-[var(--gold)] hover:bg-[#d4a843]/10'
                        }`}
                      >
                        {isAdded ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
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
      </>
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
