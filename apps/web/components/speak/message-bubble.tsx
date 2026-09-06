import { isPlaceholder, type Message, type Panel } from "@/lib/speaking";
import { MessageMeta } from "./message-meta";
import { MessageTools } from "./message-tools";

/**
 * One chat bubble. User bubbles are gold-tinted and right-aligned; assistant
 * bubbles are surface-coloured, left-aligned, and — unless they're a local
 * "(…)" error notice — carry the Play / Translate / Explain tools and the AI's
 * structured feedback.
 */
export function MessageBubble({
  message,
  translation,
  explanation,
  onPlay,
  onToggleTranslation,
  onToggleExplanation,
}: {
  message: Message;
  translation?: Panel;
  explanation?: Panel;
  onPlay: (text: string) => void;
  onToggleTranslation: (message: Message) => void;
  onToggleExplanation: (message: Message) => void;
}) {
  const isUser = message.role === "user";
  const showTools = !isUser && !isPlaceholder(message.content);

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`w-fit max-w-[85%] min-w-0 [overflow-wrap:anywhere] [word-break:break-word] rounded-2xl px-4 py-3 ${
          isUser
            ? "ml-auto bg-[var(--gold)]/15 border border-[var(--gold)]/25"
            : "mr-auto bg-[var(--surface)] border border-[var(--border)]"
        }`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>

        {showTools && (
          <MessageTools
            translation={translation}
            explanation={explanation}
            onPlay={() => onPlay(message.content)}
            onToggleTranslation={() => onToggleTranslation(message)}
            onToggleExplanation={() => onToggleExplanation(message)}
          />
        )}

        <MessageMeta meta={message.meta} />
      </div>
    </div>
  );
}
