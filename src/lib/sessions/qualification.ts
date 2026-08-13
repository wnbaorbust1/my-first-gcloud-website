import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { RegistrationStatus } from "@/generated/prisma/enums";
import { ensureMembershipActivated } from "@/lib/billing/membership";
import { ensureRoadmapGenerated } from "@/lib/roadmap/generate";
import { prisma } from "@/lib/prisma";

/**
 * Attendance/status values that unlock the post-session Blueprint
 * Builder dashboard (spec: "Only qualifying attendance/completion should
 * unlock the post-session Blueprint experience.").
 */
export const QUALIFYING_STATUSES: RegistrationStatus[] = ["ATTENDED", "COMPLETED"];

/**
 * Facilitator/admin action: set a registration's attendance status. If
 * the new status qualifies and the business isn't already unlocked,
 * flips Business.builderAccessEligible + records sessionCompletedAt /
 * qualifyingSessionRegistrationId in the same transaction — this is the
 * *only* place those three fields are written, so "why is Builder
 * unlocked" always traces back to one registration.
 *
 * PAYMENT GATE (Vision Board & Blueprint Generator, audited 2026-08-13):
 * the attendance *status* is always recorded exactly as given — a
 * facilitator's record of what actually happened is never suppressed or
 * altered by payment state. But a status only counts as *qualifying*
 * (unlocks Builder, starts the Membership trial) when the session either
 * doesn't require payment (`priceCents` null/0 — free/legacy sessions
 * keep working exactly as before) or the registration's `paidAt` is
 * already set. A member who attended a $150 session but hasn't paid yet
 * can still be marked ATTENDED honestly; Builder simply stays locked
 * until payment clears — the session-payment webhook calls the same
 * shared `unlockBuilderAccessIfQualifying` below when `paidAt` lands,
 * regardless of which of the two events (attendance, payment) arrives
 * first.
 *
 * Known limitation (documented in BUILD_STATUS.md): correcting a mis-marked
 * ATTENDED back to NO_SHOW does not revoke an unlock that already
 * happened — acceptable for this phase, revisit if it becomes a real
 * workflow need.
 */
export async function markAttendance(
  registrationId: string,
  status: Extract<RegistrationStatus, "ATTENDED" | "NO_SHOW" | "COMPLETED" | "CANCELLED">,
  notes?: string,
) {
  const checkedInAt = status === "ATTENDED" || status === "COMPLETED" ? new Date() : undefined;

  await prisma.sessionRegistration.update({
    where: { id: registrationId },
    data: {
      status,
      ...(checkedInAt ? { checkedInAt } : {}),
      ...(notes !== undefined ? { attendanceNotes: notes } : {}),
    },
  });

  if (QUALIFYING_STATUSES.includes(status)) {
    await unlockBuilderAccessIfQualifying(registrationId);
  }
}

/**
 * Shared unlock check, called from two places: `markAttendance` (right
 * after a qualifying status is recorded) and the session-payment webhook
 * (right after `paidAt` is recorded — covers the equally real ordering
 * where a member is marked ATTENDED before their payment clears). Both
 * callers converge here so "attended AND paid" only ever needs to be
 * true once, however the two events arrive, before Builder unlocks.
 * No-ops quietly if the registration isn't in a qualifying status, has
 * no business, payment is still outstanding, or the business is already
 * unlocked — every one of those is an expected, non-error state.
 */
export async function unlockBuilderAccessIfQualifying(registrationId: string): Promise<void> {
  const registration = await prisma.sessionRegistration.findUniqueOrThrow({
    where: { id: registrationId },
    select: {
      businessId: true,
      status: true,
      paidAt: true,
      session: { select: { priceCents: true } },
    },
  });

  if (!registration.businessId) return;
  if (!QUALIFYING_STATUSES.includes(registration.status)) return;

  const requiresPayment = (registration.session.priceCents ?? 0) > 0;
  if (requiresPayment && !registration.paidAt) return;

  const business = await prisma.business.findUnique({
    where: { id: registration.businessId },
    select: { builderAccessEligible: true },
  });
  if (!business || business.builderAccessEligible) return;

  await prisma.business.update({
    where: { id: registration.businessId },
    data: {
      builderAccessEligible: true,
      sessionCompletedAt: new Date(),
      qualifyingSessionRegistrationId: registrationId,
    },
  });

  // Generate the starter Roadmap right when Builder unlocks, so the
  // dashboard has real tasks to show on the very next load rather than
  // an empty state.
  await ensureRoadmapGenerated(registration.businessId);
  // spec Prompt 8: the complimentary period begins exactly here —
  // attendance confirmed AND Builder just activated — never at
  // registration. Idempotent: a business that already has a
  // Membership (e.g. attending a second qualifying session while
  // already a paid member) gets no new trial, per the spec's
  // EXISTING MEMBER RULE.
  await ensureMembershipActivated(registration.businessId, registrationId);
}

