import "server-only";

import { prisma } from "@/lib/prisma";

import { getBuilderAccessState, getSyncedMembership } from "./membership";

/**
 * Shared loader for the "does this member currently have Builder access"
 * check that Prompt 9's Money/Progress/Accountability tools all need,
 * same as /build, /roadmap, /my-blueprint (Phase 8) — one place to keep
 * the business lookup + membership sync + access check consistent across
 * every gated page, since it's now used by more than the original four.
 */
export async function getGatedBusinessContext(userId: string) {
  const ub = await prisma.userBusinessMembership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });

  if (!ub) {
    return { ub: null, access: { locked: true as const, reason: "not-unlocked" as const } };
  }

  const billingMembership = await getSyncedMembership(ub.businessId);
  const access = getBuilderAccessState(ub.business.builderAccessEligible, billingMembership);

  return { ub, access };
}
