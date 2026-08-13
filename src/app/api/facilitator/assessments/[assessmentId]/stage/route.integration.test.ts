import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for "Correct Stage Assignment" (Phase 7:
 * Admin and Facilitator Controls) — the live recommendedSessionType is
 * correctable, but systemRecommendedSessionType (the engine's own
 * original computation) must never change, and the correction must be
 * provenance-tracked (who, when, why) on the row and in AuditLog.
 */
const mockUser: { id: string; role: "MEMBER" | "FACILITATOR" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { PATCH } = await import("@/app/api/facilitator/assessments/[assessmentId]/stage/route");

function callPatch(assessmentId: string, body: unknown) {
  return PATCH(
    new Request(`http://test/api/facilitator/assessments/${assessmentId}/stage`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ assessmentId }) },
  );
}

describe("PATCH /api/facilitator/assessments/[assessmentId]/stage (real DB)", () => {
  const suffix = `stagefix-${Date.now()}`;
  const facilitatorId = `usr-facilitator-${suffix}`;
  const memberId = `usr-member-${suffix}`;
  const businessId = `biz-${suffix}`;
  let assessmentId: string;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: facilitatorId, email: `facilitator-${suffix}@test.local`, firstName: "F", lastName: "Ac", role: "FACILITATOR" },
        { id: memberId, email: `member-${suffix}@test.local`, firstName: "M", lastName: "Em", role: "MEMBER" },
      ],
    });
    await prisma.business.create({ data: { id: businessId, name: "Stage Fix Co" } });
    await prisma.userBusinessMembership.create({ data: { userId: memberId, businessId } });
    await prisma.facilitatorAssignment.create({ data: { facilitatorId, businessId } });
    const assessment = await prisma.assessment.create({
      data: {
        businessId,
        status: "COMPLETED",
        completedAt: new Date(),
        recommendedSessionType: "POWER",
        systemRecommendedSessionType: "POWER",
      },
    });
    assessmentId = assessment.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: assessmentId } });
    await prisma.assessment.deleteMany({ where: { businessId } });
    await prisma.facilitatorAssignment.deleteMany({ where: { facilitatorId } });
    await prisma.userBusinessMembership.deleteMany({ where: { userId: memberId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { id: { in: [facilitatorId, memberId] } } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callPatch(assessmentId, { recommendedSessionType: "LEGACY" });
    expect(res.status).toBe(401);
  });

  it("403s for a member (not staff)", async () => {
    mockUser.id = memberId;
    mockUser.role = "MEMBER";
    const res = await callPatch(assessmentId, { recommendedSessionType: "LEGACY" });
    expect(res.status).toBe(403);
  });

  it("corrects the stage, preserves the original, and records provenance", async () => {
    mockUser.id = facilitatorId;
    mockUser.role = "FACILITATOR";
    const res = await callPatch(assessmentId, {
      recommendedSessionType: "LEGACY",
      note: "Ran the session myself — Legacy is the real fit.",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assessment.recommendedSessionType).toBe("LEGACY");
    // The engine's own original computation is never touched.
    expect(body.assessment.systemRecommendedSessionType).toBe("POWER");
    expect(body.assessment.stageOverriddenByUserId).toBe(facilitatorId);
    expect(body.assessment.stageOverrideNote).toContain("Legacy is the real fit");
    expect(body.assessment.stageOverriddenAt).not.toBeNull();

    const log = await prisma.auditLog.findFirst({
      where: { entityId: assessmentId, action: "assessment_stage_corrected" },
    });
    expect(log).not.toBeNull();
    expect(log?.metadata).toMatchObject({ from: "POWER", to: "LEGACY" });
  });

  it("404s for an assessment id that doesn't exist", async () => {
    const res = await callPatch("does-not-exist", { recommendedSessionType: "PASSION" });
    expect(res.status).toBe(404);
  });
});
