import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { loadAuthorizedTask } from "@/lib/roadmap/auth";
import type { InstructionField } from "@/lib/roadmap/task-templates";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sanitizeAnswers, saveDraftSchema } from "@/lib/validations/roadmap";

/** SAVE DRAFT — upserts the structured answers, moves NOT_STARTED -> IN_PROGRESS. */
export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = saveDraftSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const instructions = (task.taskTemplate?.instructions as unknown as InstructionField[]) ?? [];
  const clean = sanitizeAnswers(instructions, input.answers);

  const existingAnswers = (task.response?.answers as Record<string, string> | undefined) ?? {};
  const merged = { ...existingAnswers, ...clean };

  await prisma.$transaction([
    prisma.taskResponse.upsert({
      where: { roadmapTaskId: taskId },
      create: { roadmapTaskId: taskId, answers: merged as never },
      update: { answers: merged as never },
    }),
    ...(task.status === "NOT_STARTED"
      ? [prisma.roadmapTask.update({ where: { id: taskId }, data: { status: "IN_PROGRESS" as const } })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
