import type { SessionResult } from "@/lib/speaking";

/** The 2×4 grid of session scores; the Overall tile is gold-accented. */
export function ScoreGrid({ result }: { result: SessionResult }) {
  const tiles = [
    { label: "Overall", value: result.overallScore, accent: true },
    { label: "Grammar", value: result.grammarScore },
    { label: "Vocabulary", value: result.vocabularyScore },
    { label: "Fluency", value: result.fluencyScore },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={`p-4 rounded-2xl border ${
            t.accent
              ? "border-[#d4a843]/30 bg-[#d4a843]/5"
              : "border-[var(--border)] bg-[var(--surface)]"
          }`}
        >
          <p
            className={`text-2xl font-black ${
              t.accent ? "gold-text" : "text-[var(--text)]"
            }`}
          >
            {t.value}
          </p>
          <p className="text-[var(--faint)] text-xs mt-1">{t.label}</p>
        </div>
      ))}
    </div>
  );
}
