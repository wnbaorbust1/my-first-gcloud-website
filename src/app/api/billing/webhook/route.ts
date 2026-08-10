import { NextResponse } from "next/server";
import Stripe from "stripe";

import { handleStripeWebhookEvent } from "@/lib/billing/webhook-handlers";
import { prisma } from "@/lib/prisma";

/**
 * PAYMENT PROVIDER (spec Prompt 8): "Webhooks... Payment failure...
 * Cancellation... Reactivation... Receipts" and the acceptance checklist's
 * "Webhook events are validated." Two independent guarantees, both
 * required before anything is trusted:
 *
 * 1. Signature verification (`Stripe.webhooks.constructEvent`, a static
 *    method that needs only `STRIPE_WEBHOOK_SECRET` — no API key) —
 *    rejects anything not genuinely signed by Stripe with that secret.
 * 2. Idempotency (`StripeWebhookEvent`) — Stripe redelivers events on
 *    timeout/retry; a second delivery of the same event id is a no-op,
 *    never a double-applied state change.
 *
 * Reads the raw request body (`request.text()`, not `.json()`) because
 * signature verification is computed over the exact bytes Stripe sent —
 * a body that's been parsed and re-serialized would fail verification
 * even if genuinely from Stripe.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe-Signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const alreadyProcessed = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } });
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    await handleStripeWebhookEvent(event);
  } catch (err) {
    console.error("Stripe webhook handler failed", event.type, err);
    // Non-2xx tells Stripe to retry — safe, since our handlers are all
    // idempotent upserts and the event isn't recorded as processed yet.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  await prisma.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });

  return NextResponse.json({ ok: true });
}
