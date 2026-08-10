import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import {
  DAY_LABELS,
  LESSON_CLASS_PERIOD_MINUTES,
  SEGMENT_LABELS,
} from "@/lib/curriculum/constants";
import type { LessonDetail as LessonDetailType } from "@/types/curriculum";

const GRADUAL_RELEASE_STAGES: {
  key: "i_do" | "we_do" | "you_do_together" | "you_do";
  label: string;
}[] = [
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

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
        {meta && <span className="font-mono text-xs text-slate">{meta}</span>}
      </div>
      <div className="mt-3 border-t border-rose-gold/40">{children}</div>
    </section>
  );
}

export function LessonDetailView({ lesson }: { lesson: LessonDetailType }) {
  const totalMinutes = lesson.segments.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-slate">
            {DAY_LABELS[lesson.day_number] ?? `Day ${lesson.day_number}`}
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink">{lesson.title}</h1>
        </div>
        {lesson.status === "published" && (
          <div className="flex items-center gap-2 pt-1">
            <StatusStamp label="Published" />
            <span className="font-mono text-xs uppercase tracking-wide text-slate">
              Published
            </span>
          </div>
        )}
      </div>

      {/* Bell-to-bell schedule */}
      <Section
        title="Class Period"
        meta={`${totalMinutes} / ${LESSON_CLASS_PERIOD_MINUTES} min`}
      >
        {lesson.segments.length === 0 ? (
          <p className="py-4 text-sm text-slate">No schedule yet.</p>
        ) : (
          lesson.segments.map((segment) => (
            <LedgerRow key={segment.id} meta={`${segment.duration_minutes} min`}>
              <p className="font-medium text-ink">
                <span className="font-mono text-xs uppercase tracking-wide text-rose-gold">
                  {SEGMENT_LABELS[segment.segment_key]}
                </span>
                {" — "}
                {segment.title}
              </p>
              {segment.description && (
                <p className="mt-0.5 text-sm text-slate">{segment.description}</p>
              )}
            </LedgerRow>
          ))
        )}
      </Section>

      {/* Gradual release of responsibility */}
      <Section title="Gradual Release">
        {GRADUAL_RELEASE_STAGES.map((stage) => (
          <LedgerRow key={stage.key} meta={stage.label}>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {lesson[stage.key] || <span className="text-slate">Not written yet.</span>}
            </p>
          </LedgerRow>
        ))}
      </Section>

      {/* QSSSA discussion framework */}
      <Section title="QSSSA">
        {QSSSA_FIELDS.map((field) => (
          <LedgerRow key={field.key} meta={field.label}>
            <p className="whitespace-pre-wrap text-sm text-ink">
              {lesson[field.key] || <span className="text-slate">Not written yet.</span>}
            </p>
          </LedgerRow>
        ))}
      </Section>

      {/* Homework */}
      <Section title="Homework">
        {lesson.homework.length === 0 ? (
          <p className="py-4 text-sm text-slate">No homework questions yet.</p>
        ) : (
          lesson.homework.map((question, index) => (
            <LedgerRow key={index} meta={`Q${index + 1}`}>
              <p className="text-sm text-ink">{question}</p>
            </LedgerRow>
          ))
        )}
      </Section>

      {/* TEKS standards covered */}
      <Section title="TEKS Covered">
        {lesson.teks.length === 0 ? (
          <p className="py-4 text-sm text-slate">No TEKS codes tagged yet.</p>
        ) : (
          lesson.teks.map((teks) => (
            <LedgerRow key={teks.id} meta={teks.subject}>
              <p className="font-mono text-sm text-ink">{teks.code}</p>
              <p className="mt-0.5 text-sm text-slate">{teks.description}</p>
            </LedgerRow>
          ))
        )}
      </Section>
    </div>
  );
}
