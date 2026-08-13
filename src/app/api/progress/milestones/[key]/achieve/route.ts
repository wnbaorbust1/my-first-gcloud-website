import { NextResponse } from "next/server";
import { z } from "zod";

import type { MilestoneKey } from "@/generated/prisma/enums";
import { markMilestoneManually, MILESTONE_CATALOG } from "@/lib/progress/milestones";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

const bodySchema = z.object({ businessId: z.string().min(1) });
const VALID_KEYS = new Set(MILESTONE_CATALOG.map((m) => m.key));

/** The member confirming a milestone this app can't detect automatically (First Contractor, First Employee, CEO Mode, Legacy Builder). */
export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!VALID_KEYS.has(key as MilestoneKey)) {
    return NextResponse.json({ error: "Unknown milestone" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, parsed.data.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const milestone = await markMilestoneManually(parsed.data.businessId, key as MilestoneKey);
    return NextResponse.json({ milestone });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't mark milestone" }, { status: 400 });
  }
}
