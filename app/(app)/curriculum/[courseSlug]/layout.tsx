import { notFound } from "next/navigation";
import { getCourseBySlug, getCourseUnitsWithWeeks } from "@/lib/curriculum/queries";
import { CurriculumSpine } from "@/components/curriculum/curriculum-spine";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { courseSlug: string };
}) {
  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  const units = await getCourseUnitsWithWeeks(course.id);

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start">
      <div className="border-b border-rose-gold/40 pb-6 md:w-64 md:shrink-0 md:border-b-0 md:border-r md:pb-0 md:pr-6">
        <CurriculumSpine courseSlug={course.slug} units={units} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs uppercase tracking-wide text-slate">
          {course.display_name}
        </p>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
