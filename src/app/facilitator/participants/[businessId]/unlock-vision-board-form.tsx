"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * UNLOCK THE FULL VISION BOARD (Phase 7: Admin and Facilitator Controls)
 * — admin-only override of the normal attend-and-pay gate
 * (POST /api/admin/vision-board/[businessId]/unlock). Only rendered on
 * the participant page when the board isn't already unlocked.
 */
export function UnlockVisionBoardForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);

    const res = await fetch(`/api/admin/vision-board/${businessId}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setMessage("Full Vision Board unlocked.");
    setReason("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required — e.g. technical issue, comped access)"
        rows={1}
        required
      />
      <Button type="submit" size="sm" variant="gold" disabled={busy} className="self-start">
        {busy ? "Unlocking…" : "Unlock Full Vision Board"}
      </Button>
    </form>
  );
}
