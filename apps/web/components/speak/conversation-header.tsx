import { ArrowLeft, Check, Volume2, VolumeX } from "lucide-react";
import type { Scenario } from "@/lib/speaking";

/**
 * Top bar of the conversation view: a 44px back target, the centred scenario
 * title with a level pill, then the autoplay toggle + Finish. Sticks to the
 * top of the immersive shell and clears the mobile status bar via the top
 * safe-area inset.
 */
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
    // Sits above the transcript with a downward scrim: opaque until 2rem from
    // the bottom, then fades — and -mb-8 pulls the message list up under that
    // fade so scrolled messages dissolve instead of ending on a line.
    <header
      className="relative z-10 shrink-0 -mb-8 pt-[calc(0.75rem+env(safe-area-inset-top))]"
      style={{
        background:
          "linear-gradient(to bottom, var(--bg), var(--bg) calc(100% - 2rem), transparent)",
      }}
    >
      <div className="max-w-2xl mx-auto w-full px-2 sm:px-4 pb-3 flex items-center gap-1.5">
        <button
          onClick={onBack}
          aria-label="Back to scenarios"
          className="shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--overlay)] active:scale-95 transition"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </button>

        <div className="min-w-0 flex-1 flex items-center justify-center gap-2">
          <p className="font-bold text-sm truncate">
            {scenario?.icon} {scenario?.title}
          </p>
          <span className="shrink-0 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/12 px-2 py-0.5 text-[11px] font-bold leading-none text-[var(--gold-contrast)]">
            {level}
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={onToggleAutoplay}
            aria-pressed={autoplay}
            aria-label={autoplay ? "Autoplay on" : "Autoplay off"}
            title="Automatically play audio for replies"
            className={`inline-flex items-center gap-1 h-7 rounded-md border px-1.5 sm:px-2 text-[11px] font-medium leading-none transition active:scale-95 ${
              autoplay
                ? "border-[var(--gold)]/40 text-[var(--gold)]"
                : "border-[var(--border)] text-[var(--faint)] hover:text-[var(--text)]"
            }`}
          >
            {autoplay ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span className="hidden sm:inline">Auto {autoplay ? "on" : "off"}</span>
          </button>
          {canFinish && (
            <button
              onClick={onFinish}
              disabled={finishing}
              aria-label="Finish"
              title="End the session — get your scores and XP"
              className="inline-flex items-center gap-1 h-7 rounded-md gold-gradient px-1.5 sm:px-2.5 text-[11px] font-semibold leading-none text-black transition active:scale-95 disabled:opacity-50"
            >
              <Check size={13} strokeWidth={3} />
              <span className="hidden sm:inline">{finishing ? "Scoring…" : "Finish"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
