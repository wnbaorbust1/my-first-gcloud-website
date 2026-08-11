"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAssignmentAction } from "@/lib/admin/assignment-actions";
import type { AdminAssignmentDetail } from "@/lib/admin/assignment-queries";
import { TeksSuggestionPanel } from "@/components/admin/teks-suggestion-panel";
import { ASSIGNMENT_TYPES, ASSIGNMENT_TYPE_LABELS } from "@/lib/curriculum/constants";
import type { AssignmentType } from "@/types/supabase";
import type { Teks } from "@/types/curriculum";
import { cn } from "@/lib/utils";

type RubricRow = { criterion: string; points: number; description: string };

function Section({ title, meta, children }: { title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
        {meta && <span className="font-mono text-xs text-slate">{meta}</span>}
      </div>
      <div className="mt-3 space-y-4 border-t border-rose-gold/40 pt-4">{children}</div>
    </section>
  );
}

const textareaClass =
  "w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60";

export function AssignmentEditorForm({
  assignment,
  courseSlug,
  allTeks,
}: {
  assignment: AdminAssignmentDetail;
  courseSlug: string;
  allTeks: Teks[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [assignmentType, setAssignmentType] = useState<AssignmentType>(assignment.assignment_type);
  const [title, setTitle] = useState(assignment.title);
  const [instructions, setInstructions] = useState(assignment.instructions ?? "");
  const [teacherDirections, setTeacherDirections] = useState(assignment.teacher_directions ?? "");
  const [rubric, setRubric] = useState<RubricRow[]>(() =>
    assignment.rubric.length > 0
      ? assignment.rubric.map((r) => ({
          criterion: r.criterion,
          points: r.points,
          description: r.description ?? "",
        }))
      : [{ criterion: "", points: 10, description: "" }],
  );
  const [answerKey, setAnswerKey] = useState(assignment.answer_key ?? "");
  const [teksIds, setTeksIds] = useState<string[]>(assignment.teks_ids);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const totalPoints = rubric.reduce((sum, r) => sum + (Number.isFinite(r.points) ? r.points : 0), 0);

  function updateRubricRow(index: number, patch: Partial<RubricRow>) {
    setRubric((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRubricRow() {
    setRubric((prev) => [...prev, { criterion: "", points: 10, description: "" }]);
  }

  function removeRubricRow(index: number) {
    setRubric((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTeks(id: string) {
    setTeksIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function handleSave(publish: boolean) {
    setSaveError(null);
    setSaveMessage(null);
    startTransition(async () => {
      const result = await saveAssignmentAction(
        assignment.id,
        {
          assignmentType,
          title,
          instructions,
          teacherDirections,
          rubric: rubric.map((r) => ({
            criterion: r.criterion,
            points: Number.isFinite(r.points) ? r.points : 0,
            description: r.description,
          })),
          answerKey,
          teksIds,
        },
        publish,
        [
          `/admin/assignments/${courseSlug}`,
          `/admin/assignments/${courseSlug}/${assignment.id}/edit`,
        ],
      );

      if (!result.success) {
        setSaveError(result.error);
        return;
      }
      setSaveMessage(publish ? "Published." : "Draft saved.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
        Admin · {assignment.course.display_name} · Unit {assignment.unit.unit_number}: {assignment.unit.title}
      </p>

      <div className="mt-2 flex items-center gap-3">
        <span
          className={cn(
            "font-mono text-[11px] uppercase tracking-wide",
            assignment.status === "published" ? "text-rose-gold" : "text-slate",
          )}
        >
          {assignment.status === "published" ? "Published" : "Draft"}
        </span>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Assignment title"
        className="mt-2 w-full border-0 border-b border-slate/40 bg-transparent font-display text-4xl font-semibold text-ink placeholder:text-slate/40 focus:outline-none focus:ring-0"
      />

      <div className="mt-4 space-y-1.5">
        <label htmlFor="assignment-type" className="block text-sm font-medium text-ink">
          Type
        </label>
        <select
          id="assignment-type"
          value={assignmentType}
          onChange={(e) => setAssignmentType(e.target.value as AssignmentType)}
          className="w-full max-w-xs border border-slate/40 bg-cream px-3 py-2 text-sm text-ink sm:w-auto"
        >
          {ASSIGNMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {ASSIGNMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <Section title="Instructions" meta="Student-facing">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={6}
          placeholder="What the student reads and follows."
          className={textareaClass}
        />
      </Section>

      <Section title="Teacher Directions" meta="Never shown to students">
        <textarea
          value={teacherDirections}
          onChange={(e) => setTeacherDirections(e.target.value)}
          rows={5}
          placeholder="Setup, materials, timing, differentiation notes."
          className={textareaClass}
        />
      </Section>

      <Section title="Rubric" meta={`${totalPoints} pt${totalPoints === 1 ? "" : "s"} total`}>
        {rubric.map((row, index) => (
          <div key={index} className="border-b border-rose-gold/20 pb-4 last:border-0 last:pb-0">
            <div className="flex items-start gap-2">
              <input
                value={row.criterion}
                onChange={(e) => updateRubricRow(index, { criterion: e.target.value })}
                placeholder="Criterion"
                className="flex-1 border border-slate/40 bg-cream px-3 py-2 text-sm font-medium text-ink placeholder:text-slate/60"
              />
              <input
                type="number"
                min={1}
                max={100}
                value={row.points}
                onChange={(e) => updateRubricRow(index, { points: Number(e.target.value) || 0 })}
                aria-label={`Points for ${row.criterion || `criterion ${index + 1}`}`}
                className="w-20 border border-slate/40 bg-cream px-2 py-2 text-right font-mono text-xs text-ink"
              />
              <button
                type="button"
                onClick={() => removeRubricRow(index)}
                disabled={rubric.length === 1}
                aria-label="Remove criterion"
                className="border border-slate/40 px-2.5 py-2 font-mono text-xs text-slate transition-colors hover:border-rose-gold hover:text-rose-gold disabled:cursor-not-allowed disabled:opacity-40"
              >
                ✕
              </button>
            </div>
            <textarea
              value={row.description}
              onChange={(e) => updateRubricRow(index, { description: e.target.value })}
              rows={2}
              placeholder="What earns full points on this criterion (optional)"
              className={cn(textareaClass, "mt-2")}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addRubricRow}
          className="border border-slate/40 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-rose-gold/10"
        >
          + Add criterion
        </button>
      </Section>

      <Section title="Answer Key">
        <textarea
          value={answerKey}
          onChange={(e) => setAnswerKey(e.target.value)}
          rows={8}
          placeholder="Correct answers or strong sample responses a teacher can grade against."
          className={textareaClass}
        />
      </Section>

      <Section title="TEKS Covered" meta={`${teksIds.length} selected`}>
        <TeksSuggestionPanel
          contentType="assignment"
          contentId={assignment.id}
          currentTeksIds={teksIds}
          allTeks={allTeks}
          onApprove={(id) => setTeksIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
        />
        {allTeks.length === 0 ? (
          <p className="py-4 text-sm text-slate">No TEKS codes in the reference table yet.</p>
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {allTeks.map((teks) => (
              <label key={teks.id} className="ledger-row flex cursor-pointer items-start gap-3 py-1.5">
                <input
                  type="checkbox"
                  checked={teksIds.includes(teks.id)}
                  onChange={() => toggleTeks(teks.id)}
                  className="mt-1 shrink-0"
                />
                <span className="text-sm text-ink">
                  <span className="font-mono text-xs text-slate">{teks.code}</span> {teks.description}
                </span>
              </label>
            ))}
          </div>
        )}
      </Section>

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-rose-gold/40 pt-6">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={pending}
          className="border border-ink px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={pending}
          className="bg-ink px-4 py-2.5 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Publish"}
        </button>
        {saveMessage && <span className="text-sm text-slate">{saveMessage}</span>}
        {saveError && (
          <span role="alert" className="text-sm text-rose-gold">
            {saveError}
          </span>
        )}
      </div>
    </div>
  );
}
