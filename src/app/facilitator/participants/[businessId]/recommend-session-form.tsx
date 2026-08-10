"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SessionOption {
  id: string;
  title: string;
  startsAt: string;
}

/**
 * FACILITATOR ACTIONS (spec): "Recommend Session." Writes a real
 * `FacilitatorNote` (type RECOMMENDATION) referencing a real, currently
 * scheduled `SessionOffering` picked from a dropdown — not free text —
 * so the reference is always structurally correct. This reuses the exact
 * note pipeline that already feeds Blueprint AI's context and the
 * roadmap generator's facilitator-boost logic (Phases 5 &amp; 7), so a
 * session recommendation is immediately visible in both places too.
 */
export function RecommendSessionForm({
  businessId,
  sessions,
}: {
  businessId: string;
  sessions: SessionOption[];
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (sessions.length === 0) {
    return <p className="text-sm text-foreground-muted">No upcoming sessions to recommend.</p>;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    setError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/facilitator/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        noteType: "RECOMMENDATION",
        note: `Recommended session: ${session.title} (${new Date(session.startsAt).toLocaleDateString()})`,
      }),
    });

    setIsSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && (
        <Alert variant="danger" className="w-full">
          {error}
        </Alert>
      )}
      <div className="min-w-[240px]">
        <Select value={sessionId} onValueChange={setSessionId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title} — {new Date(s.startsAt).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isSubmitting}>
        {isSubmitting ? "Recommending…" : "Recommend"}
      </Button>
    </form>
  );
}
