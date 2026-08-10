"use client";

import { useState } from "react";
import Link from "next/link";
import type { GapSuggestion } from "@/lib/ai/schemas";
import { DAY_LABELS } from "@/lib/curriculum/constants";

/**
 * "Fill curriculum gaps" trigger + results, scoped to one unit. Fetches
 * suggestions on demand (never on page load — it's a real Claude call)
 * and turns each suggestion into a deep link into the generate form,
 * pre-filled so the admin only has to review before generating.
 */
export function GapSuggestionsPanel({
  unitId,
  courseSlug,
  emptySlotCount,
}: {
  unitId: string;
  courseSlug: string;
  emptySlotCount: number;
}) {
  const [suggestions, setSuggestions] = useState<GapSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/fill-gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't get suggestions.");
        return;
      }
      setSuggestions(data.suggestions);
    } catch {
      setError("Couldn't get suggestions. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={handleFetch}
        disabled={loading}
        className="border border-rose-gold/50 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-rose-gold/10 disabled:opacity-60"
      >
        {loading
          ? "Thinking…"
          : `Suggest lessons for ${emptySlotCount} gap${emptySlotCount === 1 ? "" : "s"}`}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-gold">
          {error}
        </p>
      )}

      {suggestions && (
        <div className="mt-3 w-full max-w-md space-y-3 border border-rose-gold/40 bg-cream p-3 sm:w-96">
          {suggestions.length === 0 ? (
            <p className="text-xs text-slate">
              No suggestions came back — try again, or fill these slots by hand.
            </p>
          ) : (
            suggestions.map((s) => (
              <div
                key={`${s.week_number}-${s.day_number}`}
                className="border-b border-rose-gold/20 pb-3 last:border-0 last:pb-0"
              >
                <p className="font-mono text-[11px] uppercase tracking-wide text-slate">
                  Week {s.week_number} · {DAY_LABELS[s.day_number] ?? `Day ${s.day_number}`}
                </p>
                <p className="mt-0.5 text-sm font-medium text-ink">{s.suggested_title}</p>
                <p className="mt-0.5 text-xs text-slate">{s.rationale}</p>
                <Link
                  href={`/admin/curriculum/${courseSlug}/generate?unitId=${unitId}&weekNumber=${s.week_number}&day=${s.day_number}&topic=${encodeURIComponent(s.suggested_topic)}&notes=${encodeURIComponent(`Suggested title: "${s.suggested_title}"`)}`}
                  className="mt-1.5 inline-block text-xs text-rose-gold underline underline-offset-2"
                >
                  Generate this lesson →
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
