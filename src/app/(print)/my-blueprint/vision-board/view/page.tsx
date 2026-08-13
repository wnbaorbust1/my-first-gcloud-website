import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import {
  WorksheetBanner,
  WorksheetChecklist,
  WorksheetChecklistItem,
  WorksheetChip,
  WorksheetGrid,
  WorksheetHeader,
  WorksheetPage,
  WorksheetPanel,
  WorksheetRatingRow,
  WorksheetStat,
} from "@/components/blueprint/worksheet";
import { PrintButton } from "@/components/shared/print-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { getVisionBoardExport } from "@/lib/blueprint/vision-board";
import { GOAL_TYPE_LABELS } from "@/lib/goals/meta";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My Vision Board — My Blueprint" };

/**
 * THE VISION BOARD (Vision Board & Blueprint Generator, audited
 * 2026-08-13): the actual deliverable the rendering constraint requires
 * — "a fixed, responsive HTML/CSS template... not an AI-generated
 * image." Every one of the twelve required sections below is rendered
 * here with the existing Worksheet system (same template already used
 * for Assessment Results and the Scorecard), sourced from
 * getVisionBoardExport() — the same real-data assembly the GPT export
 * uses, so this page and the exported JSON can never drift apart. A
 * section with nothing behind it yet renders an honest "not filled in"
 * line, never invented text.
 */
