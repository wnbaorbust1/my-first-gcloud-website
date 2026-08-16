import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/curriculum/queries";
import { SimulationScenarioGenerateForm } from "@/components/admin/simulation-scenario-generate-form";

export default async function GenerateSimulationScenarioPage({
  params,
}: {
  params: { courseSlug: string };
}) {
  const course = await getCourseBySlug(params.courseSlug);
  if (!course) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
        Admin · {course.display_name}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Generate a scenario<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 text-sm text-slate">
        Claude drafts a complete financial life simulation — starting income, fixed expenses, and
        a deck of life-event rounds with trade-off decisions. It lands as a draft you can publish
        (or delete and regenerate) from the scenario list.
      </p>

      <SimulationScenarioGenerateForm courseId={course.id} />
    </div>
  );
}
