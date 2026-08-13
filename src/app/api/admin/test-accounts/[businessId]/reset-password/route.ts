import { randomBytes } from "crypto";

import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

function generatePassword(): string {
  return randomBytes(12).toString("base64url");
}

/** Regenerates a test account's login password when an admin has forgotten it (Phase 7 continued). */
export async function POST(
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
  if (!testUser) {
    return NextResponse.json({ error: "This test account has no login user." }, { status: 409 });
  }

  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: testUser.id }, data: { passwordHash } });

  return NextResponse.json({ loginEmail: testUser.email, password });
}
