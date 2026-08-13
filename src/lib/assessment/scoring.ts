import type { QuestionType, RecommendedSessionType } from "@/generated/prisma/enums";
import { STAGE_META, STAGES, type Stage } from "@/lib/utils";

import type { StatusBand } from "./scoring-config";

export interface ScoringConfigShape {
  stageThresholds: Record<Stage, number>;
  stageWeights: Record<Stage, number>;
  excellenceThreshold: number;
  statusBands: StatusBand[];
}

export interface QuestionForScoring {
  id: string;
  stage: Stage;
  category: string;
  questionType: QuestionType;
  includeInScoring: boolean;
  weight: number;
  minValue: number | null;
  maxValue: number | null;
}

export interface CategoryScoreResult {
  stage: Stage;
  category: string;
  scorePercent: number;
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/**
 * Normalizes one answer to a 0–100 contribution, or null if this question
 * type/config isn't scorable. SCALE_1_5 and YES_NO are the two types the
 * v1 question bank actually scores; NUMBER is supported generically (for
 * a future admin-added scored range question) but SINGLE_CHOICE /
 * MULTIPLE_CHOICE / SHORT_ANSWER have no defined numeric mapping and are
 * always excluded, even if includeInScoring is left true.
 */
export function normalizeResponseValue(
  question: QuestionForScoring,
  value: unknown,
): number | null {
  if (!question.includeInScoring) return null;

  switch (question.questionType) {
    case "SCALE_1_5": {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n)) return null;
      return clamp(((n - 1) / 4) * 100);
    }
    case "YES_NO": {
      if (typeof value !== "boolean") return null;
      return value ? 100 : 0;
    }
    case "NUMBER": {
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n)) return null;
      const min = question.minValue ?? 0;
      const max = question.maxValue ?? 100;
      if (max === min) return null;
      return clamp(((n - min) / (max - min)) * 100);
    }
    default:
      return null;
  }
}

interface ResponseInput {
  questionId: string;
  value: unknown;
}

/** One category average per (stage, category) that has at least one scorable, answered question. */
export function computeCategoryScores(
  questions: QuestionForScoring[],
  responses: ResponseInput[],
): CategoryScoreResult[] {
  const valueByQuestionId = new Map(responses.map((r) => [r.questionId, r.value]));

  const groups = new Map<
    string,
    { stage: Stage; category: string; weightedSum: number; weightTotal: number }
  >();

  for (const question of questions) {
    const raw = valueByQuestionId.get(question.id);
    if (raw === undefined) continue;
    const normalized = normalizeResponseValue(question, raw);
    if (normalized === null) continue;

    const key = `${question.stage}::${question.category}`;
    const group =
      groups.get(key) ??
      { stage: question.stage, category: question.category, weightedSum: 0, weightTotal: 0 };
    group.weightedSum += normalized * question.weight;
    group.weightTotal += question.weight;
    groups.set(key, group);
  }

  return Array.from(groups.values()).map((g) => ({
    stage: g.stage,
    category: g.category,
    scorePercent: Math.round(g.weightedSum / g.weightTotal),
  }));
}

/** Stage score = the (unweighted) average of that stage's category averages. */
export function computeStageScores(
  categoryScores: CategoryScoreResult[],
): Record<Stage, number | null> {
  const result: Record<Stage, number | null> = {
    PASSION: null,
    POWER: null,
    LEGACY: null,
  };

  for (const stage of STAGES) {
    const inStage = categoryScores.filter((c) => c.stage === stage);
    if (inStage.length === 0) continue;
    const avg = inStage.reduce((sum, c) => sum + c.scorePercent, 0) / inStage.length;
    result[stage] = Math.round(avg);
  }

  return result;
}

export function computeHealthScore(
  stageScores: Record<Stage, number | null>,
  stageWeights: Record<Stage, number>,
): number | null {
  const entries = STAGES.map((s) => ({ score: stageScores[s], weight: stageWeights[s] ?? 1 })).filter(
    (e): e is { score: number; weight: number } => e.score !== null,
  );
  if (entries.length === 0) return null;
  const weightedSum = entries.reduce((sum, e) => sum + e.score * e.weight, 0);
  const weightTotal = entries.reduce((sum, e) => sum + e.weight, 0);
  return Math.round(weightedSum / weightTotal);
}

