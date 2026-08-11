import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * ERROR MONITORING (launch-hardening audit finding: no error monitoring
 * anywhere, so a production regression was only ever found by a user
 * report). Self-hosted rather than a Sentry/Datadog integration — no
 * third-party account needed, consistent with this app's "the DB can
 * already do this" pattern (see: PDF export via browser print instead of
 * a rendering library, email via a plain `fetch` instead of an SDK).
 *
 * Deliberately never throws itself — a logging call failing must never
 * take down the request that triggered it. `context` is for structured,
 * non-sensitive detail (route, status code, a userId) — never pass a
 * raw request body through it, since that could carry a password or
 * payment field a caller forgot to strip.
 */
export async function logError(
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    await prisma.errorLog.create({
      data: { message: message.slice(0, 2000), stack: stack?.slice(0, 8000), context: context as never },
    });
  } catch (loggingErr) {
    // The logger itself failing is not allowed to become the caller's problem.
    console.error("[Blueprint] logError failed to persist", loggingErr);
  }
  // Always still visible in server logs even when persistence succeeds.
  console.error("[Blueprint]", error, context ?? "");
}
