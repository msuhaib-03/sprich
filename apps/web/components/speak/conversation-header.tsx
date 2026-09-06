import type { Scenario } from "@/lib/speaking";

/** Top bar of the conversation view: back, scenario title, autoplay + finish. */
export function ConversationHeader({
  scenario,
  level,
  autoplay,
  onToggleAutoplay,
  canFinish,
  finishing,
  onFinish,
  onBack,
}: {
  scenario?: Scenario;
  level: string;
  autoplay: boolean;
  onToggleAutoplay: () => void;
  canFinish: boolean;
  finishing: boolean;
  onFinish: () => void;
  onBack: () => void;
}) {
  return (
    <div className="shrink-0">
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="text-[var(--muted)] hover:text-[var(--text)] text-sm shrink-0"
        >
          ←<span className="hidden sm:inline"> Scenarios</span>
        </button>
        <div className="text-center">
          <p className="font-bold text-sm">
            {scenario?.icon} {scenario?.title}
          </p>
          <p className="text-[var(--faint)] text-xs">Level {level}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAutoplay}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              autoplay
                ? "border-[var(--gold)]/40 text-[var(--gold)]"
                : "border-[var(--border)] text-[var(--faint)]"
            }`}
            title="Automatically play audio for replies"
          >
            🔊 Auto {autoplay ? "on" : "off"}
          </button>
          {canFinish && (
            <button
              onClick={onFinish}
              disabled={finishing}
              className="text-xs px-3 py-1.5 rounded-lg gold-gradient text-black font-bold disabled:opacity-50"
              title="End the session — get your scores and XP"
            >
              {finishing ? "Scoring…" : "✓ Finish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
