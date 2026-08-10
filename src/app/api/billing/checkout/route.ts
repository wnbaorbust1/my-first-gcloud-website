import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createCheckoutSession } from "@/lib/billing/checkout";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { startCheckoutSchema } from "@/lib/validations/billing";

/** PRICING PAGE / BILLING PAGE "Change Plan": starts a Stripe Checkout Session for Monthly or Annual. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = startCheckoutSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Authorization is checked before the Stripe-configured check (and
  // before any other 4xx below) so an unauthorized caller always gets a
  // flat 404 regardless of this environment's billing configuration —
  // never a hint about another business's billing state.
  const allowed = await assertBusinessAccess(user.id, user.role, input.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({ where: { businessId: input.businessId } });
  if (!membership) {
    return NextResponse.json(
      { error: "This business hasn't attended a qualifying session yet." },
      { status: 400 },
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't connected in this environment yet. Set STRIPE_SECRET_KEY to enable real checkout." },
      { status: 503 },
    );
  }

  try {
    const url = await createCheckoutSession({
      membership,
      businessId: input.businessId,
      email: user.email,
      plan: input.plan,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("createCheckoutSession failed", err);
    return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
