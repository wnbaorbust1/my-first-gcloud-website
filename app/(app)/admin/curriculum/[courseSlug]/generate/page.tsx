import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/curriculum/queries";
import { getCourseOutlineForAdmin } from "@/lib/admin/curriculum-queries";
import { LessonGenerateForm } from "@/components/admin/lesson-generate-form";

export default async function GenerateLessonPage({
  params,
  searchParams,
}: {
  params: { courseSlug: string };
  searchParams: { unitId?: string; weekNumber?: string; day?: string; topic?: string; notes?: string };
}) {
  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  const units = await getCourseOutlineForAdmin(course.id);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
        Admin · {course.display_name}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Generate a lesson<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 text-sm text-slate">
        Claude drafts a complete lesson from a topic — bell ringer through exit ticket, gradual
        release, QSSSA, five homework questions, and suggested TEKS. It lands as a draft you can
        edit before publishing.
      </p>

      {units.length === 0 ? (
        <p className="mt-8 text-sm text-slate">
          This course has no units yet — add one before generating lessons.
        </p>
      ) : (
        <LessonGenerateForm
          courseId={course.id}
          units={units.map((u) => ({
            id: u.id,
            unitNumber: u.unit_number,
            title: u.title,
            weeks: u.weeks.map((w) => ({ id: w.id, weekNumber: w.week_number, title: w.title })),
          }))}
          prefill={{
            unitId: searchParams.unitId,
            weekNumber: searchParams.weekNumber ? Number(searchParams.weekNumber) : undefined,
            dayNumber: searchParams.day ? Number(searchParams.day) : undefined,
            topic: searchParams.topic,
            notes: searchParams.notes,
          }}
        />
      )}
    </div>
  );
}
