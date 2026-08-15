import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { dashboardWelcomeSeenSchema } from "@/lib/validations/onboarding";

/**
 * ONBOARDING — TOUCHPOINT 2 (pre-publish audit follow-up). Dismisses the
 * one-time "welcome to your dashboard" moment. Idempotent — a second
 * call (e.g. a double-click) just re-sets the same field, no error.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = dashboardWelcomeSeenSchema.parse(body);
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

  await prisma.business.update({
    where: { id: input.businessId },
    data: { builderWelcomeSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
