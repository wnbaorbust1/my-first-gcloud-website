import "server-only";

import { prisma } from "@/lib/prisma";

import { CATEGORY_CONTENT } from "./category-content";
import { QUESTION_BANK } from "./questions";
import {
  DEFAULT_EXCELLENCE_THRESHOLD,
  DEFAULT_STAGE_THRESHOLDS,
  DEFAULT_STAGE_WEIGHTS,
  DEFAULT_STATUS_BANDS,
} from "./scoring-config";

/**
 * Idempotently seeds the assessment question bank and default scoring
 * config the first time they're needed, instead of requiring a separate
 * `npm run seed` step before the app works. Cheap existence checks make
 * repeat calls a no-op — safe to call from every "start assessment"
 * request.
 */
export async function ensureAssessmentContentSeeded(): Promise<void> {
  const [questionCount, activeConfig] = await Promise.all([
    prisma.assessmentQuestion.count(),
    prisma.assessmentScoringConfig.findFirst({ where: { isActive: true } }),
  ]);

  if (questionCount === 0) {
    await prisma.assessmentQuestion.createMany({
      data: QUESTION_BANK.map((q) => ({
        stage: q.stage,
        category: q.category,
        questionType: q.questionType,
        order: q.order,
        prompt: q.prompt,
        helperText: q.helperText,
        options: q.options as never,
        minValue: q.minValue,
        maxValue: q.maxValue,
        weight: q.weight ?? 1,
        includeInScoring: q.includeInScoring ?? true,
      })),
    });
  }

  if (!activeConfig) {
    await prisma.assessmentScoringConfig.create({
      data: {
        isActive: true,
        version: "v1",
        stageThresholds: DEFAULT_STAGE_THRESHOLDS as never,
        stageWeights: DEFAULT_STAGE_WEIGHTS as never,
        excellenceThreshold: DEFAULT_EXCELLENCE_THRESHOLD,
        statusBands: DEFAULT_STATUS_BANDS as never,
      },
    });
  }
}

/** Re-exported so callers of seed-content don't also need to import category-content directly. */
export { CATEGORY_CONTENT };
