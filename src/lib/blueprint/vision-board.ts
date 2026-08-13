import "server-only";

import { sessionLabelFor, topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { prisma } from "@/lib/prisma";
import {
  EMPTY_ACCOUNTABILITY,
  EMPTY_ACTION_PLAN,
  EMPTY_BLUEPRINT,
  EMPTY_BUSINESS_MODEL_CANVAS,
  EMPTY_LEGACY,
  EMPTY_MY_STORY,
  EMPTY_MY_WHY,
  EMPTY_RESOURCES,
  accountabilitySectionSchema,
  actionPlanSectionSchema,
  blueprintSectionSchema,
  businessModelCanvasSectionSchema,
  legacySectionSchema,
  myStorySectionSchema,
  myWhySectionSchema,
  parseSection,
  resourcesSectionSchema,
  type VisionBoardData,
} from "@/lib/validations/vision-board-data";
import type { Stage } from "@/lib/utils";

/**
 * Assembles the whole Vision Board — the same `VisionBoardData` shape
 * used everywhere (the board render page, the GPT export, the AI draft
 * schema) — sourced entirely from Business, Assessment, Goal, and
 * `VisionBoardProfile`, nothing invented. The member-editable sections
 * (myStory, myWhy, legacy, blueprint, actionPlan, resources,
 * businessModelCanvas, vibes, affirmations, accountability) are parsed
 * straight from `VisionBoardProfile`'s Json columns; `passionAssessment`,
 * `bigGoals`, and `ninetyDayGoalTracker` are computed fresh from
 * Assessment/Goal every call — never stored, so they can never go stale
 * (this app's "never fabricate / never duplicate a source of truth"
 * convention).
 */
export async function getVisionBoardData(businessId: string): Promise<VisionBoardData> {
  const [assessment, activeGoals, ninetyDayGoals, profile] = await Promise.all([
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
    // 90-DAY GOAL TRACKER: a real, filtered view over the member's own
    // Goals — GoalCadence already has a NINETY_DAY value (spec Prompt 9),
    // so this section never needed a new field, just this query.
    prisma.goal.findMany({
      where: { businessId, status: "ACTIVE", cadence: "NINETY_DAY" },
      orderBy: { targetDate: "asc" },
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
    myStory: parseSection(myStorySectionSchema, profile?.myStory, EMPTY_MY_STORY),
    myWhy: parseSection(myWhySectionSchema, profile?.myWhy, EMPTY_MY_WHY),
    legacy: parseSection(legacySectionSchema, profile?.legacy, EMPTY_LEGACY),
    blueprint: parseSection(blueprintSectionSchema, profile?.blueprint, EMPTY_BLUEPRINT),
    actionPlan: parseSection(actionPlanSectionSchema, profile?.actionPlan, EMPTY_ACTION_PLAN),
    resources: parseSection(resourcesSectionSchema, profile?.resources, EMPTY_RESOURCES),
    businessModelCanvas: parseSection(
      businessModelCanvasSectionSchema,
      profile?.businessModelCanvas,
      EMPTY_BUSINESS_MODEL_CANVAS,
    ),
    vibes: Array.isArray(profile?.vibes) ? (profile.vibes as string[]) : [],
    affirmations: Array.isArray(profile?.affirmations) ? (profile.affirmations as string[]) : [],
    accountability: parseSection(accountabilitySectionSchema, profile?.accountability, EMPTY_ACCOUNTABILITY),
    bigGoals: activeGoals.map((g) => ({
      title: g.title,
      progressPercent: g.progressPercent,
      targetDate: g.targetDate ? g.targetDate.toISOString() : null,
    })),
    passionAssessment: assessment
      ? {
          passionPercent: scoreByStage.PASSION ?? null,
          powerPercent: scoreByStage.POWER ?? null,
          legacyPercent: scoreByStage.LEGACY ?? null,
          businessHealthPercent: assessment.healthScorePercent,
          strengths: strengths.map((s) => `${s.category} (${s.scorePercent}%)`),
          priorities: priorities.map((p) => `${p.category} (${p.scorePercent}%)`),
        }
      : null,
    ninetyDayGoalTracker: ninetyDayGoals.map((g) => ({
      title: g.title,
      goalType: g.goalType,
      targetDate: g.targetDate ? g.targetDate.toISOString() : null,
      progressPercent: g.progressPercent,
    })),
  };
}

/**
 * The Custom-GPT-Action export additionally includes a few real,
 * read-only business/assessment facts the structured board itself
 * doesn't carry (business name/industry/stage, the recommended session,
 * next roadmap actions) — kept separate from `VisionBoardData` because
 * those fields are recommendation/factual context for an external image
 * generator, not member-editable board content.
 */
export async function getVisionBoardExport(businessId: string) {
  const [business, board, assessment, roadmap] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
    getVisionBoardData(businessId),
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    }),
    prisma.roadmap.findFirst({
      where: { businessId },
      include: { tasks: { where: { status: "NOT_STARTED" }, orderBy: { order: "asc" }, take: 5 } },
    }),
  ]);

  return {
    business: {
      name: business.name,
      industry: business.industry,
      businessStage: business.businessStage,
      whatIOffer: business.primaryProductOrService,
      description: business.description,
      idealCustomer: business.idealCustomer,
      problemISolve: business.primaryChallenge,
      myGoal: business.primaryGoal,
    },
    recommendedSession: assessment?.recommendedSessionType
      ? sessionLabelFor(assessment.recommendedSessionType)
      : null,
    recommendationReason: assessment?.recommendationReason ?? null,
    myNextActions: (roadmap?.tasks ?? []).map((t) => t.title),
    board,
  };
}

export type VisionBoardExport = Awaited<ReturnType<typeof getVisionBoardExport>>;
