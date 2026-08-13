import "server-only";

import type { MembershipModel } from "@/generated/prisma/models/Membership";
import { prisma } from "@/lib/prisma";

import { getStripeClient, STRIPE_PRICE_IDS } from "./stripe";

function appUrl(path: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

/** Creates (and persists) a Stripe Customer for this membership if it doesn't have one yet. */
async function ensureStripeCustomer(membership: MembershipModel, businessId: string, email: string) {
  if (membership.stripeCustomerId) return membership.stripeCustomerId;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email,
    metadata: { businessId, membershipId: membership.id },
  });
  await prisma.membership.update({
    where: { id: membership.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/**
 * Starts a subscription (spec BILLING PAGE "Change Plan" / initial
 * subscribe). Stripe Checkout — a hosted, PCI-scope-free page — is the
 * "proven, server-side" way to collect a card for a new subscription;
 * this function only ever creates a Session and returns its URL, it
 * never sees card data.
 */
export async function createCheckoutSession(params: {
  membership: MembershipModel;
  businessId: string;
  email: string;
  plan: "MONTHLY" | "ANNUAL";
}): Promise<string> {
  const priceId = STRIPE_PRICE_IDS[params.plan];
  if (!priceId) {
    throw new Error(`No Stripe price configured for plan ${params.plan}`);
  }

  const customerId = await ensureStripeCustomer(params.membership, params.businessId, params.email);
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: appUrl("/billing/return?checkout=success"),
    cancel_url: appUrl("/billing?checkout=cancelled"),
    subscription_data: {
      metadata: { businessId: params.businessId, membershipId: params.membership.id, plan: params.plan },
    },
    metadata: { businessId: params.businessId, membershipId: params.membership.id, plan: params.plan },
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return session.url;
}

/** Stripe's hosted Billing Portal — Update Payment + Payment History in one, spec-endorsed "proven provider" flow. */
export async function createPortalSession(membership: MembershipModel): Promise<string> {
  if (!membership.stripeCustomerId) {
    throw new Error("This membership has no Stripe customer yet — subscribe first.");
  }
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: membership.stripeCustomerId,
    return_url: appUrl("/billing"),
  });
  return session.url;
}

/** Cancel — access continues through the current paid period (spec), status flips immediately so the Billing page is honest about what happens next. */
export async function cancelMembership(membership: MembershipModel): Promise<void> {
  if (!membership.stripeSubscriptionId) {
    throw new Error("No active Stripe subscription to cancel.");
  }
  const stripe = getStripeClient();
  await stripe.subscriptions.update(membership.stripeSubscriptionId, { cancel_at_period_end: true });
  await prisma.membership.update({
    where: { id: membership.id },
    data: { status: "CANCELLED", cancelAtPeriodEnd: true, cancelledAt: new Date() },
  });
}

/**
 * Reactivate. Two cases: the Stripe subscription is still alive and just
 * flagged to not renew (undo the cancel_at_period_end flag, resumes the
 * same subscription — no new checkout, no new trial) — or it has
 * actually ended (EXPIRED), which needs a brand-new Checkout session
 * instead, since there's nothing left in Stripe to "un-cancel".
 */
export async function reactivateMembership(
  membership: MembershipModel,
): Promise<{ reactivated: true } | { reactivated: false; reason: "needs-new-checkout" }> {
  if (membership.status !== "CANCELLED" || !membership.stripeSubscriptionId) {
    return { reactivated: false, reason: "needs-new-checkout" };
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(membership.stripeSubscriptionId);
  if (subscription.status === "canceled") {
    return { reactivated: false, reason: "needs-new-checkout" };
  }

  await stripe.subscriptions.update(membership.stripeSubscriptionId, { cancel_at_period_end: false });
  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      status: membership.plan === "ANNUAL" ? "ACTIVE_ANNUAL" : "ACTIVE_MONTHLY",
      cancelAtPeriodEnd: false,
      cancelledAt: null,
    },
  });
  return { reactivated: true };
}
