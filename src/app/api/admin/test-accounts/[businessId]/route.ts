import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

/** Deletes a test account (business + its dedicated login user) entirely (Phase 7 continued). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageTestAccounts(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { memberships: { include: { user: true }, take: 1 } },
  });
  if (!business || !business.isTestAccount) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const testUser = business.memberships[0]?.user;

  // Cascade deletes handle every business-scoped row; the dedicated
  // login user (never a real member) is removed too so it doesn't
  // linger in the user table.
  await prisma.business.delete({ where: { id: businessId } });
  if (testUser) {
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {
      // Best-effort — if this user somehow owns other real data, leave them be.
    });
  }

  return NextResponse.json({ ok: true });
}
