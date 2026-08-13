import "server-only";

import { sessionLabelFor, topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/utils";

/**
 * Assembles every real field the vision-board export (see
 * src/app/api/gpt/vision-board/route.ts) can hand to an external image
 * generator: the same pillars as the reference the business owner
 * supplied, sourced entirely from Business, Assessment, Goal, Roadmap,
 * and VisionBoardProfile — nothing invented. A pillar with no data
 * behind it (member hasn't filled in Vision Board Profile, hasn't
 * completed an assessment, etc.) is simply omitted, same convention as
 * getScorecardData / getMyBlueprintData.
 */
export async function getVisionBoardExport(businessId: string) {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });

  const [assessment, goals, ninetyDayGoals, roadmap, profile] = await Promise.all([
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: { scores: true, categoryScores: true },
    }),
    prisma.goal.findMany({
      where: { businessId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    // 90-DAY GOAL TRACKER (Vision Board & Blueprint Generator, audited
    // 2026-08-13): a real, filtered view over the member's own Goals —
    // GoalCadence already has a NINETY_DAY value (see spec Prompt 9), so
    // this section never needed a new field, just this query.
    prisma.goal.findMany({
      where: { businessId, status: "ACTIVE", cadence: "NINETY_DAY" },
      orderBy: { targetDate: "asc" },
    }),
    prisma.roadmap.findFirst({
      where: { businessId },
      include: { tasks: { where: { status: "NOT_STARTED" }, orderBy: { order: "asc" }, take: 5 } },
    }),
    prisma.visionBoardProfile.findUnique({ where: { businessId } }),
  ]);

  const scoreByStage = Object.fromEntries(
    (assessment?.scores ?? []).map((s) => [s.stage, s.scorePercent]),
  ) as Partial<Record<Stage, number>>;

  const { strengths, priorities } = assessment
    ? topStrengthsAndPriorities(
        assessment.categoryScores.map((c) => ({
          stage: c.stage as Stage,
          category: c.category,
          scorePercent: c.scorePercent,
        })),
      )
    : { strengths: [], priorities: [] };

  return {
    myStory: {
      businessName: business.name,
      industry: business.industry,
      businessStage: business.businessStage,
      whatIOffer: business.primaryProductOrService,
      description: business.description,
      narrative: profile?.myStory ?? null,
    },
    myWhy: {
      idealCustomer: business.idealCustomer,
      problemISolve: business.primaryChallenge,
      myGoal: business.primaryGoal,
      narrative: profile?.myWhy ?? null,
    },
    legacyImpact: profile?.legacyImpact ?? null,
    actionPlan: {
      thisWeek: profile?.actionPlanThisWeek ?? null,
      thisMonth: profile?.actionPlanThisMonth ?? null,
    },
    ninetyDayGoalTracker: ninetyDayGoals.map((g) => ({
      title: g.title,
      goalType: g.goalType,
      targetDate: g.targetDate,
      targetValue: g.targetValue,
      unit: g.unit,
      progressPercent: g.progressPercent,
    })),
    myScores: assessment
      ? {
          passionPercent: scoreByStage.PASSION ?? null,
          powerPercent: scoreByStage.POWER ?? null,
          legacyPercent: scoreByStage.LEGACY ?? null,
          businessHealthPercent: assessment.healthScorePercent,
          strengths: strengths.map((s) => `${s.category} (${s.scorePercent}%)`),
          priorities: priorities.map((p) => `${p.category} (${p.scorePercent}%)`),
          recommendedSession: assessment.recommendedSessionType
            ? sessionLabelFor(assessment.recommendedSessionType)
            : null,
          recommendationReason: assessment.recommendationReason,
        }
      : null,
    myBigGoals: goals.map((g) => ({
      title: g.title,
      cadence: g.cadence,
      targetDate: g.targetDate,
      targetValue: g.targetValue,
      unit: g.unit,
      progressPercent: g.progressPercent,
    })),
    myNextActions: (roadmap?.tasks ?? []).map((t) => t.title),
    accountability: {
      cadence: business.accountabilityCadence,
      customDays: business.accountabilityCustomDays,
      partnerName: profile?.accountabilityPartnerName ?? null,
      partnerContact: profile?.accountabilityPartnerContact ?? null,
      commitment: profile?.accountabilityCommitment ?? null,
    },
    myVibes: profile?.vibes ?? null,
    resources: {
      have: profile?.resourcesHave ?? null,
      need: profile?.resourcesNeed ?? null,
    },
    businessModelCanvas: profile
      ? {
          keyPartners: profile.bmcKeyPartners,
          keyActivities: profile.bmcKeyActivities,
          value: profile.bmcValue,
          customers: profile.bmcCustomers,
          channels: profile.bmcChannels,
          revenueStreams: profile.bmcRevenueStreams,
          costStructure: profile.bmcCostStructure,
        }
      : null,
    dailyAffirmations: profile?.dailyAffirmations
      ? profile.dailyAffirmations.split("\n").map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

export type VisionBoardExport = Awaited<ReturnType<typeof getVisionBoardExport>>;
