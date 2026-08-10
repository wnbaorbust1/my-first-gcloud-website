import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const updateSchema = z.object({
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: resourceId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageContent(user.role)) {
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

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.resource.update({ where: { id: resourceId }, data: input });

  return NextResponse.json({ resource: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: resourceId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageContent(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.resource.delete({ where: { id: resourceId } });

  return NextResponse.json({ ok: true });
}
