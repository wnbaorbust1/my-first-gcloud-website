import "server-only";

import type { BusinessModel } from "@/generated/prisma/models/Business";
import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/utils";

import { TASK_TEMPLATES, type TaskTemplateSeed } from "./task-templates";

/** Business-profile fields that, if already filled in, seed a head start on the matching task. */
const EXISTING_WORK_MAP: { taskTitle: string; field: keyof BusinessModel; stepKey: string }[] = [
  { taskTitle: "Define Ideal Customer", field: "idealCustomer", stepKey: "who" },
  { taskTitle: "Identify Customer Pain Points", field: "primaryChallenge", stepKey: "top_pains" },
  { taskTitle: "Set 12-Month Goals", field: "primaryGoal", stepKey: "goal" },
  { taskTitle: "Finalize Products and Services", field: "primaryProductOrService", stepKey: "core_offers" },
];

const MATURITY_RANK: Record<string, number> = {
  "Idea Stage": 0,
  "Just Launched": 1,
  "Early Growth": 2,
  Established: 3,
  Scaling: 4,
};

export async function ensureTaskTemplatesSeeded(): Promise<void> {
  const count = await prisma.taskTemplate.count();
  if (count > 0) return;

  // Pass 1: insert every template (no dependency links yet — they
  // reference other rows in this same set, which don't have ids until
  // they exist).
  for (const t of TASK_TEMPLATES) {
    await prisma.taskTemplate.create({
      data: {
        stage: t.stage,
        category: t.category,
        title: t.title,
        whyItMatters: t.whyItMatters,
        thinkPrompt: t.thinkPrompt,
        instructions: t.instructions as never,
        implementGuidance: t.implementGuidance,
        measurePrompt: t.measurePrompt,
        difficulty: t.difficulty,
        impact: t.impact,
        priority: t.priority,
        estimatedMins: t.estimatedMins,
        blueprintDestination: t.blueprintDestination,
        order: t.order,
      },
    });
  }

  // Pass 2: connect prerequisites by title (spec TASK DEPENDENCIES).
  const rows = await prisma.taskTemplate.findMany({ select: { id: true, title: true } });
  const idByTitle = new Map(rows.map((r) => [r.title, r.id]));

  for (const t of TASK_TEMPLATES) {
    if (t.prerequisiteTitles.length === 0) continue;
    const taskId = idByTitle.get(t.title);
    const prereqIds = t.prerequisiteTitles.map((title) => idByTitle.get(title)).filter(Boolean) as string[];
    if (!taskId || prereqIds.length === 0) continue;
    await prisma.taskTemplate.update({
      where: { id: taskId },
      data: { prerequisites: { connect: prereqIds.map((id) => ({ id })) } },
    });
  }
}

interface PersonalizationInputs {
  categoryScores: Map<string, number>;
  stageScores: Record<Stage, number | null>;
  recommendedSessionType: Stage | null;
  maturityRank: number;
  goalKeywords: string[];
  facilitatorBoosts: Map<string, "MUST_DO" | "SHOULD_DO" | "BONUS">;
}

async function getPersonalizationInputs(businessId: string): Promise<PersonalizationInputs> {
  const [business, assessment, goals, facilitatorNotes] = await Promise.all([
    prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: { scores: true, categoryScores: true },
    }),
    prisma.goal.findMany({ where: { businessId, status: "ACTIVE" } }),
    prisma.facilitatorNote.findMany({
      where: { businessId, noteType: { in: ["RECOMMENDATION", "TASK_RECOMMENDATION"] } },
    }),
  ]);

  const categoryScores = new Map((assessment?.categoryScores ?? []).map((c) => [c.category, c.scorePercent]));
  const stageScores: Record<Stage, number | null> = { PASSION: null, POWER: null, LEGACY: null };
  for (const s of assessment?.scores ?? []) stageScores[s.stage as Stage] = s.scorePercent;

  const goalKeywords = goals
    .flatMap((g) => `${g.title} ${g.description ?? ""}`.toLowerCase().split(/\W+/))
    .filter((w) => w.length > 3);

  // Facilitator recommendations: a note naming a task title (case-insensitive
  // substring) bumps that task's priority to the note's assignedPriority,
  // or MUST_DO if none was set.
  const facilitatorBoosts = new Map<string, "MUST_DO" | "SHOULD_DO" | "BONUS">();
  for (const note of facilitatorNotes) {
    const text = note.note.toLowerCase();
    for (const t of TASK_TEMPLATES) {
      if (text.includes(t.title.toLowerCase())) {
        facilitatorBoosts.set(t.title, note.assignedPriority ?? "MUST_DO");
      }
    }
  }

  return {
    categoryScores,
    stageScores,
    recommendedSessionType:
      assessment?.recommendedSessionType && assessment.recommendedSessionType !== "GROWTH"
        ? (assessment.recommendedSessionType as Stage)
        : null,
    maturityRank: MATURITY_RANK[business.businessStage ?? ""] ?? 1,
    goalKeywords,
    facilitatorBoosts,
  };
}

/**
 * Personalization score — higher sorts earlier. Combines every signal
 * spec's ROADMAP ENGINE lists except "session attended" (handled
 * separately, since attending IS what triggers generation) and
 * "existing completed work" (handled by pre-filling/skipping ahead of
 * this, not by scoring).
 */
