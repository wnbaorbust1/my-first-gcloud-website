import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE — automates the assessment scoring/session-
 * recommendation live check the pre-publish audit had to hand-drive over
 * real HTTP each time (signup a user, answer all 36 questions, complete,
 * read the score back from Postgres). Calls the actual PATCH `responses`
 * and POST `complete` route handlers against a real database — the same
 * "who is signed in" stub as the reorder route's integration test — so a
 * future change to the scoring engine that breaks a spec scenario fails
 * `npm run test:integration` instead of only being caught on the next
 * manual audit.
 */
const mockUser: { id: string; role: "MEMBER" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? mockUser : null),
  };
});

const { PATCH: saveResponse } = await import("@/app/api/assessment/[id]/responses/route");
const { POST: completeAssessment } = await import("@/app/api/assessment/[id]/complete/route");

interface Question {
  id: string;
  stage: "PASSION" | "POWER" | "LEGACY";
  questionType: string;
  options: unknown;
}

async function answerAndComplete(
  assessmentId: string,
  questions: Question[],
  profile: Record<Question["stage"], 1 | 5>,
) {
  for (const q of questions) {
    const scale = profile[q.stage];
    let value: unknown;
    switch (q.questionType) {
      case "SCALE_1_5":
        value = scale;
        break;
      case "YES_NO":
        value = scale >= 3;
        break;
      case "NUMBER":
        value = scale >= 3 ? 90 : 10;
        break;
      case "SHORT_ANSWER":
        value = "Integration test answer with real business detail.";
        break;
      case "SINGLE_CHOICE":
      case "MULTIPLE_CHOICE": {
        let opts: { value: string }[] = [];
        try {
          opts = JSON.parse((q.options as string | null) ?? "[]");
        } catch {
          opts = [];
        }
        if (!opts.length) continue;
        const idx = scale >= 3 ? opts.length - 1 : 0;
        value = q.questionType === "MULTIPLE_CHOICE" ? [opts[idx]!.value] : opts[idx]!.value;
        break;
      }
      default:
        value = scale;
    }

    const res = await saveResponse(
      new Request(`http://test/api/assessment/${assessmentId}/responses`, {
        method: "PATCH",
        body: JSON.stringify({ questionId: q.id, value }),
      }),
      { params: Promise.resolve({ id: assessmentId }) },
    );
    if (res.status !== 200) {
      throw new Error(`Failed to save response for ${q.id}: ${res.status} ${await res.text()}`);
    }
  }

  return completeAssessment(
    new Request(`http://test/api/assessment/${assessmentId}/complete`, { method: "POST" }),
    { params: Promise.resolve({ id: assessmentId }) },
  );
}

describe("Assessment completion + scoring (real DB)", () => {
  const suffix = `assess-${Date.now()}`;
  const ownerId = `usr-owner-${suffix}`;
  const strangerId = `usr-stranger-${suffix}`;
  const businessAId = `biz-a-${suffix}`;
  const businessBId = `biz-b-${suffix}`;
  let questions: Question[];
  let assessmentAId: string;
  let assessmentBId: string;

  beforeAll(async () => {
    questions = await prisma.assessmentQuestion.findMany({
      where: { isActive: true },
      select: { id: true, stage: true, questionType: true, options: true },
      orderBy: { order: "asc" },
    });

    await prisma.user.createMany({
      data: [
        { id: ownerId, email: `owner-${suffix}@test.local`, firstName: "Owner", lastName: "User", role: "MEMBER" },
        { id: strangerId, email: `stranger-${suffix}@test.local`, firstName: "Stranger", lastName: "User", role: "MEMBER" },
      ],
    });
    await prisma.business.createMany({
      data: [{ id: businessAId, name: "Assessment Test Co A" }, { id: businessBId, name: "Assessment Test Co B" }],
    });
    await prisma.userBusinessMembership.create({ data: { userId: ownerId, businessId: businessAId } });

    const [assessmentA, assessmentB] = await Promise.all([
      prisma.assessment.create({ data: { businessId: businessAId, assessmentVersion: "v1" } }),
      prisma.assessment.create({ data: { businessId: businessBId, assessmentVersion: "v1" } }),
    ]);
    assessmentAId = assessmentA.id;
    assessmentBId = assessmentB.id;
  });

  afterAll(async () => {
    await prisma.assessmentResponse.deleteMany({ where: { assessmentId: { in: [assessmentAId, assessmentBId] } } });
    await prisma.assessmentCategoryScore.deleteMany({ where: { assessmentId: { in: [assessmentAId, assessmentBId] } } });
    await prisma.assessmentScore.deleteMany({ where: { assessmentId: { in: [assessmentAId, assessmentBId] } } });
    await prisma.assessment.deleteMany({ where: { id: { in: [assessmentAId, assessmentBId] } } });
    await prisma.userBusinessMembership.deleteMany({ where: { userId: ownerId } });
    await prisma.business.deleteMany({ where: { id: { in: [businessAId, businessBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
  });

  it("Scenario A — Low Passion, strong Power/Legacy — recommends a Passion session", async () => {
    mockUser.id = ownerId;
    const res = await answerAndComplete(assessmentAId, questions, { PASSION: 1, POWER: 5, LEGACY: 5 });
    expect(res.status).toBe(200);

    const assessment = await prisma.assessment.findUniqueOrThrow({ where: { id: assessmentAId } });
    expect(assessment.status).toBe("COMPLETED");
    expect(assessment.recommendedSessionType).toBe("PASSION");
    expect(assessment.healthScorePercent).not.toBeNull();
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await saveResponse(
      new Request(`http://test/api/assessment/${assessmentBId}/responses`, {
        method: "PATCH",
        body: JSON.stringify({ questionId: questions[0]!.id, value: 1 }),
      }),
      { params: Promise.resolve({ id: assessmentBId }) },
    );
    expect(res.status).toBe(401);
  });

  it("403s when a user with no relationship to the business tries to answer its assessment", async () => {
    mockUser.id = strangerId;
    const res = await saveResponse(
      new Request(`http://test/api/assessment/${assessmentAId}/responses`, {
        method: "PATCH",
        body: JSON.stringify({ questionId: questions[0]!.id, value: 1 }),
      }),
      { params: Promise.resolve({ id: assessmentAId }) },
    );
    expect(res.status).toBe(403);
  });

  it("scores are isolated per business — a second assessment with a different profile produces different results", async () => {
    // businessBId has no membership row at all, matching real "no owner
    // assigned yet" data; use ADMIN so assertBusinessAccess allows it,
    // proving isolation is about which assessment/business, not just role.
    mockUser.id = ownerId;
    mockUser.role = "ADMIN";
    const res = await answerAndComplete(assessmentBId, questions, { PASSION: 5, POWER: 5, LEGACY: 5 });
    mockUser.role = "MEMBER";
    expect(res.status).toBe(200);

    const [a, b] = await Promise.all([
      prisma.assessment.findUniqueOrThrow({ where: { id: assessmentAId } }),
      prisma.assessment.findUniqueOrThrow({ where: { id: assessmentBId } }),
    ]);
    expect(a.recommendedSessionType).not.toBe(b.recommendedSessionType);
    expect(b.healthScorePercent).toBeGreaterThan(a.healthScorePercent ?? 0);
  });
});
