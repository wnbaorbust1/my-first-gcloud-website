import Link from "next/link";
import type { Course } from "@/types/curriculum";

/**
 * A course tile — one of the few things in this app that's a genuine
 * "card" per the design system (a discrete object, not a list item).
 * Everything inside a course (units, weeks, lessons) uses the Ledger Line
 * motif instead.
 */
export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/curriculum/${course.slug}`}
      className="group block border border-slate/30 bg-cream p-5 transition-colors hover:border-rose-gold"
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: course.accent_color }}
      />
      <h3 className="mt-3 font-display text-2xl font-semibold text-ink">
        {course.display_name}
      </h3>
      <p className="mt-1 font-mono text-xs uppercase tracking-wide text-slate">
        {course.week_count}-week course
      </p>
    </Link>
  );
}
