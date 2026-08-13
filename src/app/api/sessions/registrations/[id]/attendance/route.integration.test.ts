import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { unlockBuilderAccessIfQualifying } from "@/lib/sessions/qualification";

/**
 * ROUTE/INTEGRATION COVERAGE — automates the pre-publish audit's single
 * most load-bearing manual check: "a user who registers but does NOT
 * attend must NOT receive qualifying post-session access." Calls the
 * real attendance route handler against a real Postgres database, same
 * stub pattern as the reorder route's integration test.
 */
const mockUser: { id: string; role: "MEMBER" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? mockUser : null),
  };
});

const { POST: markAttendance } = await import(
  "@/app/api/sessions/registrations/[id]/attendance/route"
);

async function callAttendance(registrationId: string, status: string) {
  return markAttendance(
    new Request(`http://test/api/sessions/registrations/${registrationId}/attendance`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
    { params: Promise.resolve({ id: registrationId }) },
  );
}

describe("POST /api/sessions/registrations/[id]/attendance (real DB)", () => {
  const suffix = `attend-${Date.now()}`;
  const memberId = `usr-member-${suffix}`;
  const adminId = `usr-admin-${suffix}`;
  const businessNoShowId = `biz-noshow-${suffix}`;
  const businessAttendedId = `biz-attended-${suffix}`;
  const businessPaidId = `biz-paid-${suffix}`;
  const sessionNoShowId = `sess-noshow-${suffix}`;
  const sessionAttendedId = `sess-attended-${suffix}`;
  const sessionPaidId = `sess-paid-${suffix}`;
  let regNoShowId: string;
  let regAttendedId: string;
  let regPaidId: string;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: memberId, email: `member-${suffix}@test.local`, firstName: "M", lastName: "Ember", role: "MEMBER" },
        { id: adminId, email: `admin-${suffix}@test.local`, firstName: "A", lastName: "Dmin", role: "ADMIN" },
      ],
    });
    await prisma.business.createMany({
      data: [
        { id: businessNoShowId, name: "No-Show Test Co" },
        { id: businessAttendedId, name: "Attended Test Co" },
        { id: businessPaidId, name: "Paid Session Test Co" },
      ],
    });
    await prisma.userBusinessMembership.createMany({
      data: [
        { userId: memberId, businessId: businessNoShowId },
        { userId: memberId, businessId: businessAttendedId },
        { userId: memberId, businessId: businessPaidId },
      ],
    });
    await prisma.sessionOffering.createMany({
      data: [
        {
          id: sessionNoShowId,
          sessionType: "PASSION",
          title: "Attendance Test Session (No-Show)",
          status: "SCHEDULED",
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: sessionAttendedId,
          sessionType: "PASSION",
          title: "Attendance Test Session (Attended)",
          status: "SCHEDULED",
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: sessionPaidId,
          sessionType: "PASSION",
          title: "Attendance Test Session ($150 Qualifying)",
          status: "SCHEDULED",
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          priceCents: 15000,
        },
      ],
    });
    const [regNoShow, regAttended, regPaid] = await Promise.all([
      prisma.sessionRegistration.create({
        data: { sessionId: sessionNoShowId, userId: memberId, businessId: businessNoShowId, status: "REGISTERED" },
      }),
      prisma.sessionRegistration.create({
        data: { sessionId: sessionAttendedId, userId: memberId, businessId: businessAttendedId, status: "REGISTERED" },
      }),
      prisma.sessionRegistration.create({
        data: { sessionId: sessionPaidId, userId: memberId, businessId: businessPaidId, status: "REGISTERED" },
      }),
    ]);
    regNoShowId = regNoShow.id;
    regAttendedId = regAttended.id;
    regPaidId = regPaid.id;
  });

  afterAll(async () => {
    await prisma.sessionRegistration.deleteMany({
      where: { sessionId: { in: [sessionNoShowId, sessionAttendedId, sessionPaidId] } },
    });
    await prisma.sessionOffering.deleteMany({
      where: { id: { in: [sessionNoShowId, sessionAttendedId, sessionPaidId] } },
    });
    await prisma.userBusinessMembership.deleteMany({ where: { userId: memberId } });
    await prisma.business.deleteMany({
      where: { id: { in: [businessNoShowId, businessAttendedId, businessPaidId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [memberId, adminId] } } });
  });

  it("MEMBER cannot mark their own attendance", async () => {
    mockUser.id = memberId;
    mockUser.role = "MEMBER";
    const res = await callAttendance(regNoShowId, "ATTENDED");
    expect(res.status).toBe(403);
  });

  it("ADMIN marking NO_SHOW does NOT unlock Builder access — the critical launch rule", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const res = await callAttendance(regNoShowId, "NO_SHOW");
    expect(res.status).toBe(200);

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessNoShowId } });
    expect(business.builderAccessEligible).toBe(false);
  });

  it("ADMIN marking ATTENDED unlocks Builder access", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const res = await callAttendance(regAttendedId, "ATTENDED");
    expect(res.status).toBe(200);

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessAttendedId } });
    expect(business.builderAccessEligible).toBe(true);
  });

  it("ADMIN marking ATTENDED on a $150 session does NOT unlock Builder while unpaid", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const res = await callAttendance(regPaidId, "ATTENDED");
    expect(res.status).toBe(200);

    // Attendance itself is still recorded honestly, even though it doesn't qualify yet.
    const registration = await prisma.sessionRegistration.findUniqueOrThrow({ where: { id: regPaidId } });
    expect(registration.status).toBe("ATTENDED");

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessPaidId } });
    expect(business.builderAccessEligible).toBe(false);
  });

  it("paying afterward unlocks Builder access — same check the payment webhook runs", async () => {
    // Simulates what the checkout.session.completed webhook handler writes
    // (src/lib/billing/webhook-handlers.ts) without needing a real Stripe event.
    await prisma.sessionRegistration.update({
      where: { id: regPaidId },
      data: { paidAt: new Date(), amountPaidCents: 15000 },
    });
    await unlockBuilderAccessIfQualifying(regPaidId);

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessPaidId } });
    expect(business.builderAccessEligible).toBe(true);
    expect(business.qualifyingSessionRegistrationId).toBe(regPaidId);
  });
});
