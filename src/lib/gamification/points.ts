import "server-only";

import type { PointsAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * POINTS TABLE (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §9). Two entries
 * from the spec table aren't awarded yet because the systems that would
 * trigger them don't exist in this pilot phase — LESSON and
 * MONTHLY_CHALLENGE (52-week curriculum, Phase C+) and SPRINT_90_DAY
 * (90-day sprint completion, same dependency). They're included here so
 * the table stays a complete, one-place reference; nothing calls
 * `awardPoints` with those actions yet.
 */
export const POINTS_TABLE: Record<PointsAction, number> = {
  DAILY_ACTION: 10,
  PROOF_UPLOADED: 10,
  ASSET_SAVED: 25,
  WEEKLY_REVIEW: 25,
  LESSON: 25,
  WEEKLY_MODULE: 50,
  MONTHLY_CHALLENGE: 100,
  MILESTONE: 100,
  REASSESSMENT_30_DAY: 50,
  SPRINT_90_DAY: 500,
};

/** Records one points event and returns the business's new total. Never edits or removes a prior row — see PointsLedger's doc comment. */
export async function awardPoints(businessId: string, action: PointsAction, note?: string): Promise<number> {
  await prisma.pointsLedger.create({
    data: { businessId, action, points: POINTS_TABLE[action], note },
  });
  return getTotalPoints(businessId);
}

export async function getTotalPoints(businessId: string): Promise<number> {
  const result = await prisma.pointsLedger.aggregate({
    where: { businessId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

/**
 * The 10 spec §9 levels. Point thresholds aren't specified by the spec
 * (only the ordered names are) — this is a first-pass, easily-retunable
 * curve sized against the real per-action point values above, not
 * arbitrary. Kept as a plain constant (like TASK_TEMPLATES) rather than
 * an admin-configurable table for this pilot phase; promote it to a
 * versioned config (matching AssessmentScoringConfig's pattern) if/when
 * real usage data says the curve needs live tuning.
 */
export const LEVELS: { name: string; threshold: number }[] = [
  { name: "Dreamer", threshold: 0 },
  { name: "Discoverer", threshold: 100 },
  { name: "Vision Builder", threshold: 300 },
  { name: "Business Builder", threshold: 600 },
  { name: "Business Owner", threshold: 1000 },
  { name: "Systems Builder", threshold: 1500 },
  { name: "Strategist", threshold: 2200 },
  { name: "CEO", threshold: 3000 },
  { name: "Legacy Leader", threshold: 4000 },
  { name: "Blueprint Mentor", threshold: 5500 },
];

export interface LevelState {
  name: string;
  index: number;
  totalPoints: number;
  /** null once the business has reached the top level. */
  pointsToNextLevel: number | null;
  nextLevelName: string | null;
}

/** Pure — no I/O, so this is unit-testable without a database. */
export function getLevel(totalPoints: number): LevelState {
  let current = LEVELS[0];
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalPoints >= LEVELS[i].threshold) {
      current = LEVELS[i];
      index = i;
    }
  }
  const next = LEVELS[index + 1] ?? null;
  return {
    name: current.name,
    index,
    totalPoints,
    pointsToNextLevel: next ? next.threshold - totalPoints : null,
    nextLevelName: next?.name ?? null,
  };
}

const GRACE_DAYS_PER_MONTH = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfUtcDay(b).getTime() - startOfUtcDay(a).getTime()) / MS_PER_DAY);
}

export interface StreakInput {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  graceDaysUsed: number;
  graceDaysResetAt: Date | null;
}
export interface StreakResult extends StreakInput {
  /** True when this call actually advanced the streak (vs. an idempotent same-day repeat). */
  changed: boolean;
}

/**
 * Pure streak transition (spec §9: "two grace days per month," "missed
 * days do not erase lifetime progress"). Idempotent for repeat calls on
 * the same UTC day — logging a second activity today doesn't double the
 * streak. Grace days reset on a rolling monthly basis from first use,
 * not a calendar-month boundary (simpler, and matches "per month" as a
 * rolling budget rather than a use-it-or-lose-it calendar reset).
 */
export function computeStreakTransition(input: StreakInput, now: Date): StreakResult {
  const { lastActivityDate } = input;

  if (lastActivityDate && daysBetween(lastActivityDate, now) === 0) {
    return { ...input, changed: false };
  }

  let graceDaysUsed = input.graceDaysUsed;
  let graceDaysResetAt = input.graceDaysResetAt;
  if (!graceDaysResetAt || now.getTime() - graceDaysResetAt.getTime() > 30 * MS_PER_DAY) {
    graceDaysUsed = 0;
    graceDaysResetAt = now;
  }

  let currentStreak: number;
  if (!lastActivityDate) {
    currentStreak = 1;
  } else {
    const gap = daysBetween(lastActivityDate, now);
    if (gap === 1) {
      currentStreak = input.currentStreak + 1;
    } else if (gap > 1 && graceDaysUsed + (gap - 1) <= GRACE_DAYS_PER_MONTH) {
      // The missed day(s) fit inside the remaining grace budget — streak survives.
      graceDaysUsed += gap - 1;
      currentStreak = input.currentStreak + 1;
    } else {
      currentStreak = 1;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(input.longestStreak, currentStreak),
    lastActivityDate: now,
    graceDaysUsed,
    graceDaysResetAt,
    changed: true,
  };
}

/** I/O wrapper — loads or creates the Streak row, applies the pure transition, persists if it actually changed. */
export async function recordActivity(businessId: string, now: Date = new Date()): Promise<StreakResult> {
  const existing = await prisma.streak.findUnique({ where: { businessId } });
  const input: StreakInput = existing ?? {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    graceDaysUsed: 0,
    graceDaysResetAt: null,
  };

  const result = computeStreakTransition(input, now);
  if (!result.changed) return result;

  await prisma.streak.upsert({
    where: { businessId },
    create: {
      businessId,
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      lastActivityDate: result.lastActivityDate,
      graceDaysUsed: result.graceDaysUsed,
      graceDaysResetAt: result.graceDaysResetAt,
    },
    update: {
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      lastActivityDate: result.lastActivityDate,
      graceDaysUsed: result.graceDaysUsed,
      graceDaysResetAt: result.graceDaysResetAt,
    },
  });

  return result;
}
