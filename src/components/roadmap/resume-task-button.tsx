"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Un-reschedules a PAUSED task (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §13 Phase D) — the other half of the dashboard's "Reschedule" action. */
export function ResumeTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleResume(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/roadmap/tasks/${taskId}/resume`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={handleResume}>
      Resume
    </Button>
  );
}
