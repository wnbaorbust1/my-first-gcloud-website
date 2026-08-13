import { NextResponse } from "next/server";

import { createSessionCheckoutSession } from "@/lib/billing/session-checkout";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * Starts a one-time Stripe Checkout for this registration's qualifying-
 * session price. Owner-only (a Checkout redirect collects the payer's
 * own card in their own browser — there's no "pay on someone else's
 * behalf" version of this for staff to trigger).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: registrationId } = await params;

  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const registration = await prisma.sessionRegistration.findUnique({
    where: { id: registrationId },
    include: { session: true },
  });
  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }
  if (registration.userId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (registration.paidAt) {
    return NextResponse.json({ error: "This session is already paid for." }, { status: 400 });
  }
  const priceCents = registration.session.priceCents;
  if (!priceCents || priceCents <= 0) {
    return NextResponse.json({ error: "This session doesn't require payment." }, { status: 400 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Billing isn't connected in this environment yet. Set STRIPE_SECRET_KEY to enable real checkout.",
      },
      { status: 503 },
    );
  }

  try {
    const url = await createSessionCheckoutSession({
      registrationId: registration.id,
      sessionOfferingId: registration.sessionId,
      priceCents,
      title: registration.session.title,
      email: user.email,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("createSessionCheckoutSession failed", err);
    return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
