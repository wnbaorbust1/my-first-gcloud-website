import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  WorksheetBanner,
  WorksheetChecklist,
  WorksheetChecklistItem,
  WorksheetGrid,
  WorksheetHeader,
  WorksheetPage,
  WorksheetPanel,
  WorksheetRatingRow,
  WorksheetStat,
} from "@/components/blueprint/worksheet";
import { CATEGORY_CONTENT } from "@/lib/assessment/seed-content";
import { sessionLabelFor, topStrengthsAndPriorities } from "@/lib/assessment/scoring";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, requireUser } from "@/lib/session";
import { STAGES, STAGE_META, type Stage } from "@/lib/utils";

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
      business: { select: { id: true, name: true, industry: true, businessStage: true } },
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

  const eyebrow = [assessment.business.industry, assessment.business.businessStage]
    .filter(Boolean)
    .join(" · ");

  return (
    <WorksheetPage>
      <WorksheetHeader
        name={assessment.business.name}
        eyebrow={eyebrow || undefined}
        subtitle={`Blueprint Results · ${assessment.completedAt?.toLocaleDateString(undefined, {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}`}
      />

      <WorksheetGrid>
        <WorksheetPanel number={1} title="My Scores" icon="📊">
          <div className="flex flex-col divide-y divide-navy-100">
            {STAGES.map((stage) => {
              const score = scoreByStage.get(stage);
              if (score === undefined) return null;
              const row = (
                <WorksheetRatingRow
                  key={stage}
                  label={`${STAGE_META[stage].icon} ${STAGE_META[stage].label}`}
                  scorePercent={score}
                />
              );
              return (
                <Link
                  key={stage}
                  href={`/assessment/results/${assessmentId}/stage/${stage}`}
                  className="hover:opacity-70"
                >
                  {row}
                </Link>
              );
            })}
          </div>
          {assessment.healthScorePercent !== null && (
            <div className="mt-3 flex justify-center">
              <WorksheetStat label="Business Health" value={`${assessment.healthScorePercent}%`} />
            </div>
          )}
        </WorksheetPanel>

        {recommendedDisplay && (
          <WorksheetPanel number={2} title="My Blueprint Stage" icon={recommendedDisplay.icon}>
            <p className="text-lg font-bold text-legacy-700 sm:text-xl">
              {recommendedDisplay.label}
            </p>
            {assessment.recommendationReason && (
              <p className="mt-2 text-sm text-navy-600">{assessment.recommendationReason}</p>
            )}
          </WorksheetPanel>
        )}

        <WorksheetPanel number={3} title="My Strengths" icon="💪">
          <WorksheetChecklist>
            {strengths.map((s) => (
              <WorksheetChecklistItem key={`${s.stage}-${s.category}`} checked>
                {s.category} <span className="text-navy-500">({s.scorePercent}%)</span>
              </WorksheetChecklistItem>
            ))}
          </WorksheetChecklist>
        </WorksheetPanel>

        <WorksheetPanel number={4} title="Next Opportunities" icon="🗺️">
          <WorksheetChecklist>
            {priorities.map((p) => (
              <WorksheetChecklistItem key={`${p.stage}-${p.category}`} checked={false}>
                {p.category} <span className="text-navy-500">({p.scorePercent}%)</span>
              </WorksheetChecklistItem>
            ))}
          </WorksheetChecklist>
        </WorksheetPanel>

        {priorityContent && (
          <WorksheetPanel number={5} title="My Next Best Action" icon="🎯">
            <p className="text-sm sm:text-base">{priorityContent.nextStep}</p>
          </WorksheetPanel>
        )}

        {recommendedType && (
          <WorksheetPanel
            number={6}
            title="Recommended For Me"
            icon={SESSION_TYPE_DISPLAY[recommendedType].icon}
            className="border-gold-300 bg-gold-50"
          >
            <p className="text-lg font-bold text-legacy-700 sm:text-xl">
              {sessionLabelFor(recommendedType)}
            </p>
            {assessment.recommendationReason && (
              <p className="mt-2 text-sm">{assessment.recommendationReason}</p>
            )}
            <Button asChild size="lg" className="mt-4">
              <Link href="/sessions">View Available Sessions</Link>
            </Button>
          </WorksheetPanel>
        )}
      </WorksheetGrid>

      <WorksheetBanner businessName={assessment.business.name} />
    </WorksheetPage>
  );
}
