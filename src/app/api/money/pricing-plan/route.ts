import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { calculatePricingPlan } from "@/lib/money/pricing-builder";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { pricingPlanSchema } from "@/lib/validations/money";

/** PRICING BUILDER (spec Prompt 9): calculates and saves one run. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = pricingPlanSchema.parse(body);
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

  const result = calculatePricingPlan(input);

  const plan = await prisma.pricingPlan.create({
    data: {
      businessId: input.businessId,
      offerName: input.offerName,
      deliveryTimeHours: input.deliveryTimeHours,
      directCostsCents: input.directCostsCents,
      desiredProfitCents: input.desiredProfitCents,
      capacityPerMonth: input.capacityPerMonth,
      estimatedLowCents: result.estimatedLowCents,
      estimatedHighCents: result.estimatedHighCents,
      considerations: result.considerations,
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
