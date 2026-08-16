import { notFound } from "next/navigation";
import Link from "next/link";
import { getClassWithStudents } from "@/lib/teacher/roster-queries";
import { getPublishedScenariosForCourse, getAssignmentsForClass } from "@/lib/teacher/simulation-queries";
import { hasCourseAccess } from "@/lib/billing/access";
import { Paywall } from "@/components/billing/paywall";
import { AssignScenarioForm } from "@/components/teacher/assign-scenario-form";
import { SimulationAssignmentRow } from "@/components/teacher/simulation-assignment-row";

export default async function ClassSimulationsPage({ params }: { params: { classId: string } }) {
  const classDetail = await getClassWithStudents(params.classId);
  if (!classDetail) notFound();

  const backHref = "/simulations";

  const canAccess = await hasCourseAccess(classDetail.course.id);
  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href={backHref} className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
          ← All classes
        </Link>
        <div className="mt-8">
          <Paywall
            courseName={classDetail.course.display_name}
            message="Subscribe to this course to assign financial life simulations."
          />
        </div>
      </div>
    );
  }

  const [scenarios, assignments] = await Promise.all([
    getPublishedScenariosForCourse(classDetail.course.id),
    getAssignmentsForClass(params.classId, classDetail.students.length),
  ]);

  const thisPagePath = `${backHref}/${params.classId}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={backHref} className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
        ← All classes
      </Link>
      <div className="mt-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
          {classDetail.course.display_name}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
          {classDetail.name}
          <span className="text-rose-gold">.</span>
        </h1>
      </div>

      {classDetail.students.length === 0 && (
        <p className="mt-4 text-sm text-slate">
          This class has no students yet — add them from the Gradebook or TEKS Mastery roster
          before assigning a scenario.
        </p>
      )}

      <section className="mt-6">
        <h2 className="font-display text-2xl font-semibold text-ink">Assign a scenario</h2>
        <AssignScenarioForm
          classId={params.classId}
          scenarios={scenarios.map((s) => ({ id: s.id, title: s.title }))}
          revalidatePaths={[thisPagePath]}
        />
      </section>

      <section className="mt-8 mb-16">
        <h2 className="font-display text-2xl font-semibold text-ink">Assigned</h2>
        {assignments.length === 0 ? (
          <p className="mt-4 text-sm text-slate">Nothing assigned yet.</p>
        ) : (
          <div className="mt-3 border-t border-rose-gold/40">
            {assignments.map((a) => (
              <SimulationAssignmentRow
                key={a.id}
                assignment={a}
                classId={params.classId}
                revalidatePaths={[thisPagePath]}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
