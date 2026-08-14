import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE — "show me something smaller"
 * (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §13, Phase D), against a real
 * roadmap with real tasks of different sizes.
 */
const mockUser: { id: string; role: "MEMBER" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { POST } = await import("@/app/api/roadmap/next-best-action/swap/route");

function callSwap(businessId: string, currentTaskId: string) {
  return POST(
    new Request("http://test/api/roadmap/next-best-action/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, currentTaskId }),
    }),
  );
}

describe("POST /api/roadmap/next-best-action/swap (real DB)", () => {
  const suffix = `swap-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const businessId = `biz-${suffix}`;
  const roadmapId = `rm-${suffix}`;
  const bigTaskId = `task-big-${suffix}`;
  const smallTaskId = `task-small-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, email: `${suffix}@test.local`, firstName: "S", lastName: "W", role: "MEMBER" },
    });
    await prisma.business.create({ data: { id: businessId, name: "Swap Co" } });
    await prisma.userBusinessMembership.create({ data: { userId, businessId, role: "OWNER" } });
    await prisma.roadmap.create({ data: { id: roadmapId, businessId } });
    await prisma.roadmapTask.create({
      data: {
        id: bigTaskId, roadmapId, stage: "LEGACY", title: "Write your succession plan",
        status: "NOT_STARTED", priority: "SHOULD_DO", estimatedMins: 30, order: 1,
      },
    });
    await prisma.roadmapTask.create({
      data: {
        id: smallTaskId, roadmapId, stage: "PASSION", title: "Write your elevator pitch",
        status: "NOT_STARTED", priority: "SHOULD_DO", estimatedMins: 5, order: 2,
      },
    });
    mockUser.id = userId;
    mockUser.role = "MEMBER";
  });

  afterAll(async () => {
    await prisma.roadmapTask.deleteMany({ where: { roadmapId } });
    await prisma.roadmap.deleteMany({ where: { id: roadmapId } });
    await prisma.userBusinessMembership.deleteMany({ where: { businessId } });
    await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("a stranger is rejected", async () => {
    mockUser.id = `usr-outsider-${suffix}`;
    const res = await callSwap(businessId, bigTaskId);
    expect(res.status).toBe(404);
    mockUser.id = userId;
  });

  it("swaps the 30-minute task for the real 5-minute one, with a reason", async () => {
    const res = await callSwap(businessId, bigTaskId);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { alternative: { id: string; estimatedMins: number; reason: string } | null };
    expect(body.alternative?.id).toBe(smallTaskId);
    expect(body.alternative?.estimatedMins).toBe(5);
    expect(body.alternative?.reason.length).toBeGreaterThan(0);
  });
});
