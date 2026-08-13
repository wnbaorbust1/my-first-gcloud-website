import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createPortalSession } from "@/lib/billing/checkout";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { businessIdSchema } from "@/lib/validations/billing";

/** BILLING PAGE "Update Payment" / "Payment History" — Stripe's hosted Billing Portal. */
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

  // Authorization before the Stripe-configured check — see checkout/route.ts.
  const allowed = await assertBusinessAccess(user.id, user.role, input.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({ where: { businessId: input.businessId } });
  if (!membership?.stripeCustomerId) {
    return NextResponse.json({ error: "Subscribe first to manage billing." }, { status: 400 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't connected in this environment yet." },
      { status: 503 },
    );
  }

  try {
    const url = await createPortalSession(membership);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("createPortalSession failed", err);
    return NextResponse.json({ error: "Couldn't open the billing portal. Please try again." }, { status: 502 });
  }
}
