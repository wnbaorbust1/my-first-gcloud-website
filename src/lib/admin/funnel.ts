import "server-only";

import { getRealLastActivityBulk } from "@/lib/facilitator/activity";
import { prisma } from "@/lib/prisma";

export interface FunnelStage {
  label: string;
  count: number | null;
  note?: string;
}

/**
 * FUNNEL (spec Prompt 11): "Track: Visitor/Signup where available,
 * Assessment Started, Assessment Completed, Session Viewed, Session
 * Registered, Session Attended, Builder Activated, First Task Completed,
 * 30-Day Active, Paid Conversion." Every stage here is a real count
 * except "Session Viewed" — this app has no page-view analytics
 * infrastructure, so rather than fabricate a number, that stage is
 * rendered honestly as "Not tracked" (this schema's established "no fake
 * analytics" rule, unchanged since Phase 4).
 */
export async function getSignupFunnel(): Promise<FunnelStage[]> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const [
    signups,
    assessmentStarted,
    assessmentCompleted,
    sessionRegistered,
    sessionAttended,
    builderBusinessIds,
    firstTaskCompleted,
    paidConversion,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.assessment.count({ where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } } }),
    prisma.assessment.count({ where: { status: "COMPLETED" } }),
    prisma.sessionRegistration.count({ where: { status: { not: "CANCELLED" } } }),
    prisma.sessionRegistration.count({ where: { status: { in: ["ATTENDED", "COMPLETED"] } } }),
    prisma.business.findMany({ where: { builderAccessEligible: true }, select: { id: true } }),
    prisma.roadmapTask
      .findMany({ where: { status: "COMPLETED" }, select: { roadmap: { select: { businessId: true } } }, distinct: ["roadmapId"] })
      .then((rows) => new Set(rows.map((r) => r.roadmap.businessId)).size),
    prisma.membership.count({ where: { status: { in: ["ACTIVE_MONTHLY", "ACTIVE_ANNUAL"] } } }),
  ]);

  // 30-Day Active uses the same richer activity signal as the
  // Facilitator Dashboard (see getRealLastActivityBulk's doc comment) —
  // real engagement, not only Progress-page visits.
  const activityMap = await getRealLastActivityBulk(builderBusinessIds.map((b) => b.id));
  const thirtyDayActive = Array.from(activityMap.values()).filter(
    (d) => d && d.getTime() >= thirtyDaysAgo,
  ).length;

  return [
    { label: "Signup", count: signups },
    { label: "Assessment Started", count: assessmentStarted },
    { label: "Assessment Completed", count: assessmentCompleted },
    { label: "Session Viewed", count: null, note: "Not tracked — no page-view analytics yet" },
    { label: "Session Registered", count: sessionRegistered },
    { label: "Session Attended", count: sessionAttended },
    { label: "Builder Activated", count: builderBusinessIds.length },
    { label: "First Task Completed", count: firstTaskCompleted },
    { label: "30-Day Active", count: thirtyDayActive },
    { label: "Paid Conversion", count: paidConversion },
  ];
}
