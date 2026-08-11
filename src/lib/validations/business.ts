import { z } from "zod";

// Every field but businessName is optional (spec Task 10: "User may skip
// optional fields. Do not force sensitive information."). Empty strings
// from the form are normalized to undefined so they store as NULL rather
// than "".
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

// JOBS CREATED (spec Prompt 12 Impact Report): a self-reported whole
// number, same "skip if you don't know it" optionality as every other
// business profile field — an empty string stores as NULL, not 0.
const optionalWholeNumber = () =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0), {
      message: "Enter a whole number, 0 or more",
    });

export const businessProfileSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(200),
  industry: optionalText(120),
  description: optionalText(2000),
  website: optionalText(300),
  location: optionalText(200),
  businessStage: optionalText(60),
  yearsInBusiness: optionalText(60),
  annualRevenueRange: optionalText(60),
  monthlyRevenueRange: optionalText(60),
  numberOfEmployees: optionalText(60),
  primaryProductOrService: optionalText(1000),
  idealCustomer: optionalText(1000),
  primaryChallenge: optionalText(1000),
  primaryGoal: optionalText(1000),
  hoursAvailablePerWeek: optionalText(60),
  crmUsed: optionalText(120),
  websiteStatus: optionalText(60),
  registrationStatus: optionalText(60),
  jobsCreatedSelfReported: optionalWholeNumber(),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
