import { describe, expect, it } from "vitest";

import type { Mood } from "@/generated/prisma/enums";

import { getAdaptiveResponse } from "./mood";

const ALL_MOODS: Mood[] = [
  "FOCUSED",
  "CONFIDENT",
  "EXCITED",
  "OVERWHELMED",
  "CONFUSED",
  "DISCOURAGED",
  "TIRED",
  "STUCK",
  "READY_TO_WORK",
  "NEED_SMALLER_STEP",
];

describe("getAdaptiveResponse", () => {
  it("has a real, non-generic response for every one of the 10 spec mood choices", () => {
    for (const mood of ALL_MOODS) {
      const response = getAdaptiveResponse(mood);
      expect(response.message.length).toBeGreaterThan(10);
    }
  });

  it("reduces to a Quick Step when overwhelmed (spec §7 adaptive rule)", () => {
    const response = getAdaptiveResponse("OVERWHELMED");
    expect(response.suggestion?.href).toBe("/build");
    expect(response.message.toLowerCase()).toContain("small");
  });

  it("offers to break the task down when stuck", () => {
    const response = getAdaptiveResponse("STUCK");
    expect(response.suggestion?.label.toLowerCase()).toContain("smaller");
  });

  it("points to real progress evidence when discouraged", () => {
    const response = getAdaptiveResponse("DISCOURAGED");
    expect(response.suggestion?.href).toBe("/progress");
  });
});
