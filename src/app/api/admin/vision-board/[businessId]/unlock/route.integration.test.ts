import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for "Unlock the Full Vision Board" (Phase
 * 7: Admin and Facilitator Controls) — a real, WORKING unlock: flips
 * builderAccessEligible AND ensures a membership that actually grants
 * access, never downgrading a real paid/trial membership that already
 * works, generates a real roadmap, and leaves a real AuditLog trail.
 */
const mockUser: { id: string; role: "MEMBER" | "FACILITATOR" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { POST } = await import("@/app/api/admin/vision-board/[businessId]/unlock/route");

function callUnlock(businessId: string, reason = "Technical issue during their session.") {
  return POST(
    new Request(`http://test/api/admin/vision-board/${businessId}/unlock`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
    { params: Promise.resolve({ businessId }) },
  );
}

describe("POST /api/admin/vision-board/[businessId]/unlock (real DB)", () => {
  const suffix = `unlock-${Date.now()}`;
  const adminId = `usr-admin-${suffix}`;
  const facilitatorId = `usr-facilitator-${suffix}`;
  const freshBusinessId = `biz-fresh-${suffix}`;
  const alreadyPaidBusinessId = `biz-paid-${suffix}`;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: adminId, email: `admin-${suffix}@test.local`, firstName: "A", lastName: "Dm", role: "ADMIN" },
        { id: facilitatorId, email: `facilitator-${suffix}@test.local`, firstName: "F", lastName: "Ac", role: "FACILITATOR" },
      ],
    });
    await prisma.business.create({ data: { id: freshBusinessId, name: "Fresh Unlock Co" } });
    await prisma.business.create({ data: { id: alreadyPaidBusinessId, name: "Already Paid Co" } });
    await prisma.membership.create({
      data: {
        businessId: alreadyPaidBusinessId,
        status: "ACTIVE_MONTHLY",
        activatedAt: new Date(),
        currentPeriodEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [freshBusinessId, alreadyPaidBusinessId] } } });
    await prisma.roadmap.deleteMany({ where: { businessId: { in: [freshBusinessId, alreadyPaidBusinessId] } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: [freshBusinessId, alreadyPaidBusinessId] } } });
    await prisma.business.deleteMany({ where: { id: { in: [freshBusinessId, alreadyPaidBusinessId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, facilitatorId] } } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callUnlock(freshBusinessId);
    expect(res.status).toBe(401);
  });

  it("403s for a facilitator (admin-only)", async () => {
    mockUser.id = facilitatorId;
    mockUser.role = "FACILITATOR";
    const res = await callUnlock(freshBusinessId);
    expect(res.status).toBe(403);
  });

  it("unlocks a fresh business and grants ADMIN_GRANTED membership", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const res = await callUnlock(freshBusinessId, "Comped access — scholarship.");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.membership.status).toBe("ADMIN_GRANTED");
    expect(body.membership.grantedReason).toBe("Comped access — scholarship.");

    const business = await prisma.business.findUniqueOrThrow({ where: { id: freshBusinessId } });
    expect(business.builderAccessEligible).toBe(true);
    expect(business.visionBoardUnlockedAt).not.toBeNull();

    const roadmap = await prisma.roadmap.findFirst({ where: { businessId: freshBusinessId } });
    expect(roadmap).not.toBeNull();

    const log = await prisma.auditLog.findFirst({
      where: { entityId: freshBusinessId, action: "vision_board_unlocked" },
    });
    expect(log).not.toBeNull();
  });

  it("never downgrades a business that already has a real paid membership", async () => {
    const res = await callUnlock(alreadyPaidBusinessId, "Technical issue.");
    expect(res.status).toBe(200);

    const membership = await prisma.membership.findUniqueOrThrow({ where: { businessId: alreadyPaidBusinessId } });
    // Still the real paid status — not silently overwritten to ADMIN_GRANTED.
    expect(membership.status).toBe("ACTIVE_MONTHLY");

    const business = await prisma.business.findUniqueOrThrow({ where: { id: alreadyPaidBusinessId } });
    expect(business.builderAccessEligible).toBe(true);
  });
});
