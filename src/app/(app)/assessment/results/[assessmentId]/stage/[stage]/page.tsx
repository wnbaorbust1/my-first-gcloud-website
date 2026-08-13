import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CATEGORY_CONTENT } from "@/lib/assessment/seed-content";
import { getActiveScoringConfig } from "@/lib/assessment/session";
import { statusLabelForScore } from "@/lib/assessment/scoring";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, requireUser } from "@/lib/session";
import { STAGE_META, STAGES, type Stage } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}): Promise<Metadata> {
  const { stage } = await params;
  return { title: `${stage} Score Detail — Blueprint` };
}

function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export default async function StageScoreDetailPage({
  params,
}: {
  params: Promise<{ assessmentId: string; stage: string }>;
}) {
  const { assessmentId, stage: stageParam } = await params;
  if (!isStage(stageParam)) notFound();
  const stage = stageParam;

  const user = await requireUser();

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      categoryScores: { where: { stage } },
      scores: { where: { stage } },
    },
  });
  if (!assessment) notFound();

  const allowed = await assertBusinessAccess(user.id, user.role, assessment.businessId);
  if (!allowed) notFound();
  if (assessment.status !== "COMPLETED") redirect("/assessment");

  const config = await getActiveScoringConfig();
  const stageMeta = STAGE_META[stage];
  const stageScore = assessment.scores[0]?.scorePercent ?? null;
  const categories = [...assessment.categoryScores].sort((a, b) => a.scorePercent - b.scorePercent);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/assessment/results/${assessmentId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to results
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">
          {stageMeta.icon}
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">
            {stageMeta.label} Score Detail
          </h1>
          {stageScore !== null && (
            <p className="text-sm text-foreground-muted">
              Overall {stageMeta.label} score: {stageScore}% ·{" "}
              {statusLabelForScore(stageScore, config.statusBands)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {categories.map((c) => {
          const content = CATEGORY_CONTENT[c.category];
          const status = statusLabelForScore(c.scorePercent, config.statusBands);
          return (
            <Card key={c.category}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-navy-900">{c.category}</h2>
                <span className="text-sm font-semibold tabular-nums text-navy-700">
                  {c.scorePercent}%
                </span>
              </div>
              <ProgressBar value={c.scorePercent} stage={stage} className="mt-2" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                {status}
              </p>
              {content && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Why It Matters
                    </p>
                    <p className="mt-1 text-sm text-foreground-muted">{content.whyItMatters}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                      Recommended Next Step
                    </p>
                    <p className="mt-1 text-sm text-foreground-muted">{content.nextStep}</p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
