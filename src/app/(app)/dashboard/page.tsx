import {
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Circle,
  Compass,
  CreditCard,
  Lock,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { NotificationsCard } from "@/components/dashboard/notifications-card";
import { DashboardWelcomeModal } from "@/components/dashboard/welcome-modal";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ScoreCard } from "@/components/ui/score-card";
import { TaskCard } from "@/components/ui/task-card";
import { sessionLabelFor } from "@/lib/assessment/scoring";
import { AffirmationCard } from "@/components/affirmations/affirmation-card";
import { MoodCheckInCard } from "@/components/affirmations/mood-checkin-card";
import { NextBestActionCard } from "@/components/roadmap/next-best-action-card";
import { getDashboardData } from "@/lib/dashboard/data";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { STAGES, STAGE_META, type Stage } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard — Blueprint" };
export const dynamic = "force-dynamic";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [data, unreadNotifications] = await Promise.all([
    getDashboardData(user.id),
    prisma.notification.findMany({
      where: { userId: user.id, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const header = (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-navy-900">
          {greeting()}, {user.firstName}
        </h1>
        <p className="mt-1 text-foreground-muted">
          {data.state === "no-business"
            ? "Let's set up your business to get started."
            : data.state === "builder"
              ? "Let's keep building your Blueprint."
              : data.state === "expired"
                ? `${data.business.name}'s Blueprint Builder access has ended.`
                : `Let's keep building ${data.business.name}.`}
        </p>
      </div>
      <NotificationsCard
        notifications={unreadNotifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );

  // ---- No business yet -----------------------------------------------
  if (data.state === "no-business") {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState
          icon={Compass}
          title="Set up your business profile"
          description="Tell us a bit about your business so Blueprint can start building your personalized roadmap."
          action={
            <Button asChild size="lg">
              <Link href="/business-profile">Create My Business Profile</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // ---- No completed assessment yet ------------------------------------
  if (data.state === "no-assessment") {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <Card className="border-gold-200 bg-gradient-to-br from-gold-50 to-surface">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gold-600">
                Your Blueprint Status
              </p>
              <p className="mt-1 text-lg font-semibold text-navy-900">
                Complete your Blueprint Assessment to begin.
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                A few minutes of questions unlocks your Passion, Power, and
                Legacy scores and a roadmap built around your business.
              </p>
            </div>
            <Button asChild size="lg" variant="gold" className="w-full shrink-0 sm:w-auto">
              <Link href="/assessment">Start My Assessment</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- Pre-session: assessment done, Builder not unlocked yet ---------
  if (data.state === "pre-session") {
    const reg = data.latestRegistration;
    const isRegistered = reg && ["REGISTERED", "WAITLISTED"].includes(reg.status);
    const isAttended = reg && ["ATTENDED", "COMPLETED"].includes(reg.status);

    const checklist = [
      { label: "Assessment Complete", done: true },
      { label: "Session Registered", done: Boolean(isRegistered || isAttended) },
      { label: "Session Attendance", done: Boolean(isAttended), pending: true },
      { label: "Blueprint Builder", done: false, locked: true },
    ];

    return (
      <div className="flex flex-col gap-8">
        {header}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
            Blueprint Scores
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STAGES.map((stage) => {
              const score = data.assessment.scores.find((s) => s.stage === stage);
              return (
                <Link key={stage} href={`/assessment/results/${data.assessment.id}/stage/${stage}`}>
                  <ScoreCard stage={stage} scorePercent={score?.scorePercent ?? null} />
                </Link>
              );
            })}
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Your Path to Blueprint Builder</CardTitle>
          </CardHeader>
          <ul className="flex flex-col gap-3">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                ) : item.locked ? (
                  <Lock className="h-5 w-5 shrink-0 text-navy-300" aria-hidden="true" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-navy-300" aria-hidden="true" />
                )}
                <span className={item.done ? "text-navy-900" : "text-foreground-muted"}>
                  {item.label}
                </span>
                {item.done && <span aria-hidden="true">✅</span>}
                {!item.done && item.pending && <span aria-hidden="true">⏳</span>}
                {!item.done && item.locked && <span aria-hidden="true">🔒</span>}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm text-foreground-muted">
            Your personalized Blueprint Builder unlocks after your session is completed.
          </p>

          {reg ? (
            <p className="mt-4 rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-700">
              You&apos;re {reg.status === "WAITLISTED" ? "waitlisted for" : "registered for"}{" "}
              <span className="font-medium">{reg.session.title}</span> on{" "}
              {reg.session.startsAt.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              .
            </p>
          ) : (
            <Button asChild size="lg" variant="gold" className="mt-4">
              <Link href="/sessions">View My Recommended Session</Link>
            </Button>
          )}
        </Card>
      </div>
    );
  }

  // ---- EXPIRED ACCOUNT (spec Prompt 8): membership no longer grants ----
  // Builder access. Basic Account + a read-only summary — never full
  // Builder content, never deleted content.
  if (data.state === "expired") {
    return (
      <div className="flex flex-col gap-8">
        {header}

        <Card className="border-navy-200 bg-navy-50">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                Your Blueprint is saved
              </p>
              <p className="mt-1 text-lg font-semibold text-navy-900">
                Nothing you&apos;ve built has been lost — reactivate to keep building.
              </p>
            </div>
            <Button asChild size="lg" variant="gold" className="w-full shrink-0 sm:w-auto">
              <Link href="/billing">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                Billing &amp; Reactivation
              </Link>
            </Button>
          </div>
        </Card>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
            Blueprint Scores (read-only)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STAGES.map((stage) => {
              const score = data.assessment.scores.find((s) => s.stage === stage);
              return <ScoreCard key={stage} stage={stage} scorePercent={score?.scorePercent ?? null} />;
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Account</CardTitle>
            </CardHeader>
            <p className="text-sm text-foreground-muted">{data.business.name}</p>
            <p className="mt-1 text-xs text-foreground-muted">
              Business profile, past assessments, and My Blueprint content are all preserved and
              will be fully accessible again once reactivated.
            </p>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <p className="text-sm text-foreground-muted">
              Review the sessions you&apos;ve registered for and attended.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/sessions">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                View Sessions
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // ---- Builder unlocked: the full post-session dashboard ---------------
  const { nextBestAction, todaysBlueprint, roadmapSnapshot, progressByStage, todaysAffirmation, currentWeek } = data;

  return (
    <div className="flex flex-col gap-8">
      {/* Onboarding — Touchpoint 2 (pre-publish audit follow-up): shown
          exactly once, the first time this business's dashboard ever
          renders in the "builder" state. */}
      {!data.business.builderWelcomeSeenAt && (
        <DashboardWelcomeModal businessId={data.business.id} />
      )}

      {header}

      {/* Daily Affirmation + Mood Check-In (spec §7, Phase B) — right after
          the greeting, per the spec's own daily dashboard order. The
          affirmation card is skipped (not a page-breaking error) if
          getTodaysAffirmation failed — see getDashboardData's fault
          isolation around that call. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {todaysAffirmation && (
          <AffirmationCard
            businessId={data.business.id}
            affirmationId={todaysAffirmation.id}
            text={todaysAffirmation.text}
            spoken={todaysAffirmation.spoken}
            reflected={todaysAffirmation.reflected}
            connected={todaysAffirmation.connectedTaskId !== null}
            favorited={todaysAffirmation.favorited}
            nextActionTaskId={nextBestAction?.id ?? null}
            nextActionTitle={nextBestAction?.title ?? null}
          />
        )}
        <MoodCheckInCard businessId={data.business.id} />
      </div>

      {/* Passion Sprint — This Week (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md
          §5/§6, Phase C). Skipped (not page-breaking) if getCurrentWeek
          failed — see getDashboardData's fault isolation around that call. */}
      {currentWeek && currentWeek.state === "in-progress" && (
        <Card className="border-navy-200">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                Passion Sprint · Week {currentWeek.week.weekNumber} of 13
              </p>
              <p className="mt-1 text-lg font-semibold text-navy-900">{currentWeek.week.topic}</p>
              <p className="mt-1 text-sm text-foreground-muted">
                {currentWeek.actionsCompletedCount} of {currentWeek.totalActions} daily actions complete
              </p>
            </div>
            <Button asChild size="sm" variant="gold" className="w-full shrink-0 sm:w-auto">
              <Link href="/curriculum">
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Continue This Week
              </Link>
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
            Current Business
          </p>
          <p className="mt-1 text-lg font-semibold text-navy-900">{data.business.name}</p>
        </Card>
        {data.assessment.recommendedSessionType && (
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
              Current Blueprint Stage
            </p>
            <p className="mt-1 text-lg font-semibold text-navy-900">
              {sessionLabelFor(data.assessment.recommendedSessionType).replace("Blueprint ", "")}
            </p>
          </Card>
        )}
        {data.assessment.healthScorePercent !== null && (
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
              Business Health
            </p>
            <p className="mt-1 text-lg font-semibold text-navy-900">
              {data.assessment.healthScorePercent}%
            </p>
          </Card>
        )}
      </div>

      {/* Next Best Action Engine (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §13,
          Phase D) — the single most important thing on this page, with a
          real "why," and the spec's required smaller/reschedule/help affordances. */}
      <NextBestActionCard
        businessId={data.business.id}
        initialTask={
          nextBestAction
            ? {
                id: nextBestAction.id,
                title: nextBestAction.title,
                stage: nextBestAction.stage as Stage,
                priority: nextBestAction.priority,
                estimatedMins: nextBestAction.estimatedMins,
                description: nextBestAction.description,
                reason: data.nextBestActionReason,
              }
            : null
        }
      />

      {/* Today's Blueprint */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
          Today&apos;s Blueprint
        </h2>
        <div className="flex flex-col gap-3">
          {todaysBlueprint.mustDo && (
            <TaskCard
              title={todaysBlueprint.mustDo.title}
              stage={todaysBlueprint.mustDo.stage as Stage}
              priority="MUST_DO"
              estimatedMins={todaysBlueprint.mustDo.estimatedMins ?? undefined}
              href={`/build/${todaysBlueprint.mustDo.id}`}
            />
          )}
          {todaysBlueprint.shouldDo && (
            <TaskCard
              title={todaysBlueprint.shouldDo.title}
              stage={todaysBlueprint.shouldDo.stage as Stage}
              priority="SHOULD_DO"
              estimatedMins={todaysBlueprint.shouldDo.estimatedMins ?? undefined}
              href={`/build/${todaysBlueprint.shouldDo.id}`}
            />
          )}
          {todaysBlueprint.bonus && (
            <TaskCard
              title={todaysBlueprint.bonus.title}
              stage={todaysBlueprint.bonus.stage as Stage}
              priority="BONUS"
              estimatedMins={todaysBlueprint.bonus.estimatedMins ?? undefined}
              href={`/build/${todaysBlueprint.bonus.id}`}
            />
          )}
          {!todaysBlueprint.mustDo && !todaysBlueprint.shouldDo && !todaysBlueprint.bonus && (
            <EmptyState
              icon={Sparkles}
              title="Nothing left in your active tasks"
              description="Check your full roadmap for what's next."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/roadmap">View Roadmap</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      {/* Gamification (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §9, Phase A) — moved
          up from below the fold (pre-publish audit follow-up): a real,
          working feature that was easy to miss at its old position, the
          last card before Advanced Tools. */}
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Level</p>
            <p className="mt-1 font-display text-xl font-semibold text-navy-900">
              {data.gamificationSnapshot.name}
            </p>
            <p className="text-xs text-foreground-muted">
              {data.gamificationSnapshot.totalPoints} points
              {data.gamificationSnapshot.pointsToNextLevel !== null &&
                ` · ${data.gamificationSnapshot.pointsToNextLevel} to ${data.gamificationSnapshot.nextLevelName}`}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Streak</p>
            <p className="mt-1 font-display text-xl font-semibold text-navy-900">
              {data.gamificationSnapshot.currentStreak} day{data.gamificationSnapshot.currentStreak === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-foreground-muted">
              Best: {data.gamificationSnapshot.longestStreak} day
              {data.gamificationSnapshot.longestStreak === 1 ? "" : "s"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Badges</p>
            <p className="mt-1 font-display text-xl font-semibold text-navy-900">
              {data.gamificationSnapshot.earnedBadgeCount}
            </p>
            <p className="text-xs text-foreground-muted">earned so far</p>
          </div>
        </div>
      </Card>

      {/* Progress cards */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
          Stage Progress
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STAGES.map((stage) => {
            const p = progressByStage[stage];
            return (
              <Link key={stage} href="/roadmap">
                <Card>
                  <p className="text-sm font-semibold text-navy-800">
                    <span aria-hidden="true">{STAGE_META[stage].icon}</span> {STAGE_META[stage].label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-navy-900">{p.percent}%</p>
                  <ProgressBar
                    value={p.percent}
                    stage={stage}
                    className="mt-2"
                    ariaLabel={`${STAGE_META[stage].label} stage progress: ${p.percent}%, ${p.completed} of ${p.total} tasks complete`}
                  />
                  <p className="mt-1 text-xs text-foreground-muted">
                    {p.completed} of {p.total} tasks complete
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Roadmap snapshot */}
        <Card>
          <CardHeader>
            <CardTitle>Roadmap Snapshot</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(
              [
                ["Completed", roadmapSnapshot.completed],
                ["In Progress", roadmapSnapshot.inProgress],
                ["Ready", roadmapSnapshot.ready],
                ["Locked", roadmapSnapshot.locked],
                ["Paused", roadmapSnapshot.paused],
              ] as const
            ).map(([label, count]) => (
              <div key={label} className="rounded-xl bg-navy-50 p-3 text-center">
                <p className="text-xl font-semibold text-navy-900">{count}</p>
                <p className="text-xs text-foreground-muted">{label}</p>
              </div>
            ))}
          </div>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link href="/roadmap">View Full Roadmap</Link>
          </Button>
        </Card>

        {/* Goal snapshot */}
        <Card>
          <CardHeader>
            <CardTitle>Goal Snapshot</CardTitle>
          </CardHeader>
          {data.goal ? (
            <>
              <p className="text-sm font-semibold text-navy-900">{data.goal.title}</p>
              {data.goal.targetDate && (
                <p className="mt-1 text-xs text-foreground-muted">
                  Target: {data.goal.targetDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
              <ProgressBar
                value={data.goal.progressPercent}
                className="mt-3"
                showValue
                ariaLabel={`${data.goal.title} progress: ${data.goal.progressPercent}%`}
              />
              {nextBestAction && (
                <p className="mt-3 text-xs text-foreground-muted">
                  <span className="font-medium text-navy-600">Next milestone: </span>
                  {nextBestAction.title}
                </p>
              )}
            </>
          ) : (
            <EmptyState
              icon={Target}
              title="Set your first 90-day Blueprint goal"
              action={
                <Button asChild size="sm">
                  <Link href="/goals">Create My Goal</Link>
                </Button>
              }
            />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Session info */}
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                Last Session
              </p>
              <p className="text-foreground-muted">
                {data.lastSession ? data.lastSession.session.title : "None yet"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                Upcoming Registered Session
              </p>
              <p className="text-foreground-muted">
                {data.upcomingRegisteredSession
                  ? `${data.upcomingRegisteredSession.session.title} — ${data.upcomingRegisteredSession.session.startsAt.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`
                  : "None yet"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                Next Recommended Session
              </p>
              <p className="text-foreground-muted">
                {data.recommendedUpcomingSession
                  ? data.recommendedUpcomingSession.title
                  : "None scheduled right now"}
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-4">
            <Link href="/sessions">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Browse Sessions
            </Link>
          </Button>
        </Card>

        {/* Recent wins */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Wins</CardTitle>
          </CardHeader>
          {data.recentWins.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {data.recentWins.map((task) => (
                <li key={task.id} className="flex items-center gap-2 text-sm text-navy-800">
                  <Trophy className="h-4 w-4 shrink-0 text-gold-500" aria-hidden="true" />
                  {task.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground-muted">
              Complete your first task to see it here.
            </p>
          )}
        </Card>
      </div>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Milestones</CardTitle>
            <Link href="/progress" className="text-xs font-medium text-navy-500 underline hover:text-navy-800">
              View All
            </Link>
          </div>
        </CardHeader>
        <p className="text-sm text-navy-800">
          {data.milestoneSnapshot.achievedCount} of {data.milestoneSnapshot.total} reached
        </p>
        {data.milestoneSnapshot.recent.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.milestoneSnapshot.recent.map((m) => (
              <li key={m.key} className="rounded-full bg-gold-50 px-3 py-1 text-xs font-medium text-gold-700">
                {m.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-foreground-muted">
            Keep building — your first milestone is closer than you think.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/progress">Weekly Check-In &amp; Progress</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/money">Money Tools</Link>
          </Button>
        </div>
      </Card>

      {/* Advanced Business Tools (spec Prompt 10) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Advanced Tools</CardTitle>
            <Link href="/tools" className="text-xs font-medium text-navy-500 underline hover:text-navy-800">
              View All
            </Link>
          </div>
        </CardHeader>
        <p className="text-sm text-navy-800">
          {data.toolsSnapshot.openLeadCount === 0
            ? "CRM, SOPs, Automation, Offers, Marketing, Scripts, and Content Planning are ready when you are."
            : `${data.toolsSnapshot.openLeadCount} open lead${data.toolsSnapshot.openLeadCount === 1 ? "" : "s"} in your pipeline — ${formatCents(data.toolsSnapshot.openPipelineCents)} potential.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/tools/crm">
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              CRM
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/tools/offers">Offer Builder</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/tools">All Tools</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
