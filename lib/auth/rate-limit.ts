import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RateLimitAction } from "@/types/supabase";

export type { RateLimitAction };

const RATE_LIMITS: Record<
  RateLimitAction,
  { maxFailures: number; windowMinutes: number }
> = {
  // Signups are infrequent by nature — a tight budget over a longer window.
  signup: { maxFailures: 5, windowMinutes: 60 },
  // Logins are frequent and typos happen; generous budget, short window.
  login: { maxFailures: 8, windowMinutes: 15 },
  password_reset: { maxFailures: 5, windowMinutes: 60 },
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Checks whether any of `identifiers` (e.g. "email:foo@bar.com",
 * "ip:203.0.113.4") has hit its failure budget for `action`. Only counts
 * failed attempts — "block after N failures in a time window" — so a
 * string of successful logins never trips this.
 *
 * Call this BEFORE attempting the real Supabase Auth call, so a blocked
 * caller never even reaches it.
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifiers: string[],
): Promise<RateLimitResult> {
  const { maxFailures, windowMinutes } = RATE_LIMITS[action];
  const windowStart = new Date(
    Date.now() - windowMinutes * 60_000,
  ).toISOString();
  const supabase = createAdminClient();

  for (const identifier of identifiers) {
    const { count, error } = await supabase
      .from("auth_rate_limit_attempts")
      .select("id", { count: "exact", head: true })
      .eq("action", action)
      .eq("identifier", identifier)
      .eq("succeeded", false)
      .gte("created_at", windowStart);

    if (error) {
      // Fail open on infra errors — a broken rate-limit table shouldn't
      // lock every teacher out of the app. This should never happen once
      // the migration is applied; log loudly so it gets noticed.
      console.error("checkRateLimit query failed", error);
      continue;
    }

    if ((count ?? 0) >= maxFailures) {
      return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
    }
  }

  return { allowed: true };
}

/** Records one attempt row per identifier. Never throws to the caller. */
export async function recordAttempt(
  action: RateLimitAction,
  identifiers: string[],
  succeeded: boolean,
): Promise<void> {
  if (identifiers.length === 0) return;

  const supabase = createAdminClient();
  const rows = identifiers.map((identifier) => ({
    action,
    identifier,
    succeeded,
  }));

  const { error } = await supabase
    .from("auth_rate_limit_attempts")
    .insert(rows);
  if (error) console.error("recordAttempt insert failed", error);
}

/** Human-readable message for a blocked RateLimitResult. */
export function rateLimitMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
