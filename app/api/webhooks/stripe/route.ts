import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/webhook-sync";

// Needs the raw request body for Stripe's signature check (request.text()
// below), and the Stripe SDK isn't edge-compatible — Node runtime, not the
// Edge runtime some route handlers default to.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("Stripe webhook: missing signature header or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook: signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    // Fires once the teacher completes Checkout. The subscription already
    // exists in Stripe by this point — fetch it (rather than trusting the
    // event payload's nested state) so we sync from the same authoritative
    // shape every event type uses.
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionFromStripe(subscription);
      }
      break;
    }

    // Covers plan upgrades/downgrades and status transitions (trialing ->
    // active, active -> past_due, etc.) made either by Stripe automatically
    // or by the teacher via the Customer Portal.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscriptionFromStripe(event.data.object);
      break;
    }

    // A failed renewal charge doesn't always also emit
    // customer.subscription.updated (depends on Stripe's retry schedule),
    // so re-sync explicitly rather than relying on that event to cover it.
    //
    // API note: `invoice.subscription` was removed from the top-level
    // Invoice object in recent Stripe API versions — the subscription
    // link now lives at invoice.parent.subscription_details.subscription
    // (see stripe/esm/resources/Invoices.d.ts).
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const linkedSubscription = invoice.parent?.subscription_details?.subscription ?? null;
      const subscriptionId =
        typeof linkedSubscription === "string" ? linkedSubscription : (linkedSubscription?.id ?? null);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscriptionFromStripe(subscription);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
