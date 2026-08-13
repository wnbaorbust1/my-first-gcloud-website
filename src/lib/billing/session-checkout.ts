import "server-only";

import { getStripeClient } from "./stripe";

function appUrl(path: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

/**
 * QUALIFYING SESSION PAYMENT (Vision Board & Blueprint Generator, audited
 * 2026-08-13): a one-time $150 Stripe Checkout, deliberately `mode:
 * "payment"` — a completely separate flow from
 * src/lib/billing/checkout.ts's `mode: "subscription"` Membership
 * checkout. `metadata.kind = "session_payment"` is what
 * src/lib/billing/webhook-handlers.ts uses to route the resulting
 * `checkout.session.completed` event here instead of letting it fall
 * through to the (deliberately no-op for that event type) subscription
 * handling.
 */
export async function createSessionCheckoutSession(params: {
  registrationId: string;
  sessionOfferingId: string;
  priceCents: number;
  title: string;
  email: string;
}): Promise<string> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: params.title },
          unit_amount: params.priceCents,
        },
        quantity: 1,
      },
    ],
    success_url: appUrl("/sessions?checkout=success"),
    cancel_url: appUrl("/sessions?checkout=cancelled"),
    metadata: {
      kind: "session_payment",
      registrationId: params.registrationId,
      sessionOfferingId: params.sessionOfferingId,
    },
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return session.url;
}
