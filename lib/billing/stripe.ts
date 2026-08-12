import "server-only";
import Stripe from "stripe";

/**
 * Single Stripe server client. Lazily constructed (not module-level) so a
 * missing STRIPE_SECRET_KEY surfaces as a clear error at the call site
 * instead of crashing every route that happens to import this module.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("getStripe: STRIPE_SECRET_KEY is not set.");
  }

  cached = new Stripe(secretKey);
  return cached;
}
