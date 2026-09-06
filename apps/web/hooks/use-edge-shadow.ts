"use client";

import { useCallback, useRef, useState } from "react";

export interface EdgeShadow {
  top: boolean;
  bottom: boolean;
}

/**
 * Tracks whether a scroll container has clipped content above and/or below the
 * visible area, so the UI can fade a soft gradient at that edge instead of
 * ending cut-off messages on a hard line.
 *
 * Wire `scrollRef` to the scroll element and `sync` to its `onScroll`; call
 * `sync` again whenever the content height changes (e.g. a new message).
 */
export function useEdgeShadow() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<EdgeShadow>({
    top: false,
    bottom: false,
  });

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop > 6;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 6;
    setShadow((p) =>
      p.top === top && p.bottom === bottom ? p : { top, bottom },
    );
  }, []);

  return { scrollRef, shadow, sync };
}
