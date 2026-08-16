"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignScenarioToClassAction } from "@/lib/teacher/simulation-actions";

type ScenarioOption = { id: string; title: string };

export function AssignScenarioForm({
  classId,
  scenarios,
  revalidatePaths,
}: {
  classId: string;
  scenarios: ScenarioOption[];
  revalidatePaths: string[];
}) {
  const router = useRouter();
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastJoinCode, setLastJoinCode] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scenarioId) return;
    setPending(true);
    setError(null);
    setLastJoinCode(null);

    const result = await assignScenarioToClassAction({ classId, scenarioId, revalidatePaths });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setLastJoinCode(result.data.joinCode);
    router.refresh();
  }

  if (scenarios.length === 0) {
    return (
      <p className="mt-4 text-sm text-slate">
        No published scenarios for this course yet — ask an admin to publish one.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-2">
      <div className="min-w-[14rem] flex-1 space-y-1.5">
        <label htmlFor="scenario" className="block text-sm font-medium text-ink">
          Scenario
        </label>
        <select
          id="scenario"
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
          className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="border border-ink px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
      >
        {pending ? "Assigning…" : "Assign to class"}
      </button>

      {error && (
        <p role="alert" className="w-full text-sm text-rose-gold">
          {error}
        </p>
      )}
      {lastJoinCode && (
        <p className="w-full text-sm text-ink">
          Assigned — join code <span className="font-mono font-semibold text-rose-gold">{lastJoinCode}</span>.
          Share it (or the link below) with your class.
        </p>
      )}
    </form>
  );
}
