import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const updateSchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "CANCELLED", "COMPLETED"]).optional(),
  facilitatorId: z.string().min(1).nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageSessions(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = updateSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const session = await prisma.sessionOffering.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.sessionOffering.update({ where: { id: sessionId }, data: input });

  return NextResponse.json({ session: updated });
}
