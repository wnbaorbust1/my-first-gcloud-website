"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * One-click retake / modified-version generation from an existing
 * (original) assessment. Each click calls Claude to produce a full new
 * question set, saves it as its own draft `assessments` row linked back
 * via source_assessment_id, and jumps straight to editing it — the admin
 * reviews/edits/publishes the variant exactly like any other draft.
 */
export function AssessmentVariantActions({ sourceAssessmentId }: { sourceAssessmentId: string }) {
  const router = useRouter();
  const [loadingVariant, setLoadingVariant] = useState<"retake" | "modified" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(variant: "retake" | "modified") {
    setLoadingVariant(variant);
    setError(null);
    try {
      const res = await fetch("/api/ai/regenerate-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceAssessmentId, variant }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        setLoadingVariant(null);
        return;
      }
      router.push(`/admin/assessments/${data.courseSlug}/${data.assessmentId}/edit`);
    } catch {
      setError("Generation failed unexpectedly. Try again.");
      setLoadingVariant(null);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border border-rose-gold/40 bg-cream p-3">
      <span className="font-mono text-[11px] uppercase tracking-wide text-slate">Generate a variant</span>
      <button
        type="button"
        onClick={() => handleGenerate("retake")}
        disabled={loadingVariant !== null}
        className="border border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
      >
        {loadingVariant === "retake" ? "Generating…" : "Generate Retake Version"}
      </button>
      <button
        type="button"
        onClick={() => handleGenerate("modified")}
        disabled={loadingVariant !== null}
        className="border border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
      >
        {loadingVariant === "modified" ? "Generating…" : "Generate Modified Version"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-rose-gold">
          {error}
        </span>
      )}
    </div>
  );
}
