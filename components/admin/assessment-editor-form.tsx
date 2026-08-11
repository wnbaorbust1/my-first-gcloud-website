"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveAssessmentAction } from "@/lib/admin/assessment-actions";
import type { AdminAssessmentDetail } from "@/lib/admin/assessment-queries";
import { TeksSuggestionPanel } from "@/components/admin/teks-suggestion-panel";
import { AssessmentVariantActions } from "@/components/admin/assessment-variant-actions";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, ASSESSMENT_VARIANT_LABELS } from "@/lib/curriculum/constants";
import type { Question, QuestionType } from "@/types/supabase";
import type { Teks } from "@/types/curriculum";
import { cn } from "@/lib/utils";

function newQuestionId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}-${Math.random()}`;
}

/** The nullable type-specific fields, reset to sensible defaults whenever
 * a question's type changes — a matching question keeps its `pairs`
 * shape, an essay question has none of them. */
function defaultFieldsForType(type: QuestionType): Pick<Question, "options" | "correct_answer" | "pairs"> {
  switch (type) {
    case "multiple_choice":
      return { options: ["", ""], correct_answer: null, pairs: null };
    case "true_false":
      return { options: null, correct_answer: "True", pairs: null };
    case "matching":
      return {
        options: null,
        correct_answer: null,
        pairs: [
          { left: "", right: "" },
          { left: "", right: "" },
        ],
      };
    case "calculation":
    case "short_response":
      return { options: null, correct_answer: "", pairs: null };
    default:
      return { options: null, correct_answer: null, pairs: null };
  }
}

function newQuestion(): Question {
  return { id: newQuestionId(), type: "short_response", prompt: "", points: 10, ...defaultFieldsForType("short_response") };
}

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
const inputClass =
  "border border-slate/40 bg-cream px-2 py-1.5 text-sm text-ink placeholder:text-slate/60";

function QuestionEditor({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: Question;
  index: number;
  onChange: (patch: Partial<Question>) => void;
  onRemove: () => void;
}) {
  function handleTypeChange(type: QuestionType) {
    onChange({ type, ...defaultFieldsForType(type) });
  }

  function updateOption(i: number, value: string) {
    const options = [...(question.options ?? [])];
    options[i] = value;
    onChange({ options });
  }
  function addOption() {
    onChange({ options: [...(question.options ?? []), ""] });
  }
  function removeOption(i: number) {
    onChange({ options: (question.options ?? []).filter((_, idx) => idx !== i) });
  }

  function updatePair(i: number, side: "left" | "right", value: string) {
    const pairs = (question.pairs ?? []).map((p, idx) => (idx === i ? { ...p, [side]: value } : p));
    onChange({ pairs });
  }
  function addPair() {
    onChange({ pairs: [...(question.pairs ?? []), { left: "", right: "" }] });
  }
  function removePair(i: number) {
    onChange({ pairs: (question.pairs ?? []).filter((_, idx) => idx !== i) });
  }

  return (
    <div className="border-b border-rose-gold/20 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-wide text-rose-gold">Q{index + 1}</span>
        <select
          value={question.type}
          onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
          className={cn(inputClass, "flex-1 sm:flex-none")}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={100}
          value={question.points}
          onChange={(e) => onChange({ points: Number(e.target.value) || 0 })}
          aria-label={`Points for question ${index + 1}`}
          className={cn(inputClass, "w-16 text-right font-mono text-xs")}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove question"
          className="ml-auto border border-slate/40 px-2.5 py-1.5 font-mono text-xs text-slate transition-colors hover:border-rose-gold hover:text-rose-gold"
        >
          ✕
        </button>
      </div>

      <textarea
        value={question.prompt}
        onChange={(e) => onChange({ prompt: e.target.value })}
        rows={2}
        placeholder="Question prompt"
        className={cn(textareaClass, "mt-2")}
      />

      {question.type === "multiple_choice" && (
        <div className="mt-2 space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-slate">Options</p>
          {(question.options ?? []).map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${question.id}`}
                checked={question.correct_answer === option && option !== ""}
                onChange={() => onChange({ correct_answer: option })}
                aria-label={`Mark option ${i + 1} correct`}
              />
              <input
                value={option}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className={cn(inputClass, "flex-1")}
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={(question.options?.length ?? 0) <= 2}
                aria-label="Remove option"
                className="border border-slate/40 px-2 py-1 font-mono text-xs text-slate transition-colors hover:border-rose-gold hover:text-rose-gold disabled:opacity-40"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            disabled={(question.options?.length ?? 0) >= 8}
            className="border border-slate/40 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-ink transition-colors hover:bg-rose-gold/10 disabled:opacity-40"
          >
            + Add option
          </button>
          <p className="text-[11px] text-slate">Select the radio button next to the correct option.</p>
        </div>
      )}

      {question.type === "true_false" && (
        <div className="mt-2">
          <select
            value={question.correct_answer ?? "True"}
            onChange={(e) => onChange({ correct_answer: e.target.value })}
            className={inputClass}
          >
            <option value="True">True</option>
            <option value="False">False</option>
          </select>
        </div>
      )}

      {question.type === "matching" && (
        <div className="mt-2 space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-slate">Pairs</p>
          {(question.pairs ?? []).map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={pair.left}
                onChange={(e) => updatePair(i, "left", e.target.value)}
                placeholder="Left"
                className={cn(inputClass, "flex-1")}
              />
              <span className="text-slate">=</span>
              <input
                value={pair.right}
                onChange={(e) => updatePair(i, "right", e.target.value)}
                placeholder="Right"
                className={cn(inputClass, "flex-1")}
              />
              <button
                type="button"
                onClick={() => removePair(i)}
                disabled={(question.pairs?.length ?? 0) <= 2}
                aria-label="Remove pair"
                className="border border-slate/40 px-2 py-1 font-mono text-xs text-slate transition-colors hover:border-rose-gold hover:text-rose-gold disabled:opacity-40"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPair}
            disabled={(question.pairs?.length ?? 0) >= 15}
            className="border border-slate/40 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-ink transition-colors hover:bg-rose-gold/10 disabled:opacity-40"
          >
            + Add pair
          </button>
        </div>
      )}

      {(question.type === "calculation" || question.type === "short_response") && (
        <div className="mt-2">
          <input
            value={question.correct_answer ?? ""}
            onChange={(e) => onChange({ correct_answer: e.target.value })}
            placeholder="Correct answer"
            className={cn(inputClass, "w-full")}
          />
        </div>
      )}

      {(question.type === "scenario_analysis" ||
        question.type === "essay" ||
        question.type === "performance_task") && (
        <p className="mt-2 text-[11px] text-slate">Graded via rubric — see the assessment&apos;s answer key.</p>
      )}
    </div>
  );
}

