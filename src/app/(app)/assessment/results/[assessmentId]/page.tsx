import { Check, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "@/components/ui/score-card";
import { CATEGORY_CONTENT } from "@/lib/assessment/seed-content";
import { sessionLabelFor, topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, requireUser } from "@/lib/session";
import { STAGES, type Stage } from "@/lib/utils";

import { SESSION_TYPE_DISPLAY } from "../session-type-display";

export const metadata: Metadata = { title: "Your Blueprint Results — Blueprint" };
export const dynamic = "force-dynamic";

export default async function AssessmentResultsPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const user = await requireUser();

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      business: { select: { id: true, name: true } },
      scores: true,
      categoryScores: true,
    },
  });
  if (!assessment) notFound();

  const allowed = await assertBusinessAccess(user.id, user.role, assessment.businessId);
  if (!allowed) notFound();

  if (assessment.status !== "COMPLETED") {
    redirect("/assessment");
  }

  const scoreByStage = new Map(assessment.scores.map((s) => [s.stage, s.scorePercent]));
  const categoryScores = assessment.categoryScores.map((c) => ({
    stage: c.stage as Stage,
    category: c.category,
    scorePercent: c.scorePercent,
  }));
  const { strengths, priorities } = topStrengthsAndPriorities(categoryScores);

  const recommendedType = assessment.recommendedSessionType;
  const recommendedDisplay = recommendedType ? SESSION_TYPE_DISPLAY[recommendedType] : null;
  const topPriority = priorities[0];
  const priorityContent = topPriority ? CATEGORY_CONTENT[topPriority.category] : undefined;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">
          {assessment.business.name}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-navy-900 sm:text-4xl">
          Your Blueprint Results
        </h1>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAGES.map((stage) => (
          <Link key={stage} href={`/assessment/results/${assessmentId}/stage/${stage}`}>
            <ScoreCard stage={stage} scorePercent={scoreByStage.get(stage) ?? null} />
          </Link>
        ))}
      </div>

      {assessment.healthScorePercent !== null && (
        <Card className="mt-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-400">
            Blueprint Business Health Score
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-navy-900">
            {assessment.healthScorePercent}%
          </p>
        </Card>
      )}

      {recommendedDisplay && (
        <Card className="mt-6 border-navy-200 bg-navy-900 text-cream-50">
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-300">
            Your Current Blueprint Stage
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">
            <span aria-hidden="true">{recommendedDisplay.icon}</span> {recommendedDisplay.label}
          </p>
          {assessment.recommendationReason && (
            <p className="mt-3 max-w-2xl text-navy-200">{assessment.recommendationReason}</p>
          )}
          <Button asChild variant="gold" size="lg" className="mt-5">
            <Link href="#recommended-session">View My Recommended Session</Link>
          </Button>
        </Card>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Strengths</CardTitle>
          </CardHeader>
          <ul className="flex flex-col gap-3">
            {strengths.map((s) => (
              <li key={`${s.stage}-${s.category}`} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>
                  <span className="font-medium text-navy-900">{s.category}</span>{" "}
                  <span className="text-foreground-muted">({s.scorePercent}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Next Opportunities</CardTitle>
          </CardHeader>
          <ul className="flex flex-col gap-3">
            {priorities.map((p) => (
              <li key={`${p.stage}-${p.category}`} className="flex items-start gap-2.5 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-power-500" aria-hidden="true" />
                <span>
                  <span className="font-medium text-navy-900">{p.category}</span>{" "}
                  <span className="text-foreground-muted">({p.scorePercent}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {priorityContent && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your Next Best Action</CardTitle>
          </CardHeader>
          <p className="text-sm text-foreground-muted">{priorityContent.nextStep}</p>
        </Card>
      )}

      {recommendedType && (
        <Card id="recommended-session" className="mt-6 scroll-mt-6 border-gold-200">
          <p className="text-3xl" aria-hidden="true">
            {SESSION_TYPE_DISPLAY[recommendedType].icon}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gold-600">
            Recommended for You
          </p>
          <h2 className="mt-1 text-xl font-semibold text-navy-900">
            {sessionLabelFor(recommendedType)}
          </h2>
          {assessment.recommendationReason && (
            <p className="mt-2 text-sm text-foreground-muted">{assessment.recommendationReason}</p>
          )}
          <Button asChild size="lg" className="mt-5">
            <Link href="/sessions">View Available Sessions</Link>
          </Button>
        </Card>
      )}

      <p className="mt-8 text-center text-xs text-foreground-muted">
        Assessment completed{" "}
        {assessment.completedAt?.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
