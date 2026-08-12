import type { Metadata } from "next";
import Link from "next/link";
import { getClassesForTeacher } from "@/lib/teacher/roster-queries";
import { getAllCourses } from "@/lib/curriculum/queries";
import { LedgerRow } from "@/components/ui/ledger-row";

export const metadata: Metadata = { title: "Portfolios — Legacy Command Center" };

export default async function PortfolioIndexPage({
  searchParams,
}: {
  searchParams: { course?: string };
}) {
  const [classes, courses] = await Promise.all([getClassesForTeacher(), getAllCourses()]);

  const filtered = searchParams.course
    ? classes.filter((c) => c.course_id === searchParams.course)
    : classes;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Portfolios</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Your classes<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate">
        Student work, organized by class — open one to see its roster and featured showcase.
      </p>

      <form method="get" className="mt-6 flex items-center gap-2">
        <label htmlFor="course-filter" className="font-mono text-xs uppercase tracking-wide text-slate">
          Course
        </label>
        <select
          id="course-filter"
          name="course"
          defaultValue={searchParams.course ?? ""}
          className="border border-slate/40 bg-cream px-3 py-1.5 text-sm text-ink"
        >
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="border border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          Filter
        </button>
      </form>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-slate">
          No classes {searchParams.course ? "for that course" : "yet"} — create one from the
          Gradebook page first.
        </p>
      ) : (
        <div className="mt-8 border-t border-rose-gold/40">
          {filtered.map((c) => (
            <LedgerRow key={c.id} meta={c.course.display_name}>
              <Link href={`/portfolio/${c.id}`} className="hover:underline">
                {c.name}
              </Link>
            </LedgerRow>
          ))}
        </div>
      )}
    </div>
  );
}
