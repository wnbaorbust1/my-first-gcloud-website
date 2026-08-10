import "server-only";

import { prisma } from "@/lib/prisma";
import type { Stage } from "@/lib/utils";

import { ASSESSMENT_VERSION } from "./questions";
import {
  computeCategoryScores,
  computeHealthScore,
  computeStageScores,
  determineRecommendation,
  type QuestionForScoring,
  type ScoringConfigShape,
} from "./scoring";
import { ensureAssessmentContentSeeded } from "./seed-content";

/**
 * Resume-or-start (spec: "Resume later"). Reuses the business's current
 * NOT_STARTED/IN_PROGRESS assessment if one exists; otherwise (no
 * assessment yet, or the most recent one is already COMPLETED) starts a
 * fresh one. Passing `forceNew` always starts fresh — the entry point for
 * a future "retake the assessment" action — which is safe because
 * completed assessments are never deleted (spec: "Allow future
 * reassessment without deleting historical scores").
 */
export async function getOrCreateActiveAssessment(
  businessId: string,
  opts: { forceNew?: boolean } = {},
) {
  await ensureAssessmentContentSeeded();

  if (!opts.forceNew) {
    const existing = await prisma.assessment.findFirst({
      where: { businessId, status: { in: ["NOT_STARTED", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return existing;
  }

  return prisma.assessment.create({
    data: { businessId, assessmentVersion: ASSESSMENT_VERSION },
  });
}

export async function getActiveScoringConfig(): Promise<ScoringConfigShape> {
  await ensureAssessmentContentSeeded();
  const config = await prisma.assessmentScoringConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!config) {
    throw new Error("No active AssessmentScoringConfig — seeding should have created one.");
  }
  return {
    stageThresholds: config.stageThresholds as unknown as Record<Stage, number>,
    stageWeights: config.stageWeights as unknown as Record<Stage, number>,
    excellenceThreshold: config.excellenceThreshold,
    statusBands: config.statusBands as unknown as ScoringConfigShape["statusBands"],
  };
}

/**
 * The unanswered *scored* questions blocking completion (spec doesn't
 * require every profile/context question to be answered — only ones
 * `includeInScoring` feeds into a score, per Task's non-negotiable "no
 * hard-coded fake results").
 */
export async function getMissingRequiredQuestions(assessmentId: string) {
  const [questions, responses] = await Promise.all([
    prisma.assessmentQuestion.findMany({
      where: { isActive: true, includeInScoring: true },
      select: { id: true, prompt: true, stage: true, category: true, order: true },
      orderBy: { order: "asc" },
    }),
    prisma.assessmentResponse.findMany({
      where: { assessmentId },
      select: { questionId: true },
    }),
  ]);
  const answered = new Set(responses.map((r) => r.questionId));
  return questions.filter((q) => !answered.has(q.id));
}

/**
 * Scores a completed assessment and persists everything (spec SAVE
 * RESULTS: business, date, responses, scores, recommended session,
 * assessment version). Idempotent-ish: re-running replaces this
 * assessment's score rows rather than duplicating them, but never
 * touches other Assessment rows — reassessment history stays intact.
 */
export async function completeAssessment(assessmentId: string) {
  const [assessment, questions, responses, config] = await Promise.all([
    prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId } }),
    prisma.assessmentQuestion.findMany({ where: { isActive: true } }),
    prisma.assessmentResponse.findMany({ where: { assessmentId } }),
    getActiveScoringConfig(),
  ]);

  const scoringQuestions: QuestionForScoring[] = questions.map((q) => ({
    id: q.id,
    stage: q.stage as Stage,
    category: q.category,
    questionType: q.questionType,
    includeInScoring: q.includeInScoring,
    weight: q.weight,
    minValue: q.minValue,
    maxValue: q.maxValue,
  }));

  const categoryScores = computeCategoryScores(
    scoringQuestions,
    responses.map((r) => ({ questionId: r.questionId, value: r.value })),
  );
  const stageScores = computeStageScores(categoryScores);
  const healthScore = computeHealthScore(stageScores, config.stageWeights);
  const recommendation = determineRecommendation(stageScores, categoryScores, config);

  await prisma.$transaction([
    prisma.assessmentScore.deleteMany({ where: { assessmentId } }),
    prisma.assessmentCategoryScore.deleteMany({ where: { assessmentId } }),
    prisma.assessmentScore.createMany({
      data: (Object.entries(stageScores) as [Stage, number | null][])
        .filter((entry): entry is [Stage, number] => entry[1] !== null)
        .map(([stage, scorePercent]) => ({ assessmentId, stage, scorePercent })),
    }),
    prisma.assessmentCategoryScore.createMany({
      data: categoryScores.map((c) => ({
        assessmentId,
        stage: c.stage,
        category: c.category,
        scorePercent: c.scorePercent,
      })),
    }),
    prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        healthScorePercent: healthScore,
        recommendedSessionType: recommendation.type,
        recommendationReason: recommendation.reason,
        assessmentVersion: assessment.assessmentVersion,
      },
    }),
  ]);

  return assessmentId;
}
