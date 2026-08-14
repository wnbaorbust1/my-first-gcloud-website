import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { connectToAction } from "@/lib/affirmations/affirmations";
import { prisma } from "@/lib/prisma";
import { connectActionSchema } from "@/lib/validations/affirmations";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

/** "Connect it to today's action" (spec §7) — 5 points, once per business per affirmation per day. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = connectActionSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, input.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The task has to genuinely belong to this business's own roadmap —
  // never trust a client-supplied taskId without checking it.
  const task = await prisma.roadmapTask.findUnique({
    where: { id: input.taskId },
    select: { roadmap: { select: { businessId: true } } },
  });
  if (!task || task.roadmap.businessId !== input.businessId) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const created = await connectToAction(input.businessId, input.affirmationId, input.taskId);
  return NextResponse.json({ ok: true, alreadyLoggedToday: !created });
}
