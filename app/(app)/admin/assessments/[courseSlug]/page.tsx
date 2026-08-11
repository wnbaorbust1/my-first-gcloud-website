import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllCourses, getCourseBySlug } from "@/lib/curriculum/queries";
import { getUnitsWithAssessments } from "@/lib/admin/assessment-queries";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import { CourseSwitcher } from "@/components/admin/course-switcher";
import { ASSESSMENT_VARIANT_LABELS } from "@/lib/curriculum/constants";

export default async function AdminAssessmentsCoursePage({
  params,
}: {
  params: { courseSlug: string };
}) {
  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  const [units, allCourses] = await Promise.all([
    getUnitsWithAssessments(course.id),
    getAllCourses(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
        Admin · {course.display_name}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold text-ink">
          Assessments<span className="text-rose-gold">.</span>
        </h1>
        <Link
          href={`/admin/assessments/${course.slug}/generate`}
          className="border border-ink px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          + Generate assessment
        </Link>
      </div>

      <div className="mt-4">
        <CourseSwitcher basePath="/admin/assessments" courses={allCourses} currentSlug={course.slug} />
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
            {unit.assessments.length === 0 ? (
              <p className="py-4 text-sm text-slate">No assessments in this unit yet.</p>
            ) : (
              unit.assessments.map((assessment) => (
                <LedgerRow
                  key={assessment.id}
                  stamp={
                    assessment.status === "published" ? <StatusStamp label="Published" /> : undefined
                  }
                  meta={assessment.status === "draft" ? "Draft" : "Published"}
                >
                  <Link
                    href={`/admin/assessments/${course.slug}/${assessment.id}/edit`}
                    className="hover:underline"
                  >
                    {assessment.variant_type !== "original" && (
                      <span className="font-mono text-xs uppercase tracking-wide text-rose-gold">
                        {ASSESSMENT_VARIANT_LABELS[assessment.variant_type]}
                      </span>
                    )}{" "}
                    {assessment.title}
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
