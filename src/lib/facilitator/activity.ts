import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * A richer "last active" signal than the raw `Business.lastActiveAt`
 * column for facilitator/admin-facing views only. `lastActiveAt` itself
 * stays scoped to Progress-page visits and check-ins (Phase 9's original
 * definition) on purpose — it drives the "Welcome Back" banner, which
 * depends on reading the *previous* value before the current visit
 * overwrites it; broadening what writes to that column would make every
 * visit to any page look "fresh" by the time Progress reads it, silently
 * breaking Welcome Back. Instead, this takes the max of `lastActiveAt`
 * and the most recent real engagement signals already in the schema
 * (roadmap task update, AI conversation, weekly check-in) — a business
 * that's actively working the Builder without visiting Progress still
 * shows up as active here, without touching the stored column at all.
 */
export async function getRealLastActivity(businessId: string): Promise<Date | null> {
  const [business, task, conversation, checkIn] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { lastActiveAt: true } }),
    prisma.roadmapTask.findFirst({
      where: { roadmap: { businessId } },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.aiConversation.findFirst({
      where: { businessId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.weeklyCheckIn.findFirst({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const dates = [business?.lastActiveAt, task?.updatedAt, conversation?.updatedAt, checkIn?.createdAt].filter(
    (d): d is Date => Boolean(d),
  );
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

/**
 * Bulk variant for the Facilitator Dashboard's participant list — one
 * query per signal across all businesses instead of N+1 per business.
 */
export async function getRealLastActivityBulk(businessIds: string[]): Promise<Map<string, Date | null>> {
  if (businessIds.length === 0) return new Map();

  const [businesses, tasks, conversations, checkIns] = await Promise.all([
    prisma.business.findMany({ where: { id: { in: businessIds } }, select: { id: true, lastActiveAt: true } }),
    prisma.roadmapTask.findMany({
      where: { roadmap: { businessId: { in: businessIds } } },
      select: { updatedAt: true, roadmap: { select: { businessId: true } } },
    }),
    prisma.aiConversation.findMany({
      where: { businessId: { in: businessIds } },
      select: { businessId: true, updatedAt: true },
    }),
    prisma.weeklyCheckIn.findMany({
      where: { businessId: { in: businessIds } },
      select: { businessId: true, createdAt: true },
    }),
  ]);

  const result = new Map<string, Date | null>();
  for (const id of businessIds) result.set(id, null);

  const bump = (id: string, date: Date) => {
    const current = result.get(id);
    if (!current || date > current) result.set(id, date);
  };

  for (const b of businesses) if (b.lastActiveAt) bump(b.id, b.lastActiveAt);
  for (const t of tasks) bump(t.roadmap.businessId, t.updatedAt);
  for (const c of conversations) bump(c.businessId, c.updatedAt);
  for (const w of checkIns) bump(w.businessId, w.createdAt);

  return result;
}
