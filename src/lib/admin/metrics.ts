import "server-only";

import { STATUSES_WITH_BUILDER_ACCESS } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";
import { STAGES, type Stage } from "@/lib/utils";

/**
 * ADMIN DASHBOARD (spec Prompt 11) — every number here is a direct
 * database count/average, never a placeholder. Run as one Promise.all
 * batch so the Overview page issues its queries in parallel rather than
 * serially.
 */
export async function getAdminDashboardMetrics() {
  const [
    userCount,
    assessmentsStarted,
    assessmentsCompleted,
    sessionRegistrations,
    sessionAttendance,
    builderActivations,
    memberships,
    roadmapTaskCounts,
    latestStageScores,
    latestHealthScores,
  ] = await Promise.all([
    prisma.user.count(),
    // NO FAKE ANALYTICS (Phase 7 continued: admin test accounts) — every
    // business-scoped count here excludes isTestAccount businesses, so
    // an admin previewing "what does a trial/annual member see" never
    // skews a real platform metric.
    prisma.assessment.count({
      where: { status: { in: ["IN_PROGRESS", "COMPLETED"] }, business: { isTestAccount: false } },
    }),
    prisma.assessment.count({ where: { status: "COMPLETED", business: { isTestAccount: false } } }),
    // OR businessId: null preserves counting registrations that predate a
    // business profile — a relation filter alone would silently drop them.
    prisma.sessionRegistration.count({
      where: {
        status: { not: "CANCELLED" },
        OR: [{ businessId: null }, { business: { isTestAccount: false } }],
      },
    }),
    prisma.sessionRegistration.count({
      where: {
        status: { in: ["ATTENDED", "COMPLETED"] },
        OR: [{ businessId: null }, { business: { isTestAccount: false } }],
      },
    }),
    prisma.business.count({ where: { builderAccessEligible: true, isTestAccount: false } }),
    prisma.membership.findMany({
      where: { business: { isTestAccount: false } },
      select: { status: true, plan: true },
    }),
    prisma.roadmapTask.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { roadmap: { business: { isTestAccount: false } } },
    }),
    // One row per business's most recent completed assessment's stage scores.
    prisma.assessmentScore.findMany({
      where: { assessment: { status: "COMPLETED", business: { isTestAccount: false } } },
      select: { stage: true, scorePercent: true, assessment: { select: { businessId: true, completedAt: true } } },
      orderBy: { assessment: { completedAt: "desc" } },
    }),
    prisma.assessment.findMany({
      where: { status: "COMPLETED", healthScorePercent: { not: null }, business: { isTestAccount: false } },
      select: { businessId: true, healthScorePercent: true, completedAt: true },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  const activeMembers = memberships.filter((m) => STATUSES_WITH_BUILDER_ACCESS.includes(m.status)).length;
  const monthlyMembers = memberships.filter((m) => m.status === "ACTIVE_MONTHLY").length;
  const annualMembers = memberships.filter((m) => m.status === "ACTIVE_ANNUAL").length;

  const taskTotal = roadmapTaskCounts.reduce((sum, g) => sum + g._count._all, 0);
  const taskCompleted = roadmapTaskCounts.find((g) => g.status === "COMPLETED")?._count._all ?? 0;
  const taskCompletionPercent = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : null;

  // Average roadmap completion % across businesses that have a roadmap
  // with at least one task (an empty roadmap contributes 0%, not "N/A" —
  // matches every other "no fake analytics" average in this app).
  const roadmapsWithTasks = await prisma.roadmap.findMany({
    where: { business: { isTestAccount: false } },
    include: { tasks: { select: { status: true } } },
  });
  const roadmapPercents = roadmapsWithTasks
    .filter((r) => r.tasks.length > 0)
    .map((r) => (r.tasks.filter((t) => t.status === "COMPLETED").length / r.tasks.length) * 100);
  const avgRoadmapProgress =
    roadmapPercents.length > 0
      ? Math.round(roadmapPercents.reduce((a, b) => a + b, 0) / roadmapPercents.length)
      : null;

  // Only the latest completed assessment per business counts toward the
  // stage/health averages — a business that reassessed shouldn't count
  // twice.
  const latestPerBusiness = new Map<string, Date>();
  for (const row of latestStageScores) {
    const existing = latestPerBusiness.get(row.assessment.businessId);
    if (!existing || row.assessment.completedAt! > existing) {
      latestPerBusiness.set(row.assessment.businessId, row.assessment.completedAt!);
    }
  }
  const stageAverages: Record<Stage, number | null> = { PASSION: null, POWER: null, LEGACY: null };
  for (const stage of STAGES) {
    const values = latestStageScores.filter(
      (row) =>
        row.stage === stage &&
        latestPerBusiness.get(row.assessment.businessId)?.getTime() === row.assessment.completedAt!.getTime(),
    );
    stageAverages[stage] =
      values.length > 0
        ? Math.round(values.reduce((sum, v) => sum + v.scorePercent, 0) / values.length)
        : null;
  }

  const latestHealthPerBusiness = new Map<string, { value: number; date: Date }>();
  for (const row of latestHealthScores) {
    const existing = latestHealthPerBusiness.get(row.businessId);
    if (!existing || row.completedAt! > existing.date) {
      latestHealthPerBusiness.set(row.businessId, { value: row.healthScorePercent!, date: row.completedAt! });
    }
  }
  const healthValues = Array.from(latestHealthPerBusiness.values()).map((v) => v.value);
  const avgHealth =
    healthValues.length > 0 ? Math.round(healthValues.reduce((a, b) => a + b, 0) / healthValues.length) : null;

  return {
    userCount,
    assessmentsStarted,
    assessmentsCompleted,
    sessionRegistrations,
    sessionAttendance,
    builderActivations,
    activeMembers,
    monthlyMembers,
    annualMembers,
    taskCompletionPercent,
    taskCompleted,
    taskTotal,
    avgRoadmapProgress,
    stageAverages,
    avgHealth,
  };
}
