import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/curriculum/queries";
import { getWeekByNumber, getLessonForEdit, getAllTeks } from "@/lib/admin/curriculum-queries";
import { LessonEditorForm } from "@/components/admin/lesson-editor-form";

export default async function EditLessonPage({
  params,
}: {
  params: { courseSlug: string; weekNumber: string; dayNumber: string };
}) {
  const weekNumber = Number(params.weekNumber);
  const dayNumber = Number(params.dayNumber);
  if (!Number.isInteger(weekNumber) || !Number.isInteger(dayNumber)) notFound();

  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  const week = await getWeekByNumber(course.id, weekNumber);
  if (!week) notFound();

  const [lesson, allTeks] = await Promise.all([
    getLessonForEdit(week.id, dayNumber),
    getAllTeks(),
  ]);
  if (!lesson) notFound();

  return (
    <LessonEditorForm
      lesson={lesson}
      courseSlug={course.slug}
      courseDisplayName={course.display_name}
      weekNumber={weekNumber}
      dayNumber={dayNumber}
      allTeks={allTeks}
    />
  );
}
