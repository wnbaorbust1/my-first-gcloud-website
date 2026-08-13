import { z } from "zod";

/**
 * VISION BOARD GENERATION — OUTPUT SCHEMA (Vision Board & Blueprint
 * Generator, audited 2026-08-13): "AI may generate structured
 * recommendations but must return validated JSON; app places content
 * into branded template... AI output that fails schema validation must
 * never reach the template unmodified." This is that validator — the
 * only gate between whatever text the model returns and a real
 * VisionBoardGeneration row.
 *
 * Every field is nullable, not just optional: the prompt explicitly
 * tells the model to return null rather than invent something when the
 * real context below doesn't support a grounded answer, and this schema
 * has to accept that honestly-empty response as valid, not reject it.
 */
export const visionBoardGenerationOutputSchema = z.object({
  myStory: z.string().trim().min(1).max(1200).nullable(),
  myWhy: z.string().trim().min(1).max(1200).nullable(),
  legacyImpact: z.string().trim().min(1).max(1200).nullable(),
  actionPlanThisWeek: z.string().trim().min(1).max(800).nullable(),
  actionPlanThisMonth: z.string().trim().min(1).max(800).nullable(),
  dailyAffirmations: z.array(z.string().trim().min(1).max(200)).max(7).nullable(),
});

export type VisionBoardGenerationOutput = z.infer<typeof visionBoardGenerationOutputSchema>;

export const generateVisionBoardSchema = z.object({
  businessId: z.string().min(1),
});

/** Promote lets the member choose which drafted fields to accept — nothing is applied by default. */
export const promoteVisionBoardGenerationSchema = z.object({
  fields: z
    .array(z.enum(["myStory", "myWhy", "legacyImpact", "actionPlanThisWeek", "actionPlanThisMonth", "dailyAffirmations"]))
    .min(1),
});
