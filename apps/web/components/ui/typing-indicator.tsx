// Three bouncing dots — a "someone is typing" placeholder.

export function TypingIndicator() {
  return (
    <span className="inline-flex gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-[var(--faint)] animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
