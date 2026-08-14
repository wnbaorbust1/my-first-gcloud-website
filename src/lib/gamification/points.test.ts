import { describe, expect, it } from "vitest";

import { computeStreakTransition, getLevel, LEVELS, type StreakInput } from "./points";

describe("getLevel", () => {
  it("starts at Dreamer with 0 points", () => {
    const level = getLevel(0);
    expect(level.name).toBe("Dreamer");
    expect(level.index).toBe(0);
    expect(level.pointsToNextLevel).toBe(LEVELS[1].threshold);
    expect(level.nextLevelName).toBe("Discoverer");
  });

  it("picks the highest threshold at or below the total", () => {
    expect(getLevel(99).name).toBe("Dreamer");
    expect(getLevel(100).name).toBe("Discoverer");
    expect(getLevel(599).name).toBe("Vision Builder");
    expect(getLevel(600).name).toBe("Business Builder");
  });

  it("has no next level once the top level is reached", () => {
    const top = getLevel(LEVELS[LEVELS.length - 1].threshold);
    expect(top.name).toBe("Blueprint Mentor");
    expect(top.pointsToNextLevel).toBeNull();
    expect(top.nextLevelName).toBeNull();
  });

  it("stays at the top level past its threshold", () => {
    expect(getLevel(999_999).name).toBe("Blueprint Mentor");
  });
});

const baseStreak: StreakInput = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  graceDaysUsed: 0,
  graceDaysResetAt: null,
};

describe("computeStreakTransition", () => {
  it("starts a new streak at 1 on first activity", () => {
    const result = computeStreakTransition(baseStreak, new Date("2026-01-01T12:00:00Z"));
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.changed).toBe(true);
  });

  it("is idempotent for a second activity the same UTC day", () => {
    const day1 = computeStreakTransition(baseStreak, new Date("2026-01-01T08:00:00Z"));
    const sameDay = computeStreakTransition(day1, new Date("2026-01-01T22:00:00Z"));
    expect(sameDay.changed).toBe(false);
    expect(sameDay.currentStreak).toBe(1);
  });

  it("increments on a consecutive day", () => {
    const day1 = computeStreakTransition(baseStreak, new Date("2026-01-01T12:00:00Z"));
    const day2 = computeStreakTransition(day1, new Date("2026-01-02T12:00:00Z"));
    expect(day2.currentStreak).toBe(2);
    expect(day2.longestStreak).toBe(2);
  });

  it("survives a single missed day using a grace day", () => {
    const day1 = computeStreakTransition(baseStreak, new Date("2026-01-01T12:00:00Z"));
    // Day 2 skipped entirely.
    const day3 = computeStreakTransition(day1, new Date("2026-01-03T12:00:00Z"));
    expect(day3.currentStreak).toBe(2);
    expect(day3.graceDaysUsed).toBe(1);
  });

  it("resets once the grace budget (2/month) is exhausted", () => {
    let state = computeStreakTransition(baseStreak, new Date("2026-01-01T12:00:00Z"));
    state = computeStreakTransition(state, new Date("2026-01-03T12:00:00Z")); // 1 grace day used, streak=2
    state = computeStreakTransition(state, new Date("2026-01-05T12:00:00Z")); // 1 more grace day used (total 2), streak=3
    expect(state.graceDaysUsed).toBe(2);
    // A third missed-day gap would need a 3rd grace day — budget exhausted, streak resets.
    const broken = computeStreakTransition(state, new Date("2026-01-08T12:00:00Z"));
    expect(broken.currentStreak).toBe(1);
  });

  it("never erases longestStreak on a reset", () => {
    let state = computeStreakTransition(baseStreak, new Date("2026-01-01T12:00:00Z"));
    state = computeStreakTransition(state, new Date("2026-01-02T12:00:00Z"));
    state = computeStreakTransition(state, new Date("2026-01-03T12:00:00Z"));
    expect(state.longestStreak).toBe(3);
    // A big gap with no grace budget left resets current, but longest survives.
    const broken = computeStreakTransition(
      { ...state, graceDaysUsed: 2, graceDaysResetAt: new Date("2026-01-03T12:00:00Z") },
      new Date("2026-01-10T12:00:00Z"),
    );
    expect(broken.currentStreak).toBe(1);
    expect(broken.longestStreak).toBe(3);
  });
});
