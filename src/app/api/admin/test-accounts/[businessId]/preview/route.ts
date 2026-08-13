import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { ensureRoadmapGenerated } from "@/lib/roadmap/generate";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const TRIAL_DAYS = 30;
const ANNUAL_DAYS = 365;

const previewSchema = z.object({
  state: z.enum(["trial", "annual", "expired"]),
});

/**
 * SET PREVIEW STATE (Phase 7 continued) — flips a test account's real
 * Membership row between the states an admin wants to see a member's
 * view of: a fresh 30-day free trial (COMPLIMENTARY), a 1-year paid
 * subscriber (ACTIVE_ANNUAL), or a lapsed account (EXPIRED, the
 * read-only-summary state — Phase 5). ONLY ever allowed on a
 * `Business.isTestAccount` row — fabricating an ACTIVE_ANNUAL status
 * with no real Stripe subscription behind it would be a real integrity
 * problem on an actual customer, which is exactly why this route 404s
 * on anything that isn't flagged as test data.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageTestAccounts(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || !business.isTestAccount) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = previewSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const now = new Date();

  const membershipData =
    input.state === "trial"
      ? {
          status: "COMPLIMENTARY" as const,
          activatedAt: now,
          trialStartsAt: now,
          trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          currentPeriodEndsAt: null,
          convertedAt: null,
        }
      : input.state === "annual"
        ? {
            status: "ACTIVE_ANNUAL" as const,
            activatedAt: now,
            trialStartsAt: null,
            trialEndsAt: null,
            currentPeriodEndsAt: new Date(now.getTime() + ANNUAL_DAYS * 24 * 60 * 60 * 1000),
            convertedAt: now,
          }
        : {
            // "expired" — a lapsed complimentary trial, the simplest real
            // path to Phase 5's read-only-summary state.
            status: "COMPLIMENTARY" as const,
            activatedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
            trialStartsAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
            trialEndsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            currentPeriodEndsAt: null,
            convertedAt: null,
          };

  const membership = await prisma.membership.upsert({
    where: { businessId },
    create: { businessId, ...membershipData },
    update: membershipData,
  });

  // A real trial/subscriber has always been through a qualifying session
  // by the time they see the full app — a preview account should too, so
  // there's something real to look at (a roadmap) rather than the
  // pre-session state regardless of which membership stage was picked.
  await prisma.business.update({
    where: { id: businessId },
    data: {
      builderAccessEligible: true,
      sessionCompletedAt: business.sessionCompletedAt ?? now,
      visionBoardUnlockedAt: business.visionBoardUnlockedAt ?? now,
    },
  });
  await ensureRoadmapGenerated(businessId);

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "test_account_preview_set",
      entityType: "Business",
      entityId: businessId,
      metadata: { state: input.state },
    },
  });

  return NextResponse.json({ membership });
}
