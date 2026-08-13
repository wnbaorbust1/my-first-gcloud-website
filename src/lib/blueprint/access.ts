import "server-only";

import type { RegistrationStatus, SessionFormat } from "@/generated/prisma/enums";
import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";

/**
 * PHASE 5: LOCKING AND UNLOCKING — the single source of truth for the
 * member-facing access ladder:
 *
 *   Assessment not completed  -> "assessment_only"  (Assessment only)
 *   Assessment completed      -> "preview"           (scores, stage, summary
 *                                                      + blurred/limited board)
 *   Session booked            -> "preview_booked"    (preview + appointment)
 *   Session completed         -> "full"              (full board, editing,
 *   Free month active         -> "full"               roadmap, downloads —
 *   Paid subscription active  -> "full"               builderAccessEligible
 *                                                      + a membership that
 *                                                      currently grants access,
 *                                                      whatever its flavor)
 *   Subscription expired      -> "expired"           (read-only summary +
 *                                                      renewal option)
 *
 * Every branch reads from a real Assessment/Business/Membership/
 * SessionRegistration row — nothing here is inferred or fabricated. The
 * dashboard (src/lib/dashboard/data.ts) computes its own richer version
 * of this same ladder (it also needs roadmap/goal/tools data the board
 * doesn't) — this function exists so the two board-facing surfaces that
 * aren't the dashboard (Assessment Results, the Vision Board itself)
 * agree with it exactly instead of re-deriving these same branches ad
 * hoc, which is how the two would eventually drift.
 */
export type BlueprintAccessState = "assessment_only" | "preview" | "preview_booked" | "full" | "expired";

export interface AccessAppointment {
  registrationId: string;
  status: Extract<RegistrationStatus, "REGISTERED" | "WAITLISTED">;
  sessionTitle: string;
  startsAt: Date;
  endsAt: Date | null;
  format: SessionFormat;
  location: string | null;
  virtualLink: string | null;
  timezone: string;
}

export interface ResolvedBlueprintAccess {
  state: BlueprintAccessState;
  /** Only set when state === "preview_booked" — the member's live upcoming registration. */
  appointment: AccessAppointment | null;
}

export async function resolveBlueprintAccess(
  userId: string,
  businessId: string,
): Promise<ResolvedBlueprintAccess> {
  const [assessment, business] = await Promise.all([
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      select: { id: true },
    }),
    prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { builderAccessEligible: true },
    }),
  ]);

  if (!assessment) {
    return { state: "assessment_only", appointment: null };
  }

  // SESSION COMPLETED / FREE MONTH / PAID SUBSCRIPTION / EXPIRED — once
  // builderAccessEligible has ever flipped true (a qualifying session was
  // attended and paid — see src/lib/sessions/qualification.ts, the only
  // place that field is written), whether the member currently gets the
  // full experience or the read-only expired summary depends entirely on
  // their Membership's live status (trial, paid, or lapsed) — the exact
  // same check every other Builder surface already uses.
  if (business.builderAccessEligible) {
    const billingMembership = await getSyncedMembership(businessId);
    const access = getBuilderAccessState(business.builderAccessEligible, billingMembership);
    return { state: access.locked ? "expired" : "full", appointment: null };
  }

  // Assessment done, session not yet completed — "booked" iff there's a
  // live (not cancelled, not yet attended) registration for this member.
  const registration = await prisma.sessionRegistration.findFirst({
    where: { userId, businessId, status: { in: ["REGISTERED", "WAITLISTED"] } },
    orderBy: { session: { startsAt: "asc" } },
    include: { session: true },
  });

  if (!registration) {
    return { state: "preview", appointment: null };
  }

  return {
    state: "preview_booked",
    appointment: {
      registrationId: registration.id,
      status: registration.status as "REGISTERED" | "WAITLISTED",
      sessionTitle: registration.session.title,
      startsAt: registration.session.startsAt,
      endsAt: registration.session.endsAt,
      format: registration.session.format,
      location: registration.session.location,
      virtualLink: registration.session.virtualLink,
      timezone: registration.session.timezone,
    },
  };
}
