import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** VISION BOARD PROFILE — every field optional, one PATCH updates whichever the member filled in. */
export const visionBoardProfileSchema = z.object({
  businessId: z.string().min(1),
  myStory: optionalText(1200),
  myWhy: optionalText(1200),
  legacyImpact: optionalText(1200),
  actionPlanThisWeek: optionalText(800),
  actionPlanThisMonth: optionalText(800),
  vibes: optionalText(500),
  resourcesHave: optionalText(1000),
  resourcesNeed: optionalText(1000),
  bmcKeyPartners: optionalText(500),
  bmcKeyActivities: optionalText(500),
  bmcValue: optionalText(500),
  bmcCustomers: optionalText(500),
  bmcChannels: optionalText(500),
  bmcRevenueStreams: optionalText(500),
  bmcCostStructure: optionalText(500),
  dailyAffirmations: optionalText(2000),
  accountabilityPartnerName: optionalText(200),
  accountabilityPartnerContact: optionalText(200),
  accountabilityCommitment: optionalText(1000),
});
