import "server-only";

import { prisma } from "@/lib/prisma";
import { STAGES, type Stage } from "@/lib/utils";

/**
 * An organization's "participants" are every business tied to it — either
 * through a Cohort or through direct sponsorship (a sponsored business
 * doesn't have to be in a cohort). Deduplicated: a business can be both
 * cohort-assigned and sponsored by the same org.
 */
export async function getOrganizationBusinessIds(organizationId: string): Promise<string[]> {
  const [cohortMembers, sponsored] = await Promise.all([
    prisma.cohortMembership.findMany({
      where: { cohort: { organizationId } },
      select: { businessId: true },
    }),
    prisma.membership.findMany({
      where: { sponsorOrganizationId: organizationId },
      select: { businessId: true },
    }),
  ]);
  return Array.from(new Set([...cohortMembers.map((m) => m.businessId), ...sponsored.map((m) => m.businessId)]));
}

export interface OrganizationStats {
  participants: number;
  assessmentCompletionCount: number;
  sessionAttendance: number;
  avgRoadmapCompletionPercent: number | null;
  avgHealthPercent: number | null;
  stageAverages: Record<Stage, number | null>;
  /** Average (latest completed assessment - previous completed assessment) health score, across businesses with 2+ completed assessments. */
  avgHealthImprovement: number | null;
  /** BUSINESSES STARTED (spec Prompt 12 Impact Report: "Businesses Launched"). */
  businessesLaunched: number;
  milestonesAchieved: number;
  /** SYSTEMS BUILT (spec Prompt 12 Impact Report): real signal from Phase 10's SOPs + Automation sequences, not a placeholder. */
  systemsBuilt: number;
  /** JOBS CREATED (spec Prompt 12 Impact Report): sum of each business's self-reported count — see Business.jobsCreatedSelfReported. */
  jobsCreated: number;
  /** REVENUE GROWTH (spec Prompt 12 Impact Report, optional): sum of self-reported WeeklyCheckIn revenue across participants; null when nobody has reported any. */
  revenueGrowthCents: number | null;
}

const EMPTY_STATS: OrganizationStats = {
  participants: 0,
  assessmentCompletionCount: 0,
  sessionAttendance: 0,
  avgRoadmapCompletionPercent: null,
  avgHealthPercent: null,
  stageAverages: { PASSION: null, POWER: null, LEGACY: null },
  avgHealthImprovement: null,
  businessesLaunched: 0,
  milestonesAchieved: 0,
  systemsBuilt: 0,
  jobsCreated: 0,
  revenueGrowthCents: null,
};

/**
 * ORGANIZATION ANALYTICS + IMPACT REPORT (spec Prompt 12): "Organizations
 * should see aggregate information by default." Every number here is a
 * live-computed query across the org's participant businesses — nothing
 * is stored on the Organization row. Shared by both the Analytics page
 * and the printable Impact Report so the two never disagree.
 */
export async function getOrganizationStats(organizationId: string): Promise<OrganizationStats> {
  const businessIds = await getOrganizationBusinessIds(organizationId);
  if (businessIds.length === 0) return EMPTY_STATS;

  const [
    assessmentCompletionCount,
    sessionAttendance,
    roadmaps,
    assessments,
    businessesLaunched,
    milestonesAchieved,
    sopCount,
    automationStepCount,
    businesses,
    checkIns,
  ] = await Promise.all([
    prisma.assessment.count({ where: { businessId: { in: businessIds }, status: "COMPLETED" } }),
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
    prisma.business.count({ where: { id: { in: businessIds }, builderAccessEligible: true } }),
    prisma.businessMilestone.count({ where: { businessId: { in: businessIds } } }),
    prisma.sop.count({ where: { businessId: { in: businessIds } } }),
    prisma.automationStep.count({ where: { businessId: { in: businessIds } } }),
    prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { jobsCreatedSelfReported: true },
    }),
    prisma.weeklyCheckIn.findMany({
      where: { businessId: { in: businessIds } },
      select: { revenueCents: true },
    }),
  ]);

  const roadmapPercents = roadmaps
    .filter((r) => r.tasks.length > 0)
    .map((r) => (r.tasks.filter((t) => t.status === "COMPLETED").length / r.tasks.length) * 100);
  const avgRoadmapCompletionPercent =
    roadmapPercents.length > 0
      ? Math.round(roadmapPercents.reduce((a, b) => a + b, 0) / roadmapPercents.length)
      : null;

  // Group every completed assessment per business, most-recent-first, so
  // we can read off "latest" and "previous" per business in one pass.
  const byBusiness = new Map<string, typeof assessments>();
  for (const a of assessments) {
    const list = byBusiness.get(a.businessId) ?? [];
    list.push(a);
    byBusiness.set(a.businessId, list);
  }

  const latestList: (typeof assessments)[number][] = [];
  const improvements: number[] = [];
  for (const list of byBusiness.values()) {
    const [latest, previous] = list; // already ordered desc by completedAt
    latestList.push(latest);
    if (latest.healthScorePercent !== null && previous?.healthScorePercent != null) {
      improvements.push(latest.healthScorePercent - previous.healthScorePercent);
    }
  }
  const avgHealthImprovement =
    improvements.length > 0 ? Math.round(improvements.reduce((a, b) => a + b, 0) / improvements.length) : null;

  const healthValues = latestList.map((a) => a.healthScorePercent).filter((v): v is number => v !== null);
  const avgHealthPercent =
    healthValues.length > 0 ? Math.round(healthValues.reduce((a, b) => a + b, 0) / healthValues.length) : null;

  const stageAverages: Record<Stage, number | null> = { PASSION: null, POWER: null, LEGACY: null };
  for (const stage of STAGES) {
    const values = latestList.flatMap((a) => a.scores.filter((s) => s.stage === stage).map((s) => s.scorePercent));
    stageAverages[stage] = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  }

  const jobsCreated = businesses.reduce((sum, b) => sum + (b.jobsCreatedSelfReported ?? 0), 0);
  const revenueRows = checkIns.filter((c) => c.revenueCents !== null);
  const revenueGrowthCents = revenueRows.length > 0 ? revenueRows.reduce((sum, c) => sum + (c.revenueCents ?? 0), 0) : null;

  return {
    participants: businessIds.length,
    assessmentCompletionCount,
    sessionAttendance,
    avgRoadmapCompletionPercent,
    avgHealthPercent,
    stageAverages,
    avgHealthImprovement,
    businessesLaunched,
    milestonesAchieved,
    systemsBuilt: sopCount + automationStepCount,
    jobsCreated,
    revenueGrowthCents,
  };
}
