import { z } from "zod";

import {
  accountabilitySectionSchema,
  actionPlanSectionSchema,
  blueprintSectionSchema,
  businessModelCanvasSectionSchema,
  legacySectionSchema,
  myStorySectionSchema,
  myWhySectionSchema,
  resourcesSectionSchema,
} from "@/lib/validations/vision-board-data";

const stringArray = (max: number, itemMax: number) =>
  z.array(z.string().trim().min(1).max(itemMax)).max(max).optional();

/**
 * VISION BOARD PROFILE — PATCH input. One PATCH updates whichever
 * *sections* are present (each a whole structured object/array, not a
 * per-leaf-field partial) — a section omitted entirely is left exactly
 * as it was; a section present replaces that section's stored JSON in
 * full, since the form always submits a section as one complete object.
 */
export const visionBoardProfileSchema = z.object({
  businessId: z.string().min(1),
  myStory: myStorySectionSchema.optional(),
  myWhy: myWhySectionSchema.optional(),
  legacy: legacySectionSchema.optional(),
  blueprint: blueprintSectionSchema.optional(),
  actionPlan: actionPlanSectionSchema.optional(),
  resources: resourcesSectionSchema.optional(),
  businessModelCanvas: businessModelCanvasSectionSchema.optional(),
  vibes: stringArray(15, 60),
  affirmations: stringArray(10, 200),
  accountability: accountabilitySectionSchema.optional(),
});

export type VisionBoardProfileInput = z.infer<typeof visionBoardProfileSchema>;
