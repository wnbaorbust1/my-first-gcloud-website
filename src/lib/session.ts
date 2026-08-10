import "server-only";

import { getServerSession, type Session } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, hasAnyRole } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/enums";

/** Server-only: read the current session (or null) in a server component / route handler. */
export async function getCurrentSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

/** Server-only: session's user, or null if signed out. */
export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

/**
 * Server-only: require a signed-in user or redirect to /login, preserving
 * the originally requested path so login can send them back.
 */
export async function requireUser(callbackPath?: string) {
  const user = await getCurrentUser();
  if (!user) {
    const callbackUrl = callbackPath
      ? `?callbackUrl=${encodeURIComponent(callbackPath)}`
      : "";
    redirect(`/login${callbackUrl}`);
  }
  return user;
}

/**
 * Server-only: require the signed-in user to hold one of `roles`.
 * Redirects unauthenticated users to /login and signed-in-but-unauthorized
 * users to /dashboard — this is the enforcement point, not just a UI
 * hint, so call it at the top of any admin/facilitator page or API route.
 */
export async function requireRole(roles: Role[], callbackPath?: string) {
  const user = await requireUser(callbackPath);
  if (!hasAnyRole(user.role, roles)) {
    redirect("/dashboard");
  }
  return user;
}

/**
 * Server-only: confirm `userId` may access `businessId` — either because
 * they belong to it (UserBusinessMembership) or because they hold a
 * staff/admin role with legitimate cross-business access. Every future
 * business-scoped query (assessment, roadmap, blueprint, goals) should be
 * guarded with this rather than trusting a businessId from the client.
 */
export async function assertBusinessAccess(
  userId: string,
  role: Role,
  businessId: string,
): Promise<boolean> {
  if (can.viewAllBusinesses(role)) return true;

  if (can.viewAssignedParticipants(role)) {
    const assignment = await prisma.facilitatorAssignment.findUnique({
      where: { facilitatorId_businessId: { facilitatorId: userId, businessId } },
      select: { id: true },
    });
    if (assignment) return true;
  }

  const membership = await prisma.userBusinessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { id: true },
  });
  return Boolean(membership);
}
