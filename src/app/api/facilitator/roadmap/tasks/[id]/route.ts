import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { hasAnyRole, STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { updateRoadmapTaskSchema } from "@/lib/validations/facilitator-roadmap";

async function authorizeTask(taskId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  if (!hasAnyRole(user.role, STAFF_ROLES)) {
    return { error: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }

  const task = await prisma.roadmapTask.findUnique({ where: { id: taskId }, include: { roadmap: true } });
  if (!task) return { error: NextResponse.json({ error: "Task not found" }, { status: 404 }) };

  const allowed = await assertBusinessAccess(user.id, user.role, task.roadmap.businessId);
  if (!allowed) return { error: NextResponse.json({ error: "Not authorized for this business" }, { status: 403 }) };

  return { task };
}

/** Facilitator control: change priority, pause, unlock (override), or reorder. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await params;
  const auth = await authorizeTask(taskId);
  if (auth.error) return auth.error;
  const task = auth.task!;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = updateRoadmapTaskSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (input.move) {
    const neighbor = await prisma.roadmapTask.findFirst({
      where: {
        roadmapId: task.roadmapId,
        order: input.move === "up" ? { lt: task.order } : { gt: task.order },
      },
      orderBy: { order: input.move === "up" ? "desc" : "asc" },
    });
    if (neighbor) {
      await prisma.$transaction([
        prisma.roadmapTask.update({ where: { id: task.id }, data: { order: neighbor.order, facilitatorAdjusted: true } }),
        prisma.roadmapTask.update({ where: { id: neighbor.id }, data: { order: task.order } }),
      ]);
    }
  }

  if (input.priority || input.status) {
    await prisma.roadmapTask.update({
      where: { id: task.id },
      data: {
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.status ? { status: input.status } : {}),
        facilitatorAdjusted: true,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

/** Facilitator control: remove a task from the roadmap. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await params;
  const auth = await authorizeTask(taskId);
  if (auth.error) return auth.error;

  await prisma.roadmapTask.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
