import { NextResponse } from "next/server";

import { ADMIN_ROLES } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** Toggle a support request between OPEN/RESOLVED — admin only. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const status = body && typeof body === "object" && "status" in body ? body.status : null;
  if (status !== "OPEN" && status !== "RESOLVED") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.supportRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.supportRequest.update({ where: { id }, data: { status } });
  return NextResponse.json({ request: updated });
}
