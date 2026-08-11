import "server-only";

import { ADMIN_ROLES } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

/** The 3 accepted OrganizationMembership.role values (open string field — see schema.prisma doc comment). */
export const ORG_ROLES = ["ADMIN", "FACILITATOR", "MEMBER"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/**
 * ORGANIZATION ISOLATION (spec Prompt 12 acceptance checklist). A
 * platform ADMIN/SUPER_ADMIN can manage any organization (mirrors
 * `assertBusinessAccess`'s `can.viewAllBusinesses` escape hatch); anyone
 * else needs a real `OrganizationMembership` row for *this specific*
 * organization. `minOrgRole: "ADMIN"` is for mutating actions (create a
 * cohort, sponsor a business, edit branding) — any org role at all is
 * enough to view the read-only dashboard/analytics.
 */
export async function assertOrganizationAccess(
  userId: string,
  role: Role,
  organizationId: string,
  minOrgRole?: "ADMIN",
): Promise<boolean> {
  if (ADMIN_ROLES.includes(role)) return true;

  const membership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!membership) return false;
  if (minOrgRole === "ADMIN") return membership.role === "ADMIN";
  return true;
}

/** Every organization this user can see — all of them for a platform admin, else only the ones they're a member of. */
export async function getUserOrganizationIds(userId: string, role: Role): Promise<string[]> {
  if (ADMIN_ROLES.includes(role)) {
    const all = await prisma.organization.findMany({ select: { id: true } });
    return all.map((o) => o.id);
  }
  const memberships = await prisma.organizationMembership.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  return memberships.map((m) => m.organizationId);
}
