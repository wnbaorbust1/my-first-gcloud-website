import type { SubscriptionTier } from "@/types/supabase";

export type BillingInterval = "monthly" | "annual";

export const SUBSCRIPTION_TIERS = [
  "full_year",
  "one_course",
  "two_course",
] as const satisfies readonly SubscriptionTier[];

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  full_year: "Full Access",
  one_course: "One Course",
  two_course: "Two Courses",
};

export const TIER_DESCRIPTIONS: Record<SubscriptionTier, string> = {
  full_year: "Every course, every subject — all 8 unlocked.",
  one_course: "Pick the single course you teach.",
  two_course: "Pick two courses — for teachers covering more than one prep.",
};

/** How many courses a teacher must select at checkout for this tier. 0 means "all of them, implicitly." */
export const TIER_COURSE_COUNT: Record<SubscriptionTier, number> = {
  full_year: 0,
  one_course: 1,
  two_course: 2,
};

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

/**
 * The env var holding each (tier, interval) pair's Stripe Price ID. One
 * source of truth for both the checkout action (tier+interval -> price id)
 * and the webhook handler (price id -> tier, via the reverse lookup below).
 */
const PRICE_ID_ENV_VAR: Record<SubscriptionTier, Record<BillingInterval, string>> = {
  full_year: {
    monthly: "STRIPE_PRICE_ID_FULL_YEAR_MONTHLY",
    annual: "STRIPE_PRICE_ID_FULL_YEAR_ANNUAL",
  },
  one_course: {
    monthly: "STRIPE_PRICE_ID_ONE_COURSE_MONTHLY",
    annual: "STRIPE_PRICE_ID_ONE_COURSE_ANNUAL",
  },
  two_course: {
    monthly: "STRIPE_PRICE_ID_TWO_COURSE_MONTHLY",
    annual: "STRIPE_PRICE_ID_TWO_COURSE_ANNUAL",
  },
};

export function getPriceId(tier: SubscriptionTier, interval: BillingInterval): string | null {
  const envVar = PRICE_ID_ENV_VAR[tier][interval];
  return process.env[envVar] || null;
}

/** Every (tier, interval, priceId) triple that has a real price ID configured. */
export function listConfiguredPrices(): {
  tier: SubscriptionTier;
  interval: BillingInterval;
  priceId: string;
}[] {
  const out: { tier: SubscriptionTier; interval: BillingInterval; priceId: string }[] = [];
  for (const tier of SUBSCRIPTION_TIERS) {
    for (const interval of ["monthly", "annual"] as const) {
      const priceId = getPriceId(tier, interval);
      if (priceId) out.push({ tier, interval, priceId });
    }
  }
  return out;
}

/** Reverse lookup used by the webhook handler: given a Stripe Price ID, which tier/interval is it? */
export function tierForPriceId(
  priceId: string,
): { tier: SubscriptionTier; interval: BillingInterval } | null {
  for (const tier of SUBSCRIPTION_TIERS) {
    for (const interval of ["monthly", "annual"] as const) {
      if (getPriceId(tier, interval) === priceId) return { tier, interval };
    }
  }
  return null;
}

/** Free trial length shown on signup/dashboard messaging — not enforced at
 * the access-control layer (see lib/billing/access.ts's comment on why). */
export const TRIAL_DAYS = 14;
