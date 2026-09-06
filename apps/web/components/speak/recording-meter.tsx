/** Live "● REC" indicator with an input-level bar, shown while recording. */
export function RecordingMeter({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-3 pb-2">
      <span className="text-xs font-bold text-red-400 animate-pulse">● REC</span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--track)] overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-75"
          style={{ width: `${Math.min(100, level * 400)}%` }}
        />
      </div>
      <span className="text-xs text-[var(--faint)]">
        speak — this bar should move
      </span>
    </div>
  );
}
