import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AiSuggestedBadge,
  WorksheetAppointmentCard,
  WorksheetBanner,
  WorksheetChecklist,
  WorksheetChecklistItem,
  WorksheetChip,
  WorksheetGrid,
  WorksheetHeader,
  WorksheetLockedTeaser,
  WorksheetPage,
  WorksheetPanel,
  WorksheetRatingRow,
  WorksheetRoadmap,
  WorksheetStat,
} from "@/components/blueprint/worksheet";
import { VisionBoardCapture } from "@/components/blueprint/vision-board-capture";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveBlueprintAccess } from "@/lib/blueprint/access";
import { getVisionBoardExport, getVisionBoardSectionSources } from "@/lib/blueprint/vision-board";
import { GOAL_TYPE_LABELS } from "@/lib/goals/meta";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { slugify, type Stage } from "@/lib/utils";

export const metadata: Metadata = { title: "My Vision Board — My Blueprint" };

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Real, always-allowed scores/stage summary — used by both the preview and expired (read-only) states. */
function BoardScoresSummary({
  data,
}: {
  data: Awaited<ReturnType<typeof getVisionBoardExport>>;
}) {
  const { board } = data;
  if (!board.passionAssessment) return null;
  return (
    <div className="rounded-3xl border-2 border-legacy-200 bg-surface p-4 sm:p-5">
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
              <WorksheetStat label="Business Health" value={`${board.passionAssessment.businessHealthPercent}%`} />
            </div>
          )}
          {data.recommendedSession && (
            <p className="text-sm">
              <span className="font-bold text-legacy-700">My Blueprint Stage: </span>
              {data.recommendedSession}
            </p>
          )}
        </div>
      </div>
    </div>
  );
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

  // ACCESS LADDER (Phase 5: Locking and Unlocking) — the single resolver
  // every row of the access table maps through; see
  // src/lib/blueprint/access.ts for the full state list and reasoning.
  const accessInfo = await resolveBlueprintAccess(user.id, membership.businessId);

  if (accessInfo.state === "assessment_only") {
    return (
      <EmptyState
        icon={Lock}
        title="Complete your Blueprint Assessment first"
        description="Your Vision Board starts with your Passion, Power, and Legacy scores — finish your assessment to see your preview."
        action={
          <Button asChild size="sm">
            <Link href="/assessment">Start My Assessment</Link>
          </Button>
        }
      />
    );
  }

  if (accessInfo.state === "preview" || accessInfo.state === "preview_booked") {
    const data = await getVisionBoardExport(membership.businessId);
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/my-blueprint"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to My Blueprint
        </Link>
        <WorksheetPage>
          <WorksheetHeader
            name={data.business.name}
            eyebrow={[data.business.industry, data.business.businessStage].filter(Boolean).join(" · ") || undefined}
            subtitle="My Vision Board Preview"
          />
          <BoardScoresSummary data={data} />
          {accessInfo.state === "preview_booked" && accessInfo.appointment && (
            <WorksheetAppointmentCard
              statusLabel={accessInfo.appointment.status === "WAITLISTED" ? "Waitlisted" : "Registered"}
              title={accessInfo.appointment.sessionTitle}
              dateLabel={accessInfo.appointment.startsAt.toLocaleString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              formatLabel={accessInfo.appointment.format === "VIRTUAL" ? "Virtual" : "In Person"}
              locationLabel={
                accessInfo.appointment.format === "IN_PERSON"
                  ? (accessInfo.appointment.location ?? undefined)
                  : undefined
              }
            />
          )}
          <WorksheetLockedTeaser
            message={
              accessInfo.state === "preview_booked"
                ? "You're booked! Your full board — My Story, My Why, Action Plan, Legacy, editing, and downloads — unlocks the moment your session is marked complete."
                : "Attend (and pay for) your recommended Blueprint Session to unlock your full Vision Board, editing, and downloads."
            }
            cta={
              accessInfo.state === "preview" ? (
                <Button asChild size="lg">
                  <Link href="/sessions">View Available Sessions</Link>
                </Button>
              ) : undefined
            }
          />
        </WorksheetPage>
      </div>
    );
  }

  if (accessInfo.state === "expired") {
    const data = await getVisionBoardExport(membership.businessId);
    return (
      <div className="mx-auto max-w-3xl">
        <Link
          href="/my-blueprint"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to My Blueprint
        </Link>
        <WorksheetPage>
          <WorksheetHeader
            name={data.business.name}
            eyebrow={[data.business.industry, data.business.businessStage].filter(Boolean).join(" · ") || undefined}
            subtitle="My Vision Board (Read-Only)"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-navy-200 bg-navy-50 p-4">
            <p className="text-sm text-navy-700">
              Your Builder access has ended, but nothing you built is gone. Reactivate to unlock full
              editing and downloads again.
            </p>
            <Button asChild size="sm" variant="gold">
              <Link href="/billing">Billing &amp; Reactivation</Link>
            </Button>
          </div>
          <BoardScoresSummary data={data} />
        </WorksheetPage>
      </div>
    );
  }

  // accessInfo.state === "full" — Session completed, and a trial or paid
  // membership currently grants access: the real board, editing, roadmap,
  // and downloads.
  const [data, sectionSources] = await Promise.all([
    getVisionBoardExport(membership.businessId),
    getVisionBoardSectionSources(membership.businessId),
  ]);
  const { board } = data;

  // FOCUS STAGE (Phase 4: Board Template) — the scoring engine's own real
  // recommendation, not a guess: RecommendedSessionType maps 1:1 onto a
  // Stage except "GROWTH" (all three stages already clear threshold —
  // see determineRecommendation in src/lib/assessment/scoring.ts), which
  // the roadmap treats as "every node on track" rather than picking one.
  const focusStage: Stage | "GROWTH" | null = data.recommendedSessionType;

  return (
    <div>
      {/* PRINT-FRIENDLY LANDSCAPE LAYOUT (Phase 4: Board Template) — scoped
          to this route only via an inline <style>, not globals.css, since
          other (print) pages (Scorecard, Documents, Impact Report) are
          fine as portrait. */}
      <style>{"@media print { @page { size: landscape; margin: 0.4in; } }"}</style>

      <div className="no-print mb-6">
        <Link
          href="/my-blueprint"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to My Blueprint
        </Link>
      </div>

      <VisionBoardCapture
        businessId={membership.businessId}
        fileBaseName={`${slugify(data.business.name)}-vision-board`}
      >
      <div className="print-page print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <WorksheetPage>
          <WorksheetHeader
            name={board.myStory.name || data.business.name}
            eyebrow={[data.business.industry, data.business.businessStage].filter(Boolean).join(" · ") || undefined}
            subtitle="My Vision Board"
          />

          <WorksheetRoadmap
            scores={{
              PASSION: board.passionAssessment?.passionPercent ?? null,
              POWER: board.passionAssessment?.powerPercent ?? null,
              LEGACY: board.passionAssessment?.legacyPercent ?? null,
            }}
            focusStage={focusStage}
          />

          <WorksheetGrid>
            <WorksheetPanel
              number={1}
              title="My Story"
              icon="📖"
              badge={sectionSources.myStory === "ai" ? <AiSuggestedBadge /> : undefined}
            >
              {board.myStory.passionStatement ? (
                <p>{board.myStory.passionStatement}</p>
              ) : data.business.description || data.business.whatIOffer ? (
                <p>{data.business.description || data.business.whatIOffer}</p>
              ) : (
                <p className="text-navy-500">Not filled in yet.</p>
              )}
              {board.myStory.superpowers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {board.myStory.superpowers.map((s, i) => (
                    <WorksheetChip key={i}>{s}</WorksheetChip>
                  ))}
                </div>
              )}
            </WorksheetPanel>

            <WorksheetPanel
              number={2}
              title="My Why"
              icon="💗"
              badge={sectionSources.myWhy === "ai" ? <AiSuggestedBadge /> : undefined}
            >
              {board.myWhy.whyStatement ? (
                <p>{board.myWhy.whyStatement}</p>
              ) : data.business.myGoal ? (
                <p>{data.business.myGoal}</p>
              ) : (
                <p className="text-navy-500">Not filled in yet.</p>
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
                <p className="text-navy-500">Complete an assessment to see this.</p>
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
                <p className="text-navy-500">Not filled in yet.</p>
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
                <p className="text-navy-500">Not filled in yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel
              number={5}
              title="Action Plan"
              icon="🗺️"
              badge={sectionSources.actionPlan === "ai" ? <AiSuggestedBadge /> : undefined}
            >
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
                <p className="text-navy-500">Not filled in yet.</p>
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
                <p className="text-navy-500">Not filled in yet.</p>
              )}
              {board.actionPlan.firstStep && (
                <p className="mt-3 rounded-lg border-2 border-dashed border-gold-300 bg-gold-50 p-2 text-sm">
                  <span className="font-bold text-legacy-700">My First Step: </span>
                  {board.actionPlan.firstStep}
                </p>
              )}
            </WorksheetPanel>

            <WorksheetPanel
              number={6}
              title="Legacy"
              icon="👑"
              badge={sectionSources.legacy === "ai" ? <AiSuggestedBadge /> : undefined}
            >
              {board.legacy.legacyStatement ? (
                <p>{board.legacy.legacyStatement}</p>
              ) : (
                <p className="text-navy-500">Not filled in yet.</p>
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
                <p className="text-navy-500">No accountability partner set yet.</p>
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
                <p className="text-navy-500">No active goals yet.</p>
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
                <p className="text-navy-500">Complete an assessment to see this.</p>
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
                      {values.length ? values.join(", ") : <span className="text-navy-500">—</span>}
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
                <p className="text-navy-500">No 90-day goals set yet.</p>
              )}
            </WorksheetPanel>

            <WorksheetPanel
              number={12}
              title="Daily Affirmations"
              icon="✨"
              span="full"
              badge={sectionSources.affirmations === "ai" ? <AiSuggestedBadge /> : undefined}
            >
              {board.affirmations.length ? (
                <div className="flex flex-wrap gap-2">
                  {board.affirmations.map((a, i) => (
                    <WorksheetChip key={i}>{a}</WorksheetChip>
                  ))}
                </div>
              ) : (
                <p className="text-navy-500">Not filled in yet.</p>
              )}
            </WorksheetPanel>
          </WorksheetGrid>

          <WorksheetBanner businessName={data.business.name} />
        </WorksheetPage>
      </div>
      </VisionBoardCapture>
    </div>
  );
}
