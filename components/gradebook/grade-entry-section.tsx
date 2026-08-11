"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordGradeAction, type MasterySuggestion } from "@/lib/teacher/grade-actions";
import { updateMasteryStatusAction } from "@/lib/teacher/mastery-actions";
import { MASTERY_STATUS_LABELS } from "@/lib/curriculum/constants";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import type { GradableItem, GradeEntry } from "@/lib/teacher/gradebook-queries";
import type { Student } from "@/types/curriculum";
import { cn } from "@/lib/utils";

function gradeKey(kind: "assessment" | "assignment", itemId: string, studentId: string) {
  return `${kind}:${itemId}:${studentId}`;
}

function GradeRow({
  student,
  item,
  classId,
  existing,
}: {
  student: Student;
  item: GradableItem;
  classId: string;
  existing: GradeEntry | undefined;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(existing ? String(existing.score) : "");
  const [maxScore, setMaxScore] = useState(existing ? String(existing.maxScore) : String(item.totalPoints));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MasterySuggestion[] | null>(null);
  const [appliedCodes, setAppliedCodes] = useState<Set<string>>(new Set());
  const [applyPending, startApplyTransition] = useTransition();

  function handleSave() {
    const scoreNum = Number(score);
    const maxNum = Number(maxScore);
    if (!Number.isFinite(scoreNum) || !Number.isFinite(maxNum) || maxNum <= 0) {
      setError("Enter a valid score.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await recordGradeAction({
        kind: item.kind,
        itemId: item.id,
        studentId: student.id,
        classId,
        score: scoreNum,
        maxScore: maxNum,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuggestions(result.data.suggestions);
      setEditing(false);
      router.refresh();
    });
  }

  function handleApply(suggestion: MasterySuggestion) {
    startApplyTransition(async () => {
      const result = await updateMasteryStatusAction({
        studentId: student.id,
        teksCode: suggestion.teksCode,
        status: suggestion.suggestedStatus,
        classId,
      });
      if (result.success) {
        setAppliedCodes((prev) => new Set(prev).add(suggestion.teksCode));
      }
    });
  }

  const isGraded = !!existing && !editing;

  return (
    <LedgerRow
      stamp={isGraded ? <StatusStamp label="Graded" /> : undefined}
      meta={
        isGraded ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-mono text-xs text-ink hover:underline"
          >
            {existing!.score}/{existing!.maxScore}
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="0"
              className="w-14 border border-slate/40 bg-cream px-1.5 py-1 text-right font-mono text-xs text-ink"
            />
            <span className="font-mono text-xs text-slate">/</span>
            <input
              type="number"
              min={1}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              className="w-14 border border-slate/40 bg-cream px-1.5 py-1 text-right font-mono text-xs text-ink"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="border border-ink px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
            >
              {pending ? "…" : "Save"}
            </button>
          </div>
        )
      }
    >
      <div>
        <span>{student.name}</span>
        {error && (
          <p role="alert" className="mt-0.5 text-xs text-rose-gold">
            {error}
          </p>
        )}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-1.5 space-y-1 border-l-2 border-rose-gold/40 pl-2">
            {suggestions.map((s) => {
              const applied = appliedCodes.has(s.teksCode);
              return (
                <div key={s.teksCode} className="flex items-center gap-2 text-xs">
                  <span className="text-slate">
                    <span className="font-mono">{s.teksCode}</span>:{" "}
                    {MASTERY_STATUS_LABELS[s.currentStatus]} → {MASTERY_STATUS_LABELS[s.suggestedStatus]}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApply(s)}
                    disabled={applied || applyPending}
                    className={cn(
                      "border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors",
                      applied ? "border-slate/30 text-slate" : "border-ink text-ink hover:bg-ink hover:text-cream",
                    )}
                  >
                    {applied ? "Applied" : "Apply"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LedgerRow>
  );
}

export function GradeEntrySection({
  classId,
  students,
  items,
  gradesByKey,
}: {
  classId: string;
  students: Student[];
  items: GradableItem[];
  gradesByKey: Record<string, GradeEntry>;
}) {
  const [selectedKey, setSelectedKey] = useState(items[0] ? `${items[0].kind}:${items[0].id}` : "");
  const selectedItem = items.find((i) => `${i.kind}:${i.id}` === selectedKey);

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-ink">Grade Entry</h2>
        <span className="font-mono text-xs text-slate">{students.length} students</span>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate">
          No published assessments or assignments for this course yet.
        </p>
      ) : (
        <>
          <div className="mt-3 space-y-1.5">
            <label htmlFor="gradebook-item" className="block text-sm font-medium text-ink">
              Assessment / Assignment
            </label>
            <select
              id="gradebook-item"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full max-w-md border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
            >
              {items.map((item) => (
                <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>
                  [{item.kind === "assessment" ? "Assessment" : "Assignment"}] {item.title} ({item.totalPoints} pts)
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="mt-4 border-t border-rose-gold/40">
              {students.length === 0 ? (
                <p className="py-4 text-sm text-slate">Add students to the roster to record grades.</p>
              ) : (
                students.map((student) => (
                  <GradeRow
                    key={student.id}
                    student={student}
                    item={selectedItem}
                    classId={classId}
                    existing={gradesByKey[gradeKey(selectedItem.kind, selectedItem.id, student.id)]}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
