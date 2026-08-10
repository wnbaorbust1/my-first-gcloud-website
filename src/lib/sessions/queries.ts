import "server-only";

import type { RecommendedSessionType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { ensureSessionContentSeeded } from "./seed-content";

export async function getUpcomingSessions(sessionType?: RecommendedSessionType) {
  await ensureSessionContentSeeded();
  return prisma.sessionOffering.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gte: new Date() },
      ...(sessionType ? { sessionType } : {}),
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function getSeatsRemaining(sessionId: string, capacity: number | null) {
  if (capacity === null) return null;
  const registeredCount = await prisma.sessionRegistration.count({
    where: { sessionId, status: "REGISTERED" },
  });
  return Math.max(0, capacity - registeredCount);
}
