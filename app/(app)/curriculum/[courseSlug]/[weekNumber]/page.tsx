import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseBySlug, getWeekWithLessons } from "@/lib/curriculum/queries";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import { DAY_LABELS } from "@/lib/curriculum/constants";

export default async function WeekPage({
  params,
}: {
  params: { courseSlug: string; weekNumber: string };
}) {
  const weekNumber = Number(params.weekNumber);
  if (!Number.isInteger(weekNumber)) notFound();

  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  const week = await getWeekWithLessons(course.id, weekNumber);
  if (!week) notFound();

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wide text-slate">
        Week {week.week_number}
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{week.title}</h1>

      {week.lessons.length === 0 ? (
        <p className="mt-6 text-sm text-slate">
          No lessons published for this week yet.
        </p>
      ) : (
        <div className="mt-6 border-t border-rose-gold/40">
          {week.lessons.map((lesson) => (
            <LedgerRow
              key={lesson.id}
              stamp={
                lesson.status === "published" ? <StatusStamp label="Published" /> : null
              }
              meta={DAY_LABELS[lesson.day_number]}
            >
              <Link
                href={`/curriculum/${course.slug}/${week.week_number}/${lesson.day_number}`}
                className="hover:underline"
              >
                {lesson.title}
              </Link>
            </LedgerRow>
          ))}
        </div>
      )}
    </div>
  );
}
