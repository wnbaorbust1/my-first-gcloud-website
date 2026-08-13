import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { registerForSession } from "@/lib/sessions/qualification";

/**
 * ROUTE/INTEGRATION COVERAGE — automates the exact scenario Known Issue
 * #3 / the Ultra Pre-Publish Audit's top concrete-and-reproducible risk
 * only had live-HTTP-script coverage for: two registrants racing for the
 * last seat in a capacity-1 session. `registerForSession` wraps the
 * count-then-write in a `Serializable` transaction with a retry loop
 * (src/lib/sessions/qualification.ts) specifically so this can't
 * double-book — this test drives two REAL concurrent transactions
 * against a REAL Postgres database and asserts the outcome, instead of
 * relying on a human re-running a manual script.
 */
describe("registerForSession capacity race (real DB)", () => {
  const suffix = `qual-${Date.now()}`;
  const userAId = `usr-a-${suffix}`;
  const userBId = `usr-b-${suffix}`;
  const sessionId = `sess-cap1-${suffix}`;

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: userAId, email: `a-${suffix}@test.local`, firstName: "A", lastName: "Racer", role: "MEMBER" },
        { id: userBId, email: `b-${suffix}@test.local`, firstName: "B", lastName: "Racer", role: "MEMBER" },
      ],
    });
    await prisma.sessionOffering.create({
      data: {
        id: sessionId,
        sessionType: "PASSION",
        title: "Capacity Race Test Session",
        status: "SCHEDULED",
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        capacity: 1,
      },
    });
  });

  afterAll(async () => {
    await prisma.sessionRegistration.deleteMany({ where: { sessionId } });
    await prisma.sessionOffering.delete({ where: { id: sessionId } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
  });

  it("gives exactly one REGISTERED and one WAITLISTED when two users race for the last seat", async () => {
    const [resultA, resultB] = await Promise.all([
      registerForSession({ userId: userAId, businessId: null, sessionId }),
      registerForSession({ userId: userBId, businessId: null, sessionId }),
    ]);

    const statuses = [resultA.status, resultB.status].sort();
    expect(statuses).toEqual(["REGISTERED", "WAITLISTED"]);

    // The real proof: re-query the DB (not just trust the return values)
    // and confirm the invariant the whole fix exists for — never more
    // REGISTERED rows than capacity.
    const registered = await prisma.sessionRegistration.count({
      where: { sessionId, status: "REGISTERED" },
    });
    expect(registered).toBe(1);

    const waitlisted = await prisma.sessionRegistration.findFirst({
      where: { sessionId, status: "WAITLISTED" },
    });
    expect(waitlisted?.waitlistPosition).toBe(1);
  });

  it("registering again for the same session returns the existing (non-cancelled) registration, not a duplicate row", async () => {
    const before = await prisma.sessionRegistration.count({ where: { sessionId } });
    await registerForSession({ userId: userAId, businessId: null, sessionId });
    const after = await prisma.sessionRegistration.count({ where: { sessionId } });
    expect(after).toBe(before);
  });
});
