import "server-only";

import type Stripe from "stripe";

import type { MembershipModel } from "@/generated/prisma/models/Membership";
import { prisma } from "@/lib/prisma";
import { unlockBuilderAccessIfQualifying } from "@/lib/sessions/qualification";

import { STRIPE_PRICE_IDS } from "./stripe";

async function findMembership(params: {
  businessId?: string | null;
  customerId?: string | null;
}): Promise<MembershipModel | null> {
  if (params.businessId) {
    const byBusiness = await prisma.membership.findUnique({ where: { businessId: params.businessId } });
    if (byBusiness) return byBusiness;
  }
  if (params.customerId) {
    return prisma.membership.findFirst({ where: { stripeCustomerId: params.customerId } });
  }
  return null;
}

function planForPriceId(priceId: string | undefined): "MONTHLY" | "ANNUAL" | null {
  if (!priceId) return null;
  if (priceId === STRIPE_PRICE_IDS.MONTHLY) return "MONTHLY";
  if (priceId === STRIPE_PRICE_IDS.ANNUAL) return "ANNUAL";
  return null;
}

function customerId(customer: string | { id: string } | null | undefined): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * Syncs a Membership from a Stripe Subscription object — the single
 * source of truth for ACTIVE_MONTHLY / ACTIVE_ANNUAL / PAYMENT_ISSUE /
 * CANCELLED / EXPIRED, used by both `customer.subscription.created` and
 * `.updated` (a renewal fires
 * `.updated` too, so one handler covers both). Reads `cancel_at_period_end`
 * *before* the raw Stripe status, so a subscription someone cancelled
 * from Stripe's own Billing Portal (not just our in-app Cancel button)
 * still shows as CANCELLED here, not ACTIVE_*.
 */
async function syncFromSubscription(subscription: Stripe.Subscription): Promise<void> {
  const businessId = subscription.metadata?.businessId;
  const membership = await findMembership({ businessId, customerId: customerId(subscription.customer) });
  if (!membership) return;

  const item = subscription.items.data[0];
  const plan = planForPriceId(item?.price?.id) ?? membership.plan ?? "MONTHLY";
  const currentPeriodEndsAt = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : membership.currentPeriodEndsAt;

  let status: MembershipModel["status"];
  if (subscription.status === "canceled") {
    status = "EXPIRED";
  } else if (subscription.cancel_at_period_end && subscription.status === "active") {
    status = "CANCELLED";
  } else if (subscription.status === "active" || subscription.status === "trialing") {
    status = plan === "ANNUAL" ? "ACTIVE_ANNUAL" : "ACTIVE_MONTHLY";
  } else if (["past_due", "unpaid", "incomplete"].includes(subscription.status)) {
    status = "PAYMENT_ISSUE";
  } else {
    status = membership.status;
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      status,
      plan,
      stripeSubscriptionId: subscription.id,
      currentPeriodEndsAt,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelledAt: subscription.cancel_at_period_end ? (membership.cancelledAt ?? new Date()) : null,
      convertedAt: membership.convertedAt ?? new Date(),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const membership = await findMembership({
    businessId: subscription.metadata?.businessId,
    customerId: customerId(subscription.customer),
  });
  if (!membership) return;
  await prisma.membership.update({ where: { id: membership.id }, data: { status: "EXPIRED" } });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subDetails = invoice.parent?.subscription_details;
  const businessId = subDetails?.metadata?.businessId;
  const membership = await findMembership({ businessId, customerId: customerId(invoice.customer) });
  if (!membership) return;

  await prisma.membershipInvoice.upsert({
    where: { stripeInvoiceId: invoice.id! },
    create: {
      membershipId: membership.id,
      stripeInvoiceId: invoice.id!,
      amountCents: invoice.amount_paid,
      currency: invoice.currency,
      status: "PAID",
      description: invoice.lines.data[0]?.description ?? null,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
      receiptUrl: invoice.hosted_invoice_url ?? null,
    },
    update: {},
  });
}

/** Failed payment (spec ACCEPTANCE CHECKLIST: "Failed payment does not erase data") — records the failure and flags the membership, never deletes anything. */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subDetails = invoice.parent?.subscription_details;
  const businessId = subDetails?.metadata?.businessId;
  const membership = await findMembership({ businessId, customerId: customerId(invoice.customer) });
  if (!membership) return;

  await prisma.$transaction([
    prisma.membershipInvoice.upsert({
      where: { stripeInvoiceId: invoice.id! },
      create: {
        membershipId: membership.id,
        stripeInvoiceId: invoice.id!,
        amountCents: invoice.amount_due,
        currency: invoice.currency,
        status: "FAILED",
        description: invoice.lines.data[0]?.description ?? null,
        periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
        periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
        receiptUrl: invoice.hosted_invoice_url ?? null,
      },
      update: {},
    }),
    prisma.membership.update({ where: { id: membership.id }, data: { status: "PAYMENT_ISSUE" } }),
  ]);
}

