import type { Metadata } from "next";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ensureAssessmentContentSeeded } from "@/lib/assessment/seed-content";
import { prisma } from "@/lib/prisma";
import { STAGES, type Stage } from "@/lib/utils";

import { QuestionRow } from "./question-row";
import { ScoringThresholdsForm } from "./scoring-thresholds-form";

export const metadata: Metadata = { title: "Manage Assessments — Blueprint Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAssessmentsPage() {
  await ensureAssessmentContentSeeded();

  const [questions, config] = await Promise.all([
    prisma.assessmentQuestion.findMany({ orderBy: [{ stage: "asc" }, { order: "asc" }] }),
    prisma.assessmentScoringConfig.findFirst({ where: { isActive: true } }),
  ]);

  const stageThresholds = (config?.stageThresholds ?? { PASSION: 65, POWER: 65, LEGACY: 65 }) as Record<
    Stage,
    number
  >;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Assessments</h1>
        <p className="text-sm text-foreground-muted">
          {questions.length} question{questions.length === 1 ? "" : "s"} across the 3 stages.
        </p>
      </div>

      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Scoring Thresholds</CardTitle>
          </CardHeader>
          <ScoringThresholdsForm
            configId={config.id}
            stageThresholds={stageThresholds}
            excellenceThreshold={config.excellenceThreshold}
          />
        </Card>
      )}

      {STAGES.map((stage) => (
        <Card key={stage}>
          <CardHeader>
            <CardTitle>{stage.charAt(0) + stage.slice(1).toLowerCase()} Questions</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-2">
            {questions
              .filter((q) => q.stage === stage)
              .map((q) => (
                <QuestionRow
                  key={q.id}
                  id={q.id}
                  prompt={q.prompt}
                  category={q.category}
                  weight={q.weight}
                  isActive={q.isActive}
                />
              ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
