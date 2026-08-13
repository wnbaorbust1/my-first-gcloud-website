import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for "Save New Version" (Phase 6:
 * Downloads) — a real Postgres snapshot, gated to the full-access tier,
 * numbered per business, newest-first on list.
 */
const mockUser: { id: string } = { id: "" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: "MEMBER" } : null),
  };
});

const { POST: saveVersion, GET: listVersions } = await import(
  "@/app/api/blueprint/vision-board/versions/route"
);

function callSave(businessId: string) {
  return saveVersion(
    new Request("http://test/api/blueprint/vision-board/versions", {
      method: "POST",
      body: JSON.stringify({ businessId }),
    }),
  );
}

function callList(businessId: string) {
  return listVersions(
    new Request(`http://test/api/blueprint/vision-board/versions?businessId=${businessId}`),
  );
}

describe("POST/GET /api/blueprint/vision-board/versions (real DB)", () => {
  const suffix = `vbver-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const unlockedBusinessId = `biz-unlocked-${suffix}`;
  const lockedBusinessId = `biz-locked-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, email: `${suffix}@test.local`, firstName: "V", lastName: "Ver", role: "MEMBER" },
    });
    await prisma.business.create({
      data: { id: unlockedBusinessId, name: "Version Vision Co", builderAccessEligible: true },
    });
    await prisma.business.create({ data: { id: lockedBusinessId, name: "Locked Version Co" } });
    await prisma.assessment.create({
      data: { businessId: unlockedBusinessId, status: "COMPLETED", completedAt: new Date() },
    });
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
    await prisma.visionBoardVersion.deleteMany({
      where: { businessId: { in: [unlockedBusinessId, lockedBusinessId] } },
    });
    await prisma.membership.deleteMany({ where: { businessId: unlockedBusinessId } });
    await prisma.userBusinessMembership.deleteMany({ where: { userId } });
    await prisma.business.deleteMany({ where: { id: { in: [unlockedBusinessId, lockedBusinessId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callSave(unlockedBusinessId);
    expect(res.status).toBe(401);
  });

  it("403s for a business that hasn't unlocked the full tier", async () => {
    mockUser.id = userId;
    const res = await callSave(lockedBusinessId);
    expect(res.status).toBe(403);
  });

  it("saves version 1, then version 2, with a real snapshot of the board", async () => {
    const first = await callSave(unlockedBusinessId);
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.version.version).toBe(1);

    const second = await callSave(unlockedBusinessId);
    const secondBody = await second.json();
    expect(secondBody.version.version).toBe(2);

    const stored = await prisma.visionBoardVersion.findUniqueOrThrow({
      where: { businessId_version: { businessId: unlockedBusinessId, version: 1 } },
    });
    expect(stored.snapshot).toMatchObject({ business: { name: "Version Vision Co" } });
  });

  it("lists saved versions newest-first", async () => {
    const res = await callList(unlockedBusinessId);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.versions.map((v: { version: number }) => v.version)).toEqual([2, 1]);
  });
});
