import { notFound } from "next/navigation";
import { getCourseBySlug, getLessonDetail } from "@/lib/curriculum/queries";
import { LessonDetailView } from "@/components/curriculum/lesson-detail";

export default async function LessonPage({
  params,
}: {
  params: { courseSlug: string; weekNumber: string; dayNumber: string };
}) {
  const weekNumber = Number(params.weekNumber);
  const dayNumber = Number(params.dayNumber);
  if (!Number.isInteger(weekNumber) || !Number.isInteger(dayNumber)) notFound();

  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  const lesson = await getLessonDetail(course.id, weekNumber, dayNumber);
  if (!lesson) notFound();

  return <LessonDetailView lesson={lesson} />;
}
