import { notFound } from "next/navigation";
import { getCourseBySlug, getLessonDetail } from "@/lib/curriculum/queries";
import { getReflectionForLesson } from "@/lib/teacher/reflection-queries";
import { getPrepItemsForLesson } from "@/lib/teacher/prep-queries";
import { hasCourseAccess } from "@/lib/billing/access";
import { Paywall } from "@/components/billing/paywall";
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

  // Checked separately from the RLS-gated lesson fetch below so a blocked
  // teacher sees a paywall, not an indistinguishable-from-real 404 — RLS
  // (lessons_select, see the lessons migration) already returns null for
  // both "doesn't exist" and "exists but not subscribed"; this is what
  // tells the two apart.
  const canAccess = await hasCourseAccess(course.id);
  if (!canAccess) {
    return <Paywall courseName={course.display_name} />;
  }

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
