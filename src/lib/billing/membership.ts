import "server-only";

import type { MembershipStatus } from "@/generated/prisma/enums";
import type { MembershipModel } from "@/generated/prisma/models/Membership";
import { prisma } from "@/lib/prisma";

type Membership = MembershipModel;

import { TRIAL_DAYS } from "./pricing";

/**
 * TRIAL / COMPLIMENTARY LOGIC (spec Prompt 8). Called from the same
 * markAttendance transaction that flips Business.builderAccessEligible
 * (src/lib/sessions/qualification.ts) — the complimentary period begins
 * exactly when "the user's qualifying session attendance/completion is
 * confirmed and their Builder dashboard is activated," never at
 * registration.
 *
 * EXISTING MEMBER RULE: idempotent by design — if this business already
 * has a Membership row (any status), it's returned untouched. No new
 * trial, no extra free time, no matter how many more sessions get
 * attended later. A promotional credit is an explicit admin action
 * (see grantMembership), never an automatic side effect of attendance.
 */
export async function ensureMembershipActivated(
  businessId: string,
  qualifyingSessionRegistrationId: string,
): Promise<Membership> {
  const existing = await prisma.membership.findUnique({ where: { businessId } });
  if (existing) return existing;

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  return prisma.membership.create({
    data: {
      businessId,
      status: "COMPLIMENTARY",
      qualifyingSessionRegistrationId,
      attendanceConfirmedAt: now,
      activatedAt: now,
      trialStartsAt: now,
      trialEndsAt,
    },
  });
}

/**
 * Pure function: what a membership's status *should* read as right now,
 * given its stored status and dates. The only two automatic, time-based
 * transitions are the ones the spec explicitly describes — a
 * complimentary trial running out, and a cancelled subscription's paid
 * period ending ("allow access through current paid billing period").
 * Every other status (ACTIVE_*, PAYMENT_ISSUE, SPONSORED, ADMIN_GRANTED)
 * only changes via an explicit action (Stripe webhook or admin grant) —
 * never silently reinterpreted here.
 */
export function resolveEffectiveStatus(membership: Membership, now: Date = new Date()): MembershipStatus {
  if (membership.status === "COMPLIMENTARY" && membership.trialEndsAt && membership.trialEndsAt <= now) {
    return "EXPIRED";
  }
  if (membership.status === "CANCELLED" && membership.currentPeriodEndsAt && membership.currentPeriodEndsAt <= now) {
    return "EXPIRED";
  }
  return membership.status;
}

/**
 * Lazily syncs a membership's stored status to its effective one (the
 * same idempotent "ensure*" pattern used throughout this app — no cron
 * job required). Called wherever a membership is loaded for an access
 * check or shown on the Billing page, so "30-day expiration" and
 * "cancellation access ends at period end" are always correct without a
 * background job.
 */
export async function syncMembershipIfStale(membership: Membership): Promise<Membership> {
  const effective = resolveEffectiveStatus(membership);
  if (effective === membership.status) return membership;
  return prisma.membership.update({ where: { id: membership.id }, data: { status: effective } });
}

/** Loads (and lazily syncs) a business's membership, or null if it hasn't been activated yet. */
export async function getSyncedMembership(businessId: string): Promise<Membership | null> {
  const membership = await prisma.membership.findUnique({ where: { businessId } });
  if (!membership) return null;
  return syncMembershipIfStale(membership);
}

export const STATUSES_WITH_BUILDER_ACCESS: MembershipStatus[] = [
  "COMPLIMENTARY",
  "ACTIVE_MONTHLY",
  "ACTIVE_ANNUAL",
  "PAYMENT_ISSUE", // grace period — flagged on the Billing page, not locked out immediately.
  "CANCELLED", // still within the paid period they already bought (spec).
  "SPONSORED",
  "ADMIN_GRANTED",
];

/** Whether a (already-synced) membership currently entitles its business to Builder functionality. */
export function membershipGrantsAccess(membership: Membership | null): boolean {
  if (!membership) return false;
  return STATUSES_WITH_BUILDER_ACCESS.includes(membership.status);
}

export type BuilderAccessState =
  | { locked: false }
  | { locked: true; reason: "not-unlocked" }
  | { locked: true; reason: "membership-expired" };

/**
 * The combined gate every Builder-area page (dashboard, /build, /roadmap,
 * /my-blueprint, /ai) checks. Two independent things have to both be
 * true: the business has ever unlocked Builder at all
 * (builderAccessEligible), and its membership currently grants access.
 * Kept separate from builderAccessEligible itself — that flag's meaning
 * ("this business has attended a qualifying session") doesn't change
 * just because their trial ran out; only what they're *currently allowed
 * to do* does.
 */
export function getBuilderAccessState(
  builderAccessEligible: boolean,
  membership: Membership | null,
): BuilderAccessState {
  if (!builderAccessEligible) return { locked: true, reason: "not-unlocked" };
  if (!membershipGrantsAccess(membership)) return { locked: true, reason: "membership-expired" };
  return { locked: false };
}
