import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Shared by the atomic reorder endpoints (Journey stages, Automation steps). */
export const reorderSchema = z.object({
  aId: z.string().min(1),
  bId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// LIGHTWEIGHT CRM (spec Prompt 10)
// ---------------------------------------------------------------------------

export const LEAD_STAGES = [
  "NEW_LEAD",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "FOLLOW_UP",
  "WON",
  "LOST",
] as const;

export const createLeadSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(200),
  company: optionalText(200),
  email: optionalText(200),
  phone: optionalText(50),
  offer: optionalText(200),
  valueCents: z.number().int().min(0).optional(),
  stage: z.enum(LEAD_STAGES).optional(),
  nextAction: optionalText(500),
  notes: optionalText(5000),
});

export const updateLeadSchema = createLeadSchema.partial().omit({ businessId: true });

// ---------------------------------------------------------------------------
// CUSTOMER JOURNEY BUILDER (spec Prompt 10)
// ---------------------------------------------------------------------------

/** spec Prompt 10: the 9 default stages, seeded lazily per business. */
export const DEFAULT_JOURNEY_STAGES = [
  "Awareness",
  "Lead",
  "Nurture",
  "Consultation",
  "Purchase",
  "Onboarding",
  "Delivery",
  "Retention",
  "Referral",
] as const;

export const createJourneyStageSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().trim().min(1, "Give this stage a name").max(100),
  description: optionalText(1000),
});

export const updateJourneyStageSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: optionalText(1000),
  order: z.number().int().min(0).optional(),
});

// ---------------------------------------------------------------------------
// SOP BUILDER (spec Prompt 10)
// ---------------------------------------------------------------------------

export const createSopSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().trim().min(1, "Give this SOP a name").max(200),
  purpose: optionalText(2000),
  trigger: optionalText(1000),
  owner: optionalText(200),
  tools: optionalText(1000),
  steps: optionalText(8000),
  completionCriteria: optionalText(1000),
  exceptions: optionalText(1000),
  reviewDate: optionalText(30),
});

export const updateSopSchema = createSopSchema.partial().omit({ businessId: true });

// ---------------------------------------------------------------------------
// AUTOMATION MAPPER (spec Prompt 10)
// ---------------------------------------------------------------------------

export const createAutomationStepSchema = z.object({
  businessId: z.string().min(1),
  trigger: z.string().trim().min(1, "Describe what triggers this step").max(1000),
  action: z.string().trim().min(1, "Describe the action").max(1000),
  tool: optionalText(200),
  timing: optionalText(200),
  owner: optionalText(200),
  message: optionalText(4000),
  nextStep: optionalText(1000),
});

export const updateAutomationStepSchema = createAutomationStepSchema
  .partial()
  .omit({ businessId: true })
  .extend({ order: z.number().int().min(0).optional() });

// ---------------------------------------------------------------------------
// OFFER BUILDER (spec Prompt 10)
// ---------------------------------------------------------------------------

export const createOfferSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().trim().min(1, "Give your offer a name").max(200),
  audience: optionalText(2000),
  problem: optionalText(2000),
  outcome: optionalText(2000),
  features: optionalText(4000),
  benefits: optionalText(4000),
  deliverables: optionalText(4000),
  priceCents: z.number().int().min(0).optional(),
  cta: optionalText(200),
});

export const updateOfferSchema = createOfferSchema.partial().omit({ businessId: true });

// ---------------------------------------------------------------------------
// MARKETING PLAN BUILDER (spec Prompt 10)
// ---------------------------------------------------------------------------

export const createMarketingPlanSchema = z.object({
  businessId: z.string().min(1),
  goal: optionalText(1000),
  audience: optionalText(2000),
  channels: optionalText(2000),
  contentPillars: optionalText(2000),
  leadMagnet: optionalText(1000),
  campaign: optionalText(2000),
  cta: optionalText(200),
  metrics: optionalText(1000),
});

export const updateMarketingPlanSchema = createMarketingPlanSchema
  .partial()
  .omit({ businessId: true });

// ---------------------------------------------------------------------------
// SALES SCRIPT BUILDER (spec Prompt 10)
// ---------------------------------------------------------------------------

export const SALES_SCRIPT_TYPES = [
  "DISCOVERY_CALL",
  "SALES_CALL",
  "DM_RESPONSE",
  "FOLLOW_UP",
  "OBJECTION_HANDLING",
  "CLOSING",
] as const;

export const createSalesScriptSchema = z.object({
  businessId: z.string().min(1),
  type: z.enum(SALES_SCRIPT_TYPES),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1, "The script can't be empty").max(10000),
});

export const updateSalesScriptSchema = z.object({
  type: z.enum(SALES_SCRIPT_TYPES).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).max(10000).optional(),
});

// ---------------------------------------------------------------------------
// CONTENT PLANNER (spec Prompt 10)
// ---------------------------------------------------------------------------

export const CONTENT_CADENCES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export const CONTENT_STATUSES = ["IDEA", "DRAFTED", "SCHEDULED", "POSTED"] as const;

export const createContentPlanItemSchema = z.object({
  businessId: z.string().min(1),
  cadence: z.enum(CONTENT_CADENCES).optional(),
  idea: z.string().trim().min(1, "Describe the content idea").max(2000),
  platform: optionalText(100),
  status: z.enum(CONTENT_STATUSES).optional(),
  cta: optionalText(200),
  plannedDate: optionalText(30),
});

export const updateContentPlanItemSchema = createContentPlanItemSchema
  .partial()
  .omit({ businessId: true });
