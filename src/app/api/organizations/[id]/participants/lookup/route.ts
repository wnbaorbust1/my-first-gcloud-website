import { NextResponse } from "next/server";

import { assertOrganizationAccess } from "@/lib/organizations/access";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * Resolves a participant's business by their account email, so cohort
 * assignment and sponsorship forms can take an email (what an org admin
 * actually knows about a participant) instead of asking for a raw
 * businessId. Read-only — org ADMIN or platform admin only.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: organizationId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const allowed = await assertOrganizationAccess(user.id, user.role, organizationId, "ADMIN");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { email },
    include: { businessMemberships: { include: { business: true }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }
  const business = targetUser.businessMemberships[0]?.business;
  if (!business) {
    return NextResponse.json({ error: "That person hasn't created a business profile yet" }, { status: 404 });
  }

  return NextResponse.json({ businessId: business.id, businessName: business.name });
}
