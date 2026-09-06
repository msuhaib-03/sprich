"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Message, Panel } from "@/lib/speaking";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { MessageBubble } from "./message-bubble";
import { ScrollEdgeFade } from "./scroll-edge-fade";
import type { EdgeShadow } from "@/hooks/use-edge-shadow";

/**
 * The scrollable transcript — the only scroll region in the conversation view.
 * Full-bleed track with an inner column that matches the header/composer width;
 * a soft gradient fades whichever edge still hides clipped messages.
 */
export function MessageList({
  messages,
  loading,
  scrollRef,
  shadow,
  onSync,
  tPanels,
  ePanels,
  onPlay,
  onToggleTranslation,
  onToggleExplanation,
}: {
  messages: Message[];
  loading: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  shadow: EdgeShadow;
  onSync: () => void;
  tPanels: Record<number, Panel>;
  ePanels: Record<number, Panel>;
  onPlay: (text: string) => void;
  onToggleTranslation: (index: number, message: Message) => void;
  onToggleExplanation: (index: number, message: Message) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    // Content just changed height — recheck which edges are clipped.
    const id = requestAnimationFrame(onSync);
    return () => cancelAnimationFrame(id);
  }, [messages, loading, onSync]);

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={onSync}
        className="chat-scroll h-full overflow-y-auto overflow-x-hidden w-full"
      >
        {/* pt/pb clear the header + composer scrims that overlap this region
            (each -mb-8 / -mt-8) so the first and last messages sit fully in
            view at rest, then dissolve into the scrim as they scroll. */}
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 pt-10 pb-10 space-y-4">
          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              message={m}
              translation={tPanels[i]}
              explanation={ePanels[i]}
              onPlay={onPlay}
              onToggleTranslation={(msg) => onToggleTranslation(i, msg)}
              onToggleExplanation={(msg) => onToggleExplanation(i, msg)}
            />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-[var(--surface)] border border-[var(--border)]">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <ScrollEdgeFade edge="top" visible={shadow.top} />
      <ScrollEdgeFade edge="bottom" visible={shadow.bottom} />
    </div>
  );
}
