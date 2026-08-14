"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * The weekly review + "mark week complete" step (spec §5's required
 * "weekly review, proof of completion"). Only enabled once all 5 daily
 * actions are done — the server enforces this too (completeWeek), this
 * is just the ADHD-friendly "here's exactly why this button is disabled"
 * surfacing of that same rule.
 */
export function WeeklyReviewForm({
  businessId,
  weekId,
  prompt,
  allActionsDone,
  initialNote,
  alreadyCompleted,
}: {
  businessId: string;
  weekId: string;
  prompt: string;
  allActionsDone: boolean;
  initialNote: string | null;
  alreadyCompleted: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyCompleted);

  async function handleSubmit() {
    if (busy || !note.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/curriculum/weeks/${weekId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, reviewNote: note }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong — try again.");
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-700">
        Week complete — great work. Your next week is ready when you are.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-navy-900">{prompt}</p>
      {!allActionsDone && (
        <p className="text-xs text-foreground-muted">
          Finish all 5 daily actions above to unlock the weekly review.
        </p>
      )}
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        disabled={!allActionsDone}
        placeholder="A few sentences is plenty."
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        size="sm"
        variant="gold"
        disabled={!allActionsDone || !note.trim() || busy}
        onClick={handleSubmit}
        className="self-start"
      >
        Complete This Week
      </Button>
    </div>
  );
}
