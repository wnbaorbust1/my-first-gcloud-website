import type { Metadata } from "next";
import Link from "next/link";
import { getAllCourses } from "@/lib/curriculum/queries";

export const metadata: Metadata = { title: "Admin Assessments — Legacy Command Center" };

export default async function AdminAssessmentsPage() {
  const courses = await getAllCourses();

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Admin</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Choose a course to author assessments<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate">
        Assessments grouped by unit — including drafts, retakes, and modified versions.
      </p>

      {courses.length === 0 ? (
        <p className="mt-8 text-sm text-slate">No courses found.</p>
      ) : (
        <div className="mt-8 border-t border-rose-gold/40">
          {courses.map((course) => (
            <div key={course.id} className="ledger-row">
              <Link
                href={`/admin/assessments/${course.slug}`}
                className="flex items-center justify-between gap-3 px-1 py-2.5 text-sm text-ink transition-colors hover:bg-rose-gold/10"
              >
                <span className="font-medium">{course.display_name}</span>
                <span className="font-mono text-xs uppercase tracking-wide text-slate">
                  Open assessments →
                </span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
