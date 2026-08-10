import "server-only";

import { prisma } from "@/lib/prisma";

/** spec Prompt 9 REASSESSMENT: "Allow reassessment after: 90 days OR substantial roadmap completion." */
export const REASSESSMENT_DAYS = 90;
/** "Substantial roadmap completion" — not defined further by the spec; documented here as the threshold. */
export const REASSESSMENT_ROADMAP_PERCENT = 50;

export async function getReassessmentEligibility(businessId: string) {
  const [completedAssessments, roadmap] = await Promise.all([
    prisma.assessment.findMany({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 2,
      include: { scores: true },
    }),
    prisma.roadmap.findFirst({ where: { businessId }, include: { tasks: true } }),
  ]);

  const latest = completedAssessments[0] ?? null;
  const previous = completedAssessments[1] ?? null;

  const daysSinceLatest = latest?.completedAt
    ? Math.floor((Date.now() - latest.completedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const tasks = roadmap?.tasks ?? [];
  const roadmapCompletionPercent = tasks.length
    ? Math.round((tasks.filter((t) => t.status === "COMPLETED").length / tasks.length) * 100)
    : 0;

  const eligibleByDays = daysSinceLatest !== null && daysSinceLatest >= REASSESSMENT_DAYS;
  const eligibleByRoadmap = roadmapCompletionPercent >= REASSESSMENT_ROADMAP_PERCENT;

  return {
    hasCompletedAssessment: Boolean(latest),
    eligible: Boolean(latest) && (eligibleByDays || eligibleByRoadmap),
    eligibleByDays,
    eligibleByRoadmap,
    daysSinceLatest,
    roadmapCompletionPercent,
    latest,
    previous,
  };
}

export type ReassessmentEligibility = Awaited<ReturnType<typeof getReassessmentEligibility>>;