export function statusLabelForScore(score: number, bands: StatusBand[]): string {
  const band = bands.find((b) => score >= b.min && score <= b.max);
  return band?.label ?? "Developing";
}

export interface RecommendationResult {
  type: RecommendedSessionType;
  reason: string;
}

/**
 * Session matching (spec): progressive, not "lowest score wins" — a
 * business with weak Passion needs Passion work first even if Power is
 * technically lower. Only once Passion and Power both clear their
 * threshold does Legacy come into play; only once all three clear it do
 * we look for "the most strategic growth opportunity" (the weakest of the
 * three, unless all three are genuinely excellent, in which case it's a
 * general Growth/Legacy session). Thresholds live in
 * AssessmentScoringConfig, not here, so they're admin-tunable later.
 */
export function determineRecommendation(
  stageScores: Record<Stage, number | null>,
  categoryScores: CategoryScoreResult[],
  config: ScoringConfigShape,
): RecommendationResult {
  const passion = stageScores.PASSION ?? 0;
  const power = stageScores.POWER ?? 0;
  const legacy = stageScores.LEGACY ?? 0;

  let type: RecommendedSessionType;
  if (passion < config.stageThresholds.PASSION) {
    type = "PASSION";
  } else if (power < config.stageThresholds.POWER) {
    type = "POWER";
  } else if (legacy < config.stageThresholds.LEGACY) {
    type = "LEGACY";
  } else {
    const weakest = ([
      { stage: "PASSION" as Stage, score: passion },
      { stage: "POWER" as Stage, score: power },
      { stage: "LEGACY" as Stage, score: legacy },
    ]).sort((a, b) => a.score - b.score)[0];

    type = weakest.score < config.excellenceThreshold ? weakest.stage : "GROWTH";
  }

  const reason = buildRecommendationReason(type, categoryScores);
  return { type, reason };
}

const SESSION_LABEL: Record<RecommendedSessionType, string> = {
  PASSION: "Blueprint Passion Session",
  POWER: "Blueprint Power Session",
  LEGACY: "Blueprint Legacy Session",
  GROWTH: "Blueprint Growth Session",
};

export function sessionLabelFor(type: RecommendedSessionType): string {
  return SESSION_LABEL[type];
}

function topCategoriesByStage(
  categoryScores: CategoryScoreResult[],
  stage: Stage,
  n: number,
  direction: "top" | "bottom",
) {
  const inStage = categoryScores.filter((c) => c.stage === stage);
  const sorted = [...inStage].sort((a, b) =>
    direction === "top" ? b.scorePercent - a.scorePercent : a.scorePercent - b.scorePercent,
  );
  return sorted.slice(0, n);
}

/** Composes the "Why This Session Was Recommended" sentence (spec example style). */
function buildRecommendationReason(
  type: RecommendedSessionType,
  categoryScores: CategoryScoreResult[],
): string {
  const focusStage: Stage = type === "GROWTH" ? "LEGACY" : type;
  const strengths = [...categoryScores].sort((a, b) => b.scorePercent - a.scorePercent).slice(0, 2);
  const weakInFocus = topCategoriesByStage(categoryScores, focusStage, 2, "bottom");

  const strengthPhrase = strengths.length
    ? `Your ${strengths.map((s) => s.category.toLowerCase()).join(" and ")} are strong.`
    : "";
  const focusLabel = STAGE_META[focusStage].label;
  const opportunityPhrase = weakInFocus.length
    ? `Your next opportunity is building out ${weakInFocus
        .map((c) => c.category.toLowerCase())
        .join(" and ")} — the core of the ${focusLabel} stage.`
    : `Your next opportunity is deepening the ${focusLabel} stage.`;

  if (type === "GROWTH") {
    return `${strengthPhrase} All three Blueprint stages are in strong shape — this session focuses on compounding that strength into long-term growth and legacy.`.trim();
  }

  return `${strengthPhrase} ${opportunityPhrase}`.trim();
}

export interface CategoryHighlight {
  stage: Stage;
  category: string;
  scorePercent: number;
}

/** Top/bottom 3 categories across all stages, for the Results page. */
export function topStrengthsAndPriorities(categoryScores: CategoryScoreResult[]) {
  const sorted = [...categoryScores].sort((a, b) => b.scorePercent - a.scorePercent);
  return {
    strengths: sorted.slice(0, 3),
    priorities: [...sorted].reverse().slice(0, 3),
  };
}
