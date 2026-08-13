import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { createJourneyStageSchema } from "@/lib/validations/tools";

/** CUSTOMER JOURNEY BUILDER (spec Prompt 10): add a custom stage at the end. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = createJourneyStageSchema.parse(body);
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

  const last = await prisma.journeyStage.findFirst({
    where: { businessId: input.businessId },
    orderBy: { order: "desc" },
  });

  const stage = await prisma.journeyStage.create({
    data: {
      businessId: input.businessId,
      name: input.name,
      description: input.description,
      order: (last?.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ stage }, { status: 201 });
}
