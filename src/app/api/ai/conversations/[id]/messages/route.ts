import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { assembleAiContext } from "@/lib/ai/context";
import { callBlueprintAi, type AiChatTurn } from "@/lib/ai/client";
import { loadOwnedConversation } from "@/lib/ai/conversation";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS, TOO_MANY_REQUESTS_BODY } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { sendMessageSchema } from "@/lib/validations/ai";

/** Sends a follow-up message in an existing conversation — "Continue conversation" (spec). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`ai-message:${user.id}`, RATE_LIMITS.AI_MESSAGE);
  if (!rateLimit.allowed) {
    return NextResponse.json(TOO_MANY_REQUESTS_BODY, { status: 429 });
  }

  const conversation = await loadOwnedConversation(id, user.id);
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = sendMessageSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const mode = input.mode ?? conversation.mode;
  const businessContext = await assembleAiContext(conversation.businessId);
  const systemPrompt = await buildSystemPrompt(mode, businessContext);

  const history: AiChatTurn[] = [
    ...conversation.messages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
    { role: "user", content: input.message },
  ];

  const reply = await callBlueprintAi({ systemPrompt, history });

  const [userMessage, assistantMessage] = await prisma.$transaction([
    prisma.aiMessage.create({
      data: { conversationId: id, role: "USER", content: input.message, mode, actionType: input.actionType },
    }),
    prisma.aiMessage.create({
      data: { conversationId: id, role: "ASSISTANT", content: reply, mode },
    }),
  ]);
  await prisma.aiConversation.update({
    where: { id },
    data: { mode, updatedAt: new Date() },
  });

  return NextResponse.json({ userMessage, assistantMessage });
}
