import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { updateSalesScriptSchema } from "@/lib/validations/tools";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: scriptId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const script = await prisma.salesScript.findUnique({ where: { id: scriptId } });
  if (!script) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, script.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = updateSalesScriptSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.salesScript.update({ where: { id: scriptId }, data: input });

  return NextResponse.json({ script: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: scriptId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const script = await prisma.salesScript.findUnique({ where: { id: scriptId } });
  if (!script) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, script.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.salesScript.delete({ where: { id: scriptId } });

  return NextResponse.json({ ok: true });
}
