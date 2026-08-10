import "server-only";

import { sessionLabelFor, topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/utils";

const PRIORITY_RANK = { MUST_DO: 0, SHOULD_DO: 1, BONUS: 2 } as const;

/**
 * BLUEPRINT SCORECARD (spec Prompt 6): a one-page summary of exactly the
 * fields the spec lists — Business, Date, the three stage scores,
 * Business Health, Strength, Priority Gap, Current Goal, Next Best
 * Action, Recommended Session. Every field is read straight from the
 * business's real, most recent completed assessment / roadmap / goal —
 * a field is simply omitted (never guessed) when nothing exists yet.
 */
export async function getScorecardData(businessId: string) {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });

  const assessment = await prisma.assessment.findFirst({
    where: { businessId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: { scores: true, categoryScores: true },
  });

  const [goal, roadmap] = await Promise.all([
    prisma.goal.findFirst({ where: { businessId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
    prisma.roadmap.findFirst({
      where: { businessId },
      include: { tasks: { where: { status: "NOT_STARTED" }, orderBy: { order: "asc" } } },
    }),
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

  const nextBestAction = [...(roadmap?.tasks ?? [])].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.order - b.order,
  )[0];

  return {
    businessName: business.name,
    date: new Date(),
    passionScore: scoreByStage.PASSION ?? null,
    powerScore: scoreByStage.POWER ?? null,
    legacyScore: scoreByStage.LEGACY ?? null,
    healthScorePercent: assessment?.healthScorePercent ?? null,
    strength: strengths[0] ?? null,
    priorityGap: priorities[0] ?? null,
    currentGoal: goal?.title ?? null,
    nextBestAction: nextBestAction?.title ?? null,
    recommendedSession: assessment?.recommendedSessionType
      ? sessionLabelFor(assessment.recommendedSessionType)
      : null,
    hasAssessment: Boolean(assessment),
  };
}

export type ScorecardData = Awaited<ReturnType<typeof getScorecardData>>;
