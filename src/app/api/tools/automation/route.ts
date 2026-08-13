import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { createAutomationStepSchema } from "@/lib/validations/tools";

/** AUTOMATION MAPPER (spec Prompt 10): append a step to the visual sequence. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = createAutomationStepSchema.parse(body);
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

  const last = await prisma.automationStep.findFirst({
    where: { businessId: input.businessId },
    orderBy: { order: "desc" },
  });

  const step = await prisma.automationStep.create({
    data: { ...input, order: (last?.order ?? -1) + 1 },
  });

  return NextResponse.json({ step }, { status: 201 });
}
