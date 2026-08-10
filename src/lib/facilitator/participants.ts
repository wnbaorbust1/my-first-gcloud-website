import "server-only";

import { getRealLastActivityBulk } from "@/lib/facilitator/activity";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/utils";
import type { Role } from "@/generated/prisma/enums";

const PRIORITY_RANK = { MUST_DO: 0, SHOULD_DO: 1, BONUS: 2 } as const;

/**
 * A business is "stalled" (spec: "Potential Stalled Status") if it has
 * Builder access, still has roadmap work left, and nobody has touched the
 * app in this many days. A pre-session business is never flagged —
 * there's nothing to stall yet.
 */
export const STALLED_DAYS = 14;

/**
 * FACILITATOR DASHBOARD + PARTICIPANT DETAIL authorization (spec: "only
 * see authorized participants"). Extracted from the original Phase 3
 * participants page so every facilitator-facing screen this phase adds
 * uses the exact same visibility rule — an admin sees every business with
 * a session registration; a facilitator sees only businesses they're
 * explicitly assigned to (FacilitatorAssignment) or that registered for a
 * session they're running.
 */
export async function getFacilitatorBusinessIds(userId: string, role: Role): Promise<string[]> {
  if (can.viewAllBusinesses(role)) {
    const regs = await prisma.sessionRegistration.findMany({
      where: { businessId: { not: null }, status: { not: "CANCELLED" } },
      select: { businessId: true },
      distinct: ["businessId"],
    });
    return regs.map((r) => r.businessId!).filter(Boolean);
  }

  const [assignments, facilitatedRegs] = await Promise.all([
    prisma.facilitatorAssignment.findMany({
      where: { facilitatorId: userId },
      select: { businessId: true },
    }),
    prisma.sessionRegistration.findMany({
      where: {
        businessId: { not: null },
        status: { not: "CANCELLED" },
        session: { facilitatorId: userId },
      },
      select: { businessId: true },
    }),
  ]);

  return Array.from(
    new Set([...assignments.map((a) => a.businessId), ...facilitatedRegs.map((r) => r.businessId!)]),
  );
}

export interface ParticipantSummary {
  businessId: string;
  businessName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  currentStage: Stage | null;
  passionPercent: number | null;
  powerPercent: number | null;
  legacyPercent: number | null;
  healthPercent: number | null;
  lastActiveAt: Date | null;
  currentTaskTitle: string | null;
  currentGoalTitle: string | null;
  lastSessionAttended: { title: string; date: Date } | null;
  builderAccessEligible: boolean;
  roadmapCompletePercent: number | null;
  isStalled: boolean;
}

/**
 * FACILITATOR DASHBOARD (spec): one row per assigned business, all real
 * numbers — never a placeholder score. Deliberately N+1'd per business
 * (not one giant join) since a facilitator's participant list is small
 * (tens, not thousands) and this keeps each business's "current task"
 * logic identical to the member Dashboard's own `nextBestAction` (spec:
 * no divergent definition of "next" between what a member sees and what
 * their facilitator sees).
 */
export async function getParticipantSummaries(businessIds: string[]): Promise<ParticipantSummary[]> {
  const businesses = await prisma.business.findMany({
    where: { id: { in: businessIds } },
    include: {
      memberships: { include: { user: true }, orderBy: { createdAt: "asc" }, take: 1 },
      assessments: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        include: { scores: true },
      },
      roadmaps: { include: { tasks: true }, take: 1 },
      goals: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
      sessionRegistrations: {
        where: { status: { in: ["ATTENDED", "COMPLETED"] } },
        orderBy: { checkedInAt: "desc" },
        take: 1,
        include: { session: true },
      },
    },
  });

  const now = Date.now();
  const lastActivityByBusiness = await getRealLastActivityBulk(businessIds);

  return businesses.map((business) => {
    const owner = business.memberships[0]?.user ?? null;
    const assessment = business.assessments[0];
    const scoreFor = (stage: Stage) => assessment?.scores.find((s) => s.stage === stage)?.scorePercent ?? null;

    const tasks = business.roadmaps[0]?.tasks ?? [];
    const notStarted = tasks.filter((t) => t.status === "NOT_STARTED");
    const nextTask = [...notStarted].sort(
      (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.order - b.order,
    )[0];
    const roadmapCompletePercent =
      tasks.length > 0
        ? Math.round((tasks.filter((t) => t.status === "COMPLETED").length / tasks.length) * 100)
        : null;

    // Current stage = the weakest scored stage (mirrors the assessment's
    // own recommendation logic), falling back to null pre-assessment.
    let currentStage: Stage | null = null;
    if (assessment) {
      const scores: [Stage, number | null][] = [
        ["PASSION", scoreFor("PASSION")],
        ["POWER", scoreFor("POWER")],
        ["LEGACY", scoreFor("LEGACY")],
      ];
      const scored = scores.filter((s): s is [Stage, number] => s[1] !== null);
      if (scored.length > 0) {
        currentStage = scored.sort((a, b) => a[1] - b[1])[0][0];
      }
    }

    const lastSession = business.sessionRegistrations[0];
    const lastActivity = lastActivityByBusiness.get(business.id) ?? null;

    const isStalled =
      business.builderAccessEligible &&
      roadmapCompletePercent !== null &&
      roadmapCompletePercent < 100 &&
      (!lastActivity || now - lastActivity.getTime() > STALLED_DAYS * 24 * 60 * 60 * 1000);

    return {
      businessId: business.id,
      businessName: business.name,
      ownerName: owner ? `${owner.firstName} ${owner.lastName}` : null,
      ownerEmail: owner?.email ?? null,
      currentStage,
      passionPercent: scoreFor("PASSION"),
      powerPercent: scoreFor("POWER"),
      legacyPercent: scoreFor("LEGACY"),
      healthPercent: assessment?.healthScorePercent ?? null,
      lastActiveAt: lastActivity,
      currentTaskTitle: nextTask?.title ?? null,
      currentGoalTitle: business.goals[0]?.title ?? null,
      lastSessionAttended: lastSession
        ? { title: lastSession.session.title, date: lastSession.checkedInAt ?? lastSession.session.startsAt }
        : null,
      builderAccessEligible: business.builderAccessEligible,
      roadmapCompletePercent,
      isStalled,
    };
  });
}
