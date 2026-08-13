import { z } from "zod";

const genText = (max: number) => z.string().trim().min(1).max(max).nullable();
const genArray = (max: number, itemMax: number) =>
  z.array(z.string().trim().min(1).max(itemMax)).max(max).default([]);

/**
 * VISION BOARD GENERATION — OUTPUT SCHEMA (Vision Board & Blueprint
 * Generator, Phase 3: AI Blueprint Generator, audited 2026-08-13): "AI
 * may generate structured recommendations but must return validated
 * JSON; app places content into branded template... AI output that
 * fails schema validation must never reach the template unmodified."
 * This is that validator — the only gate between whatever a generator
 * (the AI, or the rules-based fallback in
 * src/lib/ai/vision-board-generation.ts) produces and a real
 * VisionBoardGeneration row.
 *
 * Deliberately its OWN, tighter-capped schema rather than reusing the
 * storage section schemas directly (src/lib/validations/vision-board-data.ts,
 * which allow up to 10-15 items and 600-1200 characters for a member's
 * own hand-typed content) — "limit every section so it fits the board":
 * a generated draft has to stay comfortably inside one Worksheet panel by
 * default, well short of the storage ceiling a member could still type
 * their way up to by hand.
 *
 * Every field is nullable/empty-array by default, not just optional:
 * the prompt explicitly tells the generator to return null/[] rather
 * than invent something when the real context doesn't support a
 * grounded answer, and this schema has to accept that honestly-empty
 * response as valid, not reject it.
 */
export const visionBoardGenerationOutputSchema = z.object({
  myStory: z.object({
    passionStatement: genText(400),
    superpowers: genArray(5, 60),
  }),
  myWhy: z.object({
    whyStatement: genText(400),
    problemToSolve: genText(300),
    peopleToHelp: genArray(5, 60),
  }),
  legacy: z.object({
    legacyStatement: genText(400),
    impactGroups: genArray(6, 60),
  }),
  actionPlan: z.object({
    thisWeek: genArray(3, 150),
    thisMonth: genArray(3, 150),
    firstStep: genText(150),
  }),
  affirmations: genArray(5, 150),
});

export type VisionBoardGenerationOutput = z.infer<typeof visionBoardGenerationOutputSchema>;

export const generateVisionBoardSchema = z.object({
  businessId: z.string().min(1),
});

/** Promote lets the member choose which drafted sections to accept — nothing is applied by default. */
export const promoteVisionBoardGenerationSchema = z.object({
  fields: z.array(z.enum(["myStory", "myWhy", "legacy", "actionPlan", "affirmations"])).min(1),
});
