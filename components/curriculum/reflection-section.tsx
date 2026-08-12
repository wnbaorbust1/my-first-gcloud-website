"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveReflectionAction } from "@/lib/teacher/reflection-actions";
import {
  PACING_ACCURACY_OPTIONS,
  PACING_ACCURACY_LABELS,
  ENGAGEMENT_LEVEL_OPTIONS,
  ENGAGEMENT_LEVEL_LABELS,
} from "@/lib/curriculum/constants";
import type { Reflection } from "@/types/curriculum";
import type { PacingAccuracy, EngagementLevel } from "@/types/supabase";
import { cn } from "@/lib/utils";

const textareaClass =
  "w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60";

function StarButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors",
        active
          ? "border-gold-leaf text-gold-leaf"
          : "border-slate/40 text-slate hover:border-gold-leaf hover:text-gold-leaf",
      )}
    >
      <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true">
        <path
          d="M10 1.5l2.5 5.6 6.1.6-4.6 4.1 1.3 6-5.3-3.2-5.3 3.2 1.3-6-4.6-4.1 6.1-.6z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      {active ? "Favorited" : "Favorite"}
    </button>
  );
}

/**
 * Quick-entry post-lesson reflection, embedded right in the lesson
 * detail view. One reflection per (teacher, lesson) — saving always
 * upserts, so revisiting a lesson's reflection refines the same note
 * rather than starting a new one.
 */
export function ReflectionSection({
  lessonId,
  initialReflection,
  revalidatePaths,
}: {
  lessonId: string;
  initialReflection: Reflection | null;
  revalidatePaths: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [whatWorked, setWhatWorked] = useState(initialReflection?.what_worked ?? "");
  const [whatConfused, setWhatConfused] = useState(initialReflection?.what_confused_students ?? "");
  const [pacing, setPacing] = useState<PacingAccuracy | "">(initialReflection?.pacing_accuracy ?? "");
  const [engagement, setEngagement] = useState<EngagementLevel | "">(
    initialReflection?.engagement_level ?? "",
  );
  const [reteachFlag, setReteachFlag] = useState(initialReflection?.reteach_flag ?? false);
  const [actionItems, setActionItems] = useState(initialReflection?.action_items ?? "");
  const [isFavorite, setIsFavorite] = useState(initialReflection?.is_favorite ?? false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSave(nextFavorite = isFavorite) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveReflectionAction({
        lessonId,
        whatWorked,
        whatConfusedStudents: whatConfused,
        pacingAccuracy: pacing || null,
        engagementLevel: engagement || null,
        reteachFlag,
        actionItems,
        isFavorite: nextFavorite,
        revalidatePaths,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage("Saved.");
      router.refresh();
    });
  }

  function toggleFavorite() {
    const next = !isFavorite;
    setIsFavorite(next);
    handleSave(next);
  }

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Your Reflection<span className="text-rose-gold">.</span>
        </h2>
        <StarButton active={isFavorite} onClick={toggleFavorite} />
      </div>
      <p className="mt-1 text-sm text-slate">Private to you — quick notes for next time you teach this.</p>

      <div className="mt-3 space-y-4 border-t border-rose-gold/40 pt-4">
        <div>
          <label className="font-mono text-xs uppercase tracking-wide text-slate">What worked</label>
          <textarea
            value={whatWorked}
            onChange={(e) => setWhatWorked(e.target.value)}
            rows={2}
            placeholder="What landed well this time?"
            className={cn(textareaClass, "mt-1.5")}
          />
        </div>

        <div>
          <label className="font-mono text-xs uppercase tracking-wide text-slate">
            What confused students
          </label>
          <textarea
            value={whatConfused}
            onChange={(e) => setWhatConfused(e.target.value)}
            rows={2}
            placeholder="Where did students get stuck or lost?"
            className={cn(textareaClass, "mt-1.5")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="font-mono text-xs uppercase tracking-wide text-slate">Pacing</label>
            <select
              value={pacing}
              onChange={(e) => setPacing(e.target.value as PacingAccuracy | "")}
              className="mt-1.5 w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
            >
              <option value="">Not set</option>
              {PACING_ACCURACY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PACING_ACCURACY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-wide text-slate">Engagement</label>
            <select
              value={engagement}
              onChange={(e) => setEngagement(e.target.value as EngagementLevel | "")}
              className="mt-1.5 w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
            >
              <option value="">Not set</option>
              {ENGAGEMENT_LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {ENGAGEMENT_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={reteachFlag}
            onChange={(e) => setReteachFlag(e.target.checked)}
          />
          Flag for reteaching next time
        </label>

        <div>
          <label className="font-mono text-xs uppercase tracking-wide text-slate">Action items</label>
          <textarea
            value={actionItems}
            onChange={(e) => setActionItems(e.target.value)}
            rows={2}
            placeholder="What would you change next time?"
            className={cn(textareaClass, "mt-1.5")}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={pending}
            className="border border-ink px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save reflection"}
          </button>
          {message && <span className="text-sm text-slate">{message}</span>}
          {error && (
            <span role="alert" className="text-sm text-rose-gold">
              {error}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
