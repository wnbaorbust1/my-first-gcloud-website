"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveLessonAction } from "@/lib/admin/actions";
import type { AdminLessonDetail } from "@/lib/admin/curriculum-queries";
import type { AssistantEdit, LessonSnapshot } from "@/lib/ai/schemas";
import { LessonAssistantPanel } from "@/components/admin/lesson-assistant-panel";
import { TeksSuggestionPanel } from "@/components/admin/teks-suggestion-panel";
import { SEGMENT_LABELS, SEGMENT_ORDER, LESSON_CLASS_PERIOD_MINUTES } from "@/lib/curriculum/constants";
import { DAY_LABELS } from "@/lib/curriculum/constants";
import type { Teks } from "@/types/curriculum";
import type { LessonSegmentKey } from "@/types/supabase";
import { cn } from "@/lib/utils";

const GRADUAL_RELEASE_STAGES: { key: "i_do" | "we_do" | "you_do_together" | "you_do"; label: string }[] = [
  { key: "i_do", label: "I Do" },
  { key: "we_do", label: "We Do" },
  { key: "you_do_together", label: "You Do Together" },
  { key: "you_do", label: "You Do" },
];

const QSSSA_FIELDS: {
  key: "qsssa_question" | "qsssa_signal" | "qsssa_stem" | "qsssa_share" | "qsssa_assess";
  label: string;
}[] = [
  { key: "qsssa_question", label: "Question" },
  { key: "qsssa_signal", label: "Signal" },
  { key: "qsssa_stem", label: "Stem" },
  { key: "qsssa_share", label: "Share" },
  { key: "qsssa_assess", label: "Assess" },
];

type SegmentState = Record<
  LessonSegmentKey,
  { title: string; description: string; duration_minutes: number }
>;

function buildInitialSegments(segments: AdminLessonDetail["segments"]): SegmentState {
  const byKey = new Map(segments.map((s) => [s.segment_key, s]));
  const state = {} as SegmentState;
  for (const key of SEGMENT_ORDER) {
    const existing = byKey.get(key);
    state[key] = {
      title: existing?.title ?? "",
      description: existing?.description ?? "",
      duration_minutes: existing?.duration_minutes ?? 10,
    };
  }
  return state;
}

