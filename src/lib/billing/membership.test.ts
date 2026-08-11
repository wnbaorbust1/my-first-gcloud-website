import { describe, expect, it } from "vitest";

import type { MembershipModel } from "@/generated/prisma/models/Membership";

import { resolveEffectiveStatus, STATUSES_WITH_BUILDER_ACCESS } from "./membership";

/**
 * Regression coverage for resolveEffectiveStatus — the one function every
 * "is Builder access valid right now" decision in this app runs through.
 * Directly covers the launch-hardening audit's CRITICAL-blocker check
 * #24 ("users can access premium content indefinitely without proper
 * eligibility") by asserting EXPIRED is reachable and is excluded from
 * builder access.
 */
function membershipFixture(overrides: Partial<MembershipModel> = {}): MembershipModel {
  return {
    id: "m1",
    businessId: "b1",
    status: "COMPLIMENTARY",
    plan: null,
    qualifyingSessionRegistrationId: null,
    attendanceConfirmedAt: null,
    activatedAt: null,
    trialStartsAt: null,
    trialEndsAt: null,
    convertedAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    paymentMethodBrand: null,
    paymentMethodLast4: null,
    paymentMethodExpMonth: null,
    paymentMethodExpYear: null,
    currentPeriodEndsAt: null,
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    grantedByUserId: null,
    grantedReason: null,
    sponsorOrganizationId: null,
    sponsoredUntil: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  } as MembershipModel;
}

const NOW = new Date("2026-08-11T00:00:00Z");
const PAST = new Date("2026-01-01T00:00:00Z");
const FUTURE = new Date("2027-01-01T00:00:00Z");

describe("resolveEffectiveStatus", () => {
  it("expires a COMPLIMENTARY trial whose trialEndsAt has passed", () => {
    const m = membershipFixture({ status: "COMPLIMENTARY", trialEndsAt: PAST });
    expect(resolveEffectiveStatus(m, NOW)).toBe("EXPIRED");
  });

  it("leaves an active COMPLIMENTARY trial alone", () => {
    const m = membershipFixture({ status: "COMPLIMENTARY", trialEndsAt: FUTURE });
    expect(resolveEffectiveStatus(m, NOW)).toBe("COMPLIMENTARY");
  });

  it("expires a CANCELLED membership once its paid period ends", () => {
    const m = membershipFixture({ status: "CANCELLED", currentPeriodEndsAt: PAST });
    expect(resolveEffectiveStatus(m, NOW)).toBe("EXPIRED");
  });

  it("keeps a CANCELLED membership's access through the paid period", () => {
    const m = membershipFixture({ status: "CANCELLED", currentPeriodEndsAt: FUTURE });
    expect(resolveEffectiveStatus(m, NOW)).toBe("CANCELLED");
  });

  it("expires a SPONSORED membership once sponsoredUntil passes", () => {
    const m = membershipFixture({ status: "SPONSORED", sponsoredUntil: PAST });
    expect(resolveEffectiveStatus(m, NOW)).toBe("EXPIRED");
  });

  it("never expires a SPONSORED membership with no sponsoredUntil (Phase 8 admin-grant flow)", () => {
    const m = membershipFixture({ status: "SPONSORED", sponsoredUntil: null });
    expect(resolveEffectiveStatus(m, NOW)).toBe("SPONSORED");
  });

  it("passes through every other status unchanged (ACTIVE_MONTHLY, ACTIVE_ANNUAL, PAYMENT_ISSUE, ADMIN_GRANTED)", () => {
    for (const status of ["ACTIVE_MONTHLY", "ACTIVE_ANNUAL", "PAYMENT_ISSUE", "ADMIN_GRANTED"] as const) {
      const m = membershipFixture({ status });
      expect(resolveEffectiveStatus(m, NOW)).toBe(status);
    }
  });

  it("EXPIRED is excluded from builder access", () => {
    expect(STATUSES_WITH_BUILDER_ACCESS).not.toContain("EXPIRED");
  });
});
