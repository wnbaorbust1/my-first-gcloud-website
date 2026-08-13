import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE for "change sessions" (Phase 7 continued)
 * — full-field editing beyond the original status/facilitator/capacity
 * -only PATCH.
 */
const mockUser: { id: string; role: "MEMBER" | "FACILITATOR" | "ADMIN" } = { id: "", role: "MEMBER" };
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return {
    ...actual,
    getCurrentUser: async () => (mockUser.id ? { id: mockUser.id, role: mockUser.role } : null),
  };
});

const { PATCH } = await import("@/app/api/admin/sessions/[id]/route");

function callPatch(sessionId: string, body: Record<string, unknown>) {
  return PATCH(
    new Request(`http://test/api/admin/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: sessionId }) },
  );
}

describe("PATCH /api/admin/sessions/[id] (real DB)", () => {
  const suffix = `sessionedit-${Date.now()}`;
  const adminId = `usr-admin-${suffix}`;
  const facilitatorId = `usr-facilitator-${suffix}`;
  const sessionId = `sess-${suffix}`;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: adminId, email: `admin-${suffix}@test.local`, firstName: "A", lastName: "Dm", role: "ADMIN" },
        { id: facilitatorId, email: `facilitator-${suffix}@test.local`, firstName: "F", lastName: "Ac", role: "FACILITATOR" },
      ],
    });
    await prisma.sessionOffering.create({
      data: {
        id: sessionId,
        title: "Original Title",
        sessionType: "PASSION",
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "SCHEDULED",
      },
    });
  });

  afterAll(async () => {
    await prisma.sessionOffering.deleteMany({ where: { id: sessionId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, facilitatorId] } } });
  });

  it("401s when not authenticated", async () => {
    mockUser.id = "";
    const res = await callPatch(sessionId, { title: "Nope" });
    expect(res.status).toBe(401);
  });

  it("403s for a facilitator (admin-only)", async () => {
    mockUser.id = facilitatorId;
    mockUser.role = "FACILITATOR";
    const res = await callPatch(sessionId, { title: "Nope" });
    expect(res.status).toBe(403);
  });

  it("updates full session fields, including dates, price, location, and clearing optional fields", async () => {
    mockUser.id = adminId;
    mockUser.role = "ADMIN";
    const newStart = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const res = await callPatch(sessionId, {
      title: "Updated Title",
      description: "Now with a real description.",
      format: "IN_PERSON",
      startsAt: newStart,
      location: "123 Main St",
      virtualLink: null,
      priceCents: 15000,
      capacity: 20,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session.title).toBe("Updated Title");
    expect(body.session.description).toBe("Now with a real description.");
    expect(body.session.format).toBe("IN_PERSON");
    expect(new Date(body.session.startsAt).toISOString()).toBe(newStart);
    expect(body.session.location).toBe("123 Main St");
    expect(body.session.virtualLink).toBeNull();
    expect(body.session.priceCents).toBe(15000);
    expect(body.session.capacity).toBe(20);
  });

  it("404s for a missing session", async () => {
    const res = await callPatch("sess-does-not-exist", { title: "Nope" });
    expect(res.status).toBe(404);
  });
});
