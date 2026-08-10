import "server-only";

import Stripe from "stripe";

/**
 * No `STRIPE_SECRET_KEY` is configured in this sandbox — every caller
 * must check this before reaching for `getStripeClient()` and degrade
 * gracefully (a clear "billing isn't connected yet" response) instead of
 * throwing, same pattern as the missing ANTHROPIC_API_KEY (Phase 7) and
 * email provider (Phase 1).
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let cachedClient: Stripe | null = null;

/** Throws if called without checking isStripeConfigured() first — callers own that check. */
export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured — check isStripeConfigured() before calling this.");
  }
  if (!cachedClient) {
    // No explicit apiVersion: lets the installed SDK's own pinned default
    // apply, rather than hardcoding a version string that can drift out
    // of sync with whatever `stripe` package version is installed.
    cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return cachedClient;
}

export const STRIPE_PRICE_IDS = {
  MONTHLY: process.env.STRIPE_PRICE_ID_MONTHLY,
  ANNUAL: process.env.STRIPE_PRICE_ID_ANNUAL,
} as const;
