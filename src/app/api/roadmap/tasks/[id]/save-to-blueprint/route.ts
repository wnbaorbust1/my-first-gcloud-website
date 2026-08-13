import { NextResponse } from "next/server";

import { loadAuthorizedTask } from "@/lib/roadmap/auth";
import { saveTaskResponseToBlueprint } from "@/lib/roadmap/blueprint";
import { getCurrentUser } from "@/lib/session";

/** SAVE TO MY BLUEPRINT — writes the task's current saved answers into the Business Blueprint document. */
export async function POST(
  _request: Request,
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
  if (!task.response) {
    return NextResponse.json(
      { error: "Save a draft before saving to your Blueprint." },
      { status: 400 },
    );
  }

  await saveTaskResponseToBlueprint(taskId);
  return NextResponse.json({ ok: true });
}
