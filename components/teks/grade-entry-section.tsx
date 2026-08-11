"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordGradeAction, type MasterySuggestion } from "@/lib/teacher/grade-actions";
import { updateMasteryStatusAction } from "@/lib/teacher/mastery-actions";
import { MASTERY_STATUS_LABELS } from "@/lib/curriculum/constants";
import type { Assignment, Student } from "@/types/curriculum";

/**
 * Records one student's grade on a published assignment, then surfaces
 * mastery-status suggestions for whatever TEKS codes that assignment is
 * tagged with — same approve-don't-auto-apply posture as the semantic
 * TEKS matcher. Applying a suggestion calls the same
 * updateMasteryStatusAction the manual grid uses, then refreshes so the
 * grid reflects it immediately.
 */
export function GradeEntrySection({
  classId,
  assignments,
  students,
}: {
  classId: string;
  assignments: Assignment[];
  students: Student[];
}) {
  const router = useRouter();
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [scoreEarned, setScoreEarned] = useState("");
  const [scorePossible, setScorePossible] = useState("100");

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MasterySuggestion[] | null>(null);
  const [appliedCodes, setAppliedCodes] = useState<Set<string>>(new Set());
  const [applyPending, startApplyTransition] = useTransition();

  if (assignments.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">Record a Grade</h2>
        <p className="mt-3 text-sm text-slate">
          No published assignments for this course yet — publish one in the admin area first.
        </p>
      </section>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const earned = Number(scoreEarned);
    const possible = Number(scorePossible);
    if (!assignmentId || !studentId || !Number.isFinite(earned) || !Number.isFinite(possible) || possible <= 0) {
      setError("Fill in a valid score.");
      return;
    }
    setError(null);
    setSuggestions(null);
    setAppliedCodes(new Set());
    startTransition(async () => {
      const result = await recordGradeAction({
        assignmentId,
        studentId,
        classId,
        scoreEarned: earned,
        scorePossible: possible,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuggestions(result.data.suggestions);
      router.refresh();
    });
  }

  function handleApply(suggestion: MasterySuggestion) {
    startApplyTransition(async () => {
      const result = await updateMasteryStatusAction({
        studentId,
        teksCode: suggestion.teksCode,
        status: suggestion.suggestedStatus,
        classId,
      });
      if (result.success) {
        setAppliedCodes((prev) => new Set(prev).add(suggestion.teksCode));
        router.refresh();
      }
    });
  }

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold text-ink">Record a Grade</h2>
      <p className="mt-1 text-sm text-slate">
        Grading an assignment tagged with TEKS codes suggests mastery updates — nothing changes
        until you apply a suggestion.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="grade-assignment" className="block text-sm font-medium text-ink">
            Assignment
          </label>
          <select
            id="grade-assignment"
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
            className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="grade-student" className="block text-sm font-medium text-ink">
            Student
          </label>
          <select
            id="grade-student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="grade-earned" className="block text-sm font-medium text-ink">
            Score
          </label>
          <input
            id="grade-earned"
            type="number"
            min={0}
            value={scoreEarned}
            onChange={(e) => setScoreEarned(e.target.value)}
            className="w-20 border border-slate/40 bg-cream px-2 py-2 text-sm text-ink"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="grade-possible" className="block text-sm font-medium text-ink">
            Out of
          </label>
          <input
            id="grade-possible"
            type="number"
            min={1}
            value={scorePossible}
            onChange={(e) => setScorePossible(e.target.value)}
            className="w-20 border border-slate/40 bg-cream px-2 py-2 text-sm text-ink"
          />
        </div>

        <button
          type="submit"
          disabled={pending || students.length === 0}
          className="bg-ink px-4 py-2 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save grade"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-gold">
          {error}
        </p>
      )}

      {suggestions && (
        <div className="mt-4 space-y-2 border border-rose-gold/40 bg-cream p-3">
          {suggestions.length === 0 ? (
            <p className="text-xs text-slate">
              Grade saved. No mastery status change suggested (either not tagged with TEKS, or
              already at the suggested status).
            </p>
          ) : (
            suggestions.map((s) => {
              const applied = appliedCodes.has(s.teksCode);
              return (
                <div
                  key={s.teksCode}
                  className="flex items-center justify-between gap-3 border-b border-rose-gold/20 pb-2 last:border-0 last:pb-0"
                >
                  <p className="text-xs text-ink">
                    <span className="font-mono text-slate">{s.teksCode}</span>{" "}
                    {MASTERY_STATUS_LABELS[s.currentStatus]} → {MASTERY_STATUS_LABELS[s.suggestedStatus]}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleApply(s)}
                    disabled={applied || applyPending}
                    className="shrink-0 border border-ink px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
                  >
                    {applied ? "Applied" : "Apply"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
