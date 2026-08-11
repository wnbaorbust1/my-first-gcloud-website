import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/curriculum/queries";
import { getUnitsForCourse } from "@/lib/admin/assignment-queries";
import { AssessmentGenerateForm } from "@/components/admin/assessment-generate-form";

export default async function GenerateAssessmentPage({
  params,
}: {
  params: { courseSlug: string };
}) {
  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  const units = await getUnitsForCourse(course.id);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
        Admin · {course.display_name}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Generate an assessment<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 text-sm text-slate">
        Claude drafts a complete assessment from a topic — a mix of question types and a full
        answer key. It lands as a draft you can edit before publishing.
      </p>

      {units.length === 0 ? (
        <p className="mt-8 text-sm text-slate">
          This course has no units yet — add one before generating assessments.
        </p>
      ) : (
        <AssessmentGenerateForm
          units={units.map((u) => ({ id: u.id, unitNumber: u.unit_number, title: u.title }))}
        />
      )}
    </div>
  );
}
