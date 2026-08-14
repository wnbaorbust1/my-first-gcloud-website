import { NextResponse } from "next/server";

import { loadAuthorizedTask } from "@/lib/roadmap/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/** Un-rescheduling a task — back into NOT_STARTED, eligible for Next Best Action again. Saved answers were never touched by pause, so nothing to restore. */
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

  if (task.status !== "PAUSED") {
    return NextResponse.json({ error: "This task isn't rescheduled." }, { status: 409 });
  }

  await prisma.roadmapTask.update({ where: { id: taskId }, data: { status: "NOT_STARTED" } });
  return NextResponse.json({ ok: true });
}
