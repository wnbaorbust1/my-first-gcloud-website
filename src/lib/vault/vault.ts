import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * BLUEPRINT VAULT (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §10, Phase E —
 * pilot-scoped as "lightweight"). This is deliberately an aggregation
 * layer, not a new content store: every item here is a pointer to a real
 * row that already exists somewhere else in the app (a completed
 * RoadmapTask, a saved SOP, a Vision Board, a facilitator note...).
 * Nothing is duplicated or fabricated — the Vault's job is just to
 * organize what's already real into the spec's folder structure and
 * link back to where it lives.
 *
 * Spec functions: "view, edit, download, print, email, duplicate,
 * archive, restore prior version, and display origin/provenance."
 * This pilot ships **view** (linking to the real source page, which
 * already supports edit for every item type) and **origin/provenance**
 * (via the `origin` field below). Download/print already exists at the
 * Blueprint-document level (`/my-blueprint/documents`, Phase 6) and is
 * linked from the Vault page rather than rebuilt per-item. Email,
 * duplicate, archive, and restore-prior-version are real spec asks with
 * no existing infrastructure to wrap — deferred rather than half-built,
 * same reasoning as Phase B's deferred proactive check-ins.
 */
export const VAULT_FOLDERS = [
  "Founder Identity",
  "Research",
  "Audience",
  "Offers",
  "Pricing",
  "Legal and Compliance",
  "Brand",
  "Marketing",
  "Sales",
  "Customer Experience",
  "Financials",
  "Systems and Automation",
  "Team",
  "Growth",
  "Legacy",
  "Vision Boards",
  "Facilitator Notes",
] as const;
export type VaultFolder = (typeof VAULT_FOLDERS)[number];

/**
 * Every real TaskTemplate.blueprintDestination value (see
 * src/lib/roadmap/task-templates.ts) mapped to its spec Vault folder.
 * "Research," "Legal and Compliance," and "Brand" have no corresponding
 * task/tool content anywhere in this app yet, so they stay real, honest
 * empty folders rather than being force-mapped to content that isn't
 * actually theirs.
 */
export const BLUEPRINT_DESTINATION_TO_FOLDER: Record<string, VaultFolder> = {
  Purpose: "Founder Identity",
  Mission: "Founder Identity",
  Vision: "Founder Identity",
  "Business Goals": "Founder Identity",
  "Ideal Customer": "Audience",
  "Customer Pain Points": "Audience",
  "Business Overview": "Offers",
  "Elevator Pitch": "Offers",
  "Value Proposition": "Offers",
  "Products & Services": "Offers",
  Pricing: "Pricing",
  "Revenue Goals": "Financials",
  "Lead Generation": "Marketing",
  Marketing: "Marketing",
  "Sales Process": "Sales",
  "Follow-Up": "Sales",
  CRM: "Sales",
  "Customer Journey": "Customer Experience",
  Operations: "Customer Experience",
  SOPs: "Systems and Automation",
  Automation: "Systems and Automation",
  Delegation: "Team",
  Team: "Team",
  Hiring: "Team",
  "Scaling Strategy": "Growth",
  "Recurring Revenue": "Growth",
  "Intellectual Property": "Legacy",
  Partnerships: "Legacy",
  Succession: "Legacy",
  "Legacy Plan": "Legacy",
};

export type VaultOrigin = "You" | "Your Facilitator" | "AI-assisted";

export interface VaultItem {
  id: string;
  title: string;
  folder: VaultFolder;
  origin: VaultOrigin;
  updatedAt: Date;
  /** Where "view" (and, for every item type here, "edit") actually happens. */
  viewHref: string;
}

/**
 * Loads and buckets every real Vault-eligible asset for a business.
 * Runs its source queries in parallel; each source is independent, so
 * one empty/missing source (e.g. no SOPs yet) never affects the others.
 */
