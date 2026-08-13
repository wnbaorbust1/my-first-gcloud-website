import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { resolveBlueprintAccess } from "@/lib/blueprint/access";

/**
 * ROUTE/INTEGRATION COVERAGE for the Phase 5 access ladder — the single
 * resolver the Assessment Results and Vision Board view pages both call
 * to decide "assessment_only / preview / preview_booked / full /
 * expired." Exercises every branch against a real Postgres row rather
 * than trusting the type checker, since a wrong branch order here is
 * exactly the kind of bug that silently shows a member either too little
 * or (worse) too much.
 */
describe("resolveBlueprintAccess (real DB)", () => {
  const suffix = `access-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const businessId = `biz-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, email: `${suffix}@test.local`, firstName: "A", lastName: "Ccess", role: "MEMBER" },
    });
    await prisma.business.create({ data: { id: businessId, name: "Access Ladder Co" } });
    await prisma.userBusinessMembership.create({ data: { userId, businessId } });
  });

  afterAll(async () => {
    await prisma.sessionRegistration.deleteMany({ where: { businessId } });
    await prisma.sessionOffering.deleteMany({ where: { title: { startsWith: "Access Ladder" } } });
    await prisma.membership.deleteMany({ where: { businessId } });
    await prisma.assessment.deleteMany({ where: { businessId } });
    await prisma.userBusinessMembership.deleteMany({ where: { userId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("is assessment_only before any completed assessment", async () => {
    const result = await resolveBlueprintAccess(userId, businessId);
    expect(result).toEqual({ state: "assessment_only", appointment: null });
  });

  it("is preview once the assessment is completed but no session is booked", async () => {
    await prisma.assessment.create({
      data: { businessId, status: "COMPLETED", completedAt: new Date() },
    });
    const result = await resolveBlueprintAccess(userId, businessId);
    expect(result).toEqual({ state: "preview", appointment: null });
  });

  it("is preview_booked with real appointment details once a session is registered", async () => {
    const session = await prisma.sessionOffering.create({
      data: {
        title: "Access Ladder Power Session",
        sessionType: "POWER",
        status: "SCHEDULED",
        format: "VIRTUAL",
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        virtualLink: "https://example.com/meet",
      },
    });
    await prisma.sessionRegistration.create({
      data: { sessionId: session.id, userId, businessId, status: "REGISTERED" },
    });

    const result = await resolveBlueprintAccess(userId, businessId);
    expect(result.state).toBe("preview_booked");
    expect(result.appointment).toMatchObject({
      status: "REGISTERED",
      sessionTitle: "Access Ladder Power Session",
      format: "VIRTUAL",
    });
  });

  it("is full once builderAccessEligible flips and a fresh membership grants access", async () => {
    await prisma.business.update({ where: { id: businessId }, data: { builderAccessEligible: true } });
    await prisma.membership.create({
      data: { businessId, status: "COMPLIMENTARY", activatedAt: new Date(), trialEndsAt: new Date(Date.now() + 86400000) },
    });

    const result = await resolveBlueprintAccess(userId, businessId);
    expect(result).toEqual({ state: "full", appointment: null });
  });

  it("is expired once the membership no longer grants access", async () => {
    await prisma.membership.update({
      where: { businessId },
      data: { status: "COMPLIMENTARY", trialEndsAt: new Date(Date.now() - 1000) },
    });

    const result = await resolveBlueprintAccess(userId, businessId);
    expect(result).toEqual({ state: "expired", appointment: null });
  });
});
