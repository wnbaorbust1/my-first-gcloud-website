import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseBySlug } from "@/lib/curriculum/queries";
import { getCourseOutlineForAdmin } from "@/lib/admin/curriculum-queries";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import { DAY_LABELS } from "@/lib/curriculum/constants";
import { GapSuggestionsPanel } from "@/components/admin/gap-suggestions-panel";

const DAYS = [1, 2, 3, 4, 5];

export default async function AdminCourseOutlinePage({
  params,
}: {
  params: { courseSlug: string };
}) {
  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  const units = await getCourseOutlineForAdmin(course.id);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
        Admin · {course.display_name}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Curriculum outline<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate">
        Every unit, week, and lesson slot — including drafts and empty gaps. Generate a lesson
        with AI or open an existing one to edit.
      </p>

      {units.length === 0 && (
        <p className="mt-8 text-sm text-slate">No units yet for this course.</p>
      )}

      {units.map((unit) => {
        const emptySlots = unit.weeks.flatMap((week) => {
          const filledDays = new Set(week.lessons.map((l) => l.day_number));
          return DAYS.filter((day) => !filledDays.has(day));
        });

        return (
          <section key={unit.id} className="mt-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">
                  Unit {unit.unit_number}: {unit.title}
                </h2>
                {unit.teks_focus_summary && (
                  <p className="mt-0.5 text-xs text-slate">{unit.teks_focus_summary}</p>
                )}
              </div>
              {emptySlots.length > 0 && (
                <GapSuggestionsPanel
                  unitId={unit.id}
                  courseSlug={course.slug}
                  emptySlotCount={emptySlots.length}
                />
              )}
            </div>

            <div className="mt-3 border-t border-rose-gold/40">
              {unit.weeks.length === 0 ? (
                <p className="py-4 text-sm text-slate">No weeks in this unit yet.</p>
              ) : (
                unit.weeks.map((week) => (
                  <div key={week.id} className="py-2">
                    <p className="mt-2 font-mono text-xs uppercase tracking-wide text-slate">
                      Week {week.week_number}: {week.title}
                    </p>
                    {DAYS.map((day) => {
                      const lesson = week.lessons.find((l) => l.day_number === day);
                      return (
                        <LedgerRow
                          key={day}
                          stamp={
                            lesson?.status === "published" ? (
                              <StatusStamp label="Published" />
                            ) : undefined
                          }
                          meta={lesson ? (lesson.status === "draft" ? "Draft" : "Published") : "Empty"}
                        >
                          {lesson ? (
                            <Link
                              href={`/admin/curriculum/${course.slug}/${week.week_number}/${day}/edit`}
                              className="hover:underline"
                            >
                              <span className="font-mono text-xs uppercase tracking-wide text-rose-gold">
                                {DAY_LABELS[day]}
                              </span>{" "}
                              — {lesson.title}
                            </Link>
                          ) : (
                            <Link
                              href={`/admin/curriculum/${course.slug}/generate?unitId=${unit.id}&weekNumber=${week.week_number}&day=${day}`}
                              className="text-slate hover:underline"
                            >
                              <span className="font-mono text-xs uppercase tracking-wide text-slate">
                                {DAY_LABELS[day]}
                              </span>{" "}
                              — Generate lesson
                            </Link>
                          )}
                        </LedgerRow>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
