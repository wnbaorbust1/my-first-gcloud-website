import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/shared/print-button";
import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import {
  WorksheetBanner,
  WorksheetChecklist,
  WorksheetChecklistItem,
  WorksheetGrid,
  WorksheetHeader,
  WorksheetPage,
  WorksheetPanel,
  WorksheetRatingRow,
  WorksheetStat,
} from "@/components/blueprint/worksheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { getScorecardData } from "@/lib/blueprint/scorecard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Blueprint Scorecard — My Blueprint" };

export default async function ScorecardPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: { select: { builderAccessEligible: true } } },
  });
  if (!membership) notFound();

  // FULL-TIER GATE (Vision Board & Blueprint Generator, audited
  // 2026-08-13): "downloads... remain locked until a qualifying $150
  // Blueprint Session is marked completed." Same builderAccessEligible +
  // Membership check as every other Builder surface — see the identical
  // gate on the Vision Board Profile page for the full reasoning.
  if (!membership.business.builderAccessEligible) {
    return (
      <EmptyState
        icon={Lock}
        title="Your Scorecard unlocks after your Blueprint Session"
        description="Complete your assessment and attend (and pay for) your recommended session to unlock your full Scorecard and downloads."
        action={
          <Button asChild size="sm">
            <Link href="/sessions">View Available Sessions</Link>
          </Button>
        }
      />
    );
  }
  const billingMembership = await getSyncedMembership(membership.businessId);
  const access = getBuilderAccessState(membership.business.builderAccessEligible, billingMembership);
  if (access.locked) return <MembershipLockedNotice />;

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
              <WorksheetGrid>
                <WorksheetPanel number={1} title="My Scores" icon="📊" span="full">
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
                    <div className="mt-3 flex justify-center">
                      <WorksheetStat
                        label="Business Health"
                        value={`${data.healthScorePercent}%`}
                      />
                    </div>
                  )}
                </WorksheetPanel>

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

                <WorksheetPanel number={4} title="My Blueprint" icon="📘" span="full">
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
                  span="full"
                  className="border-gold-300 bg-gold-50"
                >
                  <p className="text-lg font-bold text-legacy-700">
                    {data.recommendedSession ?? "Complete an assessment to see this"}
                  </p>
                </WorksheetPanel>
              </WorksheetGrid>

              <WorksheetBanner businessName={data.businessName} />
            </>
          )}
        </WorksheetPage>
      </div>
    </div>
  );
}
