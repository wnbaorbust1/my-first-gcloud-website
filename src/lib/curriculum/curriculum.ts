import "server-only";

import type { ActionSize, WeekProgressStatus } from "@/generated/prisma/enums";
import { CURRICULUM_WEEKS } from "@/lib/curriculum/curriculum-weeks";
import { awardPoints, recordActivity } from "@/lib/gamification/points";
import { prisma } from "@/lib/prisma";

/** Idempotent — same pattern as ensureBadgesSeeded()/ensureAffirmationsSeeded(). Safe to call on every request that needs the curriculum. */
export async function ensureCurriculumSeeded(): Promise<void> {
  const count = await prisma.curriculumWeek.count();
  if (count >= CURRICULUM_WEEKS.length) return;

  for (const week of CURRICULUM_WEEKS) {
    await prisma.curriculumWeek.upsert({
      where: { weekNumber: week.weekNumber },
      update: {},
      create: {
        weekNumber: week.weekNumber,
        stage: week.stage,
        topic: week.topic,
        requiredAsset: week.requiredAsset,
        lesson: week.lesson,
        whyItMatters: week.whyItMatters,
        completedExample: week.completedExample,
        weeklyReviewPrompt: week.weeklyReviewPrompt,
        actions: {
          create: week.actions.map((a) => ({
            dayNumber: a.dayNumber,
            title: a.title,
            description: a.description,
            size: a.size,
          })),
        },
      },
    });
  }
}

export interface CurriculumActionView {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  size: ActionSize;
  completed: boolean;
  completedAt: Date | null;
}

export interface CurriculumWeekView {
  weekId: string;
  weekNumber: number;
  topic: string;
  requiredAsset: string;
  lesson: string;
  whyItMatters: string;
  completedExample: string;
  weeklyReviewPrompt: string;
}

export type CurrentWeekResult =
  | {
      state: "in-progress";
      week: CurriculumWeekView;
      progressStatus: WeekProgressStatus;
      reviewNote: string | null;
      actions: CurriculumActionView[];
      actionsCompletedCount: number;
      totalActions: number;
      nextWeekTopic: string | null;
    }
  | { state: "sprint-complete"; totalWeeksCompleted: number };

/**
 * The business's current curriculum week — the first not-yet-COMPLETED
 * week, in order (spec §5's weeks unlock sequentially, one at a time).
 * Self-heals: creates the BusinessWeekProgress row for the next week the
 * first time a business needs it, rather than depending on a UI action
 * that could become unreachable (see /build's ensureRoadmapGenerated for
 * the same pattern and the bug it was added to fix).
 */
export async function getCurrentWeek(businessId: string): Promise<CurrentWeekResult> {
  await ensureCurriculumSeeded();

  let progress = await prisma.businessWeekProgress.findFirst({
    where: { businessId, status: { not: "COMPLETED" } },
    orderBy: { week: { weekNumber: "asc" } },
    include: { week: { include: { actions: { orderBy: { dayNumber: "asc" } } } } },
  });

  if (!progress) {
    const completedCount = await prisma.businessWeekProgress.count({
      where: { businessId, status: "COMPLETED" },
    });
    const nextWeekNumber = completedCount + 1;
    const nextWeek = await prisma.curriculumWeek.findUnique({
      where: { weekNumber: nextWeekNumber },
      include: { actions: { orderBy: { dayNumber: "asc" } } },
    });

    if (!nextWeek) {
      // No more weeks seeded yet — this pilot phase only covers weeks 1-13.
      return { state: "sprint-complete", totalWeeksCompleted: completedCount };
    }

    progress = await prisma.businessWeekProgress.create({
      data: { businessId, weekId: nextWeek.id, status: "IN_PROGRESS", startedAt: new Date() },
      include: { week: { include: { actions: { orderBy: { dayNumber: "asc" } } } } },
    });
  }

  const actionIds = progress.week.actions.map((a) => a.id);
  const completions = await prisma.dailyActionCompletion.findMany({
    where: { businessId, dailyActionId: { in: actionIds } },
  });
  const completionByActionId = new Map(completions.map((c) => [c.dailyActionId, c]));

  const actions: CurriculumActionView[] = progress.week.actions.map((a) => {
    const completion = completionByActionId.get(a.id);
    return {
      id: a.id,
      dayNumber: a.dayNumber,
      title: a.title,
      description: a.description,
      size: a.size,
      completed: Boolean(completion),
      completedAt: completion?.completedAt ?? null,
    };
  });

  const nextWeekSeed = CURRICULUM_WEEKS.find((w) => w.weekNumber === progress!.week.weekNumber + 1);

  return {
    state: "in-progress",
    week: {
      weekId: progress.week.id,
      weekNumber: progress.week.weekNumber,
      topic: progress.week.topic,
      requiredAsset: progress.week.requiredAsset,
      lesson: progress.week.lesson,
      whyItMatters: progress.week.whyItMatters,
      completedExample: progress.week.completedExample,
      weeklyReviewPrompt: progress.week.weeklyReviewPrompt,
    },
    progressStatus: progress.status,
    reviewNote: progress.reviewNote,
    actions,
    actionsCompletedCount: actions.filter((a) => a.completed).length,
    totalActions: actions.length,
    nextWeekTopic: nextWeekSeed?.topic ?? null,
  };
}

