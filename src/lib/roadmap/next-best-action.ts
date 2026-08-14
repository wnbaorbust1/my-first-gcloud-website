import "server-only";

import type { GoalType, TaskPriority } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { STAGE_META, type Stage } from "@/lib/utils";

/**
 * NEXT BEST ACTION ENGINE (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §13,
 * Phase D — pilot-scoped). The spec's 8-tier priority order is mapped
 * onto real signals already in this schema — nothing here is invented:
 *
 *   1. Safety/compliance requirement   — no such data exists in this
 *      schema (no task is tagged as a compliance item) — not applicable
 *      in this pilot, never faked as a tier.
 *   2. Missing prerequisite            — already structurally impossible
 *      to violate: only NOT_STARTED tasks (prerequisites satisfied) are
 *      ever passed in as candidates — see RoadmapTask.status/generate.ts.
 *   3. Facilitator priority            — RoadmapTask.facilitatorAdjusted.
 *   4. User's primary goal             — the business's ACTIVE Goal's
 *      goalType, matched to task category via GOAL_TYPE_CATEGORIES below.
 *   5. Largest assessment gap          — the BlueprintStage with the
 *      business's lowest real AssessmentScore.
 *   6. Revenue-producing action        — task category in
 *      REVENUE_CATEGORIES.
 *   7. System/efficiency improvement   — task category in
 *      SYSTEMS_CATEGORIES.
 *   8. Long-term growth action         — everything else (fallback).
 *
 * Ties within a tier fall back to this app's existing MUST_DO > SHOULD_DO
 * > BONUS > order convention (unchanged from the original Phase 4
 * heuristic this replaces).
 */

export interface EligibleTaskInput {
  id: string;
  title: string;
  stage: Stage;
  category: string | null;
  priority: TaskPriority;
  order: number;
  estimatedMins: number | null;
  facilitatorAdjusted: boolean;
}

export interface NextBestActionContext {
  activeGoalType: GoalType | null;
  lowestScoringStage: Stage | null;
}

export interface RankedNextBestAction {
  task: EligibleTaskInput;
  /** 3-8 — see the tier list above. Lower = higher priority. */
  tier: number;
  /** Plain-language "why" the spec requires the engine to always explain. */
  reason: string;
}

const REVENUE_CATEGORIES = new Set([
  "Pricing",
  "Revenue Goals",
  "Lead Generation",
  "Sales Process",
  "Follow-Up",
  "Recurring Revenue",
]);

const SYSTEMS_CATEGORIES = new Set(["SOPs", "Automation", "Operations", "CRM"]);

/** Which task categories most directly serve each spec GoalType (Task 9's 9 goal types). */
const GOAL_TYPE_CATEGORIES: Record<GoalType, Set<string>> = {
  REVENUE: new Set(["Pricing", "Revenue Goals", "Lead Generation", "Sales Process", "Business Overview", "Recurring Revenue"]),
  PROFIT: new Set(["Pricing", "Revenue Goals"]),
  LEADS: new Set(["Lead Generation", "Marketing"]),
  CUSTOMERS: new Set(["Ideal Customer", "Customer Pain Points", "Sales Process", "Customer Journey"]),
  LAUNCH: new Set(["Business Overview", "Elevator Pitch", "Value Proposition"]),
  MARKETING: new Set(["Marketing", "Lead Generation"]),
  SYSTEMS: new Set(["SOPs", "Automation", "Operations", "CRM"]),
  TEAM: new Set(["Team", "Hiring", "Delegation"]),
  PERSONAL_CEO: new Set(["Delegation", "Scaling Strategy", "Succession", "Legacy Plan"]),
};

const PRIORITY_RANK: Record<TaskPriority, number> = { MUST_DO: 0, SHOULD_DO: 1, BONUS: 2 };

/** Pure — the stage with the lowest real AssessmentScore, or null if there are no scores to compare. */
export function getLowestScoringStage(scores: { stage: Stage; scorePercent: number }[]): Stage | null {
  if (scores.length === 0) return null;
  return scores.reduce((lowest, s) => (s.scorePercent < lowest.scorePercent ? s : lowest)).stage;
}

