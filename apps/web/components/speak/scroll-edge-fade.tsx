/**
 * A soft, full-width gradient that fades the chat into the page background at
 * whichever edge still hides clipped content — so cut-off messages dissolve
 * instead of ending on a hard line. Absolutely positioned; render inside the
 * `relative` wrapper around the scroll region.
 */
export function ScrollEdgeFade({
  edge,
  visible,
}: {
  edge: "top" | "bottom";
  visible: boolean;
}) {
  const position = edge === "top" ? "top-0" : "bottom-0";
  const gradient =
    edge === "top"
      ? "linear-gradient(to bottom, var(--bg) 0%, transparent 65%)"
      : "linear-gradient(to top, var(--bg) 0%, transparent 65%)";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 ${position} h-20 transition-opacity duration-300 ${
        visible ? "opacity-65" : "opacity-0"
      }`}
      style={{ background: gradient }}
    />
  );
}
