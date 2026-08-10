import "server-only";

import { prisma } from "@/lib/prisma";

const MAX_TITLE_LENGTH = 60;

/**
 * Loads an AiConversation and confirms `userId` owns it — full stop, no
 * staff override. AI HISTORY (spec) scopes conversations by Business
 * *and* User; unlike roadmap/Blueprint data (business-shared, staff can
 * assist), a member's AI chat is treated as personal. This is what makes
 * "one user cannot access another user's context" (spec's own
 * acceptance-checklist wording) true by construction rather than by a
 * role check that could later be loosened by mistake.
 */
export async function loadOwnedConversation(conversationId: string, userId: string) {
  const conversation = await prisma.aiConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation || conversation.userId !== userId) return null;
  return conversation;
}

/** A short, readable default title from the first message a conversation is started with. */
export function deriveConversationTitle(firstMessage: string): string {
  const oneLine = firstMessage.replace(/\s+/g, " ").trim();
  if (oneLine.length <= MAX_TITLE_LENGTH) return oneLine || "New Conversation";
  return `${oneLine.slice(0, MAX_TITLE_LENGTH - 1)}…`;
}
