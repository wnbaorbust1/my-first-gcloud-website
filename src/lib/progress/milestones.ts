import "server-only";

import type { MilestoneKey } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export interface MilestoneMeta {
  key: MilestoneKey;
  label: string;
  /** True when this app has a real signal to detect it automatically; false means the member confirms it themselves. */
  autoDetectable: boolean;
}

/** The 15 spec MILESTONES, in spec order. */
export const MILESTONE_CATALOG: MilestoneMeta[] = [
  { key: "MISSION_DEFINED", label: "Mission Defined", autoDetectable: true },
  { key: "IDEAL_CUSTOMER_DEFINED", label: "Ideal Customer Defined", autoDetectable: true },
  { key: "FIRST_OFFER", label: "First Offer", autoDetectable: true },
  { key: "PRICING_COMPLETE", label: "Pricing Complete", autoDetectable: true },
  { key: "FIRST_LEAD_SYSTEM", label: "First Lead System", autoDetectable: true },
  { key: "FIRST_CUSTOMER", label: "First Customer", autoDetectable: true },
  { key: "FIRST_1K", label: "First $1K", autoDetectable: true },
  { key: "FIRST_5K_MONTH", label: "First $5K Month", autoDetectable: true },
  { key: "FIRST_10K_MONTH", label: "First $10K Month", autoDetectable: true },
  { key: "FIRST_SOP", label: "First SOP", autoDetectable: true },
  { key: "FIRST_AUTOMATION", label: "First Automation", autoDetectable: true },
  { key: "FIRST_CONTRACTOR", label: "First Contractor", autoDetectable: false },
  { key: "FIRST_EMPLOYEE", label: "First Employee", autoDetectable: false },
  { key: "CEO_MODE", label: "CEO Mode", autoDetectable: false },
  { key: "LEGACY_BUILDER", label: "Legacy Builder", autoDetectable: false },
];

const BLUEPRINT_SECTION_MILESTONES: Partial<Record<MilestoneKey, string>> = {
  MISSION_DEFINED: "Mission",
  IDEAL_CUSTOMER_DEFINED: "Ideal Customer",
  FIRST_OFFER: "Products & Services",
  PRICING_COMPLETE: "Pricing",
  FIRST_LEAD_SYSTEM: "Lead Generation",
  FIRST_SOP: "SOPs",
  FIRST_AUTOMATION: "Automation",
};

/**
 * Auto-detection engine. Real-data-only, matching this app's "no
 * hard-coded fake results" principle throughout: every auto milestone
 * checks a genuine signal (a My Blueprint section actually has content;
 * real reported revenue/sales cross a real threshold) — nothing here is
 * inferred from time elapsed or fabricated. Milestones are never
 * un-achieved once earned, even if the underlying content is edited away
 * later (`skipDuplicates` — this only ever adds rows).
 */
export async function checkForNewMilestones(businessId: string): Promise<MilestoneKey[]> {
  const [existing, document, checkIns] = await Promise.all([
    prisma.businessMilestone.findMany({ where: { businessId }, select: { milestone: true } }),
    prisma.document.findFirst({
      where: { businessId, kind: "BLUEPRINT" },
      include: { sections: true },
    }),
    prisma.weeklyCheckIn.findMany({ where: { businessId }, select: { weekOf: true, sales: true, revenueCents: true } }),
  ]);

  const already = new Set(existing.map((m) => m.milestone));
  const toAchieve: MilestoneKey[] = [];

  const sectionByTitle = new Map((document?.sections ?? []).map((s) => [s.title, s.content]));
  for (const [key, sectionTitle] of Object.entries(BLUEPRINT_SECTION_MILESTONES) as [MilestoneKey, string][]) {
    if (already.has(key)) continue;
    if (sectionByTitle.get(sectionTitle)?.trim()) toAchieve.push(key);
  }

  const totalSales = checkIns.reduce((sum, c) => sum + (c.sales ?? 0), 0);
  const totalRevenueCents = checkIns.reduce((sum, c) => sum + (c.revenueCents ?? 0), 0);
  const revenueByMonth = new Map<string, number>();
  for (const c of checkIns) {
    const monthKey = `${c.weekOf.getUTCFullYear()}-${c.weekOf.getUTCMonth()}`;
    revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) ?? 0) + (c.revenueCents ?? 0));
  }
  const bestMonthCents = Math.max(0, ...revenueByMonth.values());

  if (!already.has("FIRST_CUSTOMER") && totalSales >= 1) toAchieve.push("FIRST_CUSTOMER");
  if (!already.has("FIRST_1K") && totalRevenueCents >= 100_000) toAchieve.push("FIRST_1K");
  if (!already.has("FIRST_5K_MONTH") && bestMonthCents >= 500_000) toAchieve.push("FIRST_5K_MONTH");
  if (!already.has("FIRST_10K_MONTH") && bestMonthCents >= 1_000_000) toAchieve.push("FIRST_10K_MONTH");

  if (toAchieve.length === 0) return [];

  await prisma.businessMilestone.createMany({
    data: toAchieve.map((milestone) => ({ businessId, milestone, source: "auto" })),
    skipDuplicates: true,
  });

  return toAchieve;
}

/** The member confirming a milestone nothing in this schema can detect automatically (spec: First Contractor, First Employee, CEO Mode, Legacy Builder). */
export async function markMilestoneManually(businessId: string, milestone: MilestoneKey) {
  const meta = MILESTONE_CATALOG.find((m) => m.key === milestone);
  if (!meta || meta.autoDetectable) {
    throw new Error(`${milestone} is auto-detected, not self-reported.`);
  }
  return prisma.businessMilestone.upsert({
    where: { businessId_milestone: { businessId, milestone } },
    create: { businessId, milestone, source: "manual" },
    update: {},
  });
}
