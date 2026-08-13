import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for download-history logging (Vision Board
 * & Blueprint Generator, structured-storage follow-up, audited
 * 2026-08-13) — "download history" was an explicitly requested tracked
 * field, so this locks in that a logged download actually lands a real
 * `BoardDownload` row against the right business/user.
 */
const mockUser: { id: string } = { id: "" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: "MEMBER" } : null),
  };
});

const { POST } = await import("@/app/api/blueprint/board-downloads/route");

function callLog(body: unknown) {
  return POST(
    new Request("http://test/api/blueprint/board-downloads", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/blueprint/board-downloads (real DB)", () => {
  const suffix = `bdl-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const businessId = `biz-${suffix}`;
  const otherBusinessId = `biz-other-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, email: `${suffix}@test.local`, firstName: "D", lastName: "L", role: "MEMBER" },
    });
    await prisma.business.createMany({
      data: [{ id: businessId, name: "Download Test Co" }, { id: otherBusinessId, name: "Not Mine Co" }],
    });
    await prisma.userBusinessMembership.create({ data: { userId, businessId } });
    mockUser.id = userId;
  });

  afterAll(async () => {
    await prisma.boardDownload.deleteMany({ where: { businessId: { in: [businessId, otherBusinessId] } } });
    await prisma.userBusinessMembership.deleteMany({ where: { userId } });
    await prisma.business.deleteMany({ where: { id: { in: [businessId, otherBusinessId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("logs a real download row for the requesting user's own business", async () => {
    const res = await callLog({ businessId, document: "vision_board" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.download.businessId).toBe(businessId);
    expect(body.download.userId).toBe(userId);
    expect(body.download.document).toBe("vision_board");
    expect(body.download.format).toBe("print");

    const count = await prisma.boardDownload.count({ where: { businessId } });
    expect(count).toBe(1);
  });

  it("404s for a business the user has no membership on", async () => {
    const res = await callLog({ businessId: otherBusinessId, document: "scorecard" });
    expect(res.status).toBe(404);
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callLog({ businessId, document: "vision_board" });
    expect(res.status).toBe(401);
    mockUser.id = userId;
  });
});
