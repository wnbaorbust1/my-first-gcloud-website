import { ArrowLeft, BookOpen, FileText, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "@/components/ui/score-card";
import { sessionLabelFor, topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/rbac";
import { requireRole } from "@/lib/session";
import { STAGES, type Stage } from "@/lib/utils";

export const metadata: Metadata = { title: "Business — Blueprint Admin" };
export const dynamic = "force-dynamic";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  await requireRole(ADMIN_ROLES, "/admin/businesses");

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { memberships: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!business) notFound();

  const [assessment, roadmap, goals] = await Promise.all([
    prisma.assessment.findFirst({
      where: { businessId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      include: { scores: true, categoryScores: true },
    }),
    prisma.roadmap.findFirst({ where: { businessId }, include: { tasks: true } }),
    prisma.goal.findMany({ where: { businessId, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const owner = business.memberships[0]?.user;
  const scoreByStage = new Map((assessment?.scores ?? []).map((s) => [s.stage, s.scorePercent]));
  const categoryScores =
    assessment?.categoryScores.map((c) => ({
      stage: c.stage as Stage,
      category: c.category,
      scorePercent: c.scorePercent,
    })) ?? [];
  const { strengths, priorities } = topStrengthsAndPriorities(categoryScores);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/businesses"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Businesses
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">{business.name}</h1>
          {owner && (
            <p className="text-sm text-foreground-muted">
              {owner.firstName} {owner.lastName} · {owner.email}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/businesses/${businessId}/my-blueprint`}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              My Blueprint
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/businesses/${businessId}/vision-board`}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Vision Board Profile
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/businesses/${businessId}/scorecard`}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              Scorecard
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <Link
          href={`/facilitator/participants/${businessId}`}
          className="font-medium text-navy-500 underline hover:text-navy-800"
        >
          Full participant view (notes, sessions, encouragement, membership)
        </Link>
        <Link
          href={`/facilitator/participants/roadmap/${businessId}`}
          className="font-medium text-navy-500 underline hover:text-navy-800"
        >
          Manage Roadmap
        </Link>
      </div>

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
                <ScoreCard key={stage} stage={stage} scorePercent={scoreByStage.get(stage) ?? null} />
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
                <span className="font-medium">Recommended: </span>
                {sessionLabelFor(assessment.recommendedSessionType)}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-foreground-muted">No completed assessment yet.</p>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Roadmap</CardTitle>
        </CardHeader>
        {roadmap && roadmap.tasks.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(["COMPLETED", "IN_PROGRESS", "NOT_STARTED", "LOCKED", "PAUSED"] as const).map((s) => (
              <div key={s} className="rounded-xl bg-navy-50 p-3 text-center">
                <p className="text-lg font-semibold text-navy-900">
                  {roadmap.tasks.filter((t) => t.status === s).length}
                </p>
                <p className="text-xs text-foreground-muted">{s.replace("_", " ")}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground-muted">No roadmap yet.</p>
        )}
      </Card>

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
          <p className="text-sm text-foreground-muted">No active goals.</p>
        )}
      </Card>
    </div>
  );
}
