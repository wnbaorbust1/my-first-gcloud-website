"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const MOODS: { value: string; label: string }[] = [
  { value: "FOCUSED", label: "Focused" },
  { value: "CONFIDENT", label: "Confident" },
  { value: "EXCITED", label: "Excited" },
  { value: "READY_TO_WORK", label: "Ready to work" },
  { value: "OVERWHELMED", label: "Overwhelmed" },
  { value: "CONFUSED", label: "Confused" },
  { value: "DISCOURAGED", label: "Discouraged" },
  { value: "TIRED", label: "Tired" },
  { value: "STUCK", label: "Stuck" },
  { value: "NEED_SMALLER_STEP", label: "I need a smaller step" },
];

/**
 * SELF-SERVE MOOD CHECK-IN (spec §7, Phase B). One tap, one real
 * response — no proactive popups (see src/lib/affirmations/mood.ts for
 * why that's deferred, not missing by accident).
 */
export function MoodCheckInCard({ businessId }: { businessId: string }) {
  const [response, setResponse] = useState<{ message: string; suggestion?: { label: string; href: string } } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  async function handlePick(mood: string) {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/mood-checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, mood }),
    });
    setBusy(false);
    if (res.ok) {
      const data = (await res.json()) as { response: { message: string; suggestion?: { label: string; href: string } } };
      setResponse(data.response);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>How are you feeling?</CardTitle>
      </CardHeader>

      {response ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-navy-800">{response.message}</p>
          <div className="flex gap-2">
            {response.suggestion && (
              <Button asChild size="sm">
                <Link href={response.suggestion.href}>{response.suggestion.label}</Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setResponse(null)}>
              Check in again
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              disabled={busy}
              onClick={() => handlePick(m.value)}
              className="rounded-full border border-navy-200 bg-surface px-3 py-1.5 text-xs font-medium text-navy-700 transition-colors hover:border-navy-400 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
