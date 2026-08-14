"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const SIZE_LABEL: Record<string, string> = {
  QUICK: "Quick · ~5 min",
  STANDARD: "Standard · ~15 min",
  POWER: "Power · ~30 min",
};

export interface DailyActionListItem {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  size: string;
  completed: boolean;
}

/**
 * The week's 5 daily actions (spec §5/§6) — ADHD-friendly per
 * BLUEPRINT_MASTER_SPEC.md's ratified requirement: one action visible at
 * a time as "today's," the rest available but not competing for
 * attention, each with a plain time estimate and a single obvious button.
 */
export function DailyActionList({
  businessId,
  actions,
}: {
  businessId: string;
  actions: DailyActionListItem[];
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(() => new Set(actions.filter((a) => a.completed).map((a) => a.id)));
  const [busyId, setBusyId] = useState<string | null>(null);

  const firstIncomplete = actions.find((a) => !completed.has(a.id));

  async function handleComplete(actionId: string) {
    if (busyId) return;
    setBusyId(actionId);
    setCompleted((prev) => new Set(prev).add(actionId)); // optimistic — idempotent server-side
    const res = await fetch(`/api/curriculum/actions/${actionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    setBusyId(null);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => {
        const isDone = completed.has(action.id);
        const isToday = !isDone && firstIncomplete?.id === action.id;
        return (
          <div
            key={action.id}
            className={`rounded-xl border p-4 transition-colors ${
              isDone
                ? "border-navy-100 bg-navy-50/50"
                : isToday
                  ? "border-gold-300 bg-gold-50"
                  : "border-navy-200 bg-surface"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {isDone ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-navy-300" aria-hidden="true" />
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    Day {action.dayNumber} · {SIZE_LABEL[action.size] ?? action.size}
                  </p>
                  <p className={`mt-0.5 font-medium ${isDone ? "text-navy-500 line-through" : "text-navy-900"}`}>
                    {action.title}
                  </p>
                  <p className="mt-1 text-sm text-foreground-muted">{action.description}</p>
                </div>
              </div>
              {!isDone && (
                <Button
                  size="sm"
                  variant={isToday ? "gold" : "outline"}
                  disabled={busyId === action.id}
                  onClick={() => handleComplete(action.id)}
                  className="shrink-0"
                >
                  Mark Done
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
