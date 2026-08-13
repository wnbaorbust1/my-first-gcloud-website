import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { generateApiToken } from "@/lib/api-tokens";
import { prisma } from "@/lib/prisma";

/**
 * ROUTE/INTEGRATION COVERAGE — the personal-access-token auth boundary
 * is new and security-sensitive (anything with a live token can read a
 * member's real business data), so this locks in the properties a
 * manual check confirmed live: a missing/garbage token 401s, a valid
 * token returns real data with honest nulls for unfilled fields, and
 * revoking a token actually blocks it going forward — not just until
 * the next cache/restart. Runs against a real Postgres database, no
 * mocking of the token lookup itself.
 */
const { GET } = await import("@/app/api/gpt/vision-board/route");

function callWithToken(token?: string) {
  const headers: HeadersInit = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return GET(new Request("http://test/api/gpt/vision-board", { headers }));
}

describe("GET /api/gpt/vision-board (real DB)", () => {
  const suffix = `vbexport-${Date.now()}`;
  const userId = `usr-${suffix}`;
  const noBusinessUserId = `usr-nobiz-${suffix}`;
  const lockedUserId = `usr-locked-${suffix}`;
  const businessId = `biz-${suffix}`;
  const lockedBusinessId = `biz-locked-${suffix}`;
  let rawToken: string;
  let tokenId: string;
  let noBusinessRawToken: string;
  let lockedRawToken: string;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: userId, email: `${suffix}@test.local`, firstName: "V", lastName: "Board", role: "MEMBER" },
        { id: noBusinessUserId, email: `nobiz-${suffix}@test.local`, firstName: "No", lastName: "Biz", role: "MEMBER" },
        { id: lockedUserId, email: `locked-${suffix}@test.local`, firstName: "Locked", lastName: "Biz", role: "MEMBER" },
      ],
    });
    await prisma.business.create({
      data: { id: businessId, name: "Vision Board Export Co", builderAccessEligible: true },
    });
    // Preview-tier business: never attended/paid for a qualifying session,
    // so builderAccessEligible stays false and the export should 403.
    await prisma.business.create({
      data: { id: lockedBusinessId, name: "Locked Preview Co" },
    });
    await prisma.userBusinessMembership.create({ data: { userId, businessId } });
    await prisma.userBusinessMembership.create({ data: { userId: lockedUserId, businessId: lockedBusinessId } });
    await prisma.visionBoardProfile.create({
      data: { businessId, vibes: "Ambitious, Passionate", accountabilityPartnerName: "Test Partner" },
    });
    // FULL-TIER GATE: this route now also requires an active Membership
    // (see the audited access-tiering change) — ADMIN_GRANTED needs no
    // Stripe subscription and never expires, so it's the simplest "full
    // access" fixture for a test that isn't exercising billing itself.
    await prisma.membership.create({
      data: { businessId, status: "ADMIN_GRANTED", activatedAt: new Date() },
    });

    const created = generateApiToken();
    rawToken = created.token;
    const record = await prisma.personalAccessToken.create({
      data: { userId, label: "Test", tokenHash: created.tokenHash },
    });
    tokenId = record.id;

    const createdNoBiz = generateApiToken();
    noBusinessRawToken = createdNoBiz.token;
    await prisma.personalAccessToken.create({
      data: { userId: noBusinessUserId, label: "Test", tokenHash: createdNoBiz.tokenHash },
    });

    const createdLocked = generateApiToken();
    lockedRawToken = createdLocked.token;
    await prisma.personalAccessToken.create({
      data: { userId: lockedUserId, label: "Test", tokenHash: createdLocked.tokenHash },
    });
  });

  afterAll(async () => {
    await prisma.personalAccessToken.deleteMany({
      where: { userId: { in: [userId, noBusinessUserId, lockedUserId] } },
    });
    await prisma.membership.deleteMany({ where: { businessId } });
    await prisma.visionBoardProfile.deleteMany({ where: { businessId } });
    await prisma.userBusinessMembership.deleteMany({ where: { userId: { in: [userId, lockedUserId] } } });
    await prisma.business.deleteMany({ where: { id: { in: [businessId, lockedBusinessId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, noBusinessUserId, lockedUserId] } } });
  });

  it("401s with no token", async () => {
    const res = await callWithToken();
    expect(res.status).toBe(401);
  });

  it("401s with a garbage token", async () => {
    const res = await callWithToken("bp_live_garbage_not_real");
    expect(res.status).toBe(401);
  });

  it("returns real data with honest nulls for unfilled fields", async () => {
    const res = await callWithToken(rawToken);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.myStory.businessName).toBe("Vision Board Export Co");
    expect(body.myVibes).toBe("Ambitious, Passionate");
    expect(body.accountability.partnerName).toBe("Test Partner");
    // Never fabricated — no assessment was ever completed for this business.
    expect(body.myScores).toBeNull();
    expect(body.myWhy.myGoal).toBeNull();
  });

  it("404s when the token's account has no business profile", async () => {
    const res = await callWithToken(noBusinessRawToken);
    expect(res.status).toBe(404);
  });

  it("403s when the business hasn't unlocked the full tier yet", async () => {
    const res = await callWithToken(lockedRawToken);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/qualifying Blueprint Session/);
  });

  it("401s once the token is revoked — not just until a restart", async () => {
    await prisma.personalAccessToken.update({ where: { id: tokenId }, data: { revokedAt: new Date() } });
    const res = await callWithToken(rawToken);
    expect(res.status).toBe(401);
  });
});
