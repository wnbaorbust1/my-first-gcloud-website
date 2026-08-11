import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { updateSopSchema } from "@/lib/validations/tools";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sopId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sop = await prisma.sop.findUnique({ where: { id: sopId } });
  if (!sop) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, sop.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = updateSopSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.sop.update({
    where: { id: sopId },
    data: {
      ...input,
      reviewDate: input.reviewDate ? new Date(input.reviewDate) : undefined,
    },
  });

  return NextResponse.json({ sop: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sopId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sop = await prisma.sop.findUnique({ where: { id: sopId } });
  if (!sop) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, sop.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.sop.delete({ where: { id: sopId } });

  return NextResponse.json({ ok: true });
}
