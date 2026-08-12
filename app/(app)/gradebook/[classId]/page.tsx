import { notFound } from "next/navigation";
import Link from "next/link";
import { getGradebookData } from "@/lib/teacher/gradebook-queries";
import { getUnitsForCourse } from "@/lib/admin/assignment-queries";
import { getAllTeks } from "@/lib/admin/curriculum-queries";
import { hasCourseAccess } from "@/lib/billing/access";
import { Paywall } from "@/components/billing/paywall";
import { RosterSection } from "@/components/teks/roster-section";
import { GradeEntrySection } from "@/components/gradebook/grade-entry-section";
import { TrendSection } from "@/components/gradebook/trend-section";

export default async function ClassGradebookPage({ params }: { params: { classId: string } }) {
  const gradebook = await getGradebookData(params.classId);
  if (!gradebook) notFound();

  // Unlike lesson content, roster/grade data isn't RLS-gated by subscription
  // (classes_all is purely "this teacher's own row") — the app layer is the
  // only gate, so it has to check explicitly rather than lean on a null
  // query result the way the lesson detail page does.
  const canAccess = await hasCourseAccess(gradebook.courseId);
  if (!canAccess) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link
          href="/gradebook"
          className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink"
        >
          ← All classes
        </Link>
        <div className="mt-8">
          <Paywall
            courseName={gradebook.courseDisplayName}
            message="Subscribe to this course to unlock its gradebook."
          />
        </div>
      </div>
    );
  }

  const [units, allTeks] = await Promise.all([
    getUnitsForCourse(gradebook.courseId),
    getAllTeks(),
  ]);

  const teksOptions = allTeks
    .filter((t) => t.subject === gradebook.courseDisplayName)
    .map((t) => ({ code: t.code, description: t.description }));

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/gradebook" className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
        ← All classes
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
            {gradebook.courseDisplayName}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
            {gradebook.className}
            <span className="text-rose-gold">.</span>
          </h1>
        </div>
        <Link
          href={`/teks-mastery/${params.classId}`}
          className="border border-ink px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          Open TEKS Mastery →
        </Link>
      </div>

      <RosterSection classId={params.classId} students={gradebook.students} />

      <GradeEntrySection
        classId={params.classId}
        students={gradebook.students}
        items={gradebook.items}
        gradesByKey={gradebook.gradesByKey}
      />

      <div className="mb-16">
        <TrendSection
          classId={params.classId}
          students={gradebook.students}
          units={units.map((u) => ({ id: u.id, unitNumber: u.unit_number, title: u.title }))}
          teksOptions={teksOptions}
        />
      </div>
    </div>
  );
}
