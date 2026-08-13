import "server-only";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess } from "@/lib/session";
import type { Role } from "@/generated/prisma/enums";

/** Loads a RoadmapTask and confirms the caller may access its business, or returns null. */
export async function loadAuthorizedTask(taskId: string, userId: string, role: Role) {
  const task = await prisma.roadmapTask.findUnique({
    where: { id: taskId },
    include: { taskTemplate: true, response: true, roadmap: true },
  });
  if (!task) return null;

  const allowed = await assertBusinessAccess(userId, role, task.roadmap.businessId);
  if (!allowed) return null;

  return task;
}
