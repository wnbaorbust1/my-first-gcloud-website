import { z } from "zod";

export const ORGANIZATION_TYPES = [
  "NONPROFIT",
  "SCHOOL",
  "COLLEGE",
  "GOVERNMENT_PROGRAM",
  "CHAMBER",
  "INCUBATOR",
  "VETERAN_PROGRAM",
  "WOMENS_ENTREPRENEURSHIP_PROGRAM",
  "CORPORATE_PROGRAM",
  "OTHER",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Give the organization a name").max(200),
  type: z.enum(ORGANIZATION_TYPES).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  type: z.enum(ORGANIZATION_TYPES).optional(),
  logoUrl: optionalText(500),
  primaryColor: optionalText(20),
  secondaryColor: optionalText(20),
  customDomain: optionalText(200),
  brandedFromName: optionalText(200),
  brandedFromEmail: optionalText(200),
  allowIndividualParticipantData: z.boolean().optional(),
});

export const addOrganizationMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["ADMIN", "FACILITATOR", "MEMBER"]).default("MEMBER"),
});

export const COHORT_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;

export const createCohortSchema = z.object({
  name: z.string().trim().min(1, "Give the cohort a name").max(200),
  description: optionalText(2000),
  startDate: optionalText(30),
  endDate: optionalText(30),
});

export const updateCohortSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: optionalText(2000),
  status: z.enum(COHORT_STATUSES).optional(),
  startDate: optionalText(30),
  endDate: optionalText(30),
});

export const addCohortParticipantSchema = z.object({
  businessId: z.string().min(1),
});

export const sponsorBusinessSchema = z.object({
  businessId: z.string().min(1),
  sponsoredUntil: optionalText(30),
});
