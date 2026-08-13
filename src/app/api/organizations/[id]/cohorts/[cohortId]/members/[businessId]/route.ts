import { NextResponse } from "next/server";

import { assertOrganizationAccess } from "@/lib/organizations/access";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; cohortId: string; businessId: string }> },
) {
  const { id: organizationId, cohortId, businessId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const allowed = await assertOrganizationAccess(user.id, user.role, organizationId, "ADMIN");
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort || cohort.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.cohortMembership.deleteMany({ where: { cohortId, businessId } });

  return NextResponse.json({ ok: true });
}
