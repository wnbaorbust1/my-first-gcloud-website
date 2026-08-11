import { describe, expect, it } from "vitest";

import {
  computeHealthScore,
  computeStageScores,
  determineRecommendation,
  normalizeResponseValue,
  type QuestionForScoring,
} from "./scoring";
import { DEFAULT_STAGE_THRESHOLDS, DEFAULT_EXCELLENCE_THRESHOLD, DEFAULT_STAGE_WEIGHTS } from "./scoring-config";

/**
 * Regression coverage for the audit's hand-verified scoring/recommendation
 * math (Phase 13-15 of the Ultra Pre-Publish Audit) — turns a one-time
 * manual trace into a permanent test.
 */
function scaleQuestion(overrides: Partial<QuestionForScoring> = {}): QuestionForScoring {
  return {
    id: "q1",
    stage: "PASSION",
    category: "General",
    questionType: "SCALE_1_5",
    includeInScoring: true,
    weight: 1,
    minValue: null,
    maxValue: null,
    ...overrides,
  };
}

describe("normalizeResponseValue", () => {
  it("maps SCALE_1_5 1..5 onto 0..100 linearly", () => {
    const q = scaleQuestion();
    expect(normalizeResponseValue(q, 1)).toBe(0);
    expect(normalizeResponseValue(q, 3)).toBe(50);
    expect(normalizeResponseValue(q, 5)).toBe(100);
  });

  it("maps YES_NO to 100/0", () => {
    const q = scaleQuestion({ questionType: "YES_NO" });
    expect(normalizeResponseValue(q, true)).toBe(100);
    expect(normalizeResponseValue(q, false)).toBe(0);
  });

  it("returns null when includeInScoring is false, regardless of type", () => {
    const q = scaleQuestion({ includeInScoring: false });
    expect(normalizeResponseValue(q, 5)).toBeNull();
  });

  it("returns null for unsupported types even if includeInScoring is true", () => {
    const q = scaleQuestion({ questionType: "SHORT_ANSWER" });
    expect(normalizeResponseValue(q, "some text")).toBeNull();
  });

  it("scales NUMBER questions by min/max, and guards divide-by-zero", () => {
    const q = scaleQuestion({ questionType: "NUMBER", minValue: 0, maxValue: 50 });
    expect(normalizeResponseValue(q, 25)).toBe(50);
    const degenerate = scaleQuestion({ questionType: "NUMBER", minValue: 10, maxValue: 10 });
    expect(normalizeResponseValue(degenerate, 10)).toBeNull();
  });
});

describe("computeStageScores", () => {
  it("averages category scores within each stage, independently per stage", () => {
    const result = computeStageScores([
      { stage: "PASSION", category: "A", scorePercent: 40 },
      { stage: "PASSION", category: "B", scorePercent: 60 },
      { stage: "POWER", category: "C", scorePercent: 90 },
    ]);
    expect(result.PASSION).toBe(50);
    expect(result.POWER).toBe(90);
    expect(result.LEGACY).toBeNull();
  });
});

describe("computeHealthScore", () => {
  it("weights stage scores and ignores stages with no score", () => {
    const health = computeHealthScore(
      { PASSION: 40, POWER: 80, LEGACY: null },
      DEFAULT_STAGE_WEIGHTS,
    );
    expect(health).toBe(60); // (40 + 80) / 2 with equal weights, LEGACY excluded
  });

  it("returns null when every stage is null", () => {
    expect(computeHealthScore({ PASSION: null, POWER: null, LEGACY: null }, DEFAULT_STAGE_WEIGHTS)).toBeNull();
  });
});

const config = {
  stageThresholds: DEFAULT_STAGE_THRESHOLDS,
  stageWeights: DEFAULT_STAGE_WEIGHTS,
  excellenceThreshold: DEFAULT_EXCELLENCE_THRESHOLD,
  statusBands: [],
};

describe("determineRecommendation — progressive gate", () => {
  it("Scenario A: Passion 40 / Power 70 / Legacy 80 -> PASSION", () => {
    const r = determineRecommendation({ PASSION: 40, POWER: 70, LEGACY: 80 }, [], config);
    expect(r.type).toBe("PASSION");
  });

  it("Scenario B: Passion 80 / Power 42 / Legacy 70 -> POWER", () => {
    const r = determineRecommendation({ PASSION: 80, POWER: 42, LEGACY: 70 }, [], config);
    expect(r.type).toBe("POWER");
  });

  it("Scenario C: Passion 82 / Power 77 / Legacy 40 -> LEGACY", () => {
    const r = determineRecommendation({ PASSION: 82, POWER: 77, LEGACY: 40 }, [], config);
    expect(r.type).toBe("LEGACY");
  });

  it("Scenario D: Passion 85 / Power 82 / Legacy 81 -> weakest-of-three (LEGACY), not GROWTH", () => {
    const r = determineRecommendation({ PASSION: 85, POWER: 82, LEGACY: 81 }, [], config);
    expect(r.type).toBe("LEGACY");
  });

  it("all three stages excellent (>= 85) -> GROWTH", () => {
    const r = determineRecommendation({ PASSION: 90, POWER: 88, LEGACY: 85 }, [], config);
    expect(r.type).toBe("GROWTH");
  });

  // Isolates the PASSION gate itself (not the "weakest of three" fallback
  // branch, which can independently re-recommend PASSION at 65+ if it's
  // still the weakest non-excellent stage — that's correct, separate
  // behavior, covered by the Scenario D case above). POWER is set low
  // enough to be the *next* branch hit the moment PASSION's own gate is
  // cleared, so which stage comes back proves exactly where the gate sits.
  it("threshold boundary: 64 fails the PASSION gate -> PASSION", () => {
    const r = determineRecommendation({ PASSION: 64, POWER: 40, LEGACY: 90 }, [], config);
    expect(r.type).toBe("PASSION");
  });

  it("threshold boundary: exactly 65 clears the PASSION gate -> falls through to POWER", () => {
    const r = determineRecommendation({ PASSION: 65, POWER: 40, LEGACY: 90 }, [], config);
    expect(r.type).toBe("POWER");
  });

  it("threshold boundary: 66 clearly clears the PASSION gate -> falls through to POWER", () => {
    const r = determineRecommendation({ PASSION: 66, POWER: 40, LEGACY: 90 }, [], config);
    expect(r.type).toBe("POWER");
  });
});
