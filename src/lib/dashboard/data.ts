import "server-only";

import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { MILESTONE_CATALOG } from "@/lib/progress/milestones";
import { getUpcomingSessions } from "@/lib/sessions/queries";
import { prisma } from "@/lib/prisma";
import { STAGES, type Stage } from "@/lib/utils";

const PRIORITY_RANK = { MUST_DO: 0, SHOULD_DO: 1, BONUS: 2 } as const;

/**
 * One query bundle for the whole dashboard funnel (spec Prompt 4:
 * pre-session vs. post-session states), so /dashboard/page.tsx stays
 * readable. Every number here is read from the DB — nothing here is
 * fabricated, matching the "no fake analytics" requirement.
 */
export async function getDashboardData(userId: string) {
  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });

  if (!membership) {
    return { state: "no-business" as const };
  }

  const business = membership.business;

  const assessment = await prisma.assessment.findFirst({
    where: { businessId: business.id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    include: { scores: true },
  });

  if (!assessment) {
    return { state: "no-assessment" as const, business };
  }

  if (!business.builderAccessEligible) {
    const latestRegistration = await prisma.sessionRegistration.findFirst({
      where: { userId, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      include: { session: true },
    });
    return {
      state: "pre-session" as const,
      business,
      assessment,
      latestRegistration,
    };
  }

  // spec Prompt 8 EXPIRED ACCOUNT: once membership no longer grants
  // access, the dashboard degrades to a read-only summary instead of the
  // full active Builder view below — "Basic Account... Read-only summary
  // if appropriate" is exactly what this dashboard already is once it's
  // not showing live roadmap/task data.
  const billingMembership = await getSyncedMembership(business.id);
  const access = getBuilderAccessState(business.builderAccessEligible, billingMembership);
  if (access.locked) {
    return { state: "expired" as const, business, assessment, membership: billingMembership };
  }

  const roadmap = await prisma.roadmap.findFirst({
    where: { businessId: business.id },
    include: { tasks: { orderBy: { order: "asc" } } },
  });
  const tasks = roadmap?.tasks ?? [];

  const notStarted = tasks.filter((t) => t.status === "NOT_STARTED");
  const sortedByPriority = [...notStarted].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.order - b.order,
  );
  const nextBestAction = sortedByPriority[0] ?? null;

  const todaysBlueprint = {
    mustDo: notStarted.filter((t) => t.priority === "MUST_DO").sort((a, b) => a.order - b.order)[0],
    shouldDo: notStarted
      .filter((t) => t.priority === "SHOULD_DO")
      .sort((a, b) => a.order - b.order)[0],
    bonus: notStarted.filter((t) => t.priority === "BONUS").sort((a, b) => a.order - b.order)[0],
  };

  const roadmapSnapshot = {
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    ready: tasks.filter((t) => t.status === "NOT_STARTED").length,
    locked: tasks.filter((t) => t.status === "LOCKED").length,
    paused: tasks.filter((t) => t.status === "PAUSED").length,
  };

  const progressByStage: Record<Stage, { completed: number; total: number; percent: number }> =
    Object.fromEntries(
      STAGES.map((stage) => {
        const stageTasks = tasks.filter((t) => t.stage === stage);
        const completed = stageTasks.filter((t) => t.status === "COMPLETED").length;
        const total = stageTasks.length;
        return [stage, { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 }];
      }),
    ) as Record<Stage, { completed: number; total: number; percent: number }>;

  const [goal, lastAttendedRegistration, upcomingRegisteredRegistration, recommendedUpcoming, milestones] =
    await Promise.all([
      prisma.goal.findFirst({
        where: { businessId: business.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sessionRegistration.findFirst({
        where: { businessId: business.id, status: { in: ["ATTENDED", "COMPLETED"] } },
        orderBy: { checkedInAt: "desc" },
        include: { session: true },
      }),
      prisma.sessionRegistration.findFirst({
        where: {
          businessId: business.id,
          status: "REGISTERED",
          session: { startsAt: { gte: new Date() } },
        },
        orderBy: { session: { startsAt: "asc" } },
        include: { session: true },
      }),
      assessment.recommendedSessionType
        ? getUpcomingSessions(assessment.recommendedSessionType)
        : Promise.resolve([]),
      prisma.businessMilestone.findMany({
        where: { businessId: business.id },
        orderBy: { achievedAt: "desc" },
      }),
    ]);

  const milestoneSnapshot = {
    achievedCount: milestones.length,
    total: MILESTONE_CATALOG.length,
    recent: milestones.slice(0, 3).map((m) => ({
      key: m.milestone,
      label: MILESTONE_CATALOG.find((c) => c.key === m.milestone)?.label ?? m.milestone,
      achievedAt: m.achievedAt,
    })),
  };

  const recentWins = tasks
    .filter((t) => t.status === "COMPLETED")
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, 3);

  return {
    state: "builder" as const,
    business,
    assessment,
    nextBestAction,
    todaysBlueprint,
    roadmapSnapshot,
    progressByStage,
    goal,
    lastSession: lastAttendedRegistration,
    upcomingRegisteredSession: upcomingRegisteredRegistration,
    recommendedUpcomingSession: recommendedUpcoming[0] ?? null,
    recentWins,
    milestoneSnapshot,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
