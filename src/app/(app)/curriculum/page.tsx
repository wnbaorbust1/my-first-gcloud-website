import { PartyPopper, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { getCurrentWeek } from "@/lib/curriculum/curriculum";
import { requireUser } from "@/lib/session";

import { DailyActionList } from "./daily-action-list";
import { WeeklyReviewForm } from "./weekly-review-form";

export const metadata: Metadata = { title: "Passion Sprint — Blueprint" };
export const dynamic = "force-dynamic";

/**
 * PASSION-SPRINT CURRICULUM (BLUEPRINT_MASTER_SPEC_CLAUDE_CODE.md §5/§6,
 * Phase C — weeks 1-13). Shows the member's current week only — the spec's
 * "one screen, what's the most important thing next" daily-dashboard
 * philosophy applied to a 13-week arc, not a syllabus browser.
 */
export default async function CurriculumPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (!ub) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Set up your business first"
        description="Create your business profile to get started."
      />
    );
  }
  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Sparkles}
        title="Your Passion Sprint isn't unlocked yet"
        description="Complete your qualifying session to unlock your first week."
      />
    );
  }
  if (access.locked) {
    return <MembershipLockedNotice />;
  }

  const result = await getCurrentWeek(ub.businessId);

  if (result.state === "sprint-complete") {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy-900">Passion Sprint</h1>
          <p className="mt-1 text-foreground-muted">Your 13-week Passion foundation.</p>
        </div>
        <EmptyState
          icon={PartyPopper}
          title="You've completed all 13 weeks of your Passion Sprint"
          description={`${result.totalWeeksCompleted} of 13 weeks complete. The next stretch of the curriculum isn't available yet — keep building in your Roadmap in the meantime.`}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/roadmap">Go to My Roadmap</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { week, actions, actionsCompletedCount, totalActions, nextWeekTopic, progressStatus, reviewNote } = result;
  const percent = totalActions > 0 ? Math.round((actionsCompletedCount / totalActions) * 100) : 0;
  const allActionsDone = actionsCompletedCount >= totalActions;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
          Week {week.weekNumber} of 13 · Passion Sprint
        </p>
        <h1 className="font-display text-3xl font-semibold text-navy-900">{week.topic}</h1>
        <p className="mt-1 text-foreground-muted">Required asset: {week.requiredAsset}</p>
      </div>

      <Card>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-navy-800">
            {actionsCompletedCount} of {totalActions} daily actions complete
          </span>
          <span className="text-foreground-muted">{percent}%</span>
        </div>
        <ProgressBar
          value={percent}
          className="mt-2"
          ariaLabel={`Week ${week.weekNumber} progress: ${percent}%, ${actionsCompletedCount} of ${totalActions} daily actions complete`}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This Week&apos;s Lesson</CardTitle>
        </CardHeader>
        <p className="text-sm text-navy-800">{week.lesson}</p>
        <p className="mt-4 text-sm font-medium text-navy-900">Why this matters</p>
        <p className="mt-1 text-sm text-foreground-muted">{week.whyItMatters}</p>
        <p className="mt-4 text-sm font-medium text-navy-900">A completed example</p>
        <p className="mt-1 text-sm italic text-foreground-muted">{week.completedExample}</p>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
          This Week&apos;s Daily Actions
        </h2>
        <DailyActionList businessId={ub.businessId} actions={actions} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Review</CardTitle>
        </CardHeader>
        <WeeklyReviewForm
          businessId={ub.businessId}
          weekId={week.weekId}
          prompt={week.weeklyReviewPrompt}
          allActionsDone={allActionsDone}
          initialNote={reviewNote}
          alreadyCompleted={progressStatus === "COMPLETED"}
        />
      </Card>

      {nextWeekTopic && (
        <p className="text-center text-xs text-foreground-muted">
          Next week: <span className="font-medium text-navy-600">{nextWeekTopic}</span>
        </p>
      )}
    </div>
  );
}
