import type { Role } from "@/generated/prisma/enums";

/**
 * Centralized authorization. This is the single source of truth for "who
 * can do what" — route protection (middleware.ts), server components, and
 * API routes all call into this file instead of re-deriving role checks,
 * and nothing here assumes hiding a button is enough (spec Task 4: "Do
 * not rely only on hiding buttons in the UI. Protect backend/data access
 * based on roles.").
 *
 * Kept dependency-free (no Prisma import) so it can run in the Edge
 * middleware runtime as well as normal server code.
 */

/** Roles ordered from least to most platform-wide authority. */
export const ROLE_HIERARCHY: Role[] = [
  "MEMBER",
  "FACILITATOR",
  "IMPLEMENTATION_SPECIALIST",
  "ADMIN",
  "SUPER_ADMIN",
];

export const STAFF_ROLES: Role[] = [
  "FACILITATOR",
  "IMPLEMENTATION_SPECIALIST",
  "ADMIN",
  "SUPER_ADMIN",
];

export const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

export function hasAnyRole(role: Role | undefined, allowed: Role[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

/** True if `role` sits at or above `minimum` in ROLE_HIERARCHY. */
export function isAtLeast(role: Role | undefined, minimum: Role): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minimum);
}

/**
 * High-level permission checks. Add one entry per capability as modules
 * land — call `can()` from both UI (to decide what to render) and from
 * the API route / server action that performs the mutation (to actually
 * enforce it).
 */
export const can = {
  manageUsers: (role?: Role) => hasAnyRole(role, ADMIN_ROLES),
  manageSessions: (role?: Role) => hasAnyRole(role, ADMIN_ROLES),
  manageContent: (role?: Role) => hasAnyRole(role, ADMIN_ROLES),
  manageAssessmentQuestions: (role?: Role) => hasAnyRole(role, ADMIN_ROLES),
  viewAllBusinesses: (role?: Role) => hasAnyRole(role, ADMIN_ROLES),
  viewAssignedParticipants: (role?: Role) => hasAnyRole(role, STAFF_ROLES),
  accessAdminArea: (role?: Role) => hasAnyRole(role, ADMIN_ROLES),
  accessFacilitatorArea: (role?: Role) => hasAnyRole(role, STAFF_ROLES),
};

/** Route-group -> roles allowed, used by middleware.ts. */
export const ROUTE_GROUP_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ADMIN_ROLES },
  { prefix: "/facilitator", roles: STAFF_ROLES },
];
