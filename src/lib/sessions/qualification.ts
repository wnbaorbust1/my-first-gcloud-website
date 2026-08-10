import "server-only";

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
  const registration = await prisma.sessionRegistration.findUniqueOrThrow({
    where: { id: registrationId },
    select: { id: true, businessId: true },
  });

  const isQualifying = QUALIFYING_STATUSES.includes(status);
  const checkedInAt = status === "ATTENDED" || status === "COMPLETED" ? new Date() : undefined;

  const updates = [
    prisma.sessionRegistration.update({
      where: { id: registrationId },
      data: {
        status,
        ...(checkedInAt ? { checkedInAt } : {}),
        ...(notes !== undefined ? { attendanceNotes: notes } : {}),
      },
    }),
  ];

  let justUnlocked = false;

  if (isQualifying && registration.businessId) {
    const business = await prisma.business.findUnique({
      where: { id: registration.businessId },
      select: { builderAccessEligible: true },
    });
    if (business && !business.builderAccessEligible) {
      justUnlocked = true;
      updates.push(
        prisma.business.update({
          where: { id: registration.businessId },
          data: {
            builderAccessEligible: true,
            sessionCompletedAt: new Date(),
            qualifyingSessionRegistrationId: registrationId,
          },
        }) as never,
      );
    }
  }

  await prisma.$transaction(updates);

  // Generate the starter Roadmap right when Builder unlocks, so the
  // dashboard has real tasks to show on the very next load rather than
  // an empty state. Runs after the transaction (it does its own writes).
  if (justUnlocked && registration.businessId) {
    await ensureRoadmapGenerated(registration.businessId);
    // spec Prompt 8: the complimentary period begins exactly here —
    // attendance confirmed AND Builder just activated — never at
    // registration. Idempotent: a business that already has a
    // Membership (e.g. attending a second qualifying session while
    // already a paid member) gets no new trial, per the spec's
    // EXISTING MEMBER RULE.
    await ensureMembershipActivated(registration.businessId, registrationId);
  }
}

/**
 * Registers a member for a session, or waitlists them if it's full
 * (spec WAITLIST: "If capacity is full: JOIN WAITLIST. Store waitlist
 * order.").
 */
export async function registerForSession(params: {
  userId: string;
  businessId: string | null;
  sessionId: string;
}) {
  const session = await prisma.sessionOffering.findUniqueOrThrow({
    where: { id: params.sessionId },
  });

  const existing = await prisma.sessionRegistration.findUnique({
    where: { sessionId_userId: { sessionId: params.sessionId, userId: params.userId } },
  });
  if (existing && existing.status !== "CANCELLED") {
    return existing;
  }

  const activeCount = await prisma.sessionRegistration.count({
    where: { sessionId: params.sessionId, status: "REGISTERED" },
  });

  const hasRoom = session.capacity === null || activeCount < session.capacity;

  if (existing) {
    // Re-registering after a prior cancellation.
    return prisma.sessionRegistration.update({
      where: { id: existing.id },
      data: hasRoom
        ? { status: "REGISTERED", waitlistPosition: null, businessId: params.businessId }
        : {
            status: "WAITLISTED",
            waitlistPosition: await nextWaitlistPosition(params.sessionId),
            businessId: params.businessId,
          },
    });
  }

  return prisma.sessionRegistration.create({
    data: {
      sessionId: params.sessionId,
      userId: params.userId,
      businessId: params.businessId,
      status: hasRoom ? "REGISTERED" : "WAITLISTED",
      waitlistPosition: hasRoom ? null : await nextWaitlistPosition(params.sessionId),
    },
  });
}

async function nextWaitlistPosition(sessionId: string): Promise<number> {
  const count = await prisma.sessionRegistration.count({
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
