import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

/**
 * REVIEW A PREVIOUS BOARD VERSION (Phase 7: Admin and Facilitator
 * Controls) — the full stored snapshot for one saved version (Phase 6:
 * Downloads' "Save New Version"), so a facilitator/admin can actually
 * look at what the board said on the day it was saved, not just see a
 * timestamp in a list.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const version = await prisma.visionBoardVersion.findUnique({
    where: { id },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });
  if (!version) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, version.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ version });
}
