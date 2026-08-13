import { NextResponse } from "next/server";

import { registerForSession } from "@/lib/sessions/qualification";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await prisma.sessionOffering.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.status !== "SCHEDULED") {
    return NextResponse.json({ error: "This session isn't open for registration." }, { status: 409 });
  }
  if (session.registrationDeadline && session.registrationDeadline.getTime() < Date.now()) {
    return NextResponse.json({ error: "The registration deadline has passed." }, { status: 409 });
  }

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const registration = await registerForSession({
    userId: user.id,
    businessId: membership?.businessId ?? null,
    sessionId,
  });

  return NextResponse.json({ registration });
}
