import "server-only";

import { topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { MILESTONE_CATALOG } from "@/lib/progress/milestones";
import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/utils";

const PRIORITY_RANK = { MUST_DO: 0, SHOULD_DO: 1, BONUS: 2 } as const;

/**
 * MONTHLY REVIEW (spec Prompt 9): "Generate: Roadmap progress, Score
 * changes, Goals, Revenue, Leads, Sales, Achievements, Current
 * bottleneck, Recommended focus" — computed fresh from real data every
 * time, never stored/authored, so it's always current and there's
 * nothing to keep in sync. "Score changes" compares the two most recent
 * *completed* assessments (reassessment history), not a same-calendar-
 * month delta this schema has no way to compute honestly.
 */
export async function getMonthlyReview(businessId: string, monthDate: Date = new Date()) {
  const monthStart = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1));

  const [roadmap, assessments, goals, checkInsThisMonth, milestonesThisMonth] = await Promise.all([
    prisma.roadmap.findFirst({ where: { businessId }, include: { tasks: true } }),
    prisma.assessment.findMany({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 2,
      include: { scores: true, categoryScores: true },
    }),
    prisma.goal.findMany({ where: { businessId, status: "ACTIVE" } }),
    prisma.weeklyCheckIn.findMany({
      where: { businessId, weekOf: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.businessMilestone.findMany({
      where: { businessId, achievedAt: { gte: monthStart, lt: monthEnd } },
    }),
  ]);

  const tasks = roadmap?.tasks ?? [];
  const completedThisMonth = tasks.filter(
    (t) => t.status === "COMPLETED" && t.completedAt && t.completedAt >= monthStart && t.completedAt < monthEnd,
  );
  const roadmapProgress = {
    completedThisMonth: completedThisMonth.length,
    completedTotal: tasks.filter((t) => t.status === "COMPLETED").length,
    total: tasks.length,
    percent: tasks.length
      ? Math.round((tasks.filter((t) => t.status === "COMPLETED").length / tasks.length) * 100)
      : 0,
  };

  const [latest, previous] = assessments;
  const scoreChanges = latest
    ? (["PASSION", "POWER", "LEGACY"] as Stage[]).map((stage) => {
        const currentScore = latest.scores.find((s) => s.stage === stage)?.scorePercent ?? null;
        const previousScore = previous?.scores.find((s) => s.stage === stage)?.scorePercent ?? null;
        return {
          stage,
          current: currentScore,
          previous: previousScore,
          improvement: currentScore !== null && previousScore !== null ? currentScore - previousScore : null,
        };
      })
    : [];
  const healthChange = latest
    ? {
        current: latest.healthScorePercent,
        previous: previous?.healthScorePercent ?? null,
        improvement:
          latest.healthScorePercent !== null && previous?.healthScorePercent != null
            ? latest.healthScorePercent - previous.healthScorePercent
            : null,
      }
    : null;

  const leads = checkInsThisMonth.reduce((sum, c) => sum + (c.leads ?? 0), 0);
  const sales = checkInsThisMonth.reduce((sum, c) => sum + (c.sales ?? 0), 0);
  const revenueCents = checkInsThisMonth.reduce((sum, c) => sum + (c.revenueCents ?? 0), 0);

  const achievements = milestonesThisMonth.map(
    (m) => MILESTONE_CATALOG.find((c) => c.key === m.milestone)?.label ?? m.milestone,
  );

  const categoryScores = latest
    ? latest.categoryScores.map((c) => ({ stage: c.stage as Stage, category: c.category, scorePercent: c.scorePercent }))
    : [];
  const { priorities } = topStrengthsAndPriorities(categoryScores);
  const currentBottleneck = priorities[0] ?? null;

  const notStarted = tasks.filter((t) => t.status === "NOT_STARTED");
  const recommendedFocus = [...notStarted].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.order - b.order,
  )[0];

  return {
    monthLabel: monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    roadmapProgress,
    scoreChanges,
    healthChange,
    goals,
    leads,
    sales,
    revenueCents,
    achievements,
    currentBottleneck,
    recommendedFocus,
  };
}

export type MonthlyReview = Awaited<ReturnType<typeof getMonthlyReview>>;
