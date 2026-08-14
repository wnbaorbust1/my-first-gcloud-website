import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getLevelEligiblePoints, getTotalPoints } from "@/lib/gamification/points";
import { prisma } from "@/lib/prisma";

import { ensureAffirmationsSeeded, getTodaysAffirmation, markSpoken } from "./affirmations";

/**
 * INTEGRATION COVERAGE — Phase B affirmations, real Postgres. Confirms
 * the two things that matter most: points are awarded exactly once per
 * day (not per click), and affirmation points never count toward level
 * progression (spec §7's explicit anti-farming constraint).
 */
describe("affirmations (real DB)", () => {
  const suffix = `aff-${Date.now()}`;
  const businessId = `biz-${suffix}`;

  beforeAll(async () => {
    await prisma.business.create({ data: { id: businessId, name: "Affirmation Co" } });
    await ensureAffirmationsSeeded();
  });

  afterAll(async () => {
    await prisma.affirmationEvent.deleteMany({ where: { businessId } });
    await prisma.pointsLedger.deleteMany({ where: { businessId } });
    await prisma.business.deleteMany({ where: { id: businessId } });
  });

  it("seeds the full affirmation library idempotently", async () => {
    const before = await prisma.affirmation.count({ where: { isCustom: false } });
    await ensureAffirmationsSeeded();
    const after = await prisma.affirmation.count({ where: { isCustom: false } });
    expect(after).toBe(before); // no duplicates from calling it twice
    expect(after).toBeGreaterThanOrEqual(19); // 1 general + 6x3 stage-specific
  });

  it("returns the same affirmation for the same business on the same day", async () => {
    const first = await getTodaysAffirmation(businessId);
    const second = await getTodaysAffirmation(businessId);
    expect(second.id).toBe(first.id);
  });

  it("awards 2 points once for 'I Spoke This Today', and does nothing on a same-day repeat", async () => {
    const today = await getTodaysAffirmation(businessId);

    const first = await markSpoken(businessId, today.id);
    expect(first).toBe(true);

    const totalAfterFirst = await getTotalPoints(businessId);
    expect(totalAfterFirst).toBe(2);

    const second = await markSpoken(businessId, today.id);
    expect(second).toBe(false); // already logged today

    const totalAfterSecond = await getTotalPoints(businessId);
    expect(totalAfterSecond).toBe(2); // unchanged
  });

  it("does not count affirmation points toward level progression", async () => {
    const total = await getTotalPoints(businessId);
    const eligible = await getLevelEligiblePoints(businessId);
    expect(total).toBeGreaterThan(0);
    expect(eligible).toBe(0);
  });
});
