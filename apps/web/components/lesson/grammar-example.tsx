'use client'

export interface BreakdownItem {
  word: string
  role: string
  color: string
}

export interface ExampleData {
  german: string
  english: string
  breakdown: BreakdownItem[]
}

/**
 * Renders a German sentence with each word color-coded by its grammatical role,
 * plus a breakdown legend below. This is Sprich's signature teaching tool —
 * the learner SEES why each word takes the form it does.
 */
export function GrammarExample({ example }: { example: ExampleData }) {
  // Build a color lookup so we can paint matching words in the full sentence
  const colorFor = (token: string) => {
    const clean = token.replace(/[.,!?;:]/g, '').toLowerCase()
    const match = example.breakdown.find(
      (b) => b.word.toLowerCase() === clean || b.word.toLowerCase().includes(clean),
    )
    return match?.color
  }

  const tokens = example.german.split(/(\s+)/)

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      {/* The colored sentence */}
      <p className="text-2xl font-bold mb-2 leading-relaxed">
        {tokens.map((tok, i) => {
          if (/^\s+$/.test(tok)) return tok
          const color = colorFor(tok)
          return (
            <span key={i} style={color ? { color } : undefined}>
              {tok}
            </span>
          )
        })}
      </p>
      <p className="text-[var(--muted)] text-sm italic mb-6">{example.english}</p>

      {/* Breakdown legend */}
      <div className="grid sm:grid-cols-2 gap-2">
        {example.breakdown.map((b, i) => (
          <div
            key={i}
            className="rounded-lg border p-3"
            style={{ borderColor: `${b.color}33`, backgroundColor: `${b.color}0d` }}
          >
            <p className="font-mono text-sm font-semibold" style={{ color: b.color }}>
              {b.word}
            </p>
            <p className="text-[var(--muted)] text-xs mt-0.5">{b.role}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
