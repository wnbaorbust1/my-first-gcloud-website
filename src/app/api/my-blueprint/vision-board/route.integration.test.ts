import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for the structured-storage PATCH endpoint
 * (Vision Board & Blueprint Generator, structured-storage follow-up,
 * audited 2026-08-13) — the schema/route rewrite from flat text fields
 * to per-section JSON columns is exactly the kind of change a type
 * checker alone won't catch a real behavioral regression in (a wrong
 * key name still "compiles" against `Record<string, unknown>`), so this
 * exercises a real save against a real Postgres row.
 */
const mockUser: { id: string } = { id: "" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: "MEMBER" } : null),
  };
});

const { PATCH } = await import("@/app/api/my-blueprint/vision-board/route");

function callPatch(body: unknown) {
  return PATCH(
    new Request("http://test/api/my-blueprint/vision-board", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
}

describe("PATCH /api/my-blueprint/vision-board (real DB)", () => {
  const suffix = `vbpatch-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const businessId = `biz-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, email: `${suffix}@test.local`, firstName: "P", lastName: "Atch", role: "MEMBER" },
    });
    await prisma.business.create({ data: { id: businessId, name: "Patch Test Co" } });
    await prisma.userBusinessMembership.create({ data: { userId, businessId } });
    mockUser.id = userId;
  });

  afterAll(async () => {
    await prisma.visionBoardProfile.deleteMany({ where: { businessId } });
    await prisma.userBusinessMembership.deleteMany({ where: { userId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("creates a profile at version 1, stamped with the saving user", async () => {
    const res = await callPatch({
      businessId,
      myStory: { name: "Sam", businesses: ["Daniels Leisure Travel"], passionStatement: null, superpowers: [] },
      vibes: ["Ambitious", "Passionate"],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile.version).toBe(1);
    expect(body.profile.myStory).toEqual({
      name: "Sam",
      businesses: ["Daniels Leisure Travel"],
      passionStatement: null,
      superpowers: [],
    });
    expect(body.profile.vibes).toEqual(["Ambitious", "Passionate"]);
    expect(body.profile.lastEditedByUserId).toBe(userId);
    expect(body.profile.lastEditedAt).not.toBeNull();
  });

  it("a second save on a different section bumps the version and leaves the first section untouched", async () => {
    const res = await callPatch({
      businessId,
      legacy: { legacyStatement: "Leave the world better than I found it.", impactGroups: ["My Family"] },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile.version).toBe(2);
    // Untouched — this PATCH never mentioned myStory.
    expect(body.profile.myStory.name).toBe("Sam");
    expect(body.profile.legacy.legacyStatement).toBe("Leave the world better than I found it.");
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callPatch({ businessId, vibes: ["x"] });
    expect(res.status).toBe(401);
    mockUser.id = userId;
  });
});
