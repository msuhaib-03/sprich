import { SCENARIOS } from "@/lib/speaking";
import { ScenarioCard } from "./scenario-card";

/** The landing view: choose a real-life situation to practice. */
export function ScenarioPicker({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="text-[var(--faint)] text-sm mb-1">Speaking practice</p>
        <h1 className="text-3xl font-black">Talk to your AI partner</h1>
        <p className="text-[var(--muted)] mt-2">
          Pick a real-life situation. Speak or type — your partner replies in
          German, corrects you gently, and you can hear every reply out loud.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {SCENARIOS.map((s) => (
          <ScenarioCard key={s.id} scenario={s} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
