import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { calculateRevenuePlan } from "@/lib/money/revenue-planner";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { revenuePlanSchema } from "@/lib/validations/money";

/** REVENUE PLANNER (spec Prompt 9): calculates and saves one run. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = revenuePlanSchema.parse(body);
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

  const result = calculateRevenuePlan(input);

  const plan = await prisma.revenuePlan.create({
    data: {
      businessId: input.businessId,
      revenueGoalCents: input.revenueGoalCents,
      offerPriceCents: input.offerPriceCents,
      conversionRatePercent: input.conversionRatePercent,
      workingWeeks: input.workingWeeks,
      salesNeeded: result.salesNeeded,
      leadsNeeded: result.leadsNeeded,
      monthlyTargetCents: result.monthlyTargetCents,
      weeklyTargetCents: result.weeklyTargetCents,
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
