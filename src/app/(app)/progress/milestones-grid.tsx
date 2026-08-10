"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MilestoneRow {
  key: string;
  label: string;
  autoDetectable: boolean;
  achieved: boolean;
  achievedAt: string | null;
}

/** MILESTONES (spec Prompt 9): 15 named milestones — auto-detected from real data where possible, self-confirmed otherwise. */
export function MilestonesGrid({ businessId, milestones }: { businessId: string; milestones: MilestoneRow[] }) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function markAchieved(key: string) {
    setBusyKey(key);
    await fetch(`/api/progress/milestones/${key}/achieve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    setBusyKey(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {milestones.map((m) => (
        <div
          key={m.key}
          className={cn(
            "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm",
            m.achieved ? "border-success/30 bg-success-bg" : "border-navy-100 bg-surface",
          )}
        >
          <span className="inline-flex items-center gap-2">
            {m.achieved ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-navy-300" aria-hidden="true" />
            )}
            <span className={m.achieved ? "font-medium text-navy-900" : "text-foreground-muted"}>
              {m.label}
            </span>
          </span>
          {!m.achieved && !m.autoDetectable && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs"
              onClick={() => markAchieved(m.key)}
              disabled={busyKey !== null}
            >
              {busyKey === m.key ? "Saving…" : "Mark achieved"}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