export async function getVaultContents(businessId: string): Promise<Record<VaultFolder, VaultItem[]>> {
  const [
    completedTasks,
    visionBoardProfile,
    visionBoardVersionCount,
    revenuePlans,
    pricingPlans,
    sops,
    automationStepCount,
    offers,
    marketingPlans,
    salesScripts,
    contentPlanItemCount,
    journeyStageCount,
    openLeadCount,
    goals,
    milestones,
    facilitatorNotes,
  ] = await Promise.all([
    prisma.roadmapTask.findMany({
      where: { roadmap: { businessId }, status: "COMPLETED" },
      include: { taskTemplate: { select: { blueprintDestination: true } } },
    }),
    prisma.visionBoardProfile.findUnique({ where: { businessId } }),
    prisma.visionBoardVersion.count({ where: { businessId } }),
    prisma.revenuePlan.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } }),
    prisma.pricingPlan.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } }),
    prisma.sop.findMany({ where: { businessId }, orderBy: { updatedAt: "desc" } }),
    prisma.automationStep.count({ where: { businessId } }),
    prisma.offer.findMany({ where: { businessId }, orderBy: { updatedAt: "desc" } }),
    prisma.marketingPlan.findMany({ where: { businessId }, orderBy: { updatedAt: "desc" } }),
    prisma.salesScript.findMany({ where: { businessId }, orderBy: { updatedAt: "desc" } }),
    prisma.contentPlanItem.count({ where: { businessId } }),
    prisma.journeyStage.count({ where: { businessId } }),
    prisma.lead.count({ where: { businessId, stage: { notIn: ["WON", "LOST"] } } }),
    prisma.goal.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } }),
    prisma.businessMilestone.findMany({ where: { businessId }, orderBy: { achievedAt: "desc" } }),
    // PRIVATE notes are the facilitator's own working notes — never
    // surfaced to the member. Everything else (PARTICIPANT_VISIBLE,
    // RECOMMENDATION, TASK_RECOMMENDATION) is meant to reach them.
    prisma.facilitatorNote.findMany({
      where: { businessId, noteType: { not: "PRIVATE" } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const items: VaultItem[] = [];

  for (const task of completedTasks) {
    const dest = task.taskTemplate?.blueprintDestination;
    const folder = dest ? BLUEPRINT_DESTINATION_TO_FOLDER[dest] : undefined;
    if (!folder) continue; // no real Vault folder for this task — never force a guess
    items.push({
      id: `task-${task.id}`,
      title: task.title,
      folder,
      origin: task.facilitatorAdjusted ? "Your Facilitator" : "You",
      updatedAt: task.completedAt ?? task.updatedAt,
      viewHref: `/build/${task.id}`,
    });
  }

  if (visionBoardProfile) {
    const sources = (visionBoardProfile.sectionSources as Record<string, string> | null) ?? {};
    const hasAiSection = Object.values(sources).includes("ai");
    const versionSuffix = visionBoardVersionCount > 0 ? ` (${visionBoardVersionCount} saved version${visionBoardVersionCount === 1 ? "" : "s"})` : "";
    items.push({
      id: "vision-board",
      title: `Vision Board${versionSuffix}`,
      folder: "Vision Boards",
      origin: hasAiSection ? "AI-assisted" : "You",
      updatedAt: visionBoardProfile.updatedAt ?? visionBoardProfile.createdAt,
      viewHref: "/my-blueprint/vision-board",
    });
  }

  for (const plan of revenuePlans) {
    items.push({
      id: `revenue-plan-${plan.id}`,
      title: "Revenue Plan",
      folder: "Financials",
      origin: "You",
      updatedAt: plan.createdAt,
      viewHref: "/money",
    });
  }
  for (const plan of pricingPlans) {
    items.push({
      id: `pricing-plan-${plan.id}`,
      title: `Pricing: ${plan.offerName}`,
      folder: "Pricing",
      origin: "You",
      updatedAt: plan.createdAt,
      viewHref: "/money",
    });
  }

  for (const sop of sops) {
    items.push({
      id: `sop-${sop.id}`,
      title: sop.name,
      folder: "Systems and Automation",
      origin: "You",
      updatedAt: sop.updatedAt,
      viewHref: "/tools/sops",
    });
  }
  if (automationStepCount > 0) {
    items.push({
      id: "automation-map",
      title: `Automation Map (${automationStepCount} step${automationStepCount === 1 ? "" : "s"})`,
      folder: "Systems and Automation",
      origin: "You",
      updatedAt: new Date(),
      viewHref: "/tools/automation",
    });
  }

  for (const offer of offers) {
    items.push({
      id: `offer-${offer.id}`,
      title: offer.name,
      folder: "Offers",
      origin: "You",
      updatedAt: offer.updatedAt,
      viewHref: "/tools/offers",
    });
  }

  for (const plan of marketingPlans) {
    items.push({
      id: `marketing-plan-${plan.id}`,
      title: "Marketing Plan",
      folder: "Marketing",
      origin: "You",
      updatedAt: plan.updatedAt,
      viewHref: "/tools/marketing-plan",
    });
  }
  if (contentPlanItemCount > 0) {
    items.push({
      id: "content-plan",
      title: `Content Plan (${contentPlanItemCount} item${contentPlanItemCount === 1 ? "" : "s"})`,
      folder: "Marketing",
      origin: "You",
      updatedAt: new Date(),
      viewHref: "/tools/content-planner",
    });
  }

  for (const script of salesScripts) {
    items.push({
      id: `script-${script.id}`,
      title: script.title,
      folder: "Sales",
      origin: "You",
      updatedAt: script.updatedAt,
      viewHref: "/tools/scripts",
    });
  }
  if (openLeadCount > 0) {
    items.push({
      id: "crm-pipeline",
      title: `CRM Pipeline (${openLeadCount} open lead${openLeadCount === 1 ? "" : "s"})`,
      folder: "Sales",
      origin: "You",
      updatedAt: new Date(),
      viewHref: "/tools/crm",
    });
  }

  if (journeyStageCount > 0) {
    items.push({
      id: "customer-journey",
      title: `Customer Journey (${journeyStageCount} stage${journeyStageCount === 1 ? "" : "s"})`,
      folder: "Customer Experience",
      origin: "You",
      updatedAt: new Date(),
      viewHref: "/tools/journey",
    });
  }

  for (const goal of goals) {
    items.push({
      id: `goal-${goal.id}`,
      title: goal.title,
      folder: "Growth",
      origin: "You",
      updatedAt: goal.updatedAt,
      viewHref: "/goals",
    });
  }
  for (const milestone of milestones) {
    items.push({
      id: `milestone-${milestone.id}`,
      title: `Milestone: ${milestone.milestone.replaceAll("_", " ")}`,
      folder: "Growth",
      origin: "You",
      updatedAt: milestone.achievedAt,
      viewHref: "/progress",
    });
  }

  for (const note of facilitatorNotes) {
    items.push({
      id: `note-${note.id}`,
      title: note.note.length > 60 ? `${note.note.slice(0, 60)}…` : note.note,
      folder: "Facilitator Notes",
      origin: "Your Facilitator",
      updatedAt: note.updatedAt,
      viewHref: "/progress",
    });
  }

  const byFolder = Object.fromEntries(VAULT_FOLDERS.map((f) => [f, [] as VaultItem[]])) as Record<
    VaultFolder,
    VaultItem[]
  >;
  for (const item of items) {
    byFolder[item.folder].push(item);
  }
  for (const folder of VAULT_FOLDERS) {
    byFolder[folder].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  return byFolder;
}
