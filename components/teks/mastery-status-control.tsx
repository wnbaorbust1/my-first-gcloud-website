"use client";

import { useState, useTransition } from "react";
import { updateMasteryStatusAction } from "@/lib/teacher/mastery-actions";
import { StatusStamp } from "@/components/ui/status-stamp";
import { MASTERY_STATUSES, MASTERY_STATUS_LABELS } from "@/lib/curriculum/constants";
import type { TeksMasteryStatus } from "@/types/supabase";

/**
 * The gold-leaf opacity ramp doubles as the mastery progression's color
 * language: each pre-mastery stage is a deeper tint of the same stamp
 * gold, so the swatch visibly approaches "full gold" as a student nears
 * mastery. needs_reteaching breaks the ramp entirely — solid rose-gold,
 * the app's existing "needs attention" color — signaling a regression,
 * not another step forward. Always paired with the select's text label,
 * never color alone.
 */
const STATUS_SWATCH: Record<TeksMasteryStatus, string> = {
  not_started: "rgb(var(--slate) / 0.15)",
  introduced: "rgb(var(--gold-leaf) / 0.25)",
  practiced: "rgb(var(--gold-leaf) / 0.45)",
  assessed: "rgb(var(--gold-leaf) / 0.7)",
  mastered: "rgb(var(--gold-leaf) / 1)",
  needs_reteaching: "rgb(var(--rose-gold) / 1)",
};

export function MasteryStatusControl({
  studentId,
  teksCode,
  classId,
  initialStatus,
}: {
  studentId: string;
  teksCode: string;
  classId: string;
  initialStatus: TeksMasteryStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();

  function handleChange(next: TeksMasteryStatus) {
    const previous = status;
    setStatus(next); // optimistic — the StatusStamp mounts/unmounts off this,
    // which is what makes the landing animation play the instant a teacher
    // promotes a student to "mastered," not after a round-trip.
    startTransition(async () => {
      const result = await updateMasteryStatusAction({
        studentId,
        teksCode,
        status: next,
        classId,
      });
      if (!result.success) setStatus(previous);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink/20"
        style={{ backgroundColor: STATUS_SWATCH[status] }}
      />
      {status === "mastered" && <StatusStamp label="Mastered" />}
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as TeksMasteryStatus)}
        disabled={pending}
        aria-label={`Mastery status for ${teksCode}`}
        className="border border-slate/30 bg-cream px-1.5 py-1 font-mono text-[11px] text-ink disabled:opacity-60"
      >
        {MASTERY_STATUSES.map((s) => (
          <option key={s} value={s}>
            {MASTERY_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
