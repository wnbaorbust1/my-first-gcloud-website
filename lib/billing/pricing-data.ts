import "server-only";
import { getStripe } from "@/lib/billing/stripe";
import { listConfiguredPrices, type BillingInterval } from "@/lib/billing/constants";
import type { SubscriptionTier } from "@/types/supabase";

export type PriceDisplay = {
  tier: SubscriptionTier;
  interval: BillingInterval;
  priceId: string;
  /** Formatted for display, e.g. "$49.00" — already divided out of Stripe's minor-unit amount. */
  formattedAmount: string;
  currency: string;
};

/**
 * Fetches live Price objects from Stripe for every configured (tier,
 * interval) pair, for the pricing page — rather than hardcoding dollar
 * amounts here that could silently drift from what Stripe actually
 * charges. Missing/unconfigured prices are simply omitted (see
 * listConfiguredPrices), so the pricing page only ever shows plans that
 * genuinely exist in Stripe.
 */
export async function getPricingData(): Promise<PriceDisplay[]> {
  const configured = listConfiguredPrices();
  if (configured.length === 0) return [];

  const stripe = getStripe();
  const results = await Promise.all(
    configured.map(async ({ tier, interval, priceId }) => {
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (price.unit_amount == null) return null;
        const formattedAmount = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: price.currency,
          minimumFractionDigits: price.unit_amount % 100 === 0 ? 0 : 2,
        }).format(price.unit_amount / 100);

        return { tier, interval, priceId, formattedAmount, currency: price.currency };
      } catch (err) {
        console.error(`getPricingData: failed to retrieve price ${priceId}`, err);
        return null;
      }
    }),
  );

  return results.filter((r): r is PriceDisplay => r !== null);
}
