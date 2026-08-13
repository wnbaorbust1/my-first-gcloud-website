import { ArrowLeft, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "@/components/ui/score-card";
import { sessionLabelFor, topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { MILESTONE_CATALOG } from "@/lib/progress/milestones";
import { prisma } from "@/lib/prisma";
import { can, STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, requireRole } from "@/lib/session";
import { STAGES, type Stage } from "@/lib/utils";

import { AttendanceControl } from "../attendance-control";
import { MembershipGrantForm } from "../membership-grant-form";
import { NoteForm } from "../note-form";
import { EncouragementForm } from "./encouragement-form";
import { RecommendSessionForm } from "./recommend-session-form";

export const metadata: Metadata = { title: "Participant Detail — Blueprint Facilitator" };
export const dynamic = "force-dynamic";

const NOTE_TYPE_LABELS: Record<string, string> = {
  PRIVATE: "Private",
  PARTICIPANT_VISIBLE: "Participant-Visible",
  RECOMMENDATION: "Recommendation",
  TASK_RECOMMENDATION: "Task Recommendation",
};

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const user = await requireRole(STAFF_ROLES, "/facilitator/participants");

  const allowed = await assertBusinessAccess(user.id, user.role, businessId);
  if (!allowed) notFound();

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { memberships: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!business) notFound();

  const [
    assessment,
    roadmap,
    goals,
    registrations,
    weeklyCheckInCount,
    milestones,
    blueprintSections,
    notes,
    aiConversations,
    upcomingSessions,
  ] = await Promise.all([
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: { scores: true, categoryScores: true },
    }),
    prisma.roadmap.findFirst({ where: { businessId }, include: { tasks: true } }),
    prisma.goal.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.sessionRegistration.findMany({
      where: { businessId, status: { not: "CANCELLED" } },
      include: { session: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.weeklyCheckIn.count({ where: { businessId } }),
    prisma.businessMilestone.findMany({ where: { businessId }, orderBy: { achievedAt: "desc" } }),
    prisma.documentSection.findMany({
      where: { document: { businessId, kind: "BLUEPRINT" } },
      select: { title: true, content: true },
    }),
    prisma.facilitatorNote.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { firstName: true, lastName: true } } },
    }),
    prisma.aiConversation.findMany({
      where: { businessId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, mode: true, updatedAt: true },
    }),
    prisma.sessionOffering.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 20,
      select: { id: true, title: true, startsAt: true },
    }),
  ]);

  const owner = business.memberships[0]?.user;
  const categoryScores =
    assessment?.categoryScores.map((c) => ({
      stage: c.stage as Stage,
      category: c.category,
      scorePercent: c.scorePercent,
    })) ?? [];
  const { strengths, priorities } = topStrengthsAndPriorities(categoryScores);

  const tasks = roadmap?.tasks ?? [];
  const recentCompletedTasks = tasks
    .filter((t) => t.status === "COMPLETED")
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
    .slice(0, 5);
  const filledSections = blueprintSections.filter((s) => s.content && s.content.trim().length > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/facilitator"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold text-navy-900">{business.name}</h1>
        {owner && (
          <span className="text-sm text-foreground-muted">
            {owner.firstName} {owner.lastName} · {owner.email}
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-3 text-xs">
        <Link
          href={`/facilitator/participants/roadmap/${businessId}`}
          className="font-medium text-navy-500 underline hover:text-navy-800"
        >
          Manage Roadmap (Assign / Reorder / Unlock / Pause / Set Priority)
        </Link>
        <Link
          href={`/facilitator/participants/${businessId}/vision-board`}
          className="font-medium text-navy-500 underline hover:text-navy-800"
        >
          Edit Vision Board Recommendations
        </Link>
      </div>

      {/* Assessment */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Assessment</CardTitle>
        </CardHeader>
        {assessment ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="flex flex-col items-center justify-center rounded-xl border border-navy-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Health</p>
                <p className="mt-1 text-2xl font-semibold text-navy-900">
                  {assessment.healthScorePercent ?? "—"}%
                </p>
              </div>
              {STAGES.map((stage) => (
                <ScoreCard
                  key={stage}
                  stage={stage}
                  scorePercent={assessment.scores.find((s) => s.stage === stage)?.scorePercent ?? null}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Top Strengths
                </p>
                <ul className="mt-1 text-foreground-muted">
                  {strengths.map((s) => (
                    <li key={s.category}>
                      {s.category} ({s.scorePercent}%)
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Top Priority Areas
                </p>
                <ul className="mt-1 text-foreground-muted">
                  {priorities.map((p) => (
                    <li key={p.category}>
                      {p.category} ({p.scorePercent}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {assessment.recommendedSessionType && (
              <p className="mt-3 text-sm text-navy-700">
                <span className="font-medium">System Recommendation: </span>
                {sessionLabelFor(assessment.recommendedSessionType)}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-foreground-muted">No completed assessment yet.</p>
        )}
      </Card>

      {/* Roadmap */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Roadmap</CardTitle>
        </CardHeader>
        {tasks.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(["COMPLETED", "IN_PROGRESS", "NOT_STARTED", "LOCKED", "PAUSED"] as const).map((s) => (
                <div key={s} className="rounded-xl bg-navy-50 p-3 text-center">
                  <p className="text-lg font-semibold text-navy-900">
                    {tasks.filter((t) => t.status === s).length}
                  </p>
                  <p className="text-xs text-foreground-muted">{s.replace("_", " ")}</p>
                </div>
              ))}
            </div>
            {recentCompletedTasks.length > 0 && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Recently Completed
                </p>
                <ul className="text-sm text-foreground-muted">
                  {recentCompletedTasks.map((t) => (
                    <li key={t.id}>{t.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-foreground-muted">
            No roadmap yet — one is created automatically once their qualifying session is marked
            attended.
          </p>
        )}
      </Card>

      {/* Blueprint */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>My Blueprint</CardTitle>
        </CardHeader>
        <p className="text-sm text-foreground-muted">
          {filledSections.length} of {blueprintSections.length || "0"} sections filled in
        </p>
        {filledSections.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {filledSections.map((s) => (
              <span key={s.title} className="rounded-full bg-navy-50 px-3 py-1 text-xs text-navy-700">
                {s.title}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Goals */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Goals</CardTitle>
        </CardHeader>
        {goals.length > 0 ? (
          <ul className="flex flex-col gap-2 text-sm">
            {goals.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2">
                <span className="text-navy-800">{g.title}</span>
                <span className="text-xs text-foreground-muted">
                  {g.status} · {g.progressPercent}%
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground-muted">No goals set yet.</p>
        )}
      </Card>

      {/* Sessions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        {registrations.length > 0 ? (
          <div className="flex flex-col gap-2">
            {registrations.map((reg) => (
              <div
                key={reg.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-navy-50 px-3 py-2 text-sm"
              >
                <span>{reg.session.title}</span>
                <AttendanceControl registrationId={reg.id} status={reg.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">No session registrations yet.</p>
        )}
        <div className="mt-4 border-t border-navy-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
            Recommend a Session
          </p>
          <RecommendSessionForm
            businessId={businessId}
            sessions={upcomingSessions.map((s) => ({ ...s, startsAt: s.startsAt.toISOString() }))}
          />
        </div>
      </Card>

      {/* Progress */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-navy-50 p-3 text-center">
            <p className="text-lg font-semibold text-navy-900">{weeklyCheckInCount}</p>
            <p className="text-xs text-foreground-muted">Weekly Check-Ins</p>
          </div>
          <div className="rounded-xl bg-navy-50 p-3 text-center">
            <p className="text-lg font-semibold text-navy-900">
              {milestones.length} / {MILESTONE_CATALOG.length}
            </p>
            <p className="text-xs text-foreground-muted">Milestones</p>
          </div>
          <div className="rounded-xl bg-navy-50 p-3 text-center">
            <p className="text-lg font-semibold text-navy-900">
              {business.accountabilityCadence ?? "Not set"}
            </p>
            <p className="text-xs text-foreground-muted">Accountability</p>
          </div>
        </div>
      </Card>

      {/* Recent AI/task activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        {aiConversations.length > 0 || recentCompletedTasks.length > 0 ? (
          <ul className="flex flex-col gap-1.5 text-sm text-foreground-muted">
            {aiConversations.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold-500" aria-hidden="true" />
                {c.title} ({c.mode}) — {c.updatedAt.toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground-muted">No AI conversations yet.</p>
        )}
      </Card>

      {/* Facilitator Notes */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Facilitator Notes</CardTitle>
        </CardHeader>
        {notes.length > 0 && (
          <ul className="mb-3 flex flex-col gap-2 text-sm">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-navy-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs text-foreground-muted">
                  <span>
                    {NOTE_TYPE_LABELS[n.noteType] ?? n.noteType} · {n.author.firstName}{" "}
                    {n.author.lastName}
                  </span>
                  <span>{n.createdAt.toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-navy-800">{n.note}</p>
              </li>
            ))}
          </ul>
        )}
        <NoteForm businessId={businessId} />
      </Card>

      {/* Send Encouragement */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Send Encouragement</CardTitle>
        </CardHeader>
        <EncouragementForm businessId={businessId} />
      </Card>

      {/* Membership */}
      {can.grantMembership(user.role) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Grant Membership</CardTitle>
          </CardHeader>
          <MembershipGrantForm businessId={businessId} />
        </Card>
      )}
    </div>
  );
}
