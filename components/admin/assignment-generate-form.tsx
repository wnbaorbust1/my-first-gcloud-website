"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/auth/form-field";
import { ASSIGNMENT_TYPES, ASSIGNMENT_TYPE_LABELS } from "@/lib/curriculum/constants";
import type { AssignmentType } from "@/types/supabase";

type UnitOption = { id: string; unitNumber: number; title: string };

function isAssignmentType(value?: string): value is AssignmentType {
  return !!value && (ASSIGNMENT_TYPES as readonly string[]).includes(value);
}

export function AssignmentGenerateForm({
  units,
  prefill,
}: {
  units: UnitOption[];
  prefill?: { unitId?: string; assignmentType?: string; topic?: string };
}) {
  const router = useRouter();

  const [unitId, setUnitId] = useState(
    () => units.find((u) => u.id === prefill?.unitId)?.id ?? units[0]?.id ?? "",
  );
  const [assignmentType, setAssignmentType] = useState<AssignmentType>(
    () => (isAssignmentType(prefill?.assignmentType) ? prefill!.assignmentType! : ASSIGNMENT_TYPES[0]),
  );
  const [topic, setTopic] = useState(prefill?.topic ?? "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) {
      setError("Choose a unit.");
      return;
    }
    if (!topic.trim()) {
      setError("Enter a topic.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId,
          assignmentType,
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
      router.push(`/admin/assignments/${data.courseSlug}/${data.assignmentId}/edit`);
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
            onChange={(e) => setUnitId(e.target.value)}
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
          <label htmlFor="assignment-type" className="block text-sm font-medium text-ink">
            Type
          </label>
          <select
            id="assignment-type"
            value={assignmentType}
            onChange={(e) => setAssignmentType(e.target.value as AssignmentType)}
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            {ASSIGNMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {ASSIGNMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FormField
        label="Topic"
        name="topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        required
        placeholder="e.g. Analyzing slope from a real-world data set"
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
          placeholder="Anything the AI should account for — length, difficulty, materials available, group vs. individual, etc."
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-gold">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !unitId || !topic.trim()}
        className="w-full bg-ink px-4 py-2.5 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Generating… this can take a minute" : "Generate assignment"}
      </button>
    </form>
  );
}
