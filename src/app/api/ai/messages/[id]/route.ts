import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { favoriteMessageSchema } from "@/lib/validations/ai";

/** "Favorite response" (spec) — toggled from either side, scoped to the owning user's conversation. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const message = await prisma.aiMessage.findUnique({
    where: { id },
    include: { conversation: { select: { userId: true } } },
  });
  if (!message || message.conversation.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = favoriteMessageSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.aiMessage.update({
    where: { id },
    data: { isFavorite: input.isFavorite },
  });

  return NextResponse.json({ message: updated });
}
