/**
 * The single action control pinned to the bottom-right of the reply box. It
 * cycles through four states: stop (recording), spinner (transcribing), send
 * (there's text to send), or mic (idle / empty field).
 */
export function MicSendButton({
  recording,
  transcribing,
  hasText,
  loading,
  onToggleMic,
}: {
  recording: boolean;
  transcribing: boolean;
  hasText: boolean;
  loading: boolean;
  onToggleMic: () => void;
}) {
  if (recording) {
    return (
      <button
        type="button"
        onClick={onToggleMic}
        title="Tap to stop recording"
        className="w-9 h-9 rounded-lg flex items-center justify-center border border-red-500/50 bg-red-500/10 text-red-400 animate-pulse"
      >
        ⏹
      </button>
    );
  }

  if (transcribing) {
    return (
      <span className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)]">
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      </span>
    );
  }

  if (hasText) {
    return (
      <button
        type="submit"
        disabled={loading}
        title="Send (Enter)"
        className="w-9 h-9 rounded-lg gold-gradient text-black flex items-center justify-center disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggleMic}
      title="Record your reply (German)"
      className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
    >
      🎙️
    </button>
  );
}
