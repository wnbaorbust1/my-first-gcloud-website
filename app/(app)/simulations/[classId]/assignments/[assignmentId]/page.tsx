import { notFound } from "next/navigation";
import Link from "next/link";
import { getClassWithStudents } from "@/lib/teacher/roster-queries";
import { getAssignmentResults } from "@/lib/teacher/simulation-queries";
import { hasCourseAccess } from "@/lib/billing/access";
import { Paywall } from "@/components/billing/paywall";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";

export default async function SimulationResultsPage({
  params,
}: {
  params: { classId: string; assignmentId: string };
}) {
  const classDetail = await getClassWithStudents(params.classId);
  if (!classDetail) notFound();

  const backHref = `/simulations/${params.classId}`;

  const canAccess = await hasCourseAccess(classDetail.course.id);
  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href={backHref} className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
          ← {classDetail.name}
        </Link>
        <div className="mt-8">
          <Paywall
            courseName={classDetail.course.display_name}
            message="Subscribe to this course to view simulation results."
          />
        </div>
      </div>
    );
  }

  const results = await getAssignmentResults(params.assignmentId);
  if (!results) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={backHref} className="font-mono text-[11px] uppercase tracking-wide text-slate hover:text-ink">
        ← {results.className}
      </Link>
      <div className="mt-3">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
          {results.courseDisplayName} · Join code {results.joinCode}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
          {results.scenarioTitle}
          <span className="text-rose-gold">.</span>
        </h1>
      </div>

      <section className="mt-8 mb-16">
        {results.results.length === 0 ? (
          <p className="mt-4 text-sm text-slate">No students on this class&apos;s roster yet.</p>
        ) : (
          <div className="mt-3 border-t border-rose-gold/40">
            {results.results.map((r) => (
              <LedgerRow
                key={r.studentId}
                stamp={r.completedAt ? <StatusStamp label="Done" /> : undefined}
                meta={
                  r.endingNetWorth !== null
                    ? `$${r.endingNetWorth.toLocaleString()} · ${r.roundsCompleted} rounds`
                    : "Not started"
                }
              >
                {r.studentName}
              </LedgerRow>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
