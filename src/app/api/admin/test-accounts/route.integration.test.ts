import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for admin Test Accounts creation (Phase 7
 * continued) — a real, dedicated sandbox login (not a session
 * impersonation) an admin can use in a second browser to see exactly
 * what a member sees at a given membership stage.
 */
const mockUser: { id: string; role: "MEMBER" | "FACILITATOR" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { GET, POST } = await import("@/app/api/admin/test-accounts/route");

function callCreate(label: string) {
  return POST(
    new Request("http://test/api/admin/test-accounts", {
      method: "POST",
      body: JSON.stringify({ label }),
    }),
  );
}

describe("/api/admin/test-accounts (real DB)", () => {
  const suffix = `testacct-${Date.now()}`;
  const adminId = `usr-admin-${suffix}`;
  const facilitatorId = `usr-facilitator-${suffix}`;
  const createdBusinessIds: string[] = [];

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: adminId, email: `admin-${suffix}@test.local`, firstName: "A", lastName: "Dm", role: "ADMIN" },
        { id: facilitatorId, email: `facilitator-${suffix}@test.local`, firstName: "F", lastName: "Ac", role: "FACILITATOR" },
      ],
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: createdBusinessIds } } });
    const testUsers = await prisma.userBusinessMembership.findMany({
      where: { businessId: { in: createdBusinessIds } },
      select: { userId: true },
    });
    await prisma.business.deleteMany({ where: { id: { in: createdBusinessIds } } });
    await prisma.user.deleteMany({ where: { id: { in: testUsers.map((t) => t.userId) } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, facilitatorId] } } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callCreate("Trial Preview");
    expect(res.status).toBe(401);
  });

  it("403s for a facilitator (admin-only)", async () => {
    mockUser.id = facilitatorId;
    mockUser.role = "FACILITATOR";
    const res = await callCreate("Trial Preview");
    expect(res.status).toBe(403);
  });

  it("creates a real test account with a shown-once password and marks it isTestAccount", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const res = await callCreate("Trial Preview");
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.loginEmail).toContain("@preview.blueprint.internal");
    expect(body.password).toBeTruthy();
    createdBusinessIds.push(body.business.id);

    const business = await prisma.business.findUniqueOrThrow({ where: { id: body.business.id } });
    expect(business.isTestAccount).toBe(true);
    expect(business.name).toContain("TEST —");

    const log = await prisma.auditLog.findFirst({
      where: { entityId: body.business.id, action: "test_account_created" },
    });
    expect(log).not.toBeNull();
  });

  it("lists only test accounts, excluding real businesses", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accounts.some((a: { id: string }) => createdBusinessIds.includes(a.id))).toBe(true);
  });
});
