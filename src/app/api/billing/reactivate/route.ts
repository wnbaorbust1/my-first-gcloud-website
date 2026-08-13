import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createCheckoutSession, reactivateMembership } from "@/lib/billing/checkout";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { businessIdSchema } from "@/lib/validations/billing";

/**
 * BILLING PAGE "Reactivate." Two paths, both handled here so the client
 * doesn't need to know which one applies: a still-alive-but-cancelling
 * subscription just gets un-cancelled in place; a fully EXPIRED one gets
 * a brand-new Checkout Session (no new free trial — spec's EXISTING
 * MEMBER RULE applies to this too, since ensureMembershipActivated is
 * never re-invoked here).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.email) {
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
  if (!membership) {
    return NextResponse.json({ error: "No membership found." }, { status: 400 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't connected in this environment yet." },
      { status: 503 },
    );
  }

  try {
    const result = await reactivateMembership(membership);
    if (result.reactivated) {
      return NextResponse.json({ ok: true, mode: "reactivated" });
    }
    // Needs a fresh subscription — default back to whatever plan they
    // were last on, or MONTHLY if this business never had one.
    const url = await createCheckoutSession({
      membership,
      businessId: input.businessId,
      email: user.email,
      plan: membership.plan ?? "MONTHLY",
    });
    return NextResponse.json({ ok: true, mode: "checkout", url });
  } catch (err) {
    console.error("reactivateMembership failed", err);
    return NextResponse.json({ error: "Couldn't reactivate. Please try again." }, { status: 502 });
  }
}
