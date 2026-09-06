import type { Panel } from "@/lib/speaking";

/**
 * The Play / Translate / Explain action row under an assistant message, plus
 * the two expandable panels it toggles. Rendered only for real assistant
 * turns (not local "(…)" error notices).
 */
export function MessageTools({
  translation,
  explanation,
  onPlay,
  onToggleTranslation,
  onToggleExplanation,
}: {
  translation?: Panel;
  explanation?: Panel;
  onPlay: () => void;
  onToggleTranslation: () => void;
  onToggleExplanation: () => void;
}) {
  return (
    <>
      <div className="mt-2 flex items-center gap-4">
        <button
          onClick={onPlay}
          className="text-xs text-[var(--gold)] hover:opacity-80"
        >
          🔊 Play
        </button>
        <button
          onClick={onToggleTranslation}
          className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          🌐 {translation?.open ? "Hide translation" : "Translate"}
        </button>
        <button
          onClick={onToggleExplanation}
          className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          💡 {explanation?.open ? "Hide" : "Explain"}
        </button>
      </div>

      {translation?.open && (
        <div className="mt-2 pl-3 border-l-2 border-[var(--gold)]/40">
          {translation.loading ? (
            <span className="text-xs text-[var(--faint)]">Translating…</span>
          ) : (
            <p className="text-sm text-[var(--muted)] italic">
              {translation.text}
            </p>
          )}
        </div>
      )}

      {explanation?.open && (
        <div className="mt-2 pl-3 border-l-2 border-sky-400/40">
          {explanation.loading ? (
            <span className="text-xs text-[var(--faint)]">
              Asking your tutor…
            </span>
          ) : (
            <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">
              {explanation.text}
            </p>
          )}
        </div>
      )}
    </>
  );
}
