import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/shared/print-button";
import {
  WorksheetChecklist,
  WorksheetChecklistItem,
  WorksheetHeader,
  WorksheetPage,
  WorksheetPanel,
  WorksheetRatingRow,
  WorksheetStat,
} from "@/components/blueprint/worksheet";
import { getScorecardData } from "@/lib/blueprint/scorecard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Blueprint Scorecard — My Blueprint" };

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

      <div className="print-page print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <WorksheetPage>
          <WorksheetHeader
            name={data.businessName}
            subtitle={`Blueprint Scorecard · ${data.date.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`}
          />

          {!data.hasAssessment ? (
            <WorksheetPanel number={1} title="My Scores" icon="📊">
              <p className="text-sm sm:text-base">
                This business hasn&apos;t completed a Blueprint Assessment yet — scores will
                appear here once it has.
              </p>
            </WorksheetPanel>
          ) : (
            <>
              <WorksheetPanel number={1} title="My Scores" icon="📊">
                <div className="flex flex-col divide-y divide-navy-100">
                  {data.passionScore !== null && (
                    <WorksheetRatingRow label="💗 Passion" scorePercent={data.passionScore} />
                  )}
                  {data.powerScore !== null && (
                    <WorksheetRatingRow label="⚡ Power" scorePercent={data.powerScore} />
                  )}
                  {data.legacyScore !== null && (
                    <WorksheetRatingRow label="👑 Legacy" scorePercent={data.legacyScore} />
                  )}
                </div>
                {data.healthScorePercent !== null && (
                  <div className="mt-4 flex justify-center">
                    <WorksheetStat
                      label="Business Health"
                      value={`${data.healthScorePercent}%`}
                    />
                  </div>
                )}
              </WorksheetPanel>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <WorksheetPanel number={2} title="My Strength" icon="💪">
                  <WorksheetChecklist>
                    <WorksheetChecklistItem checked>
                      {data.strength
                        ? `${data.strength.category} (${data.strength.scorePercent}%)`
                        : "Complete an assessment to see this"}
                    </WorksheetChecklistItem>
                  </WorksheetChecklist>
                </WorksheetPanel>

                <WorksheetPanel number={3} title="Priority Gap" icon="🗺️">
                  <WorksheetChecklist>
                    <WorksheetChecklistItem checked={false}>
                      {data.priorityGap
                        ? `${data.priorityGap.category} (${data.priorityGap.scorePercent}%)`
                        : "Complete an assessment to see this"}
                    </WorksheetChecklistItem>
                  </WorksheetChecklist>
                </WorksheetPanel>
              </div>

              <WorksheetPanel number={4} title="My Blueprint" icon="📘">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-gold-700">
                      Current Goal
                    </dt>
                    <dd className="mt-0.5">{data.currentGoal ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-gold-700">
                      Next Best Action
                    </dt>
                    <dd className="mt-0.5">{data.nextBestAction ?? "—"}</dd>
                  </div>
                </dl>
              </WorksheetPanel>

              <WorksheetPanel
                number={5}
                title="Recommended For Me"
                icon="🌟"
                className="border-gold-300 bg-gold-50"
              >
                <p className="text-lg font-bold text-legacy-700">
                  {data.recommendedSession ?? "Complete an assessment to see this"}
                </p>
              </WorksheetPanel>
            </>
          )}
        </WorksheetPage>
      </div>
    </div>
  );
}
