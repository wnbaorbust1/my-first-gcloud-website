import "server-only";

import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/utils";
import { STAGES } from "@/lib/utils";

import { TASK_TEMPLATES } from "./task-templates";

export async function ensureTaskTemplatesSeeded(): Promise<void> {
  const count = await prisma.taskTemplate.count();
  if (count > 0) return;

  await prisma.taskTemplate.createMany({
    data: TASK_TEMPLATES.map((t) => ({
      stage: t.stage,
      title: t.title,
      description: t.description,
      priority: t.priority,
      estimatedMins: t.estimatedMins,
      order: t.order,
    })),
  });
}

/**
 * Generates a business's starter Roadmap the first time it's needed
 * (called when a qualifying session unlocks Builder access — see
 * src/lib/sessions/qualification.ts). Idempotent: a business that
 * already has a Roadmap keeps it untouched.
 *
 * "Personalization" here is a deterministic rule, not AI (explicitly out
 * of scope for this phase): stages are ordered weakest-assessment-score
 * first, so the business's biggest gap surfaces as the first unlocked
 * set of tasks. Every task template's priority (Must Do / Should Do /
 * Bonus) carries through unchanged — only the *stage order*, and which
 * stage starts unlocked, is personalized.
 */
export async function ensureRoadmapGenerated(businessId: string) {
  const existing = await prisma.roadmap.findFirst({ where: { businessId } });
  if (existing) return existing;

  await ensureTaskTemplatesSeeded();

  const [templates, latestAssessment] = await Promise.all([
    prisma.taskTemplate.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: { scores: true },
    }),
  ]);

  const scoreByStage = new Map(
    (latestAssessment?.scores ?? []).map((s) => [s.stage as Stage, s.scorePercent]),
  );
  const stageOrder = [...STAGES].sort(
    (a, b) => (scoreByStage.get(a) ?? 0) - (scoreByStage.get(b) ?? 0),
  );

  const roadmap = await prisma.roadmap.create({ data: { businessId } });

  let order = 0;
  const taskRows = stageOrder.flatMap((stage, stageIndex) =>
    templates
      .filter((t) => t.stage === stage)
      .map((template) => ({
        roadmapId: roadmap.id,
        taskTemplateId: template.id,
        stage: template.stage,
        title: template.title,
        description: template.description,
        priority: template.priority,
        estimatedMins: template.estimatedMins,
        order: order++,
        // Only the weakest stage starts actionable; later stages stay
        // locked until earlier ones are worked through (spec's Visual
        // Blueprint Roadmap: checkmarks, current-step highlight, locks).
        status: stageIndex === 0 ? ("NOT_STARTED" as const) : ("LOCKED" as const),
      })),
  );

  if (taskRows.length > 0) {
    await prisma.roadmapTask.createMany({ data: taskRows });
  }

  return roadmap;
}
