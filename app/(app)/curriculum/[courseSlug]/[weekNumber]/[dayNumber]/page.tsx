import { notFound } from "next/navigation";
import { getCourseBySlug, getLessonDetail } from "@/lib/curriculum/queries";
import { getReflectionForLesson } from "@/lib/teacher/reflection-queries";
import { getPrepItemsForLesson } from "@/lib/teacher/prep-queries";
import { LessonDetailView } from "@/components/curriculum/lesson-detail";
import { ReflectionSection } from "@/components/curriculum/reflection-section";
import { PrepItemsSection } from "@/components/curriculum/prep-items-section";

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

  const [reflection, prepItems] = await Promise.all([
    getReflectionForLesson(lesson.id),
    getPrepItemsForLesson(lesson.id),
  ]);

  const thisPagePath = `/curriculum/${params.courseSlug}/${weekNumber}/${dayNumber}`;

  return (
    <div>
      <LessonDetailView lesson={lesson} />
      <ReflectionSection
        lessonId={lesson.id}
        initialReflection={reflection}
        revalidatePaths={[thisPagePath]}
      />
      <PrepItemsSection lessonId={lesson.id} items={prepItems} revalidatePaths={[thisPagePath]} />
    </div>
  );
}
