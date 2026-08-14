import { describe, expect, it } from "vitest";

import { CURRICULUM_WEEKS } from "./curriculum-weeks";

/**
 * CONTENT INTEGRITY — catches the kind of copy/paste mistake that's easy
 * to make across 13 weeks x 5 actions (duplicate day numbers, a missing
 * week, empty required fields) without a human re-reading every row.
 */
describe("CURRICULUM_WEEKS", () => {
  it("has exactly the 13 weeks of the Passion sprint, in order, numbered 1-13", () => {
    expect(CURRICULUM_WEEKS).toHaveLength(13);
    CURRICULUM_WEEKS.forEach((week, i) => {
      expect(week.weekNumber).toBe(i + 1);
      expect(week.stage).toBe("PASSION");
    });
  });

  it("every week has exactly 5 daily actions, numbered 1-5 with no duplicates", () => {
    for (const week of CURRICULUM_WEEKS) {
      expect(week.actions).toHaveLength(5);
      const dayNumbers = week.actions.map((a) => a.dayNumber).sort();
      expect(dayNumbers).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("every week has non-empty content in every required field", () => {
    for (const week of CURRICULUM_WEEKS) {
      expect(week.topic.trim().length).toBeGreaterThan(0);
      expect(week.requiredAsset.trim().length).toBeGreaterThan(0);
      expect(week.lesson.trim().length).toBeGreaterThan(0);
      expect(week.whyItMatters.trim().length).toBeGreaterThan(0);
      expect(week.completedExample.trim().length).toBeGreaterThan(0);
      expect(week.weeklyReviewPrompt.trim().length).toBeGreaterThan(0);
      for (const action of week.actions) {
        expect(action.title.trim().length).toBeGreaterThan(0);
        expect(action.description.trim().length).toBeGreaterThan(0);
        expect(["QUICK", "STANDARD", "POWER"]).toContain(action.size);
      }
    }
  });

  it("has no duplicate topics or required assets across weeks", () => {
    const topics = CURRICULUM_WEEKS.map((w) => w.topic);
    const assets = CURRICULUM_WEEKS.map((w) => w.requiredAsset);
    expect(new Set(topics).size).toBe(topics.length);
    expect(new Set(assets).size).toBe(assets.length);
  });
});
