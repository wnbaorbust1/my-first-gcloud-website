import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllCourses, getCourseBySlug } from "@/lib/curriculum/queries";
import { getUnitsWithAssignments } from "@/lib/admin/assignment-queries";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import { AssignmentTypeFilter } from "@/components/admin/assignment-type-filter";
import { CourseSwitcher } from "@/components/admin/course-switcher";
import { ASSIGNMENT_TYPE_LABELS, ASSIGNMENT_TYPES } from "@/lib/curriculum/constants";
import type { AssignmentType } from "@/types/supabase";

function isAssignmentType(value: string): value is AssignmentType {
  return (ASSIGNMENT_TYPES as readonly string[]).includes(value);
}

export default async function AdminAssignmentsCoursePage({
  params,
  searchParams,
}: {
  params: { courseSlug: string };
  searchParams: { type?: string };
}) {
  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  const typeFilter = searchParams.type && isAssignmentType(searchParams.type) ? searchParams.type : undefined;

  const [units, allCourses] = await Promise.all([
    getUnitsWithAssignments(course.id, typeFilter),
    getAllCourses(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
        Admin · {course.display_name}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold text-ink">
          Assignments<span className="text-rose-gold">.</span>
        </h1>
        <Link
          href={`/admin/assignments/${course.slug}/generate`}
          className="border border-ink px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          + Generate assignment
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <CourseSwitcher basePath="/admin/assignments" courses={allCourses} currentSlug={course.slug} />
        <AssignmentTypeFilter />
      </div>

      {units.length === 0 && (
        <p className="mt-8 text-sm text-slate">No units yet for this course.</p>
      )}

      {units.map((unit) => (
        <section key={unit.id} className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Unit {unit.unit_number}: {unit.title}
          </h2>

          <div className="mt-3 border-t border-rose-gold/40">
            {unit.assignments.length === 0 ? (
              <p className="py-4 text-sm text-slate">
                {typeFilter
                  ? `No ${ASSIGNMENT_TYPE_LABELS[typeFilter]} assignments in this unit.`
                  : "No assignments in this unit yet."}
              </p>
            ) : (
              unit.assignments.map((assignment) => (
                <LedgerRow
                  key={assignment.id}
                  stamp={
                    assignment.status === "published" ? <StatusStamp label="Published" /> : undefined
                  }
                  meta={assignment.status === "draft" ? "Draft" : "Published"}
                >
                  <Link
                    href={`/admin/assignments/${course.slug}/${assignment.id}/edit`}
                    className="hover:underline"
                  >
                    <span className="font-mono text-xs uppercase tracking-wide text-rose-gold">
                      {ASSIGNMENT_TYPE_LABELS[assignment.assignment_type]}
                    </span>{" "}
                    — {assignment.title}
                  </Link>
                </LedgerRow>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