function padTo5(items: string[]): string[] {
  const padded = items.slice(0, 5);
  while (padded.length < 5) padded.push("");
  return padded;
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

export function LessonEditorForm({
  lesson,
  courseSlug,
  courseDisplayName,
  weekNumber,
  dayNumber,
  allTeks,
}: {
  lesson: AdminLessonDetail;
  courseSlug: string;
  courseDisplayName: string;
  weekNumber: number;
  dayNumber: number;
  allTeks: Teks[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(lesson.title);
  const [segments, setSegments] = useState<SegmentState>(() => buildInitialSegments(lesson.segments));
  const [iDo, setIDo] = useState(lesson.i_do ?? "");
  const [weDo, setWeDo] = useState(lesson.we_do ?? "");
  const [youDoTogether, setYouDoTogether] = useState(lesson.you_do_together ?? "");
  const [youDo, setYouDo] = useState(lesson.you_do ?? "");
  const [qQuestion, setQQuestion] = useState(lesson.qsssa_question ?? "");
  const [qSignal, setQSignal] = useState(lesson.qsssa_signal ?? "");
  const [qStem, setQStem] = useState(lesson.qsssa_stem ?? "");
  const [qShare, setQShare] = useState(lesson.qsssa_share ?? "");
  const [qAssess, setQAssess] = useState(lesson.qsssa_assess ?? "");
  const [homework, setHomework] = useState<string[]>(() => padTo5(lesson.homework));
  const [teksIds, setTeksIds] = useState<string[]>(lesson.teks_ids);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const gradualReleaseValues: Record<string, string> = {
    i_do: iDo,
    we_do: weDo,
    you_do_together: youDoTogether,
    you_do: youDo,
  };
  const gradualReleaseSetters: Record<string, (v: string) => void> = {
    i_do: setIDo,
    we_do: setWeDo,
    you_do_together: setYouDoTogether,
    you_do: setYouDo,
  };
  const qsssaValues: Record<string, string> = {
    qsssa_question: qQuestion,
    qsssa_signal: qSignal,
    qsssa_stem: qStem,
    qsssa_share: qShare,
    qsssa_assess: qAssess,
  };
  const qsssaSetters: Record<string, (v: string) => void> = {
    qsssa_question: setQQuestion,
    qsssa_signal: setQSignal,
    qsssa_stem: setQStem,
    qsssa_share: setQShare,
    qsssa_assess: setQAssess,
  };

  const totalMinutes = SEGMENT_ORDER.reduce((sum, key) => sum + segments[key].duration_minutes, 0);

  function updateSegment(key: LessonSegmentKey, patch: Partial<SegmentState[LessonSegmentKey]>) {
    setSegments((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function buildSnapshot(): LessonSnapshot {
    return {
      title,
      segments: SEGMENT_ORDER.map((key) => ({
        segment_key: key,
        title: segments[key].title,
        description: segments[key].description || null,
        duration_minutes: segments[key].duration_minutes,
      })),
      i_do: iDo || null,
      we_do: weDo || null,
      you_do_together: youDoTogether || null,
      you_do: youDo || null,
      qsssa_question: qQuestion || null,
      qsssa_signal: qSignal || null,
      qsssa_stem: qStem || null,
      qsssa_share: qShare || null,
      qsssa_assess: qAssess || null,
      homework: homework.filter((h) => h.trim().length > 0),
    };
  }

  function applyAssistantEdit(edit: AssistantEdit) {
    if (edit.target_field === "homework") {
      if (edit.homework_items) setHomework(padTo5(edit.homework_items));
      return;
    }
    if (edit.target_field.startsWith("segment_")) {
      const key = edit.target_field.slice("segment_".length) as LessonSegmentKey;
      updateSegment(key, {
        ...(edit.segment_title != null ? { title: edit.segment_title } : {}),
        ...(edit.segment_description != null ? { description: edit.segment_description } : {}),
      });
      return;
    }
    if (edit.text_value == null) return;
    if (edit.target_field === "title") {
      setTitle(edit.text_value);
      return;
    }
    if (gradualReleaseSetters[edit.target_field]) {
      gradualReleaseSetters[edit.target_field](edit.text_value);
      return;
    }
    if (qsssaSetters[edit.target_field]) {
      qsssaSetters[edit.target_field](edit.text_value);
    }
  }

  function handleSave(publish: boolean) {
    setSaveError(null);
    setSaveMessage(null);
    startTransition(async () => {
      const result = await saveLessonAction(
        lesson.id,
        {
          title,
          segments: SEGMENT_ORDER.map((key) => ({
            segment_key: key,
            title: segments[key].title,
            description: segments[key].description,
            duration_minutes: segments[key].duration_minutes,
          })),
          i_do: iDo,
          we_do: weDo,
          you_do_together: youDoTogether,
          you_do: youDo,
          qsssa_question: qQuestion,
          qsssa_signal: qSignal,
          qsssa_stem: qStem,
          qsssa_share: qShare,
          qsssa_assess: qAssess,
          homework,
          teksIds,
        },
        publish,
        [
          `/admin/curriculum/${courseSlug}`,
          `/admin/curriculum/${courseSlug}/${weekNumber}/${dayNumber}/edit`,
          `/curriculum/${courseSlug}/${weekNumber}/${dayNumber}`,
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

  function toggleTeks(id: string) {
    setTeksIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  return (
    <div className="lg:flex lg:items-start lg:gap-8">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
          Admin · {courseDisplayName} · Week {weekNumber} · {DAY_LABELS[dayNumber] ?? `Day ${dayNumber}`}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-[11px] uppercase tracking-wide",
              lesson.status === "published" ? "text-rose-gold" : "text-slate",
            )}
          >
            {lesson.status === "published" ? "Published" : "Draft"}
          </span>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lesson title"
          className="mt-2 w-full border-0 border-b border-slate/40 bg-transparent font-display text-4xl font-semibold text-ink placeholder:text-slate/40 focus:outline-none focus:ring-0"
        />

        {/* Class period segments */}
        <Section title="Class Period" meta={`${totalMinutes} / ${LESSON_CLASS_PERIOD_MINUTES} min`}>
          {SEGMENT_ORDER.map((key) => (
            <div key={key} className="border-b border-rose-gold/20 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs uppercase tracking-wide text-rose-gold">
                  {SEGMENT_LABELS[key]}
                </span>
                <input
                  type="number"
                  min={1}
                  max={70}
                  value={segments[key].duration_minutes}
                  onChange={(e) =>
                    updateSegment(key, { duration_minutes: Number(e.target.value) || 0 })
                  }
                  className="w-16 border border-slate/40 bg-cream px-2 py-1 text-right font-mono text-xs text-ink"
                  aria-label={`${SEGMENT_LABELS[key]} duration (minutes)`}
                />
              </div>
              <input
                value={segments[key].title}
                onChange={(e) => updateSegment(key, { title: e.target.value })}
                placeholder="Segment title"
                className="mt-2 w-full border border-slate/40 bg-cream px-3 py-2 text-sm font-medium text-ink placeholder:text-slate/60"
              />
              <textarea
                value={segments[key].description}
                onChange={(e) => updateSegment(key, { description: e.target.value })}
                rows={2}
                placeholder="What happens during this segment"
                className={cn(textareaClass, "mt-2")}
              />
            </div>
          ))}
        </Section>

        {/* Gradual release */}
        <Section title="Gradual Release">
          {GRADUAL_RELEASE_STAGES.map((stage) => (
            <div key={stage.key}>
              <label className="font-mono text-xs uppercase tracking-wide text-slate">
                {stage.label}
              </label>
              <textarea
                value={gradualReleaseValues[stage.key]}
                onChange={(e) => gradualReleaseSetters[stage.key](e.target.value)}
                rows={3}
                className={cn(textareaClass, "mt-1.5")}
              />
            </div>
          ))}
        </Section>

        {/* QSSSA */}
        <Section title="QSSSA">
          {QSSSA_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="font-mono text-xs uppercase tracking-wide text-slate">
                {field.label}
              </label>
              <textarea
                value={qsssaValues[field.key]}
                onChange={(e) => qsssaSetters[field.key](e.target.value)}
                rows={2}
                className={cn(textareaClass, "mt-1.5")}
              />
            </div>
          ))}
        </Section>

        {/* Homework */}
        <Section title="Homework" meta={`${homework.filter((h) => h.trim()).length} / 5`}>
          {homework.map((question, index) => (
            <div key={index}>
              <label className="font-mono text-xs uppercase tracking-wide text-slate">
                Q{index + 1}
              </label>
              <textarea
                value={question}
                onChange={(e) =>
                  setHomework((prev) => prev.map((q, i) => (i === index ? e.target.value : q)))
                }
                rows={2}
                className={cn(textareaClass, "mt-1.5")}
              />
            </div>
          ))}
        </Section>

        {/* TEKS */}
        <Section title="TEKS Covered" meta={`${teksIds.length} selected`}>
          <TeksSuggestionPanel
            contentType="lesson"
            contentId={lesson.id}
            currentTeksIds={teksIds}
            allTeks={allTeks}
            onApprove={(id) => setTeksIds((prev) => (prev.includes(id) ? prev : [...prev, id]))}
          />
          {allTeks.length === 0 ? (
            <p className="py-4 text-sm text-slate">No TEKS codes in the reference table yet.</p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {allTeks.map((teks) => (
                <label
                  key={teks.id}
                  className="ledger-row flex cursor-pointer items-start gap-3 py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={teksIds.includes(teks.id)}
                    onChange={() => toggleTeks(teks.id)}
                    className="mt-1 shrink-0"
                  />
                  <span className="text-sm text-ink">
                    <span className="font-mono text-xs text-slate">{teks.code}</span>{" "}
                    {teks.description}
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

      <div className="mt-10 h-[36rem] lg:sticky lg:top-6 lg:mt-0 lg:h-[calc(100vh-3rem)] lg:w-96 lg:shrink-0">
        <LessonAssistantPanel getSnapshot={buildSnapshot} onApply={applyAssistantEdit} />
      </div>
    </div>
  );
}
