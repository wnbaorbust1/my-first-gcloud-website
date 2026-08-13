import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_JOURNEY_STAGES } from "@/lib/validations/tools";

/**
 * CUSTOMER JOURNEY BUILDER (spec Prompt 10): "Allow user to customize" —
 * every business starts from the same 9 default stages (Awareness →
 * Referral), seeded lazily on first visit (this app's established
 * "ensure*" pattern — see ensureMembershipActivated,
 * ensureBlueprintDocument), then freely renamed/reordered/added/removed
 * from that point on. Re-running this after stages already exist is a
 * safe no-op.
 */
export async function ensureJourneyStagesSeeded(businessId: string) {
  const existing = await prisma.journeyStage.findFirst({ where: { businessId } });
  if (existing) return;

  await prisma.journeyStage.createMany({
    data: DEFAULT_JOURNEY_STAGES.map((name, index) => ({
      businessId,
      name,
      order: index,
    })),
  });
}
