"use client";

import { ArrowDown, ArrowUp, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StageBadge } from "@/components/ui/stage-badge";
import type { Stage } from "@/lib/utils";

interface TaskRow {
  id: string;
  title: string;
  stage: Stage;
  category: string | null;
  status: string;
  priority: "MUST_DO" | "SHOULD_DO" | "BONUS";
  facilitatorAdjusted: boolean;
}

const PRIORITY_OPTIONS = [
  { value: "MUST_DO", label: "Must Do" },
  { value: "SHOULD_DO", label: "Should Do" },
  { value: "BONUS", label: "Bonus" },
];

function TaskRowControls({ task }: { task: TaskRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/facilitator/roadmap/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Remove "${task.title}" from this roadmap?`)) return;
    setBusy(true);
    await fetch(`/api/facilitator/roadmap/tasks/${task.id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-100 p-3">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <StageBadge stage={task.stage} />
          {task.category && <span className="text-xs text-foreground-muted">{task.category}</span>}
          <span className="text-xs font-semibold uppercase text-navy-400">{task.status}</span>
          {task.facilitatorAdjusted && (
            <span className="text-xs font-medium text-gold-600">Adjusted</span>
          )}
        </div>
        <p className="truncate text-sm font-semibold text-navy-900">{task.title}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={task.priority}
          onValueChange={(v) => patch({ priority: v })}
          disabled={busy}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="sm" variant="outline" disabled={busy} onClick={() => patch({ move: "up" })}>
          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => patch({ move: "down" })}>
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>

        {task.status === "PAUSED" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => patch({ status: "NOT_STARTED" })}
          >
            <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Unlock
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => patch({ status: "PAUSED" })}
          >
            <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Pause
          </Button>
        )}

        {task.status === "LOCKED" && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => patch({ status: "NOT_STARTED" })}
          >
            <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Unlock Now
          </Button>
        )}

        <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
          <Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export function RoadmapControls({ tasks }: { tasks: TaskRow[] }) {
  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskRowControls key={task.id} task={task} />
      ))}
    </div>
  );
}
