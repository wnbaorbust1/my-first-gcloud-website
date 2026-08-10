import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP from the request headers Vercel/proxies set. */
function getClientIp(): string {
  const h = headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Builds the identifier set a rate-limited auth action should check/record
 * against: always the caller's IP, plus the email when one was submitted
 * (so a blocked email doesn't block the whole IP, and vice versa).
 */
export function buildRateLimitIdentifiers(email?: string): string[] {
  const identifiers = [`ip:${getClientIp()}`];
  if (email) identifiers.push(`email:${email.trim().toLowerCase()}`);
  return identifiers;
}
