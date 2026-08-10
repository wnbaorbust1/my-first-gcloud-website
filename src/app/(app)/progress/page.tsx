import { Lock, Sparkles, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { formatCents } from "@/lib/money";
import { getMonthlyReview } from "@/lib/progress/monthly-review";
import { checkForNewMilestones, MILESTONE_CATALOG } from "@/lib/progress/milestones";
import { getReassessmentEligibility } from "@/lib/progress/reassessment";
import { getWeekStart } from "@/lib/progress/week";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { STAGE_META, type Stage } from "@/lib/utils";

import { AccountabilityControl } from "./accountability-control";
import { CheckInForm } from "./check-in-form";
import { MilestonesGrid } from "./milestones-grid";
import { RetakeAssessmentButton } from "./reassessment-panel";

export const metadata: Metadata = { title: "Progress — Blueprint" };
export const dynamic = "force-dynamic";

const WELCOME_BACK_GAP_DAYS = 5;

function isWelcomeBack(previousActiveAt: Date | null): boolean {
  if (!previousActiveAt) return false;
  return Date.now() - previousActiveAt.getTime() > WELCOME_BACK_GAP_DAYS * 24 * 60 * 60 * 1000;
}

export default async function ProgressPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="Progress unlocks after your Blueprint Session"
        description="Weekly check-ins, your Monthly Review, milestones, and reassessment all build on real Builder activity."
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    );
  }
  if (access.locked) return <MembershipLockedNotice />;

  const businessId = ub!.businessId;

  // ACCOUNTABILITY: compute "Welcome back" from the *previous* lastActiveAt
  // before touching it, then mark this visit as activity — never a
  // missed-day count, just "you were gone a while, glad you're here."
  const showWelcomeBack = isWelcomeBack(ub!.business.lastActiveAt);

  const [, newMilestones, weekOfCheckIn, monthlyReview, reassessment, achievedMilestones] = await Promise.all([
    prisma.business.update({ where: { id: businessId }, data: { lastActiveAt: new Date() } }),
    checkForNewMilestones(businessId),
    prisma.weeklyCheckIn.findUnique({
      where: { businessId_weekOf: { businessId, weekOf: getWeekStart() } },
    }),
    getMonthlyReview(businessId),
    getReassessmentEligibility(businessId),
    prisma.businessMilestone.findMany({ where: { businessId } }),
  ]);

  const achievedByKey = new Map(achievedMilestones.map((m) => [m.milestone, m]));
  const milestoneRows = MILESTONE_CATALOG.map((m) => {
    const row = achievedByKey.get(m.key);
    return {
      key: m.key,
      label: m.label,
      autoDetectable: m.autoDetectable,
      achieved: Boolean(row),
      achievedAt: row?.achievedAt.toISOString() ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Progress</h1>
      <p className="mt-1 text-foreground-muted">
        Weekly check-ins, your Monthly Review, milestones, and reassessment for {ub!.business.name}.
      </p>

      {showWelcomeBack && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-gold-200 bg-gold-50/60 px-4 py-3 text-sm text-navy-800">
          <Sparkles className="h-4 w-4 shrink-0 text-gold-600" aria-hidden="true" />
          <span>
            <span className="font-semibold">Welcome back.</span> Let&apos;s continue where you left
            off.
          </span>
        </div>
      )}

      {newMilestones.length > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success-bg px-4 py-3 text-sm text-navy-800">
          <TrendingUp className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          New milestone{newMilestones.length > 1 ? "s" : ""} reached — check the Milestones tab.
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Accountability</CardTitle>
        </CardHeader>
        <p className="mb-3 text-sm text-foreground-muted">
          How often do you want to show up here? There&apos;s no penalty for missing a day.
        </p>
        <AccountabilityControl
          businessId={businessId}
          cadence={ub!.business.accountabilityCadence}
          customDays={ub!.business.accountabilityCustomDays}
        />
      </Card>

      <Tabs defaultValue="check-in" className="mt-6">
        <TabsList>
          <TabsTrigger value="check-in">Weekly Check-In</TabsTrigger>
          <TabsTrigger value="review">Monthly Review</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="reassessment">Reassessment</TabsTrigger>
        </TabsList>

        <TabsContent value="check-in">
          <Card>
            <CheckInForm
              businessId={businessId}
              weekOfLabel={getWeekStart().toLocaleDateString(undefined, { month: "long", day: "numeric" })}
              alreadySubmitted={Boolean(weekOfCheckIn)}
              initial={{
                completed: weekOfCheckIn?.completed ?? "",
                slowedDown: weekOfCheckIn?.slowedDown ?? "",
                biggestWin: weekOfCheckIn?.biggestWin ?? "",
                biggestChallenge: weekOfCheckIn?.biggestChallenge ?? "",
                leads: weekOfCheckIn?.leads?.toString() ?? "",
                sales: weekOfCheckIn?.sales?.toString() ?? "",
                revenue: weekOfCheckIn?.revenueCents ? (weekOfCheckIn.revenueCents / 100).toString() : "",
                nextWeekFocus: weekOfCheckIn?.nextWeekFocus ?? "",
              }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>{monthlyReview.monthLabel}</CardTitle>
            </CardHeader>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-navy-50 p-3 text-center">
                <p className="text-xl font-semibold text-navy-900">{monthlyReview.roadmapProgress.percent}%</p>
                <p className="text-xs text-foreground-muted">Roadmap Complete</p>
              </div>
              <div className="rounded-xl bg-navy-50 p-3 text-center">
                <p className="text-xl font-semibold text-navy-900">{monthlyReview.leads}</p>
                <p className="text-xs text-foreground-muted">Leads</p>
              </div>
              <div className="rounded-xl bg-navy-50 p-3 text-center">
                <p className="text-xl font-semibold text-navy-900">{monthlyReview.sales}</p>
                <p className="text-xs text-foreground-muted">Sales</p>
              </div>
              <div className="rounded-xl bg-navy-50 p-3 text-center">
                <p className="text-xl font-semibold text-navy-900">{formatCents(monthlyReview.revenueCents)}</p>
                <p className="text-xs text-foreground-muted">Revenue</p>
              </div>
            </div>

            {monthlyReview.scoreChanges.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Score Changes (since last assessment)
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {monthlyReview.scoreChanges.map((c) => (
                    <div key={c.stage} className="rounded-xl bg-navy-50 p-3 text-sm">
                      <p className="font-medium text-navy-800">
                        <span aria-hidden="true">{STAGE_META[c.stage as Stage].icon}</span>{" "}
                        {STAGE_META[c.stage as Stage].label}
                      </p>
                      <p className="mt-1">
                        {c.current ?? "—"}%
                        {c.improvement !== null && (
                          <span className={c.improvement >= 0 ? "text-success" : "text-danger"}>
                            {" "}
                            ({c.improvement >= 0 ? "+" : ""}
                            {c.improvement})
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Current Bottleneck
                </p>
                <p className="mt-1 text-sm text-navy-800">
                  {monthlyReview.currentBottleneck
                    ? `${monthlyReview.currentBottleneck.category} (${monthlyReview.currentBottleneck.scorePercent}%)`
                    : "Not enough data yet."}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Recommended Focus
                </p>
                <p className="mt-1 text-sm text-navy-800">
                  {monthlyReview.recommendedFocus ? (
                    <Link href={`/build/${monthlyReview.recommendedFocus.id}`} className="underline hover:text-navy-600">
                      {monthlyReview.recommendedFocus.title}
                    </Link>
                  ) : (
                    "Nothing outstanding right now."
                  )}
                </p>
              </div>
            </div>

            {monthlyReview.achievements.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Achievements This Month
                </p>
                <ul className="flex flex-wrap gap-2">
                  {monthlyReview.achievements.map((a) => (
                    <li key={a} className="rounded-full bg-gold-50 px-3 py-1 text-xs font-medium text-gold-700">
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {monthlyReview.goals.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Active Goals
                </p>
                <div className="flex flex-col gap-2">
                  {monthlyReview.goals.map((g) => (
                    <div key={g.id} className="text-sm">
                      <p className="text-navy-800">{g.title}</p>
                      <ProgressBar value={g.progressPercent} className="mt-1" showValue />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <MilestonesGrid businessId={businessId} milestones={milestoneRows} />
          </Card>
        </TabsContent>

        <TabsContent value="reassessment">
          <Card>
            <CardHeader>
              <CardTitle>Reassessment</CardTitle>
            </CardHeader>
            {!reassessment.hasCompletedAssessment ? (
              <p className="text-sm text-foreground-muted">Complete your first assessment to unlock this.</p>
            ) : reassessment.eligible ? (
              <>
                <p className="mb-4 text-sm text-navy-800">
                  {reassessment.eligibleByDays
                    ? `It's been ${reassessment.daysSinceLatest} days since your last assessment.`
                    : `You've completed ${reassessment.roadmapCompletionPercent}% of your roadmap.`}{" "}
                  You&apos;re eligible to see how far you&apos;ve come.
                </p>
                <RetakeAssessmentButton businessId={businessId} />
              </>
            ) : (
              <p className="text-sm text-foreground-muted">
                Reassessment unlocks 90 days after your last assessment ({reassessment.daysSinceLatest ?? "—"} so
                far), or once you&apos;ve completed 50% of your roadmap (currently{" "}
                {reassessment.roadmapCompletionPercent}%).
              </p>
            )}

            {reassessment.latest && reassessment.previous && (
              <div className="mt-6 border-t border-navy-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Previous vs. Current
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(["PASSION", "POWER", "LEGACY"] as Stage[]).map((stage) => {
                    const prevScore = reassessment.previous!.scores.find((s) => s.stage === stage)?.scorePercent ?? null;
                    const currScore = reassessment.latest!.scores.find((s) => s.stage === stage)?.scorePercent ?? null;
                    const improvement = prevScore !== null && currScore !== null ? currScore - prevScore : null;
                    return (
                      <div key={stage} className="rounded-xl bg-navy-50 p-3 text-center text-sm">
                        <p className="font-medium text-navy-800">
                          <span aria-hidden="true">{STAGE_META[stage].icon}</span> {STAGE_META[stage].label}
                        </p>
                        <p className="mt-1 text-xs text-foreground-muted">
                          {prevScore ?? "—"}% → {currScore ?? "—"}%
                        </p>
                        {improvement !== null && (
                          <p className={improvement >= 0 ? "text-xs font-semibold text-success" : "text-xs font-semibold text-danger"}>
                            {improvement >= 0 ? "+" : ""}
                            {improvement}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <div className="rounded-xl bg-navy-50 p-3 text-center text-sm">
                    <p className="font-medium text-navy-800">Business Health</p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {reassessment.previous.healthScorePercent ?? "—"}% → {reassessment.latest.healthScorePercent ?? "—"}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
