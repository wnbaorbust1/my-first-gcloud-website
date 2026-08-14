import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE — gamification wiring (Phase A). Confirms
 * completing a real RoadmapTask awards DAILY_ACTION points exactly once
 * (idempotent against a duplicate/resubmit request) and records a real
 * streak day, against a real Postgres database.
 */
const mockUser: { id: string; role: "MEMBER" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { POST } = await import("@/app/api/roadmap/tasks/[id]/complete/route");

function callComplete(taskId: string) {
  return POST(new Request(`http://test/api/roadmap/tasks/${taskId}/complete`, { method: "POST" }), {
    params: Promise.resolve({ id: taskId }),
  });
}

describe("POST /api/roadmap/tasks/[id]/complete — gamification (real DB)", () => {
  const suffix = `gam-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const businessId = `biz-${suffix}`;
  const roadmapId = `rm-${suffix}`;
  const taskId = `task-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, email: `${suffix}@test.local`, firstName: "G", lastName: "Am", role: "MEMBER" },
    });
    await prisma.business.create({ data: { id: businessId, name: "Gamification Co" } });
    await prisma.userBusinessMembership.create({ data: { userId, businessId, role: "OWNER" } });
    await prisma.roadmap.create({ data: { id: roadmapId, businessId } });
    await prisma.roadmapTask.create({
      data: {
        id: taskId,
        roadmapId,
        stage: "PASSION",
        title: "Write your one-sentence pitch",
        status: "NOT_STARTED",
        priority: "MUST_DO",
      },
    });
    mockUser.id = userId;
    mockUser.role = "MEMBER";
  });

  afterAll(async () => {
    await prisma.pointsLedger.deleteMany({ where: { businessId } });
    await prisma.streak.deleteMany({ where: { businessId } });
    await prisma.roadmapTask.deleteMany({ where: { roadmapId } });
    await prisma.roadmap.deleteMany({ where: { id: roadmapId } });
    await prisma.userBusinessMembership.deleteMany({ where: { businessId } });
    await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("awards 10 DAILY_ACTION points and starts a 1-day streak on first completion", async () => {
    const res = await callComplete(taskId);
    expect(res.status).toBe(200);

    const ledger = await prisma.pointsLedger.findMany({ where: { businessId } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].action).toBe("DAILY_ACTION");
    expect(ledger[0].points).toBe(10);

    const streak = await prisma.streak.findUnique({ where: { businessId } });
    expect(streak?.currentStreak).toBe(1);
  });

  it("does not award points again on a duplicate completion request", async () => {
    const res = await callComplete(taskId);
    expect(res.status).toBe(200);

    const ledger = await prisma.pointsLedger.findMany({ where: { businessId } });
    expect(ledger).toHaveLength(1); // still just the one row from the first call
  });
});