export default async function VisionBoardPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: { select: { id: true, name: true, builderAccessEligible: true } } },
  });
  if (!membership) notFound();

  if (!membership.business.builderAccessEligible) {
    return (
      <EmptyState
        icon={Lock}
        title="Your Vision Board unlocks after your Blueprint Session"
        description="Complete your assessment and attend (and pay for) your recommended session to unlock your full Vision Board."
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

  const data = await getVisionBoardExport(membership.businessId);

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
            name={data.myStory.businessName}
            eyebrow={[data.myStory.industry, data.myStory.businessStage].filter(Boolean).join(" · ") || undefined}
            subtitle="My Vision Board"
          />

          <WorksheetGrid>
            <WorksheetPanel number={1} title="My Story" icon="📖">
              {data.myStory.narrative ? (
                <p>{data.myStory.narrative}</p>
              ) : data.myStory.whatIOffer || data.myStory.description ? (
                <p>{data.myStory.description || data.myStory.whatIOffer}</p>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={2} title="My Why" icon="💗">
              {data.myWhy.narrative ? (
                <p>{data.myWhy.narrative}</p>
              ) : data.myWhy.myGoal ? (
                <p>{data.myWhy.myGoal}</p>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={3} title="My Blueprint" icon="📘">
              {data.myScores?.recommendedSession ? (
                <>
                  <p className="text-lg font-bold text-legacy-700">{data.myScores.recommendedSession}</p>
                  {data.myScores.recommendationReason && (
                    <p className="mt-2 text-sm">{data.myScores.recommendationReason}</p>
                  )}
                </>
              ) : (
                <p className="text-navy-400">Complete an assessment to see this.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={4} title="My Resources" icon="🧰">
              <p className="text-xs font-bold uppercase tracking-wide text-gold-700">Have</p>
              <p className="mb-2 whitespace-pre-line">
                {data.resources.have || <span className="text-navy-400">Not filled in yet.</span>}
              </p>
              <p className="text-xs font-bold uppercase tracking-wide text-gold-700">Need</p>
              <p className="whitespace-pre-line">
                {data.resources.need || <span className="text-navy-400">Not filled in yet.</span>}
              </p>
            </WorksheetPanel>

            <WorksheetPanel number={5} title="Action Plan" icon="🗺️">
              <p className="text-xs font-bold uppercase tracking-wide text-gold-700">This Week</p>
              <p className="mb-2 whitespace-pre-line">
                {data.actionPlan.thisWeek || <span className="text-navy-400">Not filled in yet.</span>}
              </p>
              <p className="text-xs font-bold uppercase tracking-wide text-gold-700">This Month</p>
              <p className="whitespace-pre-line">
                {data.actionPlan.thisMonth || <span className="text-navy-400">Not filled in yet.</span>}
              </p>
            </WorksheetPanel>

            <WorksheetPanel number={6} title="Legacy" icon="👑">
              {data.legacyImpact ? (
                <p>{data.legacyImpact}</p>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={7} title="Accountability" icon="🤝">
              {data.accountability.partnerName ? (
                <>
                  <p className="font-bold">{data.accountability.partnerName}</p>
                  {data.accountability.partnerContact && (
                    <p className="text-sm text-navy-600">{data.accountability.partnerContact}</p>
                  )}
                  {data.accountability.commitment && <p className="mt-2">{data.accountability.commitment}</p>}
                </>
              ) : (
                <p className="text-navy-400">No accountability partner set yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={8} title="My Big Goals" icon="🎯">
              {data.myBigGoals.length ? (
                <WorksheetChecklist>
                  {data.myBigGoals.map((g, i) => (
                    <WorksheetChecklistItem key={i} checked={(g.progressPercent ?? 0) >= 100}>
                      {g.title}
                      {g.progressPercent !== null && (
                        <span className="text-navy-500"> ({g.progressPercent}%)</span>
                      )}
                    </WorksheetChecklistItem>
                  ))}
                </WorksheetChecklist>
              ) : (
                <p className="text-navy-400">No active goals yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={9} title="Passion Assessment" icon="💗" span="full">
              {data.myScores ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col divide-y divide-navy-100">
                    {data.myScores.passionPercent !== null && (
                      <WorksheetRatingRow label="💗 Passion" scorePercent={data.myScores.passionPercent} />
                    )}
                    {data.myScores.powerPercent !== null && (
                      <WorksheetRatingRow label="⚡ Power" scorePercent={data.myScores.powerPercent} />
                    )}
                    {data.myScores.legacyPercent !== null && (
                      <WorksheetRatingRow label="👑 Legacy" scorePercent={data.myScores.legacyPercent} />
                    )}
                  </div>
                  <div>
                    {data.myScores.businessHealthPercent !== null && (
                      <div className="mb-3 flex justify-center sm:justify-start">
                        <WorksheetStat
                          label="Business Health"
                          value={`${data.myScores.businessHealthPercent}%`}
                        />
                      </div>
                    )}
                    {data.myScores.strengths.length > 0 && (
                      <p className="text-sm">
                        <span className="font-bold text-legacy-700">Strengths: </span>
                        {data.myScores.strengths.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-navy-400">Complete an assessment to see this.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={10} title="Business Model Canvas" icon="🧩" span="full">
              {data.businessModelCanvas ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["Key Partners", data.businessModelCanvas.keyPartners],
                      ["Key Activities", data.businessModelCanvas.keyActivities],
                      ["Value Proposition", data.businessModelCanvas.value],
                      ["Customers", data.businessModelCanvas.customers],
                      ["Channels", data.businessModelCanvas.channels],
                      ["Revenue Streams", data.businessModelCanvas.revenueStreams],
                      ["Cost Structure", data.businessModelCanvas.costStructure],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs font-bold uppercase tracking-wide text-gold-700">{label}</p>
                      <p className="text-sm">{value || <span className="text-navy-400">—</span>}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={11} title="90-Day Goal Tracker" icon="📅" span="full">
              {data.ninetyDayGoalTracker.length ? (
                <div className="flex flex-col divide-y divide-navy-100">
                  {data.ninetyDayGoalTracker.map((g, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-1.5 text-sm sm:text-base">
                      <span>
                        {g.title}{" "}
                        <span className="text-navy-500">
                          ({GOAL_TYPE_LABELS[g.goalType]}
                          {g.targetDate
                            ? `, due ${g.targetDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                            : ""}
                          )
                        </span>
                      </span>
                      <span className="shrink-0 font-bold text-legacy-700">{g.progressPercent}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-navy-400">No 90-day goals set yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={12} title="Daily Affirmations" icon="✨" span="full">
              {data.dailyAffirmations.length ? (
                <div className="flex flex-wrap gap-2">
                  {data.dailyAffirmations.map((a, i) => (
                    <WorksheetChip key={i}>{a}</WorksheetChip>
                  ))}
                </div>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
            </WorksheetPanel>
          </WorksheetGrid>

          <WorksheetBanner businessName={data.myStory.businessName} />
        </WorksheetPage>
      </div>
    </div>
  );
}
