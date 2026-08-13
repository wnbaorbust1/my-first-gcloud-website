import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { accountabilitySchema } from "@/lib/validations/progress";

/** ACCOUNTABILITY (spec Prompt 9): "Allow member to choose: 2 days/week, 3 days/week, 5 days/week, Custom." */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = accountabilitySchema.parse(body);
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

  const business = await prisma.business.update({
    where: { id: input.businessId },
    data: {
      accountabilityCadence: input.cadence,
      accountabilityCustomDays: input.cadence === "CUSTOM" ? (input.customDays ?? null) : null,
    },
  });

  return NextResponse.json({ business });
}
