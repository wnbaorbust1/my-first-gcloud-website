import type { Metadata } from "next";
import Link from "next/link";
import { getReflectionsForTeacher } from "@/lib/teacher/reflection-queries";
import { ReflectionFavoriteToggle } from "@/components/curriculum/reflection-favorite-toggle";
import { LedgerRow } from "@/components/ui/ledger-row";
import { DAY_LABELS, PACING_ACCURACY_LABELS, ENGAGEMENT_LEVEL_LABELS } from "@/lib/curriculum/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reflections — Legacy Command Center" };

export default async function ReflectionsPage({
  searchParams,
}: {
  searchParams: { all?: string };
}) {
  const showAll = searchParams.all === "1";
  const reflections = await getReflectionsForTeacher(!showAll);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Reflections</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold text-ink">
          {showAll ? "All reflections" : "Favorites"}
          <span className="text-rose-gold">.</span>
        </h1>
        <Link
          href={showAll ? "/reflections" : "/reflections?all=1"}
          className="border border-ink px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          {showAll ? "Favorites only" : "Show all"}
        </Link>
      </div>
      <p className="mt-2 max-w-xl text-sm text-slate">
        Post-lesson notes, starred so you can find the ones worth revisiting fast.
      </p>

      {reflections.length === 0 ? (
        <p className="mt-8 text-sm text-slate">
          {showAll
            ? "No reflections yet — write one from any lesson's detail page."
            : "No favorites yet — star a reflection from any lesson's detail page."}
        </p>
      ) : (
        <div className="mt-8 border-t border-rose-gold/40">
          {reflections.map((reflection) => {
            const lessonHref = `/curriculum/${reflection.lesson.week.course.slug}/${reflection.lesson.week.week_number}/${reflection.lesson.day_number}`;
            return (
              <LedgerRow
                key={reflection.id}
                stamp={
                  <ReflectionFavoriteToggle
                    reflectionId={reflection.id}
                    isFavorite={reflection.is_favorite}
                  />
                }
                meta={
                  <span className={cn(reflection.reteach_flag && "text-rose-gold")}>
                    {reflection.reteach_flag ? "Reteach flagged" : ""}
                  </span>
                }
              >
                <Link href={lessonHref} className="font-medium text-ink hover:underline">
                  {reflection.lesson.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate">
                  {reflection.lesson.week.course.display_name} · Week{" "}
                  {reflection.lesson.week.week_number} ·{" "}
                  {DAY_LABELS[reflection.lesson.day_number] ?? `Day ${reflection.lesson.day_number}`}
                  {reflection.pacing_accuracy && ` · Pacing: ${PACING_ACCURACY_LABELS[reflection.pacing_accuracy]}`}
                  {reflection.engagement_level && ` · Engagement: ${ENGAGEMENT_LEVEL_LABELS[reflection.engagement_level]}`}
                </p>
                {reflection.what_worked && (
                  <p className="mt-1 text-sm text-ink">{reflection.what_worked}</p>
                )}
              </LedgerRow>
            );
          })}
        </div>
      )}
    </div>
  );
}
