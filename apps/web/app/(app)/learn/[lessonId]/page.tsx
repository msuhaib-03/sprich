'use client'

import { useEffect, useState, useMemo, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { GrammarExample, ExampleData } from '@/components/lesson/grammar-example'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Exercise {
  id: string
  type: string
  prompt: string
  options: string[] | null
  correctAnswer: string
  explanation: string
  hint: string | null
}

interface VocabEntry {
  vocab: {
    german: string
    english: string
    article: string | null
    memoryHook: string | null
    exampleSentence: string
    exampleTranslation: string
  }
}

interface Lesson {
  id: string
  title: string
  subtitle: string
  type: string
  hook: string
  explain: string
  xpReward: number
  contentJson: { examples: ExampleData[]; vocabulary: unknown[] }
  exercises: Exercise[]
  vocabulary: VocabEntry[]
}

type Stage = 'hook' | 'explain' | 'examples' | 'vocab' | 'practice' | 'complete'

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ')
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function LessonPlayer({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params)
  const router = useRouter()
  const { user, setUser } = useAuthStore()

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startTime] = useState(Date.now())

  const [stage, setStage] = useState<Stage>('hook')
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  // result of progress submission
  const [result, setResult] = useState<{ xpEarned: number; streak: number } | null>(null)

  useEffect(() => {
    api.get<Lesson>(`/lessons/${lessonId}`)
      .then(setLesson)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load lesson'))
      .finally(() => setLoading(false))
  }, [lessonId])

  const examples = lesson?.contentJson?.examples ?? []
  const hasVocab = (lesson?.vocabulary?.length ?? 0) > 0

  // Ordered stage list (skip empty stages)
  const stages = useMemo<Stage[]>(() => {
    const s: Stage[] = ['hook', 'explain']
    if (examples.length) s.push('examples')
    if (hasVocab) s.push('vocab')
    if (lesson?.exercises.length) s.push('practice')
    s.push('complete')
    return s
  }, [examples.length, hasVocab, lesson?.exercises.length])

  function nextStage() {
    const idx = stages.indexOf(stage)
    setStage(stages[Math.min(idx + 1, stages.length - 1)])
  }

  async function finishLesson(finalCorrect: number) {
    if (!lesson) return
    const total = lesson.exercises.length || 1
    const score = Math.round((finalCorrect / total) * 100)
    const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000)
    try {
      const res = await api.post<{ xpEarned: number; streak: number; xp: number }>('/progress/complete', {
        lessonId: lesson.id,
        score,
        timeSpentSeconds,
      })
      setResult({ xpEarned: res.xpEarned, streak: res.streak })
      if (user) setUser({ ...user, xp: res.xp, streak: res.streak })
    } catch {
      setResult({ xpEarned: 0, streak: user?.streak ?? 0 })
    }
    setStage('complete')
  }

  // ── Loading / error ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="w-6 h-6 border-2 border-[#d4a843] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (error || !lesson) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <p className="text-red-400 mb-4">{error || 'Lesson not found'}</p>
        <Link href="/learn" className="text-[var(--gold)]">← Back to lessons</Link>
      </div>
    )
  }

  const progressPct = ((stages.indexOf(stage) + (stage === 'practice' ? exerciseIndex / (lesson.exercises.length || 1) : 0)) / stages.length) * 100

  return (
    <div className="min-h-full flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 bg-[var(--bg)]/90 backdrop-blur z-10 border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/learn" className="text-[var(--faint)] hover:text-[var(--text)] text-sm">✕</Link>
          <div className="flex-1 h-2 bg-[var(--track)] rounded-full overflow-hidden">
            <div className="h-full gold-gradient transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-[var(--faint)] text-xs">{lesson.xpReward} XP</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">

        {/* ── HOOK ── */}
        {stage === 'hook' && (
          <div className="flex flex-col min-h-[60vh]">
            <p className="text-[var(--faint)] text-xs uppercase tracking-wider mb-3">{lesson.type} · {lesson.title}</p>
            <div className="flex-1 flex items-center">
              <div>
                <div className="text-4xl mb-6">💡</div>
                <p className="text-2xl font-bold leading-relaxed">{lesson.hook}</p>
              </div>
            </div>
            <Button onClick={nextStage} className="w-full">Tell me more →</Button>
          </div>
        )}

        {/* ── EXPLAIN (the WHY) ── */}
        {stage === 'explain' && (
          <div className="flex flex-col min-h-[60vh]">
            <p className="text-[var(--gold)] text-xs uppercase tracking-wider mb-3 font-medium">The Why</p>
            <div className="flex-1 flex items-center">
              <p className="text-xl leading-relaxed text-[var(--text-soft)]">{lesson.explain}</p>
            </div>
            <Button onClick={nextStage} className="w-full">Show me examples →</Button>
          </div>
        )}

        {/* ── EXAMPLES ── */}
        {stage === 'examples' && (
          <div>
            <h2 className="text-2xl font-bold mb-2">See it in action</h2>
            <p className="text-[var(--muted)] mb-6">Every word colored by its grammatical role.</p>
            <div className="space-y-4 mb-8">
              {examples.map((ex, i) => <GrammarExample key={i} example={ex} />)}
            </div>
            <Button onClick={nextStage} className="w-full">
              {hasVocab ? 'Learn the words →' : 'Practice now →'}
            </Button>
          </div>
        )}

        {/* ── VOCAB ── */}
        {stage === 'vocab' && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Key vocabulary</h2>
            <p className="text-[var(--muted)] mb-6">These go into your spaced-repetition deck.</p>
            <div className="space-y-3 mb-8">
              {lesson.vocabulary.map((v, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`font-bold text-lg ${
                      v.vocab.article === 'der' ? 'text-blue-400'
                      : v.vocab.article === 'die' ? 'text-pink-400'
                      : v.vocab.article === 'das' ? 'text-green-400' : 'text-[var(--text)]'
                    }`}>
                      {v.vocab.article ? `${v.vocab.article} ` : ''}{v.vocab.german}
                    </span>
                    <span className="text-[var(--muted)]">— {v.vocab.english}</span>
                  </div>
                  <p className="text-[var(--faint)] text-sm italic">{v.vocab.exampleSentence}</p>
                  {v.vocab.memoryHook && (
                    <p className="text-[var(--gold)] text-xs mt-2">💡 {v.vocab.memoryHook}</p>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={nextStage} className="w-full">Practice now →</Button>
          </div>
        )}

        {/* ── PRACTICE ── */}
        {stage === 'practice' && (
          <ExerciseRunner
            exercise={lesson.exercises[exerciseIndex]}
            index={exerciseIndex}
            total={lesson.exercises.length}
            onAnswer={(correct) => {
              if (correct) setCorrectCount((c) => c + 1)
            }}
            onNext={() => {
              const isLast = exerciseIndex >= lesson.exercises.length - 1
              if (isLast) {
                finishLesson(correctCount)
              } else {
                setExerciseIndex((i) => i + 1)
              }
            }}
          />
        )}

        {/* ── COMPLETE ── */}
        {stage === 'complete' && (
          <div className="flex flex-col items-center text-center min-h-[60vh] justify-center">
            <div className="w-24 h-24 rounded-full gold-gradient flex items-center justify-center text-5xl mb-6">
              🎉
            </div>
            <h1 className="text-3xl font-black mb-2">Lesson complete!</h1>
            <p className="text-[var(--muted)] mb-8">
              {lesson.exercises.length > 0
                ? `You got ${correctCount} of ${lesson.exercises.length} right.`
                : 'Nicely done.'}
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
              <div className="rounded-2xl border border-[#d4a843]/30 bg-[#d4a843]/5 p-4">
                <p className="text-2xl font-black gold-text">+{result?.xpEarned ?? 0}</p>
                <p className="text-[var(--faint)] text-xs">XP earned</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-2xl font-black">🔥 {result?.streak ?? 0}</p>
                <p className="text-[var(--faint)] text-xs">day streak</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button onClick={() => router.push('/learn')} className="w-full">Back to lessons</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                Go to dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Exercise Runner ─────────────────────────────────────────────────────────

function ExerciseRunner({
  exercise,
  index,
  total,
  onAnswer,
  onNext,
}: {
  exercise: Exercise
  index: number
  total: number
  onAnswer: (correct: boolean) => void
  onNext: () => void
}) {
  const [selected, setSelected] = useState<string>('')
  const [textInput, setTextInput] = useState('')
  const [arranged, setArranged] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showHint, setShowHint] = useState(false)

  // Reset when exercise changes
  useEffect(() => {
    setSelected('')
    setTextInput('')
    setArranged([])
    setSubmitted(false)
    setIsCorrect(false)
    setShowHint(false)
  }, [exercise.id])

  const isChoice = exercise.type === 'multiple_choice' || exercise.type === 'listen_select'
  const isArrange = exercise.type === 'arrange_words'
  const isText = exercise.type === 'translate' || exercise.type === 'fill_blank'

  function checkAnswer() {
    let correct = false
    if (isChoice) {
      correct = selected === exercise.correctAnswer
    } else if (isArrange) {
      correct = normalize(arranged.join(' ')) === normalize(exercise.correctAnswer)
    } else if (isText) {
      correct = normalize(textInput) === normalize(exercise.correctAnswer)
    }
    setIsCorrect(correct)
    setSubmitted(true)
    onAnswer(correct)
  }

  const canSubmit = isChoice ? !!selected : isArrange ? arranged.length > 0 : !!textInput.trim()

  return (
    <div className="flex flex-col min-h-[60vh]">
      <p className="text-[var(--faint)] text-xs mb-4">Question {index + 1} of {total}</p>
      <p className="text-xl font-bold mb-6">{exercise.prompt}</p>

      <div className="flex-1">
        {/* Multiple choice */}
        {isChoice && exercise.options && (
          <div className="grid gap-3">
            {exercise.options.map((opt) => {
              const isSel = selected === opt
              const showCorrect = submitted && opt === exercise.correctAnswer
              const showWrong = submitted && isSel && opt !== exercise.correctAnswer
              return (
                <button
                  key={opt}
                  disabled={submitted}
                  onClick={() => setSelected(opt)}
                  className={`p-4 rounded-xl border text-left font-medium transition-all ${
                    showCorrect ? 'border-green-500 bg-green-500/10 text-green-300'
                    : showWrong ? 'border-red-500 bg-red-500/10 text-red-300'
                    : isSel ? 'border-[#d4a843] bg-[#d4a843]/10'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {opt}
                  {showCorrect && <span className="float-right">✓</span>}
                  {showWrong && <span className="float-right">✗</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* Arrange words */}
        {isArrange && exercise.options && (
          <div>
            <div className="min-h-16 rounded-xl border border-dashed border-[var(--border-strong)] p-3 mb-4 flex flex-wrap gap-2">
              {arranged.length === 0 && <span className="text-[var(--faint)] text-sm self-center">Tap words below in order…</span>}
              {arranged.map((w, i) => (
                <button
                  key={`${w}-${i}`}
                  disabled={submitted}
                  onClick={() => setArranged(arranged.filter((_, idx) => idx !== i))}
                  className="px-3 py-1.5 rounded-lg bg-[#d4a843]/15 border border-[#d4a843]/30 text-sm"
                >
                  {w}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {exercise.options.filter((w) => !arranged.includes(w) || exercise.options!.filter(x => x === w).length > arranged.filter(x => x === w).length).map((w, i) => (
                <button
                  key={`${w}-pool-${i}`}
                  disabled={submitted}
                  onClick={() => setArranged([...arranged, w])}
                  className="px-3 py-1.5 rounded-lg bg-[var(--track)] border border-[var(--border)] text-sm hover:border-[var(--border-strong)]"
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Text input */}
        {isText && (
          <input
            autoFocus
            disabled={submitted}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && !submitted && checkAnswer()}
            placeholder="Type your answer…"
            className="w-full px-4 py-3 rounded-xl bg-[var(--track)] border border-[var(--border)] text-[var(--text)] text-lg focus:outline-none focus:border-[#d4a843]/60"
          />
        )}

        {/* Hint */}
        {exercise.hint && !submitted && (
          <button
            onClick={() => setShowHint(true)}
            className="mt-4 text-[var(--faint)] text-sm hover:text-[var(--muted)]"
          >
            {showHint ? `💡 ${exercise.hint}` : 'Need a hint?'}
          </button>
        )}

        {/* Explanation after submit — the WHY */}
        {submitted && (
          <div className={`mt-6 rounded-xl border p-4 ${isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
            <p className={`text-sm font-semibold mb-1 ${isCorrect ? 'text-green-400' : 'text-orange-400'}`}>
              {isCorrect ? '✓ Correct!' : `Not quite — the answer is "${exercise.correctAnswer}"`}
            </p>
            <p className="text-[var(--text-soft)] text-sm leading-relaxed">{exercise.explanation}</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        {!submitted ? (
          <Button onClick={checkAnswer} disabled={!canSubmit} className="w-full">Check answer</Button>
        ) : (
          <Button onClick={onNext} className="w-full">
            {index >= total - 1 ? 'Finish lesson' : 'Next question →'}
          </Button>
        )}
      </div>
    </div>
  )
}
