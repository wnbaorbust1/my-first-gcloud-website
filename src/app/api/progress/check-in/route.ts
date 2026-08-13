import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { checkForNewMilestones } from "@/lib/progress/milestones";
import { getWeekStart } from "@/lib/progress/week";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { checkInSchema } from "@/lib/validations/progress";

/** WEEKLY CEO CHECK-IN (spec Prompt 9): upserts this week's check-in — one per business per week, editable, never shamed for being late or skipped. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = checkInSchema.parse(body);
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

  const weekOf = getWeekStart();

  const checkIn = await prisma.weeklyCheckIn.upsert({
    where: { businessId_weekOf: { businessId: input.businessId, weekOf } },
    create: {
      businessId: input.businessId,
      userId: user.id,
      weekOf,
      completed: input.completed,
      slowedDown: input.slowedDown,
      biggestWin: input.biggestWin,
      biggestChallenge: input.biggestChallenge,
      leads: input.leads,
      sales: input.sales,
      revenueCents: input.revenueCents,
      nextWeekFocus: input.nextWeekFocus,
    },
    update: {
      completed: input.completed,
      slowedDown: input.slowedDown,
      biggestWin: input.biggestWin,
      biggestChallenge: input.biggestChallenge,
      leads: input.leads,
      sales: input.sales,
      revenueCents: input.revenueCents,
      nextWeekFocus: input.nextWeekFocus,
    },
  });

  // A check-in reporting real sales/revenue can cross a Milestone
  // threshold (First Customer, First $1K, First $5K/$10K Month) —
  // re-check right away so the member sees it the moment it's true.
  await checkForNewMilestones(input.businessId);

  // ACCOUNTABILITY (spec): "Welcome back" is driven by a gap in
  // lastActiveAt, not a missed-day counter — a real check-in is exactly
  // the kind of activity that should reset it.
  await prisma.business.update({ where: { id: input.businessId }, data: { lastActiveAt: new Date() } });

  return NextResponse.json({ checkIn });
}
