"use client";

import { useState } from "react";
import type { TeksMatch } from "@/lib/ai/schemas";
import type { Teks } from "@/types/curriculum";
import { cn } from "@/lib/utils";

const CONFIDENCE_LABELS: Record<TeksMatch["confidence"], string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

/**
 * Semantic TEKS matching, embedded in the lesson/assignment editors.
 * Fetches suggestions on demand (never on mount), and every suggestion
 * requires an explicit "Add" click to actually land in teksIds — nothing
 * here writes anything on its own. `onApprove` just updates the parent
 * editor's local state; the existing Save Draft/Publish flow persists it.
 */
export function TeksSuggestionPanel({
  contentType,
  contentId,
  currentTeksIds,
  allTeks,
  onApprove,
}: {
  contentType: "lesson" | "assignment" | "assessment";
  contentId: string;
  currentTeksIds: string[];
  allTeks: Teks[];
  onApprove: (teksId: string) => void;
}) {
  const [matches, setMatches] = useState<TeksMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teksByCode = new Map(allTeks.map((t) => [t.code, t]));

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/suggest-teks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't get suggestions.");
        return;
      }
      setMatches(data.matches);
    } catch {
      setError("Couldn't get suggestions. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={handleSuggest}
        disabled={loading}
        className="border border-rose-gold/50 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-rose-gold/10 disabled:opacity-60"
      >
        {loading ? "Thinking…" : "Suggest TEKS"}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-gold">
          {error}
        </p>
      )}

      {matches && (
        <div className="mt-3 space-y-2 border border-rose-gold/40 bg-cream p-3">
          {matches.length === 0 ? (
            <p className="text-xs text-slate">No TEKS matches suggested for this content.</p>
          ) : (
            matches.map((match) => {
              const teks = teksByCode.get(match.code);
              if (!teks) return null;
              const applied = currentTeksIds.includes(teks.id);
              return (
                <div
                  key={match.code}
                  className="flex items-start justify-between gap-3 border-b border-rose-gold/20 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-ink">
                      {teks.code}{" "}
                      <span className="text-slate">— {CONFIDENCE_LABELS[match.confidence]}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate">{match.rationale}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApprove(teks.id)}
                    disabled={applied}
                    className={cn(
                      "shrink-0 border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors",
                      applied
                        ? "border-slate/30 text-slate"
                        : "border-ink text-ink hover:bg-ink hover:text-cream",
                    )}
                  >
                    {applied ? "Added" : "Add"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
