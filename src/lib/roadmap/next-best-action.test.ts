import { describe, expect, it } from "vitest";

import {
  getLowestScoringStage,
  pickSmallerAlternative,
  rankNextBestActions,
  type EligibleTaskInput,
} from "./next-best-action";

const task = (overrides: Partial<EligibleTaskInput> & { id: string }): EligibleTaskInput => ({
  title: overrides.id,
  stage: "PASSION",
  category: null,
  priority: "SHOULD_DO",
  order: 0,
  estimatedMins: 20,
  facilitatorAdjusted: false,
  ...overrides,
});

describe("getLowestScoringStage", () => {
  it("returns the stage with the lowest score", () => {
    const stage = getLowestScoringStage([
      { stage: "PASSION", scorePercent: 80 },
      { stage: "POWER", scorePercent: 40 },
      { stage: "LEGACY", scorePercent: 60 },
    ]);
    expect(stage).toBe("POWER");
  });

  it("returns null with no scores", () => {
    expect(getLowestScoringStage([])).toBeNull();
  });
});

describe("rankNextBestActions", () => {
  it("ranks a facilitator-adjusted task first (tier 3), with a real reason", () => {
    const tasks = [
      task({ id: "a", priority: "MUST_DO" }),
      task({ id: "b", facilitatorAdjusted: true, priority: "BONUS" }),
    ];
    const [top] = rankNextBestActions(tasks, { activeGoalType: null, lowestScoringStage: null });
    expect(top.task.id).toBe("b");
    expect(top.tier).toBe(3);
    expect(top.reason).toMatch(/facilitator/i);
  });

  it("ranks a task matching the active goal's category above a generic one (tier 4)", () => {
    const tasks = [
      task({ id: "a", category: "Vision" }),
      task({ id: "b", category: "Pricing" }),
    ];
    const [top] = rankNextBestActions(tasks, { activeGoalType: "PROFIT", lowestScoringStage: null });
    expect(top.task.id).toBe("b");
    expect(top.tier).toBe(4);
  });

  it("ranks a task in the lowest-scoring assessment stage above others (tier 5)", () => {
    const tasks = [
      task({ id: "a", stage: "PASSION" }),
      task({ id: "b", stage: "POWER" }),
    ];
    const [top] = rankNextBestActions(tasks, { activeGoalType: null, lowestScoringStage: "POWER" });
    expect(top.task.id).toBe("b");
    expect(top.tier).toBe(5);
  });

  it("ranks a revenue-producing category above a non-revenue one (tier 6)", () => {
    const tasks = [
      task({ id: "a", category: "Team" }),
      task({ id: "b", category: "Lead Generation" }),
    ];
    const [top] = rankNextBestActions(tasks, { activeGoalType: null, lowestScoringStage: null });
    expect(top.task.id).toBe("b");
    expect(top.tier).toBe(6);
  });

  it("ranks a systems/efficiency category above a generic one (tier 7)", () => {
    const tasks = [
      task({ id: "a", category: "Partnerships" }),
      task({ id: "b", category: "SOPs" }),
    ];
    const [top] = rankNextBestActions(tasks, { activeGoalType: null, lowestScoringStage: null });
    expect(top.task.id).toBe("b");
    expect(top.tier).toBe(7);
  });

  it("falls back to tier 8 (long-term growth) when nothing else matches", () => {
    const [only] = rankNextBestActions([task({ id: "a", category: "Legacy Plan" })], {
      activeGoalType: null,
      lowestScoringStage: null,
    });
    expect(only.tier).toBe(8);
  });

  it("higher tiers always outrank lower ones regardless of priority/order", () => {
    // Tier 3 facilitator pick, even BONUS priority, beats a tier-8 MUST_DO.
    const tasks = [
      task({ id: "a", priority: "MUST_DO", order: 0, category: "Legacy Plan" }),
      task({ id: "b", priority: "BONUS", order: 5, facilitatorAdjusted: true }),
    ];
    const [top] = rankNextBestActions(tasks, { activeGoalType: null, lowestScoringStage: null });
    expect(top.task.id).toBe("b");
  });

  it("breaks ties within the same tier using priority, then order", () => {
    const tasks = [
      task({ id: "a", priority: "SHOULD_DO", order: 1 }),
      task({ id: "b", priority: "MUST_DO", order: 2 }),
      task({ id: "c", priority: "MUST_DO", order: 1 }),
    ];
    const ranked = rankNextBestActions(tasks, { activeGoalType: null, lowestScoringStage: null });
    expect(ranked.map((r) => r.task.id)).toEqual(["c", "b", "a"]);
  });
});

describe("pickSmallerAlternative", () => {
  it("picks the smallest-time remaining candidate below the current task's estimate", () => {
    const ranked = rankNextBestActions(
      [
        task({ id: "current", estimatedMins: 30 }),
        task({ id: "big", estimatedMins: 25 }),
        task({ id: "small", estimatedMins: 5 }),
      ],
      { activeGoalType: null, lowestScoringStage: null },
    );
    const alt = pickSmallerAlternative(ranked, "current");
    expect(alt?.task.id).toBe("small");
  });

  it("falls back to the next-ranked candidate when nothing is smaller", () => {
    const ranked = rankNextBestActions(
      [task({ id: "current", estimatedMins: 5, order: 0 }), task({ id: "only-other", estimatedMins: 30, order: 1 })],
      { activeGoalType: null, lowestScoringStage: null },
    );
    const alt = pickSmallerAlternative(ranked, "current");
    expect(alt?.task.id).toBe("only-other");
  });

  it("returns null when there are no other candidates", () => {
    const ranked = rankNextBestActions([task({ id: "only" })], {
      activeGoalType: null,
      lowestScoringStage: null,
    });
    expect(pickSmallerAlternative(ranked, "only")).toBeNull();
  });
});
