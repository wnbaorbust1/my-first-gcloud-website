import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for setting a test account's preview
 * membership stage (Phase 7 continued) — flips a real Membership row
 * between COMPLIMENTARY (free 30-day trial), ACTIVE_ANNUAL (1-year
 * subscriber), and a lapsed COMPLIMENTARY (expired). Critically: 404s on
 * any business that isn't flagged isTestAccount, so this can never
 * fabricate a paid status on a real customer.
 */
const mockUser: { id: string; role: "MEMBER" | "FACILITATOR" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { POST } = await import("@/app/api/admin/test-accounts/[businessId]/preview/route");

function callPreview(businessId: string, state: "trial" | "annual" | "expired") {
  return POST(
    new Request(`http://test/api/admin/test-accounts/${businessId}/preview`, {
      method: "POST",
      body: JSON.stringify({ state }),
    }),
    { params: Promise.resolve({ businessId }) },
  );
}

describe("POST /api/admin/test-accounts/[businessId]/preview (real DB)", () => {
  const suffix = `preview-${Date.now()}`;
  const adminId = `usr-admin-${suffix}`;
  const testBusinessId = `biz-test-${suffix}`;
  const realBusinessId = `biz-real-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: adminId, email: `admin-${suffix}@test.local`, firstName: "A", lastName: "Dm", role: "ADMIN" },
    });
    await prisma.business.create({ data: { id: testBusinessId, name: "TEST — Preview Co", isTestAccount: true } });
    await prisma.business.create({ data: { id: realBusinessId, name: "Real Co" } });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [testBusinessId, realBusinessId] } } });
    await prisma.roadmap.deleteMany({ where: { businessId: { in: [testBusinessId, realBusinessId] } } });
    await prisma.membership.deleteMany({ where: { businessId: { in: [testBusinessId, realBusinessId] } } });
    await prisma.business.deleteMany({ where: { id: { in: [testBusinessId, realBusinessId] } } });
    await prisma.user.deleteMany({ where: { id: adminId } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callPreview(testBusinessId, "trial");
    expect(res.status).toBe(401);
  });

  it("404s on a real (non-test) business — never fabricates a paid status", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const res = await callPreview(realBusinessId, "annual");
    expect(res.status).toBe(404);
  });

  it("sets a free 30-day trial (COMPLIMENTARY) and unlocks the builder", async () => {
    const res = await callPreview(testBusinessId, "trial");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.membership.status).toBe("COMPLIMENTARY");
    expect(new Date(body.membership.trialEndsAt).getTime()).toBeGreaterThan(Date.now());

    const business = await prisma.business.findUniqueOrThrow({ where: { id: testBusinessId } });
    expect(business.builderAccessEligible).toBe(true);

    const roadmap = await prisma.roadmap.findFirst({ where: { businessId: testBusinessId } });
    expect(roadmap).not.toBeNull();
  });

  it("sets a 1-year subscriber (ACTIVE_ANNUAL)", async () => {
    const res = await callPreview(testBusinessId, "annual");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.membership.status).toBe("ACTIVE_ANNUAL");
    expect(body.membership.currentPeriodEndsAt).not.toBeNull();
  });

  it("sets an expired (lapsed trial) state", async () => {
    const res = await callPreview(testBusinessId, "expired");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.membership.status).toBe("COMPLIMENTARY");
    expect(new Date(body.membership.trialEndsAt).getTime()).toBeLessThan(Date.now());
  });
});