/** Pure — no I/O, so this is unit-testable without a database. */
export function rankNextBestActions(
  tasks: EligibleTaskInput[],
  ctx: NextBestActionContext,
): RankedNextBestAction[] {
  const ranked = tasks.map((task): RankedNextBestAction => {
    if (task.facilitatorAdjusted) {
      return { task, tier: 3, reason: "Your facilitator flagged this as your next priority." };
    }
    if (ctx.activeGoalType && task.category && GOAL_TYPE_CATEGORIES[ctx.activeGoalType]?.has(task.category)) {
      return { task, tier: 4, reason: "This moves you directly toward your current goal." };
    }
    if (ctx.lowestScoringStage && task.stage === ctx.lowestScoringStage) {
      return {
        task,
        tier: 5,
        reason: `This closes your biggest gap — your ${STAGE_META[ctx.lowestScoringStage].label} score is your lowest right now.`,
      };
    }
    if (task.category && REVENUE_CATEGORIES.has(task.category)) {
      return { task, tier: 6, reason: "This is a revenue-producing action." };
    }
    if (task.category && SYSTEMS_CATEGORIES.has(task.category)) {
      return { task, tier: 7, reason: "This improves your systems and efficiency." };
    }
    return { task, tier: 8, reason: "This is a long-term growth action for your business." };
  });

  ranked.sort(
    (a, b) =>
      a.tier - b.tier ||
      PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority] ||
      a.task.order - b.task.order,
  );

  return ranked;
}

/**
 * spec §13: "allow the user to choose a smaller action." Picks the
 * highest-ranked remaining candidate with a strictly smaller time
 * estimate than the one being swapped away from; falls back to the next
 * best-ranked candidate if none is smaller (still real, still ranked —
 * never fabricated).
 */
export function pickSmallerAlternative(
  ranked: RankedNextBestAction[],
  currentTaskId: string,
): RankedNextBestAction | null {
  const current = ranked.find((r) => r.task.id === currentTaskId);
  const candidates = ranked.filter((r) => r.task.id !== currentTaskId);
  if (candidates.length === 0) return null;

  const currentMins = current?.task.estimatedMins ?? Infinity;
  const smaller = [...candidates]
    .filter((r) => (r.task.estimatedMins ?? Infinity) < currentMins)
    .sort((a, b) => (a.task.estimatedMins ?? 0) - (b.task.estimatedMins ?? 0))[0];

  return smaller ?? candidates[0];
}

/**
 * I/O wrapper — loads the same three real signals the dashboard already
 * has on hand (roadmap tasks, active goal, latest completed assessment
 * scores) for callers that don't already have them in scope, e.g. the
 * "show me something smaller" swap API route.
 */
export async function loadNextBestActionCandidates(
  businessId: string,
): Promise<{ ranked: RankedNextBestAction[] }> {
  const [roadmap, goal, assessment] = await Promise.all([
    prisma.roadmap.findFirst({
      where: { businessId },
      include: { tasks: { where: { status: "NOT_STARTED" }, orderBy: { order: "asc" } } },
    }),
    prisma.goal.findFirst({ where: { businessId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: { scores: true },
    }),
  ]);

  const tasks: EligibleTaskInput[] = (roadmap?.tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    stage: t.stage as Stage,
    category: t.category,
    priority: t.priority,
    order: t.order,
    estimatedMins: t.estimatedMins,
    facilitatorAdjusted: t.facilitatorAdjusted,
  }));

  const ctx: NextBestActionContext = {
    activeGoalType: goal?.goalType ?? null,
    lowestScoringStage: getLowestScoringStage(
      (assessment?.scores ?? []).map((s) => ({ stage: s.stage as Stage, scorePercent: s.scorePercent })),
    ),
  };

  return { ranked: rankNextBestActions(tasks, ctx) };
}
