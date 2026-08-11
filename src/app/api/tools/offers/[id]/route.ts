import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { updateOfferSchema } from "@/lib/validations/tools";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: offerId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, offer.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = updateOfferSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.offer.update({ where: { id: offerId }, data: input });

  return NextResponse.json({ offer: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: offerId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, offer.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.offer.delete({ where: { id: offerId } });

  return NextResponse.json({ ok: true });
}
