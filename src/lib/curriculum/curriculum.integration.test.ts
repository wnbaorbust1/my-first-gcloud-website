import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTotalPoints } from "@/lib/gamification/points";
import { prisma } from "@/lib/prisma";

import { completeDailyAction, completeWeek, ensureCurriculumSeeded, getCurrentWeek } from "./curriculum";

/**
 * INTEGRATION COVERAGE — Phase C curriculum engine, real Postgres.
 * Confirms the sequencing (week 1 first, week 2 only after week 1's
 * review), the idempotency of both completion actions, and the points
 * awarded (10/action, 50/week — see src/lib/gamification/points.ts's
 * POINTS_TABLE).
 */
describe("curriculum engine (real DB)", () => {
  const suffix = `cur-${Date.now()}`;
  const businessId = `biz-${suffix}`;

  beforeAll(async () => {
    await prisma.business.create({ data: { id: businessId, name: "Curriculum Co" } });
    await ensureCurriculumSeeded();
  });

  afterAll(async () => {
    await prisma.dailyActionCompletion.deleteMany({ where: { businessId } });
    await prisma.businessWeekProgress.deleteMany({ where: { businessId } });
    await prisma.pointsLedger.deleteMany({ where: { businessId } });
    await prisma.streak.deleteMany({ where: { businessId } });
    await prisma.business.deleteMany({ where: { id: businessId } });
  });

  it("seeds all 13 weeks x 5 actions idempotently", async () => {
    const before = await prisma.curriculumWeek.count();
    await ensureCurriculumSeeded();
    const after = await prisma.curriculumWeek.count();
    expect(after).toBe(before);
    expect(after).toBeGreaterThanOrEqual(13);
    const actionCount = await prisma.dailyAction.count();
    expect(actionCount).toBeGreaterThanOrEqual(65);
  });

  it("starts a new business on week 1", async () => {
    const result = await getCurrentWeek(businessId);
    expect(result.state).toBe("in-progress");
    if (result.state === "in-progress") {
      expect(result.week.weekNumber).toBe(1);
      expect(result.totalActions).toBe(5);
      expect(result.actionsCompletedCount).toBe(0);
    }
  });

  it("awards 10 points once per daily action, idempotent on repeat", async () => {
    const week1 = await getCurrentWeek(businessId);
    if (week1.state !== "in-progress") throw new Error("expected in-progress");
    const firstAction = week1.actions[0];

    const created = await completeDailyAction(businessId, firstAction.id, "did it");
    expect(created).toBe(true);
    expect(await getTotalPoints(businessId)).toBe(10);

    const repeat = await completeDailyAction(businessId, firstAction.id);
    expect(repeat).toBe(false); // already logged
    expect(await getTotalPoints(businessId)).toBe(10); // unchanged
  });

  it("refuses to complete a week until all 5 daily actions are done", async () => {
    const week1 = await getCurrentWeek(businessId);
    if (week1.state !== "in-progress") throw new Error("expected in-progress");

    const result = await completeWeek(businessId, week1.week.weekId, "My honest reflection.");
    expect(result.ok).toBe(false);
  });

  it("refuses to complete a week without a real review answer", async () => {
    const week1 = await getCurrentWeek(businessId);
    if (week1.state !== "in-progress") throw new Error("expected in-progress");

    // Finish the remaining 4 actions.
    for (const action of week1.actions.filter((a) => !a.completed)) {
      await completeDailyAction(businessId, action.id);
    }

    const emptyReview = await completeWeek(businessId, week1.week.weekId, "   ");
    expect(emptyReview.ok).toBe(false);
  });

  it("completes week 1 and advances to week 2, awarding 50 points", async () => {
    const week1 = await getCurrentWeek(businessId);
    if (week1.state !== "in-progress") throw new Error("expected in-progress");
    expect(week1.actionsCompletedCount).toBe(5);

    const before = await getTotalPoints(businessId);
    const result = await completeWeek(businessId, week1.week.weekId, "This week taught me a lot.");
    expect(result.ok).toBe(true);
    expect(await getTotalPoints(businessId)).toBe(before + 50);

    const week2 = await getCurrentWeek(businessId);
    expect(week2.state).toBe("in-progress");
    if (week2.state === "in-progress") {
      expect(week2.week.weekNumber).toBe(2);
      expect(week2.actionsCompletedCount).toBe(0);
    }
  });

  it("re-submitting an already-completed week succeeds without double-awarding points", async () => {
    const before = await getTotalPoints(businessId);
    // Find week 1's id again via its known weekNumber.
    const week1Row = await prisma.curriculumWeek.findUnique({ where: { weekNumber: 1 } });
    if (!week1Row) throw new Error("week 1 missing");

    const result = await completeWeek(businessId, week1Row.id, "resubmit");
    expect(result.ok).toBe(true);
    expect(await getTotalPoints(businessId)).toBe(before); // unchanged
  });
});
