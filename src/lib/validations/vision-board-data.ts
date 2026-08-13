import { z } from "zod";

/**
 * UNIFIED VISION BOARD DATA SHAPE — the single structured-JSON schema
 * shared by three call sites, so "the board" is one consistent type
 * everywhere instead of three drifting ones:
 *
 *  1. `VisionBoardProfile`'s per-section Json columns (member-edited —
 *     myStory, myWhy, legacy, blueprint, actionPlan, resources,
 *     businessModelCanvas, vibes, affirmations, accountability).
 *  2. `VisionBoardGeneration.payload` (AI-drafted — a subset of the same
 *     section shapes; see src/lib/ai/vision-board-generation.ts).
 *  3. The assembled board `getVisionBoardExport()` returns for both the
 *     rendered `/my-blueprint/vision-board/view` page and the GPT
 *     export API — passionAssessment, bigGoals, and ninetyDayGoalTracker
 *     are NOT stored anywhere as JSON (they're computed fresh from
 *     Assessment/Goal every time, per this app's "never fabricate /
 *     never duplicate a source of truth" convention) but are shaped into
 *     these same nested types so the whole board is one type end to end.
 *
 * Every string is nullable and every array defaults to `[]` — "store the
 * generated board information as structured data, not one large
 * paragraph," and a section nobody has filled in yet is an honest empty
 * structure, never invented content.
 */

const shortText = (max: number) => z.string().trim().min(1).max(max);
const arrayOf = (max: number, itemMax: number) => z.array(shortText(itemMax)).max(max).default([]);

export const myStorySectionSchema = z.object({
  name: shortText(200).nullable().default(null),
  businesses: arrayOf(10, 200),
  passionStatement: shortText(600).nullable().default(null),
  superpowers: arrayOf(10, 120),
});
export type MyStorySection = z.infer<typeof myStorySectionSchema>;

export const myWhySectionSchema = z.object({
  whyStatement: shortText(600).nullable().default(null),
  problemToSolve: shortText(600).nullable().default(null),
  peopleToHelp: arrayOf(10, 120),
});
export type MyWhySection = z.infer<typeof myWhySectionSchema>;

export const legacySectionSchema = z.object({
  legacyStatement: shortText(600).nullable().default(null),
  impactGroups: arrayOf(10, 60),
});
export type LegacySection = z.infer<typeof legacySectionSchema>;

const ninetyDayPlanItemSchema = z.object({
  goal: shortText(200),
  actionSteps: arrayOf(10, 200),
});
export type NinetyDayPlanItem = z.infer<typeof ninetyDayPlanItemSchema>;

export const blueprintSectionSchema = z.object({
  priorities: arrayOf(10, 200),
  next90Days: z.array(ninetyDayPlanItemSchema).max(10).default([]),
});
export type BlueprintSection = z.infer<typeof blueprintSectionSchema>;

export const actionPlanSectionSchema = z.object({
  thisWeek: arrayOf(10, 200),
  thisMonth: arrayOf(10, 200),
  firstStep: shortText(200).nullable().default(null),
});
export type ActionPlanSection = z.infer<typeof actionPlanSectionSchema>;

export const resourcesSectionSchema = z.object({
  have: arrayOf(15, 120),
  need: arrayOf(15, 120),
});
export type ResourcesSection = z.infer<typeof resourcesSectionSchema>;

export const businessModelCanvasSectionSchema = z.object({
  keyPartners: arrayOf(10, 150),
  keyActivities: arrayOf(10, 150),
  value: arrayOf(10, 150),
  customers: arrayOf(10, 150),
  channels: arrayOf(10, 150),
  revenueStreams: arrayOf(10, 150),
  costStructure: arrayOf(10, 150),
});
export type BusinessModelCanvasSection = z.infer<typeof businessModelCanvasSectionSchema>;

export const accountabilitySectionSchema = z.object({
  partnerName: shortText(200).nullable().default(null),
  partnerContact: shortText(200).nullable().default(null),
  frequency: shortText(120).nullable().default(null),
  method: shortText(120).nullable().default(null),
  commitment: shortText(600).nullable().default(null),
});
export type AccountabilitySection = z.infer<typeof accountabilitySectionSchema>;

