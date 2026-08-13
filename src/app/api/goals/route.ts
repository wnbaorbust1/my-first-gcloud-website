import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { createGoalSchema } from "@/lib/validations/goal";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = createGoalSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, input.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized for this business" }, { status: 403 });
  }

  const goal = await prisma.goal.create({
    data: {
      businessId: input.businessId,
      userId: user.id,
      title: input.title,
      description: input.description,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      ...(input.cadence ? { cadence: input.cadence } : {}),
      ...(input.goalType ? { goalType: input.goalType } : {}),
      targetValue: input.targetValue,
      unit: input.unit,
    },
  });

  return NextResponse.json({ goal }, { status: 201 });
}
