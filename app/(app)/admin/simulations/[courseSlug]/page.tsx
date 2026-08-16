import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllCourses, getCourseBySlug } from "@/lib/curriculum/queries";
import { getScenariosForCourse } from "@/lib/admin/simulation-queries";
import { CourseSwitcher } from "@/components/admin/course-switcher";
import { SimulationScenarioRow } from "@/components/admin/simulation-scenario-row";

export default async function AdminSimulationsCoursePage({
  params,
}: {
  params: { courseSlug: string };
}) {
  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  const [scenarios, allCourses] = await Promise.all([
    getScenariosForCourse(course.id),
    getAllCourses(),
  ]);

  const thisPagePath = `/admin/simulations/${course.slug}`;

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
        Admin · {course.display_name}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold text-ink">
          Simulation scenarios<span className="text-rose-gold">.</span>
        </h1>
        <Link
          href={`/admin/simulations/${course.slug}/generate`}
          className="border border-ink px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          + Generate scenario
        </Link>
      </div>

      <div className="mt-4">
        <CourseSwitcher basePath="/admin/simulations" courses={allCourses} currentSlug={course.slug} />
      </div>

      <div className="mt-8 border-t border-rose-gold/40">
        {scenarios.length === 0 ? (
          <p className="py-4 text-sm text-slate">No scenarios for this course yet.</p>
        ) : (
          scenarios.map((scenario) => (
            <SimulationScenarioRow key={scenario.id} scenario={scenario} revalidatePaths={[thisPagePath]} />
          ))
        )}
      </div>
    </div>
  );
}
