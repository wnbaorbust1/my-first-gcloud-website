import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { loadOwnedConversation } from "@/lib/ai/conversation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { renameConversationSchema } from "@/lib/validations/ai";

/** GET one conversation with its full message history — "Continue conversation" (spec). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const conversation = await loadOwnedConversation(id, user.id);
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

/** "Rename conversation" (spec) — and/or switch its mode going forward. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const existing = await loadOwnedConversation(id, user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = renameConversationSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const conversation = await prisma.aiConversation.update({
    where: { id },
    data: { ...(input.title ? { title: input.title } : {}), ...(input.mode ? { mode: input.mode } : {}) },
  });

  return NextResponse.json({ conversation });
}