function scoreTask(t: TaskTemplateSeed, inputs: PersonalizationInputs): number {
  let score = 0;

  // Category gaps: weaker categories score higher.
  const categoryScore = inputs.categoryScores.get(t.category);
  score += categoryScore !== undefined ? 100 - categoryScore : 50;

  // Stage gaps, weighted more heavily than category (the stage average
  // is the more reliable signal).
  const stageScore = inputs.stageScores[t.stage];
  score += (stageScore !== null ? 100 - stageScore : 50) * 1.5;

  // The stage of the session they just attended is immediately relevant.
  if (inputs.recommendedSessionType === t.stage) score += 30;

  // Business maturity: established/scaling businesses lean toward
  // Legacy work; brand-new businesses lean toward Passion.
  if (t.stage === "LEGACY") score += inputs.maturityRank * 10;
  if (t.stage === "PASSION") score -= inputs.maturityRank * 5;

  // Active goals mentioning this task's category/title nudge it up.
  const haystack = `${t.category} ${t.title}`.toLowerCase();
  if (inputs.goalKeywords.some((kw) => haystack.includes(kw))) score += 20;

  // Facilitator recommendation is a strong, explicit signal.
  if (inputs.facilitatorBoosts.has(t.title)) score += 100;

  return score;
}

/**
 * Generates a business's personalized Roadmap the moment Builder access
 * unlocks. Idempotent — a business that already has a Roadmap keeps it.
 *
 * Two independent mechanisms combine, matching the spec exactly:
 * - ORDER comes from `scoreTask` (assessment scores, category gaps,
 *   session attended, business goals, business maturity, facilitator
 *   recommendations) — different businesses get different priorities.
 * - LOCK STATUS comes purely from TASK DEPENDENCIES — a task is Ready
 *   only once every prerequisite is complete, regardless of score.
 * "Existing completed work": business-profile fields already filled in
 * pre-seed a draft answer on the matching task (never a false COMPLETE —
 * one field rarely answers a whole multi-step task honestly).
 */
export async function ensureRoadmapGenerated(businessId: string) {
  const existing = await prisma.roadmap.findFirst({ where: { businessId } });
  if (existing) return existing;

  await ensureTaskTemplatesSeeded();

  const [templates, inputs, business] = await Promise.all([
    prisma.taskTemplate.findMany({
      where: { isActive: true },
      include: { prerequisites: { select: { title: true } } },
    }),
    getPersonalizationInputs(businessId),
    prisma.business.findUniqueOrThrow({ where: { id: businessId } }),
  ]);

  const seedByTitle = new Map(TASK_TEMPLATES.map((t) => [t.title, t]));
  const scored = templates
    .map((tpl) => {
      const seed = seedByTitle.get(tpl.title);
      const score = seed ? scoreTask(seed, inputs) : 0;
      const priority = inputs.facilitatorBoosts.get(tpl.title) ?? tpl.priority;
      return { tpl, score, priority };
    })
    .sort((a, b) => b.score - a.score);

  const roadmap = await prisma.roadmap.create({ data: { businessId } });

  // A task is Ready only if it has zero prerequisites (a task with
  // prerequisites can never start unlocked on a brand-new roadmap, since
  // nothing is complete yet).
  const taskRows = scored.map(({ tpl, priority }, index) => ({
    roadmapId: roadmap.id,
    taskTemplateId: tpl.id,
    stage: tpl.stage,
    category: tpl.category,
    title: tpl.title,
    description: tpl.whyItMatters,
    priority,
    estimatedMins: tpl.estimatedMins,
    order: index,
    status: (tpl.prerequisites.length === 0 ? "NOT_STARTED" : "LOCKED") as "NOT_STARTED" | "LOCKED",
  }));

  await prisma.roadmapTask.createMany({ data: taskRows });

  // Existing completed work: pre-seed a draft answer where the business
  // profile already has the relevant data, and nudge that task to
  // IN_PROGRESS if it isn't dependency-locked.
  const createdTasks = await prisma.roadmapTask.findMany({ where: { roadmapId: roadmap.id } });
  const taskByTitle = new Map(createdTasks.map((t) => [t.title, t]));

  for (const mapping of EXISTING_WORK_MAP) {
    const value = business[mapping.field];
    if (!value || typeof value !== "string") continue;
    const task = taskByTitle.get(mapping.taskTitle);
    if (!task) continue;

    await prisma.taskResponse.create({
      data: { roadmapTaskId: task.id, answers: { [mapping.stepKey]: value } as never },
    });
    if (task.status === "NOT_STARTED") {
      await prisma.roadmapTask.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });
    }
  }

  return roadmap;
}

/**
 * After a task is marked COMPLETED, check every LOCKED task in the same
 * roadmap and unlock (→ NOT_STARTED) any whose prerequisites are now all
 * COMPLETED.
 */
export async function recomputeUnlocks(roadmapId: string): Promise<void> {
  const lockedTasks = await prisma.roadmapTask.findMany({
    where: { roadmapId, status: "LOCKED" },
    include: { taskTemplate: { include: { prerequisites: { select: { title: true } } } } },
  });
  if (lockedTasks.length === 0) return;

  const completedTitles = new Set(
    (
      await prisma.roadmapTask.findMany({
        where: { roadmapId, status: "COMPLETED" },
        select: { title: true },
      })
    ).map((t) => t.title),
  );

  const toUnlock = lockedTasks.filter((t) => {
    const prereqTitles = t.taskTemplate?.prerequisites.map((p) => p.title) ?? [];
    return prereqTitles.length > 0 && prereqTitles.every((title) => completedTitles.has(title));
  });

  if (toUnlock.length > 0) {
    await prisma.roadmapTask.updateMany({
      where: { id: { in: toUnlock.map((t) => t.id) } },
      data: { status: "NOT_STARTED" },
    });
  }
}
