import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { assertOrganizationAccess } from "@/lib/organizations/access";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { addOrganizationMemberSchema } from "@/lib/validations/organization";

/**
 * spec: "Organization can have: ... Users, Facilitators." Assigns an
 * *existing* platform user (by email) an org role — org ADMIN or
 * platform admin only, so an org can't add arbitrary staff without
 * someone who already manages it approving.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: organizationId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const allowed = await assertOrganizationAccess(user.id, user.role, organizationId, "ADMIN");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = addOrganizationMemberSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (!targetUser) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }

  const membership = await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId, userId: targetUser.id } },
    create: { organizationId, userId: targetUser.id, role: input.role },
    update: { role: input.role },
  });

  return NextResponse.json({ membership }, { status: 201 });
}
