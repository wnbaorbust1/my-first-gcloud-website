import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/shared/print-button";
import { getScorecardData } from "@/lib/blueprint/scorecard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Blueprint Scorecard — My Blueprint" };

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-0.5 text-sm text-navy-900">{value ?? "—"}</p>
    </div>
  );
}

function ScoreBlock({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-navy-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-navy-900">{value !== null ? `${value}%` : "—"}</p>
    </div>
  );
}

export default async function ScorecardPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) notFound();

  const data = await getScorecardData(membership.businessId);

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href="/my-blueprint"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to My Blueprint
        </Link>
        <PrintButton />
      </div>

      <article className="print-page rounded-2xl border border-navy-100 bg-surface p-10 shadow-sm shadow-navy-900/5 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="mb-6 border-b border-navy-100 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">
            Blueprint Scorecard
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-navy-900">
            {data.businessName}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {data.date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </header>

        {!data.hasAssessment ? (
          <p className="text-sm text-foreground-muted">
            This business hasn&apos;t completed a Blueprint Assessment yet — scores will appear here
            once it has.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreBlock label="Passion" value={data.passionScore} />
              <ScoreBlock label="Power" value={data.powerScore} />
              <ScoreBlock label="Legacy" value={data.legacyScore} />
              <ScoreBlock label="Business Health" value={data.healthScorePercent} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Strength"
                value={data.strength ? `${data.strength.category} (${data.strength.scorePercent}%)` : null}
              />
              <Field
                label="Priority Gap"
                value={
                  data.priorityGap
                    ? `${data.priorityGap.category} (${data.priorityGap.scorePercent}%)`
                    : null
                }
              />
              <Field label="Current Goal" value={data.currentGoal} />
              <Field label="Next Best Action" value={data.nextBestAction} />
              <Field label="Recommended Session" value={data.recommendedSession} />
            </div>
          </>
        )}
      </article>
    </div>
  );
}
