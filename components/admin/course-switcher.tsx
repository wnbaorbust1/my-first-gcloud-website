"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Course } from "@/types/curriculum";

/** Course filter/switcher — jumps to the same admin section for a different course. */
export function CourseSwitcher({
  basePath,
  courses,
  currentSlug,
}: {
  basePath: string;
  courses: Course[];
  currentSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(slug: string) {
    const query = searchParams.toString();
    router.push(query ? `${basePath}/${slug}?${query}` : `${basePath}/${slug}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="course-filter" className="font-mono text-xs uppercase tracking-wide text-slate">
        Course
      </label>
      <select
        id="course-filter"
        value={currentSlug}
        onChange={(e) => handleChange(e.target.value)}
        className="border border-slate/40 bg-cream px-2 py-1.5 text-sm text-ink"
      >
        {courses.map((course) => (
          <option key={course.id} value={course.slug}>
            {course.display_name}
          </option>
        ))}
      </select>
    </div>
  );
}
