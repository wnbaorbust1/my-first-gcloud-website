import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { cancelMembership } from "@/lib/billing/checkout";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { businessIdSchema } from "@/lib/validations/billing";

/** BILLING PAGE "Cancel" — spec: "Allow access through current paid billing period. Do not delete Blueprint content." */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = businessIdSchema.parse(body);
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

  const membership = await prisma.membership.findUnique({ where: { businessId: input.businessId } });
  if (!membership || !["ACTIVE_MONTHLY", "ACTIVE_ANNUAL"].includes(membership.status)) {
    return NextResponse.json({ error: "No active paid subscription to cancel." }, { status: 400 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't connected in this environment yet." },
      { status: 503 },
    );
  }

  try {
    await cancelMembership(membership);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("cancelMembership failed", err);
    return NextResponse.json({ error: "Couldn't cancel. Please try again." }, { status: 502 });
  }
}