export function AssessmentEditorForm({
  assessment,
  courseSlug,
  allTeks,
}: {
  assessment: AdminAssessmentDetail;
  courseSlug: string;
  allTeks: Teks[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(assessment.title);
  const [questions, setQuestions] = useState<Question[]>(assessment.questions);
  const [answerKey, setAnswerKey] = useState(assessment.answer_key ?? "");
  const [teksIds, setTeksIds] = useState<string[]>(assessment.teks_ids);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const totalPoints = questions.reduce((sum, q) => sum + (Number.isFinite(q.points) ? q.points : 0), 0);

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }
  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }
  function addQuestion() {
    setQuestions((prev) => [...prev, newQuestion()]);
  }

  function toggleTeks(id: string) {
    setTeksIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function handleSave(publish: boolean) {
    setSaveError(null);
    setSaveMessage(null);
    startTransition(async () => {
      const result = await saveAssessmentAction(
        assessment.id,
        { title, questions, answerKey, teksIds },
        publish,
        [
          `/admin/assessments/${courseSlug}`,
          `/admin/assessments/${courseSlug}/${assessment.id}/edit`,
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
        Admin · {assessment.course.display_name} · Unit {assessment.unit.unit_number}: {assessment.unit.title}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "font-mono text-[11px] uppercase tracking-wide",
            assessment.status === "published" ? "text-rose-gold" : "text-slate",
          )}
        >
          {assessment.status === "published" ? "Published" : "Draft"}
        </span>
        {assessment.variant_type !== "original" && assessment.source_assessment && (
          <span className="font-mono text-[11px] uppercase tracking-wide text-slate">
            {ASSESSMENT_VARIANT_LABELS[assessment.variant_type]} of{" "}
            <Link
              href={`/admin/assessments/${courseSlug}/${assessment.source_assessment.id}/edit`}
              className="underline underline-offset-2 hover:text-ink"
            >
              {assessment.source_assessment.title}
            </Link>
          </span>
        )}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Assessment title"
        className="mt-2 w-full border-0 border-b border-slate/40 bg-transparent font-display text-4xl font-semibold text-ink placeholder:text-slate/40 focus:outline-none focus:ring-0"
      />

      {assessment.variant_type === "original" && (
        <AssessmentVariantActions sourceAssessmentId={assessment.id} />
      )}

      <Section title="Questions" meta={`${questions.length} questions · ${totalPoints} pts`}>
        {questions.length === 0 ? (
          <p className="py-2 text-sm text-slate">No questions yet — add one below.</p>
        ) : (
          questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              onChange={(patch) => updateQuestion(question.id, patch)}
              onRemove={() => removeQuestion(question.id)}
            />
          ))
        )}
        <button
          type="button"
          onClick={addQuestion}
          className="border border-slate/40 px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-rose-gold/10"
        >
          + Add question
        </button>
      </Section>

      <Section title="Answer Key">
        <textarea
          value={answerKey}
          onChange={(e) => setAnswerKey(e.target.value)}
          rows={8}
          placeholder="Correct answers and grading guidance a teacher can grade against."
          className={textareaClass}
        />
      </Section>

      <Section title="TEKS Covered" meta={`${teksIds.length} selected`}>
        <TeksSuggestionPanel
          contentType="assessment"
          contentId={assessment.id}
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