/**
 * Logs one daily action as done. Idempotent via the unique constraint —
 * a duplicate click just returns false instead of double-awarding, same
 * pattern as affirmations' logEventOnce. Self-heals the week's
 * BusinessWeekProgress row into existence if it doesn't exist yet (e.g.
 * a direct API call before the dashboard card was ever rendered).
 */
export async function completeDailyAction(
  businessId: string,
  dailyActionId: string,
  proofNote?: string,
): Promise<boolean> {
  const action = await prisma.dailyAction.findUnique({ where: { id: dailyActionId }, select: { weekId: true } });
  if (!action) return false;

  try {
    await prisma.dailyActionCompletion.create({
      data: { businessId, dailyActionId, proofNote },
    });
  } catch {
    // Unique constraint hit — already logged, not an error.
    return false;
  }

  await prisma.businessWeekProgress.upsert({
    where: { businessId_weekId: { businessId, weekId: action.weekId } },
    update: {},
    create: { businessId, weekId: action.weekId, status: "IN_PROGRESS", startedAt: new Date() },
  });

  await Promise.all([
    awardPoints(businessId, "DAILY_ACTION", "Curriculum daily action completed"),
    recordActivity(businessId),
  ]);

  return true;
}

export type CompleteWeekResult = { ok: true } | { ok: false; reason: string };

/**
 * Marks a week COMPLETED — requires every daily action already logged and
 * a real weekly-review answer (spec §5: "a weekly review... proof of
 * completion"), never fabricated. Idempotent: re-submitting an
 * already-completed week succeeds without double-awarding points.
 */
export async function completeWeek(
  businessId: string,
  weekId: string,
  reviewNote: string,
): Promise<CompleteWeekResult> {
  const week = await prisma.curriculumWeek.findUnique({
    where: { id: weekId },
    include: { actions: { select: { id: true } } },
  });
  if (!week) return { ok: false, reason: "Week not found." };

  const completedCount = await prisma.dailyActionCompletion.count({
    where: { businessId, dailyActionId: { in: week.actions.map((a) => a.id) } },
  });
  if (completedCount < week.actions.length) {
    return { ok: false, reason: "Complete all 5 daily actions before finishing this week." };
  }

  const trimmed = reviewNote.trim();
  if (!trimmed) {
    return { ok: false, reason: "Write a short answer to the weekly review question first." };
  }

  const existing = await prisma.businessWeekProgress.findUnique({
    where: { businessId_weekId: { businessId, weekId } },
  });
  if (existing?.status === "COMPLETED") {
    return { ok: true };
  }

  await prisma.businessWeekProgress.upsert({
    where: { businessId_weekId: { businessId, weekId } },
    update: { status: "COMPLETED", reviewNote: trimmed, completedAt: new Date() },
    create: {
      businessId,
      weekId,
      status: "COMPLETED",
      reviewNote: trimmed,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  await Promise.all([
    awardPoints(businessId, "WEEKLY_MODULE", `Completed week: ${week.topic}`),
    recordActivity(businessId),
  ]);

  return { ok: true };
}
