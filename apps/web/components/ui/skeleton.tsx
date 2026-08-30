// Base shimmer block — compose these into page-specific skeleton layouts
// that mirror the real content's shape, so nothing visually jumps once
// data arrives. Uses the same --track token as progress bars elsewhere.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--track)] ${className}`} />
}
