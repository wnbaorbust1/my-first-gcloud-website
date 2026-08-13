/**
 * BLUEPRINT BUILDER MEMBERSHIP PRICING (spec Prompt 8, verbatim):
 * first 30 days free with a qualifying session, then $9.99/month or
 * $100/year. Kept as one shared source of truth so the Pricing page,
 * Billing page, and Stripe price lookups never drift from each other or
 * from the numbers in the spec.
 */
export const TRIAL_DAYS = 30;
export const MONTHLY_PRICE_CENTS = 999;
export const ANNUAL_PRICE_CENTS = 10000;

/**
 * QUALIFYING SESSION PRICE (Vision Board & Blueprint Generator, audited
 * 2026-08-13): the one-time $150 charge for a Blueprint Session. Separate
 * from the Membership prices above — this is what unlocks the qualifying
 * session itself, not the recurring subscription. See
 * src/lib/sessions/seed-content.ts and src/app/api/sessions/registrations/[id]/checkout/route.ts.
 */
export const QUALIFYING_SESSION_PRICE_CENTS = 15000;

/** "$19.88" — the annual plan's savings vs. paying monthly for 12 months, per spec. */
export const ANNUAL_SAVINGS_CENTS = MONTHLY_PRICE_CENTS * 12 - ANNUAL_PRICE_CENTS;

/** "approximately 17%" per spec's PRICING PAGE copy. */
export const ANNUAL_SAVINGS_PERCENT = Math.round((ANNUAL_SAVINGS_CENTS / (MONTHLY_PRICE_CENTS * 12)) * 100);

export { formatCents } from "@/lib/money";
