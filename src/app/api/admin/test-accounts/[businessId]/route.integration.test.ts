import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/** ROUTE/INTEGRATION COVERAGE for deleting a test account (Phase 7 continued). */
const mockUser: { id: string; role: "MEMBER" | "FACILITATOR" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { DELETE } = await import("@/app/api/admin/test-accounts/[businessId]/route");

function callDelete(businessId: string) {
  return DELETE(
    new Request(`http://test/api/admin/test-accounts/${businessId}`, { method: "DELETE" }),
    { params: Promise.resolve({ businessId }) },
  );
}

describe("DELETE /api/admin/test-accounts/[businessId] (real DB)", () => {
  const suffix = `del-${Date.now()}`;
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
        },
      ],
    });
    await prisma.business.create({ data: { id: testBusinessId, name: "TEST — Delete Co", isTestAccount: true } });
    await prisma.userBusinessMembership.create({ data: { userId: testUserId, businessId: testBusinessId } });
    await prisma.business.create({ data: { id: realBusinessId, name: "Real Co" } });
  });

  afterAll(async () => {
    await prisma.business.deleteMany({ where: { id: realBusinessId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, testUserId] } } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callDelete(testBusinessId);
    expect(res.status).toBe(401);
  });

  it("404s on a real (non-test) business — refuses to delete real customer data", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const res = await callDelete(realBusinessId);
    expect(res.status).toBe(404);
  });

  it("deletes the test business and its dedicated login user", async () => {
    const res = await callDelete(testBusinessId);
    expect(res.status).toBe(200);

    const business = await prisma.business.findUnique({ where: { id: testBusinessId } });
    expect(business).toBeNull();
    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(user).toBeNull();
  });
});
