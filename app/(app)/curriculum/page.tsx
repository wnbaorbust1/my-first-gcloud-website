import type { Metadata } from "next";
import { getAllCourses } from "@/lib/curriculum/queries";
import { CourseCard } from "@/components/curriculum/course-card";

export const metadata: Metadata = { title: "Curriculum — Legacy Command Center" };

export default async function CurriculumPage() {
  const courses = await getAllCourses();

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Curriculum</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Choose a course<span className="text-rose-gold">.</span>
      </h1>

      {courses.length === 0 ? (
        <p className="mt-8 text-sm text-slate">No courses found.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
