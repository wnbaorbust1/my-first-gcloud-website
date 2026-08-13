import "server-only";

import { getRealLastActivityBulk } from "@/lib/facilitator/activity";
import { prisma } from "@/lib/prisma";
import { STAGES, type Stage } from "@/lib/utils";

const ENGAGEMENT_WINDOW_DAYS = 14;

export interface CohortStats {
  participants: number;
  sessionsAttended: number;
  avgRoadmapCompletionPercent: number | null;
  avgHealthPercent: number | null;
  stageAverages: Record<Stage, number | null>;
  /** ENGAGEMENT (spec Prompt 12): real signal — active in the last 14 days, same window Facilitator uses for "stalled." */
  activeLast14DaysCount: number;
  /** OUTCOMES (spec Prompt 12): total BusinessMilestone rows achieved across the cohort's participants. */
  milestonesAchieved: number;
}

const EMPTY_STATS: CohortStats = {
  participants: 0,
  sessionsAttended: 0,
  avgRoadmapCompletionPercent: null,
  avgHealthPercent: null,
  stageAverages: { PASSION: null, POWER: null, LEGACY: null },
  activeLast14DaysCount: 0,
  milestonesAchieved: 0,
};

/**
 * COHORT TRACKING (spec Prompt 12): "Track Participants, Sessions,
 * Completion, Scores, Engagement, Outcomes" — every number here is a
 * live query against the cohort's member businesses' real Assessment/
 * Roadmap/SessionRegistration/BusinessMilestone data, matching the "no
 * fake analytics" rule this schema has followed since Phase 4. Nothing
 * is stored on the Cohort row itself.
 */
export async function getCohortStats(cohortId: string): Promise<CohortStats> {
  const memberships = await prisma.cohortMembership.findMany({
    where: { cohortId },
    select: { businessId: true },
  });
  const businessIds = memberships.map((m) => m.businessId);
  if (businessIds.length === 0) return EMPTY_STATS;

  const [sessionsAttended, roadmaps, latestAssessments, activity, milestonesAchieved] = await Promise.all([
    prisma.sessionRegistration.count({
      where: { businessId: { in: businessIds }, status: { in: ["ATTENDED", "COMPLETED"] } },
    }),
    prisma.roadmap.findMany({
      where: { businessId: { in: businessIds } },
      include: { tasks: { select: { status: true } } },
    }),
    prisma.assessment.findMany({
      where: { businessId: { in: businessIds }, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: {
        businessId: true,
        healthScorePercent: true,
        completedAt: true,
        scores: { select: { stage: true, scorePercent: true } },
      },
    }),
    getRealLastActivityBulk(businessIds),
    prisma.businessMilestone.count({ where: { businessId: { in: businessIds } } }),
  ]);

  const roadmapPercents = roadmaps
    .filter((r) => r.tasks.length > 0)
    .map((r) => (r.tasks.filter((t) => t.status === "COMPLETED").length / r.tasks.length) * 100);
  const avgRoadmapCompletionPercent =
    roadmapPercents.length > 0
      ? Math.round(roadmapPercents.reduce((a, b) => a + b, 0) / roadmapPercents.length)
      : null;

  // Only the latest completed assessment per business counts toward the score averages.
  const latestPerBusiness = new Map<string, (typeof latestAssessments)[number]>();
  for (const a of latestAssessments) {
    const existing = latestPerBusiness.get(a.businessId);
    if (!existing || (a.completedAt && existing.completedAt && a.completedAt > existing.completedAt)) {
      latestPerBusiness.set(a.businessId, a);
    }
  }
  const latestList = Array.from(latestPerBusiness.values());

  const healthValues = latestList
    .map((a) => a.healthScorePercent)
    .filter((v): v is number => v !== null);
  const avgHealthPercent =
    healthValues.length > 0 ? Math.round(healthValues.reduce((a, b) => a + b, 0) / healthValues.length) : null;

  const stageAverages: Record<Stage, number | null> = { PASSION: null, POWER: null, LEGACY: null };
  for (const stage of STAGES) {
    const values = latestList.flatMap((a) => a.scores.filter((s) => s.stage === stage).map((s) => s.scorePercent));
    stageAverages[stage] = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  }

  const cutoff = new Date(Date.now() - ENGAGEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const activeLast14DaysCount = Array.from(activity.values()).filter((d) => d && d >= cutoff).length;

  return {
    participants: businessIds.length,
    sessionsAttended,
    avgRoadmapCompletionPercent,
    avgHealthPercent,
    stageAverages,
    activeLast14DaysCount,
    milestonesAchieved,
  };
}
