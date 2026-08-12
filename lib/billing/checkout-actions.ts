"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/billing/stripe";
import { getPriceId, TIER_COURSE_COUNT, SUBSCRIPTION_TIERS } from "@/lib/billing/constants";
import type { SubscriptionTier } from "@/types/supabase";

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

const checkoutSchema = z.object({
  tier: z.enum(SUBSCRIPTION_TIERS as unknown as [SubscriptionTier, ...SubscriptionTier[]]),
  interval: z.enum(["monthly", "annual"]),
  courseIds: z.array(z.string().uuid()),
});

export type CheckoutActionState = { error: string | null };

/**
 * Creates a Stripe Checkout Session for the chosen plan and redirects the
 * teacher to it. Doesn't write anything to `subscriptions` itself — that
 * only happens once Stripe confirms the subscription via webhook (see
 * app/api/webhooks/stripe/route.ts), so there's no window where the app
 * thinks someone is subscribed before Stripe agrees.
 */
export async function createCheckoutSessionAction(
  _prevState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Couldn't load your account. Try signing in again." };

  const parsed = checkoutSchema.safeParse({
    tier: formData.get("tier"),
    interval: formData.get("interval"),
    courseIds: formData.getAll("courseIds"),
  });
  if (!parsed.success) {
    return { error: "Pick a plan and, if it needs one, a course." };
  }

  const { tier, interval, courseIds } = parsed.data;

  const expectedCount = TIER_COURSE_COUNT[tier];
  if (courseIds.length !== expectedCount) {
    return {
      error:
        expectedCount === 0
          ? "That plan doesn't need a course selection."
          : `Pick exactly ${expectedCount} course${expectedCount === 1 ? "" : "s"} for that plan.`,
    };
  }

  const priceId = getPriceId(tier, interval);
  if (!priceId) {
    return { error: "That plan isn't available yet — its Stripe price isn't configured." };
  }

  // Reuse an existing Stripe customer if this teacher has one from a past
  // subscription (even a canceled one) — avoids creating duplicate
  // customers in Stripe every time someone re-subscribes.
  const supabase = createClient();
  const { data: priorSub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stripe = getStripe();
  const siteUrl = getSiteUrl();
  const metadata = {
    profile_id: user.id,
    tier,
    course_ids: JSON.stringify(courseIds),
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    ...(priorSub?.stripe_customer_id
      ? { customer: priorSub.stripe_customer_id }
      : { customer_email: profile.email }),
    client_reference_id: user.id,
    metadata,
    subscription_data: { metadata },
    success_url: `${siteUrl}/account/billing?checkout=success`,
    cancel_url: `${siteUrl}/pricing?checkout=canceled`,
  });

  if (!session.url) {
    return { error: "Stripe didn't return a checkout link. Try again in a moment." };
  }

  redirect(session.url);
}
