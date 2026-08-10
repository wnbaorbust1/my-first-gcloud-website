import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { assembleAiContext } from "@/lib/ai/context";
import { callBlueprintAi } from "@/lib/ai/client";
import { deriveConversationTitle } from "@/lib/ai/conversation";
import { DEFAULT_AI_MODE } from "@/lib/ai/modes";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { startConversationSchema } from "@/lib/validations/ai";

/** AI HISTORY (spec): list this user's own conversations, optionally filtered to one business/task/topic. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId") ?? undefined;
  const relatedTaskId = url.searchParams.get("relatedTaskId") ?? undefined;

  const conversations = await prisma.aiConversation.findMany({
    where: { userId: user.id, ...(businessId ? { businessId } : {}), ...(relatedTaskId ? { relatedTaskId } : {}) },
    orderBy: { updatedAt: "desc" },
    include: {
      relatedTask: { select: { id: true, title: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ conversations });
}

/** Starts a new conversation with its first message — a conversation always begins with something to say. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = startConversationSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, input.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (input.relatedTaskId) {
    const task = await prisma.roadmapTask.findUnique({
      where: { id: input.relatedTaskId },
      include: { roadmap: true },
    });
    if (!task || task.roadmap.businessId !== input.businessId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
  }

  const mode = input.mode ?? DEFAULT_AI_MODE;
  const businessContext = await assembleAiContext(input.businessId);
  const systemPrompt = await buildSystemPrompt(mode, businessContext);
  const reply = await callBlueprintAi({ systemPrompt, history: [{ role: "user", content: input.message }] });

  const conversation = await prisma.aiConversation.create({
    data: {
      businessId: input.businessId,
      userId: user.id,
      title: deriveConversationTitle(input.message),
      topic: input.topic || "General",
      mode,
      relatedTaskId: input.relatedTaskId,
      messages: {
        create: [
          { role: "USER", content: input.message, mode, actionType: input.actionType },
          { role: "ASSISTANT", content: reply, mode },
        ],
      },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ conversation });
}
