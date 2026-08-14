import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { awardPoints, recordActivity } from "@/lib/gamification/points";
import { loadAuthorizedTask } from "@/lib/roadmap/auth";
import { saveTaskResponseToBlueprint } from "@/lib/roadmap/blueprint";
import { recomputeUnlocks } from "@/lib/roadmap/generate";
import type { InstructionField } from "@/lib/roadmap/task-templates";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sanitizeAnswers, saveDraftSchema } from "@/lib/validations/roadmap";

/**
 * MARK COMPLETE — saves the final answers (if provided), always writes
 * them to the Business Blueprint (spec: completed tasks populate My
 * Blueprint), marks the task COMPLETED, and unlocks any dependent tasks
 * whose prerequisites are now all satisfied.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: taskId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const task = await loadAuthorizedTask(taskId, user.id, user.role);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.status === "LOCKED") {
    return NextResponse.json({ error: "This task is still locked." }, { status: 409 });
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let answers: Record<string, string> | undefined;
  if (body && typeof body === "object" && "answers" in body) {
    try {
      answers = saveDraftSchema.parse(body).answers;
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: err.issues[0]?.message ?? "Invalid input" },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
  }

  if (answers) {
    const instructions = (task.taskTemplate?.instructions as unknown as InstructionField[]) ?? [];
    const clean = sanitizeAnswers(instructions, answers);
    const existingAnswers = (task.response?.answers as Record<string, string> | undefined) ?? {};
    const merged = { ...existingAnswers, ...clean };
    await prisma.taskResponse.upsert({
      where: { roadmapTaskId: taskId },
      create: { roadmapTaskId: taskId, answers: merged as never },
      update: { answers: merged as never },
    });
  }

  const hasResponse = answers || task.response;
  if (hasResponse) {
    await saveTaskResponseToBlueprint(taskId);
  }

  // Idempotency: re-submitting an already-completed task (e.g. a
  // duplicate request) must not award points twice.
  const wasAlreadyComplete = task.status === "COMPLETED";

  await prisma.roadmapTask.update({
    where: { id: taskId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await recomputeUnlocks(task.roadmapId);

  if (!wasAlreadyComplete) {
    const businessId = task.roadmap.businessId;
    await Promise.all([
      awardPoints(businessId, "DAILY_ACTION", task.title),
      recordActivity(businessId),
    ]);
  }

  return NextResponse.json({ ok: true });
}
