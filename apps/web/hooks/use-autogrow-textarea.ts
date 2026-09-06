"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Auto-grow a <textarea> with its content (Claude / ChatGPT style), capped at
 * `maxHeight`. Standard technique: collapse to `auto`, read the natural height
 * off scrollHeight, then set an explicit px height clamped to the ceiling.
 * Past the ceiling the box stops growing and scrolls its own text, so the
 * surrounding layout never moves.
 *
 * useLayoutEffect (not useEffect) so a freshly mounted textarea is sized
 * before paint — otherwise it flashes at the browser-default 2-row height.
 * The consuming <textarea> should set `rows={1}` to kill that 2-row minimum.
 */
export function useAutoGrowTextarea(value: string, maxHeight = 200) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const natural = el.scrollHeight;
    el.style.height = `${Math.min(natural, maxHeight)}px`;
    el.style.overflowY = natural > maxHeight ? "auto" : "hidden";
  }, [value, maxHeight]);

  return ref;
}
