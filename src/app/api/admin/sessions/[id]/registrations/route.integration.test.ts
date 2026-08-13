import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for manually adding a client to a session
 * (Phase 7 continued) — reuses the same registerForSession logic (and
 * therefore the same capacity/waitlist behavior) as the real member
 * registration flow.
 */
const mockUser: { id: string; role: "MEMBER" | "FACILITATOR" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { POST } = await import("@/app/api/admin/sessions/[id]/registrations/route");

function callAdd(sessionId: string, ownerEmail: string) {
  return POST(
    new Request(`http://test/api/admin/sessions/${sessionId}/registrations`, {
      method: "POST",
      body: JSON.stringify({ ownerEmail }),
    }),
    { params: Promise.resolve({ id: sessionId }) },
  );
}

describe("POST /api/admin/sessions/[id]/registrations (real DB)", () => {
  const suffix = `regadd-${Date.now()}`;
  const adminId = `usr-admin-${suffix}`;
  const facilitatorId = `usr-facilitator-${suffix}`;
  const ownerId = `usr-owner-${suffix}`;
  const businessId = `biz-${suffix}`;
  const openSessionId = `sess-open-${suffix}`;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: adminId, email: `admin-${suffix}@test.local`, firstName: "A", lastName: "Dm", role: "ADMIN" },
        { id: facilitatorId, email: `facilitator-${suffix}@test.local`, firstName: "F", lastName: "Ac", role: "FACILITATOR" },
        { id: ownerId, email: `owner-${suffix}@test.local`, firstName: "O", lastName: "Wn", role: "MEMBER" },
      ],
    });
    await prisma.business.create({ data: { id: businessId, name: "Owner Co" } });
    await prisma.userBusinessMembership.create({ data: { userId: ownerId, businessId } });
    await prisma.sessionOffering.create({
      data: {
        id: openSessionId,
        title: "Open Session",
        sessionType: "PASSION",
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "SCHEDULED",
        capacity: 10,
      },
    });
  });

  afterAll(async () => {
    const registrationIds = (
      await prisma.sessionRegistration.findMany({
        where: { sessionId: { in: [openSessionId] } },
        select: { id: true },
      })
    ).map((r) => r.id);
    await prisma.auditLog.deleteMany({ where: { entityId: { in: registrationIds } } });
    await prisma.sessionRegistration.deleteMany({ where: { sessionId: { in: [openSessionId] } } });
    await prisma.sessionOffering.deleteMany({ where: { id: { in: [openSessionId] } } });
    await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, facilitatorId, ownerId] } } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callAdd(openSessionId, `owner-${suffix}@test.local`);
    expect(res.status).toBe(401);
  });

  it("403s for a facilitator (admin-only)", async () => {
    mockUser.id = facilitatorId;
    mockUser.role = "FACILITATOR";
    const res = await callAdd(openSessionId, `owner-${suffix}@test.local`);
    expect(res.status).toBe(403);
  });

  it("404s when no business is found for that owner email", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const res = await callAdd(openSessionId, `nobody-${suffix}@test.local`);
    expect(res.status).toBe(404);
  });

  it("registers the business's owner and leaves an audit trail", async () => {
    const res = await callAdd(openSessionId, `owner-${suffix}@test.local`);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.registration.status).toBe("REGISTERED");
    expect(body.registration.businessId).toBe(businessId);
    expect(body.registration.userId).toBe(ownerId);

    const log = await prisma.auditLog.findFirst({
      where: { entityId: body.registration.id, action: "session_registration_added_by_admin" },
    });
    expect(log).not.toBeNull();
  });
});
