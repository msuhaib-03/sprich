import type { Scenario } from "@/lib/speaking";

/** One tappable scenario in the picker grid. */
export function ScenarioCard({
  scenario,
  onSelect,
}: {
  scenario: Scenario;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(scenario.id)}
      className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gold)]/40 hover:bg-[var(--overlay)] transition-all text-left"
    >
      <span className="text-2xl">{scenario.icon}</span>
      <div>
        <p className="font-semibold">{scenario.title}</p>
        <p className="text-[var(--faint)] text-sm">{scenario.sub}</p>
      </div>
    </button>
  );
}
