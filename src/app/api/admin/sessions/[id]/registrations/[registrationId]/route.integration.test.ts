import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for manually removing a client from a
 * session (Phase 7 continued) — reuses cancelRegistration, which
 * promotes the next waitlisted registrant into the freed seat.
 */
const mockUser: { id: string; role: "MEMBER" | "FACILITATOR" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { DELETE } = await import("@/app/api/admin/sessions/[id]/registrations/[registrationId]/route");

function callRemove(sessionId: string, registrationId: string) {
  return DELETE(
    new Request(`http://test/api/admin/sessions/${sessionId}/registrations/${registrationId}`, {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: sessionId, registrationId }) },
  );
}

describe("DELETE /api/admin/sessions/[id]/registrations/[registrationId] (real DB)", () => {
  const suffix = `regdel-${Date.now()}`;
  const adminId = `usr-admin-${suffix}`;
  const facilitatorId = `usr-facilitator-${suffix}`;
  const ownerAId = `usr-ownerA-${suffix}`;
  const ownerBId = `usr-ownerB-${suffix}`;
  const businessAId = `biz-a-${suffix}`;
  const businessBId = `biz-b-${suffix}`;
  const sessionId = `sess-${suffix}`;
  let registeredRegId: string;
  let waitlistedRegId: string;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: adminId, email: `admin-${suffix}@test.local`, firstName: "A", lastName: "Dm", role: "ADMIN" },
        { id: facilitatorId, email: `facilitator-${suffix}@test.local`, firstName: "F", lastName: "Ac", role: "FACILITATOR" },
        { id: ownerAId, email: `ownera-${suffix}@test.local`, firstName: "Ow", lastName: "A", role: "MEMBER" },
        { id: ownerBId, email: `ownerb-${suffix}@test.local`, firstName: "Ow", lastName: "B", role: "MEMBER" },
      ],
    });
    await prisma.business.createMany({
      data: [
        { id: businessAId, name: "Owner A Co" },
        { id: businessBId, name: "Owner B Co" },
      ],
    });
    await prisma.sessionOffering.create({
      data: {
        id: sessionId,
        title: "Tiny Session",
        sessionType: "PASSION",
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "SCHEDULED",
        capacity: 1, // full after one registration, so the second lands WAITLISTED
      },
    });
    const registered = await prisma.sessionRegistration.create({
      data: { sessionId, userId: ownerAId, businessId: businessAId, status: "REGISTERED" },
    });
    registeredRegId = registered.id;
    const waitlisted = await prisma.sessionRegistration.create({
      data: { sessionId, userId: ownerBId, businessId: businessBId, status: "WAITLISTED", waitlistPosition: 1 },
    });
    waitlistedRegId = waitlisted.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: [registeredRegId, waitlistedRegId] } } });
    await prisma.sessionRegistration.deleteMany({ where: { sessionId } });
    await prisma.sessionOffering.deleteMany({ where: { id: sessionId } });
    await prisma.business.deleteMany({ where: { id: { in: [businessAId, businessBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, facilitatorId, ownerAId, ownerBId] } } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callRemove(sessionId, registeredRegId);
    expect(res.status).toBe(401);
  });

  it("403s for a facilitator (admin-only)", async () => {
    mockUser.id = facilitatorId;
    mockUser.role = "FACILITATOR";
    const res = await callRemove(sessionId, registeredRegId);
    expect(res.status).toBe(403);
  });

  it("404s for a registration that doesn't belong to this session", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const res = await callRemove("sess-does-not-exist", registeredRegId);
    expect(res.status).toBe(404);
  });

  it("removes the registered client and promotes the waitlisted one, with an audit trail", async () => {
    const res = await callRemove(sessionId, registeredRegId);
    expect(res.status).toBe(200);

    const cancelled = await prisma.sessionRegistration.findUniqueOrThrow({ where: { id: registeredRegId } });
    expect(cancelled.status).toBe("CANCELLED");

    const promoted = await prisma.sessionRegistration.findUniqueOrThrow({ where: { id: waitlistedRegId } });
    expect(promoted.status).toBe("REGISTERED");
    expect(promoted.waitlistPosition).toBeNull();

    const log = await prisma.auditLog.findFirst({
      where: { entityId: registeredRegId, action: "session_registration_removed_by_admin" },
    });
    expect(log).not.toBeNull();
  });
});