const MAX_SERIALIZATION_RETRIES = 3;

/**
 * Registers a member for a session, or waitlists them if it's full
 * (spec WAITLIST: "If capacity is full: JOIN WAITLIST. Store waitlist
 * order.").
 *
 * CAPACITY RACE (launch-hardening audit finding): the read-count / decide
 * / write used to be three separate queries with no lock between them —
 * two people registering for the last seat at the same instant could
 * both read `activeCount < capacity` as true and both land as
 * REGISTERED, overbooking the session. The whole read-decide-write now
 * runs inside one `Serializable` interactive transaction, which makes
 * Postgres itself detect the conflict: the loser gets a serialization
 * failure (Prisma error code P2034) instead of a silently-wrong write.
 * Retried a few times (the standard pattern for serializable
 * transactions — a conflict is expected and transient, not a real
 * error) before giving up.
 */
export async function registerForSession(params: {
  userId: string;
  businessId: string | null;
  sessionId: string;
}) {
  for (let attempt = 0; attempt < MAX_SERIALIZATION_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const session = await tx.sessionOffering.findUniqueOrThrow({
            where: { id: params.sessionId },
          });

          const existing = await tx.sessionRegistration.findUnique({
            where: { sessionId_userId: { sessionId: params.sessionId, userId: params.userId } },
          });
          if (existing && existing.status !== "CANCELLED") {
            return existing;
          }

          const activeCount = await tx.sessionRegistration.count({
            where: { sessionId: params.sessionId, status: "REGISTERED" },
          });

          const hasRoom = session.capacity === null || activeCount < session.capacity;

          if (existing) {
            // Re-registering after a prior cancellation.
            return tx.sessionRegistration.update({
              where: { id: existing.id },
              data: hasRoom
                ? { status: "REGISTERED", waitlistPosition: null, businessId: params.businessId }
                : {
                    status: "WAITLISTED",
                    waitlistPosition: await nextWaitlistPosition(tx, params.sessionId),
                    businessId: params.businessId,
                  },
            });
          }

          return tx.sessionRegistration.create({
            data: {
              sessionId: params.sessionId,
              userId: params.userId,
              businessId: params.businessId,
              status: hasRoom ? "REGISTERED" : "WAITLISTED",
              waitlistPosition: hasRoom ? null : await nextWaitlistPosition(tx, params.sessionId),
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      const isSerializationConflict =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (isSerializationConflict && attempt < MAX_SERIALIZATION_RETRIES - 1) {
        continue;
      }
      throw err;
    }
  }
  // Unreachable — the loop above always returns or throws — but keeps TypeScript happy.
  throw new Error("registerForSession: exhausted retries");
}

async function nextWaitlistPosition(
  tx: Prisma.TransactionClient,
  sessionId: string,
): Promise<number> {
  const count = await tx.sessionRegistration.count({
    where: { sessionId, status: "WAITLISTED" },
  });
  return count + 1;
}

/**
 * Cancels a registration and, if it freed a confirmed seat, promotes the
 * longest-waiting waitlisted registrant into it.
 */
export async function cancelRegistration(registrationId: string) {
  const registration = await prisma.sessionRegistration.findUniqueOrThrow({
    where: { id: registrationId },
  });

  await prisma.sessionRegistration.update({
    where: { id: registrationId },
    data: { status: "CANCELLED", waitlistPosition: null },
  });

  if (registration.status === "REGISTERED") {
    const nextInLine = await prisma.sessionRegistration.findFirst({
      where: { sessionId: registration.sessionId, status: "WAITLISTED" },
      orderBy: { waitlistPosition: "asc" },
    });
    if (nextInLine) {
      await prisma.sessionRegistration.update({
        where: { id: nextInLine.id },
        data: { status: "REGISTERED", waitlistPosition: null },
      });
    }
  }
}
