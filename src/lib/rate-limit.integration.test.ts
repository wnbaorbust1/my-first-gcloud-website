import { afterAll, afterEach, describe, expect, it } from "vitest";

import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE: `checkRateLimit` is DB-backed
 * (`RateLimitHit`), so the pure-function suite can't exercise it — this
 * hits a real Postgres database the same way every rate-limited route
 * (signup, login, forgot-password, reset-password, AI messages) does.
 */
describe("checkRateLimit (real DB)", () => {
  const suffix = `rl-${Date.now()}`;

  afterEach(async () => {
    await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: suffix } } });
  });

  afterAll(async () => {
    await prisma.rateLimitHit.deleteMany({ where: { key: { startsWith: suffix } } });
  });

  it("allows requests under the limit and blocks the one that crosses it", async () => {
    const key = `${suffix}:under-limit`;
    const opts = { limit: 3, windowMs: 60_000 };

    const first = await checkRateLimit(key, opts);
    const second = await checkRateLimit(key, opts);
    const third = await checkRateLimit(key, opts);
    const fourth = await checkRateLimit(key, opts);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(true);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBe(opts.windowMs);
  });

  it("keys are isolated from each other", async () => {
    const keyA = `${suffix}:isolated-a`;
    const keyB = `${suffix}:isolated-b`;
    const opts = { limit: 1, windowMs: 60_000 };

    await checkRateLimit(keyA, opts);
    const aBlocked = await checkRateLimit(keyA, opts);
    const bAllowed = await checkRateLimit(keyB, opts);

    expect(aBlocked.allowed).toBe(false);
    expect(bAllowed.allowed).toBe(true);
  });

  it("a hit outside the window doesn't count against the limit", async () => {
    const key = `${suffix}:window-expiry`;
    const opts = { limit: 1, windowMs: 1000 };

    // Simulate a hit from well outside the window rather than sleeping in
    // the test — same effect, real DB row, no flaky real-time wait.
    await prisma.rateLimitHit.create({
      data: { key, createdAt: new Date(Date.now() - opts.windowMs - 5000) },
    });

    const result = await checkRateLimit(key, opts);
    expect(result.allowed).toBe(true);
  });
});
