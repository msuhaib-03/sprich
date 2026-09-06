"use client";

import { useAutoGrowTextarea } from "@/hooks/use-autogrow-textarea";
import { MicSendButton } from "./mic-send-button";
import { RecordingMeter } from "./recording-meter";

const MAX_INPUT_H = 200;

/**
 * The bottom bar: an optional recording meter and status line above a single
 * self-contained reply box. The textarea auto-grows with its text up to
 * MAX_INPUT_H then scrolls its own content; the mic ↔ send control lives
 * inside it, bottom-right.
 */
export function Composer({
  input,
  onInputChange,
  onSend,
  recording,
  transcribing,
  micLevel,
  ttsNote,
  loading,
  onToggleMic,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  recording: boolean;
  transcribing: boolean;
  micLevel: number;
  ttsNote: string;
  loading: boolean;
  onToggleMic: () => void;
}) {
  const textareaRef = useAutoGrowTextarea(input, MAX_INPUT_H);
  const canSend = input.trim().length > 0 && !loading;

  const submit = () => {
    if (canSend) onSend();
  };

  return (
    // Upward scrim mirroring the header: transparent at the top edge, opaque by
    // 2rem down. -mt-8 slides it up over the transcript so the last messages
    // fade into the composer instead of ending on a line.
    <footer
      className="relative z-10 shrink-0 -mt-8 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      style={{
        background:
          "linear-gradient(to top, var(--bg), var(--bg) calc(100% - 2rem), transparent)",
      }}
    >
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-3">
        {recording && <RecordingMeter level={micLevel} />}

        {ttsNote && (
          <p className="text-[var(--faint)] text-xs text-center pb-2">
            {ttsNote}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="relative w-full">
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={
                recording
                  ? "Recording — speak German, tap ⏹ when done…"
                  : transcribing
                    ? "Transcribing…"
                    : "Type your reply in German"
              }
              className="reply-box block w-full min-w-0 pl-4 pr-14 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:border-[var(--gold)]/40 focus:outline-none resize-none leading-relaxed"
              style={{
                minHeight: "48px",
                maxHeight: `${MAX_INPUT_H}px`,
                overflow: "hidden",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            />

            <div className="absolute right-2 bottom-2">
              <MicSendButton
                recording={recording}
                transcribing={transcribing}
                hasText={input.trim().length > 0}
                loading={loading}
                onToggleMic={onToggleMic}
              />
            </div>
          </div>
        </form>
      </div>
    </footer>
  );
}
