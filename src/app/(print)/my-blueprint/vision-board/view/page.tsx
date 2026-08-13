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

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * THE VISION BOARD (Vision Board & Blueprint Generator, structured-storage
 * follow-up, audited 2026-08-13): the actual deliverable the rendering
 * constraint requires — "a fixed, responsive HTML/CSS template... not an
 * AI-generated image." Every one of the twelve required sections below
 * is rendered here with the existing Worksheet system, sourced from
 * `getVisionBoardExport()`'s structured `board` object (the same
 * `VisionBoardData` shape the GPT export and the AI draft schema use —
 * src/lib/validations/vision-board-data.ts), so this page and the
 * exported JSON can never drift apart. A section with nothing behind it
 * yet renders an honest "not filled in" line, never invented text.
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
  const { board } = data;

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
        <PrintButton logDownload={{ businessId: membership.businessId, document: "vision_board" }} />
      </div>

      <div className="print-page print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <WorksheetPage>
          <WorksheetHeader
            name={board.myStory.name || data.business.name}
            eyebrow={[data.business.industry, data.business.businessStage].filter(Boolean).join(" · ") || undefined}
            subtitle="My Vision Board"
          />

          <WorksheetGrid>
            <WorksheetPanel number={1} title="My Story" icon="📖">
              {board.myStory.passionStatement ? (
                <p>{board.myStory.passionStatement}</p>
              ) : data.business.description || data.business.whatIOffer ? (
                <p>{data.business.description || data.business.whatIOffer}</p>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
              {board.myStory.superpowers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {board.myStory.superpowers.map((s, i) => (
                    <WorksheetChip key={i}>{s}</WorksheetChip>
                  ))}
                </div>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={2} title="My Why" icon="💗">
              {board.myWhy.whyStatement ? (
                <p>{board.myWhy.whyStatement}</p>
              ) : data.business.myGoal ? (
                <p>{data.business.myGoal}</p>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
              {board.myWhy.problemToSolve && (
                <p className="mt-2 text-sm">
                  <span className="font-bold text-legacy-700">Problem I solve: </span>
                  {board.myWhy.problemToSolve}
                </p>
              )}
              {board.myWhy.peopleToHelp.length > 0 && (
                <p className="mt-2 text-sm">
                  <span className="font-bold text-legacy-700">Who I help: </span>
                  {board.myWhy.peopleToHelp.join(", ")}
                </p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={3} title="My Blueprint" icon="📘">
              {data.recommendedSession ? (
                <>
                  <p className="text-lg font-bold text-legacy-700">{data.recommendedSession}</p>
                  {data.recommendationReason && <p className="mt-2 text-sm">{data.recommendationReason}</p>}
                </>
              ) : (
                <p className="text-navy-400">Complete an assessment to see this.</p>
              )}
              {board.blueprint.priorities.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gold-700">My Priorities</p>
                  <WorksheetChecklist>
                    {board.blueprint.priorities.map((p, i) => (
                      <WorksheetChecklistItem key={i} checked={false}>
                        {p}
                      </WorksheetChecklistItem>
                    ))}
                  </WorksheetChecklist>
                </div>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={4} title="My Resources" icon="🧰">
              <p className="text-xs font-bold uppercase tracking-wide text-gold-700">Have</p>
              {board.resources.have.length ? (
                <WorksheetChecklist>
                  {board.resources.have.map((r, i) => (
                    <WorksheetChecklistItem key={i} checked>
                      {r}
                    </WorksheetChecklistItem>
                  ))}
                </WorksheetChecklist>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gold-700">Need</p>
              {board.resources.need.length ? (
                <WorksheetChecklist>
                  {board.resources.need.map((r, i) => (
                    <WorksheetChecklistItem key={i} checked={false}>
                      {r}
                    </WorksheetChecklistItem>
                  ))}
                </WorksheetChecklist>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={5} title="Action Plan" icon="🗺️">
              <p className="text-xs font-bold uppercase tracking-wide text-gold-700">This Week</p>
              {board.actionPlan.thisWeek.length ? (
                <WorksheetChecklist>
                  {board.actionPlan.thisWeek.map((a, i) => (
                    <WorksheetChecklistItem key={i} checked={false}>
                      {a}
                    </WorksheetChecklistItem>
                  ))}
                </WorksheetChecklist>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gold-700">This Month</p>
              {board.actionPlan.thisMonth.length ? (
                <WorksheetChecklist>
                  {board.actionPlan.thisMonth.map((a, i) => (
                    <WorksheetChecklistItem key={i} checked={false}>
                      {a}
                    </WorksheetChecklistItem>
                  ))}
                </WorksheetChecklist>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
              {board.actionPlan.firstStep && (
                <p className="mt-3 rounded-lg border-2 border-dashed border-gold-300 bg-gold-50 p-2 text-sm">
                  <span className="font-bold text-legacy-700">My First Step: </span>
                  {board.actionPlan.firstStep}
                </p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={6} title="Legacy" icon="👑">
              {board.legacy.legacyStatement ? (
                <p>{board.legacy.legacyStatement}</p>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
              {board.legacy.impactGroups.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {board.legacy.impactGroups.map((g, i) => (
                    <WorksheetChip key={i}>{g}</WorksheetChip>
                  ))}
                </div>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={7} title="Accountability" icon="🤝">
              {board.accountability.partnerName ? (
                <>
                  <p className="font-bold">{board.accountability.partnerName}</p>
                  {board.accountability.partnerContact && (
                    <p className="text-sm text-navy-600">{board.accountability.partnerContact}</p>
                  )}
                  {(board.accountability.frequency || board.accountability.method) && (
                    <p className="mt-1 text-sm text-navy-600">
                      {[board.accountability.frequency, board.accountability.method].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {board.accountability.commitment && <p className="mt-2">{board.accountability.commitment}</p>}
                </>
              ) : (
                <p className="text-navy-400">No accountability partner set yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={8} title="My Big Goals" icon="🎯">
              {board.bigGoals.length ? (
                <WorksheetChecklist>
                  {board.bigGoals.map((g, i) => (
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
              {board.passionAssessment ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col divide-y divide-navy-100">
                    {board.passionAssessment.passionPercent !== null && (
                      <WorksheetRatingRow label="💗 Passion" scorePercent={board.passionAssessment.passionPercent} />
                    )}
                    {board.passionAssessment.powerPercent !== null && (
                      <WorksheetRatingRow label="⚡ Power" scorePercent={board.passionAssessment.powerPercent} />
                    )}
                    {board.passionAssessment.legacyPercent !== null && (
                      <WorksheetRatingRow label="👑 Legacy" scorePercent={board.passionAssessment.legacyPercent} />
                    )}
                  </div>
                  <div>
                    {board.passionAssessment.businessHealthPercent !== null && (
                      <div className="mb-3 flex justify-center sm:justify-start">
                        <WorksheetStat
                          label="Business Health"
                          value={`${board.passionAssessment.businessHealthPercent}%`}
                        />
                      </div>
                    )}
                    {board.passionAssessment.strengths.length > 0 && (
                      <p className="text-sm">
                        <span className="font-bold text-legacy-700">Strengths: </span>
                        {board.passionAssessment.strengths.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-navy-400">Complete an assessment to see this.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel number={10} title="Business Model Canvas" icon="🧩" span="full">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    ["Key Partners", board.businessModelCanvas.keyPartners],
                    ["Key Activities", board.businessModelCanvas.keyActivities],
                    ["Value Proposition", board.businessModelCanvas.value],
                    ["Customers", board.businessModelCanvas.customers],
                    ["Channels", board.businessModelCanvas.channels],
                    ["Revenue Streams", board.businessModelCanvas.revenueStreams],
                    ["Cost Structure", board.businessModelCanvas.costStructure],
                  ] as const
                ).map(([label, values]) => (
                  <div key={label}>
                    <p className="text-xs font-bold uppercase tracking-wide text-gold-700">{label}</p>
                    <p className="text-sm">
                      {values.length ? values.join(", ") : <span className="text-navy-400">—</span>}
                    </p>
                  </div>
                ))}
              </div>
            </WorksheetPanel>

            <WorksheetPanel number={11} title="90-Day Goal Tracker" icon="📅" span="full">
              {board.ninetyDayGoalTracker.length ? (
                <div className="flex flex-col divide-y divide-navy-100">
                  {board.ninetyDayGoalTracker.map((g, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-1.5 text-sm sm:text-base">
                      <span>
                        {g.title}{" "}
                        <span className="text-navy-500">
                          ({GOAL_TYPE_LABELS[g.goalType as keyof typeof GOAL_TYPE_LABELS] ?? g.goalType}
                          {formatDate(g.targetDate) ? `, due ${formatDate(g.targetDate)}` : ""})
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
              {board.affirmations.length ? (
                <div className="flex flex-wrap gap-2">
                  {board.affirmations.map((a, i) => (
                    <WorksheetChip key={i}>{a}</WorksheetChip>
                  ))}
                </div>
              ) : (
                <p className="text-navy-400">Not filled in yet.</p>
              )}
            </WorksheetPanel>
          </WorksheetGrid>

          <WorksheetBanner businessName={data.business.name} />
        </WorksheetPage>
      </div>
    </div>
  );
}
