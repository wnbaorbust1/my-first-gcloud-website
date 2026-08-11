import { notFound } from "next/navigation";
import Link from "next/link";
import { getMasteryDashboardData } from "@/lib/teacher/mastery-queries";
import { getClassWithStudents } from "@/lib/teacher/roster-queries";
import { getPublishedAssignmentsForCourse } from "@/lib/curriculum/queries";
import { RosterSection } from "@/components/teks/roster-section";
import { GradeEntrySection } from "@/components/teks/grade-entry-section";
import { MasteryGrid } from "@/components/teks/mastery-grid";
import { MasteryChart } from "@/components/teks/mastery-chart";
import { StrugglingTeksPanel } from "@/components/teks/struggling-teks-panel";

export default async function ClassMasteryPage({ params }: { params: { classId: string } }) {
  const classDetail = await getClassWithStudents(params.classId);
  if (!classDetail) notFound();

  const [dashboard, assignments] = await Promise.all([
    getMasteryDashboardData(params.classId),
    getPublishedAssignmentsForCourse(classDetail.course.id),
  ]);
  if (!dashboard) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/teks-mastery" className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
        ← All classes
      </Link>
      <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-slate">
        {dashboard.courseDisplayName}
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        {dashboard.className}
        <span className="text-rose-gold">.</span>
      </h1>

      <RosterSection classId={params.classId} students={dashboard.students} />

      <GradeEntrySection
        classId={params.classId}
        assignments={assignments}
        students={dashboard.students}
      />

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Mastery by TEKS<span className="text-rose-gold">.</span>
          </h2>
          <span className="font-mono text-xs text-slate">% of class mastered</span>
        </div>
        <MasteryChart
          teksCodes={dashboard.teksCodes}
          countsByCode={dashboard.countsByCode}
          studentCount={dashboard.students.length}
        />
      </section>

      <StrugglingTeksPanel strugglingCodes={dashboard.strugglingCodes} />

      <section className="mt-10 mb-16">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">Mastery Grid</h2>
          <span className="font-mono text-xs text-slate">{dashboard.teksCodes.length} TEKS codes</span>
        </div>
        <p className="mt-1 text-sm text-slate">
          Set a student&apos;s status directly, or apply a suggestion above after grading.
        </p>
        <MasteryGrid
          classId={params.classId}
          teksCodes={dashboard.teksCodes}
          students={dashboard.students}
          statusByStudentAndCode={dashboard.statusByStudentAndCode}
        />
      </section>
    </div>
  );
}
