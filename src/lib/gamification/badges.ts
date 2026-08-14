import "server-only";

import type { MilestoneKey } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * The 24 spec §9 badges, in spec order. Seeding this catalog is separate
 * from *awarding* a badge to a business — see MILESTONE_BADGE_MAP below
 * for the (intentionally partial) set with a real trigger wired in this
 * pilot phase. The rest exist so they're visible/manageable, but no
 * business will have earned them yet — never fabricated.
 */
export const BADGE_CATALOG: { slug: string; title: string; description: string }[] = [
  { slug: "mindset-shift", title: "Mindset Shift", description: "Began the entrepreneurial mindset work." },
  { slug: "purpose-discovered", title: "Purpose Discovered", description: "Defined your mission." },
  { slug: "strengths-identified", title: "Strengths Identified", description: "Mapped your founder strengths." },
  { slug: "idea-selected", title: "Idea Selected", description: "Chose your business idea." },
  { slug: "audience-defined", title: "Audience Defined", description: "Defined your ideal customer." },
  { slug: "problem-solved", title: "Problem Solved", description: "Named the problem you solve." },
  { slug: "idea-validated", title: "Idea Validated", description: "Validated your business idea." },
  { slug: "first-offer-created", title: "First Offer Created", description: "Created your first offer." },
  { slug: "officially-registered", title: "Officially Registered", description: "Registered your business." },
  { slug: "pricing-with-confidence", title: "Pricing With Confidence", description: "Completed your pricing." },
  { slug: "brand-built", title: "Brand Built", description: "Built your brand identity." },
  { slug: "launch-ready", title: "Launch Ready", description: "Completed launch preparation." },
  { slug: "first-lead", title: "First Lead", description: "Generated your first lead." },
  { slug: "first-customer", title: "First Customer", description: "Landed your first customer." },
  { slug: "first-sale", title: "First Sale", description: "Made your first sale." },
  { slug: "marketing-in-motion", title: "Marketing in Motion", description: "Built a real lead-generation system." },
  { slug: "sales-ready", title: "Sales Ready", description: "Built out your sales process." },
  { slug: "client-experience-built", title: "Client Experience Built", description: "Built your onboarding/delivery experience." },
  { slug: "automation-activated", title: "Automation Activated", description: "Activated your first automation." },
  { slug: "systems-builder", title: "Systems Builder", description: "Documented your first SOP." },
  { slug: "revenue-ready", title: "Revenue Ready", description: "Built your revenue plan." },
  { slug: "team-ready", title: "Team Ready", description: "Prepared your first hire plan." },
  { slug: "growth-strategist", title: "Growth Strategist", description: "Built your growth strategy." },
  { slug: "legacy-in-motion", title: "Legacy in Motion", description: "Started your legacy plan." },
];

/**
 * The subset of badges with a real, already-existing signal to award
 * them from, tied to the real MilestoneKey auto-detection in
 * src/lib/progress/milestones.ts. Every badge NOT listed here has no
 * real trigger yet in this pilot phase (most map to the 52-week
 * curriculum, Phase C+) — it stays seeded-but-unearned until a later
 * phase gives it one, rather than being awarded on a guess.
 */
export const MILESTONE_BADGE_MAP: Partial<Record<MilestoneKey, string>> = {
  MISSION_DEFINED: "purpose-discovered",
  IDEAL_CUSTOMER_DEFINED: "audience-defined",
  FIRST_OFFER: "first-offer-created",
  PRICING_COMPLETE: "pricing-with-confidence",
  FIRST_LEAD_SYSTEM: "marketing-in-motion",
  FIRST_CUSTOMER: "first-customer",
  FIRST_1K: "first-sale",
  FIRST_SOP: "systems-builder",
  FIRST_AUTOMATION: "automation-activated",
};

/** Idempotent — same pattern as ensureTaskTemplatesSeeded(). Safe to call on every request that needs the catalog. */
export async function ensureBadgesSeeded(): Promise<void> {
  const count = await prisma.badge.count();
  if (count >= BADGE_CATALOG.length) return;

  await prisma.badge.createMany({
    data: BADGE_CATALOG.map((b, order) => ({ ...b, order })),
    skipDuplicates: true,
  });
}

/** Awards every badge (if any) mapped to the given newly-achieved milestone keys. Never un-awards; skips ones already earned. */
export async function awardBadgesForMilestones(businessId: string, milestones: MilestoneKey[]): Promise<void> {
  const slugs = milestones.map((m) => MILESTONE_BADGE_MAP[m]).filter((s): s is string => Boolean(s));
  if (slugs.length === 0) return;

  await ensureBadgesSeeded();
  const badges = await prisma.badge.findMany({ where: { slug: { in: slugs } }, select: { id: true } });
  if (badges.length === 0) return;

  await prisma.businessBadge.createMany({
    data: badges.map((b) => ({ businessId, badgeId: b.id })),
    skipDuplicates: true,
  });
}
