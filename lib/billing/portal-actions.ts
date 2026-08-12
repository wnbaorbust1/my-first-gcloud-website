"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/billing/stripe";

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export type PortalActionState = { error: string | null };

/**
 * Sends the teacher to Stripe's hosted Customer Portal for self-serve plan
 * changes, cancellation, and payment-method updates. Requires a Stripe
 * customer to already exist, which only happens after at least one
 * checkout — a teacher who's never subscribed has nothing to manage yet.
 */
export async function createPortalSessionAction(
  // Neither param is read — useFormState requires this exact (prevState,
  // formData) signature regardless, and there's no form input to collect.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: PortalActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<PortalActionState> {
  await requireUser();

  const supabase = createClient();
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("createPortalSessionAction: subscription lookup failed", error);
    return { error: "Couldn't load your billing account. Try again in a moment." };
  }
  if (!sub?.stripe_customer_id) {
    return { error: "No billing account yet — subscribe to a plan first." };
  }

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${getSiteUrl()}/account/billing`,
  });

  redirect(portalSession.url);
}
