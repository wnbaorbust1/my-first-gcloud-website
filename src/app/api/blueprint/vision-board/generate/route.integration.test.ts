import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for the AI structured-JSON vision-board
 * generation endpoint (Vision Board & Blueprint Generator, audited
 * 2026-08-13). Mocks the Anthropic call itself (that boundary is
 * exercised manually, same as Blueprint AI chat) but runs everything
 * else — auth, the full-tier gate, schema validation, the real Postgres
 * write, and the promote flow — for real.
 */
const mockUser: { id: string } = { id: "" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: "MEMBER" } : null),
  };
});

const mockAi: { configured: boolean; response: string } = { configured: true, response: "" };
vi.mock("@/lib/ai/client", () => ({
  isAiConfigured: () => mockAi.configured,
  callBlueprintAi: async () => mockAi.response,
}));

const { POST: generate } = await import("@/app/api/blueprint/vision-board/generate/route");
const { POST: promote } = await import("@/app/api/blueprint/vision-board/generate/[id]/promote/route");

function callGenerate(businessId: string) {
  return generate(
    new Request("http://test/api/blueprint/vision-board/generate", {
      method: "POST",
      body: JSON.stringify({ businessId }),
    }),
  );
}

function callPromote(generationId: string, fields: string[]) {
  return promote(
    new Request(`http://test/api/blueprint/vision-board/generate/${generationId}/promote`, {
      method: "POST",
      body: JSON.stringify({ fields }),
    }),
    { params: Promise.resolve({ id: generationId }) },
  );
}

const VALID_JSON = JSON.stringify({
  myStory: "I started this business to help local families eat better.",
  myWhy: "I want my work to outlast me and mean something to my community.",
  legacyImpact: null,
  actionPlanThisWeek: "Follow up with the three leads from last week's session.",
  actionPlanThisMonth: null,
  dailyAffirmations: ["I show up for my customers every day.", "My business grows because I do."],
});

describe("POST /api/blueprint/vision-board/generate (real DB)", () => {
  const suffix = `vbgen-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const unlockedBusinessId = `biz-unlocked-${suffix}`;
  const lockedBusinessId = `biz-locked-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, email: `${suffix}@test.local`, firstName: "V", lastName: "Gen", role: "MEMBER" },
    });
    await prisma.business.create({
      data: { id: unlockedBusinessId, name: "Unlocked Vision Co", builderAccessEligible: true },
    });
    await prisma.business.create({ data: { id: lockedBusinessId, name: "Locked Vision Co" } });
    await prisma.userBusinessMembership.createMany({
      data: [
        { userId, businessId: unlockedBusinessId },
        { userId, businessId: lockedBusinessId },
      ],
    });
    await prisma.membership.create({
      data: { businessId: unlockedBusinessId, status: "ADMIN_GRANTED", activatedAt: new Date() },
    });
  });

  afterAll(async () => {
    await prisma.visionBoardGeneration.deleteMany({
      where: { businessId: { in: [unlockedBusinessId, lockedBusinessId] } },
    });
    await prisma.visionBoardProfile.deleteMany({ where: { businessId: unlockedBusinessId } });
    await prisma.membership.deleteMany({ where: { businessId: unlockedBusinessId } });
    await prisma.userBusinessMembership.deleteMany({ where: { userId } });
    await prisma.business.deleteMany({ where: { id: { in: [unlockedBusinessId, lockedBusinessId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callGenerate(unlockedBusinessId);
    expect(res.status).toBe(401);
  });

  it("403s for a business that hasn't unlocked the full tier", async () => {
    mockUser.id = userId;
    mockAi.configured = true;
    const res = await callGenerate(lockedBusinessId);
    expect(res.status).toBe(403);
  });

  it("503s when no AI provider key is configured", async () => {
    mockUser.id = userId;
    mockAi.configured = false;
    const res = await callGenerate(unlockedBusinessId);
    expect(res.status).toBe(503);
  });

  it("502s and saves nothing when the model returns unparseable output", async () => {
    mockAi.configured = true;
    mockAi.response = "Sure, here's your vision board! Sorry, I can't do JSON right now.";
    const res = await callGenerate(unlockedBusinessId);
    expect(res.status).toBe(502);

    const count = await prisma.visionBoardGeneration.count({ where: { businessId: unlockedBusinessId } });
    expect(count).toBe(0);
  });

  it("generates, validates, and stores a real draft — then promotes selected fields", async () => {
    mockAi.response = VALID_JSON;
    const res = await callGenerate(unlockedBusinessId);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.generation.payload.myStory).toContain("local families");
    expect(body.generation.payload.legacyImpact).toBeNull();
    expect(body.generation.promotedAt).toBeNull();

    // Promoting a null field is a no-op, not an overwrite with nothing.
    const promoteRes = await callPromote(body.generation.id, [
      "myStory",
      "legacyImpact",
      "dailyAffirmations",
    ]);
    expect(promoteRes.status).toBe(200);
    const promoteBody = await promoteRes.json();
    expect(promoteBody.applied.sort()).toEqual(["dailyAffirmations", "myStory"]);
    expect(promoteBody.skipped).toEqual(["legacyImpact"]);
    expect(promoteBody.profile.myStory).toContain("local families");
    expect(promoteBody.profile.dailyAffirmations).toContain("I show up for my customers every day.");

    const generation = await prisma.visionBoardGeneration.findUniqueOrThrow({
      where: { id: body.generation.id },
    });
    expect(generation.promotedAt).not.toBeNull();
  });
});
