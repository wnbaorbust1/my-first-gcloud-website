import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE — calls the actual `route.ts` handler (not
 * a reimplementation of its logic) against a real Postgres database.
 * Only the "who is signed in" identity resolution is stubbed — the same
 * substitution the live-HTTP verification scripts make by logging in
 * with a real cookie jar instead of re-testing NextAuth itself.
 * `assertBusinessAccess` runs for real, so the cross-tenant 404 case
 * here is a genuine authorization check against real rows, not a mock.
 */
const mockUser = { id: "", role: "MEMBER" as const };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? mockUser : null),
  };
});

const { POST } = await import("@/app/api/tools/automation/reorder/route");

describe("POST /api/tools/automation/reorder (real DB)", () => {
  const suffix = `reorder-${Date.now()}`;
  const ownerId = `usr-owner-${suffix}`;
  const strangerId = `usr-stranger-${suffix}`;
  const businessId = `biz-${suffix}`;
  const otherBusinessId = `biz-other-${suffix}`;
  let stepAId: string;
  let stepBId: string;
  let foreignStepId: string;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: ownerId, email: `owner-${suffix}@test.local`, firstName: "Owner", lastName: "User", role: "MEMBER" },
        { id: strangerId, email: `stranger-${suffix}@test.local`, firstName: "Stranger", lastName: "User", role: "MEMBER" },
      ],
    });
    await prisma.business.createMany({
      data: [{ id: businessId, name: "Reorder Test Co" }, { id: otherBusinessId, name: "Other Co" }],
    });
    await prisma.userBusinessMembership.create({
      data: { userId: ownerId, businessId },
    });

    const stepA = await prisma.automationStep.create({
      data: { businessId, trigger: "New lead", action: "Send email", order: 0 },
    });
    const stepB = await prisma.automationStep.create({
      data: { businessId, trigger: "Proposal sent", action: "Follow up", order: 1 },
    });
    const foreignStep = await prisma.automationStep.create({
      data: { businessId: otherBusinessId, trigger: "x", action: "y", order: 0 },
    });
    stepAId = stepA.id;
    stepBId = stepB.id;
    foreignStepId = foreignStep.id;
  });

  afterAll(async () => {
    await prisma.automationStep.deleteMany({ where: { businessId: { in: [businessId, otherBusinessId] } } });
    await prisma.userBusinessMembership.deleteMany({ where: { userId: ownerId } });
    await prisma.business.deleteMany({ where: { id: { in: [businessId, otherBusinessId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await POST(
      new Request("http://test/api/tools/automation/reorder", {
        method: "POST",
        body: JSON.stringify({ aId: stepAId, bId: stepBId }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("atomically swaps order for the owning member", async () => {
    mockUser.id = ownerId;
    const res = await POST(
      new Request("http://test/api/tools/automation/reorder", {
        method: "POST",
        body: JSON.stringify({ aId: stepAId, bId: stepBId }),
      }),
    );
    expect(res.status).toBe(200);

    const [a, b] = await Promise.all([
      prisma.automationStep.findUniqueOrThrow({ where: { id: stepAId } }),
      prisma.automationStep.findUniqueOrThrow({ where: { id: stepBId } }),
    ]);
    expect(a.order).toBe(1);
    expect(b.order).toBe(0);
  });

  it("404s (not 403) when the pair spans two different businesses", async () => {
    mockUser.id = ownerId;
    const res = await POST(
      new Request("http://test/api/tools/automation/reorder", {
        method: "POST",
        body: JSON.stringify({ aId: stepAId, bId: foreignStepId }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("404s when a user with no relationship to the business tries to reorder its steps", async () => {
    mockUser.id = strangerId;
    const res = await POST(
      new Request("http://test/api/tools/automation/reorder", {
        method: "POST",
        body: JSON.stringify({ aId: stepAId, bId: stepBId }),
      }),
    );
    expect(res.status).toBe(404);
  });
});
