import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess } from "@/lib/session";

/**
 * ROUTE/INTEGRATION COVERAGE (audit follow-up to Known Issue #3): every
 * tool route's authorization check funnels through `assertBusinessAccess`
 * — this exercises it against a real Postgres database instead of the
 * mocked Prisma client the pure-function suite uses, the same
 * cross-tenant-isolation property that was previously only checked via
 * live HTTP scripts (see BUILD_STATUS.md "Live HTTP + Postgres
 * verification").
 */
describe("assertBusinessAccess (real DB)", () => {
  const suffix = `sess-${Date.now()}`;
  const ownerId = `usr-owner-${suffix}`;
  const strangerId = `usr-stranger-${suffix}`;
  const facilitatorId = `usr-fac-${suffix}`;
  const adminId = `usr-admin-${suffix}`;
  const ownedBusinessId = `biz-${suffix}`;
  const unrelatedBusinessId = `biz-other-${suffix}`;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: ownerId, email: `owner-${suffix}@test.local`, firstName: "Owner", lastName: "User", role: "MEMBER" },
        { id: strangerId, email: `stranger-${suffix}@test.local`, firstName: "Stranger", lastName: "User", role: "MEMBER" },
        { id: facilitatorId, email: `fac-${suffix}@test.local`, firstName: "Fac", lastName: "User", role: "FACILITATOR" },
        { id: adminId, email: `admin-${suffix}@test.local`, firstName: "Admin", lastName: "User", role: "ADMIN" },
      ],
    });
    await prisma.business.createMany({
      data: [
        { id: ownedBusinessId, name: "Owned Co" },
        { id: unrelatedBusinessId, name: "Unrelated Co" },
      ],
    });
    await prisma.userBusinessMembership.create({
      data: { userId: ownerId, businessId: ownedBusinessId },
    });
  });

  afterAll(async () => {
    await prisma.userBusinessMembership.deleteMany({ where: { userId: { in: [ownerId, strangerId] } } });
    await prisma.facilitatorAssignment.deleteMany({ where: { facilitatorId } });
    await prisma.business.deleteMany({ where: { id: { in: [ownedBusinessId, unrelatedBusinessId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId, facilitatorId, adminId] } } });
  });

  it("grants the owning member access to their own business", async () => {
    await expect(assertBusinessAccess(ownerId, "MEMBER", ownedBusinessId)).resolves.toBe(true);
  });

  it("denies a member with no membership row on that business (cross-tenant isolation)", async () => {
    await expect(assertBusinessAccess(strangerId, "MEMBER", ownedBusinessId)).resolves.toBe(false);
  });

  it("denies the owner access to a business they don't belong to", async () => {
    await expect(assertBusinessAccess(ownerId, "MEMBER", unrelatedBusinessId)).resolves.toBe(false);
  });

  it("denies a facilitator with no FacilitatorAssignment row", async () => {
    await expect(assertBusinessAccess(facilitatorId, "FACILITATOR", ownedBusinessId)).resolves.toBe(false);
  });

  it("grants a facilitator access once a real FacilitatorAssignment row exists", async () => {
    await prisma.facilitatorAssignment.create({
      data: { facilitatorId, businessId: ownedBusinessId },
    });
    await expect(assertBusinessAccess(facilitatorId, "FACILITATOR", ownedBusinessId)).resolves.toBe(true);
  });

  it("grants an admin access to any business without a membership row", async () => {
    await expect(assertBusinessAccess(adminId, "ADMIN", ownedBusinessId)).resolves.toBe(true);
    await expect(assertBusinessAccess(adminId, "ADMIN", unrelatedBusinessId)).resolves.toBe(true);
  });
});
