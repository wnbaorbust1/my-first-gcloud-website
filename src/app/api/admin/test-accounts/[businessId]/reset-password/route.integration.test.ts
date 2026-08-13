import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for resetting a test account's login
 * password (Phase 7 continued) — shown-once semantics, same as account
 * creation.
 */
const mockUser: { id: string; role: "MEMBER" | "FACILITATOR" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { POST } = await import("@/app/api/admin/test-accounts/[businessId]/reset-password/route");

function callReset(businessId: string) {
  return POST(
    new Request(`http://test/api/admin/test-accounts/${businessId}/reset-password`, { method: "POST" }),
    { params: Promise.resolve({ businessId }) },
  );
}

describe("POST /api/admin/test-accounts/[businessId]/reset-password (real DB)", () => {
  const suffix = `reset-${Date.now()}`;
  const adminId = `usr-admin-${suffix}`;
  const testUserId = `usr-test-${suffix}`;
  const testBusinessId = `biz-test-${suffix}`;
  const realBusinessId = `biz-real-${suffix}`;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: adminId, email: `admin-${suffix}@test.local`, firstName: "A", lastName: "Dm", role: "ADMIN" },
        {
          id: testUserId,
          email: `test-${suffix}@preview.blueprint.internal`,
          firstName: "Test",
          lastName: "Preview",
          role: "MEMBER",
          passwordHash: await hashPassword("original-password-123"),
        },
      ],
    });
    await prisma.business.create({ data: { id: testBusinessId, name: "TEST — Reset Co", isTestAccount: true } });
    await prisma.userBusinessMembership.create({ data: { userId: testUserId, businessId: testBusinessId } });
    await prisma.business.create({ data: { id: realBusinessId, name: "Real Co" } });
  });

  afterAll(async () => {
    await prisma.business.deleteMany({ where: { id: { in: [testBusinessId, realBusinessId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, testUserId] } } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callReset(testBusinessId);
    expect(res.status).toBe(401);
  });

  it("404s on a real (non-test) business", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const res = await callReset(realBusinessId);
    expect(res.status).toBe(404);
  });

  it("regenerates the login password and returns it once", async () => {
    const res = await callReset(testBusinessId);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.loginEmail).toContain("@preview.blueprint.internal");
    expect(body.password).toBeTruthy();
    expect(body.password).not.toBe("original-password-123");

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: testUserId } });
    const matchesNew = await verifyPassword(body.password, updatedUser.passwordHash ?? "");
    expect(matchesNew).toBe(true);
    const matchesOld = await verifyPassword("original-password-123", updatedUser.passwordHash ?? "");
    expect(matchesOld).toBe(false);
  });
});