/**
 * SESSION PAYMENT (Vision Board & Blueprint Generator, audited
 * 2026-08-13): the $150 qualifying-session charge, created with
 * `metadata.kind = "session_payment"` by
 * src/lib/billing/session-checkout.ts. Writes directly onto the
 * `SessionRegistration` this checkout was for — never guesses which
 * registration by customer/email, only the registrationId stamped into
 * metadata at checkout-creation time. `update` (not `upsert`) is
 * deliberate: if the registration doesn't exist any more, that's a real
 * inconsistency worth a thrown error and a Stripe retry, not a silent
 * no-op.
 */
async function handleSessionPaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const registrationId = session.metadata?.registrationId;
  if (!registrationId) return;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await prisma.sessionRegistration.update({
    where: { id: registrationId },
    data: {
      paidAt: new Date(),
      amountPaidCents: session.amount_total,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
    },
  });

  // Covers the ordering where a facilitator already marked this
  // registration ATTENDED/COMPLETED before payment cleared — the same
  // unlock check src/lib/sessions/qualification.ts's markAttendance runs,
  // just triggered by payment landing instead of attendance landing.
  await unlockBuilderAccessIfQualifying(registrationId);
}

/** A new/updated card — the only Stripe event whose payload includes full card details inline, so this is the one place payment-method display fields get synced without an extra API round-trip. */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  if (!paymentMethod.card) return;
  const membership = await findMembership({ customerId: customerId(paymentMethod.customer) });
  if (!membership) return;

  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      paymentMethodBrand: paymentMethod.card.brand,
      paymentMethodLast4: paymentMethod.card.last4,
      paymentMethodExpMonth: paymentMethod.card.exp_month,
      paymentMethodExpYear: paymentMethod.card.exp_year,
    },
  });
}

/**
 * Dispatches one already signature-verified Stripe event.
 * `checkout.session.completed` fires for *both* the Membership
 * subscription flow and the one-time session-payment flow — it's routed
 * by `metadata.kind`, not by a second event type, because Stripe only
 * sends one `checkout.session.completed` per Checkout Session regardless
 * of mode. For a subscription Checkout it's still deliberately a no-op
 * here: `customer.subscription.created` fires around the same time and
 * carries the full subscription object inline, so it (not an extra
 * `subscriptions.retrieve` call from here) stays the single source of
 * truth for status/plan/period — exactly the same handler a renewal or a
 * Stripe-Portal-initiated cancellation later uses too.
 */
export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await syncFromSubscription(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "payment_method.attached":
      await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
      break;
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.kind === "session_payment") {
        await handleSessionPaymentCompleted(session);
      }
      break;
    }
    default:
      // Unhandled event types are a normal, expected no-op — Stripe
      // sends far more event types than this integration needs to act on.
      break;
  }
}
