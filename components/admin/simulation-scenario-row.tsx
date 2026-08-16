"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleScenarioPublishAction,
  deleteScenarioAction,
} from "@/lib/admin/simulation-actions";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import type { SimulationScenario, SimulationEvent, SimulationExpense } from "@/types/curriculum";

/** No dedicated edit page for scenarios (unlike lessons/assignments) — the
 * content is AI-generated wholesale and regenerated if unsatisfactory
 * rather than hand-edited field by field, so publish/unpublish + delete
 * live directly on the list row. */
export function SimulationScenarioRow({
  scenario,
  revalidatePaths,
}: {
  scenario: SimulationScenario;
  revalidatePaths: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const expenses = scenario.fixed_expenses as unknown as SimulationExpense[];
  const events = scenario.event_deck as unknown as SimulationEvent[];
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  function togglePublish() {
    startTransition(async () => {
      await toggleScenarioPublishAction({
        scenarioId: scenario.id,
        publish: scenario.status !== "published",
        revalidatePaths,
      });
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete "${scenario.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteScenarioAction({ scenarioId: scenario.id, revalidatePaths });
      router.refresh();
    });
  }

  return (
    <LedgerRow
      stamp={scenario.status === "published" ? <StatusStamp label="Published" /> : undefined}
      meta={
        <div className="flex items-center gap-2">
          <span>{scenario.status === "published" ? "Published" : "Draft"}</span>
          <button
            type="button"
            onClick={togglePublish}
            disabled={pending}
            className="text-slate transition-colors hover:text-ink disabled:opacity-60"
          >
            {scenario.status === "published" ? "Unpublish" : "Publish"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-slate transition-colors hover:text-rose-gold disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      }
    >
      <span className="font-medium text-ink">{scenario.title}</span>
      <span className="ml-2 font-mono text-xs text-slate">
        ${scenario.starting_income}/round income · ${totalExpenses}/round expenses · {events.length}{" "}
        rounds
      </span>
    </LedgerRow>
  );
}
