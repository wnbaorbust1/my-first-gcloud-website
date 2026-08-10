"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/auth/form-field";
import { DAY_LABELS } from "@/lib/curriculum/constants";
import { cn } from "@/lib/utils";

type WeekOption = { id: string; weekNumber: number; title: string };
type UnitOption = { id: string; unitNumber: number; title: string; weeks: WeekOption[] };

const DAYS = [1, 2, 3, 4, 5];

export function LessonGenerateForm({
  courseId,
  units,
  prefill,
}: {
  courseId: string;
  units: UnitOption[];
  prefill?: {
    unitId?: string;
    weekNumber?: number;
    dayNumber?: number;
    topic?: string;
    notes?: string;
  };
}) {
  const router = useRouter();

  const [unitId, setUnitId] = useState(
    () => units.find((u) => u.id === prefill?.unitId)?.id ?? units[0]?.id ?? "",
  );
  const selectedUnit = useMemo(() => units.find((u) => u.id === unitId), [units, unitId]);
  const [weekId, setWeekId] = useState(() => {
    const unit = units.find((u) => u.id === prefill?.unitId) ?? units[0];
    return unit?.weeks.find((w) => w.weekNumber === prefill?.weekNumber)?.id ?? unit?.weeks[0]?.id ?? "";
  });
  const [dayNumber, setDayNumber] = useState(prefill?.dayNumber ?? 1);
  const [topic, setTopic] = useState(prefill?.topic ?? "");
  const [notes, setNotes] = useState(prefill?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weeksForUnit = selectedUnit?.weeks ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weekId) {
      setError("Choose a week.");
      return;
    }
    if (!topic.trim()) {
      setError("Enter a topic.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          unitId,
          weekId,
          dayNumber,
          topic,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        setLoading(false);
        return;
      }
      router.push(`/admin/curriculum/${data.courseSlug}/${data.weekNumber}/${data.dayNumber}/edit`);
    } catch {
      setError("Generation failed unexpectedly. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="unit" className="block text-sm font-medium text-ink">
            Unit
          </label>
          <select
            id="unit"
            value={unitId}
            onChange={(e) => {
              const nextUnit = units.find((u) => u.id === e.target.value);
              setUnitId(e.target.value);
              setWeekId(nextUnit?.weeks[0]?.id ?? "");
            }}
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.unitNumber}: {u.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="week" className="block text-sm font-medium text-ink">
            Week
          </label>
          <select
            id="week"
            value={weekId}
            onChange={(e) => setWeekId(e.target.value)}
            disabled={weeksForUnit.length === 0}
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink disabled:opacity-60"
          >
            {weeksForUnit.length === 0 && <option value="">No weeks in this unit</option>}
            {weeksForUnit.map((w) => (
              <option key={w.id} value={w.id}>
                Week {w.weekNumber}: {w.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-ink">Day</span>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              type="button"
              key={day}
              onClick={() => setDayNumber(day)}
              className={cn(
                "border px-3 py-1.5 text-sm transition-colors",
                dayNumber === day
                  ? "border-ink bg-ink text-cream"
                  : "border-slate/40 text-ink hover:bg-rose-gold/10",
              )}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>

      <FormField
        label="Topic"
        name="topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        required
        placeholder="e.g. Balancing a checkbook and reconciling statements"
      />

      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Special notes <span className="font-normal text-slate">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60"
          placeholder="Anything the AI should account for — prior lesson context, a specific activity to include, reading level, etc."
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-gold">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !weekId || !topic.trim()}
        className="w-full bg-ink px-4 py-2.5 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Generating… this can take a minute" : "Generate lesson"}
      </button>
    </form>
  );
}
