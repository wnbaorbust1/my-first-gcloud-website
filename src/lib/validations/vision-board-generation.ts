import { z } from "zod";

import {
  actionPlanSectionSchema,
  legacySectionSchema,
  myStorySectionSchema,
  myWhySectionSchema,
} from "@/lib/validations/vision-board-data";

/**
 * VISION BOARD GENERATION — OUTPUT SCHEMA (Vision Board & Blueprint
 * Generator, structured-storage follow-up, audited 2026-08-13): "AI may
 * generate structured recommendations but must return validated JSON;
 * app places content into branded template... AI output that fails
 * schema validation must never reach the template unmodified." This is
 * that validator — the only gate between whatever text the model
 * returns and a real VisionBoardGeneration row.
 *
 * Reuses the same section schemas `VisionBoardProfile` stores
 * (src/lib/validations/vision-board-data.ts) so a promoted draft is a
 * direct structural match, not a flatten/reshape — but only the
 * sub-fields that are genuinely draftable: `myStory.name`/`businesses`
 * are member-authored facts (who they are, what businesses they run),
 * never something an AI should invent, so the AI's `myStory` output is
 * narrower than the stored section (passionStatement + superpowers
 * only).
 */
export const visionBoardGenerationOutputSchema = z.object({
  myStory: myStorySectionSchema.pick({ passionStatement: true, superpowers: true }),
  myWhy: myWhySectionSchema,
  legacy: legacySectionSchema,
  actionPlan: actionPlanSectionSchema,
  affirmations: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
});

export type VisionBoardGenerationOutput = z.infer<typeof visionBoardGenerationOutputSchema>;

export const generateVisionBoardSchema = z.object({
  businessId: z.string().min(1),
});

/** Promote lets the member choose which drafted sections to accept — nothing is applied by default. */
export const promoteVisionBoardGenerationSchema = z.object({
  fields: z.array(z.enum(["myStory", "myWhy", "legacy", "actionPlan", "affirmations"])).min(1),
});
