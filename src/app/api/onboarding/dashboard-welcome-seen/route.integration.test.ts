import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE — Onboarding Touchpoint 2 (pre-publish
 * audit follow-up), real Postgres. Confirms the one-time welcome flag
 * is set for real, is business-scoped, and a stranger can't touch it.
 */
const mockUser: { id: string; role: "MEMBER" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { POST } = await import("@/app/api/onboarding/dashboard-welcome-seen/route");

function callDismiss(businessId: string) {
  return POST(
    new Request("http://test/api/onboarding/dashboard-welcome-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    }),
  );
}

describe("POST /api/onboarding/dashboard-welcome-seen (real DB)", () => {
  const suffix = `onboard-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const businessId = `biz-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, email: `${suffix}@test.local`, firstName: "O", lastName: "N", role: "MEMBER" },
    });
    await prisma.business.create({ data: { id: businessId, name: "Onboarding Co" } });
    await prisma.userBusinessMembership.create({ data: { userId, businessId, role: "OWNER" } });
    mockUser.id = userId;
    mockUser.role = "MEMBER";
  });

  afterAll(async () => {
    await prisma.userBusinessMembership.deleteMany({ where: { businessId } });
    await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("starts unset", async () => {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    expect(business?.builderWelcomeSeenAt).toBeNull();
  });

  it("a stranger cannot dismiss another business's welcome", async () => {
    mockUser.id = `usr-outsider-${suffix}`;
    const res = await callDismiss(businessId);
    expect(res.status).toBe(404);
    mockUser.id = userId;
  });

  it("sets a real timestamp", async () => {
    const res = await callDismiss(businessId);
    expect(res.status).toBe(200);

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    expect(business?.builderWelcomeSeenAt).toBeInstanceOf(Date);
  });

  it("is idempotent on a second call", async () => {
    const res = await callDismiss(businessId);
    expect(res.status).toBe(200);
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    expect(business?.builderWelcomeSeenAt).toBeInstanceOf(Date);
  });
});
