import "server-only";

import { checkForNewMilestones } from "@/lib/progress/milestones";
import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/utils";

import type { InstructionField } from "./task-templates";

export const BLUEPRINT_DOCUMENT_TITLE = "My Blueprint";

/** Every business gets exactly one "My Blueprint" document, created on first use. */
export async function ensureBlueprintDocument(businessId: string) {
  const existing = await prisma.document.findFirst({
    where: { businessId, kind: "BLUEPRINT" },
  });
  if (existing) return existing;

  return prisma.document.create({
    data: { businessId, title: BLUEPRINT_DOCUMENT_TITLE, kind: "BLUEPRINT" },
  });
}

/** Renders structured step answers as readable text for the Blueprint document view. */
export function formatAnswersAsText(
  instructions: InstructionField[],
  answers: Record<string, unknown>,
): string {
  return instructions
    .map((field) => {
      const value = answers[field.key];
      if (!value) return null;
      return `${field.label}\n${String(value).trim()}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Spec: "Whenever a user clicks SAVE TO MY BLUEPRINT, save structured
 * data to the correct Blueprint section." Upserts (not appends) — a
 * section always reflects the task's current answers, and staying
 * editable afterward (Phase 6 My Blueprint) doesn't fight with it.
 */
export async function saveTaskResponseToBlueprint(roadmapTaskId: string): Promise<void> {
  const task = await prisma.roadmapTask.findUniqueOrThrow({
    where: { id: roadmapTaskId },
    include: { taskTemplate: true, response: true },
  });

  if (!task.taskTemplate?.blueprintDestination || !task.response) return;

  const roadmap = await prisma.roadmap.findUniqueOrThrow({ where: { id: task.roadmapId } });
  const document = await ensureBlueprintDocument(roadmap.businessId);

  const content = formatAnswersAsText(
    task.taskTemplate.instructions as unknown as InstructionField[],
    task.response.answers as Record<string, unknown>,
  );

  await prisma.documentSection.upsert({
    where: {
      documentId_title: {
        documentId: document.id,
        title: task.taskTemplate.blueprintDestination,
      },
    },
    create: {
      documentId: document.id,
      stage: task.stage as Stage,
      title: task.taskTemplate.blueprintDestination,
      content,
      order: task.taskTemplate.order,
      sourceRoadmapTaskId: task.id,
    },
    update: {
      content,
      sourceRoadmapTaskId: task.id,
    },
  });

  await prisma.taskResponse.update({
    where: { roadmapTaskId },
    data: { savedToBlueprintAt: new Date() },
  });

  await checkForNewMilestones(roadmap.businessId);
}
