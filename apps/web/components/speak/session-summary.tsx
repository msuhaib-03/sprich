import type { Scenario, SessionResult } from "@/lib/speaking";
import { ScoreGrid } from "./score-grid";

/** Shown after "Finish": scores, AI coach feedback, and what to do next. */
export function SessionSummary({
  result,
  scenario,
  onPracticeAgain,
  onAllScenarios,
}: {
  result: SessionResult;
  scenario?: Scenario;
  onPracticeAgain: () => void;
  onAllScenarios: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto px-6 py-16 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="text-3xl font-black mb-2">Session complete!</h1>
      <p className="text-[var(--muted)] mb-8">
        {scenario?.icon} {scenario?.title} ·{" "}
        <span className="gold-text font-bold">+{result.xpEarned} XP</span>
      </p>

      <ScoreGrid result={result} />

      <div className="rounded-2xl border border-[#d4a843]/20 bg-gradient-to-br from-[#d4a843]/8 to-transparent p-5 mb-8 text-left">
        <p className="text-[var(--gold)] text-xs uppercase tracking-wider mb-2 font-medium">
          🤖 Coach feedback
        </p>
        <p className="text-sm leading-relaxed">{result.aiFeedback}</p>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={onPracticeAgain}
          className="px-5 py-3 rounded-xl gold-gradient text-black font-bold text-sm hover:opacity-90"
        >
          Practice again
        </button>
        <button
          onClick={onAllScenarios}
          className="px-5 py-3 rounded-xl border border-[var(--border)] text-sm font-semibold hover:bg-[var(--overlay)]"
        >
          All scenarios
        </button>
      </div>
    </div>
  );
}
