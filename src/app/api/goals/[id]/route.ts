import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { updateGoalSchema } from "@/lib/validations/goal";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: goalId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, goal.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = updateGoalSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: input,
  });

  return NextResponse.json({ goal: updated });
}