const vibesSchema = arrayOf(15, 60);
const affirmationsSchema = arrayOf(10, 200);

/** COMPUTED — never stored, always assembled fresh from real Goal rows. */
export const bigGoalSchema = z.object({
  title: z.string(),
  progressPercent: z.number().nullable(),
  targetDate: z.string().nullable(),
});
export type BigGoal = z.infer<typeof bigGoalSchema>;

/** COMPUTED — never stored, always assembled fresh from the latest completed Assessment. */
export const passionAssessmentSectionSchema = z.object({
  passionPercent: z.number().nullable(),
  powerPercent: z.number().nullable(),
  legacyPercent: z.number().nullable(),
  businessHealthPercent: z.number().nullable(),
  strengths: z.array(z.string()),
  priorities: z.array(z.string()),
});
export type PassionAssessmentSection = z.infer<typeof passionAssessmentSectionSchema>;

/** COMPUTED — never stored, always assembled fresh from real Goal rows (cadence NINETY_DAY). */
export const ninetyDayGoalTrackerItemSchema = z.object({
  title: z.string(),
  goalType: z.string(),
  targetDate: z.string().nullable(),
  progressPercent: z.number(),
});
export type NinetyDayGoalTrackerItem = z.infer<typeof ninetyDayGoalTrackerItemSchema>;

/**
 * The full assembled board — what `getVisionBoardExport()` returns.
 * Every section is always present (never `undefined`); a section with no
 * real data yet is an empty structure, not a missing key, so every
 * consumer (the board render page, the GPT export) can destructure
 * without existence checks.
 */
export const visionBoardDataSchema = z.object({
  myStory: myStorySectionSchema,
  myWhy: myWhySectionSchema,
  legacy: legacySectionSchema,
  blueprint: blueprintSectionSchema,
  actionPlan: actionPlanSectionSchema,
  resources: resourcesSectionSchema,
  businessModelCanvas: businessModelCanvasSectionSchema,
  vibes: vibesSchema,
  affirmations: affirmationsSchema,
  accountability: accountabilitySectionSchema,
  bigGoals: z.array(bigGoalSchema),
  passionAssessment: passionAssessmentSectionSchema.nullable(),
  ninetyDayGoalTracker: z.array(ninetyDayGoalTrackerItemSchema),
});
export type VisionBoardData = z.infer<typeof visionBoardDataSchema>;

/** Empty defaults for every editable section — used to fill gaps when a member hasn't saved a section yet. */
export const EMPTY_MY_STORY: MyStorySection = { name: null, businesses: [], passionStatement: null, superpowers: [] };
export const EMPTY_MY_WHY: MyWhySection = { whyStatement: null, problemToSolve: null, peopleToHelp: [] };
export const EMPTY_LEGACY: LegacySection = { legacyStatement: null, impactGroups: [] };
export const EMPTY_BLUEPRINT: BlueprintSection = { priorities: [], next90Days: [] };
export const EMPTY_ACTION_PLAN: ActionPlanSection = { thisWeek: [], thisMonth: [], firstStep: null };
export const EMPTY_RESOURCES: ResourcesSection = { have: [], need: [] };
export const EMPTY_BUSINESS_MODEL_CANVAS: BusinessModelCanvasSection = {
  keyPartners: [],
  keyActivities: [],
  value: [],
  customers: [],
  channels: [],
  revenueStreams: [],
  costStructure: [],
};
export const EMPTY_ACCOUNTABILITY: AccountabilitySection = {
  partnerName: null,
  partnerContact: null,
  frequency: null,
  method: null,
  commitment: null,
};

/**
 * Safely parses a `VisionBoardProfile` Json column back into its typed
 * section shape, falling back to the empty structure for `null`/missing/
 * malformed data — a profile row is created with every section `null`
 * until a member fills it in, and a stored value should never crash a
 * read just because an older/partial shape landed there.
 */
export function parseSection<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}
