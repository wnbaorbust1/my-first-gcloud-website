import "server-only";

import { prisma } from "@/lib/prisma";

export interface RateLimitResult {
  allowed: boolean;
  /** Roughly how long until a new request would be allowed, in ms. Only set when blocked. */
  retryAfterMs?: number;
}

/**
 * RATE LIMITING (launch-hardening audit finding: no abuse protection on
 * signup/login/password-reset/AI). DB-backed rather than in-memory or a
 * new Redis dependency — see the `RateLimitHit` model's doc comment.
 * "Count hits for this key in the last `windowMs`, then record this
 * request" is not perfectly atomic under true concurrency (two requests
 * arriving in the same instant could both pass the count check), but
 * that's an acceptable trade for abuse throttling — unlike the session-
 * capacity fix, nothing here needs to be exact, just bounded.
 */
export async function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - opts.windowMs);
  const count = await prisma.rateLimitHit.count({
    where: { key, createdAt: { gte: windowStart } },
  });

  if (count >= opts.limit) {
    return { allowed: false, retryAfterMs: opts.windowMs };
  }

  await prisma.rateLimitHit.create({ data: { key } });
  return { allowed: true };
}

/** Best-effort client IP from standard proxy headers — "unknown" is still a valid (shared) bucket, not a crash. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

const TOO_MANY_REQUESTS_BODY = { error: "Too many attempts. Please wait a bit and try again." } as const;

export { TOO_MANY_REQUESTS_BODY };

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Named presets so every call site tunes the same knob the same way instead of re-guessing numbers. */
export const RATE_LIMITS = {
  SIGNUP: { limit: 5, windowMs: 10 * MINUTE },
  LOGIN_PER_EMAIL: { limit: 10, windowMs: 15 * MINUTE },
  FORGOT_PASSWORD: { limit: 5, windowMs: 15 * MINUTE },
  RESET_PASSWORD: { limit: 10, windowMs: 15 * MINUTE },
  CHANGE_PASSWORD: { limit: 10, windowMs: 15 * MINUTE },
  AI_MESSAGE: { limit: 30, windowMs: HOUR },
} as const;
