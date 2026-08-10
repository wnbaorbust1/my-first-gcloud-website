import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { AiConsole } from "./ai-console";

export const metadata: Metadata = { title: "Blueprint AI — Blueprint" };
export const dynamic = "force-dynamic";

export default async function AiPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });

  if (!membership) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Set up your business first"
        description="Blueprint AI grounds every answer in your real business — start with your business profile."
        action={
          <Button asChild size="sm">
            <Link href="/business-profile">Create My Business Profile</Link>
          </Button>
        }
      />
    );
  }

  const conversations = await prisma.aiConversation.findMany({
    where: { userId: user.id, businessId: membership.businessId },
    orderBy: { updatedAt: "desc" },
    include: {
      relatedTask: { select: { id: true, title: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <AiConsole
      businessId={membership.businessId}
      businessName={membership.business.name}
      initialConversations={conversations.map((c) => ({
        id: c.id,
        title: c.title,
        topic: c.topic,
        mode: c.mode,
        updatedAt: c.updatedAt.toISOString(),
        relatedTask: c.relatedTask ? { id: c.relatedTask.id, title: c.relatedTask.title } : null,
        lastMessagePreview: c.messages[0]?.content.slice(0, 80) ?? null,
      }))}
    />
  );
}
