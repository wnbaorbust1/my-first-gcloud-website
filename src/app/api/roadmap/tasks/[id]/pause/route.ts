import { NextResponse } from "next/server";

import { loadAuthorizedTask } from "@/lib/roadmap/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * RESCHEDULE (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §13: "allow the user
 * to... reschedule"). Pauses a task the member owns without touching its
 * TaskResponse — "reschedule without losing progress" (spec §6 Stuck
 * options) means exactly that: nothing here deletes or overwrites saved
 * answers, it only takes the task out of Next Best Action rotation until
 * the member resumes it (POST .../resume).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const task = await loadAuthorizedTask(taskId, user.id, user.role);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.status === "PAUSED") {
    return NextResponse.json({ ok: true }); // already paused — idempotent
  }
  if (task.status !== "NOT_STARTED" && task.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "This task can't be rescheduled right now." }, { status: 409 });
  }

  await prisma.roadmapTask.update({ where: { id: taskId }, data: { status: "PAUSED" } });
  return NextResponse.json({ ok: true });
}
