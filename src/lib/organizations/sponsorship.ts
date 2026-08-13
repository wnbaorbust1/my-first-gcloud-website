import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * SPONSORED ACCESS (spec Prompt 12): "Allow organization to sponsor
 * Blueprint access... Track sponsor and expiration." Upserts the same
 * `Membership` row Phase 8's admin-grant flow uses — one business has
 * exactly one Membership either way — but records which organization is
 * paying and (optionally) when that sponsorship ends. Works whether or
 * not the business has attended a qualifying session yet, same as the
 * Phase 8 grant flow.
 */
export async function sponsorBusiness(params: {
  businessId: string;
  organizationId: string;
  sponsoredUntil: Date | null;
  grantedByUserId: string;
  organizationName: string;
}) {
  const membership = await prisma.membership.upsert({
    where: { businessId: params.businessId },
    create: {
      businessId: params.businessId,
      status: "SPONSORED",
      sponsorOrganizationId: params.organizationId,
      sponsoredUntil: params.sponsoredUntil,
      grantedByUserId: params.grantedByUserId,
      grantedReason: `Sponsored by ${params.organizationName}`,
    },
    update: {
      status: "SPONSORED",
      sponsorOrganizationId: params.organizationId,
      sponsoredUntil: params.sponsoredUntil,
      grantedByUserId: params.grantedByUserId,
      grantedReason: `Sponsored by ${params.organizationName}`,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: params.grantedByUserId,
      action: "membership_sponsored",
      entityType: "Membership",
      entityId: membership.id,
      metadata: {
        businessId: params.businessId,
        organizationId: params.organizationId,
        sponsoredUntil: params.sponsoredUntil,
      },
    },
  });

  return membership;
}
