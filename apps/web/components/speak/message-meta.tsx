import type { TurnMeta } from "@/lib/speaking";

/**
 * The AI's structured feedback attached to an assistant turn: inline
 * corrections, new-vocab chips, and a one-line encouragement.
 */
export function MessageMeta({ meta }: { meta?: TurnMeta }) {
  if (!meta) return null;
  const { corrections, vocabulary, encouragement } = meta;

  return (
    <>
      {corrections && corrections.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
          {corrections.map((c, j) => (
            <div key={j} className="text-xs">
              <span className="text-red-400 line-through">{c.original}</span>{" "}
              <span className="text-emerald-400">{c.corrected}</span>
              <p className="text-[var(--faint)] mt-0.5">{c.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {vocabulary && vocabulary.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {vocabulary.map((v, j) => (
            <span
              key={j}
              className="text-xs px-2 py-0.5 rounded-full bg-[var(--overlay)] text-[var(--muted)]"
            >
              {v.german} — {v.english}
            </span>
          ))}
        </div>
      )}

      {encouragement && (
        <p className="mt-2 text-xs text-[var(--gold)]">💪 {encouragement}</p>
      )}
    </>
  );
}
