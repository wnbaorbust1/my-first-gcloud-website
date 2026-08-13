import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for "Email My Blueprint" (Phase 6:
 * Downloads). Mocks the Resend call itself (that boundary is exercised
 * manually, same as every other external-provider integration in this
 * app) but runs auth, the full-tier access gate, and the real Postgres
 * BoardDownload log for real.
 */
const mockUser: { email: string; id: string } = { email: "", id: "" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () =>
      mockUser.email ? { id: mockUser.id, email: mockUser.email, role: "MEMBER" } : null,
    assertBusinessAccess: async () => Boolean(mockUser.email),
  };
});

const mockEmail: { sent: boolean } = { sent: true };
vi.mock("@/lib/email/send", () => ({
  sendEmail: async () => (mockEmail.sent ? { sent: true } : { sent: false, reason: "not-configured" }),
}));

const { POST: emailBoard } = await import("@/app/api/blueprint/vision-board/email/route");

function callEmail(businessId: string, pdfBase64 = "aGVsbG8=") {
  return emailBoard(
    new Request("http://test/api/blueprint/vision-board/email", {
      method: "POST",
      body: JSON.stringify({ businessId, pdfBase64 }),
    }),
  );
}

describe("POST /api/blueprint/vision-board/email (real DB)", () => {
  const suffix = `vbemail-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const unlockedBusinessId = `biz-unlocked-${suffix}`;
  const lockedBusinessId = `biz-locked-${suffix}`;
  const userEmail = `${suffix}@test.local`;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: userId, email: userEmail, firstName: "E", lastName: "Mail", role: "MEMBER" },
    });
    await prisma.business.create({
      data: { id: unlockedBusinessId, name: "Email Vision Co", builderAccessEligible: true },
    });
    await prisma.business.create({ data: { id: lockedBusinessId, name: "Locked Email Co" } });
    await prisma.assessment.create({
      data: { businessId: unlockedBusinessId, status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.membership.create({
      data: { businessId: unlockedBusinessId, status: "ADMIN_GRANTED", activatedAt: new Date() },
    });
  });

  afterAll(async () => {
    await prisma.boardDownload.deleteMany({ where: { businessId: { in: [unlockedBusinessId, lockedBusinessId] } } });
    await prisma.membership.deleteMany({ where: { businessId: unlockedBusinessId } });
    await prisma.business.deleteMany({ where: { id: { in: [unlockedBusinessId, lockedBusinessId] } } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("401s when not authenticated", async () => {
    mockUser.email = "";
    const res = await callEmail(unlockedBusinessId);
    expect(res.status).toBe(401);
  });

  it("403s for a business that hasn't unlocked the full tier", async () => {
    mockUser.email = userEmail;
    mockUser.id = userId;
    const res = await callEmail(lockedBusinessId);
    expect(res.status).toBe(403);
  });

  it("sends to the authenticated member's own email and logs a BoardDownload", async () => {
    mockEmail.sent = true;
    const res = await callEmail(unlockedBusinessId);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sentTo).toBe(userEmail);

    const download = await prisma.boardDownload.findFirst({
      where: { businessId: unlockedBusinessId, format: "email" },
    });
    expect(download).not.toBeNull();
    expect(download?.document).toBe("vision_board");
  });

  it("502s gracefully when email delivery isn't configured", async () => {
    mockEmail.sent = false;
    const res = await callEmail(unlockedBusinessId);
    expect(res.status).toBe(502);
  });

  it("rejects an oversized payload", async () => {
    const res = await callEmail(unlockedBusinessId, "x".repeat(16_000_000));
    expect(res.status).toBe(400);
  });
});
