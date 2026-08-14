"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/ui/stage-badge";
import type { Stage } from "@/lib/utils";

const IMPACT_BY_PRIORITY: Record<string, string> = {
  MUST_DO: "HIGH",
  SHOULD_DO: "MEDIUM",
  BONUS: "LOW",
};

export interface NextBestActionTask {
  id: string;
  title: string;
  stage: Stage;
  priority: "MUST_DO" | "SHOULD_DO" | "BONUS";
  estimatedMins: number | null;
  description: string | null;
  reason: string | null;
}

/**
 * NEXT BEST ACTION ENGINE (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §13,
 * Phase D): "The engine must explain why an action was selected and
 * allow the user to choose a smaller action, reschedule, or request
 * help." The reason line is the "why"; the three buttons below are
 * exactly those three required affordances — nothing decorative.
 */
export function NextBestActionCard({
  businessId,
  initialTask,
}: {
  businessId: string;
  initialTask: NextBestActionTask | null;
}) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [busy, setBusy] = useState<"smaller" | "reschedule" | null>(null);
  const [rescheduled, setRescheduled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSmaller() {
    if (!task || busy) return;
    setBusy("smaller");
    setError(null);
    const res = await fetch("/api/roadmap/next-best-action/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, currentTaskId: task.id }),
    });
    setBusy(null);
    if (res.ok) {
      const data = (await res.json()) as { alternative: NextBestActionTask | null };
      if (data.alternative) {
        setTask({ ...data.alternative, description: null });
      } else {
        setError("No other task is available right now.");
      }
    } else {
      setError("Couldn't find a smaller step right now — try again.");
    }
  }

  async function handleReschedule() {
    if (!task || busy) return;
    setBusy("reschedule");
    setError(null);
    const res = await fetch(`/api/roadmap/tasks/${task.id}/pause`, { method: "POST" });
    setBusy(null);
    if (res.ok) {
      setRescheduled(true);
      router.refresh();
    } else {
      setError("Couldn't reschedule this task — try again.");
    }
  }

  return (
    <Card className="border-gold-200 bg-gradient-to-br from-gold-50 to-surface">
      <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">Your Next Best Move</p>

      {rescheduled ? (
        <p className="mt-2 text-sm text-navy-700">
          Rescheduled — your progress is saved. Come back to it anytime from your Roadmap.
        </p>
      ) : task ? (
        <>
          <h2 className="mt-1 text-xl font-semibold text-navy-900">{task.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-foreground-muted">
            <StageBadge stage={task.stage} />
            <span>~{task.estimatedMins ?? "a few"} min</span>
            <span>
              Impact: <span className="font-semibold text-navy-700">{IMPACT_BY_PRIORITY[task.priority]}</span>
            </span>
          </div>
          {task.reason && (
            <p className="mt-3 text-sm text-navy-700">
              <span className="font-medium">Why this one: </span>
              {task.reason}
            </p>
          )}
          {task.description && (
            <p className="mt-2 text-sm text-navy-700">
              <span className="font-medium">Why this matters: </span>
              {task.description}
            </p>
          )}
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="lg" variant="gold">
              <Link href={`/build/${task.id}`}>Start Building</Link>
            </Button>
            <Button size="sm" variant="outline" disabled={busy === "smaller"} onClick={handleSmaller}>
              Show me something smaller
            </Button>
            <Button size="sm" variant="outline" disabled={busy === "reschedule"} onClick={handleReschedule}>
              Reschedule
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/ai">Ask the Blueprint Coach</Link>
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-foreground-muted">
          Your facilitator is preparing your Blueprint Roadmap.
        </p>
      )}
    </Card>
  );
}
