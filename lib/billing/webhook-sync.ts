import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { tierForPriceId } from "@/lib/billing/constants";
import type { StripeSubscriptionStatus, SubscriptionStatus, SubscriptionTier } from "@/types/supabase";

// Stripe's own Stripe.Subscription.Status type includes `OtherString` — an
// escape hatch for status values Stripe adds after this SDK version was
// published. Validate against the set our schema actually knows about
// (see the subscriptions table's check constraint) rather than trusting
// the SDK type, so a future unrecognized status degrades to a loud log
// instead of a DB constraint violation.
const KNOWN_STRIPE_STATUSES = new Set<StripeSubscriptionStatus>([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

function toKnownStatus(status: Stripe.Subscription.Status): StripeSubscriptionStatus | null {
  return KNOWN_STRIPE_STATUSES.has(status as StripeSubscriptionStatus)
    ? (status as StripeSubscriptionStatus)
    : null;
}

// profiles.subscription_status has a narrower domain than Stripe's own
// subscription.status (see the profiles migration) — anything that isn't
// a meaningfully "paying or trialing" state collapses to 'inactive'.
function toProfileStatus(stripeStatus: StripeSubscriptionStatus): SubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
      return stripeStatus;
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return "inactive";
  }
}

/**
 * Upserts `subscriptions` (keyed by stripe_subscription_id) and mirrors the
 * status onto the denormalized `profiles.subscription_status`, from a
 * Stripe Subscription object. Shared by every webhook event that carries a
 * subscription — checkout completion, plan changes, cancellation, and
 * payment-failure re-syncs — so there's exactly one place that turns
 * "what Stripe just told us" into "what our DB says."
 *
 * Note: Stripe API versions from 2025 on moved `current_period_end` and
 * `price` off the top-level Subscription object onto each subscription
 * item — see stripe/esm/resources/SubscriptionItems.d.ts. This assumes a
 * single-item subscription, true for every plan this app sells.
 */
export async function syncSubscriptionFromStripe(subscription: Stripe.Subscription): Promise<void> {
  const item = subscription.items.data[0];
  if (!item) {
    console.error("syncSubscriptionFromStripe: subscription has no items", subscription.id);
    return;
  }

  const admin = createAdminClient();

  // Prefer metadata set at checkout (mirrored onto subscription_data.metadata
  // — see createCheckoutSessionAction) since it's the only place we know
  // which specific course(s) a one_course/two_course plan covers. Stripe
  // preserves subscription metadata across portal-driven plan changes, so
  // this still holds after a self-serve upgrade/downgrade. Fall back to an
  // existing row (keyed by stripe_subscription_id) if metadata is ever
  // missing, rather than guessing.
  let profileId = subscription.metadata.profile_id ?? null;
  let tier: SubscriptionTier | null = (subscription.metadata.tier as SubscriptionTier) || null;
  let courseIds: string[] = [];
  if (subscription.metadata.course_ids) {
    try {
      courseIds = JSON.parse(subscription.metadata.course_ids);
    } catch {
      console.error("syncSubscriptionFromStripe: bad course_ids metadata", subscription.id);
    }
  }

  if (!profileId || !tier) {
    const { data: existing } = await admin
      .from("subscriptions")
      .select("profile_id, tier, course_ids")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (existing) {
      profileId ??= existing.profile_id;
      tier ??= existing.tier;
      if (courseIds.length === 0) courseIds = existing.course_ids;
    }
  }

  // Last resort: derive the tier from the price itself. Doesn't recover
  // course_ids for one_course/two_course (that only ever lived in
  // metadata), but keeps the tier/status correct rather than dropping the
  // event.
  if (!tier) {
    tier = tierForPriceId(item.price.id)?.tier ?? null;
  }

  if (!profileId || !tier) {
    console.error(
      "syncSubscriptionFromStripe: can't resolve profile_id/tier, skipping",
      subscription.id,
    );
    return;
  }

  const status = toKnownStatus(subscription.status);
  if (!status) {
    console.error(
      "syncSubscriptionFromStripe: unrecognized Stripe status, skipping",
      subscription.id,
      subscription.status,
    );
    return;
  }

  const { error: subError } = await admin.from("subscriptions").upsert(
    {
      profile_id: profileId,
      tier,
      status,
      stripe_customer_id:
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      current_period_end: new Date(item.current_period_end * 1000).toISOString(),
      course_ids: courseIds,
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (subError) {
    console.error("syncSubscriptionFromStripe: subscriptions upsert failed", subError);
    return;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ subscription_status: toProfileStatus(status) })
    .eq("id", profileId);

  if (profileError) {
    console.error("syncSubscriptionFromStripe: profiles update failed", profileError);
  }
}
